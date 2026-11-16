# Progress

**Current stage:** Checkpoint C **complete**. Waiting for the user's approval before checkpoint D (`docs/HANDOFF.md`).

> ⚠ **ANT ART: the reference is in `art/source/`, but final art is not drawn or approved yet.** The user's Gemini images in `art/source/` are now **the** design reference for the ants (see "Ant art reference" below). They replace `art/reference/ant-concept.webp` as the main reference. The preview still shows the old placeholder cut-outs (DR-007a). Draw the final ant art only when the user asks, from these images.
**Branch:** `claude/eager-mccarthy-jpc952` on `rainbowblurry-book/Ants`.

## Done
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

## Key decisions so far
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
Checkpoint D, after the user approves C: `docs/HANDOFF.md`.
- It starts with a one-page Decisions Summary ("we chose X over Y because Z").
- Then a stage-by-stage build plan: files and acceptance tests per stage, each stage tagged hard (Fable, high effort) or routine (Sonnet subagent, medium effort).
- Stage 0 is the S=2 spike.
- The builder follows the decisions and logs any deviation as an `OVR-###` record.

Draft records for D's process questions already exist from an earlier debate this session: stage order, the hard/routine rule, the test stack, the Pages workflow, the override tiers, src layout, and placeholder art. They were run without PLAN.md and are not committed. Re-run them against PLAN.md before use; for example, they pinned Actions v4, where PLAN.md says v5–v7.
