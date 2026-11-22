#!/usr/bin/env node
// Validates the Playbook-as-Code knowledge base. Exit code 1 on errors (runs before `npm run build`).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const KB = join(ROOT, 'src/assets/knowledge');
const errors = [];
const warnings = [];
const shortPlaybooks = [];
const noDiagram = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function load(name, optional = false) {
  const p = join(KB, name);
  if (!existsSync(p)) {
    if (!optional) err(`${name}: file not found`);
    return [];
  }
  try {
    const v = JSON.parse(readFileSync(p, 'utf8'));
    if (!Array.isArray(v)) err(`${name}: must be a JSON array`);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    err(`${name}: invalid JSON (${e.message})`);
    return [];
  }
}
const dups = (list, label, name) => {
  const seen = new Set();
  for (const id of list) (seen.has(id) ? err(`${name}: duplicate ${label} "${id}"`) : seen.add(id));
};

const topics = load('topics.json');
const keywords = load('keywords.json');
const playbooks = load('playbooks.json');
const questions = load('questions.json', true);
const challenges = load('challenges.json', true);

const topicIds = new Set(topics.map((t) => t.id));
const keywordIds = new Set(keywords.map((k) => k.id));
const playbookIds = new Set(playbooks.map((p) => p.id));
dups(topics.map((t) => t.id), 'topic id', 'topics.json');
dups(keywords.map((k) => k.id), 'keyword id', 'keywords.json');
dups(keywords.map((k) => k.term.toLowerCase()), 'keyword term', 'keywords.json');
dups(playbooks.map((p) => p.id), 'playbook id', 'playbooks.json');

const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const t of topics) {
  if (!kebab.test(t.id)) err(`topics.json: id "${t.id}" must be kebab-case`);
  if (!t.name || !t.description) err(`topics.json: "${t.id}" needs name and description`);
}
for (const k of keywords) {
  if (!kebab.test(k.id)) err(`keywords.json: id "${k.id}" must be kebab-case`);
  if (!k.term || !k.meaning || !k.definition) err(`keywords.json: "${k.id}" needs term, meaning, definition`);
  if (!topicIds.has(k.topicId)) err(`keywords.json: "${k.id}" has unknown topicId "${k.topicId}"`);
}

// ---- playbooks ----
const HEADINGS = ['## 1. Core Concept', '## 2. How It Works', '## 3. Visual Diagram', '## 4. Rules of Thumb & Trade-offs', '## 5. Must Remember / Production Pitfalls', '## 6. Search Hooks'];
const used = new Set();
const listed = new Set();
for (const p of playbooks) {
  const where = `playbooks.json: "${p.id}"`;
  if (!kebab.test(p.id)) err(`${where} id must be kebab-case`);
  if (!topicIds.has(p.topicId)) err(`${where} unknown topicId "${p.topicId}"`);
  if (!p.title || !p.summary) err(`${where} needs title and summary`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.updatedAt ?? '')) err(`${where} updatedAt must be YYYY-MM-DD`);
  if (!Array.isArray(p.keywordIds) || p.keywordIds.length < 3 || p.keywordIds.length > 6) err(`${where} needs 3-6 keywordIds`);
  for (const id of p.keywordIds ?? []) {
    used.add(id);
    if (!keywordIds.has(id)) err(`${where} unknown keywordId "${id}"`);
  }
  for (const id of p.prerequisites ?? []) {
    if (id === p.id) err(`${where} lists itself as a prerequisite`);
    else if (!playbookIds.has(id)) err(`${where} unknown prerequisite "${id}"`);
  }
  const expected = `assets/knowledge/playbooks/${p.topicId}/${p.id}.md`;
  if (p.filePath !== expected) err(`${where} filePath should be "${expected}"`);
  listed.add(p.filePath);
  const file = join(ROOT, 'src', p.filePath ?? '');
  if (!existsSync(file)) { err(`${where} missing file ${p.filePath}`); continue; }
  const md = readFileSync(file, 'utf8');
  const outsideCode = md.replace(/```[\s\S]*?```/g, '');
  const h2 = outsideCode.split('\n').filter((l) => l.startsWith('## '));
  if (JSON.stringify(h2) !== JSON.stringify(HEADINGS)) err(`${p.filePath}: must have exactly the six standard "##" headings in order (found: ${h2.length})`);
  if (/^# /m.test(outsideCode)) err(`${p.filePath}: must not contain an H1 title`);
  const prose = md.replace(/```[\s\S]*?```/g, ' ').split('\n').filter((l) => !l.startsWith('|')).join(' ');
  const words = prose.split(/\s+/).filter(Boolean).length;
  const total = md.replace(/```mermaid[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  if (words < 300 || total > 1300) warn(`${p.filePath}: ${words} prose / ${total} total words (target 800-1100 total)`);
  else if (total < 800) shortPlaybooks.push(p.id);
  if (!/```mermaid\n/.test(md)) noDiagram.push(p.id);
  for (const m of md.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    const lines = m[1].trimEnd().split('\n').length;
    if (lines > 10) warn(`${p.filePath}: mermaid diagram has ${lines} lines (max 10)`);
    if (m[1].includes(';')) warn(`${p.filePath}: mermaid contains ";" (it ends a statement)`);
  }
}

