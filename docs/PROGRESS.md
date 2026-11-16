# Progress

**Current stage:** Checkpoint A **complete**, waiting for the user's go-ahead to start checkpoint B.
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

## Open items carried forward
- Minimum touch size at 667x375 (FIT scale 0.69): decide in UI.md (checkpoint C).
- Final in-game ant size (preview uses 96 px wide side pose): decide in PLAN.md.

## Next step
Checkpoint B: `docs/PLAN.md` (game loop, terrain, physics, turn flow, 100-level campaign, bosses, bot AI error model with a ~95% cap at level 90+, and a headless simulation test). Use Sonnet debate subagents (medium effort), one per system, for the Decision Records. Commit, push, update this file, stop.
