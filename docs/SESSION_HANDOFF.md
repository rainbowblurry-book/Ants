# Handoff: ANTS! build, stage 2 done → start stage 3 (turn flow, match, replay, saves)
Seq: 6 | Date: 2026-11-17 | Branch@commit: main@45eb3b4 (same as build/stage-02-weapons) | Status: in progress, stage 2 done, stage 3 not started
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (not docs/HANDOFF.md: that file is the build plan)

## Goal
Build the Phaser 3 ant artillery game ANTS! exactly as planned in `docs/HANDOFF.md`, one stage at a time. You are the **builder**. The plan is finished; do not redesign it.

## State
- Done: stages 0, 1 and **2** (all 6 weapons in `src/sim/weapons/`, `damage.ts`, `movement.ts`, `pickups.ts`, `angle.ts`; 10 test files, 125 unit tests). Stage branch CI run 13 (commit 6710558) was green. Fast-forwarded to `main` at 45eb3b4. The `main` run after that push and the docs-only branch runs 14 and 15 were not checked (assumed green: docs only). Details, measured numbers and implementation choices are in `docs/PROGRESS.md` "Stage 2".
- In progress: nothing.
- Blocked / waiting on: the user's answers to the 4 Tier G questions in PROGRESS "Open items" (back-flip fall damage, Plop on water, Dewdrop on BOUNCY, swim-back with no dry ground). They do not block stage 3. Nothing was applied for them.
- Uncommitted or unsaved work: none.

## Decisions (with why)
These are the user's standing rules (their words, repeated in every stage prompt):
- Work from `main`. One branch per stage, `build/stage-NN-name`. Merge to `main` only when that stage's acceptance tests pass in CI.
- HARD stages: do them yourself at high effort. ROUTINE stages: a Sonnet subagent at medium effort, then review against the acceptance list.
- Never invent a number or a design. If something is missing or infeasible, log an OVR record (DR-193). Tier G changes wait for the user's approval. Where the docs conflict or are silent, the builder follows the most specific text and lists the gap in PROGRESS "Open items".
- Placeholder ant art only (DR-195). Do not draw ants unless asked.
- After each stage: update `docs/PROGRESS.md`, merge to `main`, give a 5-line summary, then **stop**. Always stop at M1 (end of stage 5) and M2 (end of stage 8).
- **Nothing that costs money unless you ask first and the user approves. If a usage limit is hit, stop and wait.**
- Run /cpt at the end of each session to update this file.

## Do
- Read `docs/HANDOFF.md` §2 and the stage's §3 entry first. Extract DRs with `awk -v id=DR-0NN 'index($0,"## "id" ")==1{p=1;print;next} p&&/^#/{p=0} p' docs/DECISIONS.md`. Judge rulings J1–J56 win over record text.
- A fresh container has no `node_modules`: run `npm ci` first.
- Run `npx biome check --write` before every commit (add `--unsafe` for the Math.min/max lint fixes; they are exact).
- Put helpers shared by tests in `tools/`, not in a `*.test.ts` file.
- Sim code may use `+ - * /`, `Math.sqrt/floor/ceil/round/min/max/imul`, `sinDeci`/`cosDeci` and `src/sim/angle.ts` (`asinDeci`, `slopeDeci`, `rotateDeci`). Tests may use `Math.sin/tan/hypot`.
- For stage 3, build on `Match` in `src/sim/match.ts` (commands `fire`/`walk`/`hop`/`flip`, `stateHash()`, team ammo), `stepShot`/`shotLive` in `src/sim/weapons/index.ts`, `antSpeed`/`resetBudget`/`skipNextTurn` in `movement.ts`, and `LevelWind.gauge().next`.
- Before e2e: `npm run build`, then `npm run e2e`. Check CI with the GitHub MCP tools (`actions_list`: `list_workflow_runs` with a branch filter, then `list_workflow_jobs`). Wait with a background `sleep`.
- Merge with `git merge --ff-only`, then `git push origin main build/stage-NN-…`. Next OVR is **OVR-004**. Next judge number is J57.