if (noDiagram.length) warn(`${noDiagram.length} playbooks have no Mermaid diagram yet (required): ${noDiagram.join(', ')}`);
if (shortPlaybooks.length) warn(`${shortPlaybooks.length} playbooks are under 800 total words (excluding diagrams) and still need the deep-dive rewrite`);

// every .md must be listed
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
for (const f of walk(join(KB, 'playbooks'))) {
  const rel = 'assets/knowledge/playbooks/' + f.slice(join(KB, 'playbooks').length + 1);
  if (rel.endsWith('.md') && !listed.has(rel)) err(`${rel}: not listed in playbooks.json`);
}
for (const k of keywords) if (!used.has(k.id)) warn(`keywords.json: "${k.id}" is not used by any playbook`);

// prerequisite graph must be acyclic
const pre = new Map(playbooks.map((p) => [p.id, (p.prerequisites ?? []).filter((i) => playbookIds.has(i) && i !== p.id)]));
const state = new Map();
const visit = (id, path) => {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) { err(`prerequisites form a cycle: ${[...path.slice(path.indexOf(id)), id].join(' -> ')}`); return; }
  state.set(id, 1);
  for (const d of pre.get(id) ?? []) visit(d, [...path, id]);
  state.set(id, 2);
};
for (const id of pre.keys()) visit(id, []);

// ---- questions ----
dups(questions.map((q) => q.id), 'question id', 'questions.json');
const perPlaybook = new Map();
for (const q of questions) {
  const where = `questions.json: "${q.id}"`;
  if (!playbookIds.has(q.playbookId)) err(`${where} unknown playbookId "${q.playbookId}"`);
  perPlaybook.set(q.playbookId, (perPlaybook.get(q.playbookId) ?? 0) + 1);
  if (!['mcq', 'bug', 'explain'].includes(q.type)) err(`${where} invalid type "${q.type}"`);
  if (![1, 2, 3].includes(q.difficulty)) err(`${where} difficulty must be 1, 2 or 3`);
  if (!q.question) err(`${where} needs question text`);
  if (q.type === 'explain') {
    if (!q.modelAnswer) err(`${where} explain question needs modelAnswer`);
    if (!Array.isArray(q.keyPoints) || !q.keyPoints.length) err(`${where} explain question needs keyPoints`);
  } else {
    if (!Array.isArray(q.options) || q.options.length < 2) err(`${where} needs at least 2 options`);
    if (!Array.isArray(q.answer) || !q.answer.length || q.answer.some((i) => !Number.isInteger(i) || i < 0 || i >= (q.options?.length ?? 0))) err(`${where} answer must be valid option indices`);
    if (!q.explanation) err(`${where} needs explanation`);
    if (q.type === 'bug' && !(q.code?.language && q.code?.text)) err(`${where} bug question needs code {language, text}`);
  }
}
const unpracticed = playbooks.filter((p) => !perPlaybook.get(p.id)).map((p) => p.id);
if (questions.length && unpracticed.length) warn(`${unpracticed.length} playbooks have no practice questions yet: ${unpracticed.join(', ')}`);

// ---- challenges ----
dups(challenges.map((c) => c.id), 'challenge id', 'challenges.json');
for (const c of challenges) {
  const where = `challenges.json: "${c.id}"`;
  if (!topicIds.has(c.topicId)) err(`${where} unknown topicId "${c.topicId}"`);
  for (const id of c.prerequisites ?? []) if (!playbookIds.has(id)) err(`${where} unknown prerequisite "${id}"`);
  if (!c.scenario || !c.solution) err(`${where} needs scenario and solution`);
  if (!Array.isArray(c.rubric) || !c.rubric.length || c.rubric.some((r) => !r.item || !(r.points > 0))) err(`${where} needs a rubric with positive points`);
  for (const f of ['requirements', 'hints', 'pitfalls']) if (!Array.isArray(c[f]) || !c[f].length) err(`${where} needs ${f}`);
}


