---
description: Distill raw technical notes into a 6-part playbook and sync the knowledge index
argument-hint: <raw technical notes>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(date:*), Bash(node:*), Bash(git status:*), Bash(git diff:*)
---

You are the Principal Software Engineer & Technical Knowledge Distillation Expert defined in
`CLAUDE.md`. Follow every rule in `CLAUDE.md` (Core Philosophy, 6-Part Playbook Structure, Index
Synchronization Rule). Do not commit or push.

## Raw notes

<raw_notes>
$ARGUMENTS
</raw_notes>

If the raw notes are empty, stop and ask the user to run `/distill <notes>` with their notes.

## Steps

1. **Read the input.** Treat `<raw_notes>` as the user's raw technical notes (any language, any
   format, possibly incomplete or partly wrong). Identify the core concept(s), mechanisms,
   trade-offs, pitfalls and the exact English terms involved.

2. **Read the knowledge index.** Read `src/assets/knowledge/topics.json`,
   `src/assets/knowledge/keywords.json` and `src/assets/knowledge/playbooks.json`. For every
   playbook whose title, summary, topic or keywords overlap with the notes, also read its `.md`
   file and its entries in `src/assets/knowledge/questions.json`. Look at existing `prerequisites`
   to see where the new knowledge fits in the learning tree.

3. **Decide the action.**
   - `UPDATE_EXISTING` if an existing playbook already covers the same concept (or the notes are a
     sub-aspect of it). Merge the new insight into the correct sections; remove anything now
     redundant; stay within 800–1,100 words.
   - `CREATE_NEW` only if no existing playbook covers the concept. Choose an existing topic when
     reasonable; add a new topic to `topics.json` only for a genuinely new area. Choose a stable
     kebab-case `id`.
   - If the notes clearly contain several unrelated concepts, handle each one separately (one
     action per playbook) and report each.

4. **Write and sync.**
   - Get today's date with `date +%F`.
   - Write/update `src/assets/knowledge/playbooks/<topic-id>/<playbook-id>.md` using the strict
     6-Part Playbook Structure (no H1; headings `## 1. Core Concept` … `## 6. Search Hooks`;
     Mermaid ≤ 10 lines and only when it clarifies flow/sequence/architecture).
   - Sync `keywords.json`: add new Search Hooks (reuse existing ids for the same term; never add
     synonyms as duplicates); update `meaning`/`definition` if the notes improve them.
   - Sync `playbooks.json`: `title`, one-sentence Vietnamese `summary`, `topicId`, 3–6
     `keywordIds`, relative `filePath` (no leading slash), and `updatedAt` = today (YYYY-MM-DD).
   - Sync `topics.json` if a topic was added (place it in the right position: array order decides
     which tracks are recommended first).
   - **Learning tree**: set `prerequisites` (0–3 direct dependencies, existing ids only, no cycles). If an
     existing playbook genuinely builds on the new one, add the new id to *its* `prerequisites`.
   - **Practice**: write/refresh questions in `questions.json` — **3 `mcq` + 1 `explain`** for a new playbook
     (plus a `bug` question if there is a classic AI-generated pitfall); on `UPDATE_EXISTING` revise the
     questions the change affects. Test trade-offs, failure modes and "why", with plausible distractors,
     ids `<playbookId>-NN`, and a short explanation. Add a `challenges.json` entry only if the notes
     describe a realistic design/debug scenario.
   - Validate: run `npm run validate` and fix every error (it checks references, prerequisite cycles,
     question shapes and the 6-part structure; warnings on word count and diagram size are advisory).

5. **Output a concise terminal review summary** (no other commentary), exactly in this shape:

   ```
   Action: CREATE_NEW | UPDATE_EXISTING (`src/assets/knowledge/playbooks/<topic>/<id>.md`)
   Topic & Playbook Title: <Topic name> — <Playbook title>
   Extracted Search Hooks:
     - <English term> — <Vietnamese meaning>
     - ...
   Technical Verification Note:
     - <each ambiguous, outdated, version-specific or potentially inaccurate claim from the raw
       notes, what you wrote instead, and what the user should verify in the Git diff>
     - (or "None — all claims are standard and verified against well-known behaviour.")
   Learning tree: Level <n> · prerequisites: <ids> · unlocks: <ids>
   Practice added: <n> mcq, <n> explain, <n> bug (<question ids>)
   Index changes: <files touched in topics / keywords / playbooks / questions / challenges>
   Next: review with `git diff`, then commit.
   ```
