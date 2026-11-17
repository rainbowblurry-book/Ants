# To do for you (owner)

Updated: 2026-11-17, after your answers on stage 4. How to use this file: see `README.md` in this folder. Answered items are in `archive/ANSWERED.md`.

Nothing here blocks stage 5. Until you answer, the build follows the docs as written.

**Summary**

| ID | Short name | Type | Needed before |
|---|---|---|---|
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
