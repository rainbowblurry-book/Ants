# Progress

**Current stage:** Build **stage 5 done → M1 hot-seat slice** (tag `m1-hotseat`). **Stopped for the owner's phone playtest** (`ToUser/TODO.md` R-04). Next after that: stage 6, Bot AI (HARD).

**Owner's to-do list:** `ToUser/TODO.md` is the one place for questions, reviews and checks for the owner. This file does not copy them.

> ⚠ **ANT ART: the reference is in `art/source/`, but final art is not drawn or approved yet.** The build uses placeholders only (DR-195, DR-007a): the concept cut-outs in `art/reference/placeholder/`, behind manifest keys flagged `placeholder: true`. Draw the final ant art only when the user asks.

**Branches:** one per stage, `build/stage-NN-name`, merged to `main` when CI is green (DR-194).

## Build log

### Stage 5 · Battle HUD and input → M1 hot-seat slice — done 2026-11-17
Branch `build/stage-05-hud`. Two people can play a full match on one phone: gate, aim, fire, retreat, handover, Pause, and a match end with Rematch.

**Built**
- **OVR-005:** `tools/bake-fonts.ts` draws "∞" for the F64 bake (`SYNTH_GLYPHS`): a lemniscate stroked at Lilita's "l" width, "x" height, on the minus axis, plus the same stroke layer. `KNOWN_MISSING` is empty. F64 now has 22 glyphs (with "!", OVR-010).
- **OVR-007:** `DESPAWN_MAX_Y = 740` in the shared despawn check (`src/sim/physics.ts`).
- **`src/hud/layout.ts`:** one pure `hudLayout(margins, handed, mode, S)` returns every UI.md §4.5 rect (J33, J38, J46 applied): anchored sides move by M − 16, the bottom mirrors for left hands with the walk pair swapped, the tray is a 3x2 grid (4–6) or an 88-tall row (1–3), the FIRE visual sits in its 120 hit, and the clear zone moves with the margins.
- **`src/input/`:** `keys.ts` (the DR-121 map, J53; Ctrl/Alt/Meta left to the browser), `aim.ts` (aim memory per ant and weapon with the 45° / 60% default, the stepper `Repeater`, dial, slider and slingshot maths). The DR-015 buffers stay in the sim ring (stage 3); input only makes commands.
- **`src/hud/`:** `controls.ts` (HoldButton for steppers, walk, Hop and Flip; FIRE with ready / queued / rejected / disabled; Dial; PowerSlider; WeaponSlot), `readouts.ts` (TeamPill, TurnPlate with the timer disc and the retreat 3-2-1, WindGauge, EffectsRow, MoveBar, AntTag, DamagePop, EdgeIndicator, NoticeView, GateButton, TeamFrame, DotBubble, AntPop), `notices.ts` (DR-131 queue), `link.ts` (what Battle shares).
- **`src/scenes/Hud.ts`:** its own camera at zoom S above Battle, so HUD rects never zoom. It reads sim state and pushes commands only. Pointers are tracked one by one. World drags: within 56 px of the active ant a slingshot, else a pan. Keys on `window`. Rebuilds on a Layout resize.
- **`src/scenes/Pause.ts`:** DR-171 panel (n = 4), Resume (default focus), Restart (destructive confirm, a new match seed), Settings and Quit to map (disabled until stage 7), footer "Match saved" / "Saving is off". It freezes Battle and Hud (sim, timer, camera, tweens). Resume: scrim out 150 ms, then a 600 ms real-time ready delay, then a logged `cancel` (buffers clear). Auto-pause on hidden tab, blur, portrait and browser back (Nav layer).
- **`src/game/twoPlayer.ts`:** `versusMatch(setup, seed)`: gate on, coin flip, 30/60 s timer, 2P ammo, Jungle Home wind, on the OVR-009 stand-in arena. Battle runs it by default (`?static=1` keeps the stage 4 dev arena with no HUD), draws the DR-129 aim preview in the world, and writes the versus slot at every TurnEnd.
- **Strings:** `hud.*` (DR-122, DR-127, DR-131, DR-145, DR-183), `weapon.*` (PLAN §4), `pause.round`.
- **Tokens:** `move-fill` (leaf-600, DR-123) and `heal` (leaf-200, DR-128) became semantic colours; no new values.

