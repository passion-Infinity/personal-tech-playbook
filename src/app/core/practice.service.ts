import { Injectable, inject } from '@angular/core';
import { KnowledgeService } from './knowledge.service';
import { LearningStore, today } from './learning.store';
import { Challenge, Playbook, Question } from './models';

export interface DrillFilter {
  playbookId?: string;
  topicId?: string;
  type?: Question['type'];
  /** Daily mode: only questions from playbooks you have read (falls back to the first levels). */
  daily?: boolean;
  size?: number;
}

/** Deterministic PRNG so "today's" selection is stable across reloads. */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(list: T[], rnd: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly kb = inject(KnowledgeService);
  private readonly store = inject(LearningStore);

  /** A playbook is "ready" when every prerequisite has been read. */
  isReady(p: Playbook): boolean {
    const pre = this.kb.prereqs().get(p.id) ?? [];
    return pre.every((id) => this.store.isRead(id));
  }

  /** Unread playbooks whose prerequisites are done, lowest level first. */
  nextUp(limit = 4): Playbook[] {
    const levels = this.kb.levels();
    // Core engineering tracks come first (topics.json order), then cloud/AI.
    const topicOrder = new Map(this.kb.topics().map((t, i) => [t.id, i]));
    return this.kb
      .playbooks()
      .filter((p) => !this.store.isRead(p.id) && this.isReady(p))
      .sort(
        (a, b) =>
          (levels.get(a.id) ?? 0) - (levels.get(b.id) ?? 0) ||
          (topicOrder.get(a.topicId) ?? 99) - (topicOrder.get(b.topicId) ?? 99) ||
          a.title.localeCompare(b.title),
      )
      .slice(0, limit);
  }

  /** Questions that are due for review today. */
  dueCount(): number {
    const cards = this.store.cards();
    const t = today();
    const read = this.store.read();
    return this.kb
      .questions()
      .filter((q) => read.has(q.playbookId) && cards[q.id] && cards[q.id].due <= t).length;
  }

  /** How many fresh (never answered) questions are available from read playbooks. */
  freshCount(): number {
    const cards = this.store.cards();
    const read = this.store.read();
    return this.kb.questions().filter((q) => read.has(q.playbookId) && !cards[q.id]).length;
  }

  build(filter: DrillFilter = {}): Question[] {
    const { size = 7 } = filter;
    const rnd = seeded(today() + (filter.playbookId ?? filter.topicId ?? filter.type ?? 'daily'));
    const cards = this.store.cards();
    const levels = this.kb.levels();
    const byPb = this.kb.playbookById();
    const t = today();

    let pool = this.kb.questions().filter((q) => byPb.has(q.playbookId));
    if (filter.playbookId) pool = pool.filter((q) => q.playbookId === filter.playbookId);
    if (filter.topicId)
      pool = pool.filter((q) => byPb.get(q.playbookId)?.topicId === filter.topicId);
    if (filter.type) pool = pool.filter((q) => q.type === filter.type);
    if (filter.daily) {
      const read = this.store.read();
      const mine = pool.filter((q) => read.has(q.playbookId));
      // New learner: start from the roots of the tree so the first drill is not empty.
      pool = mine.length >= 4 ? mine : pool.filter((q) => (levels.get(q.playbookId) ?? 0) <= 1);
    }

    const due = pool
      .filter((q) => cards[q.id] && cards[q.id].due <= t)
      .sort((a, b) => cards[a.id].due.localeCompare(cards[b.id].due));
    const fresh = shuffled(
      pool.filter((q) => !cards[q.id]),
      rnd,
    ).sort(
      (a, b) =>
        (levels.get(a.playbookId) ?? 0) - (levels.get(b.playbookId) ?? 0) ||
        a.difficulty - b.difficulty,
    );
    const later = pool
      .filter((q) => cards[q.id] && cards[q.id].due > t)
      .sort((a, b) => cards[a.id].due.localeCompare(cards[b.id].due));

    const picked: Question[] = [];
    const caps: Record<Question['type'], number> = {
      mcq: size,
      bug: filter.type === 'bug' ? size : 2,
      explain: filter.type === 'explain' ? size : 1,
    };
    const counts: Record<Question['type'], number> = { mcq: 0, bug: 0, explain: 0 };
    for (const q of [...due, ...fresh, ...later]) {
      if (picked.length >= size) break;
      if (counts[q.type] >= caps[q.type]) continue;
      counts[q.type]++;
      picked.push(q);
    }
    // Writing answers is slowest: keep explain questions for the end of the session.
    return [
      ...picked.filter((q) => q.type !== 'explain'),
      ...picked.filter((q) => q.type === 'explain'),
    ];
  }

  /** One design challenge per day: prefer ones you are ready for and have not finished. */
  dailyChallenge(): Challenge | undefined {
    const all = this.kb.challenges();
    if (!all.length) return undefined;
    const done = this.store.challenges();
    const read = this.store.read();
    const levels = this.kb.levels();
    const rank = (c: Challenge) => {
      const ready = c.prerequisites.every((id) => read.has(id));
      const lvl = Math.max(0, ...c.prerequisites.map((id) => levels.get(id) ?? 0));
      return (done[c.id]?.doneOn ? 100 : 0) + (ready ? 0 : 10) + lvl;
    };
    const sorted = [...all].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
    const best = rank(sorted[0]);
    const top = sorted.filter((c) => rank(c) === best);
    return top[Math.floor(seeded(today())() * top.length)];
  }
}
