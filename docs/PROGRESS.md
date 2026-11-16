# Progress

**Current stage:** Checkpoint B **complete**. Waiting for the user's go-ahead to start checkpoint C (`docs/UI.md` + `src/ui/theme.json`).

> ⚠ **ANT ART IS NOT APPROVED.** The preview uses cut-outs from the user's concept image (`art/reference/placeholder/`, DR-007a). Do not draw new ant art until the user sends better images, then follow "How to send ant art" below. Checkpoint B did not touch ant art.
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
- **Bot AI:** DR-061 human-like input errors · DR-062 lethal radius = 0.5·blast radius from the hurtbox · DR-063/064 calibrated curve with a floor at L90+ (95%) · DR-065 `tests/ai-cap.test.ts`.

## How to send ant art (for the user)
Best results, in order of preference:
1. **Separate files, one pose per file:** transparent PNG at least 1024 px tall, or SVG. One file each for: hero pose, side gameplay pose (facing right), and each face (cocky, aim, oops, dizzy).
2. **Plain flat background** (pure white or pure green `#00FF00`), no text, no drop shadows, and nothing touching the character.
3. **Same character, same scale, same cap** in every file. One colour version is enough; team colours are applied in code.
4. **Upload into the repo** at `art/source/ants/` (or attach in chat). File names like `hero.png`, `side.png`, `face-cocky.png`.

## Open items carried forward
- Ant art: waiting for the user's images (see above).
- UI.md (checkpoint C) must decide:
  - touch target sizes at 667x375 (FIT 0.69)
  - keyboard power keys
  - the vertical wind chevron for the Garden swirl
  - boss telegraph HUD (icon plus ghost wind arrow)
- Build-time checks listed in PLAN §12: the S=2 render spike, device memory and blast ms, and refitting bot-cap constants against the real sim.
- **The user must switch on:** Settings → Pages → Build and deployment → Source: "GitHub Actions" (only needed once code reaches `main`).

## Next step
Checkpoint C: `docs/UI.md` + `src/ui/theme.json`. Cover the palette, fonts, spacing, every screen, and components with states and an asset list, each linked to a Decision ID. Use Sonnet debate subagents (medium effort), one per screen. Then commit, push, update this file and stop.