**Tests**
- `npm test`: 20 files, 315 tests. New: `hud-layout` (UI.md §6 check 3: both hands × margins 16, 24 and two mixed sets × 5 tray modes; every hit ≥ 64, gaps ≥ 8, FIRE ≥ 32, inside the safe rect, nothing in the clear zone; the §4.5 numbers; the mirror; 0.5 px snap), `input` (key map, aim memory, stepper timing, dial, slider, slingshot, notice queue, the versus match, the mirrored arena with no spawn in a hit rect (J50), the gate timing, DR-015 fire buffering in the air and the "late" drop), plus OVR-005 and OVR-007 cases.
- `npm run e2e`: 58 checks pass at the 3 viewports (stage 4's 33 plus 25 new; 2 skipped by design: the 667x375 shot runs on that phone only). A full turn by touch (desktop: mouse) through gate, stepper, tray, slingshot, FIRE and handover; a full turn by keyboard (Space, W, =, Tab, E, Q, 1, Space); the 667x375 readability shot; DR-015 fire buffering through the real key path (taken on landing within 12 ticks; too early is dropped as "late"); the live HUD rects in both hands; Pause freezes the tick and the timer, and Resume waits ≥ 600 ms and logs `cancel`; the gate is locked when it first shows; a resize mid-turn rebuilds the HUD with the same turn, plate and aim.
- **Review (a subagent read the whole diff against the DRs and the Phaser source):** 8 findings, all fixed: per-run Hud state now resets on restart (rematch kept `ended`, a stale plate, a stuck walk); losing focus during Resume's ready delay lands on Pause again; Pause releases drags and pointer tracks; the gate's 400 ms lockout counts from its first show (the coin pop hid it before); a hidden Pressable's zone takes no input (find-my-ant); a resize while paused rebuilds on resume, so the HUD stays frozen. No finding touched sim determinism.
- **CI:** green on the stage branch: run 31 (commit 0a1c093) passed `test` and `e2e` at the 3 viewports. Run 29 had failed: on CI's slow phone emulation the sim runs several times slower than real time, so the 40 s handover wait timed out. The tests now fast-forward the sim through the Battle hook (the match itself is unchanged). `main` then runs `build` and `deploy` for the tag `m1-hotseat`.

**Screenshots:** `docs/stage5/stage5-readability-phone-667x375.png` (who is up, the wind and the aim, pillar 2), `stage5-left-handed-*.png`, `stage5-pause-*.png`, `stage5-touch-handover-*.png`.

**Implementation choices inside the DRs** (no new numbers)
- Ant tags are drawn with Graphics, so DR-128's 3 px outline is exact (the r8 slice has 4). This closes the stage 4 open item.
- Shift is also the "+" modifier, so Shift hops on its release when no other key came while it was down. Z hops at once.
- Space and Enter pass the 2P gate (DR-183); the FIRE button never does (the gate's hit area is its button).
- Held keys W/S and the power keys use the DR-121 stepper repeat (DR-121 is the full key map, J53).
- Stepper repeats and the Pause ready delay run on real time (`performance.now`, `setTimeout`). The scene clock slows on slow frames, which made the delay 3 s in CI.
- A control reads the sim at press time, so a tap in the very frame a turn opens is not lost.
- The slingshot pull is measured from where the drag started; the band is drawn from the ant.
- DR-171's "y + 30" and "y + 66" are read as the centres of the title and caption lines.
- The two-player Pause caption is "Round R" (no level number; Q-15).
- Damage numbers use the F64 numeral bake scaled to 40 and 56.
- The Dot bubble is built but shows no tip yet: the docs give no two-player tip text (Level 0 tips come in stage 8).
- Until Results (stage 7), the match end shows DR-145's "{name} win!" / "Draw!" in the notice slot with a Rematch button at the gate rect.
- Find-my-ant compares the camera with where it can actually centre (the view is clamped to the world).

**Overrides logged:** OVR-005 and OVR-007 applied. OVR-009 (Tier G: the stand-in arena, until stage 9; `ToUser` Q-16). OVR-010 (Tier T: "!" in the F64 bake).

**Not done here on purpose:** double-tap to recentre (no timing in the docs, Q-17), bot aim visuals (stage 6), Settings and Quit (stage 7), Results (stage 7), Level 0 tips and the Next button (stage 8), boss plate and telegraphs (stage 9), the Jungle Home palette (proposed with the biome kit, stage 8).

### Owner answers after stage 4 — 2026-11-17
Read from `ToUser/TODO.md` and moved to `ToUser/archive/ANSWERED.md`. Approved: OVR-005 (draw "∞", stage 5), OVR-007 (shots below y 740 are removed, stage 5), OVR-008 (drop rules: two-player alternates Honey Drop and Seed Bundle every 3rd round with x from the match seed, stage 7; boss drop spots per fight, stage 9). Confirmed as built: DR-172 dialog timing (Q-12), labels may shrink to 22 px (Q-13). Credit: "Made by BlurryRainbow" (Q-10, stage 7). Biome palettes: the builder proposes, the owner approves from a screenshot (Q-11). Still open: Q-01 to Q-04, Q-06, Q-07 (before stage 8/9), R-02 phone ms, R-03 ant art. The owner asked for **a full code review of everything before the boss fights (before stage 9)**.

### Stage 4 · Render, assets, UI foundation — done 2026-11-17
Branch `build/stage-04-render`. The Battle scene draws a live match with placeholder art, and the token and asset pipelines exist.

**Built**
- **Tokens (`tools/gen-theme.ts`):** `theme.ts` now also exports `tokens`: spacing, radius, outline, shadow, type, touch, layout, shape, motion, focus and every component token, with `{ref}`s resolved (scales by field name, colours to their semantic name).
- **Asset manifest (`src/assets/manifest.ts`, DR-195):** the only place for frame names, atlas and font paths, origins, `trinketAnchor` and the ant hurtbox. Keys such as `ant.side.blue.idle`, `ui.icon.back`, `weapon.icon.seed`, `projectile.dewdrop`. `placeholders()` lists every placeholder for the stage 13 release gate.
- **UI art (`art/ui/*.svg`, 57 files):** 36 icons (32 viewbox, `currentColor`), the r24 / r16 / r8 nine-slice sets (outline, fill, band), the two team badges and the boss segment, the acorns and twinkle dot, wind chevron, ghost chevron and hub, aim dot and ring. Only `#fff` and `var(--token)` appear in them.
- **Placeholders (`art/placeholder/*.svg`):** flat token shapes for the 6 weapons (40 and 120) and the 2 pickups. The ants use the concept cut-outs.
- **`tools/build-ui.ts`:** substitutes tokens, embeds the PNG placeholders, lays every page out as one SVG and rasterises it once with resvg at 2x into a Phaser multiatlas. Shared atlas today: **1 page (1024x1140), 79 frames, UI art 0.34 MP of the 2 MP budget**.
- **`tools/bake-fonts.ts`:** opentype.js glyph paths → one SVG sheet → resvg. BMFont XML with GPOS kerning, plus a stroke sheet with the same layout for F64 and F128. Charsets from theme.json; F56/F80 add every character of `src/i18n/en.json`. F56 97 glyphs, F64 20, F80 97, F128 41; about 1.8 MP in all (DR-081 estimated 1.7).
- **`src/i18n/`:** `en.json` holds only copy that the docs give (Pause, save prompts, modal Cancel and so on), and `t()` fills `{placeholders}`.
- **`src/ui/`:** `layout.ts` (DR-085 margins, safe rect, 9 anchors, the M − 16 shift, mirror, snap, `LayoutService` with the `env()` probe), `focus.ts` (DR-086 registry, nearest-in-direction with 2 × cross distance, Tab order, press on keydown / act on keyup, trapping scopes), `nav.ts` (DR-090 layers first, then the scene rule, history depth with re-push), `fitText.ts` (DR-087 shrink → wrap → ellipsis, strict in dev), `motion.ts` (DR-084 reduced-motion caps), `text.ts` (bitmap labels with the stroke layer, Nunito at resolution S), `components.ts` (JellyBox, Panel, Button, IconButton, FocusRing, `bindFocusKeys`), `ConfirmModal.ts` (DR-172) and `assets.ts` (loader).
- **`src/render/`:** `terrainPixels.ts` (fill bake with the 10 px band, 2-pass radius-2 box blur, ink LUT, composite), `terrainView.ts` (12 chunk canvases, only touched chunks re-upload), `camera.ts` (DR-046 with J7 and J49), `loop.ts` (fixed step), `sprites.ts` (ants, projectiles and pickups by manifest key, interpolated), `juice.ts` (landing squash).
- **Scenes:** `Battle` (fixed-step loop on a `Match`, reads state only, `?static=1`, `?mem`) on a dev arena (`src/scenes/devArena.ts`: every material once, built with the sim trig table). `UiLab` (`?scene=uilab`) is a dev gallery of the UI foundation. The stage 0 spike is deleted.

**Tests**
- `npm test`: 18 files, 256 tests. New: `contrast` (UI.md §6 check 1), `no-literals` (check 2, also scans the SVG art), `manifest` (key test, ≤ 3 resident pages, UI area, page bounds, a real rasterise, the font bake), `ui-foundation` (Layout, Focus, Nav, fitText, motion), `render` (band, outline width, crater rim, no edge ink, chunks, camera rules, fixed step).
- `npm run e2e`: 33 checks at 844x390, 667x375 and 1280x720 (11 tests × 3). Battle: boot, the static screenshot, 12 chunks, **resident atlas pages 1 (limit 3)**, texture memory under 96 MB, a Seed shot through `match.push` leaves a clear crater with an ink rim and redraws at most 4 chunks, no seams at S=1 and S=2 over 5 camera poses, the `?mem` line. UI: taps act on release, a drag 16 px out cancels, disabled never acts, keyboard ring and Tab/arrows/Enter, the modal's safe default, focus trap, Esc and B, the destructive scrim rule.
- **CI:** green on the stage branch (run 22, commit 96b3777: `test` and `e2e` passed; `build`/`deploy` skipped off `main` by design). `main` run 24 (commit b2c8c23) passed `test`, `e2e`, `build` and `deploy`.

**Screenshots:** `docs/stage4/battle-*.png` (static battle at the 3 viewports), `uilab-*.png`, `uilab-modal-*.png`.

**Measured**
- Terrain refresh for one Seed crater (desktop Chromium, CPU WebGL): 0.4–0.5 ms, once 9.6 ms on the first blast of a page (JIT warm-up). Phone numbers are still unknown (DR-024 budget: median 3 ms, p95 6 ms).
- Outline: 4–6 px of solid ink across a straight edge, centred on it (DR-024: "about 4.5 px").

**Implementation choices inside the DRs** (no new numbers)
- Ink LUT: full ink for |S − 0.5| ≤ 0.30, fading to none at 0.40.
- Water does not start a surface band: only air does. Ground under a pool keeps its plain fill. (A first version banded it; the seam test found it.)
- Menu keys listen on `window`, not on Phaser's key queue. The queue is read once per game step (too late for `preventDefault` on Tab), and it gave one key event to a listener twice when two keys landed in one frame (2 runs in 5).
- Generated atlas pages and font sheets are not committed. `npm run assets` makes them (part of `dev` and `build`).
- All nine-slice sets have a 4 px outline. The r16 and r8 sets have a 6 px band, r24 an 8 px band.
- KO ants are hidden for now. The stretcher animation is a later stage.
- The dew is a flat `info` rectangle from `turns.dewY` down.

**Overrides logged:** OVR-005 (Tier G, **proposed**: draw the missing "∞" glyph; see `ToUser/TODO.md` Q-08). OVR-006 (Tier T: resvg 2.6.2, opentype.js 2.0.0, the `.woff` bake sources).

**Not done here on purpose:** the HUD, input and Pause (stage 5), Boot/Preload/Title and the HTML Settings (stage 7), the `en-XA` pseudo-locale (stage 7), level data and biome palettes (stage 8), the rest of the juice pass (stage 11), final art (stage 12).

### Stage 3 · Turn flow, match, replay, saves — done 2026-11-17
Branch `build/stage-03-turn-flow`. A full match now runs headless from seed to win.

**Built**
- **`src/sim/commands.ts`:** the command types, a 4-slot ring and the DR-015 buffers (FIRE 12 ticks, jump 9 ticks, counted in sim ticks). Commands are `fire`, `walk` (held), `face`, `hop`, `flip`, `ready` (the one "tap") and `cancel`. They always address the ant whose turn it is. Angles are whole tenths of a degree from −20° to 90°, power is whole per-mille (J9).
- **`src/sim/turn.ts`:** the turn state machine. TurnStart (900 ms, or 600 ms and skippable through L10) → Move/Aim (30 s timer, 60 s relaxed, or none) → Fire (18-tick input lock, then the shot spawns) → Resolve (3 s retreat window, settle rule, 12 s cap) → TurnEnd (700–1800 ms) → next TurnStart or MatchEnd. Also here: team alternation and ant rotation, the two-player tap gate, sudden death, pickup drops, the win, draw and round-cap rules, and the wind roll at each turn change.
- **`src/sim/match.ts`:** now owns the turn machine. `push()` logs a command and `step()` runs one tick. `stateHash()` covers everything that is sim state, the turn machine included.
- **`src/sim/replay.ts`:** `runLog()` re-simulates a match from its input log, in slices if wanted.
- **`src/save/`:** `schema.ts` (`ants.save.v1` with the J48 goal bits, `losses`, `settings.twoPlayer` and `wardrobe`, plus `normalise`, acorn and unlock helpers), `store.ts` (try/catch storage, in-memory fallback, `migrate()` chain, corrupt blob moved to `ants.save.bak`), `matchSlot.ts` (`ants.match.v1`, resume by replay).

**Tests:** `npm test` runs 13 files and 186 tests (was 10 and 125).
- `turn.test.ts` (38): phase order on exact ticks, team and ant rotation, the timer (skip at 0, 60 s, none), buffers, the fire lock, the retreat window, the settle rule, the 12 s cap, sudden death, win, draw and round cap, the gate, lost turns and drops.
- `replay.test.ts` (7): three seeded matches of 9,000 ticks with random inputs, on an arena with every material, water, three wind fields and drops. The replay matches the live match's state hash at every 25-tick checkpoint, and its events and log. Also resume mid-match, and proof that one changed command changes the hash.
- `save.test.ts` (14): round trip, 7 kinds of corrupt blob moved to `.bak`, bad values falling back to defaults, blocked storage, the migrate chain, goal bits and acorns, and the match slot (resume, build mismatch, tampered log).
- **CI:** green on the stage branch. Run 18 (commit 75f8447, the stage 1–2 review fixes) and run 19 (commit 8a0df19, stage 3) both passed `test` and `e2e`; `build` and `deploy` are skipped off `main` by design. `npm run e2e` still passes 26 checks with 1 skipped.

**Measured** (facts, no overrides)
- A plain Seed turn: FIRE taken on tick 55, shot out on tick 72, TurnEnd on tick 252, next ant's Move/Aim on tick 348. That is 4.9 s from FIRE to the rival's turn, of which 3 s is the retreat window.
- A timed-out turn with everything at rest goes straight to TurnEnd: 42 ticks later the next TurnStart begins.
- With the default rules and nobody shooting, the dew takes both teams at the end of round 25 on a flat map (ants at y 400): a draw.
- Replay speed in node: a 9,000-tick match (2.5 minutes of play, 27 shots) re-simulated in 36 ms. Not measured on a phone yet; DR-047's target is 3 s for a whole match.

**Implementation choices inside the DRs** (no new numbers)
- **TurnEnd length.** PLAN §3 gives a 700–1800 ms range and the parts (knock-out 1200, dew 800, drop 700). The build uses: the knock-out beat runs alongside the others, dew then drop run one after the other, and the total is kept within 700–1800 ms.
- **Timeout while something moves.** At 0 the turn is skipped (DR-043). If an ant is still in the air, the machine waits for the settle rule first, with no retreat window.
- **Fire.** Ammo is spent when FIRE is taken. The shot spawns after the 18-tick lock. The ant cannot walk during the lock.
- **Lost turn.** An ant that swam back "loses its next turn" (DR-026). The build plays its TurnStart and then goes to TurnEnd, so the team gives up that turn. It still counts toward par.
- **Dew.** It rises 24 px at the TurnEnd that closes a round, when the next round is 21 or later (30 on bosses). It rises from the world bottom, or from the water line on water levels (J20). An ant whose feet are under the line is knocked out, at TurnEnd and during play. Pickups under it are lost. It does not change terrain or stop projectiles.
- **Dew warning.** The event fires at the TurnEnd before round 18.
- **Round cap.** Judged at the TurnEnd that closes round 40: more total HP wins, equal HP is a draw.
- **Coin flip.** Two-player's first team is the first draw on the `wind` stream ("the match seed", DR-182).
- **Gate.** A tap counts once the 500 ms pan and the 400 ms lockout have passed (DR-183).
- **Drops.** A drop is `{round, kind, x}`. It lands at the TurnEnd that closes that round, on the first solid cell from the top of the world, and rests at hurtbox height (22 px up) so a walking ant touches it. Over a void, water or the dew it is lost.
- **Force settle.** At the 12 s cap, live projectiles fizzle, ants stop, and an ant in the air is put on the ground straight below with no fall damage. With nothing below, the void or water rule applies.
- **`cancel` command.** Pause must clear input buffers on resume (DR-171). That has to be a logged command, or a replay would keep inputs the live match dropped.
- **Saves.** Goal bits add up across clears and are never taken away. Only the Music and SFX defaults are documented (70 and 80); the other settings start as off, Auto, Normal, tips on. A blob from a *newer* save version is treated like a corrupt one (kept in `.bak`).

**Review of stages 1 and 2** (asked for by the user; the whole of `src/sim` was read again)
- **Fixed: the Dewdrop bounced straight back at the thrower.** The surface normal was read from a 9x9 window centred on the projectile. The Dewdrop's ring is 8 px out, so the window never reached the ground and the code fell back to "reverse the velocity". Every bounce went back along the flight path. The normal is now read at the ring point that touched (`contactNormal`). On flat ground it is exactly (0, −1) for both ring sizes, and the Dewdrop bounces forward with ×0.85 along the ground and ×0.55 up, as DR-034 says. Two new tests cover it. The old tests missed it because they only counted bounces.
- **Fixed: the random generator was sfc32 with its counter off by one.** It added the counter after incrementing it. It now adds first, as published. Same quality, but now an outside sfc32 gives the same numbers, which the stage 6 bot refit needs. The known-answer test vector changed. No save or replay existed yet.
- **Checked and left alone:** terrain erase, fill and fragment cleanup; the RLE mask; projectile stepping and despawn; the wind fields; damage, knockback and fall damage; walking, hops, slides, water and void; all six weapons in a 30-shot sanity matrix (each weapon at five angle and power pairs). Nothing else was wrong.

**Overrides logged:** OVR-004 (Tier T: the match save also stores its tick, a state hash, and one slot per mode). No Tier G.

**Not done here on purpose:** wiring saves to `localStorage` and the build id (stages 4 and 7), the HUD and input layer (stage 5), bot turns (stage 6), Level 0's special rules (stage 8), the boss telegraph card in TurnEnd (stage 9).

### Stage 2 · Weapons, damage, movement — done 2026-11-17
Branch `build/stage-02-weapons`. All of it is plain TS in `src/sim`. No Phaser, and ban-scan is clean.
- **`weapons/`:** one file per weapon (`seed`, `dewdrop`, `pollen` with its puffs, `grub`, `roller`, `plop`), plus `fly.ts` (the shared ballistic tick, despawn and 480-tick cap) and `index.ts`. `index.ts` holds the `WEAPONS` table, `fire()`, `stepShot()`, the per-ant 60-cap ledger, and how blasts are applied (crater or fill, damage, knockback, pickups popped). The weapon numbers are the PLAN §5 table.
- **`damage.ts`:**
  - Falloff `max(0, dist(blast, capsule segment) − 16)` per J1, linear down to 25 %.
  - A direct hit is ×1.2. The cap is 60 per ant per shot. Self-damage is ×0.5 and never lethal, and friendly fire is on.
  - Knockback is `min(600, 8·dmg)` at 25° or more upward. Fall damage follows DR-026.
- **`movement.ts`:**
  - Walking: 80 px/s, a 160 px budget, step-up 8, the 45° limit and the 30°→45° slow-down.
  - Hop and back-flip use their budget costs. Flight has 2 px steps and terminal speed 700, and lands on 3 foot probes.
  - Also here: the one BOUNCY rebound at e 0.6, slides over 60° (over 10° on SLICK), SLICK deceleration 90, the embed push-up of at most 24 px, the side walls at 24/936, void KO below y 580, and the water swim-back after 6 ticks with `skipNextTurn`.
- **`pickups.ts`:** Honey Drop (+25 HP, capped at 100) and Seed Bundle (+2 Dewdrop, +1 Pollen). Both are collected by an ant on the ground touching them, and a blast pops them.
- **`angle.ts`:** asin by searching the trig table, plus slope and vector rotation. This replaces `atan2`, which the sim may not use.
- **`physics.ts`:** a `water` step result. **`match.ts`:** now holds ants, team ammo (two-player defaults) and `fire`/`walk`/`hop`/`flip` commands. The turn FSM is still stage 3.

**Tests:** `npm test` runs 10 files and 125 tests. The new files are `damage` (falloff, ×1.2, cap, self, knockback, fall), `weapons` (table, DR-009 sanity numbers, behaviour, pickups, replay stability for all 6 weapons) and `movement`. `npm run e2e` still passes 26 checks with 1 skipped. **CI:** green on the stage branch (run 13, commit 6710558: `test` and `e2e` passed; `build`/`deploy` skipped off `main` by design).

**Measured against DR-009** (facts, no overrides):
- Full-power 45° ranges: Grub, Roller and Plop land within 1.2 % of 864 / 624 / 700 px, and Seed and Dewdrop within 1.2 % of 1143 / 780. They come out about one tick short, as in stage 1.
- The Grub tunnel is 150 px (±4) after 60 ticks. ROCK pops it on the surface. On a 40 px wall it pops as its r 11 dig circle opens the far face.
- The Roller from 158 px/s on SOIL rolls 130 px (±4) and pops at tick 151 (the fuse). On SLICK it slides **≈ 376 px** before the fuse, not DR-009's "about 490". 490 px matches a 200 px/s start, so DR-009's figure looks like a hand-calculation slip. The code follows the formula.
- Roller: a 20° downhill speeds the ball up. It bounces once off a 20 px wall at half speed, and it climbs an 8 px step.
- Mound Plop: water inside the 34 px fill becomes SOIL, nothing within 18 px of an ant's hurtbox is filled, and nothing is erased.

**Implementation choices inside the DRs** (no new numbers):
- A shot spawns at the shooter's hurtbox centre and ignores the shooter until it has left the capsule. No DR gives a muzzle point.
- The DRs give ring radii only for Seed, Pollen and Dewdrop, so Grub, Roller and Plop use the small ring (4 px).
- Dewdrop uses its own restitution 0.55 and keeps 0.85 of its tangential speed (DR-034, PLAN §5), not the material e. A water skip (e 0.5) does not count toward its 3 bounces.
- Roller: a rise of more than 8 px is a wall and a drop of more than 8 px is a ledge. After a fall it lands again with the same `min(200, 0.35 × speed)` rule. Its slope comes from 7 integer height samples 1 px apart.
- The Grub's hit is direct only in flight (DR-009 says "in flight"). Pollen bursting on an ant uses the capsule normal.
- Knockback: each blast sets the ant's velocity, so the latest blast wins.
- Halving fall damage on SOFT rounds like DR-035 (`Math.round`).
- Walk slow-down applies uphill only. Foot contacts are searched 44 px up and down (the head-probe height).
- Swim-back scans x, x+1, x−1, … out to 200 px. If no dry ground is found, the ant is knocked out (see the open questions).

**Overrides logged:** none. Four Tier G questions are under "Open items" and nothing was changed for them.

### Stage 1 · Sim core — done 2026-11-17
Branch `build/stage-01-sim-core`. Everything is plain TypeScript under `src/sim`. It imports nothing from Phaser and runs in node.
- **`rng.ts`:** sfc32 seeded by cyrb128(`"{matchSeed}:{levelId}:{purpose}"`). Five streams: `terrain`, `wind`, `spread`, `ai`, `cosmetic`. Each has `getState`/`setState` for replays. A known-answer vector is locked in the test, so changing the algorithm breaks it on purpose.
- **`trig.ts`:** generated by `node tools/gen-trig.ts`. It holds a literal 901-entry sine table (0° to 90° in 0.1° steps) plus `sinDeci`/`cosDeci` for integer tenths of a degree (J9). Biome skips this file so the committed text stays byte-exact.
- **`terrain.ts`:**
  - `TerrainGrid` holds the 8 materials with the DR-022 crater × / e / mu tables.
  - `erase` works per cell by material (ROCK is never erased, WATER is untouched). `fill` follows J25 and takes a keep-out callback.
  - Each erase or fill pushes one dirty rect (`drainDirty`). `hash()` gives an FNV-1a hash of the cells.
  - `encodeRle`/`decodeRle` read and write the DR-025 mask format: (material byte, LEB128 run).
- **`physics.ts`:**
  - Semi-implicit Euler at 60 Hz, g 600. Launch speed is `wMul·(100+620·p)` with power in per-mille and the angle in 0.1°.
  - Speed is capped at 1500 px/s, and moves are cut into steps of 2 px or less.
  - Each step tests the centre plus a 4-point ring and the ant capsule (DR-027).
  - Also here: the 9x9 surface normal, the DR-023 bounce, the DR-026 despawn bounds and the 480-tick flight cap. `simulateFlight` is the shared flight loop for tests, the aim preview and the bot.
- **`wind.ts`:** `WindField` with `LevelWind` (rolled one turn ahead on the `wind` stream), `ColumnWind` (smoothstep, active 1 turn in N), `OscillateWind` (trig table, quantised to 1/64), `CompositeWind` (clamps x to ±5 levels) and `CALM`.
- **`match.ts`:** a skeleton with the tick, the 5 streams, a command log stamped with ticks, live projectiles, impact events and `stateHash()`. Weapons, ants and the turn FSM come in stages 2 and 3.

**Tests:** `npm test` runs 7 files and 66 tests. The new ones are `rng`, `ban-scan`, `trig`, `terrain` and `physics`, and the physics file includes the match-skeleton determinism check. The scanner lives in `tools/ban-scan.ts`. It strips comments and strings, then bans `Math.random`, `Date`, `performance`, the inexact `Math` functions, `**`, comparator-less sort and Phaser imports. It allows `new Set`/`new Map` only with a `det-ok:` comment. `npm run e2e` still passes 26 checks with 1 skipped. **CI:** green on the stage branch (run 9, commit 9af10f2: `test` and `e2e` passed; `build`/`deploy` skipped off `main` by design). The `main` run after the merge deploys.

**Measured numbers** (these are facts, not overrides; the DR text quotes closed-form values):
- Full power at 45° with wMul 1 lands at **855.5 px after 101 ticks (1.68 s)**, against 864 px / 1.70 s in the closed form. Semi-implicit Euler at 60 Hz loses about one tick. DR-030 sets that integrator, so nothing was changed. The test allows 1.2 %.
- 50 % lands at 275.3 px (closed form 280). 70 % lands at 468.9 px (closed form 475).
- A 500 px Seed shot (power 612‰) drifts **62.5 px at wind 5 and 12.5 px at wind 1**, which matches DR-031.
- No tunnelling: 832 shots at 1500 px/s at a 6 px wall, covering sub-pixel offsets and angles from −30° to +30°, all stop before the wall.

**Implementation choices inside the DRs** (no number or rule was added):
- Fragment cleanup flood-fills, with 4-neighbour connectivity, only from solid cells next to cells *this* erase removed. So an authored small piece the blast never touched stays. A piece resting on a `floor` bottom counts as attached.
- `LevelWind` turn 0 rolls the opening level from `start`, which defaults to 0 because the DRs give no opening wind. Level data can set it in stage 8. Fixed-sign biomes use `minAbs` + `sign`.
- `fill` and `materialAt` treat the area below a `floor` bottom as SOIL (the "default ground" row in DR-022).

**Overrides logged:** none in stage 1.

### Stage 0 · Scaffold, CI, Pages, S=2 spike — done 2026-11-16
Branch `build/stage-00-scaffold`.

**Built**
- Toolchain at the PLAN §2 pins: Phaser 3.90.0, Vite 8.3.5, TypeScript 5.9.3, Vitest 5.0.5, Biome 2.6.4. Scripts `dev build typecheck lint test e2e ci`.
- `index.html` with the viewport meta, `#game`, and inline splash, rotate and fatal shells. Colours come from `theme.json` at build time, so the file has no colour literal.
- `.github/workflows/deploy.yml`: `test` and `e2e` on every stage branch and on `main`; `build` and `deploy` to Pages from `main` only.
- `src/main.ts`, `src/boot/config.ts`, `src/boot/renderScale.ts`, `src/scenes/Spike.ts`.
- `tools/gen-theme.ts` (theme.json → `theme.ts` + `theme.css`), self-hosted Lilita One and Nunito with their OFL texts.

**Spike result: S=2 works. No fallback needed.** The render path in DR-013 stays as planned.

What the spike draws, at S=2 and at S=1: terrain as 12 chunk canvases, 2x art at half scale, a vector badge, nine-slice jelly buttons, Lilita One bitmap text with a stroke layer, Nunito runtime text, and a world camera that zooms and pans under a fixed HUD.

| Check | How it was tested | S=2 | S=1 |
|---|---|---|---|
| Seams between terrain chunks | every pixel of the solid soil read back at 7 camera poses (zoom 1, 1.15, 1.2, 1.25, fractional pan) | 0 bad pixels | 0 bad pixels |
| Seams inside nine-slices | panel strips that cross every slice edge, read back | 0 bad pixels | 0 bad pixels |
| UI alignment | the button face's pixel box against its logical rect | exact | exact |
| World alignment | the badge's pixel box against the camera maths | within 1.5 canvas px per edge | within 1.5 canvas px per edge |
| Input | taps on the button's logical rect, by touch and by mouse; a tap 8 px outside misses | pass | pass |
| Crisp text and ink | by eye, on the crops below | sharp | soft, as expected |

These ran at 844x390 (DPR 3), 667x375 (DPR 2) and 1280x720 (DPR 1): 26 Playwright checks, all green.

**Frame time (read this with care).** The test machines have no GPU, so Chromium draws WebGL on the CPU. That makes S=2 look slow there: it has 4x the pixels.

| Viewport | S | Frame, median / p95 | Game code per frame, median / p95 |
|---|---|---|---|
| 844x390, CPU slowed 4x | 1 | 33 / 50 ms | 2.8 / 7.0 ms |
| 844x390, CPU slowed 4x | 2 | 133 / 183 ms | 4.4 / 15.2 ms |
| 667x375, CPU slowed 4x | 1 | 33 / 50 ms | 2.8 / 5.8 ms |
| 667x375, CPU slowed 4x | 2 | 117 / 267 ms | 3.0 / 6.1 ms |
| 1280x720 | 1 | 33 / 50 ms | 0.6 / 1.2 ms |
| 1280x720 | 2 | 117 / 133 ms | 0.7 / 4.3 ms |

- **Verified:** the game's own cost per frame is about the same at S=1 and S=2, and far under 16.7 ms.
- **Not verified:** how fast a real phone GPU fills the S=2 canvas. No emulator can tell us. The spike page shows its frame time in the bottom-left corner, so a look at the live page on a phone answers it: about 16.7 ms means 60 fps.
- The safety net is already planned: the "smooth mode" prompt that drops to S=1 (DR-013), built in stage 13.

**Screenshots** (`docs/spike/`; `-s2` is S=2, `-s1` is S=1, `-crop` is a close crop, `-pan` is the camera zoomed 1.2 and panned):

| Viewport | S=2 | S=1 | Crop S=2 | Crop S=1 | Panned S=2 |
|---|---|---|---|---|---|
| 844x390 | [png](spike/phone-844x390-s2.png) | [png](spike/phone-844x390-s1.png) | [png](spike/phone-844x390-s2-crop.png) | [png](spike/phone-844x390-s1-crop.png) | [png](spike/phone-844x390-s2-pan.png) |
| 667x375 | [png](spike/phone-667x375-s2.png) | [png](spike/phone-667x375-s1.png) | [png](spike/phone-667x375-s2-crop.png) | [png](spike/phone-667x375-s1-crop.png) | [png](spike/phone-667x375-s2-pan.png) |
| 1280x720 | [png](spike/desktop-1280x720-s2.png) | [png](spike/desktop-1280x720-s1.png) | [png](spike/desktop-1280x720-s2-crop.png) | [png](spike/desktop-1280x720-s1-crop.png) | [png](spike/desktop-1280x720-s2-pan.png) |

**Render rules the spike fixed for later stages**
1. The canvas is 960·S x 540·S. Every camera gets `setBounds(0, 0, 960, 540)` and `setZoom(S × gameZoom)` (`applyLogicalCamera` in `src/boot/config.ts`). Move cameras with `centerOn`, pan or follow. Never write `scrollX`/`scrollY`: at S=2 "no pan" is scroll −480, −270, not 0.
2. Do not use `camera.setOrigin(0, 0)`. Phaser 3.90 computes `worldView` and the bounds clamp from a centred origin (read in the Phaser source).
3. Art is rasterised at 2x and drawn at scale 0.5. A nine-slice is created at twice its logical size with 48 px corners, then scaled 0.5.
4. Bitmap fonts are baked at 2x the role size. Runtime text uses `resolution: S`.
5. Half-pixel positions stay sharp at S=2 (DR-085 snap rule).
6. Phaser's camera shake is sized from the camera width, which is 1920 at S=2. Stage 4 must size shake in logical px. This is from reading the source and is not tested yet.

**Tests**
- `npm test`: 2 files, 7 tests (render scale rule, theme tokens in sync).
- `npm run e2e`: 26 checks pass, 1 skipped by design (the rotate overlay check is for touch devices only).
- **CI (GitHub Actions):** green. Stage branch run 3 and `main` run 4 passed `test` (typecheck, lint, unit tests) and `e2e` (the 26 Playwright checks, built with the `/Ants/` base path). On `main`, `build` and `deploy` also passed.
- **Pages:** `https://rainbowblurry-book.github.io/Ants/` answers HTTP 200 with the new `index.html` (checked 2026-11-16). The builder could not run a browser against the live URL from its container. The same build, served under `/Ants/`, is what the CI browser checks ran against. A look on a real phone is still open (see "Open items").
- Run 1 on the stage branch failed on lint only (quote style in the workflow file) and was fixed in the next commit.

**Overrides logged:** OVR-001 (CI runs on stage branches), OVR-002 (Playwright and Node-types pins), OVR-003 (token generator and fonts arrive early). All Tier T. No Tier G.

**Not done here on purpose:** the splash progress feed, audio gate, rotate pause and crash-loop breaker (stage 7); the build-time font bake and UI atlas (stage 4); Performance mode (stage 7 Settings).

## Planning history

### Done
**Checkpoint A** (approved except ant art):
- Docs: `BRIEF.md`, `DESIGN_PILLARS.md`, `DEBATES.md` and DR-001 to DR-008a.
- `preview/ui-preview.html` with 15 screenshots, and `art/reference/`.
- `CREATIVE.md` and `STORY.md`.

**Checkpoint B:**
- `docs/PLAN.md` covers:
  - architecture, toolchain pins, game loop and turn state machine
  - terrain, physics, wind fields, weapons, damage and movement
  - the full 100-level table, 10 bosses plus the 3-phase finale, and the level schema
  - bot AI with its error model and a calibrated curve
  - the test list, including the `ai-cap` headless test spec
  - the GitHub Pages workflow and the repo setting, plus risks
- After the user's review: Level 0 (DR-058, DR-070), the 3 new weapons (DR-009, haiku Debate 4 in `DEBATES.md`), the early reward track (DR-071) and kits (DR-072). These are reflected in `PLAN.md` §1, §4, §5, §6, §8, §9 and §10, and in `CREATIVE.md` §5.
- `docs/DECISIONS.md`: 51 new records (DR-010 to DR-067) from six Sonnet debate subagents at medium effort (tech, terrain, physics, turn flow, campaign, bot AI). They are followed by the planner's judging summary (J1–J22) and a judge's line on every record.
- Bot-AI calibration: a planner Monte-Carlo, not committed, using the plan's physics. At levels 90–100 the bot lands about 95% of benchmark shots inside the lethal radius in stable wind. Level 1 lands about 25%, level 20 about 39%, and the curve rises steadily in between.
- Verified on 2026-11-16:
  - npm pins: phaser 3.90.0, vite 8.3.5, typescript 5.9.3, vitest 5.0.5, biome 2.6.4
  - GitHub Actions majors: checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5


**Checkpoint C:**
- `docs/UI.md`: the full UI spec. It covers design language, palette with verified contrast pairs, type, spacing, touch, motion, safe area, focus and keys, 23 components with states, the screen map, every screen with rects, the Battle HUD rect table, the asset list (ant sprites mapped to `art/source/`), acceptance checks, and open items. Every item cites a Decision ID.
- `src/ui/theme.json`: three-layer tokens (primitive, semantic, component), with text colour and contrast ratio per fill.
- `docs/DECISIONS.md`: 81 new records (DR-080 to DR-183) from ten Sonnet debate subagents at medium effort, one per screen or system. The planner's judging table J27–J56 is binding, and each record has a judge line.
- Small sync edits:
  - `CREATIVE.md` §3: new action colour, 6 px shadow, 18 px text floor, self-hosted fonts.
  - `PLAN.md` §3: the two-player colour swap is removed (J46).
- **Verified:** I recomputed every text-on-fill contrast ratio (WCAG 2.x) with a script on 2026-11-16. The old raspberry `#E8456B` failed. The new `action` `#EE6083` with plum text gives 4.90, and the scrim was raised to 70% (60% gave 3.79).
- **Process note:** the HUD and Settings agents hit a rate limit before saving their files. I copied their records from their reports. No screenshots were taken in C (it is a spec only).

**Checkpoint D:**
- `docs/HANDOFF.md`: a one-page Decisions Summary, builder rules, and 14 stages (0–13). Each stage has files, acceptance tests and a HARD/ROUTINE tag. The milestones are M1 hot-seat at stage 5, M2 campaign at stage 8, and v1.0.0 at stage 13.
- DR-190 to DR-197 cover stage order, tagging, test gates, the override tiers, branching, the asset manifest and placeholders, src layout, and content pacing.
- **Process note:** the Sonnet limit was exhausted, and the user asked for D to be done now, so the planner ran D's compact debates itself.
- `main` is fast-forwarded to the planning branch.

- **Look:** DR-001 Flash vector world · DR-002 Seed Spitter / Dewdrop Bounce / Pollen Pod · DR-003/003a jelly UI, no glints · DR-004 Phaser 3.90.0 · DR-007/007a ant concept (placeholder art) · DR-008 biome order and rhythm.
- **Tech:** DR-010 60 Hz fixed step, rules in plain TS · DR-011 sfc32 streams, banned APIs, 0.1° trig table · DR-013 960x540 FIT with 2x crisp canvas (needs spike) · DR-014 96 MB texture budget · DR-017 Actions to Pages.
- **Terrain:** DR-020 one 960x540 screen · DR-021 `Uint8Array` grid owned by the sim · DR-022 8 materials · DR-024 chunked outline redraw · DR-025 build-time masks · DR-027 ant 88x63, capsule hurtbox.
- **Physics:** DR-030 g 600, full 45° shot 864 px · DR-031/032 wind levels ±5 at 25 px/s² plus Level, Column and Oscillate fields · DR-033 set-then-fire, wind-free short preview · DR-035 linear falloff, direct ×1.2, cap 60.
- **Turns:** DR-041 alternate teams, fixed ant rotation · DR-042 turn state machine with a 3 s retreat · DR-043 30 s timer, skip on timeout · DR-044 rising "dew" sudden death · DR-045 two-player tap gate.
- **Campaign:** DR-050 max 4 ants per side, AI index = level · DR-052 Dewdrop at L4, Pollen after Boss 1 · DR-053 4-round telegraphed boss loop · DR-055 no acorn gates, skip after 3 losses.
- **Level 0 and early game (user edits):**
  - DR-058/DR-070 "Training Grounds". Part 1 is practice against a bot that hits about 11% of shots: Seed, Dewdrop and Pollen are unlimited, you can't lose, and you get **one trial shot each of the 3 new weapons**. Part 2 is a **Level 70 Preview**: one attempt, 3 v 2 against a level-70 bot (about 80% accurate), with the full kit. DR-059's teasers are superseded.
  - DR-071: L1–10 are quick (about 28 min in total) with a cosmetic reward on every clear.
- **New weapons (haiku debate, DR-009):** Tunnel Grub (digs, L14), Pill Roller (rolls, L24) and Mound Plop (builds terrain, L34). DR-072: each level fixes its own kit, and two-player has all 6 weapons.
- **Bot AI:** DR-061 human-like input errors · DR-062 lethal radius = 0.5·blast radius from the hurtbox · DR-063/064 calibrated curve with a floor at L90+ (95%) · DR-065 `tests/ai-cap.test.ts`.

- **UI (checkpoint C):**
  - DR-080: `action` `#EE6083` with plum text; blue is the only fill with white text; scrim 70%.
  - DR-081: Lilita One bakes F56, F64, F80 and F128; Nunito body 22; floor 18.
  - DR-082: hit areas at least 64 (72 preferred); FIRE 120.
  - DR-085: safe-area margins from the overlap, not padding.
  - DR-086: focus ring is white plus ink.
  - DR-120/J33: Battle HUD rects, with no fullscreen button in Battle.
  - DR-121: dial, power slider, steppers and slingshot; power keys `+`/`-`/PgUp/PgDn.
  - DR-124: 3x2 weapon tray with Sneak chips.
  - DR-125: wind gauge plus an effects row (Up/Down swirl, Updraft, wave strip).
  - DR-126: boss "Next" chip plus ghost chevrons.
  - DR-140–145: Results, rewards and the skip offer (never "failed").
  - DR-150–154: Level 0.
  - DR-160–164: album, Wardrobe, and presets-only nicknames.
  - DR-170: HTML Settings, with Text size Normal/Large (J34).
  - DR-183/J46: two-player team frame plus a button gate.

## Ant art reference (`art/source/`, uploaded by the user 2026-11-16)
These are AI-generated (Gemini) images, used **as reference only**. They are never shipped and never traced. Final art is original flat SVG in `/art`, drawn by hand from these images (DR-007 licensing note, CREATIVE §7).

| File | Size | Shows | Used for |
|---|---|---|---|
| `art/source/heropose.jpeg` | 1024x1024 | upright 3/4 ant, hand on hip, raised fist, big grin, acorn cap, elbowed antennae, striped gaster | hero pose: landing, posters, comics, win/lose (CREATIVE §2) |
| `art/source/sidepose.jpeg` | 1376x768 | side view facing right, 6 legs down, one eye, small smile | side gameplay pose, drawn 88x63 in game, mirrored for left (DR-027) |
| `art/source/cocky.jpeg` | 1376x768 | head only: cocky face | face `cocky` (idle, win) |
| `art/source/aim.jpeg` | 1376x768 | head only: aiming face | face `aim` (aiming) |
| `art/source/oops.jpeg` | 1376x768 | head only: oops face | face `oops` (miss, near miss) |
| `art/source/dizzy.jpeg` | 1376x768 | head only: X-eyes, wobbly mouth, tongue, orbiting stars | face `dizzy` (hit, knock-out) |
| `art/source/readmePose` | text | the user's note: these are pose references | – |

**What to keep:** the proportions and shapes. That means the big round head with a wide mouth, the acorn cap with a curly stem, elbowed antennae with round tips, thin outlined limbs, a pinched waist, a large gaster with darker stripes, and a thick dark-plum outline.

**What to change when drawing (rules from earlier decisions):**
- The cap takes the **team colour** (blue `#0072B2`, amber `#E69F00`) and is **smooth**, with no scale texture. At most a few flat shade dots (DR-007, CREATIVE §2).
- Flat fills only, with at most one flat shade tone per shape. No gradients and no white shine streaks (DR-001, DR-003a).
- The team badge (blue circle, amber rounded triangle) goes on the gaster (DR-003, DR-007).
- Dizzy stars use round joins and ball tips, so no sharp points (CREATIVE §1).
- Body colours follow the CREATIVE §2 table (body `#B4532A`, stripes `#7A3418`, outline `#2E1A47`).
- The images are JPEGs on white, so cut-outs need keying. Use them for reference and size checks only.

**When the art is drawn:** add a Decision Record (DR-007b) that marks DR-007a's placeholders as replaced. Re-run the preview screenshots, and check the side pose reads clearly at 88x63 and at 667x375.

## Open items
- **Questions and checks for the owner:** all in `ToUser/TODO.md` (open: Q-01 to Q-04, Q-06, Q-07, Q-14 to Q-17, R-02 to R-04). Answered items move to `ToUser/archive/ANSWERED.md`.
- **Real-device checks** (UI.md §7, PLAN §12), for later stages: safe-area `env()` values in landscape, Hop-row thumb reach, device memory and blast ms, refitting the bot-cap constants against the real sim (stage 6).
- **Placeholders still in the manifest:** every ant key, the weapon and pickup art, and the terrain palette. `trinketAnchor` is `null` on the ant frames until final art (DR-162, stage 12).
- **Before stage 9:** a full code review of the whole repo (owner's request).
- **Stage 9:** replace the OVR-009 stand-in arena with the real two-player arenas.
- **GitHub Pages:** done by the user (Settings → Pages → Source: "GitHub Actions").

## Next step
**Wait for the owner's M1 phone playtest** (`ToUser/TODO.md` R-04). Then stage 6, Bot AI (HARD): `src/ai/`, the bot turn visuals (DR-129: crosshair, power bar, HUD mirror at 55%).
