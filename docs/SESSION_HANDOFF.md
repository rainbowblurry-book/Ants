# Handoff: Project Ants planning, checkpoint B done → start C, then D
Seq: 1 | Date: 2026-11-16 | Branch@commit: claude/eager-mccarthy-jpc952@c70b707 | Status: in progress (B done, C not started)
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (not docs/HANDOFF.md: that name is the checkpoint D deliverable)

## Goal
Plan (not build) a Phaser 3 ant artillery game. You act as the **planner**: write docs only, no game code. Next deliverables are checkpoint C (`docs/UI.md` + `src/ui/theme.json`), then checkpoint D (`docs/HANDOFF.md`). The rules are in `docs/BRIEF.md`.

## State
- Done:
  - Checkpoint A was approved apart from the ant art.
  - Checkpoint B (`docs/PLAN.md`, 64 Decision Records) is done, plus two rounds of user edits: Level 0, 3 new weapons, early rewards and kits.
- The user asked to move to C and D. **The brief still says to stop after C** and wait for approval before D.
- GitHub Pages: the user set Source to "GitHub Actions". The site appears once code reaches `main`.
- Uncommitted work: none.

## Decisions (with why), only those not obvious from the docs
- The ant design reference is the user's Gemini images in `art/source/`. They are reference only, never shipped or traced, because they are AI-generated (DR-007 licensing note).
- Level 0 Part 2 is one Level 70 Preview attempt, not three teasers. The user clarified "teser" meant **trial shots of 3 not-yet-unlocked weapons** plus a level-70 taste (DR-070).
- The 3 new weapons unlock at L14, L24 and L34, because the user wants weapons that unlock "soon" and a rewarding early game (DR-009, J23). The user has not commented on the weapon picks themselves (assumed accepted).
- Bot cap numbers were recalibrated by the planner's Monte-Carlo, because the debate's draft gave 99% hits at L90 (DR-063 to DR-065).

## Do
- Follow `docs/BRIEF.md` checkpoint rules:
  - Every UI item cites a Decision ID.
  - Sonnet subagents at medium effort run the debates, one per screen. Pass `model: sonnet` and `effort: medium`.
  - Big creative calls use the haiku debate. Show the haikus to the user.
  - The planner judges every record and adds a **Judge's ruling** line where records conflict. Use the J-numbers that follow J26.
- After each checkpoint: update `docs/PROGRESS.md`, commit, push to `claude/eager-mccarthy-jpc952`, give a 5-line summary, and ask "Do you approve continuing to the next stage?" Then stop.
- Apply the installed skills `design-system` (token layers) and `frontend-design-ui-ux` (spec handoff) for C.
- Write in plain short sentences, and say what was verified and what was assumed. The user writes quickly with typos, so infer the meaning, and ask only when the answer would change the work.
- Pin versions to ones at least 2 weeks old, and check them on npm before writing them.

## Don't
- Don't redraw the ant art unless the user asks. The SVG redraws were rejected (helmets looked wrong, DR-007a). The preview still uses the placeholder cut-outs.
- Don't name the session file `HANDOFF.md`, because that is the D deliverable.
- Don't force-push. In this session a push was rejected because the user had uploaded files to the branch through GitHub. The fix was `git fetch origin <branch> && git merge --no-edit FETCH_HEAD`.
- Don't change team identity. The cap colour (blue `#0072B2` with a circle, amber `#E69F00` with a triangle) and the badge shape stay fixed, and trinkets never cover them (J26).
- Don't use Worms names or weapons, gradients or glints, angular shapes, or humans as targets (CREATIVE §7).

## Open questions / uncertainty
- When to draw the final ant SVG from `art/source/`: before C, during C, or later. Ask the user.
- The user said they will read `PLAN.md` later, so expect edits to the level table (§6) or bosses (§7).
- Unverified items (PLAN §12): the S=2 crisp-canvas spike, device memory and per-blast ms, and Node 24 in CI.
- The calibration scripts lived in the session scratchpad and are **not** in the repo. Re-derive them from PLAN §9 if they are needed.

## Next steps
1. Read `docs/BRIEF.md` (checkpoint C), `docs/PROGRESS.md` (open items for UI.md), `docs/DECISIONS.md` (DR-003, DR-003a, DR-015, DR-033, DR-070, DR-071, and the J-tables), `docs/CREATIVE.md` §3, and `art/reference/ui-preview.html`.
2. Spawn Sonnet debate subagents, one per screen or system: tokens and theme, Title, Level select and map, Comic, Battle HUD (6-slot weapon tray, wind gauge with vertical chevron, boss telegraph), Results and rewards, Level 0 (Sneak Shot chips, Preview cards), Album / Wardrobe / Nicknames, Settings and Pause, two-player setup, Rotate and loading screens.
3. Judge the records, then write `docs/UI.md` and `src/ui/theme.json`. Settle the minimum touch size at 667x375 (FIT 0.69), keyboard power keys and the asset list (map the ant sprites to the `art/source/` files).
4. Update PROGRESS, commit, push, give the 5-line summary, ask for approval and stop.
5. After approval, do D: write `docs/HANDOFF.md`. Start with a one-page Decisions Summary, then the stage plan (stage 0 = the S=2 spike). Tag each stage hard (Fable, high effort) or routine (Sonnet subagent, medium effort), with acceptance tests from PLAN §10.

## Key files & links
- `docs/BRIEF.md`: the verbatim brief and the standing user additions (the rules).
- `docs/PROGRESS.md`: current state, open items, and the ant art reference table.
- `docs/PLAN.md`: checkpoint B (systems, 100-level table, bosses, bot AI, tests, deploy YAML).
- `docs/DECISIONS.md`: DR-001 to DR-072, the J1–J26 judging tables, and the Override format.
- `docs/DEBATES.md`: haiku debates 1–4. `docs/CREATIVE.md`, `docs/STORY.md`.
- `art/source/`: the user's ant reference images. `art/reference/`: the approved preview and screenshots.
- Repo: https://github.com/rainbowblurry-book/Ants, branch `claude/eager-mccarthy-jpc952`.

## Previous handoffs
- none (first)
