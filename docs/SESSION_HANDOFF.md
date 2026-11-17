# Handoff: ANTS! build, stage 4 done → start stage 5 (Battle HUD and input → M1)
Seq: 9 | Date: 2026-11-17 | Branch@commit: main (after the owner's answers; see git log) | Status: in progress, stage 4 done, stage 5 not started
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (the one and only handoff file; docs/HANDOFF.md is the build plan)

## Goal
Build the Phaser 3 ant artillery game ANTS! exactly as planned in `docs/HANDOFF.md`, one stage at a time. You are the **builder**. The plan is finished; do not redesign it.

## State
- Done: stages 0–4. Stage 4 added `src/assets/manifest.ts`, `art/ui/*.svg` (57), `art/placeholder/*.svg`, `tools/build-ui.ts`, `tools/bake-fonts.ts`, token output in `tools/gen-theme.ts`, `src/ui/` (layout, focus, nav, fitText, motion, text, components, ConfirmModal, assets), `src/render/` (terrainPixels, terrainView, camera, loop, sprites, juice), `src/scenes/Battle.ts` + `devArena.ts` + `UiLab.ts`, `src/i18n/`. Spike deleted. 18 test files / 256 unit tests, 33 e2e checks. Stage branch CI run 22 green. Details: `docs/PROGRESS.md` "Stage 4".
- `main` run 24 (b2c8c23: test, e2e, build, deploy) is green, and Pages serves the stage 4 build.
- Owner answered most items (2026-11-17); they are archived in `ToUser/archive/ANSWERED.md` and recorded as OVR-005 (approved), OVR-007 and OVR-008 (new, approved). Still open in `ToUser/TODO.md`: Q-01..Q-04, Q-06, Q-07 (not needed before stage 8/9), R-02 (phone ms), R-03 (ant art). Nothing blocks stage 5.
- Uncommitted work: none.

## Decisions (with why)
User's standing rules (their words, repeated in every stage prompt):
- Work from `main`. One branch per stage, `build/stage-NN-name`. Merge to `main` only when that stage's acceptance tests pass in CI.
- HARD stages: do them yourself at high effort. ROUTINE stages: a Sonnet subagent at medium effort, then review against the acceptance list.
- Never invent a number or a design: log an OVR record (DR-193). Tier G changes wait for the user's approval. Where docs conflict or are silent, follow the most specific text and add the gap to `ToUser/TODO.md`.
- Placeholder ant art only (DR-195). Do not draw ants unless asked.
- After each stage: update `docs/PROGRESS.md`, merge to `main`, give a 5-line summary, then **stop**. Always stop at M1 (end of stage 5) and M2 (end of stage 8).
- Nothing that costs money unless the user approves first. If a usage limit hits: wait, then continue by yourself.
- Before committing, double-check for errors (`npm run ci` + `npm run e2e`), then confirm the build on CI.
- End each session with a bullet list of the owner's open items in ASD-STE100 style, and run /cpt to update this file.
- Owner, 2026-11-17: do **a full code review of the whole repo before the boss fights** (before stage 9 starts).
- Credit line is "Made by BlurryRainbow" (stage 7).
- New this session: **one place per thing.** Owner items live only in `ToUser/TODO.md`; done items move to `ToUser/archive/ANSWERED.md`. The handoff lives only here. PROGRESS points to ToUser and does not copy questions. "handoff / save / new chat" = update this file.

## Do
- At session start: read this file, then `ToUser/TODO.md`. Apply any answers the owner wrote, move them to the archive, note them in PROGRESS.
- Read `docs/HANDOFF.md` §2 and the stage's §3 entry. Extract DRs with `awk -v id=DR-0NN 'index($0,"## "id" ")==1{p=1;print;next} p&&/^#/{p=0} p' docs/DECISIONS.md`. Judge rulings J1–J56 win over record text. Next OVR is **OVR-009**, next judge number J57.
- Fresh container: `npm ci`, then `npm run assets` (atlas + fonts go to git-ignored `public/assets/gen/`; `dev` and `build` run it too).
- `npx biome check --write --unsafe` before every commit. Test helpers go in `tools/` (`tools/match-fixture.ts`) and `e2e/helpers.ts` (`openGame`, `cssPoint`, `saveShot`; `STAGE4_OUT=dir` also writes screenshots there).
- Code asks the manifest for keys (`asset('ui.icon.back')`, `antSideKey(team, pose)`); never a frame name or path (test enforces). Colours only via `color`/`cssColor`/`tokens` from `src/ui/theme.ts` or CSS vars.
- Sim access goes through `Match` and `match.push` only (replays). Battle exposes `window.__battle`, UiLab `window.__uilab` for e2e.
- For stage 5 the HUD should use `LayoutService` (registry `REG_LAYOUT`), `FocusManager` (off in Battle, DR-086), `Button`/`IconButton`/`JellyBox`, `BitmapLabel` (F64 numerals with stroke) and `CameraDirector.panBy` for world drags.
- Check CI with GitHub MCP `actions_list` (`list_workflow_runs` with a branch filter, then `list_workflow_jobs`). Wait with a background `sleep`. Merge with `git merge --ff-only`, push `main` and the stage branch.

## Don't
- Don't use npm 10 to add packages (`edgesOut` crash, OVR-002). Use `npx -y npm@11 install --save-exact`.
- Don't push a second commit while a run on that branch is *pending*: it cancels the run (stage 0, run 2).
- Don't feed menu keys through Phaser's keyboard plugin: it handed one key event to a listener twice when two keys landed in one frame (2 of 5 runs), and `preventDefault` comes too late. `bindFocusKeys` uses `window` listeners.
- Don't click in e2e before `#splash` is hidden: it fades for 250 ms over the canvas and swallows input (all taps failed until `openGame` waited).
- Don't use `setScrollFactor(0)` for fixed overlays in a camera zoomed by S: it zooms around the centre and lands off-screen at S=2. Use a DOM element (the `?mem` line) or a separate UI camera.
- Don't let water reset the surface band: ground under a pool got the grass band (seam test caught it). Only EMPTY starts a band.
- Don't read a surface normal from a centred window, don't trust tests that only count events, don't use `**` in sim code, don't compare `-0` with `toBe(0)` (earlier stages).
- Don't run Playwright against the live Pages URL (classifier denied it); `curl` status is fine.
- Don't let Biome reformat `src/ui/theme.json`, `.mcp.json`, `src/sim/trig.ts` or the docs. Don't open a PR, force-push, or name another file `docs/HANDOFF.md`.

## Open questions / uncertainty
- Open owner questions: `ToUser/TODO.md` only. None blocks stage 5.
- Q-11 answer A lets the builder propose palettes; offering the Jungle Home palette with the stage 5 arena (for the M1 playtest) is the builder's suggestion, not yet agreed.
- AntTag (DR-128) wants a 3 px outline; the r8 nine-slice has 4. Decide how stage 5 draws tags (log an OVR if a thinner slice set is needed).
- Phone frame time at S=2 is unknown (owner item R-02, `?mem` on the live page).

## Next steps
1. `npm ci && npm run assets`, `git checkout main && git pull`, `git checkout -b build/stage-05-hud`.
2. Read `ToUser/TODO.md` for answers; then HANDOFF §3 stage 5, UI.md §4.5 (HUD rects), §4.6 (Pause), §6 check 3, and DR-015, DR-120 to DR-131, DR-171, DR-180 to DR-183, J33, J38, J39, J46, J49, J50.
3. Apply OVR-005 (draw "∞" in the F64 bake, drop it from `KNOWN_MISSING`) and OVR-007 (remove projectiles below y 740, with a test). Build `src/scenes/Hud.ts` + HUD components, `src/input/` (DR-121 keys, DR-015 buffers), the Pause scene, a minimal two-player setup on one arena (Jungle Home; its palette is still a placeholder, Q-11).
4. Pass UI.md §6 check 3 (both handedness, margins 16 and 24), a Playwright full turn by touch and by keyboard, the 667x375 readability screenshot, DR-015 fire buffering.
5. Update PROGRESS and ToUser, merge, tag `m1-hotseat`, deploy, give the 5-line summary, and **stop: ask the owner to playtest on a phone**.

## Key files & links
- `ToUser/TODO.md` - the owner's questions and checks, with answer lines. `ToUser/README.md` explains the flow.
- `docs/HANDOFF.md` - build plan (rules, 14 stages, acceptance lists). `docs/PROGRESS.md` - build log, measured numbers, implementation choices.
- `docs/DECISIONS.md` - DR-001..DR-197, J1–J56, OVR-001..OVR-008 at the end.
- `docs/stage4/*.png` - stage 4 screenshots. `?static=1`, `?mem`, `?scene=uilab`, `?s=1|2` are dev switches.
- CI: https://github.com/rainbowblurry-book/Ants/actions · Live: https://rainbowblurry-book.github.io/Ants/

## Previous handoffs
- seq 8 (2026-11-17): stage 4 done, before the owner's answers.
- seq 7 (2026-11-17): stage 3 done, start stage 4 render.
- seq 6 (2026-11-17): stage 2 done, start stage 3 turn flow.
- seq 5 (2026-11-17): stage 1 done, start stage 2 weapons.
- seq 4 (2026-11-17): stage 0 done, start stage 1 sim core.
