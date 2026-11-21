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
| **Roadmap (learning tree)** | Mỗi playbook khai báo `prerequisites`; app tự tính **cấp độ** (bài không phụ thuộc nhau cùng cấp) và vẽ cây từ nền tảng đến chuyên sâu. Rê chuột để thấy chuỗi tiên quyết và các bài được mở khoá, gợi ý "tiếp theo nên học", đánh dấu **đã đọc**. |
| **Luyện tập mỗi ngày** | **Daily Drill** (câu hỏi lặp lại ngắt quãng từ các bài đã đọc), **Design Challenge** (đề thiết kế/debug thực tế, tự chấm theo rubric), **Review điều phối AI** (tìm lỗi tinh vi trong code "do AI sinh"), **Explain-back** (giải thích bằng lời của mình rồi so đáp án mẫu), streak. Tiến độ lưu trên thiết bị. |
| **Flashcards** | Ôn Search Hooks bằng thẻ lật 3D: term tiếng Anh ở mặt trước, nghĩa + definition ở mặt sau. Lọc theo topic hoặc playbook, shuffle, "chỉ thẻ chưa nhớ", phím `←` `Space` `→`, vuốt trên mobile. Tiến độ "đã nhớ" lưu trên thiết bị (localStorage). |
| **Keywords directory** | Searchable, topic-filterable list of every Search Hook with copy, Google shortcut and links to its playbooks. |
| **PWA** | Installable (`display: standalone`), 100% offline, "New knowledge update available — Reload" toast, iOS "Share → Add to Home Screen" guide. |

Design: **Aurora Glass** — deep-space background with animated aurora, glassmorphism cards, a colour + icon
identity per topic, self-hosted Inter / Space Grotesk / JetBrains Mono (work offline), light & dark.

Stack: Angular 22 (standalone components, signals, `HttpClient`, Router, `@angular/service-worker`),
Tailwind CSS 4 + Typography, `marked`, `highlight.js`, `mermaid` (lazy-loaded).

## Thói quen 15 phút mỗi ngày

1. Mở **Roadmap** → đọc 1 bài ở mục "Tiếp theo nên học" (5–7 phút), đánh dấu *đã đọc*.
2. Viết **Explain-back** cuối bài (3–5 câu bằng lời của mình).
3. Làm **Daily Drill** (5–7 câu) — câu sai sẽ quay lại sớm, câu đúng giãn dần 1 → 2 → 4 → 8 → 16 ngày.
4. 2–3 lần mỗi tuần: một **Design Challenge** và một lượt **Review điều phối AI**.

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

Kiểm tra tính nhất quán của tri thức (cũng tự chạy trước `npm run build`):

```bash
npm run validate
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
├── topics.json                       # [{ id, name, description }]  (thứ tự = thứ tự gợi ý)
├── keywords.json                     # [{ id, term, meaning, definition, topicId }]
├── playbooks.json                    # [{ ..., keywordIds, filePath, updatedAt, prerequisites }]
├── questions.json                    # ngân hàng câu hỏi: mcq | bug | explain
├── challenges.json                   # đề thiết kế/debug + rubric + lời giải
└── playbooks/<topic-id>/<playbook-id>.md
```

Seed examples: Transactional Outbox Pattern, Circuit Breaker Pattern, Redis Cache Stampede.
You can also edit these files by hand — follow the rules in [`CLAUDE.md`](CLAUDE.md).

## Deploy for free

`npm run build` writes the static site to **`dist/playbook/browser`** (it includes `src/assets`
and `public`, e.g. the manifest and icons).

### Cloudflare Workers (static assets)

Use this if you created the project under **Workers & Pages → Create → Worker → Import a repository**.

1. Worker → Settings → Build: Build command `npm run build`, Deploy command `npx wrangler deploy`,
   root directory `/`.
2. `wrangler.jsonc` serves `dist/playbook/browser` as static assets with
   `not_found_handling: "single-page-application"` (deep links work).
   Do not add a `_redirects` file: Workers rejects `/* /index.html 200` as an infinite loop.
3. Every push to `main` rebuilds and deploys to `https://personal-tech-playbook.<subdomain>.workers.dev`.

### Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → select this repo.
2. Framework preset: *None*. Build command: `npm run build`. Output directory:
   `dist/playbook/browser`. Environment variable `NODE_VERSION=22`.
3. Deploy. With no top-level `404.html`, Pages serves `index.html` for unknown paths, so SPA
   deep links work without a `_redirects` file.

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
public/                       # manifest, icons
src/app/core/                 # knowledge, search, markdown, theme, PWA services
src/app/pages/                # playbook list, reader, keywords directory
src/app/shared/               # icons, keyword card, search palette, PWA prompts
src/assets/knowledge/         # ← the knowledge base
wrangler.jsonc, vercel.json, .github/workflows/deploy.yml
```
