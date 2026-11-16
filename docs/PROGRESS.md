# Progress

**Current stage:** Checkpoint B **complete**. Waiting for the user's go-ahead to start checkpoint C (`docs/UI.md` + `src/ui/theme.json`).

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
- After the user's review: Level 0 added (DR-058, DR-059) to `PLAN.md` §6, §9 and §10.
- `docs/DECISIONS.md`: 51 new records (DR-010 to DR-067) from six Sonnet debate subagents at medium effort (tech, terrain, physics, turn flow, campaign, bot AI). They are followed by the planner's judging summary (J1–J22) and a judge's line on every record.
- Bot-AI calibration: a planner Monte-Carlo, not committed, using the plan's physics. At levels 90–100 the bot lands about 95% of benchmark shots inside the lethal radius in stable wind. Level 1 lands about 25%, level 20 about 39%, and the curve rises steadily in between.
- Verified on 2026-11-16:
  - npm pins: phaser 3.90.0, vite 8.3.5, typescript 5.9.3, vitest 5.0.5, biome 2.6.4
  - GitHub Actions majors: checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5

## Key decisions so far
- **Look:** DR-001 Flash vector world · DR-002 Seed Spitter / Dewdrop Bounce / Pollen Pod · DR-003/003a jelly UI, no glints · DR-004 Phaser 3.90.0 · DR-007/007a ant concept (placeholder art) · DR-008 biome order and rhythm.
- **Tech:** DR-010 60 Hz fixed step, rules in plain TS · DR-011 sfc32 streams, banned APIs, 0.1° trig table · DR-013 960x540 FIT with 2x crisp canvas (needs spike) · DR-014 96 MB texture budget · DR-017 Actions to Pages.
- **Terrain:** DR-020 one 960x540 screen · DR-021 `Uint8Array` grid owned by the sim · DR-022 8 materials · DR-024 chunked outline redraw · DR-025 build-time masks · DR-027 ant 88x63, capsule hurtbox.
- **Physics:** DR-030 g 600, full 45° shot 864 px · DR-031/032 wind levels ±5 at 25 px/s² plus Level, Column and Oscillate fields · DR-033 set-then-fire, wind-free short preview · DR-035 linear falloff, direct ×1.2, cap 60.
- **Turns:** DR-041 alternate teams, fixed ant rotation · DR-042 turn state machine with a 3 s retreat · DR-043 30 s timer, skip on timeout · DR-044 rising "dew" sudden death · DR-045 two-player tap gate.
- **Campaign:** DR-050 max 4 ants per side, AI index = level · DR-052 Dewdrop at L4, Pollen after Boss 1 · DR-053 4-round telegraphed boss loop · DR-055 no acorn gates, skip after 3 losses.
- **Level 0 (user edit):** DR-058 "Training Grounds": a practice match against a ~11%-accurate bot, all 3 weapons unlimited, can't lose · DR-059 Sneak Peek: 3 quick teasers (Trail, Living Room, Kitchen) against a capped-accuracy bot, can't lose.
- **Bot AI:** DR-061 human-like input errors · DR-062 lethal radius = 0.5·blast radius from the hurtbox · DR-063/064 calibrated curve with a floor at L90+ (95%) · DR-065 `tests/ai-cap.test.ts`.

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
- Ant art: the reference images are in `art/source/` (see above). Final SVG ant art is not drawn yet and waits for the user's go-ahead. The UI.md asset list (checkpoint C) should list the ant sprites against these files.
- UI.md (checkpoint C) must decide:
  - touch target sizes at 667x375 (FIT 0.69)
  - keyboard power keys
  - the vertical wind chevron for the Garden swirl
  - boss telegraph HUD (icon plus ghost wind arrow)
- Build-time checks listed in PLAN §12: the S=2 render spike, device memory and blast ms, and refitting bot-cap constants against the real sim.
- **The user must switch on:** Settings → Pages → Build and deployment → Source: "GitHub Actions" (only needed once code reaches `main`).

## Next step
Checkpoint C: `docs/UI.md` + `src/ui/theme.json`. Cover the palette, fonts, spacing, every screen, and components with states and an asset list, each linked to a Decision ID. Use Sonnet debate subagents (medium effort), one per screen. Then commit, push, update this file and stop.
