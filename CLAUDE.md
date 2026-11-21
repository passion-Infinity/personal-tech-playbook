# CLAUDE.md — Personal Tech Playbook

This repository is a **Playbook-as-Code** knowledge base: a read-only Angular PWA that renders
version-controlled Markdown playbooks from `src/assets/knowledge/`. There is no backend, no database
and no runtime LLM call. **The knowledge files are the product.** Treat every edit to them like a
code change that will be reviewed in a Git diff.

## Role

Act as a **Principal Software Engineer & Technical Knowledge Distillation Expert**. Your job is to
turn raw, messy technical notes into short, precise, production-grade playbooks, and to keep the
knowledge index consistent.

## Core Philosophy

- **Short, Deep, Actionable**: 300–600 words per playbook (excluding code blocks and diagrams).
- **High-signal, zero-fluff**: no lengthy introductions, no history lessons, no generic tutorials,
  no "In today's world…". Every sentence must change how the reader designs, debugs or answers.
- **Language**: Vietnamese prose that **preserves 100% of original English technical terminology**
  (`Dual-Write`, `idempotent`, `at-least-once`, `Half-Open`, `TTL`…). Never translate a term of art
  into Vietnamese; explain it concisely and accurately in Vietnamese next to it.
- **Accuracy over completeness**: if a claim in the raw notes is ambiguous or likely wrong, do not
  silently "fix" it into something plausible — state the correct version and flag it in the review
  summary.
- Prefer concrete numbers, config names, commands and failure scenarios over adjectives.

## Standardized 6-Part Playbook Structure (mandatory for every `.md` file)

Files start directly with section 1 — **no H1 title** (the app renders title, topic, date and summary
from `playbooks.json`). Use exactly these six `##` headings, in this order:

1. `## 1. Core Concept`
   2–3 sentences: what it is, what core problem it solves, and the mental model.
2. `## 2. How It Works`
   Concise bullet points explaining the underlying mechanism. A short code/config snippet is allowed
   when it is the clearest explanation (always tag the language: `sql`, `java`, `ts`, `python`,
   `go`, `bash`, `yaml`, `json`).
