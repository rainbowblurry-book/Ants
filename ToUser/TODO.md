# To do for you (owner)

Updated: 2026-11-17, stage 5b (fixes from your M1 playtest). How to use this file: see `README.md` in this folder. Answered items are in `archive/ANSWERED.md`.

**Do R-05 first: the stage 5b checklist page.** The builder changes nothing in stage 5b until you choose there. Until you answer the other items, the build follows the docs as written.

**Summary**

| ID | Short name | Type | Needed before |
|---|---|---|---|
| R-05 | Stage 5b checklist page | decide + test | stage 5b work |
| Q-17 | Double-tap to find your ant | answer | stage 11 |
| Q-01 | Back-flip fall damage | answer | stage 8 |
| Q-02 | Mound Plop on water | answer | stage 8 |
| Q-03 | Dewdrop on bouncy ground | answer | stage 8 |
| R-02 | Phone speed check (ms) | check | stage 13 |

---

## Questions

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

---

## Reviews and checks

### R-05 · Stage 5b checklist page
- **Status:** open. **Needed before:** any stage 5b work.
- **Do this:** open https://claude.ai/artifact/KRCZS6YAh4o8CeXAQwRD62 (only you can open it).
  1. Part 1: pick A, B or C for each fix D01 to D12, and add a comment if you like. Your choices save by themselves.
  2. Part 2 is the test plan for your next phone playtest. Do it after the builder says stage 5b is live.
  3. Write "checklist done" in the chat. The builder reads your answers from the page.
- **Your answer:** (on the page)

### R-02 · Phone speed check (optional, 1 minute)
- **Status:** open. **Needed before:** stage 13.
- **Do this:**
  1. After this stage is merged, open `https://rainbowblurry-book.github.io/Ants/?mem` on your phone.
  2. Turn the phone to landscape.
  3. Read the line in the bottom-left corner. It shows "S=2 · 16.7 ms · …".
- **What it means:** About 16.7 ms means 60 frames per second. A number that stays over 20 ms means this phone needs "smooth mode" (stage 13 offers it).
- **Your answer so far:** laptop 13.5 MB, 1 atlas page; Samsung S26 Ultra 14 MB, 1 atlas page (limits 96 MB, 3 pages). Still to do: the **ms** number (it is also T14 on the checklist page).
- **Your answer:**

