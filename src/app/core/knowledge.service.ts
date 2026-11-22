import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';
import { I18n } from './i18n.service';
import { Challenge, Exam, Keyword, Playbook, Question, Topic } from './models';

const BASE = 'assets/knowledge';

export const LEVEL_NAMES: Record<'vi' | 'en', string[]> = {
  vi: ['Nền tảng', 'Cơ bản', 'Trung cấp', 'Nâng cao', 'Chuyên sâu'],
  en: ['Foundations', 'Basics', 'Intermediate', 'Advanced', 'Expert'],
};
export const levelName = (level: number, lang: 'vi' | 'en' = 'vi'): string => {
  const names = LEVEL_NAMES[lang];
  return names[Math.min(level, names.length - 1)];
};

/** English overlay: translated text keyed by the id of the Vietnamese source item. */
type Overlay<T> = Partial<T> & { id: string };
const byId = <T extends { id: string }>(list: T[], overlay: Overlay<T>[]): T[] => {
  if (!overlay.length) return list;
  const map = new Map(overlay.map((o) => [o.id, o]));
  return list.map((item) => {
    const o = map.get(item.id);
    return o ? ({ ...item, ...o } as T) : item;
  });
};

/** Loads the static, version-controlled knowledge index once and exposes it as signals. */
@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18n);
  private readonly markdownCache = new Map<string, Observable<string>>();

  // Vietnamese source of truth + optional English overlay (src/assets/knowledge/en/*.json).
  private readonly viTopics = signal<Topic[]>([]);
  private readonly viKeywords = signal<Keyword[]>([]);
  private readonly viPlaybooks = signal<Playbook[]>([]);
  private readonly viQuestions = signal<Question[]>([]);
  private readonly viChallenges = signal<Challenge[]>([]);
  private readonly viExams = signal<Exam[]>([]);
  private readonly enTopics = signal<Overlay<Topic>[]>([]);
  private readonly enKeywords = signal<Overlay<Keyword>[]>([]);
  private readonly enPlaybooks = signal<Overlay<Playbook>[]>([]);
  private readonly enQuestions = signal<Overlay<Question>[]>([]);
  private readonly enChallenges = signal<Overlay<Challenge>[]>([]);
  private readonly enExams = signal<Overlay<Exam>[]>([]);
  private enRequested = false;
  readonly enLoaded = signal(false);

  readonly topics = computed(() =>
    this.i18n.isEn() ? byId(this.viTopics(), this.enTopics()) : this.viTopics(),
  );
  readonly keywords = computed(() =>
    this.i18n.isEn() ? byId(this.viKeywords(), this.enKeywords()) : this.viKeywords(),
  );
  readonly playbooks = computed(() =>
    this.i18n.isEn() ? byId(this.viPlaybooks(), this.enPlaybooks()) : this.viPlaybooks(),
  );
  readonly questions = computed(() =>
    this.i18n.isEn() ? mergeQuestions(this.viQuestions(), this.enQuestions()) : this.viQuestions(),
  );
  readonly challenges = computed(() =>
    this.i18n.isEn()
      ? mergeChallenges(this.viChallenges(), this.enChallenges())
      : this.viChallenges(),
  );
  readonly exams = computed(() =>
    this.i18n.isEn() ? byId(this.viExams(), this.enExams()) : this.viExams(),
  );
  /** Ids of playbooks that have an English markdown file. */
  readonly translatedPlaybooks = computed(() => new Set(this.enPlaybooks().map((p) => p.id)));
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly topicById = computed(() => new Map(this.topics().map((t) => [t.id, t])));
  readonly keywordById = computed(() => new Map(this.keywords().map((k) => [k.id, k])));
  readonly playbookById = computed(() => new Map(this.playbooks().map((p) => [p.id, p])));

  /** Playbooks sorted newest first. */
  readonly sortedPlaybooks = computed(() =>
    [...this.playbooks()].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title),
    ),
  );

  readonly sortedKeywords = computed(() =>
    [...this.keywords()].sort((a, b) => a.term.localeCompare(b.term)),
  );

  /** keywordId -> playbooks that reference it. */
  readonly playbooksByKeyword = computed(() => {
    const map = new Map<string, Playbook[]>();
    for (const p of this.playbooks()) {
      for (const k of p.keywordIds) {
        const list = map.get(k) ?? [];
        list.push(p);
        map.set(k, list);
      }
    }
    return map;
  });

  readonly playbookCountByTopic = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.playbooks()) map.set(p.topicId, (map.get(p.topicId) ?? 0) + 1);
    return map;
  });

  readonly keywordCountByTopic = computed(() => {
    const map = new Map<string, number>();
    for (const k of this.keywords()) map.set(k.topicId, (map.get(k.topicId) ?? 0) + 1);
    return map;
  });

  // ---------- Learning tree (prerequisite graph) ----------

  /** playbookId -> prerequisite ids (only ids that exist). */
  readonly prereqs = computed(() => {
    const ids = this.playbookById();
    return new Map(
      this.playbooks().map((p) => [
        p.id,
        (p.prerequisites ?? []).filter((id) => ids.has(id) && id !== p.id),
      ]),
    );
  });

  /** playbookId -> playbooks that list it as a prerequisite. */
  readonly dependents = computed(() => {
    const map = new Map<string, string[]>();
    for (const [id, pre] of this.prereqs()) {
      for (const dep of pre) map.set(dep, [...(map.get(dep) ?? []), id]);
    }
    return map;
  });

  /**
   * Level = longest prerequisite chain below a playbook (roots are 0), so playbooks that do not
   * depend on each other end up on the same level.
   */
  readonly levels = computed(() => {
    const pre = this.prereqs();
    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    const level = (id: string): number => {
      const cached = memo.get(id);
      if (cached !== undefined) return cached;
      if (visiting.has(id)) return 0; // cycle guard (validate-knowledge rejects cycles)
      visiting.add(id);
      let l = 0;
      for (const p of pre.get(id) ?? []) l = Math.max(l, level(p) + 1);
      visiting.delete(id);
      memo.set(id, l);
      return l;
    };
    for (const p of this.playbooks()) level(p.id);
    return memo;
  });

  /**
   * Level counted only through prerequisites that live in the same topic. It drives each topic's own
   * outline ("Cấp 0, 1, 2…") so a cloud topic is not pushed to level 5 by a foundations prerequisite.
   */
  readonly localLevels = computed(() => {
    const byId = this.playbookById();
    const pre = this.prereqs();
    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    const level = (id: string): number => {
      const cached = memo.get(id);
      if (cached !== undefined) return cached;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const topic = byId.get(id)?.topicId;
      let l = 0;
      for (const p of pre.get(id) ?? [])
        if (byId.get(p)?.topicId === topic) l = Math.max(l, level(p) + 1);
      visiting.delete(id);
      memo.set(id, l);
      return l;
    };
    for (const p of this.playbooks()) level(p.id);
    return memo;
  });

  /** Reading order inside each topic: by local level, then the order authored in playbooks.json. */
  readonly orderedByTopic = computed(() => {
    const authored = new Map(this.playbooks().map((p, i) => [p.id, i]));
    const local = this.localLevels();
    const map = new Map<string, Playbook[]>();
    for (const p of this.playbooks()) map.set(p.topicId, [...(map.get(p.topicId) ?? []), p]);
    for (const [topic, list] of map) {
      map.set(
        topic,
        [...list].sort(
          (a, b) =>
            (local.get(a.id) ?? 0) - (local.get(b.id) ?? 0) ||
            (authored.get(a.id) ?? 0) - (authored.get(b.id) ?? 0),
        ),
      );
    }
    return map;
  });

  readonly maxLevel = computed(() => Math.max(0, ...this.levels().values()));

  /** Every transitive prerequisite of a playbook. */
  ancestors(id: string): Set<string> {
    const pre = this.prereqs();
    const seen = new Set<string>();
    const walk = (x: string) => {
      for (const p of pre.get(x) ?? []) if (!seen.has(p)) (seen.add(p), walk(p));
    };
    walk(id);
    return seen;
  }

  /** Every playbook that (transitively) builds on this one. */
  descendants(id: string): Set<string> {
    const dep = this.dependents();
    const seen = new Set<string>();
    const walk = (x: string) => {
      for (const d of dep.get(x) ?? []) if (!seen.has(d)) (seen.add(d), walk(d));
    };
    walk(id);
    return seen;
  }

  readonly questionsByPlaybook = computed(() => {
    const map = new Map<string, Question[]>();
    for (const q of this.questions()) map.set(q.playbookId, [...(map.get(q.playbookId) ?? []), q]);
    return map;
  });

  constructor() {
    effect(() => {
      if (this.i18n.isEn()) this.loadEnglish();
    });
    // Questions/challenges are optional so older deployments of the index keep working.
    forkJoin({
      topics: this.http.get<Topic[]>(`${BASE}/topics.json`),
      keywords: this.http.get<Keyword[]>(`${BASE}/keywords.json`),
      playbooks: this.http.get<Playbook[]>(`${BASE}/playbooks.json`),
      questions: this.http.get<Question[]>(`${BASE}/questions.json`).pipe(catchError(() => of([]))),
      challenges: this.http
        .get<Challenge[]>(`${BASE}/challenges.json`)
        .pipe(catchError(() => of([]))),
      exams: this.http.get<Exam[]>(`${BASE}/exams.json`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ topics, keywords, playbooks, questions, challenges, exams }) => {
        this.viExams.set(exams);
        this.viTopics.set(topics);
        this.viKeywords.set(keywords);
        this.viPlaybooks.set(playbooks);
        this.viQuestions.set(questions);
        this.viChallenges.set(challenges);
        this.loaded.set(true);
      },
      error: () => {
        this.error.set('Could not load the knowledge index. Check your connection and reload.');
        this.loaded.set(true);
      },
    });
  }

  private loadEnglish(): void {
    if (this.enRequested) return;
    this.enRequested = true;
    const get = <T>(name: string) =>
      this.http.get<T[]>(`${BASE}/en/${name}.json`).pipe(catchError(() => of([] as T[])));
    forkJoin({
      topics: get<Overlay<Topic>>('topics'),
      keywords: get<Overlay<Keyword>>('keywords'),
      playbooks: get<Overlay<Playbook>>('playbooks'),
      questions: get<Overlay<Question>>('questions'),
      challenges: get<Overlay<Challenge>>('challenges'),
      exams: get<Overlay<Exam>>('exams'),
    }).subscribe((r) => {
      this.enTopics.set(r.topics);
      this.enKeywords.set(r.keywords);
      this.enPlaybooks.set(r.playbooks);
      this.enQuestions.set(r.questions);
      this.enChallenges.set(r.challenges);
      this.enExams.set(r.exams);
      this.enLoaded.set(true);
    });
  }

  /** Markdown for the active language; falls back to Vietnamese when no translation exists yet. */
  getPlaybookMarkdown(p: {
    id: string;
    filePath: string;
  }): Observable<{ md: string; fallback: boolean }> {
    if (this.i18n.isEn() && this.translatedPlaybooks().has(p.id)) {
      const en = p.filePath.replace('assets/knowledge/', `${BASE}/en/`);
      return this.getMarkdown(en).pipe(
        map((md) => ({ md, fallback: false })),
        catchError(() => this.getMarkdown(p.filePath).pipe(map((md) => ({ md, fallback: true })))),
      );
    }
    return this.getMarkdown(p.filePath).pipe(map((md) => ({ md, fallback: this.i18n.isEn() })));
  }

  getMarkdown(filePath: string): Observable<string> {
    const path = filePath.replace(/^\/+/, '');
    let req = this.markdownCache.get(path);
    if (!req) {
      req = this.http.get(path, { responseType: 'text' }).pipe(shareReplay(1));
      this.markdownCache.set(path, req);
    }
    return req;
  }
}

function mergeQuestions(list: Question[], overlay: Overlay<Question>[]): Question[] {
  if (!overlay.length) return list;
  const map = new Map(overlay.map((o) => [o.id, o]));
  return list.map((q) => {
    const o = map.get(q.id);
    if (!o) return q;
    const { code, ...rest } = o;
    return { ...q, ...rest, code: code ? { ...q.code!, ...code } : q.code } as Question;
  });
}

function mergeChallenges(list: Challenge[], overlay: Overlay<Challenge>[]): Challenge[] {
  if (!overlay.length) return list;
  const map = new Map(overlay.map((o) => [o.id, o]));
  return list.map((c) => {
    const o = map.get(c.id);
    if (!o) return c;
    const rubric = c.rubric.map((r, i) => ({ ...r, item: o.rubric?.[i]?.item ?? r.item }));
    return { ...c, ...o, rubric } as Challenge;
  });
}
