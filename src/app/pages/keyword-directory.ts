import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KnowledgeService } from '../core/knowledge.service';
import { filterKeywords } from '../core/search';
import { Icon } from '../shared/icon';
import { KeywordCard } from '../shared/keyword-card';

@Component({
  selector: 'app-keyword-directory',
  imports: [KeywordCard, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-accent-ink">Search Hooks</p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Keywords Directory
      </h1>
      <p class="mt-2 max-w-2xl text-muted">
        Exact English terms with Vietnamese meanings — copy one and deep-dive on Google, docs or
        papers.
      </p>
    </header>

    <div class="sticky top-14 z-10 -mx-4 mb-4 bg-bg/90 px-4 py-3 backdrop-blur lg:top-0">
      <label class="relative block">
        <span class="sr-only">Filter keywords</span>
        <app-icon
          name="search"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          class="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-ink outline-none placeholder:text-muted focus:border-accent"
          placeholder="Filter by term, nghĩa tiếng Việt, definition…"
          [value]="query()"
          (input)="setQuery($event)"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
        <a
          routerLink="/keywords"
          [queryParams]="{ topic: null }"
          queryParamsHandling="merge"
          class="chip-filter shrink-0"
          [class.chip-active]="!topicId()"
        >
          All <span class="opacity-60">{{ kb.keywords().length }}</span>
        </a>
        @for (t of kb.topics(); track t.id) {
          <a
            routerLink="/keywords"
            [queryParams]="{ topic: t.id }"
            queryParamsHandling="merge"
            class="chip-filter shrink-0"
            [class.chip-active]="topicId() === t.id"
          >
            {{ t.name }}
            <span class="opacity-60">{{ kb.keywordCountByTopic().get(t.id) ?? 0 }}</span>
          </a>
        }
      </div>
    </div>

    <p class="mb-3 text-sm text-muted">
      {{ keywords().length }} of {{ kb.keywords().length }} hooks
    </p>
    <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      @for (k of keywords(); track k.id) {
        <app-keyword-card [keyword]="k" />
      } @empty {
        <p class="text-muted">No keywords match “{{ query() }}”.</p>
      }
    </div>
  `,
})
export class KeywordDirectory {
  protected readonly kb = inject(KnowledgeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly query = computed(() => this.params().get('q') ?? '');
  protected readonly topicId = computed(() => this.params().get('topic'));

  protected readonly keywords = computed(() => {
    const t = this.topicId();
    const base = this.kb.sortedKeywords().filter((k) => !t || k.topicId === t);
    return filterKeywords(this.query(), base, this.kb.topicById());
  });

  protected setQuery(e: Event): void {
    const q = (e.target as HTMLInputElement).value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