## Don't
- Don't use npm 10 to add packages (`Cannot read properties of null (reading 'edgesOut')`, OVR-002). Use `npx -y npm@11 install --save-exact`.
- Don't push a second commit while a run on that branch is still *pending*. A newer push cancels the pending run (stage 0, run 2 `cancelled`). Pushing while a run is *in progress* is fine: in stage 2, run 13 finished green while run 14 queued behind it. The stop hook asks for every commit to be pushed.
- Don't use `**` in sim code (ban-scan fails). Don't compare `-0` with `toBe(0)`.
- Don't use a 32 px foot-contact window: 65–70° slopes read as flat. The window is 44 px (head probe) both ways.
- Roller and wall scans: a rise of k − 1 px needs k + 1 cells checked. The off-by-one made an 8 px step read as a wall.
- Don't run Playwright against the live Pages URL (the safety classifier denied it). A plain `curl` status check is allowed.
- Don't let Biome reformat `src/ui/theme.json`, `.mcp.json`, `src/sim/trig.ts` or the docs. Don't open a PR, force-push, or name another file `docs/HANDOFF.md`.

## Open questions / uncertainty
- The 4 Tier G questions from stage 2 and the projectile void-floor gap from stage 1: see PROGRESS "Open items". Ask the user before changing any of them.
- DR-009 says the Roller slides "about 490 px" on SLICK. The formula gives ≈ 376 px in the 150-tick fuse, so DR-009's figure looks like a hand-calculation slip (it matches a 200 px/s start). The code follows the formula.
- Phone frame time at S=2 and the "Made by" credit name (DR-174) are still unanswered by the user.
- The harness gives each session a `claude/...` branch. The user's stage-branch rule was followed and that branch was left unused (assumed this is what the user wants).
- `src/scenes/Spike.ts` and `e2e/spike.spec.ts` are throwaway and must stay green until stage 4.

## Next steps
1. `npm ci`, `git checkout main && git pull`, `git checkout -b build/stage-03-turn-flow`.
2. Read HANDOFF §3 stage 3, PLAN §3 (turn FSM, timer, sudden death, pause and saves) and §10 (`turn`, `replay`), plus DR-042, DR-043, DR-044, DR-047, DR-018 and J5–J7, J18.
3. Build the turn FSM (TurnStart → Move/Aim → Fire 18-tick spawn → Resolve with 3 s retreat and the settle rule → TurnEnd), the 30/60 s timer, the win/draw check, sudden death and the wind roll. Add replay re-simulation and the `ants.save.v1`/`ants.match.v1` saves with `migrate()`.
4. Write `turn.test.ts` and `replay.test.ts`. Push once and wait for green CI. Then update PROGRESS, fast-forward `main`, give the 5-line summary and stop.

## Key files & links
- `docs/HANDOFF.md` - build plan: rules and the 14 stages with acceptance lists.
- `docs/PROGRESS.md` - build log (stages 0–2), measured numbers, implementation choices, open items.
- `docs/DECISIONS.md` - DR-001..DR-197, J1–J56, OVR-001..OVR-003 at the end.
- `src/sim/` - sim core, weapons, damage, movement. `tools/ban-scan.ts`, `tools/gen-trig.ts`.
- CI: https://github.com/rainbowblurry-book/Ants/actions · Live: https://rainbowblurry-book.github.io/Ants/

## Previous handoffs
- seq 5 (2026-11-17): stage 1 done, start stage 2 weapons.
- seq 4 (2026-11-17): stage 0 done, start stage 1 sim core.
- seq 3 (2026-11-16): planning A–D done; builder to start at stage 0.
- seq 2 (2026-11-16): checkpoint C done, await approval.
- seq 1 (2026-11-16): checkpoint B done, start C then D.
