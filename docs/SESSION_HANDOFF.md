# Handoff: ANTS! build, stage 1 done → start stage 2 (weapons, damage, movement)
Seq: 5 | Date: 2026-11-17 | Branch@commit: main@8bdace5 (same as build/stage-01-sim-core) | Status: in progress, stage 1 done, stage 2 not started
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (not docs/HANDOFF.md: that file is the build plan)

## Goal
Build the Phaser 3 ant artillery game ANTS! exactly as planned in `docs/HANDOFF.md`, one stage at a time. You are the **builder**. The plan is finished; do not redesign it.

## State
- Done: **stage 0** (scaffold, CI, Pages, S=2 spike) and **stage 1** (sim core: `src/sim/rng.ts`, `trig.ts`, `terrain.ts`, `physics.ts`, `wind.ts`, `match.ts`; tests `rng`, `ban-scan`, `trig`, `terrain`, `physics`, 66 unit tests in all). Stage branch CI run 9 (commit 9af10f2) was green. Fast-forwarded to `main` at 8bdace5. The `main` run (test, e2e, build, deploy) started after the push; its result was not checked (assumed green, because the code is identical to run 9). Details and measured numbers are in `docs/PROGRESS.md` "Stage 1".
- In progress: nothing.
- Blocked / waiting on: nothing. The user asked for a stop after stage 1.
- Uncommitted or unsaved work: none.

## Decisions (with why)
These are the user's standing rules (their words, repeated in the stage 0 and stage 1 prompts):
- Work from `main`. One branch per stage, `build/stage-NN-name`. Merge to `main` only when that stage's acceptance tests pass in CI.
- HARD stages: do them yourself at high effort. ROUTINE stages: a Sonnet subagent at medium effort, then review against the acceptance list.
- Never invent a number or a design. If something is missing or infeasible, log an OVR record (DR-193). Tier G changes wait for the user's approval.
- Placeholder ant art only (DR-195). Do not draw ants unless asked.
- After each stage: update `docs/PROGRESS.md`, merge to `main`, give a 5-line summary, then **stop**. Always stop at M1 (end of stage 5) and M2 (end of stage 8).
- **Nothing that costs money unless you ask first and the user approves. If a usage limit is hit, stop and wait.**
- Run /cpt at the end of each session to update this file.

## Do
- Read `docs/HANDOFF.md` §2 and the stage's §3 entry first. Look up DRs by ID in `docs/DECISIONS.md` (an awk on `## DR-0NN ` headings works). Judge rulings J1–J56 win over record text.
- A fresh container has no `node_modules`: run `npm ci` first.
- Run `npx biome check --write` before every commit. Biome 2.6.4 also formats YAML, JSON and HTML.
- Put helpers shared by tests in `tools/`, not in a `*.test.ts` file (Biome error "Do not export from a test file").
- Regenerate the trig table with `node tools/gen-trig.ts`. `src/sim/trig.ts` is excluded from Biome so the generated text stays byte-exact.
- Sim code may use `+ - * /`, `Math.sqrt/floor/ceil/round/min/max/imul` and `sinDeci`/`cosDeci`. `tools/ban-scan.ts` lists what is banned. `new Set`/`new Map` in `src/sim` or `src/ai` need a `// det-ok: <reason>` comment on the same line.
- Reuse in stage 2: `stepProjectile`/`simulateFlight`, `circleHitsCapsule`, `distToCapsuleSegment` (DR-035 damage distance), `bounceOnMaterial`, `TerrainGrid.erase`/`fill(…, keepOut)` and `Match` (replace its stage 1 `launch` command with weapons).
- Before e2e: `npm run build`, then `npm run e2e`. Check CI with the GitHub MCP tools (`actions_list` `list_workflow_runs` with a branch filter, `list_workflow_jobs`). Wait with a background `sleep`.
- Merge with `git merge --ff-only`, then `git push origin main build/stage-NN-…`. Next OVR is **OVR-004**. Next judge number is J57.

## Don't
- Don't use npm 10 to add packages (`Cannot read properties of null (reading 'edgesOut')`, OVR-002). Use `npx -y npm@11 install --save-exact`.
- Don't push to a stage branch while its CI run is in progress or queued. In stage 0 a newer push cancelled the pending run. In stage 1, commits were held locally until run 9 finished.
- Don't use `**` in sim code, even in a constant like `2 ** 28`. Ban-scan fails on it.
- Don't compare `-0` with `toBe(0)` in tests (`expected -0 to be +0`). Return a real `0`, or add `+ 0`.
- Don't run Playwright against the live Pages URL (the safety classifier denied it). A plain `curl` status check is allowed.
- Don't let Biome reformat `src/ui/theme.json`, `.mcp.json`, `src/sim/trig.ts` or the docs.
- Don't put a `display` rule on `#splash`. Don't use `camera.setOrigin(0,0)` or write `scrollX`/`scrollY` (PROGRESS render rules).
- Don't open a pull request or force-push. Don't name any other file `docs/HANDOFF.md`.

## Open questions / uncertainty
- **Projectile void floor:** DR-026 gives projectiles no lower despawn line, so a shot that falls off a `void` bottom flies until the 8 s cap. It is in PROGRESS open items. If stage 2 or 3 needs a line, it is a Tier G OVR for the user; pick no value yourself.
- **Range shortfall:** the full-power 45° shot lands at 855.5 px, not 864. That comes from the mandated integrator (DR-030), so it is not an OVR. The user has not commented on it.
- Phone frame time at S=2 and the "Made by" credit name (DR-174) are still unanswered by the user.
- The harness gives each session a `claude/...` branch. The user's stage-branch rule was followed and that branch was left unused (assumed this is what the user wants).
- `src/scenes/Spike.ts` and `e2e/spike.spec.ts` are throwaway and must stay green until stage 4 replaces them.

## Next steps
1. `npm ci`, `git checkout main && git pull`, then `git checkout -b build/stage-02-weapons` (name it after the HANDOFF §3 stage 2 title).
2. Read HANDOFF §3 stage 2 and PLAN §4–§5 (weapons table, damage, movement, ant collision), plus DR-034, DR-035, DR-036 (with J1, J2, J6) and DR-009.
3. Build weapons, damage and ant movement in `src/sim`, plus `tests/damage.test.ts` and the stage's acceptance tests.
4. Push the branch once and wait for green CI. Then update PROGRESS, fast-forward `main`, give the 5-line summary and stop.

## Key files & links
- `docs/HANDOFF.md` - build plan: rules and the 14 stages with acceptance lists.
- `docs/PROGRESS.md` - build log (stages 0–1), measured sim numbers, open items.
- `docs/DECISIONS.md` - DR-001..DR-197, J1–J56, OVR-001..OVR-003 at the end.
- `src/sim/` - the sim core. `tools/ban-scan.ts`, `tools/gen-trig.ts` - determinism tooling.
- CI: https://github.com/rainbowblurry-book/Ants/actions · Live: https://rainbowblurry-book.github.io/Ants/

## Previous handoffs
- seq 4 (2026-11-17): stage 0 done, start stage 1 sim core.
- seq 3 (2026-11-16): planning A–D done; builder to start at stage 0.
- seq 2 (2026-11-16): checkpoint C done, await approval.
- seq 1 (2026-11-16): checkpoint B done, start C then D.
