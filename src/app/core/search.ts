import { Keyword, Playbook, Topic } from './models';

/** Lowercase + strip Vietnamese diacritics so "nhat quan" matches "nhất quán". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export type SearchResult =
  | { kind: 'playbook'; item: Playbook; score: number }
  | { kind: 'keyword'; item: Keyword; score: number };

function scoreField(field: string, tokens: string[], weight: number): number {
  const f = normalize(field);
  let score = 0;
  for (const t of tokens) {
    const i = f.indexOf(t);
    if (i === -1) continue;
    score += weight * (i === 0 ? 2 : /\W/.test(f[i - 1] ?? ' ') ? 1.5 : 1);
  }
  return score;
}

function allTokensMatch(haystack: string, tokens: string[]): boolean {
  const h = normalize(haystack);
  return tokens.every((t) => h.includes(t));
}

export function tokenize(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/**
 * Client-side search across playbook titles/summaries, keyword terms (EN),
 * Vietnamese meanings, definitions and topic names. Every token must match somewhere.
 */
export function search(
  query: string,
  playbooks: Playbook[],
  keywords: Keyword[],
  topics: Map<string, Topic>,
  keywordById: Map<string, Keyword>,
): SearchResult[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const results: SearchResult[] = [];

  for (const p of playbooks) {
    const topic = topics.get(p.topicId)?.name ?? '';
    const hooks = p.keywordIds.map((id) => keywordById.get(id)?.term ?? '').join(' ');
    if (!allTokensMatch(`${p.title} ${p.summary} ${topic} ${hooks}`, tokens)) continue;
    const score =
      scoreField(p.title, tokens, 10) +
      scoreField(p.summary, tokens, 4) +
      scoreField(hooks, tokens, 3) +
      scoreField(topic, tokens, 2);
    results.push({ kind: 'playbook', item: p, score: score + 1 });
  }

  for (const k of keywords) {
    const topic = topics.get(k.topicId)?.name ?? '';
    if (!allTokensMatch(`${k.term} ${k.meaning} ${k.definition} ${topic}`, tokens)) continue;
    const score =
      scoreField(k.term, tokens, 8) +
      scoreField(k.meaning, tokens, 4) +
      scoreField(k.definition, tokens, 2) +
      scoreField(topic, tokens, 1);
    results.push({ kind: 'keyword', item: k, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function filterKeywords(
  query: string,
  keywords: Keyword[],
  topics: Map<string, Topic>,
): Keyword[] {
  const tokens = tokenize(query);
  if (!tokens.length) return keywords;
  return keywords.filter((k) =>
    allTokensMatch(
      `${k.term} ${k.meaning} ${k.definition} ${topics.get(k.topicId)?.name ?? ''}`,
      tokens,
    ),
  );
}

export function googleUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(term)}`;
}
