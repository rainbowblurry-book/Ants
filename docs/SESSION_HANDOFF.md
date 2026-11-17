# Handoff: ANTS! build, stage 3 done → start stage 4 (render, assets, UI foundation)
Seq: 7 | Date: 2026-11-17 | Branch@commit: main@(stage 3 merge; same as build/stage-03-turn-flow) | Status: in progress, stage 3 done, stage 4 not started
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (not docs/HANDOFF.md: that file is the build plan)

## Goal
Build the Phaser 3 ant artillery game ANTS! exactly as planned in `docs/HANDOFF.md`, one stage at a time. You are the **builder**. The plan is finished; do not redesign it.

## State
- Done: stages 0, 1, 2 and **3**. Stage 3 added `src/sim/commands.ts`, `turn.ts`, `replay.ts`, a reworked `match.ts`, and `src/save/` (`schema.ts`, `store.ts`, `matchSlot.ts`). 13 test files, 186 unit tests. Stage branch CI run 19 (commit 8a0df19) was green.
- Also done in this session, at the user's request: a full re-read of the stage 1–2 sim code. Two fixes: the Dewdrop bounce normal (`contactNormal` in `physics.ts`) and the sfc32 counter order (`rng.ts`). Details in `docs/PROGRESS.md` "Stage 3 · Review of stages 1 and 2".
- In progress: nothing.
- Blocked / waiting on: the user's answers to 7 Tier G questions in PROGRESS "Open items" (4 from stage 2, 3 from stage 3). None blocks stage 4. Question 5 (what drops in two-player, and where) must be answered before stage 7's Pickups toggle.
- Uncommitted or unsaved work: none. The `main` run after the merge was not checked (assumed green: same commit as run 19 plus docs).

## Decisions (with why)
These are the user's standing rules (their words, repeated in every stage prompt):
- Work from `main`. One branch per stage, `build/stage-NN-name`. Merge to `main` only when that stage's acceptance tests pass in CI.
- HARD stages: do them yourself at high effort. ROUTINE stages: a Sonnet subagent at medium effort, then review against the acceptance list.
- Never invent a number or a design. If something is missing or infeasible, log an OVR record (DR-193). Tier G changes wait for the user's approval. Where the docs conflict or are silent, follow the most specific text and list the gap in PROGRESS "Open items".
- Placeholder ant art only (DR-195). Do not draw ants unless asked.
- After each stage: update `docs/PROGRESS.md`, merge to `main`, give a 5-line summary, then **stop**. Always stop at M1 (end of stage 5) and M2 (end of stage 8).
- **Nothing that costs money unless you ask first and the user approves.**
- **If a usage limit hits: wait, then continue by yourself when it lifts** (new in this session). This session did it with an hourly scheduled task bound to the session, deleted when the stage was done.
- Run /cpt at the end of each session to update this file.

## Do
- Read `docs/HANDOFF.md` §2 and the stage's §3 entry first. Extract DRs with `awk -v id=DR-0NN 'index($0,"## "id" ")==1{p=1;print;next} p&&/^#/{p=0} p' docs/DECISIONS.md`. Judge rulings J1–J56 win over record text.
- A fresh container has no `node_modules`: run `npm ci` first.
- Run `npx biome check --write --unsafe` before every commit.
- Put helpers shared by tests in `tools/` (`tools/match-fixture.ts` has `arena()`, `runTo()`, `runToAim()`, `eventsOf()`).
- For stage 4 and 5, read the sim through `Match`: `phase`, `activeAnt`, `turns.timerLeft`, `turns.retreatLeft`, `turns.round`, `turns.dewY`, `world.wind.gauge()`, `events` (phase, ko, timeout, reject, dew, drop, pickup, end) and `shots[].events`. Send input with `match.push({kind: ...})`: `fire`, `walk`, `face`, `hop`, `flip`, `ready` (tap), `cancel` (after Pause).
- Anything that changes sim state must go through `match.push`, or replays and resume break.
- Check CI with the GitHub MCP tools (`actions_list`: `list_workflow_runs` with a branch filter, then `list_workflow_jobs`). Wait with a background `sleep`.
- Merge with `git merge --ff-only`, then push `main` and the stage branch. Next OVR is **OVR-005**. Next judge number is J57.

