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
   file.

3. **Decide the action.**
   - `UPDATE_EXISTING` if an existing playbook already covers the same concept (or the notes are a
     sub-aspect of it). Merge the new insight into the correct sections; remove anything now
     redundant; stay within 300–600 words.
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
   - Sync `topics.json` if a topic was added.
   - Validate: run
     `node -e "const fs=require('fs'),d='src/assets/knowledge/';const t=JSON.parse(fs.readFileSync(d+'topics.json')),k=JSON.parse(fs.readFileSync(d+'keywords.json')),p=JSON.parse(fs.readFileSync(d+'playbooks.json'));const T=new Set(t.map(x=>x.id)),K=new Set(k.map(x=>x.id));const e=[];for(const x of k)if(!T.has(x.topicId))e.push('keyword '+x.id+' bad topic');for(const x of p){if(!T.has(x.topicId))e.push(x.id+' bad topic');for(const i of x.keywordIds)if(!K.has(i))e.push(x.id+' missing keyword '+i);if(!fs.existsSync('src/'+x.filePath))e.push(x.id+' missing file '+x.filePath)}console.log(e.length?e.join('\n'):'INDEX OK')"`
     and fix every reported problem.

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
   Index changes: <files touched in topics.json / keywords.json / playbooks.json>
   Next: review with `git diff`, then commit.
   ```
