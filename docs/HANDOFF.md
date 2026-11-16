# HANDOFF — build plan for ANTS! (checkpoint D)

You are the **builder**. The plan is finished: build exactly what the docs say.
- Every choice already has a Decision ID in `docs/DECISIONS.md` (DR-001 to DR-197, with judge rulings J1–J56 that win over the record text).
- If you must deviate, log an `OVR-###` record (DR-193). Tier G changes wait for the user's approval.

**Read first, in order:**
1. this file
2. `docs/DESIGN_PILLARS.md`
3. `docs/PLAN.md` (systems and numbers)
4. `docs/UI.md` + `src/ui/theme.json` (every screen and token)
5. `docs/CREATIVE.md` (look)
6. `docs/STORY.md` (content)

Look up records in `docs/DECISIONS.md` by ID when needed.

---

## 1. Decisions summary (one page)

**Platform and tech**
- We chose **Phaser 3.90.0 + TypeScript + Vite** over Phaser 4, because the brief asks for 3.x and 3.90 is the mature final 3.x release (DR-004, DR-016).
- We chose **a plain-TS fixed-step sim (60 Hz) with no engine physics** over Arcade or Matter, because determinism, replays and the headless bot test need full control (DR-010, DR-011).
- We chose **sfc32 seeded streams, a 0.1° trig table, and banned `Math.random`/`Date`/trig in sim code**, because the same seed and inputs must give the same match everywhere (DR-011, J9).
- We chose **a 960x540 logical canvas with FIT and a 2x crisp canvas (S=2) via camera zoom**, because plum ink must stay sharp on phones. S=1 is the fallback, and stage 0 proves it (DR-013).
- We chose **a 96 MB texture budget with per-biome atlases** over loading everything, because mid-range phones need it (DR-014).
- We chose **GitHub Actions → Pages from `main`** over a gh-pages branch, because tests gate the deploy and no tokens are needed (DR-017, DR-194).

**Gameplay**
- We chose **set angle and power, then press FIRE** over hold-to-charge, because charge timing is luck and frame-dependent (DR-033, J8).
- We chose **an 8-dot wind-free preview** over a full arc, because reading the wind is the skill (DR-033).
- We chose **one-screen destructible terrain as a `Uint8Array` grid with 8 materials and a mask-generated outline**, because craters stay on-style and cheap (DR-020 to DR-024).
- We chose **6 original weapons**:
  - the starters: Seed Spitter, Dewdrop Bounce, Pollen Pod
  - unlocked at L14 / L24 / L34: Tunnel Grub, Pill Roller, Mound Plop
  
  The six give direct fire, timed bounce, spread, dig, roll and build, with no Worms look-alikes (DR-002, DR-009).
- We chose **10 biomes × 10 levels (teach, test, twist, rest, boss)**, with bosses on a **telegraphed 4-round loop**, because learnable fairness is pillar 4 (DR-008, DR-051, DR-053).
- We chose **human-like bot errors, calibrated to ~95% lethal hits at L90+**, over random spray, because bots should miss the way people miss (DR-061 to DR-065).
- We chose **no acorn gates, plus a skip offer after 3 losses**, because kids must never hit a wall (DR-055, J17).
- We chose **Level 0 Training Grounds plus a one-try Level 70 Preview**, and **a cosmetic reward on every L1–10 clear**, because the user asked for a rewarding start (DR-058, DR-070, DR-071).

**Look and UI**
- We chose **a Flash-style vector world with jelly candy UI, no gradients and no glints**, over paper cut-out or doodle, for readability and charm (DR-001, DR-003, DR-003a).
- We chose **action `#EE6083` with plum text, and a 70% scrim**, over the preview's `#E8456B`, because the old colour failed contrast (DR-080, J29, J30).
- We chose **64 px minimum hit areas (FIRE 120)** over 48, because 64 is 44 CSS px on a 667x375 phone (DR-082, J28).
- We chose **a fixed HUD: dial plus steppers bottom-left, a 3x2 weapon tray in the centre, power slider plus FIRE bottom-right, wind on top**, with a left-handed mirror, so thumbs never cover the action (DR-120 to DR-125).
- We chose **teams that differ by colour and shape (blue circle, amber rounded triangle), never swapped**, for colourblind safety (DR-003, J46).
- We chose **HTML for Settings, the rotate screen, the splash and the crash screen** over canvas, for free accessibility and pre-boot safety (DR-012, DR-170).
- We chose **presets only for nicknames and team names**, over free text, for kid safety (J43, J44).

