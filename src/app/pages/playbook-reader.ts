import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ClipboardService } from '../core/clipboard.service';
import { KnowledgeService } from '../core/knowledge.service';
import { MarkdownService, renderMermaid } from '../core/markdown.service';
import { Keyword, TocEntry } from '../core/models';
import { ThemeService } from '../core/theme.service';
import { Icon } from '../shared/icon';
import { KeywordCard } from '../shared/keyword-card';

type Doc =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; html: SafeHtml; toc: TocEntry[]; hasMermaid: boolean };

@Component({
  selector: 'app-playbook-reader',
  imports: [RouterLink, Icon, KeywordCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!kb.loaded()) {
      <div class="h-64 animate-pulse rounded-xl bg-surface"></div>
    } @else if (!playbook()) {
      <div class="py-20 text-center">
        <h1 class="text-2xl font-bold text-ink">Playbook not found</h1>
        <a routerLink="/" class="btn-primary mt-6 inline-flex">Back to all playbooks</a>
      </div>
    } @else {
      @let p = playbook()!;
      <div class="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-10">
        <article class="min-w-0">
          <a
            routerLink="/"
            class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <app-icon name="arrowLeft" [size]="14" /> All playbooks
          </a>
          <header class="mb-8 border-b border-line pb-6">
            <div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <a routerLink="/" [queryParams]="{ topic: p.topicId }" class="badge hover:opacity-80">
                {{ topic()?.name ?? p.topicId }}
              </a>
              <span class="inline-flex items-center gap-1.5 text-muted">
                <app-icon name="calendar" [size]="14" />
                Updated <time [attr.datetime]="p.updatedAt">{{ p.updatedAt }}</time>
              </span>
            </div>
            <h1 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{{ p.title }}</h1>
            <p class="mt-3 border-l-4 border-accent pl-4 text-lg leading-relaxed text-ink/80">
              {{ p.summary }}
            </p>
          </header>

          @switch (doc().state) {
            @case ('loading') {
              <div class="space-y-3">
                @for (i of [1, 2, 3, 4, 5]; track i) {
                  <div
                    class="h-4 animate-pulse rounded bg-surface"
                    [style.width.%]="100 - i * 9"
                  ></div>
                }
              </div>
            }
            @case ('error') {
              <p
                class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300"
              >
                Could not load <code>{{ p.filePath }}</code
                >. If you are offline, open the app once online so the library can be cached.
              </p>
            }
            @case ('ready') {
              <div
                #content
                class="markdown prose prose-slate max-w-none dark:prose-invert"
                [innerHTML]="readyHtml()"
                (click)="onContentClick($event)"
              ></div>
            }
          }

          @if (hooks().length) {
            <section class="mt-12 border-t border-line pt-8" aria-labelledby="hooks-title">
              <div class="mb-4 flex items-center justify-between gap-3">
                <h2 id="hooks-title" class="flex items-center gap-2 text-lg font-semibold text-ink">
                  <app-icon name="hash" class="text-accent-ink" /> Search Hooks
                </h2>
                <button type="button" class="btn-secondary text-xs" (click)="copyAll()">
                  <app-icon [name]="copiedAll() ? 'check' : 'copy'" [size]="14" />
                  {{ copiedAll() ? 'Copied' : 'Copy all' }}
                </button>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                @for (k of hooks(); track k.id) {
                  <app-keyword-card [keyword]="k" [showPlaybooks]="false" />
                }
              </div>
            </section>
          }
        </article>

        @if (toc().length) {
          <aside class="hidden xl:block">
            <nav class="sticky top-6 text-sm" aria-label="Table of contents">
              <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                On this page
              </p>
              <ul class="space-y-1 border-l border-line">
                @for (t of toc(); track t.id) {
                  <li>
                    <a
                      [href]="'#' + t.id"
                      (click)="scrollTo($event, t.id)"
                      class="-ml-px block border-l-2 py-1 transition-colors"
                      [class.pl-3]="t.level === 2"
                      [class.pl-6]="t.level === 3"
                      [class.border-accent]="activeId() === t.id"
                      [class.text-accent-ink]="activeId() === t.id"
                      [class.border-transparent]="activeId() !== t.id"
                      [class.text-muted]="activeId() !== t.id"
                      >{{ t.text }}</a
                    >
                  </li>
                }
              </ul>
              <button
                type="button"
                class="mt-4 text-xs text-muted hover:text-ink"
                (click)="scrollTop()"
              >
                ↑ Back to top
              </button>
            </nav>
          </aside>
        }
      </div>
    }
  `,
})
export class PlaybookReader {
  protected readonly kb = inject(KnowledgeService);
  private readonly md = inject(MarkdownService);
  private readonly theme = inject(ThemeService);
  private readonly clipboard = inject(ClipboardService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private observer?: IntersectionObserver;

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });
  protected readonly playbook = computed(() => this.kb.playbookById().get(this.id()));
  protected readonly topic = computed(() => {
    const p = this.playbook();
    return p ? this.kb.topicById().get(p.topicId) : undefined;
  });
  protected readonly hooks = computed<Keyword[]>(() => {
    const p = this.playbook();
    const byId = this.kb.keywordById();
    return p ? p.keywordIds.map((id) => byId.get(id)).filter((k): k is Keyword => !!k) : [];
  });

  protected readonly doc = toSignal(
    toObservable(computed(() => this.playbook()?.filePath)).pipe(
      switchMap((path) => {
        if (!path) return of<Doc>({ state: 'loading' });
        return this.kb.getMarkdown(path).pipe(
          map((text): Doc => {
            const r = this.md.render(text);
            return {
              state: 'ready',
              html: this.sanitizer.bypassSecurityTrustHtml(r.html),
              toc: r.toc,
              hasMermaid: r.hasMermaid,
            };
          }),
          catchError(() => of<Doc>({ state: 'error' })),
        );
      }),
    ),
    { initialValue: { state: 'loading' } as Doc },
  );

  protected readonly readyHtml = computed(() => {
    const d = this.doc();
    return d.state === 'ready' ? d.html : '';
  });
  protected readonly toc = computed(() => {
    const d = this.doc();
    return d.state === 'ready' ? d.toc : [];
  });
  protected readonly activeId = signal<string | null>(null);
  protected readonly copiedAll = computed(
    () => this.clipboard.lastCopied() === 'hooks:' + this.playbook()?.id,
  );

  constructor() {
    effect(() => {
      const p = this.playbook();
      this.title.setTitle(p ? `${p.title} · Playbook` : 'Personal Tech Playbook');
    });

    // After content renders (and on theme change): Mermaid + TOC scroll-spy.
    effect(() => {
      const el = this.content()?.nativeElement;
      const d = this.doc();
      const dark = this.theme.theme() === 'dark';
      if (!el || d.state !== 'ready') return;
      if (d.hasMermaid) void renderMermaid(el, dark);
      this.observeHeadings(el);
    });

    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }

  private observeHeadings(el: HTMLElement): void {
    this.observer?.disconnect();
    const headings = Array.from(el.querySelectorAll<HTMLElement>('h2[id], h3[id]'));
    if (!headings.length || typeof IntersectionObserver === 'undefined') return;
    this.activeId.set(headings[0].id);
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) this.activeId.set((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    headings.forEach((h) => this.observer!.observe(h));
  }

  protected onContentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest<HTMLButtonElement>('[data-copy-code]');
    if (copyBtn) {
      const code = copyBtn.closest('.code-block')?.querySelector('code')?.textContent ?? '';
      void this.clipboard.copy(code, 'code').then((ok) => {
        if (!ok) return;
        const label = copyBtn.querySelector('span');
        if (label) {
          label.textContent = 'Copied';
          setTimeout(() => (label.textContent = 'Copy'), 1500);
        }
      });
      return;
    }
    // In-page anchors: avoid navigating to "<base>/#id".
    const a = target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (a) this.scrollTo(e, a.getAttribute('href')!.slice(1));
  }

  protected scrollTo(e: Event, id: string): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeId.set(id);
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${id}`);
  }

  protected scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected copyAll(): void {
    const text = this.hooks()
      .map((k) => `${k.term} — ${k.meaning}`)
      .join('\n');
    void this.clipboard.copy(text, 'hooks:' + this.playbook()?.id);
  }
}
