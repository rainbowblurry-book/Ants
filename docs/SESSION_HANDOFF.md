# Handoff: Project Ants planning, checkpoint C done → await approval, then D
Seq: 2 | Date: 2026-11-16 | Branch@commit: claude/eager-mccarthy-jpc952@fd987a9 | Status: in progress (C done, waiting for the user's approval before D)
Saved to: rainbowblurry-book/Ants, docs/SESSION_HANDOFF.md (not docs/HANDOFF.md: that name is the checkpoint D deliverable)

## Goal
Plan (not build) a Phaser 3 ant artillery game. You act as the **planner**: write docs only, no game code. The next deliverable is checkpoint D (`docs/HANDOFF.md`). The rules are in `docs/BRIEF.md`.

## State
- Done: A (approved except ant art), B (`PLAN.md`), and **C**, committed in fd987a9:
  - `docs/UI.md`
  - `src/ui/theme.json`
  - DR-080 to DR-183 plus the judging table J27–J56 in `DECISIONS.md`
  - sync edits to `CREATIVE.md` §3 and `PLAN.md` §3
  - `PROGRESS.md` updated
- Waiting on: the user's answer to "Do you approve continuing to the next stage?" for C → D.
- Uncommitted work: none. The scratchpad copies of the debate records (`scratchpad/c/*.md`) are temporary, and everything in them is now in `DECISIONS.md`.

## Decisions (with why)
- **The user's own ask:** at the start of this session the user said "C and D only". After `/cpt` resume they said "ok go, start from fresh knowledge from B handoff". So C was re-run from scratch, with PLAN.md as context, and the stale pre-B debate drafts were discarded.
- **Brief rule:** stop after C for approval, because BRIEF requires a stop at each checkpoint and handoff seq 1 said so. The user has not waived it.
- **`action` colour:** now `#EE6083` with plum text, and the scrim is 70%. This came from the planner's own contrast script: `#E8456B` failed (white 3.82, plum 4.06), and a 60% scrim failed (3.79). The user has not seen this change yet.

## Do
- Follow the BRIEF checkpoint rules:
  - Sonnet debate subagents at medium effort (`model: sonnet`, `effort: medium`), one per screen or system.
  - The planner judges every record with J-numbers. The next one is **J57**.
  - Every item cites a Decision ID.
- Ask each subagent to also save its records to a scratchpad file. That saves retyping them into `DECISIONS.md`.
- After each checkpoint: update PROGRESS, commit, push, give a 5-line summary, ask for approval, and stop.
- Write in plain short sentences. Say what was verified and what was assumed. The user writes with typos, so infer the meaning.

## Don't
- **Don't run debates before reading the latest remote branch.** Run `git fetch` first. This session started 5 debates without PLAN.md because B had been pushed from another session, and they conflicted with B (hold-to-charge vs DR-033 set-then-fire, a 3-slot tray vs 6, Actions v4 vs v5–v7).
- **Don't launch more than about 10 Sonnet subagents at once.** The account hit "You've hit your 5-hour limit" mid-run, and two agents died before saving their files.
- Don't redraw the ant art unless the user asks (DR-007a). The reference is `art/source/`.
- Don't name the session file `HANDOFF.md`, and don't force-push.
- Don't change team identity or add free-text names (J44).

## Open questions / uncertainty
- The user has not reviewed UI.md. Expect edits, especially to the action colour and the HUD layout (DR-120).
- The D draft records P-1..P-8 from this session were made without PLAN.md and are not saved anywhere. Re-run them (assumed: they are worth reusing as prompts only).
- Real-device checks are still open: the S=2 spike, safe-area `env()` values, and Hop-row reach (UI.md §7).

## Next steps
1. Wait for the user's approval of C, and apply any edits they ask for as new DRs or J rulings.
2. Run the D debates: build stage order, the hard/routine tag rule, the test stack, the override tiers, src layout and the placeholder-art manifest.
   - Use Sonnet at medium effort, with PLAN §10–§12, UI.md §6 and J48–J50 as required context.
3. Write `docs/HANDOFF.md`.
   - Start with a one-page Decisions Summary ("we chose X over Y because Z").
   - Then the stages, with stage 0 = the S=2 spike. Each stage gets its files, acceptance tests (PLAN §10, UI.md §6) and a hard or routine tag.
4. Update PROGRESS, commit, push, give the summary, and stop.

## Key files & links
- `docs/BRIEF.md`: the rules.
- `docs/PROGRESS.md`: current state and open items.
- `docs/UI.md` + `src/ui/theme.json`: checkpoint C.
- `docs/PLAN.md`: checkpoint B.
- `docs/DECISIONS.md`: DR-001..DR-183, J1–J56.
- `art/source/`: the ant reference images. `art/reference/`: the approved preview.

## Previous handoffs
- seq 1 (2026-11-16): B done, start C then D.
