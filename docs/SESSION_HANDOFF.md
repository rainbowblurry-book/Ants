# Handoff: ANTS! build, stage 5 done (M1) → waiting for the owner's phone playtest, then stage 6 (Bot AI)
Seq: 10 | Date: 2026-11-17 | Branch@commit: main@b928093 (+ this handoff commit) | Status: blocked on the owner (M1 playtest)
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (the one and only handoff file; docs/HANDOFF.md is the build plan)

## Goal
Build the Phaser 3 ant artillery game ANTS! exactly as planned in `docs/HANDOFF.md`, one stage at a time. You are the **builder**. The plan is finished; do not redesign it.

## State
- Done: stages 0–5. Stage 5 = M1 hot-seat slice: `src/hud/` (layout, controls, readouts, notices, link), `src/input/` (keys, aim), `src/game/twoPlayer.ts`, `src/scenes/Hud.ts` + `Pause.ts`, Battle runs a versus match. OVR-005 ("∞") and OVR-007 (y 740) applied; OVR-009 (stand-in arena, Tier G) and OVR-010 ("!" in F64) logged. 20 test files / 315 unit tests, 58 e2e checks. Details: `docs/PROGRESS.md` "Stage 5".
- CI: stage branch run 31 (0a1c093) green. `main` fast-forwarded to b928093 and pushed; its build+deploy run 33 was in progress when this was written (check Actions; assumed green).
- **Tag `m1-hotseat` exists locally only.** Tag push gets HTTP 403 from the session's git proxy (branches push fine). The owner must create it (see Next steps).
- Blocked / waiting on: owner's M1 phone playtest, `ToUser/TODO.md` R-04. HANDOFF rule: always stop at M1.
- Uncommitted work: none.

## Decisions (with why)
User's standing rules (their words, repeated in every stage prompt):
- Work from `main`. One branch per stage, `build/stage-NN-name`. Merge to `main` only when that stage's acceptance tests pass in CI.
- HARD stages: do them yourself at high effort (subagents allowed for review). ROUTINE stages: a Sonnet subagent at medium effort, then review against the acceptance list.
- Never invent a number or a design: log an OVR record (DR-193). Tier G changes wait for the user's approval. Where docs conflict or are silent, follow the most specific text and add the gap to `ToUser/TODO.md`.
- Placeholder ant art only (DR-195). Do not draw ants unless asked.
- After each stage: update `docs/PROGRESS.md` and `ToUser/TODO.md`, merge to `main`, give a 5-line summary plus the owner's open items in ASD-STE100 style, then **stop**. Always stop at M1 (end of stage 5) and M2 (end of stage 8).
- Nothing that costs money unless the user approves first. If a usage limit hits: wait, then continue by yourself.
- Before committing, double-check for errors (`npm run ci` + `npm run e2e`), then confirm the build on CI. Double-check your work so the code does not break (the user asked for a review pass before build; a review subagent found 8 real bugs in stage 5).
- Owner, 2026-11-17: **a full code review of the whole repo before stage 9**. Credit line "Made by BlurryRainbow" (stage 7).
- One place per thing: owner items only in `ToUser/TODO.md` (done items → `ToUser/archive/ANSWERED.md`); the handoff only here; PROGRESS points to ToUser.

## Do
- Session start: read this file, then `ToUser/TODO.md`; apply answers, move them to the archive, note them in PROGRESS. Then `docs/HANDOFF.md` §2 and the stage's §3 entry. Extract DRs with `awk -v id=DR-0NN 'index($0,"## "id" ")==1{p=1;print;next} p&&/^#/{p=0} p' docs/DECISIONS.md`. Judge rulings J1–J56 win over record text. **Next OVR is OVR-011**, next judge number J57.
- Fresh container: `npm ci && npm run assets`. `npx biome check --write --unsafe` before every commit, then re-run `npx tsc --noEmit`.
- HUD work: `hudLayout()` (pure) is the single source of HUD rects; `tests/hud-layout.test.ts` is UI.md §6 check 3. Hud talks to the sim only via `BattleLink.push` (= `match.push`). Hooks for e2e: `window.__battle` (tick, log, ant, events, stepTicks), `__hud` (state, rects, controls, antScreen), `__pause`. Dev switches: `?seed=N`, `?hand=left`, `?assist=1`, `?static=1` (stage 4 dev arena, no HUD), `?mem`.
- e2e that must wait for sim time: fast-forward with `__battle.stepTicks()` inside `page.evaluate`, never a long real-time wait. `SHOTS_OUT=docs/stageN` makes `saveShot` write review screenshots.
- Check CI with GitHub MCP `actions_list` (`list_workflow_runs` with a branch filter, then `list_workflow_jobs`) and `get_job_logs` for failures. Wait with a background `sleep`. Merge with `git merge --ff-only`.

