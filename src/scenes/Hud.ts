/**
 * Battle HUD scene (HANDOFF §3 stage 5; UI.md §4.5; DR-120 to DR-131,
 * DR-183, J33, J38, J46, J49).
 *
 * Runs above Battle with its own camera at zoom S, so fixed HUD rects never
 * move with the gameplay zoom. It reads sim state and sends commands through
 * the link (`match.push`) only (DR-010, DR-015). Every pointer is tracked on
 * its own (three active pointers, DR-013). Battle keys (DR-121) use `window`
 * listeners, never Phaser's key queue (stage 4 lesson). FocusManager stays
 * off in Battle (DR-086).
 *
 * Z-order (DR-120): team frame < world indicators < HUD < notices < gate;
 * Pause is its own scene above.
 */
import * as Phaser from 'phaser';
import { ANT_SIDE } from '../assets/manifest';
import { applyLogicalCamera, REG_RENDER_SCALE } from '../boot/config';
import type { RenderScale } from '../boot/renderScale';
import {
  Dial,
  FireButton,
  HoldButton,
  logicalPoint,
  PowerSlider,
  WeaponSlot,
} from '../hud/controls';
import { type HudLayout, hit, hudLayout } from '../hud/layout';
import { type BattleLink, screenToWorld, worldToScreen } from '../hud/link';
import { NOTICE, NoticeQueue } from '../hud/notices';
import {
  AntPop,
  AntTag,
  DamagePop,
  EdgeIndicator,
  EffectsRow,
  GateButton,
  MoveBar,
  NoticeView,
  TeamFrame,
  TeamPill,
  TurnPlate,
  teamFill,
  WindGauge,
} from '../hud/readouts';
import { t } from '../i18n';
import {
  type Aim,
  ANGLE_STEP,
  clampAngle,
  clampPower,
  dialAim,
  POWER_STEP,
  Repeater,
  SLING,
  sliderPower,
  slingAim,
} from '../input/aim';
import { actionOf, type BattleAction, HELD, pickIndex } from '../input/keys';
import { clampCentre } from '../render/camera';
import { FLIP_COST, HOP_COST, isActive } from '../sim/movement';
import { HONEY_HEAL } from '../sim/pickups';
import { GATE_LOCKOUT_TICKS, GATE_PAN_TICKS, type MatchEvent } from '../sim/turn';
import { WEAPON_IDS, type WeaponId } from '../sim/weapons/types';
import { modalOpen } from '../ui/ConfirmModal';
import { Button, IconButton, Panel } from '../ui/components';
import { type LayoutService, REG_LAYOUT, type Rect } from '../ui/layout';
import { BitmapLabel } from '../ui/text';
import { color, tokens } from '../ui/theme';

export const HUD_KEY = 'hud';

const D = { frame: 0, world: 10, hud: 100, notice: 200, gate: 300 } as const;
/** DR-120: a control over the active ant fades to 40%; DR-123: dim to 55% after the shot. */
const OVER_ANT_ALPHA = 0.4;
const RETREAT_DIM = 0.55;
/** DR-183: the first turn's coin-flip pop. */
const COIN_MS = 1000;
/** DR-128: hits within 300 ms are summed. */
const SUM_MS = 300;

export interface HudState {
  phase: string;
  team: number;
  ant: number;
  weapon: WeaponId;
  aim: Aim;
  facing: number;
  fire: string;
  gate: boolean;
  gateLocked: boolean;
  coin: boolean;
  plate: string;
  wind: number;
  timer: number | null;
  find: boolean;
  preview: boolean;
  ammo: Record<string, number>;
  active: Record<string, boolean>;
  alpha: Record<string, number>;
  notice: string | null;
  ended: boolean;
}

export interface HudHook {
  ready: boolean;
  rects(): Record<string, Rect>;
  controls(): string[];
  state(): HudState;
  /** Logical screen position of an ant's hurtbox centre. */
  antScreen(i: number): { x: number; y: number } | null;
}

declare global {
  interface Window {
    __hud?: HudHook;
  }
}

export class Hud extends Phaser.Scene {
  private link!: BattleLink;
  private L!: HudLayout;
  private s: RenderScale = 1;
  // readouts
  private frame: TeamFrame | null = null;
  private pills: TeamPill[] = [];
  private plate!: TurnPlate;
  private wind!: WindGauge;
  private effects!: EffectsRow;
  private moveBar!: MoveBar;
  private namePill!: BitmapLabel;
  private tags: AntTag[] = [];
  private edgeShot!: EdgeIndicator;
  private edgeAnt: EdgeIndicator[] = [];
  private noticeView!: NoticeView;
  private gate!: GateButton;
  private band!: Phaser.GameObjects.Graphics;
  // controls
  private ctl: Record<string, HoldButton> = {};
  private dial!: Dial;
  private slider!: PowerSlider;
  private fireBtn!: FireButton;
  private slots: WeaponSlot[] = [];
  private pause!: IconButton;
  private find!: IconButton;
  // input state
  private reps: Record<string, Repeater> = {};
  private walkHeld = { left: false, right: false, last: 0 as -1 | 0 | 1 };
  private walkSent = { dir: 0, tick: -1 };
  private shiftPending = false;
  private drag: {
    id: number;
    mode: 'sling' | 'pan';
    sx: number;
    sy: number;
    lx: number;
    ly: number;
  } | null = null;
  // event state
  private eventIndex = 0;
  private shotSeen = new WeakMap<object, number>();
  private pending = new Map<number, { dmg: number; direct: boolean; t0: number }>();
  private notices = new NoticeQueue();
  private coinUntil = 0;
  private plateText = '';
  private ended = false;
  /** Real time the 2P gate first showed this TurnStart, or −1 (DR-183 lockout). */
  private gateShownAt = -1;
  /** A resize while paused rebuilds on resume, so the Hud stays frozen (DR-171). */
  private rebuildOnResume = false;
  private unsubs: (() => void)[] = [];

