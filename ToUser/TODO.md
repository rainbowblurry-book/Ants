# To do for you (owner)

Updated: 2026-11-17, at the end of stage 5 (M1). How to use this file: see `README.md` in this folder. Answered items are in `archive/ANSWERED.md`.

**Do R-04 first: the M1 phone playtest.** The build stops until you do it. Nothing else here blocks stage 6. Until you answer, the build follows the docs as written.

**Summary**

| ID | Short name | Type | Needed before |
|---|---|---|---|
| R-04 | M1 phone playtest | check | stage 6 |
| Q-14 | Restart dialog text | answer | stage 7 |
| Q-15 | Two-player Pause caption | answer | stage 7 |
| Q-16 | Stand-in arena until stage 9 | answer | stage 6 |
| Q-17 | Double-tap to find your ant | answer | stage 11 |
| Q-01 | Back-flip fall damage | answer | stage 8 |
| Q-02 | Mound Plop on water | answer | stage 8 |
| Q-03 | Dewdrop on bouncy ground | answer | stage 8 |
| Q-04 | Swim-back with no dry ground | answer | stage 8 |
| Q-06 | Meaning of "loses its next turn" | answer | stage 8 |
| Q-07 | Dew warning on boss levels | answer | stage 9 |
| R-02 | Phone speed check | check | stage 13 |
| R-03 | Final ant art | decision | stage 12 |

---

## Questions

### Q-14 · Restart dialog text
- **Status:** open. **Needed before:** stage 7.
- **Problem:** DR-171 says Restart opens a destructive confirm. The docs give no text for it.
- **What happens now:** title "Restart", body "Start new", buttons Cancel / Restart. These are words the docs already use.
- **Choices:**
  - **A:** Title "Restart?", body "Start this match again from the first turn?"
  - **B:** Keep it as it is.
  - **C:** Write your own text.
- **Your answer:**

### Q-15 · Two-player Pause caption
- **Status:** open. **Needed before:** stage 7.
- **Problem:** The Pause caption is "Level N · Round R" (DR-171). A two-player match has no level number.
- **What happens now:** the caption reads "Round R".
- **Choices:**
  - **A:** Keep "Round R".
  - **B:** Use the arena name: "Jungle Home · Round R".
- **Your answer:**

### Q-16 · Stand-in arena until stage 9 (Tier G, OVR-009)
- **Status:** open. **Needed before:** stage 6.
- **Fact:** The real two-player arenas come from the level pipeline (stages 8 and 9). Stage 5 needed one now, so the builder made a stand-in: the test arena's left half, raised and mirrored. The wind is the real Jungle Home wind (level 0 to 2). The colours are still placeholders.
- **Choices:**
  - **A:** Keep the stand-in until stage 9.
  - **B:** Change it now (say what).
- **Your answer:**

### Q-17 · Double-tap to find your ant
- **Status:** open. **Needed before:** stage 11.
- **Problem:** DR-130 says a double-tap on the world recentres the camera on your ant. The docs give no time between the two taps. Stage 5 has the find-my-ant button and the C key, but no double-tap.
- **Choices:**
  - **A:** Two taps within 300 ms (a common phone setting).
  - **B:** No double-tap. The button and the C key are enough.
- **Your answer:**

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

---

## Reviews and checks

### R-04 · M1 phone playtest (about 10 minutes)
- **Status:** open. **Needed before:** stage 6. **The build stops until you do this.**
- **Do this:**
  1. Wait for the CI run on `main` to finish (Actions tab, green tick).
  2. Open `https://rainbowblurry-book.github.io/Ants/` on your phone and turn it to landscape.
  3. Play one full match with a second person: pass the phone at each "Tap to start".
  4. Try each control once: the angle dial and its ▲▼, the power slider and its ▲▼, a drag back from your ant (slingshot), the weapon tray, ◀ ▶, Hop, Flip, FIRE, Pause and Resume.
  5. Optional: open `…/Ants/?hand=left` to try the left-handed layout.
- **Tell the builder:**
  - Can both thumbs reach every control? Is the Hop row easy to reach?
  - Is any text too small to read?
  - Did a tap ever do nothing, or do the wrong thing?
  - Your phone model, and the ms number from R-02 if you have it.
- **Your answer:**

### R-02 · Phone speed check (optional, 1 minute)
- **Status:** open. **Needed before:** stage 13.
- **Do this:**
  1. After this stage is merged, open `https://rainbowblurry-book.github.io/Ants/?mem` on your phone.
  2. Turn the phone to landscape.
  3. Read the line in the bottom-left corner. It shows "S=2 · 16.7 ms · …".
- **What it means:** About 16.7 ms means 60 frames per second. A number that stays over 20 ms means this phone needs "smooth mode" (stage 13 offers it).
- **Your answer so far:** laptop browser: textures 13.5 MB, atlas pages 1 (good: the limits are 96 MB and 3 pages). Still to do: the **ms** number on the phone, and the phone model.
- **Your answer:**

### R-03 · Final ant art
- **Status:** waiting for you. **Needed before:** stage 12.
- **Fact:** The game shows placeholder ants cut from the concept image. The builder does not draw ants until you say so (DR-007a).
- **Do this when you are ready:** Write "Draw the ants" here or in the chat.
- **Your answer:**
