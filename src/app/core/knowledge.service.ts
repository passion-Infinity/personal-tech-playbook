import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, shareReplay } from 'rxjs';
import { Keyword, Playbook, Topic } from './models';

const BASE = 'assets/knowledge';

/** Loads the static, version-controlled knowledge index once and exposes it as signals. */
@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private readonly http = inject(HttpClient);
  private readonly markdownCache = new Map<string, Observable<string>>();

  readonly topics = signal<Topic[]>([]);
  readonly keywords = signal<Keyword[]>([]);
  readonly playbooks = signal<Playbook[]>([]);
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

  constructor() {
    forkJoin({
      topics: this.http.get<Topic[]>(`${BASE}/topics.json`),
      keywords: this.http.get<Keyword[]>(`${BASE}/keywords.json`),
      playbooks: this.http.get<Playbook[]>(`${BASE}/playbooks.json`),
    }).subscribe({
      next: ({ topics, keywords, playbooks }) => {
        this.topics.set(topics);
        this.keywords.set(keywords);
        this.playbooks.set(playbooks);
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
