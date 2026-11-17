/**
 * Battle scene (stages 4 and 5, HANDOFF §3): draws the sim with placeholder
 * art and runs the M1 two-player hot seat.
 *
 * The scene owns a Match and runs it on a fixed 60 Hz step (PLAN §1). It only
 * reads sim state and sends commands through `match.push` (DR-010), so
 * replays and resume stay exact. The Hud scene (stage 5) runs above it and
 * shares a `BattleLink`; Pause is an overlay scene (DR-171). The match is a
 * versus match on the stand-in Jungle Home arena (OVR-009) until the level
 * pipeline exists (stage 8). It is saved at every TurnEnd (DR-047).
 *
 * Query switches (dev and tests): `?static=1` draws one frame of the dev
 * arena that never steps and has no HUD (the stage 4 checks); `?mem` prints
 * texture memory (DR-014); `?seed=N` fixes the match seed; `?hand=left`
 * mirrors the HUD (Settings arrive in stage 7); `?assist=1` turns on the
 * 1.0 s aim preview.
 */
import * as Phaser from 'phaser';
import {
  ATLASES,
  MAX_RESIDENT_PAGES,
  TERRAIN_PALETTE_PLACEHOLDER,
  type TerrainPalette,
} from '../assets/manifest';
import { applyLogicalCamera, REG_RENDER_SCALE } from '../boot/config';
import type { RenderScale } from '../boot/renderScale';
import { versusMatch } from '../game/twoPlayer';
import type { AimPreview, BattleLink } from '../hud/link';
import { AimMemory } from '../input/aim';
import { CameraDirector } from '../render/camera';
import { FixedStep } from '../render/loop';
import { AntSprite, PickupSprites, ShotSprites, type Snapshot, snapshot } from '../render/sprites';
import { TerrainView } from '../render/terrainView';
import { clearSlot, slotOf, writeSlot } from '../save/matchSlot';
import { defaultTwoPlayer, type TwoPlayerSetup } from '../save/schema';
import { SaveStore } from '../save/store';
import type { CommandBody } from '../sim/commands';
import { Match } from '../sim/match';
import { GRAVITY, launchVelocity } from '../sim/physics';
import type { MatchEvent } from '../sim/turn';
import { muzzle, WEAPONS } from '../sim/weapons/index';
import { CALM } from '../sim/wind';
import { image, loadSharedAssets } from '../ui/assets';
import { modalOpen } from '../ui/ConfirmModal';
import { reducedMotion } from '../ui/motion';
import { Nav } from '../ui/nav';
import { color, tokens } from '../ui/theme';
import { devArenaAnts, devArenaGrid } from './devArena';
import { HUD_KEY, type Hud } from './Hud';
import { PAUSE_KEY, type Pause } from './Pause';

export const BATTLE_KEY = 'battle';

export interface BattleHook {
  ready: boolean;
  tick(): number;
  phase(): string;
  push(cmd: CommandBody): boolean;
  /** Steps the sim n ticks at once (tests), then redraws. */
  stepTicks(n: number): void;
  /** RGBA of a world pixel in the terrain chunks. */
  terrainPixel(x: number, y: number): [number, number, number, number];
  chunkCount(): number;
  terrainCosts(): { ms: number; chunks: number }[];
  residentAtlasPages(): number;
  maxResidentPages: number;
  textureMB(): number;
  camera(): { cx: number; cy: number; zoom: number };
  antScreen(i: number): { x: number; y: number } | null;
  shots(): number;
  /** The command log (what `match.push` accepted). */
  log(): { kind: string; tick: number }[];
  /** Sim state of an ant (e2e). */
  ant(
    i: number,
  ): { x: number; y: number; vy: number; state: string; hp: number; team: number } | null;
  /** Match events so far, flattened (e2e). */
  events(): { kind: string; tick: number; phase?: string; command?: string; why?: string }[];
  blasts(): number;
  lastBlast(): { x: number; y: number; r: number } | null;
  /** Holds the camera at a view (tests); `null` hands it back to the director. */
  freezeCamera(view: { cx: number; cy: number; zoom: number } | null): void;
  /**
   * Reads the next rendered frame back and counts pixels in a world rect that
   * are not `rgb` (the spike's seam check, now on the real terrain).
   */
  seamCheck(
    world: { x: number; y: number; w: number; h: number },
    rgb: number,
  ): Promise<{ bad: number; checked: number; samples: number[][] }>;
}

declare global {
  interface Window {
    __battle?: BattleHook;
  }
}