## Don't
- Don't use npm 10 to add packages (`Cannot read properties of null (reading 'edgesOut')`, OVR-002). Use `npx -y npm@11 install --save-exact`.
- Don't push a second commit while a run on that branch is still *pending*: the newer push cancels it (stage 0, run 2). Pushing while a run is *in progress* is fine.
- Don't read a surface normal from a window centred on the projectile: the Dewdrop ring (8 px) is outside a 9x9 window, and the bounce went straight back. Use `contactNormal`.
- Don't trust a test that only counts events: the Dewdrop bug passed "at most 3 bounces" for a whole stage. Assert directions and values.
- Don't use `**` in sim code (ban-scan fails). Don't compare `-0` with `toBe(0)`.
- Don't run Playwright against the live Pages URL (the safety classifier denied it). A plain `curl` status check is allowed.
- Don't let Biome reformat `src/ui/theme.json`, `.mcp.json`, `src/sim/trig.ts` or the docs. Don't open a PR, force-push, or name another file `docs/HANDOFF.md`.

## Open questions / uncertainty
- The 7 Tier G questions in PROGRESS "Open items". Ask the user before changing any of them.
- DR-009's Roller "about 490 px" on SLICK looks like a slip; the formula gives ≈ 376 px and the code follows the formula.
- Replay speed is measured in node only (9,000 ticks in 36 ms). Phone speed is unknown.
- Phone frame time at S=2 and the "Made by" credit name (DR-174) are still unanswered by the user.
- `src/scenes/Spike.ts` and `e2e/spike.spec.ts` are throwaway. Stage 4 replaces them with the real Battle scene and its own screenshots.

## Next steps
1. `npm ci`, `git checkout main && git pull`, `git checkout -b build/stage-04-render`.
2. Read HANDOFF §3 stage 4, PLAN §1 (loop, texture memory) and §4 (rendering), UI.md §1, §2, §5 and §6 checks 1–2, plus DR-024, DR-046, J7, J49, DR-085 to DR-088, DR-090, DR-195, and PROGRESS "Render rules the spike fixed".
3. Build `src/render/` (terrain chunks and the mask outline, sprites, camera, juice), `src/assets/manifest.ts`, `tools/build-ui.ts`, `tools/bake-fonts.ts`, the component tokens in `tools/gen-theme.ts`, `src/ui/` (Layout, Focus, Nav, fitText, Button, IconButton, Panel, ConfirmModal) and `/art/ui/*.svg`.
4. Pass UI.md §6 checks 1 and 2, the manifest key test, the ≤ 3 resident atlas pages check, and save a Playwright screenshot of a static battle at the 3 viewports.
5. Update PROGRESS, fast-forward `main`, give the 5-line summary and stop.

## Key files & links
- `docs/HANDOFF.md` - build plan: rules and the 14 stages with acceptance lists.
- `docs/PROGRESS.md` - build log (stages 0–3), measured numbers, implementation choices, open items.
- `docs/DECISIONS.md` - DR-001..DR-197, J1–J56, OVR-001..OVR-004 at the end.
- `src/sim/` - sim core, weapons, turn machine, replay. `src/save/` - saves. `tools/` - generators, ban-scan, test fixture.
- CI: https://github.com/rainbowblurry-book/Ants/actions · Live: https://rainbowblurry-book.github.io/Ants/

## Previous handoffs
- seq 6 (2026-11-17): stage 2 done, start stage 3 turn flow.
- seq 5 (2026-11-17): stage 1 done, start stage 2 weapons.
- seq 4 (2026-11-17): stage 0 done, start stage 1 sim core.
- seq 3 (2026-11-16): planning A–D done; builder to start at stage 0.
- seq 2 (2026-11-16): checkpoint C done, await approval.
