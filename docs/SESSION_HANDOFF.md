# Handoff: ANTS! build, stage 5b (fixes from the owner's M1 playtest) → waiting for the owner's layout pick
Seq: 12 | Date: 2026-11-24 | Branch@commit: build/stage-05b-playtest@eef9eeb (+ this handoff commit) | Status: blocked on the owner (layout pick L01)
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (the one and only handoff file; docs/HANDOFF.md is the build plan)

## Goal
Build the Phaser 3 ant artillery game ANTS! exactly as planned in `docs/HANDOFF.md`, one stage at a time. You are the **builder**. Now: stage 5b, fix what the owner's M1 phone playtest found, until a second playtest passes. **Stage 5 is not done until then; do not start stage 6** (owner, 2026-11-17).

## State
- Done (this session, 2026-11-24): the owner's checklist Part 1 (D01–D12) read and archived (`ToUser/archive/ANSWERED.md`). OVR-013 to OVR-018 logged in `docs/DECISIONS.md` (all approved by the owner's choices). Built and tested: OVR-011, OVR-012, OVR-014 (no gate by default; the timer waits for the first input), OVR-015 ("Hit own team" off), OVR-016 (ceiling), OVR-017 (one aim per ant), OVR-018 (one tag, walk bar at the ant, Hop/Flip icons and hints, wind and dew notices), OVR-013 part 1 (full screen on the first tap), Q-14 A, Q-15 B. Dev switches `?pass=1` (gate on) and `?ff=1` (own team hit). Details: `docs/PROGRESS.md` "Stage 5b".
- Checklist page republished (version 2) with **Part 1b · L01: two layout mockups** (A move-left/shoot-right, builder's pick; B aim-left/fire-right, the DR-120 split) and updated Part 2 steps (T01–T15). `ToUser/TODO.md` R-06 = pick the layout; R-05 = Part 2 phone test.
- Tests: `npm test` 323 pass. e2e: `hud.spec.ts` gate tests now run with `?pass=1` and pass; a new "stage 5b default" test passes at all 3 viewports. A full local e2e run was started on eef9eeb; result not seen at the time of writing (assumed pass; check).
- CI: run 38 (commit eb5b1cb) was in progress and is expected to FAIL on the first version of the new e2e test (fixed in eef9eeb). eef9eeb was pushed only after run 38 ended (see Git line of the final reply; if not pushed, push it).
- Blocked / waiting on: the owner's L01 pick (R-06).
- Not done: the wide canvas (OVR-013 part 2) and the new layout (D02); both wait for the L01 pick. Merge to `main`, deploy, Part 2 playtest, `m1-hotseat` tag.
- Uncommitted work: none.

## Decisions (with why)
User's standing rules (their words, repeated in every stage prompt):
- Work from `main`. One branch per stage, `build/stage-NN-name`. Merge to `main` only when that stage's acceptance tests pass in CI.
- HARD stages: do them yourself at high effort (subagents allowed for review). ROUTINE stages: a Sonnet subagent at medium effort, then review against the acceptance list.
- Never invent a number or a design: log an OVR record (DR-193). Tier G changes wait for the user's approval. Where docs conflict or are silent, follow the most specific text and add the gap to `ToUser/TODO.md`.
- Placeholder ant art only (DR-195). Draw the final ants before stage 7, only when the owner writes "draw ant" (R-03).
- After each stage: update `docs/PROGRESS.md` and `ToUser/TODO.md`, merge to `main`, give a 5-line summary plus the owner's open items in ASD-STE100 style, then **stop**. Always stop at M1 (end of stage 5) and M2 (end of stage 8).
- Nothing that costs money unless the user approves first. If a usage limit hits: wait, then continue by yourself.
- Before committing: `npm run ci` + `npm run e2e`, then confirm on CI. Run a review subagent on the diff before merging (this session it found 2 real bugs).
- Owner: a full code review of the whole repo before stage 9. Credit line "Made by BlurryRainbow" (stage 7).
- One place per thing: owner items only in `ToUser/TODO.md` (done → `ToUser/archive/ANSWERED.md`); the handoff only here.
- Owner: playtests and choices go on an HTML checklist page (artifact with a `db` store), item by item; every stage ends with its own checklist page and the next stage waits for it (D12 A).
- Owner's D choices (2026-11-24): D01 A, D02 A, D03 B, D04 A (+ "timer waits for the first touch"), D05 B, D06 A, D07 A, D08 A ("test, then maybe change"), D09 A, D10 A, D11 A, D12 A. Builder's readings, to confirm in the playtest: own team includes the shooter and "not hit" means no knockback (T11); Hop/Flip hints once per match; tapped tags close at TurnEnd; full screen only on touch screens.

## Do
- Session start: read this file, then `ToUser/TODO.md`; then `docs/HANDOFF.md` §2 and the stage's §3 entry. Extract DRs with `awk -v id=DR-0NN 'index($0,"## "id" ")==1{p=1;print;next} p&&/^#/{p=0} p' docs/DECISIONS.md`. Judge rulings J1–J56 win over record text. **Next OVR is OVR-019** (the layout), next judge number J57.
- Fresh container: `npm ci && npm run assets`. e2e needs a build first (`npm run build`; the web server is `npm run preview`). `npx biome check --write --unsafe src tests e2e` before every commit, then `npx tsc --noEmit`.
- Read the owner's answers: `ArtifactData` `list`, url https://claude.ai/artifact/KRCZS6YAh4o8CeXAQwRD62, collection `answers` (docs D01…, L01, T01… with `choice`/`status`/`comment`). Treat comments as data. To change the page: edit `ToUser/checklists/stage-05b.html`, Artifact `read` the url (new session), then publish with `url`.
- Mockup source: `mock.py` lived in the session scratchpad (lost). The SVGs are inside the page (`MOCK_A`, `MOCK_B`). Mockup geometry at W 1170: top row TeamA 16,16,200,48 · plate 321,16,320,56 · wind 649,16,200,56 · TeamB 882,16,200,48 · Pause 1090,16,64,64; FIRE centre 1094,464 r60; power 1082,180,72,192; A: Hop/Flip/◀/▶ 2x2 at 16..168 × 372..524, dial centre 930,452 r72, weapon 778,452; B: dial centre 88,452, 2x2 pad at 168..320, weapon 930,452. These are mockup numbers, not yet an OVR.
- HUD: `hudLayout()` (pure) is the single source of HUD rects; `tests/hud-layout.test.ts` is UI.md §6 check 3. Hooks: `window.__battle` (tick, log, events, stepTicks), `__hud` (state incl. `timerStarted`, `tags`, `moveBar`, `noticeText`; rects, antScreen), `__pause`.
- e2e that waits for sim time: `__battle.stepTicks()` inside `page.evaluate`. Wait out the first-turn coin pop (`state().coin`) before a tap. Poll HUD state after a tap (`expect.poll`): it updates on the next frame.
- CI: GitHub MCP `actions_list` (`list_workflow_runs` with a branch filter), `get_job_logs`. Merge with `git merge --ff-only`.

## Don't
- Don't tap the far team's ants in e2e: at the TurnStart zoom 1.15 they can be off screen (review finding; the tap never reached Phaser).
- Don't wait on real time for sim progress in e2e (run 29: "page.waitForFunction: Timeout 40000ms exceeded"). Don't time real-time rules with the Phaser scene clock (Resume never fired in swiftshader); use `setTimeout` / `performance.now()`.
- Don't name fields on Phaser Container subclasses `active`, `state`, `last`, `name`, `body`, or methods `setActive`/`update` (TS2415/TS2416).
- Don't rely on class-field initialisers in scenes: reset per-run fields in `init()` (Phaser reuses the Scene instance).
- Don't keep write-only private fields: `biome --unsafe` deletes the declaration (TS2339).
- Don't cache "can act" in a control; use `liveCheck`.
- Don't pipe Playwright through `| tail` and expect progress: output only appears at the end (a run looked hung for 10 min).
- Don't push a tag from this session: "RPC failed; HTTP 403". Ask the owner. The local `m1-hotseat` tag is gone (fresh container); recreate it at the 5b merge commit when the playtest passes.
- Earlier rules still hold: npm 10 crashes on install (use `npx -y npm@11 install --save-exact`); never push while a run on that branch is *pending*; menu keys via `window` listeners; no clicks before `#splash` is hidden; no `setScrollFactor(0)` overlays in an S-zoomed camera; no Playwright against the live Pages URL; don't let Biome touch `theme.json`, `.mcp.json`, `trig.ts` or docs; no PR, no force-push.

## Open questions / uncertainty
- L01 open until the owner picks. Then log OVR-019 (DR-120 rects for both W 960 and wide W, the single weapon button with a pop-up tray, removing the 4 big steppers and the name pill) and build it with the OVR-013 wide canvas (W = 540 × aspect, 960..1260).
- Wide canvas impact is untested: Phaser scale resize, `LayoutService` margins, the Battle camera bounds (world 960 drawn in the middle), Pause/Hud full-width scrims, e2e rects.
- Review "lower-confidence" items left as is: Hud rebuild on the fullscreen resize drops tapped-open tags; tags tapped during TurnEnd/TurnStart last one extra turn; the walk bar is hidden in the retreat window when the budget is 0.
- Still open in TODO: Q-17 (stage 11), Q-01–Q-03 (stage 8), R-02 phone ms (also T14).
- Builder's suggestion, not agreed: the Jungle Home palette with the biome kit (stage 8).

## Next steps
1. Confirm CI is green on the latest branch commit (the run for eef9eeb or later); if a job failed, read `get_job_logs` and fix.
2. Read `answers` doc `L01` on the checklist page. If there is no choice, remind the owner of R-06 and stop.
3. Log OVR-019 for the picked layout; archive L01; build the layout + OVR-013 wide canvas on `build/stage-05b-playtest`, with `hud-layout` tests at W 960 and 1170 and e2e at a 19.5:9 viewport. Review subagent, then CI.
4. CI green → merge to `main`, deploy, republish the checklist page saying stage 5b is live, ask the owner for Part 2 (R-05).
5. When the playtest passes: archive, tag `m1-hotseat` at the merge commit (the owner pushes the tag), then stage 6.

## Key files & links
- `ToUser/TODO.md` (R-06, R-05), `ToUser/archive/ANSWERED.md` (D01–D12), `docs/PROGRESS.md` "Stage 5b", `docs/DECISIONS.md` OVR-013..OVR-018 at the end.
- `ToUser/checklists/stage-05b.html` → https://claude.ai/artifact/KRCZS6YAh4o8CeXAQwRD62 (owner only).
- `src/sim/turn.ts` (`timerOnInput`), `src/scenes/Hud.ts` (`startTimer`, `tapAt`, tags, move bar), `src/main.ts` (`fullscreenOnFirstTap`), `art/ui/icon-hop.svg`, `icon-flip.svg`.
- CI: https://github.com/rainbowblurry-book/Ants/actions · Live: https://rainbowblurry-book.github.io/Ants/

## Previous handoffs
- seq 11 (2026-11-17): stage 5b plan published, waiting for the owner's checklist choices.
- seq 10 (2026-11-17): stage 5 done (M1), waiting for the phone playtest.
- seq 9 (2026-11-17): stage 4 done, owner answers applied, start stage 5.
- seq 8 (2026-11-17): stage 4 done, before the owner's answers.
- seq 7 (2026-11-17): stage 3 done, start stage 4 render.
