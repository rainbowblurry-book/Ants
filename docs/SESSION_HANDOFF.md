# Handoff: ANTS! build → stage 5 (M1) closed; next stage 6, Bot AI (HARD)
Seq: 14 | Date: 2026-11-24 | Branch@commit: build/stage-05b-playtest (stage 5 close docs; merge to main after CI) ; main@deb38a0 deployed | Status: ready for stage 6
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (the one and only handoff file; docs/HANDOFF.md is the build plan)

## Goal
Build the Phaser 3 ant artillery game ANTS! exactly as planned in `docs/HANDOFF.md`, one stage at a time. You are the **builder**. Stage 5 (M1) passed the owner's phone test on 2026-11-24. Next: **stage 6, Bot AI (HARD)**.

## State
- Done: stages 0–5 and 5b. Owner's phone test (R-05): T01–T08, T10–T12, T15 pass; T09, T13, T14 not tried; no problems. Archived in `ToUser/archive/ANSWERED.md`.
- `main` = deb38a0, deployed at https://rainbowblurry-book.github.io/Ants/. The stage 5 close docs (TODO, ANSWERED, PROGRESS, this file) are on `build/stage-05b-playtest`; merge them to `main` with `--ff-only` once CI is green on that branch (check first: it may already be done).
- Tag `m1-hotseat`: local only, at deb38a0. The owner pushes it (`ToUser/TODO.md` R-08); this session cannot push tags (HTTP 403).
- Waiting on the owner (not blocking): R-08 tag, R-07 feel notes (later), Q-01–Q-03 (stage 8), Q-17 (stage 11), R-02 phone ms.
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
- Owner: playtests and choices go on an HTML checklist page (artifact with a `db` store), item by item; every stage ends with its own checklist page and the next stage waits for it (D12 A). Owner, 2026-11-24: carry the test protocol forward and add to it as features arrive (put T09 pass the phone, T13 left-handed, T14 phone ms on the stage 6 page).
- Owner, 2026-11-24: wait for the final UI before more feel decisions; then bring back R-07 (jagged handling, power hard to judge) as checklist choices.
- Owner's D choices (2026-11-24): D01 A, D02 A, D03 B, D04 A (+ "timer waits for the first touch"), D05 B, D06 A, D07 A, D08 A ("test, then maybe change"), D09 A, D10 A, D11 A, D12 A. Builder's readings, to confirm in the playtest: own team includes the shooter and "not hit" means no knockback (T11); Hop/Flip hints once per match; tapped tags close at TurnEnd; full screen only on touch screens.

## Do
- Session start: read this file, then `ToUser/TODO.md`; then `docs/HANDOFF.md` §2 and the stage's §3 entry. Extract DRs with `awk -v id=DR-0NN 'index($0,"## "id" ")==1{p=1;print;next} p&&/^#/{p=0} p' docs/DECISIONS.md`. Judge rulings J1–J56 win over record text. **Next OVR is OVR-020**, next judge number J57.
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
- Wide canvas on a real phone is untested: rotate and full-screen resizes (the Hud rebuilds; tapped-open tags are lost), notch insets with `isWide`.
- Mockup source `mock.py` was in the scratchpad (lost); the SVGs live in the page.
- Review "lower-confidence" items left as is: Hud rebuild on the fullscreen resize drops tapped-open tags; tags tapped during TurnEnd/TurnStart last one extra turn; the walk bar is hidden in the retreat window when the budget is 0.
- Still open in TODO: Q-17 (stage 11), Q-01–Q-03 (stage 8), R-02 phone ms (also T14).
- Builder's suggestion, not agreed: the Jungle Home palette with the biome kit (stage 8).

## Next steps
1. Check CI on `build/stage-05b-playtest`; if green and `main` is behind, `git checkout main && git merge --ff-only build/stage-05b-playtest && git push origin main`.
2. Read `ToUser/TODO.md` for new owner answers (apply, archive). Then read `docs/HANDOFF.md` §2 and the §3 stage 6 entry, and the DRs it names (DR-129 bot visuals, the bot AI DRs; PLAN §6).
3. Branch `build/stage-06-bot-ai` from `main`. HARD stage: do it yourself at high effort; review subagent before merging.
4. Build the bot on the layout A HUD (OVR-019): the DR-129 bot turn visuals must fit the new rects (`hudLayout`, W 960..1260).
5. End with a stage 6 checklist page (new artifact, `ToUser/checklists/stage-06.html`, same `answers` pattern) incl. T09, T13, T14 carried forward; stop at the end of the stage.

## Key files & links
- `ToUser/TODO.md` (R-06, R-05), `ToUser/archive/ANSWERED.md` (D01–D12), `docs/PROGRESS.md` "Stage 5b", `docs/DECISIONS.md` OVR-013..OVR-018 at the end.
- `ToUser/checklists/stage-05b.html` → https://claude.ai/artifact/KRCZS6YAh4o8CeXAQwRD62 (owner only).
- `src/sim/turn.ts` (`timerOnInput`), `src/scenes/Hud.ts` (`startTimer`, `tapAt`, tags, move bar), `src/main.ts` (`fullscreenOnFirstTap`), `art/ui/icon-hop.svg`, `icon-flip.svg`.
- CI: https://github.com/rainbowblurry-book/Ants/actions · Live: https://rainbowblurry-book.github.io/Ants/

## Previous handoffs
- seq 13 (2026-11-24): stage 5b live, waiting for the owner's phone test.
- seq 12 (2026-11-24): stage 5b fixes built, waiting for the layout pick.
- seq 11 (2026-11-17): stage 5b plan published, waiting for the owner's checklist choices.
- seq 10 (2026-11-17): stage 5 done (M1), waiting for the phone playtest.
- seq 9 (2026-11-17): stage 4 done, owner answers applied, start stage 5.
