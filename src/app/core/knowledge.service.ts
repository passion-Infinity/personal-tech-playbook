import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, of, shareReplay } from 'rxjs';
import { Challenge, Keyword, Playbook, Question, Topic } from './models';

const BASE = 'assets/knowledge';

export const LEVEL_NAMES = ['Nền tảng', 'Cơ bản', 'Trung cấp', 'Nâng cao', 'Chuyên sâu'];
export const levelName = (level: number): string =>
  LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)];

/** Loads the static, version-controlled knowledge index once and exposes it as signals. */
@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private readonly http = inject(HttpClient);
  private readonly markdownCache = new Map<string, Observable<string>>();

  readonly topics = signal<Topic[]>([]);
  readonly keywords = signal<Keyword[]>([]);
  readonly playbooks = signal<Playbook[]>([]);
  readonly questions = signal<Question[]>([]);
  readonly challenges = signal<Challenge[]>([]);
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
    // Questions/challenges are optional so older deployments of the index keep working.
    forkJoin({
      topics: this.http.get<Topic[]>(`${BASE}/topics.json`),
      keywords: this.http.get<Keyword[]>(`${BASE}/keywords.json`),
      playbooks: this.http.get<Playbook[]>(`${BASE}/playbooks.json`),
      questions: this.http.get<Question[]>(`${BASE}/questions.json`).pipe(catchError(() => of([]))),
      challenges: this.http
        .get<Challenge[]>(`${BASE}/challenges.json`)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ topics, keywords, playbooks, questions, challenges }) => {
        this.topics.set(topics);
        this.keywords.set(keywords);
        this.playbooks.set(playbooks);
        this.questions.set(questions);
        this.challenges.set(challenges);
        this.loaded.set(true);
      },
      error: () => {
        this.error.set('Could not load the knowledge index. Check your connection and reload.');
        this.loaded.set(true);
      },
    });
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
