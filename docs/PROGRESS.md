# Progress

**Current stage:** Build **stage 0 done** (scaffold, CI, Pages, S=2 spike). Next: stage 1, the sim core (HARD).

> ⚠ **ANT ART: the reference is in `art/source/`, but final art is not drawn or approved yet.** The build uses placeholders only (DR-195, DR-007a). Stage 0 draws no ants at all. Draw the final ant art only when the user asks.

**Branches:** one per stage, `build/stage-NN-name`, merged to `main` when CI is green (DR-194).

## Build log

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
- CI and Pages: see "Stage 0 CI" below.

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

## Open items carried forward
- **Ant art:** the reference images are in `art/source/`. The final SVG ant art is not drawn yet and waits for the user's go-ahead. UI.md §5 maps each sprite key to its reference file.
- **Real-device checks** (UI.md §7, PLAN §12):
  - the S=2 render spike
  - safe-area `env()` values in landscape
  - Hop-row thumb reach
  - device memory and blast ms
  - refitting the bot-cap constants against the real sim
- **Save and level-data schema additions from J48:** goal bits, `losses`, `settings.twoPlayer`, `wardrobe`, and `name`/`tagline`/`windHint`/`hint`. These must be in the D build plan.
- The "Made by" credit name is to be supplied by the owner.
- **GitHub Pages:** done by the user (Settings → Pages → Source: "GitHub Actions").

## Next step
Stage 1, the sim core (HARD): `src/sim/rng.ts`, `trig.ts`, `terrain.ts`, `physics.ts`, `wind.ts` and the `match.ts` skeleton, with the `rng`, `ban-scan`, `trig`, `terrain` and `physics` tests. The builder stops after each stage, and for playtests at M1 and M2.
