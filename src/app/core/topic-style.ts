export interface TopicStyle {
  from: string;
  to: string;
  icon: string;
}

/** Hand-picked identities for known topics; new topics get a stable palette from their id. */
const KNOWN: Record<string, TopicStyle> = {
  'system-design': { from: '#8b5cf6', to: '#6366f1', icon: 'layers' },
  caching: { from: '#f59e0b', to: '#ec4899', icon: 'bolt' },
  aws: { from: '#fb923c', to: '#22d3ee', icon: 'cloud' },
  azure: { from: '#0ea5e9', to: '#2563eb', icon: 'globe' },
  'ai-ml': { from: '#ec4899', to: '#8b5cf6', icon: 'brain' },
  'ai-engineering': { from: '#a78bfa', to: '#f472b6', icon: 'sparkles' },
};

const PALETTE: Array<[string, string]> = [
  ['#22d3ee', '#3b82f6'],
  ['#34d399', '#06b6d4'],
  ['#f472b6', '#8b5cf6'],
  ['#facc15', '#f97316'],
  ['#60a5fa', '#a78bfa'],
  ['#f87171', '#fb923c'],
];
const ICONS = ['sparkles', 'layers', 'bolt', 'cloud', 'book', 'hash'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function topicStyle(topicId: string | null | undefined): TopicStyle {
  if (!topicId) return { from: '#8b5cf6', to: '#22d3ee', icon: 'sparkles' };
  const known = KNOWN[topicId];
  if (known) return known;
  const h = hash(topicId);
  const [from, to] = PALETTE[h % PALETTE.length];
  return { from, to, icon: ICONS[h % ICONS.length] };
}

/** CSS custom properties consumed by .topic-gradient / .topic-tile / .badge / .progress-fill. */
export function topicVars(topicId: string | null | undefined): Record<string, string> {
  const s = topicStyle(topicId);
  return { '--t-from': s.from, '--t-to': s.to };
}