## Don't
- Don't wait on real time for sim progress in e2e: CI phone emulation runs the sim several times slower; run 29 failed with "page.waitForFunction: Timeout 40000ms exceeded" in `waitHandover`.
- Don't time real-time rules (DR-171 ready delay, stepper repeats) with the Phaser scene clock: it slowed to 100 ms per 400 ms real in swiftshader and Resume never fired. Use `setTimeout` / `performance.now()`.
- Don't name fields on Phaser Container subclasses `active`, `state`, `last`, `name`, `body`, or methods `setActive`/`update`: TS2415/TS2416 clashes (and `setActive` changes Phaser semantics). Controls use `live`/`setLive`.
- Don't rely on class-field initialisers in scenes: Phaser reuses the Scene instance across `scene.restart`; reset per-run fields in `init()` (rematch kept `ended=true`, plate went blank).
- Don't keep write-only private fields: `biome --unsafe` deletes the declaration and leaves the writes (TS2339 on `rematch`).
- Don't cache "can act" in a control and check it on press: a tap in the frame a turn opens was lost on desktop. Use `liveCheck` (asks the sim at press time).
- Don't push a tag from this session: `git push origin m1-hotseat` → "RPC failed; HTTP 403". Ask the owner.
- Earlier rules still hold: npm 10 crashes on install (use `npx -y npm@11 install --save-exact`); never push while a run on that branch is *pending*; menu keys via `window` listeners, not Phaser's key queue; no clicks before `#splash` is hidden; no `setScrollFactor(0)` overlays in an S-zoomed camera (use a separate scene or DOM); no Playwright against the live Pages URL; don't let Biome touch `theme.json`, `.mcp.json`, `trig.ts` or docs; no PR, no force-push.

## Open questions / uncertainty
- Owner items (all in `ToUser/TODO.md`): R-04 playtest (blocks stage 6), Q-16 stand-in arena (before stage 6), Q-14/Q-15 (stage 7), Q-17 double-tap (stage 11), Q-01–Q-04, Q-06 (stage 8), Q-07 (stage 9), R-02 phone ms, R-03 ant art.
- Offering a Jungle Home palette (Q-11 lets the builder propose) was not done in stage 5; plan to propose it with the biome kit in stage 8.
- Real-device behaviour (thumb reach of the Hop row, frame time at S=2, auto-pause on blur on phones) is untested until R-04.

## Next steps
1. Read `ToUser/TODO.md` for R-04 and Q-16 answers. If R-04 is not answered, remind the owner and stop.
2. Owner (once): create the tag, e.g. `git tag -a m1-hotseat b928093 -m "M1 hot-seat slice"` then `git push origin m1-hotseat` from their own machine, or a GitHub release named `m1-hotseat` on commit b928093. Then check it exists with GitHub MCP `list_tags`.
3. Fix anything the playtest finds on a `build/stage-05b-*` branch (or inside stage 6 if small), with tests.
4. Start stage 6 (Bot AI, HARD) on `build/stage-06-ai`: HANDOFF §3 stage 6, DR-060–DR-066, DR-129 bot visuals (crosshair, power bar, HUD mirror at 55%).

## Key files & links
- `ToUser/TODO.md` - the owner's questions and checks. `docs/PROGRESS.md` - build log ("Stage 5" has every implementation choice).
- `docs/DECISIONS.md` - DR-001..DR-197, J1–J56, OVR-001..OVR-010 at the end.
- `docs/stage5/*.png` - review shots (667x375 readability, left-handed, pause, handover).
- CI: https://github.com/rainbowblurry-book/Ants/actions · Live: https://rainbowblurry-book.github.io/Ants/

## Previous handoffs
- seq 9 (2026-11-17): stage 4 done, owner answers applied, start stage 5.
- seq 8 (2026-11-17): stage 4 done, before the owner's answers.
- seq 7 (2026-11-17): stage 3 done, start stage 4 render.
- seq 6 (2026-11-17): stage 2 done, start stage 3 turn flow.
- seq 5 (2026-11-17): stage 1 done, start stage 2 weapons.
