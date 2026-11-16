# Progress

**Current stage:** Checkpoint A, iterating on the preview (not yet "approved").
**Branch:** `claude/eager-mccarthy-jpc952` on `rainbowblurry-book/Ants`.

## Done
- `.gitignore`, `docs/DESIGN_PILLARS.md` (5 pillars), `docs/DEBATES.md` (haiku transcripts), `docs/DECISIONS.md`, `docs/BRIEF.md`.
- `preview/ui-preview.html`: landing, battle HUD, level select, comic panel, character sheet (`?s=landing|battle|levels|comic|chars`). Screenshots at 844x390, 667x375, 1280x720 in `preview/`.

## Decisions so far
- DR-001 Flash-style vector world, thick plum outlines.
- DR-002 weapons: Seed Spitter, Dewdrop Bounce, Pollen Pod.
- DR-003 jelly candy UI; Lilita One + Nunito (SIL OFL 1.1); Okabe-Ito team colours with shapes (blue circle, amber triangle).
- DR-003a white glint streaks removed.
- DR-004 Phaser 3.90.0 pinned.
- DR-005 (superseded) and DR-006 upright chibi ant with two detail levels. The user still finds it not convincing.

## Next step
The user is generating an ant concept with Gemini. When it arrives: redraw the ant as original SVG based on it, record DR-007, regenerate the screenshots, push, and wait for "approved". After approval: write `docs/CREATIVE.md` and `docs/STORY.md`, save the preview to `/art/reference`, push, then wait before checkpoint B.