**Build process**
- We chose **headless sim → hot-seat slice (M1) → campaign slice (M2) → content batches → release**, over art-first, because art must not gate play (DR-190, DR-197).
- Stages are tagged **HARD** when a silent mistake is costly: sim, RNG, turn FSM, input, tuning, architecture or performance (DR-191).
- **Placeholders sit behind one asset manifest.** The release fails if any placeholder remains (DR-195, DR-007a).

---

## 2. Rules for the builder
1. **Effort:**
   - HARD stages: Fable, high effort.
   - ROUTINE stages: a Sonnet subagent at medium effort. Fable reviews its output against the acceptance list.
2. **Git:**
   - Branch `build/stage-NN-name`; merge to `main` when CI is green (DR-194).
   - Tag `m1-hotseat`, `m2-campaign` and `v1.0.0`.
   - Never force-push `main`.
3. **Done means done:**
   - A stage is done only when every acceptance item passes in CI.
   - Then update `docs/PROGRESS.md` with what was built, test status and OVRs.
   - Then stop and report to the user in 5 lines.
4. **Versions:**
   - Use exactly the PLAN §2 pins and the PLAN §11 action majors.
   - If one is gone or broken, log a Tier T OVR with the replacement you verified.
5. **Hard rules:**
   - No colour literals outside `theme.json` (DR-088).
   - No Phaser import in `src/sim` or `src/ai` (DR-010).
   - Nothing banned by DR-011 in sim code.
6. **Content rules:**
   - No Worms names, weapons or look, and no copyrighted characters.
   - Humans are never targets. No gore.
   - The AI reference images are never shipped or traced (CREATIVE §7).
7. **Ant art:** use placeholders until the user approves final art. Don't draw the ants unless asked (DR-007a).

---

## 3. Stages

Each stage lists: tag · goal · files · acceptance. "Tests" refers to PLAN §10 and UI.md §6.

### Stage 0 · Scaffold, CI, Pages, S=2 spike — HARD
- **Goal:** an empty game deploys, and the render path is decided.
- **Files:**
  - `package.json` (pins, scripts `dev build typecheck lint test e2e ci`), `tsconfig.json`, `biome.json`, `vite.config.ts` (`base` from `BASE_PATH`), `index.html` (viewport meta, `#game`, inline splash/rotate/fatal shells)
  - `.github/workflows/deploy.yml` (PLAN §11, plus an `e2e` job, DR-192), `playwright.config.ts`
  - `src/main.ts`, `src/boot/config.ts`, `src/scenes/Spike.ts`
- **Spike:**
  - Draw a 960x540 test scene at S=2 with camera zoom: ink outlines, Lilita One bitmap text, a nine-slice button and a scrolled camera.
  - Compare against S=1.
  - Check for seams and misaligned UI, and measure frame time in a mobile Chromium emulation.
- **Acceptance:**
  - CI green and the Pages URL loads.
  - The spike result is written to PROGRESS with screenshots at 844x390 / 667x375 / 1280x720.
  - If S=2 fails, record the S=1 fallback (DR-013) as an OVR Tier T.

### Stage 1 · Sim core — HARD
- **Goal:** deterministic terrain and physics in node.
- **Files:** `src/sim/rng.ts`, `trig.ts` (generated by `tools/gen-trig.ts`), `terrain.ts` (grid, 8 materials, `erase`, `fill` J25, dirty rects), `physics.ts`, `wind.ts` (Level / Column / Oscillate fields, DR-032), `match.ts` skeleton.
- **Acceptance:** `rng`, `ban-scan`, `trig`, `terrain` and `physics` tests pass. The sim imports nothing from Phaser.

