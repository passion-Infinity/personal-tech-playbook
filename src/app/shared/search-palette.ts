import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { KnowledgeService } from '../core/knowledge.service';
import { SearchResult, search } from '../core/search';
import { UiService } from '../core/ui.service';
import { Icon } from './icon';

@Component({
  selector: 'app-search-palette',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.paletteOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 pt-[8vh] backdrop-blur-sm sm:p-6 sm:pt-[12vh]"
        (click)="ui.closePalette()"
      >
        <div
          class="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Search playbooks and keywords"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3 border-b border-line px-4">
            <app-icon name="search" class="text-muted" />
            <input
              #input
              type="search"
              class="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
              placeholder="Search playbooks, English terms, nghĩa tiếng Việt…"
              [value]="ui.paletteQuery()"
              (input)="onInput($event)"
              (keydown)="onKey($event)"
              aria-controls="palette-results"
              autocomplete="off"
              spellcheck="false"
            />
            <kbd class="kbd hidden sm:inline-flex">Esc</kbd>
          </div>
          <ul id="palette-results" class="overflow-y-auto p-2" role="listbox">
            @if (!ui.paletteQuery().trim()) {
              <li class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Recent playbooks
              </li>
            }
            @for (r of results(); track r.kind + r.item.id; let i = $index) {
              <li
                role="option"
                [attr.aria-selected]="i === active()"
                [id]="'opt-' + i"
                class="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5"
                [class.bg-accent-soft]="i === active()"
                (mouseenter)="active.set(i)"
                (click)="open(r)"
              >
                <span
                  class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-muted"
                >
                  <app-icon [name]="r.kind === 'playbook' ? 'book' : 'hash'" [size]="14" />
                </span>
                <span class="min-w-0 flex-1">
                  @if (r.kind === 'playbook') {
                    <span class="block truncate font-medium text-ink">{{ r.item.title }}</span>
                    <span class="line-clamp-1 text-sm text-muted">{{ r.item.summary }}</span>
                  } @else {
                    <span class="block truncate font-mono text-sm font-medium text-ink">{{
                      r.item.term
                    }}</span>
                    <span class="line-clamp-1 text-sm text-muted">{{ r.item.meaning }}</span>
                  }
                </span>
                <span class="chip shrink-0">{{ r.kind === 'playbook' ? 'Playbook' : 'Hook' }}</span>
              </li>
            } @empty {
              <li class="px-3 py-10 text-center text-sm text-muted">
                No results for “{{ ui.paletteQuery() }}”.
              </li>
            }
          </ul>
          <div
            class="hidden items-center gap-4 border-t border-line px-4 py-2 text-xs text-muted sm:flex"
          >
            <span><kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> navigate</span>
            <span><kbd class="kbd">Enter</kbd> open</span>
            <span class="ml-auto">{{ results().length }} results</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class SearchPalette {
  protected readonly ui = inject(UiService);
  private readonly kb = inject(KnowledgeService);
  private readonly router = inject(Router);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  protected readonly active = signal(0);

  protected readonly results = computed<SearchResult[]>(() => {
    const q = this.ui.paletteQuery();
    if (!q.trim()) {
      return this.kb
        .sortedPlaybooks()
        .slice(0, 6)
        .map((item) => ({ kind: 'playbook' as const, item, score: 0 }));
    }
    return search(
      q,
      this.kb.playbooks(),
      this.kb.keywords(),
      this.kb.topicById(),
      this.kb.keywordById(),
    ).slice(0, 30);
  });

  constructor() {
    effect(() => {
      if (this.ui.paletteOpen()) {
        const el = this.input()?.nativeElement;
        if (el) setTimeout(() => el.focus());
      }
    });
    effect(() => {
      this.results();
      this.active.set(0);
    });
  }

  protected onInput(e: Event): void {
    this.ui.paletteQuery.set((e.target as HTMLInputElement).value);
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.results().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.move(n ? (this.active() + 1) % n : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.move(n ? (this.active() - 1 + n) % n : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = this.results()[this.active()];
      if (r) this.open(r);
    } else if (e.key === 'Escape') {
      this.ui.closePalette();
    }
  }

  private move(i: number): void {
    this.active.set(i);
    document.getElementById('opt-' + i)?.scrollIntoView({ block: 'nearest' });
  }

  protected open(r: SearchResult): void {
    this.ui.closePalette();
    if (r.kind === 'playbook') {
      this.router.navigate(['/playbooks', r.item.id]);
    } else {
      this.router.navigate(['/keywords'], { queryParams: { q: r.item.term } });
    }
  }
}