3. `## 3. Visual Diagram`
   Optional. A simple Mermaid diagram (` ```mermaid `), **max 10 lines**, ONLY when it clarifies
   system flow, sequence, state or architecture. If no diagram helps, write a single line:
   `_No diagram needed._` — keep the heading so the structure stays uniform.
   Mermaid gotchas: do not use `;` inside labels/messages (it ends a statement); quote labels that
   contain `()[]{}` e.g. `A["Cache (L1)"]`.
4. `## 4. Rules of Thumb & Trade-offs`
   When to use, when NOT to use, and the architectural trade-offs (Latency vs. Consistency,
   Availability vs. Freshness, Complexity vs. Throughput…). Compact tables are welcome.
5. `## 5. Must Remember / Production Pitfalls`
   Critical takeaways, production bottlenecks, edge cases, and system design interview traps.
6. `## 6. Search Hooks`
   Bullet list of exact English keywords for external deep-dive searching, each with a 1-line
   Vietnamese summary. Format: ``- `Exact English Term` — tóm tắt 1 dòng tiếng Việt.``

## Knowledge Layout

```
src/assets/knowledge/
├── topics.json        # [{ id, name, description }]   (order = display + recommendation order)
├── keywords.json      # [{ id, term, meaning, definition, topicId }]
├── playbooks.json     # [{ id, title, summary, topicId, keywordIds[], filePath, updatedAt, prerequisites[] }]
├── questions.json     # practice bank: mcq | bug | explain  (Daily Drill, Review AI, Explain-back)
├── challenges.json    # design / debugging challenges with rubric and reference solution
└── playbooks/<topic-id>/<playbook-id>.md
```

Field rules:

- `id` values are lowercase kebab-case, stable forever (they are URLs: `/playbooks/<id>`).
- `topics.json`: broad areas only (`fundamentals`, `system-design`, `caching`, `backend`, `distributed`,
  `data-engineering`, `aws`, `azure`, `ai-ml`…). Reuse an existing topic whenever reasonable; add a new
  one only for a genuinely new area. **Array order matters**: earlier topics are recommended first.
- `keywords.json`: `term` = exact English term as people search it; `meaning` = short Vietnamese
  meaning (≤ 1 line); `definition` = 1–2 sentence Vietnamese definition keeping English terms;
  `topicId` must exist in `topics.json`. One keyword may be shared by several playbooks.
- `playbooks.json`: `summary` = exactly one Vietnamese sentence with the core value;
  `keywordIds` = 3–6 ids that exist in `keywords.json` (normally the most important Search Hooks of
  section 6); `filePath` = `assets/knowledge/playbooks/<topicId>/<id>.md` (relative, **no leading
  slash** — required for GitHub Pages sub-path hosting); `updatedAt` = today's date `YYYY-MM-DD`.
- **`prerequisites`** (learning tree): ids of playbooks the reader should know first — **only direct
  dependencies**, 0–3 of them, never itself, **never a cycle**. The app derives each playbook's *level*
  from the longest prerequisite chain (roots = level 0), so playbooks that do not depend on each other
  land on the same level automatically. Cross-topic prerequisites are encouraged (e.g. `saga-pattern`
  requires `db-transactions-isolation`). Ask: "could a reader follow this playbook without X?" — if not,
  X is a prerequisite.
- **`questions.json`** — every playbook should have **3 `mcq` + 1 `explain`** (add a `bug` when the topic has a
  classic AI-generated pitfall). Shape: `{ id: "<playbookId>-NN", playbookId, type, difficulty 1-3, question,
  options[], answer: [indexes], explanation }`; `bug` adds `code: { language, text }`; `explain` has
  `modelAnswer` and `keyPoints[]` instead of options. Write questions that test **trade-offs, failure modes
  and "why"**, not trivia: plausible distractors, exactly the correct indexes, a one-paragraph explanation.
  Vary the position of the correct option.
- **`challenges.json`** — realistic design/debug scenarios: `{ id, title, topicId, difficulty, prerequisites[],
  scenario, requirements[], hints[], rubric: [{ item, points }], solution (markdown), pitfalls[] }`.

## Index Synchronization Rule (always)

Whenever adding or updating knowledge:

1. **ALWAYS inspect `topics.json`, `keywords.json` and `playbooks.json` first**, plus the `.md` of
   any playbook whose title/summary/keywords overlap with the new material, and the existing
   `questions.json` entries for it.
2. **Prevent duplicates**: if the concept overlaps an existing playbook, **prefer updating the
   existing playbook** (merge the new insight into the right section, keep within 600 words)
   instead of creating a near-duplicate. Reuse existing keyword ids instead of adding synonyms.
3. **Keep the knowledge files strictly synchronized with the `.md` files**:
   - every playbook in `playbooks.json` has an existing `.md` at `filePath`, and every `.md` is
     listed;
   - every `keywordIds` entry exists in `keywords.json`; every `topicId` exists in `topics.json`;
   - **set `prerequisites`** for every new playbook (and add the new playbook as a prerequisite of
     existing ones only when they genuinely build on it);
   - **add practice questions** for every new playbook and refresh them when its content changes;
   - bump `updatedAt` of every playbook whose `.md` you changed;
   - do not leave orphan keywords that no playbook references unless intentionally kept as a
     standalone hook.
4. **Validate before finishing**: `npm run validate` (also runs automatically before `npm run build`).
   It fails on broken references, prerequisite cycles, bad question shapes and a non-standard
   playbook structure, and warns on word count (300–600) and Mermaid size (≤ 10 lines).
   Then run `npm run build` for larger changes.

## Daily Workflow

- `/distill <raw notes>` (see `.claude/commands/distill.md`) is the standard way to add knowledge.
- Never commit or push unless the user asks; the user reviews the Git diff first.
- Do not touch app code (`src/app/**`) or deployment configs during a distill task.
- Learning features (Roadmap tree, Daily Drill, Design Challenge, Review-AI bug hunt, Explain-back, Flashcards,
  streak) read these files directly and store progress only in the learner's browser (`localStorage`).

## App / Repo Notes

- Angular (standalone components, signals), Tailwind CSS v4, `marked` + `highlight.js` + lazy
  `mermaid`, `@angular/service-worker`.
- `npm start` → dev server (service worker disabled); `npm run build` → `dist/playbook/browser`.
- `ngsw-config.json` prefetches `/assets/knowledge/**`, so new playbooks are cached offline
  automatically and installed clients see a "New knowledge update available — Reload" toast.
- Deployment: Cloudflare Workers (`wrangler.jsonc`, SPA fallback built in — never add
  `public/_redirects`, Workers rejects it), Cloudflare Pages, Vercel (`vercel.json`), GitHub Pages
  (`.github/workflows/deploy.yml`).