/** Texture bytes as w·h·4 over every texture source (DR-014). */
export function textureBytes(textures: Phaser.Textures.TextureManager): number {
  let bytes = 0;
  for (const key of textures.getTextureKeys()) {
    const t = textures.get(key);
    for (const src of t.source) bytes += src.width * src.height * 4;
  }
  return bytes;
}

function randomSeed(): number {
  // Render-side randomness picks the seed; the sim itself never calls Math.random (DR-011).
  return Math.floor(Math.random() * 0x7fffffff);
}

export class Battle extends Phaser.Scene {
  private s: RenderScale = 1;
  private match!: Match;
  private terrain!: TerrainView;
  private ants: AntSprite[] = [];
  private shotsView!: ShotSprites;
  private pickups!: PickupSprites;
  private dew!: Phaser.GameObjects.Rectangle;
  private cam!: CameraDirector;
  private loop = new FixedStep();
  private prev: Snapshot | null = null;
  private alpha = 1;
  private staticMode = false;
  private eventIndex = 0;
  private shotEventIndex = new WeakMap<object, number>();
  private blastCount = 0;
  private lastBlastAt: { x: number; y: number; r: number } | null = null;
  private frozen: { cx: number; cy: number; zoom: number } | null = null;
  private memText: HTMLElement | null = null;
  private frameMs: number[] = [];
  private palette: TerrainPalette = TERRAIN_PALETTE_PLACEHOLDER;
  private link: BattleLink | null = null;
  private applied = { cx: 480, cy: 270, zoom: 1 };
  private dots: Phaser.GameObjects.Image[] = [];
  private ring!: Phaser.GameObjects.Image;
  private setup: TwoPlayerSetup = defaultTwoPlayer();
  private store: SaveStore | null = null;
  private nav: Nav | null = null;
  /** Focus was lost during Resume's ready delay: land on Pause again (DR-171). */
  private interrupted = false;

  constructor() {
    super(BATTLE_KEY);
  }

  preload(): void {
    loadSharedAssets(this);
  }

