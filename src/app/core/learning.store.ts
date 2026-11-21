import { Injectable, computed, signal } from '@angular/core';

const KEY = 'playbook-learning-v1';

/** Leitner boxes: days until the next review after a correct answer from each box. */
export const BOX_DAYS = [1, 2, 4, 8, 16];

export interface CardState {
  box: number; // 1..5
  due: string; // YYYY-MM-DD
  seen: number;
  correct: number;
}
export interface ChallengeState {
  draft: string;
  score?: number;
  max?: number;
  doneOn?: string;
  checked?: number[];
}
export interface ExplainState {
  text: string;
  rating?: 1 | 2 | 3;
  on: string;
}
interface Data {
  read: string[];
  cards: Record<string, CardState>;
  challenges: Record<string, ChallengeState>;
  explains: Record<string, ExplainState>;
  /** YYYY-MM-DD -> number of practice actions that day. */
  activity: Record<string, number>;
}

const EMPTY: Data = { read: [], cards: {}, challenges: {}, explains: {}, activity: {} };

/** Local date as YYYY-MM-DD (not UTC, so "today" matches the learner's clock). */
export function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('sv-SE');
}

/** Everything the learner has done, kept on this device only. */
@Injectable({ providedIn: 'root' })
export class LearningStore {
  private readonly data = signal<Data>(load());

  readonly read = computed(() => new Set(this.data().read));
  readonly cards = computed(() => this.data().cards);
  readonly challenges = computed(() => this.data().challenges);
  readonly explains = computed(() => this.data().explains);
  readonly activity = computed(() => this.data().activity);

  readonly todayCount = computed(() => this.data().activity[today()] ?? 0);

  /** Consecutive practice days ending today (or yesterday, so the streak survives until tonight). */
  readonly streak = computed(() => {
    const a = this.data().activity;
    let offset = a[today()] ? 0 : -1;
    let n = 0;
    while (a[today(offset)]) {
      n++;
      offset--;
    }
    return n;
  });

  /** Last 14 days, oldest first, for the activity strip. */
  readonly recentDays = computed(() => {
    const a = this.data().activity;
    return Array.from({ length: 14 }, (_, i) => {
      const date = today(i - 13);
      return { date, count: a[date] ?? 0 };
    });
  });

  isRead(id: string): boolean {
    return this.read().has(id);
  }

  setRead(id: string, value: boolean): void {
    this.update((d) => {
      const set = new Set(d.read);
      if (value) set.add(id);
      else set.delete(id);
      return { ...d, read: [...set] };
    });
  }

  /** Record an answer and schedule the next review (Leitner). */
  answer(questionId: string, correct: boolean): void {
    this.update((d) => {
      const prev = d.cards[questionId] ?? { box: 1, due: today(), seen: 0, correct: 0 };
      const box = correct ? Math.min(5, prev.box + 1) : 1;
      const due = correct ? today(BOX_DAYS[box - 1]) : today();
      return {
        ...d,
        cards: {
          ...d.cards,
          [questionId]: {
            box,
            due,
            seen: prev.seen + 1,
            correct: prev.correct + (correct ? 1 : 0),
          },
        },
        activity: bump(d.activity),
      };
    });
  }

  saveDraft(challengeId: string, draft: string): void {
    this.update((d) => ({
      ...d,
      challenges: { ...d.challenges, [challengeId]: { ...d.challenges[challengeId], draft } },
    }));
  }

  finishChallenge(challengeId: string, score: number, max: number, checked: number[]): void {
    this.update((d) => ({
      ...d,
      challenges: {
        ...d.challenges,
        [challengeId]: {
          ...(d.challenges[challengeId] ?? { draft: '' }),
          score,
          max,
          checked,
          doneOn: today(),
        },
      },
      activity: bump(d.activity),
    }));
  }

  saveExplain(questionId: string, text: string, rating?: 1 | 2 | 3): void {
    this.update((d) => ({
      ...d,
      explains: { ...d.explains, [questionId]: { text, rating, on: today() } },
    }));
  }

  reset(): void {
    this.data.set({ ...EMPTY });
    save(this.data());
  }

  private update(fn: (d: Data) => Data): void {
    const next = fn(this.data());
    this.data.set(next);
    save(next);
  }
}

function bump(activity: Record<string, number>): Record<string, number> {
  const t = today();
  return { ...activity, [t]: (activity[t] ?? 0) + 1 };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<Data>;
    return {
      read: Array.isArray(p.read) ? p.read.filter((x): x is string => typeof x === 'string') : [],
      cards: p.cards && typeof p.cards === 'object' ? p.cards : {},
      challenges: p.challenges && typeof p.challenges === 'object' ? p.challenges : {},
      explains: p.explains && typeof p.explains === 'object' ? p.explains : {},
      activity: p.activity && typeof p.activity === 'object' ? p.activity : {},
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(d: Data): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: progress lasts for this session only */
  }
}
