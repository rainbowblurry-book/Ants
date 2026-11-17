# Answered and finished items

The builder moves an item here from `../TODO.md` when it is done. Each entry keeps the item ID, your answer, the date, and what the builder does with it.

## 2026-11-17 (after stage 4)

### Q-08 · "∞" glyph for Seed ammo
- **Your answer:** A. Draw "∞" as one extra glyph in the number font.
- **Builder:** OVR-005 is now approved. Stage 5 draws the glyph in the F64 bake (figure-eight, round ends, same weight and outline as the digits) and removes it from the known-missing list.

### Q-05 · Two-player drops, and boss drops
- **Your answer:** A, and for bosses "take the best way to fight a boss battle". In chat you confirmed: the builder designs the boss drop spot per fight and shows it to you.
- **Builder:** OVR-008 (approved). Two-player: every 3rd round, Honey Drop and Seed Bundle take turns, x from the match seed between the teams (exact range logged in stage 7). Bosses: one spot per boss, set in stage 9, approved from the boss screenshot.

### Q-10 · "Made by" credit name
- **Your answer:** Made by BlurryRainbow.
- **Builder:** the credits screen (stage 7, DR-174) shows "Made by BlurryRainbow".

### Q-11 · Terrain colours per biome
- **Your answer:** A. The builder proposes, you approve from a screenshot.
- **Builder:** each biome palette is proposed with a contrast check against the HUD and the ants. The first one (Jungle Home) can come with the stage 5 arena, for the M1 playtest.

### Q-09 · Shots that fall off the map
- **Your answer:** A. Remove a shot below y 740.
- **Builder:** OVR-007 (approved). Applied in stage 5 with a test.

### Q-12 · Modal open timing
- **Your answer:** A. Keep DR-172 for dialogs (120 ms scrim fade, 160 ms card pop).
- **Builder:** no change. That is what the code does.

### Q-13 · Shrinking button text
- **Your answer:** A. A label may shrink to 22 px.
- **Builder:** no change. That is what the code does (DR-087).

### R-01 · Stage 4 screenshots: "what are those things and the coloured lines?"
- **Your picture:** the white strip with a dark edge on the left of the battle screenshot.
- **Answer:** that screen is a **test map**, not the jungle. No level exists yet (levels come in stage 8). The test map puts each ground material once in one place, so the tests and you can see how each one draws:
  - white strip (your picture) = SLICK, kitchen tiles; ants slide on it
  - yellow block = SOFT, sawdust; big craters
  - pink bump = BOUNCY, cushion or tent
  - grey blob = ROCK, a pebble; it never breaks
  - dark brown blob = HARD, a stump; small craters
  - teal box under the ground = a small WATER pool
  - brown everywhere else = SOIL
- **The lines:** the dark purple line is the ink outline. Every edge gets it, and every new crater gets it at once (DR-001, DR-024). The green line is a stand-in for the grass band on top of the ground (DR-021).
- **The colours are placeholders.** They are theme colours picked so the materials look different, not jungle colours. The real colours come per biome (Q-11). The release build fails while they remain.