  create(): void {
    this.s = this.registry.get(REG_RENDER_SCALE) as RenderScale;
    const params = new URLSearchParams(location.search);
    this.staticMode = params.get('static') === '1';
    this.ants = [];
    this.eventIndex = 0;
    this.prev = null;
    this.interrupted = false;
    this.dots = [];

    const cam = this.cameras.main;
    cam.setBackgroundColor(this.palette.sky);
    applyLogicalCamera(cam, this.s, 1);

    if (this.staticMode) {
      const grid = devArenaGrid();
      this.match = new Match({
        seed: params.get('seed') ?? 'stage4',
        levelId: 'dev-arena',
        terrain: grid,
        wind: CALM,
        ants: devArenaAnts(grid),
      });
    } else {
      // A fresh match seed on every start (DR-182); `?seed=` fixes it for tests.
      const seedParam = params.get('seed');
      const seed = seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : randomSeed();
      this.match = new Match(versusMatch(this.setup, seed));
    }
    const grid = this.match.terrain;

    this.terrain = new TerrainView(this, grid, this.palette);
    this.dew = this.add.rectangle(0, 540, 960, 0, color.info).setOrigin(0, 0);
    this.pickups = new PickupSprites(this);
    this.match.ants.forEach((a, i) => {
      this.ants.push(new AntSprite(this, i, a.team));
    });
    this.shotsView = new ShotSprites(this);
    // Aim preview dots and ring, in the world layer below the HUD (DR-129).
    for (let i = 0; i < 16; i++) this.dots.push(image(this, 0, 0, 'fx.aim.dot').setVisible(false));
    this.ring = image(this, 0, 0, 'fx.aim.ring').setVisible(false);
    this.cam = new CameraDirector(reducedMotion() || this.staticMode);
    this.draw();

    if (params.has('mem')) {
      // A DOM line: it stays put whatever the camera zoom is. Colours are theme vars.
      const el = document.createElement('div');
      el.id = 'mem';
      el.style.cssText =
        'position:fixed;left:8px;bottom:8px;padding:2px 8px;border-radius:8px;' +
        'font:800 14px var(--font-body);color:var(--panel);background:var(--ink);pointer-events:none;z-index:5';
      document.body.appendChild(el);
      this.memText = el;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => el.remove());
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.__battle = undefined;
    });
    this.installHook();
    if (!this.staticMode) this.startHud(params);
    this.game.events.emit('battle-ready');
  }

  // ------------------------------------------------------------ stage 5

  private startHud(params: URLSearchParams): void {
    this.store = new SaveStore(() => window.localStorage);
    const link: BattleLink = {
      match: this.match,
      names: [...this.setup.names] as [string, string],
      versus: true,
      handed: params.get('hand') === 'left' ? 'left' : 'right',
      assist: params.get('assist') === '1',
      aims: new AimMemory(),
      weapon: ['seed', 'seed'],
      preview: null,
      view: () => this.applied,
      cam: this.cam,
      push: (cmd) => this.match.push(cmd),
      paused: false,
      openPause: () => this.openPause(),
      resumePlay: () => this.resumePlay(),
      restart: () => this.restartMatch(),
      saving: () => this.store?.persistent ?? false,
    };
    this.link = link;
    this.scene.launch(HUD_KEY, link);
    this.scene.bringToTop(HUD_KEY);

    // Auto-pause (DR-171): hidden tab, blur, portrait; Android back opens Pause (DR-090).
    const onHidden = () => {
      if (document.visibilityState === 'hidden') this.openPause();
    };
    const onBlur = () => this.openPause();
    const portrait = window.matchMedia?.('(orientation: portrait) and (pointer: coarse)');
    const onPortrait = (e: MediaQueryListEvent) => {
      if (e.matches) this.openPause();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('blur', onBlur);
    portrait?.addEventListener('change', onPortrait);
    this.nav = new Nav(history, (a) => {
      if (a.kind === 'openPause') this.openPause();
    });
    const detach = this.nav.attach(window);
    this.nav.forward('battle');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('blur', onBlur);
      portrait?.removeEventListener('change', onPortrait);
      detach();
      this.link = null;
    });
  }

  openPause(): void {
    const link = this.link;
    if (!link || this.match.over) return;
    if (link.paused) {
      const p = this.scene.get(PAUSE_KEY) as Pause | null;
      if (p?.isResuming()) this.interrupted = true;
      return;
    }
    this.interrupted = false;
    link.paused = true;
    (this.scene.get(HUD_KEY) as Hud | null)?.releaseAll();
    this.scene.pause(HUD_KEY);
    this.scene.pause();
    this.nav?.pushLayer('pause', () => {
      const p = this.scene.get(PAUSE_KEY) as { resume?: () => void } | null;
      p?.resume?.();
    });
    this.scene.launch(PAUSE_KEY, link);
    this.scene.bringToTop(PAUSE_KEY);
  }

  private resumePlay(): void {
    const link = this.link;
    if (!link) return;
    this.scene.stop(PAUSE_KEY);
    if (this.interrupted) {
      // Returning from blur or a hidden tab lands on Pause, never silently running.
      this.interrupted = false;
      this.scene.launch(PAUSE_KEY, link);
      this.scene.bringToTop(PAUSE_KEY);
      return;
    }
    this.nav?.removeLayer('pause');
    // DR-171 / DR-015: buffered input is cleared; a logged command, so replays match.
    this.match.push({ kind: 'cancel' });
    link.paused = false;
    this.loop = new FixedStep();
    this.scene.resume();
    this.scene.resume(HUD_KEY);
  }

  private restartMatch(): void {
    if (this.store) clearSlot(this.store, 'versus');
    this.scene.stop(PAUSE_KEY);
    this.scene.stop(HUD_KEY);
    this.loop = new FixedStep();
    this.scene.restart();
  }

  /** DR-047: the versus slot is written at every TurnEnd and cleared at the end. */
  private saveAtTurnEnd(): void {
    if (!this.store || this.staticMode) return;
    if (this.match.over || this.match.result) {
      clearSlot(this.store, 'versus');
      return;
    }
    writeSlot(
      this.store,
      slotOf(this.match, String(import.meta.env.VITE_BUILD_ID ?? 'dev'), {
        mode: 'versus',
        setup: this.setup,
        terrainSeed: 0,
      }),
    );
  }

  /** DR-129: 8 dots at 0.06 s, then a ring at 0.48 s; assist 16 dots to 1.0 s. Wind is ignored. */
  private drawPreview(p: AimPreview | null): void {
    const show = p !== null && !modalOpen();
    const a = show ? this.match.ants[p.ant] : undefined;
    if (!show || !a) {
      for (const d of this.dots) d.setVisible(false);
      this.ring.setVisible(false);
      return;
    }
    const assist = this.link?.assist ?? false;
    const n = assist ? 16 : tokens.component.aimPreview.dots;
    const span = assist
      ? tokens.component.aimPreview.assistS
      : n * tokens.component.aimPreview.stepS;
    const dt = span / n;
    const v = launchVelocity(p.angleDeci, p.powerMille, WEAPONS[p.weapon].wMul, a.facing);
    const m0 = muzzle(a);
    const at = (t: number) => ({ x: m0.x + v.x * t, y: m0.y + v.y * t + 0.5 * GRAVITY * t * t });
    const grid = this.match.terrain;
    let stop: { x: number; y: number } | null = null;
    let prev = m0;
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i] as Phaser.GameObjects.Image;
      if (i >= n || stop) {
        d.setVisible(false);
        continue;
      }
      const q = at(i * dt);
      // Stop at terrain: sample the segment from the last dot every 4 px.
      const len = Math.hypot(q.x - prev.x, q.y - prev.y);
      const steps = Math.max(1, Math.ceil(len / 4));
      for (let k = 1; k <= steps && !stop; k++) {
        const x = prev.x + ((q.x - prev.x) * k) / steps;
        const y = prev.y + ((q.y - prev.y) * k) / steps;
        if (i > 0 && grid.solidAt(Math.round(x), Math.round(y))) stop = { x, y };
      }
      prev = q;
      d.setVisible(!stop)
        .setPosition(q.x, q.y)
        .setAlpha(i >= 8 ? 0.5 : 1);
    }
    let end = stop;
    if (!end) {
      const q = at(span);
      const len = Math.hypot(q.x - prev.x, q.y - prev.y);
      const steps = Math.max(1, Math.ceil(len / 4));
      for (let k = 1; k <= steps && !end; k++) {
        const x = prev.x + ((q.x - prev.x) * k) / steps;
        const y = prev.y + ((q.y - prev.y) * k) / steps;
        if (grid.solidAt(Math.round(x), Math.round(y))) end = { x, y };
      }
      if (!end) {
        this.ring.setVisible(true).setPosition(q.x, q.y).setScale(0.5);
        return;
      }
    }
    // At terrain the ring squashes to 14x6 (DR-129).
    this.ring.setVisible(true).setPosition(end.x, end.y).setDisplaySize(28, 12);
  }

  private stepSim(n: number): void {
    for (let i = 0; i < n; i++) {
      this.prev = snapshot(this.match.ants, this.match.shot?.bodies ?? []);
      this.match.step();
      this.consumeEvents(this.time.now);
    }
  }

  private consumeEvents(now: number): void {
    const ev = this.match.events;
    for (; this.eventIndex < ev.length; this.eventIndex++) {
      const e = ev[this.eventIndex] as MatchEvent;
      if (e.kind === 'phase') {
        const a = this.match.ants[e.ant];
        this.cam.onPhase(e.phase, a ? { x: a.x, y: a.y - 22 } : null, now);
        if (e.phase === 'turnEnd' || e.phase === 'matchEnd') this.saveAtTurnEnd();
      }
    }
    const shots = this.match.shot ? [...this.match.shots, this.match.shot] : this.match.shots;
    for (const shot of shots) {
      const from = this.shotEventIndex.get(shot) ?? 0;
      for (let i = from; i < shot.events.length; i++) {
        const se = shot.events[i];
        if (se?.kind === 'blast') {
          this.blastCount++;
          this.lastBlastAt = { x: se.blast.x, y: se.blast.y, r: se.blast.r };
          this.cam.onBlast({ x: se.blast.x, y: se.blast.y }, se.blast.r, now);
        }
      }
      this.shotEventIndex.set(shot, shot.events.length);
    }
  }

  override update(time: number, delta: number): void {
    if (!this.staticMode && !this.cam.hitStopping(time)) {
      const { steps, alpha } = this.loop.advance(delta);
      this.stepSim(steps);
      this.alpha = alpha;
    }
    this.draw(time, delta);
  }

  private draw(time = 0, delta = 0): void {
    const m = this.match;
    this.terrain.sync();
    const aimingAnt = m.phase === 'aim' ? m.turns.ant : -1;
    m.ants.forEach((a, i) => {
      this.ants[i]?.update(a, this.prev?.ants[i], this.alpha, i === aimingAnt);
    });
    this.shotsView.update(m.shot?.bodies ?? [], this.prev, this.alpha);
    this.pickups.update(m.world.pickups);
    const dewY = m.turns.dewY;
    this.dew.setPosition(0, dewY).setSize(960, Math.max(0, 540 - dewY));

    // Camera (render only).
    const body = m.shot?.bodies[0];
    let knock: { x: number; y: number } | null = null;
    let best = 0;
    for (const a of m.ants) {
      if (a.state !== 'air') continue;
      const sp = Math.hypot(a.vx, a.vy);
      if (sp > best) {
        best = sp;
        knock = { x: a.x, y: a.y };
      }
    }
    const out = this.cam.update(time, delta, {
      hitStop: this.cam.hitStopping(time),
      projectile: body ? { x: body.p.x, y: body.p.y, vx: body.p.vx, vy: body.p.vy } : null,
      retreating: m.phase === 'resolve' && m.turns.retreatLeft > 0,
      knockback: knock,
    });
    const c = this.cameras.main;
    const view = this.frozen ?? {
      cx: out.cx + out.shakeX,
      cy: out.cy + out.shakeY,
      zoom: out.zoom,
    };
    c.setZoom(this.s * view.zoom);
    c.centerOn(view.cx, view.cy);
    // What the HUD converts world points with (tags, edges, the sling).
    this.applied = { cx: view.cx, cy: view.cy, zoom: view.zoom };
    this.drawPreview(this.link?.preview ?? null);

    if (this.memText) {
      // DR-014 `?mem`, plus the median frame time for the S=2 phone check (DR-013).
      if (delta > 0) this.frameMs.push(delta);
      if (this.frameMs.length > 120) this.frameMs.shift();
      const sorted = [...this.frameMs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      const mb = (textureBytes(this.textures) / 1048576).toFixed(1);
      this.memText.textContent = `S=${this.s} · ${median.toFixed(1)} ms · textures ${mb} MB · atlas pages ${this.residentAtlasPages()}`;
    }
  }

  residentAtlasPages(): number {
    let n = 0;
    for (const id of Object.keys(ATLASES)) {
      if (this.textures.exists(id)) n += this.textures.get(id).source.length;
    }
    return n;
  }

  private async seamCheck(
    world: { x: number; y: number; w: number; h: number },
    rgb: number,
  ): Promise<{ bad: number; checked: number; samples: number[][] }> {
    const img = await new Promise<HTMLImageElement>((resolve) => {
      this.game.renderer.snapshot((snap) => resolve(snap as HTMLImageElement));
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data;
    const cam = this.cameras.main;
    const toX = (wx: number) => (wx - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2;
    const toY = (wy: number) => (wy - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2;
    const x0 = Math.max(0, Math.ceil(toX(world.x)) + 2);
    const y0 = Math.max(0, Math.ceil(toY(world.y)) + 2);
    const x1 = Math.min(w, Math.floor(toX(world.x + world.w)) - 2);
    const y1 = Math.min(h, Math.floor(toY(world.y + world.h)) - 2);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;
    let bad = 0;
    let checked = 0;
    const samples: number[][] = [];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        checked++;
        const off =
          Math.abs((px[i] ?? 0) - r) > 3 ||
          Math.abs((px[i + 1] ?? 0) - g) > 3 ||
          Math.abs((px[i + 2] ?? 0) - b) > 3;
        if (off) {
          bad++;
          if (samples.length < 5) samples.push([x, y, px[i] ?? 0, px[i + 1] ?? 0, px[i + 2] ?? 0]);
        }
      }
    }
    return { bad, checked, samples };
  }

  private installHook(): void {
    window.__battle = {
      ready: true,
      tick: () => this.match.tick,
      phase: () => this.match.phase,
      push: (cmd) => this.match.push(cmd),
      stepTicks: (n) => {
        this.stepSim(n);
        this.alpha = 1;
        this.draw(this.time.now, 0);
      },
      terrainPixel: (x, y) => this.terrain.pixel(x, y),
      chunkCount: () => this.terrain.chunkCount,
      terrainCosts: () => [...this.terrain.costs],
      residentAtlasPages: () => this.residentAtlasPages(),
      maxResidentPages: MAX_RESIDENT_PAGES,
      textureMB: () => textureBytes(this.textures) / 1048576,
      camera: () => ({ ...this.cam.view }),
      antScreen: (i) => {
        const a = this.match.ants[i];
        return a ? { x: a.x, y: a.y } : null;
      },
      shots: () => this.match.shots.length,
      log: () => this.match.log.map((c) => ({ ...c })),
      ant: (i) => {
        const a = this.match.ants[i];
        return a ? { x: a.x, y: a.y, vy: a.vy, state: a.state, hp: a.hp, team: a.team } : null;
      },
      events: () =>
        this.match.events.map((e) => ({
          kind: e.kind,
          tick: e.tick,
          ...(e.kind === 'phase' ? { phase: e.phase } : {}),
          ...(e.kind === 'reject' ? { command: e.command, why: e.why } : {}),
        })),
      blasts: () => this.blastCount,
      lastBlast: () => this.lastBlastAt,
      freezeCamera: (view) => {
        this.frozen = view;
        this.draw(this.time.now, 0);
      },
      seamCheck: (world, rgb) => this.seamCheck(world, rgb),
    };
  }
}
