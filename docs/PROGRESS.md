# Progress

**Current stage:** Checkpoint A **complete except ant art**, waiting for the user's go-ahead to start checkpoint B.

> ⚠ **ANT ART IS NOT APPROVED.** The preview uses cut-outs from the user's concept image (`art/reference/placeholder/`, DR-007a). The user rejected the SVG redraws (helmets looked wrong). Do not draw new ant art until the user sends better images; then follow "How to send ant art" below.
**Branch:** `claude/eager-mccarthy-jpc952` on `rainbowblurry-book/Ants`.

## Done (checkpoint A)
- `docs/BRIEF.md` (verbatim brief + standing additions), `docs/DESIGN_PILLARS.md`, `docs/DEBATES.md`, `docs/DECISIONS.md` (DR-001 to DR-008).
- `preview/ui-preview.html`: landing, battle HUD, level select, comic panel, character sheet (`?s=landing|battle|levels|comic|chars`), with the DR-007 ant (hero pose, side gameplay pose, 4 faces). 15 screenshots at 844x390, 667x375, 1280x720.
- `art/reference/`: approved preview + screenshots + `ant-concept.webp` (the user's concept; reference only).
- `docs/CREATIVE.md`: style, ant spec, UI style, motion, sound mood, tone, don'ts.
- `docs/STORY.md`: premise, cast, 10 biomes (terrain, wind, rival, boss), comic panel scripts for every biome plus an epilogue.

## Decisions so far
- DR-001 Flash vector world · DR-002 Seed Spitter / Dewdrop Bounce / Pollen Pod · DR-003 jelly UI, Lilita One + Nunito (OFL)
- DR-003a no glints · DR-004 Phaser 3.90.0 · DR-005/006 superseded
- DR-007 ant from the user's concept (blue+circle, amber+triangle, 4 faces, hero and side poses)
- DR-008 biome sequence: Jungle, Clearing, Camp, Trail, Village Garden, Picnic Park, Porch, Living Room, Pantry, Kitchen; teach/test/twist/rest/boss

## How to send ant art (for the user)
Best results, in order of preference:
1. **Separate files, one pose per file:** transparent PNG at least 1024 px tall, or SVG. One file each for: hero pose, side gameplay pose (facing right), and each face (cocky, aim, oops, dizzy).
2. **Plain flat background** (pure white or pure green `#00FF00`), no text, no drop shadows, and nothing touching the character.
3. **Same character, same scale, same cap** in every file. One colour version is enough; team colours are applied in code.
4. **Upload into the repo** at `art/source/ants/` (or attach in chat). File names like `hero.png`, `side.png`, `face-cocky.png`.

## Open items carried forward
- Ant art: waiting for the user's images (see above).
- Minimum touch size at 667x375 (FIT scale 0.69): decide in UI.md (checkpoint C).
- Final in-game ant size (preview uses 96 px wide side pose): decide in PLAN.md.

## Next step
Checkpoint B: `docs/PLAN.md` (game loop, terrain, physics, turn flow, 100-level campaign, bosses, bot AI error model with a ~95% cap at level 90+, and a headless simulation test). Use Sonnet debate subagents (medium effort), one per system, for the Decision Records. Commit, push, update this file, stop.