// ---- English overlay (src/assets/knowledge/en) ----
// Vietnamese files are the source of truth; each en/*.json holds translated fields keyed by the same ids.
const EN = (name) => load(`en/${name}.json`, true);
const enTopics = EN('topics');
const enKeywords = EN('keywords');
const enPlaybooks = EN('playbooks');
const enQuestions = EN('questions');
const enChallenges = EN('challenges');
const enExams = EN('exams');
const exams = load('exams.json', true);
const checkOverlay = (list, ids, file) => {
  const seen = new Set();
  for (const o of list) {
    if (!ids.has(o.id)) err(`en/${file}: unknown id "${o.id}"`);
    if (seen.has(o.id)) err(`en/${file}: duplicate id "${o.id}"`);
    seen.add(o.id);
  }
};
checkOverlay(enTopics, topicIds, 'topics.json');
checkOverlay(enKeywords, keywordIds, 'keywords.json');
checkOverlay(enPlaybooks, playbookIds, 'playbooks.json');
checkOverlay(enQuestions, new Set(questions.map((q) => q.id)), 'questions.json');
checkOverlay(enChallenges, new Set(challenges.map((c) => c.id)), 'challenges.json');
checkOverlay(enExams, new Set(exams.map((e) => e.id)), 'exams.json');
for (const o of enPlaybooks) {
  const p = playbooks.find((x) => x.id === o.id);
  if (!p) continue;
  if (!o.title || !o.summary) err(`en/playbooks.json: "${o.id}" needs title and summary`);
  const rel = `assets/knowledge/en/playbooks/${p.topicId}/${p.id}.md`;
  const file = join(ROOT, 'src', rel);
  if (!existsSync(file)) { err(`en/playbooks.json: "${o.id}" missing file ${rel}`); continue; }
  const md = readFileSync(file, 'utf8');
  const h2 = md.replace(/```[\s\S]*?```/g, '').split('\n').filter((l) => l.startsWith('## '));
  if (JSON.stringify(h2) !== JSON.stringify(HEADINGS)) err(`${rel}: must have exactly the six standard "##" headings in order`);
  if (!/```mermaid\n/.test(md)) warn(`${rel}: no Mermaid diagram`);
  const total = md.replace(/```mermaid[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  if (total < 350) warn(`${rel}: only ${total} words`);
  const hooks = (md.split('## 6. Search Hooks')[1] ?? '').split('\n').filter((l) => l.startsWith('- ')).length;
  const viMd = readFileSync(join(ROOT, 'src', p.filePath), 'utf8');
  const viHooks = (viMd.split('## 6. Search Hooks')[1] ?? '').split('\n').filter((l) => l.startsWith('- ')).length;
  if (hooks !== viHooks) warn(`${rel}: ${hooks} Search Hooks vs ${viHooks} in the Vietnamese file`);
}
for (const o of enQuestions) {
  const q = questions.find((x) => x.id === o.id);
  if (!q) continue;
  if (q.options && o.options && o.options.length !== q.options.length) err(`en/questions.json: "${o.id}" has ${o.options.length} options, Vietnamese has ${q.options.length} (answer indices must stay valid)`);
  if (q.type !== 'explain' && !o.options) err(`en/questions.json: "${o.id}" must translate options`);
  if (q.type === 'explain' && (!o.modelAnswer || !Array.isArray(o.keyPoints) || o.keyPoints.length !== q.keyPoints.length)) err(`en/questions.json: "${o.id}" needs modelAnswer and the same number of keyPoints`);
}
for (const o of enChallenges) {
  const c = challenges.find((x) => x.id === o.id);
  if (c && o.rubric && o.rubric.length !== c.rubric.length) err(`en/challenges.json: "${o.id}" rubric must have ${c.rubric.length} items`);
}
const cover = (n, total) => `${n}/${total}`;
const untranslatedPlaybooks = playbooks.length - enPlaybooks.length;
console.log(`English coverage: playbooks ${cover(enPlaybooks.length, playbooks.length)}, keywords ${cover(enKeywords.length, keywords.length)}, questions ${cover(enQuestions.length, questions.length)}, challenges ${cover(enChallenges.length, challenges.length)}, topics ${cover(enTopics.length, topics.length)}, exams ${cover(enExams.length, exams.length)}`);
if (process.argv.includes('--strict-en') && (untranslatedPlaybooks || enKeywords.length < keywords.length || enQuestions.length < questions.length)) err('English translation incomplete (--strict-en)');

for (const w of warnings) console.warn('warning:', w);
for (const e of errors) console.error('error:  ', e);
const levels = new Map();
const lvl = (id) => levels.get(id) ?? (levels.set(id, 0), levels.set(id, Math.max(0, ...(pre.get(id) ?? []).map((d) => lvl(d) + 1))), levels.get(id));
const maxLevel = Math.max(0, ...playbooks.map((p) => lvl(p.id)));
console.log(`${errors.length ? 'FAILED' : 'OK'}: ${topics.length} topics, ${playbooks.length} playbooks (${maxLevel + 1} levels), ${keywords.length} keywords, ${questions.length} questions, ${challenges.length} challenges — ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
