# Personal Tech Playbook

**Live:** https://passion-infinity.github.io/personal-tech-playbook/

A lightweight, **read-only**, offline-first Progressive Web App for your personal engineering
knowledge — built as **Playbook-as-Code**. All knowledge lives in Git as static JSON + Markdown;
Claude Code distills your raw notes into short, deep, actionable playbooks; the app is a fast static
viewer that you can host for free and install on Windows, macOS, Android and iOS.

- No backend, no database, no CRUD forms, no runtime LLM calls.
- Every playbook follows the same 6-part structure (see [`CLAUDE.md`](CLAUDE.md)).
- The whole library is precached by the service worker → instant offline reading and searching.

## Features

| | |
| --- | --- |
| **Navigation** | Sidebar on desktop; top bar + slide-over drawer + bottom tab bar on mobile. Playbook / Search Hook counts, topic filters, dark/light toggle, **Install App** button. |
| **Global search** | `Ctrl/⌘ + K` (or `/`) command palette. Client-side, diacritic-insensitive search over titles, summaries, English terms, Vietnamese meanings, definitions and topics. |
| **Reader** | Topic badge, title, updated date, 1-sentence summary, rendered Markdown with Mermaid diagrams, highlighted code with copy buttons, compact tables, auto Table of Contents (desktop), Search Hooks with copy + Google search. |
| **Keywords directory** | Searchable, topic-filterable list of every Search Hook with copy, Google shortcut and links to its playbooks. |
| **PWA** | Installable (`display: standalone`), 100% offline, "New knowledge update available — Reload" toast, iOS "Share → Add to Home Screen" guide. |

Stack: Angular 22 (standalone components, signals, `HttpClient`, Router, `@angular/service-worker`),
Tailwind CSS 4 + Typography, `marked`, `highlight.js`, `mermaid` (lazy-loaded).

## Daily usage

### 1. Distill notes with Claude Code

Open Claude Code in this repository and run:

```text
/distill Outbox: ghi event vào bảng outbox cùng transaction với order, Debezium đọc binlog đẩy lên Kafka, consumer phải idempotent vì at-least-once...
```

Claude reads `CLAUDE.md`, inspects `topics.json`, `keywords.json` and `playbooks.json`, decides
`CREATE_NEW` vs `UPDATE_EXISTING`, writes the 6-part Markdown, syncs the three JSON indexes (with
today's `updatedAt`), and prints a review summary:

- **Action** + file path
- **Topic & Playbook Title**
- **Extracted Search Hooks** (English term + Vietnamese meaning)
- **Technical Verification Note** — claims from your notes that look ambiguous or inaccurate

### 2. Review the Git diff

```bash
git diff
```

Check the Technical Verification Note items against the diff, edit anything you disagree with,
then commit:

```bash
git add src/assets/knowledge && git commit -m "knowledge: outbox pattern — CDC relay details"
```

### 3. Push → auto-deploy

```bash
git push
```

Your host rebuilds the static site. Installed apps detect the new version and show
**"New knowledge update available — Reload"**.

## Run locally

Requires Node.js 22+.

```bash
npm install
```

```bash
npm start
```

Open http://localhost:4200. The service worker is disabled in dev mode; to test install/offline
behaviour, build and serve the production bundle:

```bash
npm run build
```

```bash
npx http-server dist/playbook/browser -p 8080 -P "http://localhost:8080/?"
```

Then open http://localhost:8080, wait for the page to load once, switch DevTools → Network →
Offline and reload.

## Knowledge layout

```
src/assets/knowledge/
├── topics.json                       # [{ id, name, description }]
├── keywords.json                     # [{ id, term, meaning, definition, topicId }]
├── playbooks.json                    # [{ id, title, summary, topicId, keywordIds, filePath, updatedAt }]
└── playbooks/<topic-id>/<playbook-id>.md
```

Seed examples: Transactional Outbox Pattern, Circuit Breaker Pattern, Redis Cache Stampede.
You can also edit these files by hand — follow the rules in [`CLAUDE.md`](CLAUDE.md).

## Deploy for free

`npm run build` writes the static site to **`dist/playbook/browser`** (it includes `src/assets`
and `public`, e.g. `_redirects`, the manifest and icons).

### Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → select this repo.
2. Framework preset: *None*. Build command: `npm run build`. Output directory:
   `dist/playbook/browser`. Environment variable `NODE_VERSION=22`.
3. Deploy. `public/_redirects` (`/* /index.html 200`) handles SPA deep links.

### Vercel

1. vercel.com → Add New Project → import this repo.
2. Nothing to configure: `vercel.json` sets `buildCommand`, `outputDirectory` and the SPA rewrite
   (`/(.*)` → `/index.html`), plus `no-cache` headers for the service-worker files.

### GitHub Pages

1. Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Push to `main`, or run the *Deploy to GitHub Pages* workflow manually (Actions tab).
3. `.github/workflows/deploy.yml` builds with `--base-href /<repo-name>/`, copies `index.html` to
   `404.html` for deep links, and publishes. The site appears at
   `https://<user>.github.io/<repo-name>/`. For a custom domain, change the base href to `/`.

## Install the app

- **Desktop (Chrome/Edge) & Android**: click **Install App** in the sidebar/menu (or the install
  icon in the address bar).
- **iOS / iPadOS (Safari)**: tap **Install App** for the guide: *Share → Add to Home Screen*.

After the first load the whole library (all JSON + Markdown) is cached for offline use.

## Project structure

```
.claude/commands/distill.md   # /distill slash command
CLAUDE.md                     # permanent rules for Claude Code
ngsw-config.json              # service worker: prefetch app + /assets/knowledge/**
public/                       # manifest, icons, _redirects
src/app/core/                 # knowledge, search, markdown, theme, PWA services
src/app/pages/                # playbook list, reader, keywords directory
src/app/shared/               # icons, keyword card, search palette, PWA prompts
src/assets/knowledge/         # ← the knowledge base
vercel.json, .github/workflows/deploy.yml
```
