# ToUser: your place in this repo

This folder is for you, the owner. The builder (Claude) writes here. You read here and answer here.

## The files

| File | What it is |
|---|---|
| `TODO.md` | The one list of things for you: questions to answer, things to check, things to review. |
| `archive/ANSWERED.md` | Items that are done. The builder moves them here, with your answer and the date. |

There is only one copy of each item. The build log (`docs/PROGRESS.md`) and the handoff (`docs/SESSION_HANDOFF.md`) point here. They do not copy the questions.

## How to answer

1. Open `TODO.md`.
2. Find an item with **Status: open**.
3. Write your answer on the **Your answer:** line. One word is enough when the item gives choices (for example "A").
4. Save the file and commit it. Or copy the item and paste it in the chat.
5. At the start of the next session, the builder reads `TODO.md`, applies each answer, and moves the item to `archive/ANSWERED.md`.

You do not have to answer all items at once. Each item says **Needed before**. Answer an item before that stage starts.

## Where the session handoff is

- The handoff is always `docs/SESSION_HANDOFF.md`. There is no other handoff file.
- When you say "handoff", "save" or "new chat", the builder updates that file and commits it.
- A new chat starts with the prompt at the end of that file. The new session reads the handoff first, then `ToUser/TODO.md`.