### Stage 2 · Weapons, damage, movement — HARD
- **Goal:** all 6 weapons, the damage model, walking, hop, flip and fall damage.
- **Files:** `src/sim/weapons/*.ts` (seed, dewdrop, pollen, grub, roller, plop), `damage.ts`, `movement.ts`, `pickups.ts` (Honey Drop, Seed Bundle, J11).
- **Acceptance:**
  - `damage` passes.
  - New `weapons.test.ts` covers the DR-009 sanity numbers (ranges 864/624/700 px, roll distance, tunnel length, Plop keep-out).
  - Physics replays are stable.

### Stage 3 · Turn flow, match, replay, saves — HARD
- **Goal:** a full headless match from seed to win.
- **Files:** `src/sim/turn.ts` (the FSM per DR-042, the 3 s retreat J6, timer DR-043, sudden death DR-044), `src/sim/commands.ts` (tick-stamped ring, buffers per DR-015), `src/save/` (`ants.save.v1` with the J48 additions: goal bits, `losses`, `settings.twoPlayer`, `wardrobe`; plus `ants.match.v1`, `migrate()`).
- **Acceptance:**
  - `turn` and `replay` tests pass.
  - A save round-trip test passes, and a corrupt save moves to `.bak`.

### Stage 4 · Render, assets, UI foundation — HARD
- **Goal:** the Battle scene draws the sim with placeholder art, and the token pipeline exists.
- **Files:**
  - `src/render/` (terrain chunks plus the mask outline DR-024, sprites, camera DR-046/J7/J49, juice)
  - `src/assets/manifest.ts` (DR-195)
  - `tools/build-ui.ts`, `tools/bake-fonts.ts` (F56/F64/F80/F128), `tools/gen-theme.ts` (theme.json → `theme.ts` + `theme.css`)
  - `src/ui/` (`Layout` DR-085, `Focus` DR-086, `Nav` DR-090, `fitText` DR-087, Button/IconButton/Panel/ConfirmModal)
  - `/art/ui/*.svg` icons and nine-slices (UI.md §5)
- **Acceptance:**
  - UI.md §6 checks 1 (contrast) and 2 (no literals) pass.
  - Manifest key test passes.
  - The ≤ 3 resident atlas pages check passes.
  - A Playwright screenshot of a static battle at 3 viewports is saved.

### Stage 5 · Battle HUD and input → **M1 hot-seat slice** — HARD
- **Goal:** two people can play a full match on a phone.
- **Files:**
  - `src/scenes/Hud.ts` and the HUD components per UI.md §4.5: dial, steppers, power slider, slingshot, FIRE states, walk/hop/flip, move bar, 3x2 tray, wind gauge with the effects row, turn plate and timer, tags, team pills, damage numbers, aim preview, edge indicators, find-my-ant, notice queue, Dot bubble, team frame and the 2P gate
  - `src/input/` (DR-121 key map, DR-015 buffers)
  - `Pause` scene (DR-171)
  - a minimal two-player setup with one arena (Jungle Home)
- **Acceptance:**
  - UI.md §6 check 3 (layout, both handedness settings, margins 16 and 24) passes.
  - A Playwright full turn by touch and by keyboard passes.
  - A 667x375 screenshot shows who is up, the wind and the aim (pillar 2).
  - Fire buffering behaves per DR-015.
  - Merge, tag **`m1-hotseat`**, deploy.
  - **Stop and ask the user to playtest on a phone.**

### Stage 6 · Bot AI — HARD
- **Goal:** bots per DR-060 to DR-067, with visible aim (DR-129).
- **Files:** `src/ai/solver.ts`, `error.ts`, `botParams.ts`; `tests/ai-cap.test.ts`.
- **Acceptance:**
  - All 9 ai-cap asserts pass (PLAN §10).
  - The constants are refit against the real sim (PLAN §12). If they change, log a Tier T OVR with the new numbers.
  - Runtime is ≤ 30 s.

### Stage 7 · Menus and system screens — ROUTINE
- **Goal:** the full screen map except comics and collection screens.
- **Files:**
  - `index.html`/`src/html/` (splash and audio gate DR-091/092, rotate DR-094, fatal DR-175, Settings DR-170 with credits DR-174)
  - scenes `Boot`, `Preload`, `Title` (DR-093/095), `LevelSelect` (DR-100 to DR-105), `Results` (DR-140, DR-143), `TwoPlayerSetup` (DR-180 to DR-183)
  - save status UI (DR-173)
  - PWA manifest and icons (DR-096)
  - `public/licenses/`
