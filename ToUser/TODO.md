# To do for you (owner)

Updated: 2026-11-17, after build stage 4. How to use this file: see `README.md` in this folder.

Each item has an ID, a status and the stage it must be answered before. The builder follows the docs as written until you answer. Nothing below blocks stage 5, except Q-08 (it blocks one badge only).

**Summary**

| ID | Short name | Type | Needed before |
|---|---|---|---|
| Q-08 | "∞" glyph for Seed ammo | answer | stage 5 |
| Q-05 | Two-player drops: which pickup, where | answer | stage 7 |
| Q-10 | "Made by" credit name | answer | stage 7 |
| Q-11 | Terrain colours per biome | answer | stage 8 |
| Q-01 | Back-flip fall damage | answer | stage 8 |
| Q-02 | Mound Plop on water | answer | stage 8 |
| Q-03 | Dewdrop on bouncy ground | answer | stage 8 |
| Q-04 | Swim-back with no dry ground | answer | stage 8 |
| Q-06 | Meaning of "loses its next turn" | answer | stage 8 |
| Q-07 | Dew warning on boss levels | answer | stage 9 |
| Q-09 | Shots that fall off the map | answer | any time |
| Q-12 | Modal open timing (two docs differ) | confirm | any time |
| Q-13 | Shrinking button text | confirm | stage 7 |
| R-01 | Stage 4 screenshots | review | stage 5 |
| R-02 | Phone speed check | check | stage 13 |
| R-03 | Final ant art | decision | stage 12 |

---

## Questions

### Q-08 · "∞" glyph for Seed ammo (OVR-005, Tier G)
- **Status:** open. **Needed before:** stage 5.
- **Problem:** The Seed ammo badge must show "∞" (UI.md §2). The game font Lilita One has no "∞". The body font Nunito has no "∞" too.
- **What happens now:** The font bake skips "∞". Nothing on screen uses it yet.
- **Choices:**
  - **A (builder proposal):** Draw "∞" as one extra glyph in the number font: a figure-eight with round ends, in the same weight and outline as the digits.
  - **B:** Show no badge on the Seed slot.
  - **C:** Show a word, for example "Lots".
- **Your answer:**
A, Draw "∞" as one extra glyph in the number font:

### Q-05 · Two-player drops: which pickup, and where? (Tier G)
- **Status:** open. **Needed before:** stage 7 (the Pickups toggle).
- **Problem:** DR-048 says "one drops every 3rd round". It does not say which pickup (Honey Drop or Seed Bundle). It does not say the x position.
- **What happens now:** The sim accepts a list of drops. The list is empty.
- **Choices:**
  - **A:** Alternate: Honey Drop, then Seed Bundle. x is random (match seed) between the two teams.
  - **B:** Always Honey Drop. x is random.
  - **C:** Your own rule.
- **Also:** Boss levels say "Seed Bundle every 3rd round" (stage 9). Tell the builder the x rule for them too.
- **Your answer:**
A. and as the decision says take the best way to fight a boss battle and use that. 

### Q-10 · "Made by" credit name (DR-174)
- **Status:** open. **Needed before:** stage 7 (credits screen).
- **Problem:** The credits need the name to show for "Made by".
- **Your answer:**
Made by BlurryRainbow

### Q-11 · Terrain colours per biome (gap, Tier G)
- **Status:** open. **Needed before:** stage 8 (Jungle Home kit).
- **Problem:** DR-021 bakes terrain colours from "a biome palette". No document gives the colours for any biome or material.
- **What happens now:** The game uses placeholder colours from the existing theme (soil = acorn brown, grass band = dark green, sky = butter). The release build fails while this placeholder stays.
- **Choices:**
  - **A:** The builder proposes one palette per biome in stage 8, with a contrast check against the HUD and ants. You approve it from a screenshot.
  - **B:** You give the colours.
- **Your answer:**
A

### Q-01 · Back-flip fall damage (Tier G)
- **Status:** open. **Needed before:** stage 8.
- **Problem:** DR-026 counts the drop from the top of a jump as a fall. A back-flip on flat ground goes about 147 px high, so it costs about 6 HP each time.
- **Choices:**
  - **A:** No fall damage from the ant's own hop or back-flip.
  - **B:** Raise the free fall height.
  - **C:** Keep it as it is.
- **Your answer:**

### Q-02 · Mound Plop on water (Tier G)
- **Status:** open. **Needed before:** stage 8.
- **Problem:** PLAN §4: shots that hit water fizzle (only Dewdrop skips). DR-009 says the Plop exists to "bridge WATER". Now it can only bridge by hitting the bank.
- **Choices:**
  - **A:** The Plop does not fizzle on water. It fills as on land.
  - **B:** Keep it as it is.
- **Your answer:**