  constructor() {
    super(HUD_KEY);
  }

  init(data: BattleLink): void {
    this.link = data;
    this.tags = [];
    this.edgeAnt = [];
    this.slots = [];
    this.pills = [];
    this.ctl = {};
    this.reps = {};
    this.unsubs = [];
    this.drag = null;
    this.frame = null;
    this.pending = new Map();
    this.notices = new NoticeQueue();
    this.shotSeen = new WeakMap();
    // Phaser reuses this instance across restarts: reset every per-run field.
    this.walkHeld = { left: false, right: false, last: 0 };
    this.walkSent = { dir: 0, tick: -1 };
    this.shiftPending = false;
    this.coinUntil = 0;
    this.plateText = '';
    this.ended = false;
    this.gateShownAt = -1;
    this.rebuildOnResume = false;
  }

  create(): void {
    this.s = this.registry.get(REG_RENDER_SCALE) as RenderScale;
    applyLogicalCamera(this.cameras.main, this.s, 1);
    const layoutService = this.registry.get(REG_LAYOUT) as LayoutService | undefined;
    const margins = layoutService?.margins ?? { top: 16, right: 16, bottom: 16, left: 16 };
    this.L = hudLayout(margins, this.link.handed, { weapons: WEAPON_IDS.length }, this.s);
    const m = this.link.match;
    // Events already handled before a rebuild are not replayed.
    this.eventIndex = m.events.length;
    for (const shot of [...m.shots, ...(m.shot ? [m.shot] : [])])
      this.shotSeen.set(shot, shot.events.length);
    if (
      m.turns.turn === 0 &&
      m.phase === 'turnStart' &&
      this.link.versus &&
      m.turns.phaseTick < GATE_PAN_TICKS
    ) {
      this.coinUntil = this.time.now + COIN_MS;
    }

    this.buildReadouts(margins);
    this.buildControls();
    this.bindKeys();
    this.bindWorld();
    if (layoutService) {
      this.unsubs.push(
        layoutService.onResize(() => {
          if (this.link.paused) this.rebuildOnResume = true;
          else this.scene.restart(this.link);
        }),
      );
      const onResume = () => {
        if (this.rebuildOnResume) this.scene.restart(this.link);
      };
      this.events.on(Phaser.Scenes.Events.RESUME, onResume);
      this.unsubs.push(() => this.events.off(Phaser.Scenes.Events.RESUME, onResume));
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const u of this.unsubs) u();
      this.link.preview = null;
      window.__hud = undefined;
    });
    this.installHook();
    this.sync(this.time.now);
  }

  // ---------------------------------------------------------------- build

  private buildReadouts(margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }): void {
    const R = this.L.rects;
    const m = this.link.match;
    if (this.link.versus) {
      const safe = {
        x: margins.left,
        y: margins.top,
        w: 960 - margins.left - margins.right,
        h: 540 - margins.top - margins.bottom,
      };
      this.frame = new TeamFrame(this, safe).setDepth(D.frame);
    }
    for (const a of m.ants) this.tags.push(new AntTag(this, a.team).setDepth(D.world));
    this.edgeShot = new EdgeIndicator(this, null).setDepth(D.world);
    for (let team = 0; team < 2; team++)
      this.edgeAnt.push(new EdgeIndicator(this, team).setDepth(D.world));
    this.band = this.add.graphics().setDepth(D.world);

    for (let team = 0; team < 2; team++) {
      const count = m.ants.filter((a) => a.team === team).length;
      this.pills.push(
        new TeamPill(this, (team === 0 ? R.teamA : R.teamB) as Rect, team, count * 100).setDepth(
          D.hud,
        ),
      );
    }
    this.plate = new TurnPlate(this, R.plate as Rect, R.timer as Rect).setDepth(D.hud);
    this.wind = new WindGauge(this, R.wind as Rect, t('hud.calm')).setDepth(D.hud);
    this.effects = new EffectsRow(this, R.effects as Rect).setDepth(D.hud);
    this.moveBar = new MoveBar(this, R.moveBar as Rect).setDepth(D.hud);
    const np = R.namePill as Rect;
    const pill = new Panel(this, np, tokens.shadowY.sm).setDepth(D.hud);
    this.namePill = new BitmapLabel(this, 0, 0, '', 'label', color.ink);
    this.namePill.setTextOrigin(0.5, 0.5);
    pill.face.add(this.namePill);
    this.noticeView = new NoticeView(this, R.notice as Rect).setDepth(D.notice);
    this.gate = new GateButton(this, R.gate as Rect, t('hud.tapToStart'), () =>
      this.passGate(),
    ).setDepth(D.gate);
  }

  private buildControls(): void {
    const R = this.L.rects;
    const hold = (
      id: string,
      opts: { icon?: string; label?: string; corner?: string },
      down: () => void,
      up?: () => void,
    ) => {
      const b = new HoldButton(this, {
        id,
        hit: R[id] as Rect,
        ...opts,
        onDown: down,
        ...(up ? { onUp: up } : {}),
      });
      b.setDepth(D.hud);
      this.ctl[id] = b;
      return b;
    };
    // Steppers share their repeaters with the keys (DR-121).
    this.reps.angleUp = new Repeater((c) =>
      this.nudgeAim(c ? ANGLE_STEP.coarse : ANGLE_STEP.fine, 0),
    );
    this.reps.angleDown = new Repeater((c) =>
      this.nudgeAim(-(c ? ANGLE_STEP.coarse : ANGLE_STEP.fine), 0),
    );
    this.reps.powerUp = new Repeater((c) =>
      this.nudgeAim(0, c ? POWER_STEP.coarse : POWER_STEP.fine),
    );
    this.reps.powerDown = new Repeater((c) =>
      this.nudgeAim(0, -(c ? POWER_STEP.coarse : POWER_STEP.fine)),
    );
    const rep = (id: string) =>
      [() => this.reps[id]?.down(performance.now()), () => this.reps[id]?.up()] as const;
    hold('angleUp', { icon: 'ui.icon.chevron-u' }, ...rep('angleUp'));
    hold('angleDown', { icon: 'ui.icon.chevron-d' }, ...rep('angleDown'));
    hold('powerUp', { icon: 'ui.icon.chevron-u' }, ...rep('powerUp'));
    hold('powerDown', { icon: 'ui.icon.chevron-d' }, ...rep('powerDown'));
    hold(
      'walkL',
      { icon: 'ui.icon.chevron-l' },
      () => this.setWalk('left', true),
      () => this.setWalk('left', false),
    );
    hold(
      'walkR',
      { icon: 'ui.icon.chevron-r' },
      () => this.setWalk('right', true),
      () => this.setWalk('right', false),
    );
    hold('hop', { label: t('hud.hop'), corner: String(HOP_COST) }, () => this.jump('hop'));
    hold('flip', { label: t('hud.flip'), corner: String(FLIP_COST) }, () => this.jump('flip'));

    this.dial = new Dial(
      this,
      R.dial as Rect,
      (px, py) => this.dialDrag(px, py),
      (dir) => this.nudgeAim(dir * ANGLE_STEP.fine, 0),
    ).setDepth(D.hud);
    this.slider = new PowerSlider(
      this,
      R.power as Rect,
      (py) =>
        this.setAim({ powerMille: sliderPower(this.slider.track.y, this.slider.track.h, py) }),
      (dir) => this.nudgeAim(0, dir * POWER_STEP.fine),
    ).setDepth(D.hud);
    this.fireBtn = new FireButton(this, R.fire as Rect, R.fireVisual as Rect, t('hud.fire'), () =>
      this.fire(false),
    ).setDepth(D.hud);
    WEAPON_IDS.forEach((w, i) => {
      this.slots.push(
        new WeaponSlot(this, i, this.L.slots[i] as Rect, w, () => this.pickWeapon(w)).setDepth(
          D.hud,
        ),
      );
    });
    const aimLive = () => this.canAim();
    const moveLive = () => this.canMove();
    for (const id of ['angleUp', 'angleDown', 'powerUp', 'powerDown']) {
      const b = this.ctl[id];
      if (b) b.liveCheck = aimLive;
    }
    for (const id of ['walkL', 'walkR', 'hop', 'flip']) {
      const b = this.ctl[id];
      if (b) b.liveCheck = moveLive;
    }
    this.dial.liveCheck = aimLive;
    this.slider.liveCheck = aimLive;
    this.fireBtn.liveCheck = aimLive;
    for (const sl of this.slots) sl.liveCheck = aimLive;
    this.pause = new IconButton(this, {
      id: 'pause',
      hit: R.pause as Rect,
      icon: 'ui.icon.pause',
      onActivate: () => this.link.openPause(),
    }).setDepth(D.hud);
    this.find = new IconButton(this, {
      id: 'find',
      hit: R.find as Rect,
      icon: 'ui.icon.target',
      onActivate: () => this.recentre(),
    }).setDepth(D.hud);
  }

  // ---------------------------------------------------------------- state

  private get team(): number {
    return this.link.match.turns.team;
  }

  private weapon(): WeaponId {
    return this.link.weapon[this.team] ?? 'seed';
  }

  private aim(): Aim {
    return this.link.aims.get(this.link.match.turns.ant, this.weapon());
  }

  private setAim(a: Partial<Aim>): void {
    if (!this.canAim()) return;
    const cur = this.aim();
    this.link.aims.set(this.link.match.turns.ant, this.weapon(), { ...cur, ...a });
  }

  private nudgeAim(dAngle: number, dPower: number): void {
    const cur = this.aim();
    this.setAim({
      angleDeci: clampAngle(cur.angleDeci + dAngle),
      powerMille: clampPower(cur.powerMille + dPower),
    });
  }

  private gateUp(): boolean {
    const m = this.link.match;
    return this.link.versus && m.phase === 'turnStart' && m.turns.rules.gate && !m.turns.turnLost;
  }

  private canAim(): boolean {
    const m = this.link.match;
    const a = m.activeAnt;
    return !this.link.paused && m.phase === 'aim' && !!a && isActive(a);
  }

  private canMove(): boolean {
    const m = this.link.match;
    const a = m.activeAnt;
    return !this.link.paused && m.turns.canMove && !!a && isActive(a);
  }

  // -------------------------------------------------------------- actions

  private push(cmd: Parameters<BattleLink['push']>[0]): boolean {
    return this.link.push(cmd);
  }

  private passGate(): void {
    if (this.time.now < this.coinUntil) {
      this.coinUntil = 0;
      return;
    }
    if (!this.gateUp() || this.gateLocked()) return;
    this.push({ kind: 'ready' });
  }

  /**
   * DR-183: the gate is locked for its first 400 ms on screen. The sim's own
   * lockout (pan + 400 ms) still applies; the coin pop can hide the gate past it.
   */
  private gateLocked(): boolean {
    const m = this.link.match;
    if (m.turns.phaseTick < GATE_PAN_TICKS + GATE_LOCKOUT_TICKS) return true;
    return this.gateShownAt < 0 || performance.now() - this.gateShownAt < 400;
  }

  /**
   * FIRE (DR-122, J8). Space and Enter also pass the 2P gate (DR-183); the
   * FIRE button never does (the gate's hit area is the gate button only).
   */
  private fire(fromKey = true): void {
    if (fromKey && this.gateUp()) {
      this.passGate();
      return;
    }
    if (!this.canAim()) {
      this.fireBtn.reject();
      return;
    }
    const a = this.aim();
    this.push({
      kind: 'fire',
      weapon: this.weapon(),
      angleDeci: a.angleDeci,
      powerMille: a.powerMille,
    });
  }

  private jump(kind: 'hop' | 'flip'): void {
    if (!this.canMove()) return;
    this.push({ kind });
  }

  private setWalk(side: 'left' | 'right', on: boolean): void {
    this.walkHeld[side] = on;
    if (on) this.walkHeld.last = side === 'left' ? -1 : 1;
  }

  private walkDir(): -1 | 0 | 1 {
    const { left, right, last } = this.walkHeld;
    if (left && right) return last;
    return left ? -1 : right ? 1 : 0;
  }

  private turnAround(): void {
    const a = this.link.match.activeAnt;
    if (!a || !this.canAim()) return;
    this.push({ kind: 'face', dir: a.facing > 0 ? -1 : 1 });
  }

  private applyFacing(f: 1 | -1): void {
    const a = this.link.match.activeAnt;
    if (a && a.facing !== f && a.state === 'ground') this.push({ kind: 'face', dir: f });
  }

  private dialDrag(px: number, py: number): void {
    if (!this.canAim()) return;
    const r = this.L.rects.dial as Rect;
    const a = this.link.match.activeAnt;
    const d = dialAim(
      r.x + r.w / 2,
      r.y + r.h / 2,
      px,
      py,
      this.aim().powerMille,
      (a?.facing ?? 1) as 1 | -1,
    );
    this.setAim({ angleDeci: d.angleDeci });
    this.applyFacing(d.facing);
  }

  private pickWeapon(w: WeaponId): void {
    if (!this.canAim()) return;
    const ammo = this.link.match.ammo[this.team]?.[w] ?? 0;
    if (!(ammo > 0)) return;
    this.link.weapon[this.team] = w;
  }

  private cycleWeapon(dir: 1 | -1): void {
    if (!this.canAim()) return;
    const pool = this.link.match.ammo[this.team];
    if (!pool) return;
    const i0 = WEAPON_IDS.indexOf(this.weapon());
    for (let k = 1; k <= WEAPON_IDS.length; k++) {
      const w = WEAPON_IDS[(i0 + dir * k + WEAPON_IDS.length * 2) % WEAPON_IDS.length] as WeaponId;
      if (pool[w] > 0) {
        this.link.weapon[this.team] = w;
        return;
      }
    }
  }

  private recentre(): void {
    const a = this.link.match.activeAnt;
    if (a) this.link.cam.recentre({ x: a.x, y: a.y - 22 }, this.time.now);
  }

  // ------------------------------------------------------------------ keys

  private bindKeys(): void {
    const down = (e: KeyboardEvent) => {
      if (this.link.paused || modalOpen()) return;
      const a = actionOf(e);
      if (e.key !== 'Shift') this.shiftPending = false;
      if (!a) return;
      if (
        a === 'fire' ||
        a === 'nextWeapon' ||
        e.key.startsWith('Arrow') ||
        e.key.startsWith('Page')
      )
        e.preventDefault();
      if (e.repeat) return; // key repeat is ignored; held actions use their own repeat
      if (e.key === 'Shift') {
        // Shift is also the modifier for "+": it hops on release when no other key came (PROGRESS stage 5).
        this.shiftPending = true;
        return;
      }
      this.act(a, true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        if (this.shiftPending && !this.link.paused) this.act('hop', true);
        this.shiftPending = false;
        return;
      }
      const a = actionOf(e);
      if (a && HELD.has(a)) this.act(a, false);
    };
    const blur = () => this.releaseAll();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    this.unsubs.push(() => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    });
  }

  /** Releases every held key and button (pause, blur, rebuild). */
  releaseAll(): void {
    for (const r of Object.values(this.reps)) r.up();
    this.walkHeld = { left: false, right: false, last: 0 };
    for (const b of Object.values(this.ctl)) b.cancel();
    this.dial?.cancel();
    this.slider?.cancel();
    // A touch held across Pause must be lifted before it aims again (DR-171).
    this.drag = null;
  }

  private act(a: BattleAction, on: boolean): void {
    const pick = pickIndex(a);
    if (pick >= 0) {
      const w = WEAPON_IDS[pick];
      if (w) this.pickWeapon(w);
      return;
    }
    switch (a) {
      case 'walkLeft':
        this.setWalk('left', on);
        return;
      case 'walkRight':
        this.setWalk('right', on);
        return;
      case 'angleUp':
      case 'angleDown':
      case 'powerUp':
      case 'powerDown':
        if (on) this.reps[a]?.down(performance.now());
        else this.reps[a]?.up();
        return;
      case 'fire':
        this.fire();
        return;
      case 'hop':
      case 'flip':
        this.jump(a);
        return;
      case 'turn':
        this.turnAround();
        return;
      case 'prevWeapon':
        this.cycleWeapon(-1);
        return;
      case 'nextWeapon':
        this.cycleWeapon(1);
        return;
      case 'recentre':
        this.recentre();
        return;
      case 'pause':
        this.link.openPause();
        return;
      case 'fullscreen':
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
        return;
    }
  }

  // ----------------------------------------------------------- world drags

  private bindWorld(): void {
    this.input.on(
      'pointerdown',
      (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0 || this.drag || this.link.paused) return;
        if (this.time.now < this.coinUntil) {
          this.coinUntil = 0;
          return;
        }
        const q = logicalPoint(this, p);
        const m = this.link.match;
        const a = m.activeAnt;
        const v = this.link.view();
        if (this.canAim() && a) {
          const c = worldToScreen(v, a.x, a.y - 22);
          if (Math.hypot(q.x - c.x, q.y - c.y) / v.zoom <= SLING.grabR) {
            this.drag = { id: p.id, mode: 'sling', sx: q.x, sy: q.y, lx: q.x, ly: q.y };
            return;
          }
        }
        if (m.phase === 'aim')
          this.drag = { id: p.id, mode: 'pan', sx: q.x, sy: q.y, lx: q.x, ly: q.y };
      },
    );
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || d.id !== p.id || !p.isDown) return;
      const q = logicalPoint(this, p);
      if (d.mode === 'pan') {
        const z = this.link.view().zoom;
        this.link.cam.panBy(-(q.x - d.lx) / z, -(q.y - d.ly) / z);
      } else {
        const a = this.link.match.activeAnt;
        const s = slingAim(d.sx, d.sy, q.x, q.y, (a?.facing ?? 1) as 1 | -1);
        if (s) {
          this.setAim({ angleDeci: s.angleDeci, powerMille: s.powerMille });
          this.applyFacing(s.facing);
        }
      }
      d.lx = q.x;
      d.ly = q.y;
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (this.drag?.id === p.id) this.drag = null;
    };
    this.input.on('pointerup', end);
    this.input.on('pointerupoutside', end);
    this.input.on(
      'wheel',
      (
        _p: Phaser.Input.Pointer,
        over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        // Wheel over the world cycles weapons (DR-121); the dial and slider handle their own.
        if (over.length === 0 && dy !== 0) this.cycleWeapon(dy > 0 ? 1 : -1);
      },
    );
  }

  // ----------------------------------------------------------------- frame

  override update(time: number): void {
    this.sync(time);
  }

  private sync(now: number): void {
    const link = this.link;
    const m = link.match;
    const turns = m.turns;
    const phase = m.phase;
    const team = turns.team;
    const ant = m.activeAnt;
    const v = link.view();

    // Input repeats and the held walk (a held state, DR-015).
    if (!link.paused) {
      // Stepper repeats run on real time (DR-121 rates are per second of the player's hold).
      const real = performance.now();
      for (const r of Object.values(this.reps)) r.update(real);
    }
    const want = this.canMove() || phase === 'turnStart' ? this.walkDir() : 0;
    if (want !== turns.heldDir && !(this.walkSent.dir === want && this.walkSent.tick === m.tick)) {
      if (this.canMove() || phase === 'turnStart' || want === 0) {
        this.push({ kind: 'walk', dir: want });
        this.walkSent = { dir: want, tick: m.tick };
      }
    }

    this.consumeEvents(now);

    // Who is up.
    const names = link.names;
    const name = names[team] ?? '';
    const retreat = phase === 'resolve' && turns.retreatLeft > 0;
    const plateText = retreat
      ? t('hud.runForCover')
      : t(name.endsWith('s') ? 'hud.turnOfS' : 'hud.turnOf', { name });
    if (plateText !== this.plateText) {
      this.plateText = plateText;
      this.plate.setTeam(team, plateText);
    }
    let timer: number | null = null;
    if (retreat) {
      this.plate.setTimer('retreat', Math.ceil(turns.retreatLeft / 60));
    } else if (
      phase === 'resolve' ||
      phase === 'turnEnd' ||
      phase === 'matchEnd' ||
      turns.timerLeft === null
    ) {
      this.plate.setTimer('hidden', 0);
    } else {
      timer = Math.ceil(turns.timerLeft / 60);
      this.plate.setTimer('turn', timer);
    }
    this.frame?.show(team);
    for (const p of this.pills) {
      let hp = 0;
      for (const a of m.ants) if (a.team === p.team && isActive(a)) hp += a.hp;
      p.sync(hp, p.team === team && phase !== 'matchEnd');
    }

    // Wind and effects (DR-125, DR-127).
    this.wind.show(m.world.wind.gauge(m.tick).level);
    const chips: string[] = [];
    const round = turns.round;
    const dewFrom = turns.rules.dewFromRound;
    if (round >= dewFrom) chips.push(t('hud.dewRising'));
    else if (round >= dewFrom - 3) chips.push(t('hud.dewIn', { n: dewFrom - round }));
    this.effects.show(chips);

    // Move bar and weapon tray.
    const retreatF = retreat && turns.retreatLen > 0 ? turns.retreatLeft / turns.retreatLen : null;
    this.moveBar.show(ant ? ant.budget : 0, retreatF);
    const weapon = this.weapon();
    const pool = m.ammo[team];
    WEAPON_IDS.forEach((w, i) => {
      this.slots[i]?.show({ weapon: w, ammo: pool?.[w] ?? 0, selected: w === weapon });
    });
    this.namePill.fitTo(
      t(`weapon.${weapon}` as Parameters<typeof t>[0]),
      (this.L.rects.namePill as Rect).w - 24,
    );
    const aim = this.aim();
    const facing = (ant?.facing ?? 1) as 1 | -1;
    this.dial.show(aim.angleDeci, facing);
    this.slider.show(aim.powerMille);

    // Control states.
    const gate = this.gateUp();
    const canAim = this.canAim();
    const canMove = this.canMove();
    const shotTaken = phase === 'fire' || phase === 'resolve';
    const aimDim = shotTaken ? RETREAT_DIM : 1;
    const airborne = ant?.state !== 'ground';
    const budget = ant?.budget ?? 0;
    const antRect = ant ? this.antScreenRect(v, ant.x, ant.y) : null;
    const over = (r: Rect) =>
      antRect !== null &&
      r.x < antRect.x + antRect.w &&
      antRect.x < r.x + r.w &&
      r.y < antRect.y + antRect.h &&
      antRect.y < r.y + r.h;
    const fade = (id: string, base: number) => {
      const r = this.L.rects[id] as Rect;
      return Math.min(base, over(r) ? OVER_ANT_ALPHA : 1);
    };
    for (const id of ['angleUp', 'angleDown', 'powerUp', 'powerDown']) {
      this.ctl[id]?.setLive(canAim).setDim(fade(id, aimDim));
    }
    this.dial.setLive(canAim).setDim(fade('dial', aimDim));
    this.slider.setLive(canAim).setDim(fade('power', aimDim));
    this.slots.forEach((s, i) => {
      s.setLive(canAim).setDim(fade(`slot${i}`, aimDim));
    });
    this.fireBtn.setLive(canAim).setDim(fade('fire', aimDim));
    const ringFire = turns.ring.pending.some((c) => c.kind === 'fire');
    this.fireBtn.setFireState(canAim ? (ringFire ? 'queued' : 'ready') : 'disabled', now);
    const moveIds: [string, number][] = [
      ['walkL', 0],
      ['walkR', 0],
      ['hop', HOP_COST],
      ['flip', FLIP_COST],
    ];
    for (const [id, cost] of moveIds) {
      const b = this.ctl[id];
      if (!b) continue;
      b.setLive(canMove);
      b.setStone(canMove && (airborne || (cost > 0 ? budget < cost : budget <= 0)));
      b.setDim(fade(id, 1));
    }
    this.pause.setAlpha(fade('pause', 1));
    const antOff = antRect
      ? antRect.x + antRect.w < 0 || antRect.x > 960 || antRect.y + antRect.h < 0 || antRect.y > 540
      : false;
    // Compare with where the camera can actually centre (it is clamped to the world).
    const goal = ant ? clampCentre(ant.x, ant.y - 22, v.zoom) : null;
    const far = goal ? Math.hypot(v.cx - goal.x, v.cy - goal.y) > 120 : false;
    const findOn = phase === 'aim' && !!ant && isActive(ant) && (far || antOff);
    this.find.setVisible(findOn);

    // The gate (DR-183, J46): after the 500 ms pan, locked for 400 ms; never during the coin pop.
    const coin = now < this.coinUntil;
    const gateShow = gate && !coin && turns.phaseTick >= GATE_PAN_TICKS;
    if (gateShow && this.gateShownAt < 0) this.gateShownAt = performance.now();
    if (!gateShow) this.gateShownAt = -1;
    this.gate.show(gateShow, team, this.gateLocked());

    // Notices: the coin flip first, then the queue (held during the gate and Pause).
    if (coin) {
      this.noticeView.show(t('hud.goesFirst', { name }), 'banner', teamFill(team));
    } else if (this.ended) {
      // The match-end banner stays.
    } else {
      const n = this.notices.update(now, gate || link.paused);
      this.noticeView.show(n ? n.text : null, n?.kind ?? 'banner');
    }
    if (phase === 'matchEnd' && !this.ended) this.showEnd();

    // Aim preview (drawn by Battle in the world, DR-129) and the sling band.
    link.preview =
      canAim && ant
        ? { ant: turns.ant, weapon, angleDeci: aim.angleDeci, powerMille: aim.powerMille }
        : null;
    this.band.clear();
    if (this.drag?.mode === 'sling' && ant) {
      const c = worldToScreen(v, ant.x, ant.y - 22);
      this.band.lineStyle(6, color.ink, 1).lineBetween(c.x, c.y, this.drag.lx, this.drag.ly);
      this.band.lineStyle(2, color.secondary, 1).lineBetween(c.x, c.y, this.drag.lx, this.drag.ly);
    }

    this.syncTags(now, v);
    this.syncEdges(v);
    this.flushDamage(now, v);
    this.children.each((c) => {
      if (c instanceof DamagePop || c instanceof AntPop) {
        const p = worldToScreen(v, c.worldX, c.worldY);
        c.setPosition(p.x, p.y - (c instanceof DamagePop ? c.rise : 0));
      }
    });
  }

  private antScreenRect(v: { cx: number; cy: number; zoom: number }, x: number, y: number): Rect {
    const feet = worldToScreen(v, x, y);
    const w = ANT_SIDE.w * v.zoom;
    const h = ANT_SIDE.h * v.zoom;
    return { x: feet.x - w / 2, y: feet.y - h, w, h };
  }

  private syncTags(now: number, v: { cx: number; cy: number; zoom: number }): void {
    const m = this.link.match;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const activeIdx = m.phase === 'matchEnd' ? -1 : m.turns.ant;
    m.ants.forEach((a, i) => {
      const tag = this.tags[i];
      if (!tag) return;
      const feet = worldToScreen(v, a.x, a.y);
      const active = i === activeIdx && isActive(a);
      const size = active ? { w: 96, h: 40 } : { w: 76, h: 32 };
      let y = feet.y - ANT_SIDE.h * v.zoom - 12;
      const x = Math.min(960 - size.w / 2, Math.max(size.w / 2, feet.x));
      // Overlapping tags are offset 36 px (DR-128).
      for (let k = 0; k < 4; k++) {
        const hitTag = placed.some(
          (p) => Math.abs(p.x - x) < (p.w + size.w) / 2 && Math.abs(p.y - y) < (p.h + size.h) / 2,
        );
        if (!hitTag) break;
        y -= 36;
      }
      placed.push({ x, y, ...size });
      tag.show(
        { x, y, team: a.team, hp: Math.max(0, Math.round(a.hp)), active, ko: !isActive(a) },
        now,
      );
    });
  }

  private syncEdges(v: { cx: number; cy: number; zoom: number }): void {
    const m = this.link.match;
    const body = m.shot?.bodies[0];
    if (body) {
      const p = worldToScreen(v, body.p.x, body.p.y);
      const c = screenToWorld(
        v,
        Math.min(936, Math.max(24, p.x)),
        Math.min(350, Math.max(188, p.y)),
      );
      this.edgeShot.point(p.x, p.y, Math.hypot(body.p.x - c.x, body.p.y - c.y));
    } else {
      this.edgeShot.setVisible(false);
    }
    const ant = m.activeAnt;
    this.edgeAnt.forEach((e, team) => {
      if (!ant || ant.team !== team || !isActive(ant) || m.phase === 'matchEnd') {
        e.setVisible(false);
        return;
      }
      const p = worldToScreen(v, ant.x, ant.y - 22);
      const c = screenToWorld(
        v,
        Math.min(936, Math.max(24, p.x)),
        Math.min(350, Math.max(188, p.y)),
      );
      e.point(p.x, p.y, Math.hypot(ant.x - c.x, ant.y - 22 - c.y));
    });
  }

  // ---------------------------------------------------------------- events

  private consumeEvents(now: number): void {
    const m = this.link.match;
    const ev = m.events;
    for (; this.eventIndex < ev.length; this.eventIndex++) {
      const e = ev[this.eventIndex] as MatchEvent;
      switch (e.kind) {
        case 'phase':
          if (e.phase === 'turnStart') {
            this.plate.dropIn();
            this.releaseAll();
          }
          break;
        case 'reject':
          if (e.command === 'fire') this.fireBtn.reject();
          break;
        case 'timeout': {
          const a = m.ants[e.ant];
          if (a)
            this.add.existing(
              new AntPop(this, a.x, a.y - ANT_SIDE.h - 56, t('hud.tooSlow')).setDepth(D.world),
            );
          break;
        }
        case 'pickup':
          if (e.pickup === 'honey') {
            const a = m.ants[e.ant];
            if (a)
              new DamagePop(
                this,
                a.x,
                a.y - ANT_SIDE.h - 52,
                `+${HONEY_HEAL}`,
                40,
                color.heal,
              ).setDepth(D.world);
          }
          break;
        case 'dewWarning':
          this.notices.push({
            text: t('hud.dewIn', { n: m.turns.rules.dewFromRound - e.round }),
            priority: 'suddenDeath',
            kind: 'banner',
            ms: NOTICE.toastMs,
          });
          break;
        default:
          break;
      }
    }
    const shots = m.shot ? [...m.shots, m.shot] : m.shots;
    for (const shot of shots) {
      const from = this.shotSeen.get(shot) ?? 0;
      for (let i = from; i < shot.events.length; i++) {
        const se = shot.events[i];
        if (se?.kind !== 'blast') continue;
        for (const h of se.hits) {
          if (h.dmg <= 0) continue;
          const p = this.pending.get(h.ant) ?? { dmg: 0, direct: false, t0: now };
          p.dmg += h.dmg;
          p.direct ||= se.blast.direct === h.ant;
          this.pending.set(h.ant, p);
        }
      }
      this.shotSeen.set(shot, shot.events.length);
    }
  }

  private flushDamage(now: number, _v: { cx: number; cy: number; zoom: number }): void {
    const m = this.link.match;
    for (const [i, p] of this.pending) {
      if (now - p.t0 < SUM_MS) continue;
      this.pending.delete(i);
      const a = m.ants[i];
      if (!a) continue;
      const n = Math.round(p.dmg);
      const text = p.direct ? `−${n}!` : `−${n}`;
      new DamagePop(
        this,
        a.x,
        a.y - ANT_SIDE.h - 52,
        text,
        p.direct ? 56 : 40,
        color['meaning-white'],
      ).setDepth(D.world);
    }
  }

  private showEnd(): void {
    this.ended = true;
    const r = this.link.match.result;
    const winner = r?.winner ?? null;
    const name = winner === null ? '' : (this.link.names[winner] ?? '');
    this.noticeView.show(
      winner === null ? t('hud.draw') : t('hud.wins', { name }),
      'banner',
      winner === null ? 'ink' : teamFill(winner),
    );
    new Button(this, {
      id: 'rematch',
      rect: this.L.rects.gate as Rect,
      label: t('hud.rematch'),
      onActivate: () => this.link.restart(),
    }).setDepth(D.gate);
  }

  // ------------------------------------------------------------------ hook

  private installHook(): void {
    window.__hud = {
      ready: true,
      rects: () => ({ ...this.L.rects }),
      controls: () => [...this.L.controls],
      antScreen: (i) => {
        const a = this.link.match.ants[i];
        return a ? worldToScreen(this.link.view(), a.x, a.y - 22) : null;
      },
      state: () => {
        const m = this.link.match;
        const pool = m.ammo[m.turns.team] ?? {};
        const ids = ['dial', 'power', 'fire', 'angleUp', 'walkL', 'walkR', 'hop', 'flip', 'slot0'];
        const active: Record<string, boolean> = {};
        const alpha: Record<string, number> = {};
        for (const id of ids) {
          const o =
            id === 'dial'
              ? this.dial
              : id === 'power'
                ? this.slider
                : id === 'fire'
                  ? this.fireBtn
                  : id === 'slot0'
                    ? this.slots[0]
                    : this.ctl[id];
          alpha[id] = o?.alpha ?? 0;
        }
        active.aim = this.canAim();
        active.move = this.canMove();
        return {
          phase: m.phase,
          team: m.turns.team,
          ant: m.turns.ant,
          weapon: this.weapon(),
          aim: this.aim(),
          facing: m.activeAnt?.facing ?? 0,
          fire: this.fireBtn.fireState,
          gate: this.gate.visible,
          gateLocked: this.gate.visible && this.gate.alpha < 1,
          coin: this.time.now < this.coinUntil,
          plate: this.plateText,
          wind: m.world.wind.gauge(m.tick).level,
          timer: m.turns.timerLeft === null ? null : Math.ceil(m.turns.timerLeft / 60),
          find: this.find.visible,
          preview: this.link.preview !== null,
          ammo: { ...pool },
          active,
          alpha,
          notice: this.noticeView.visible ? 'shown' : null,
          ended: this.ended,
        };
      },
    };
  }

  /** For the hook: is a logical point over a control? */
  controlAt(x: number, y: number): string | null {
    for (const id of this.L.controls) if (hit(this.L.rects[id] as Rect, x, y)) return id;
    return null;
  }
}