- **Acceptance:**
  - Playwright walks Title → LevelSelect → Battle → Results → Map, by keyboard and by touch.
  - Rotate pauses and resumes.
  - Back, Esc and browser back follow DR-090.
  - The `en-XA` pseudo-locale shows no overflow (UI.md §6 check 4).

### Stage 8 · Level pipeline, Level 0 and Biome 1 → **M2 campaign slice** — HARD (compiler and validator), ROUTINE (level data)
- **Goal:** the first 30 minutes of the game, complete.
- **Files:**
  - `tools/mask-compiler.ts`, `tools/validate-levels.ts` (including the J50 HUD spawn rule), `src/levels/` (Level 0 practice and preview, L1–L10, Jungle kit and stamps)
  - Level 0 screens (DR-150 to DR-154)
  - rewards L1–10 (DR-071, DR-141, DR-142)
  - album, Wardrobe and nickname picker (DR-160 to DR-164)
  - `Comic` scene (DR-110 to DR-112) with the Biome 1 panels (STORY)
- **Acceptance:**
  - `levels` test passes for these levels.
  - Level 0 Preview assert 9 passes.
  - Playwright plays L1 to a win and sees a reward.
  - Contact sheet reviewed.
  - Merge, tag **`m2-campaign`**.
  - **Stop and ask the user to playtest.**

### Stage 9 · Biomes 2–10, bosses, arenas — ROUTINE (data) with the boss loop HARD
- **Goal:** all 112 levels, 10 bosses (DR-053, DR-054), and the 10 two-player arenas (DR-057, DR-181).
- **Plan:** five batches of 2 biomes (DR-197). Each batch includes its kit, levels, boss, comic, stickers and rewards.
- **Files:** `src/sim/boss.ts` (the HARD part, done in batch 1), the HUD boss plate and telegraph (DR-126), `src/levels/*`, comic panels, the epilogue and "The End" (DR-113, DR-144, J47).
- **Acceptance per batch:**
  - The validator passes and ai-cap still passes.
  - Each boss telegraph shows one full turn before the trick (a headless test checks it).
  - A screenshot of each boss fight is saved.

### Stage 10 · Audio — ROUTINE
- **Goal:** synthesized SFX and music per CREATIVE §5.
- **Files:** `src/audio/` (WebAudio synth, one motif per biome plus a boss variant, ant voice blips from the cosmetic RNG stream), and the Settings volume wiring.
- **Acceptance:** no audio before the first tap. Mute and volume persist. Pause ducks music to 25% (J56).

### Stage 11 · Juice and accessibility pass — ROUTINE
- **Goal:** CREATIVE §4 motion, reduced motion everywhere, text size Large, left-handed HUD.
- **Acceptance:** UI.md §6 checks 5, 6 and 7 pass. Text size Large shows no overflow at the 3 viewports.

### Stage 12 · Final art pipeline — ROUTINE (starts only when the user approves ant art)
- **Goal:** original SVG ants and art replace the placeholders under the same manifest keys.
- **Files:** `/art/ants/*.svg`, from the `art/source/` references, redrawn rather than traced; `tools/build-art.ts`; DR-007b.
- **Acceptance:**
  - No `placeholder: true` remains.
  - The trinket overlap test passes (UI.md §6 check 9).
  - The side pose reads clearly at 88x63 on 667x375.

### Stage 13 · PWA, performance, release — HARD
- **Goal:** v1.0.0.
- **Files:** the service worker (DR-018), performance mode and smooth-mode prompt (DR-013), memory checks (DR-014).
- **Acceptance:**
  - Full CI is green, including e2e.
  - The release build fails on any placeholder (DR-195).
  - p95 frame time ≤ 16.7 ms on desktop and is reported for mobile emulation.
  - Texture peak ≤ 96 MB.
  - Offline reload works.
  - Tag **`v1.0.0`**.

---

## 4. What the user must do
- **Nothing to set up.** GitHub Pages is already on: Settings → Pages → Source "GitHub Actions" (PLAN §11).
- **Playtest at M1 and M2** on a real phone, and answer the builder's stop questions.
- **Approve the final ant art** (stage 12) when ready.
- **Supply the "Made by" credit name** (DR-174).