### Q-03 · Dewdrop on bouncy ground (Tier G)
- **Status:** open. **Needed before:** stage 8.
- **Problem:** DR-022 says the material bounce applies to Dewdrop. DR-034 and PLAN §5 fix the Dewdrop bounce at 0.55. The build uses 0.55 everywhere, so a tent or jelly gives no extra bounce.
- **Choices:**
  - **A:** Use the material bounce on BOUNCY ground (0.85).
  - **B:** Keep 0.55 everywhere.
- **Your answer:**

### Q-04 · Swim-back with no dry ground (Tier G)
- **Status:** open. **Needed before:** stage 8.
- **Problem:** An ant in water swims back to dry ground (DR-026). The docs do not say what happens when there is no dry ground within 200 px.
- **What happens now:** The ant is knocked out.
- **Choices:**
  - **A:** Keep the knock-out.
  - **B:** Search further (give a distance).
- **Your answer:**

### Q-06 · Meaning of "loses its next turn" (Tier G)
- **Status:** open. **Needed before:** stage 8.
- **Problem:** DR-026: an ant that swam back "loses its next turn".
- **What happens now:** The whole team gives up that turn.
- **Choices:**
  - **A:** Keep it: the team loses the turn.
  - **B:** The team's next ant plays instead.
- **Your answer:**

### Q-07 · Dew warning on boss levels (Tier G)
- **Status:** open. **Needed before:** stage 9.
- **Problem:** The dew warning comes at round 18. On boss levels the dew starts at round 30, which is 12 rounds later.
- **Choices:**
  - **A:** Keep the warning at round 18.
  - **B:** Warn 3 rounds before the dew (round 27 on bosses).
- **Your answer:**

### Q-09 · Shots that fall off the map (gap, Tier G)
- **Status:** open. **Needed before:** any time (low priority).
- **Problem:** On a level with a "void" bottom, a shot that falls off the map flies on until the 8 s limit. The player waits for nothing.
- **Choices:**
  - **A:** Remove a shot below a line (the builder proposes y = 740, the line DR-038 already gives).
  - **B:** Keep the 8 s wait.
- **Your answer:**
A

### Q-12 · Modal open timing: two docs differ (confirm)
- **Status:** open. **Needed before:** any time.
- **Problem:** DR-172 says a confirm dialog opens with a 120 ms scrim fade and a 160 ms card pop. UI.md §1.5 says panels open in 220 ms with a 160 ms scrim.
- **What happens now:** The builder uses DR-172, because it is the more specific text.
- **Choices:**
  - **A:** Keep DR-172 for dialogs.
  - **B:** Use the UI.md values.
- **Your answer:**
A

### Q-13 · Shrinking button text (confirm)
- **Status:** open. **Needed before:** stage 7 (the long-text check).
- **Problem:** DR-087 lets a button label shrink from 28 to 22 px to fit. DR-081 says a baked font must stay at 0.9 to 1.1 of its size, so it stays sharp. 22/28 is 0.79.
- **What happens now:** The builder follows DR-087 (the label may shrink to 22). A shrunk label is a little softer.
- **Choices:**
  - **A:** Keep it (shrink to 22).
  - **B:** Never shrink a baked label below 0.9 (25 px). Wrap or use a wider button instead.
- **Your answer:**
A
---

## Reviews and checks

### R-01 · Look at the stage 4 screenshots
- **Status:** open. **Needed before:** stage 5.
- **Do this:** Open the files in `docs/stage4/`. Each name ends with the screen size.
  - `battle-*.png`: the battle scene with placeholder ants and placeholder terrain colours.
  - `uilab-*.png`: every button, icon, panel, badge and font. `uilab-modal-*.png`: the confirm dialog.
- **Tell the builder:** "R-01 OK", or what looks wrong.
- **Your answer:**
i have pasted a pic in one of the screenshot and i dont undesratnd those things why are they there and what purpose and what with all those colored lines no clue. either exxplain or tell ime if its  atest or what it is. lokoks so absurd and weeird fo a jungle.

### R-02 · Phone speed check (optional, 1 minute)
- **Status:** open. **Needed before:** stage 13.
- **Do this:**
  1. After this stage is merged, open `https://rainbowblurry-book.github.io/Ants/?mem` on your phone.
  2. Turn the phone to landscape.
  3. Read the line in the bottom-left corner. It shows "S=2 · 16.7 ms · …".
- **What it means:** About 16.7 ms means 60 frames per second. A number that stays over 20 ms means this phone needs "smooth mode" (stage 13 offers it).
- **Your answer:** (the ms number and the phone model)
TEXTURES 13,5mb* atlas pages 1 on my laptop browser. phone ill check later and tell you
### R-03 · Final ant art
- **Status:** waiting for you. **Needed before:** stage 12.
- **Fact:** The game shows placeholder ants cut from the concept image. The builder does not draw ants until you say so (DR-007a).
- **Do this when you are ready:** Write "Draw the ants" here or in the chat.
- **Your answer:**
