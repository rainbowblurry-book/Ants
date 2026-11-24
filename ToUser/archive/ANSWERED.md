# Answered and finished items

The builder moves an item here from `../TODO.md` when it is done. Each entry keeps the item ID, your answer, the date, and what the builder does with it.

## 2026-11-24 (stage 5b checklist, Part 1)

### R-05 · Stage 5b checklist page, Part 1 (D01–D12)
- **Your answers** (read from the checklist page):
  - **D01 A:** full screen on the first tap, and a wider view with the controls at the edges. → OVR-013.
  - **D02 A:** show 2 layout pictures first; you pick one. → the builder makes the mockups (`ToUser/TODO.md` R-06).
  - **D03 B:** hide every health tag but the active ant's; tap an ant to see its health.
  - **D04 A:** "Pass the phone" setting, off by default. Your comment: the timer waits until the first touch of the turn. → OVR-014.
  - **D05 B:** "Hit own team" setting, off by default. → OVR-015.
  - **D06 A:** invisible walls left, right and top; the bottom still knocks out. → OVR-016.
  - **D07 A:** icons for Hop and Flip, and a one-line hint the first time you press each.
  - **D08 A:** the walk bar next to the ant only while walking, with a foot icon. Your comment: test it, then change it again if needed.
  - **D09 A:** one angle and power per ant. → OVR-017.
  - **D10 A:** when the wind changes, the gauge pops and a short "Wind +2" notice shows.
  - **D11 A:** the first time the dew rises, a banner: "The dew is rising! Ants under it are out."
  - **D12 A:** every stage ends with a checklist page; the next stage waits for it.
- **Builder:** stage 5b builds all of them. The layout (D01 wide view, D02, and where D07 and D08 sit) waits for your mockup pick. Part 2 (the test plan T01–T14) stays open on the page until stage 5b is live.

## 2026-11-17 (after stage 5, the M1 playtest)

### R-04 · M1 phone playtest
- **Your answer (short):** the game is too small on the phone and the screen is too busy; health tags hide who is selected; the gate every turn is tiring; you want a friendly-fire option; ants fall out of the map; Flip and the green bar are unclear; a new weapon should keep the last angle and power; is the wind fixed or changing; what does the dew do; make the layout calmer, based on common rules and real game screens; give me an HTML checklist to comment on instead of this file, and a test plan in every stage. The dial and the arrows work.
- **Builder:** every point became an item in the stage 5b list (`ToUser/TODO.md` R-05 and the checklist page). Stage 5 stays open until stage 5b passes your next playtest.

### Q-14 · Restart dialog text
- **Your answer:** A.
- **Builder:** stage 5b: title "Restart?", body "Start this match again from the first turn?".

### Q-15 · Two-player Pause caption
- **Your answer:** B.
- **Builder:** stage 5b: "Jungle Home · Round R" (the arena name, DR-181).

### Q-16 · Stand-in arena until stage 9
- **Your answer:** A.
- **Builder:** OVR-009 is approved. The stand-in stays until stage 9.

### Q-04 · Swim-back with no dry ground near
- **Your answer:** put the ant on the nearest ground if it cannot swim back, if that is easy; else knock it out.
- **Builder:** OVR-011. If no dry ground is within 200 px, the ant goes to the nearest dry standing point anywhere on the map; only with none at all is it knocked out. Stage 5b, with a test.

### Q-06 · "Loses its next turn"
- **Your answer:** A (and "I have not seen any swimming back").
- **Builder:** no change: the team loses the turn. Swimming happens when an ant lands in water; the stand-in arena has a small underground pool that a crater can open. Stage 5b adds a short notice so you can see it happen.

### Q-07 · Dew warning on boss levels
- **Your answer:** B.
- **Builder:** OVR-012. The warning comes 3 rounds before the dew starts (round 18 normally, round 27 on bosses). Stage 5b, with a test.

### R-03 · Final ant art
- **Your answer:** draw the ants before stage 7 starts, when you write "draw ant" in the message.
- **Builder:** the builder waits for that message before stage 7. Until then, placeholders only (DR-007a).

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
