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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ClipboardService } from '../core/clipboard.service';
import { FlashcardStore } from '../core/flashcard.store';
import { LearningStore } from '../core/learning.store';
import { KnowledgeService, levelName } from '../core/knowledge.service';
import { MarkdownService, renderMermaid } from '../core/markdown.service';
import { Keyword, TocEntry } from '../core/models';
import { ThemeService } from '../core/theme.service';
import { topicStyle, topicVars } from '../core/topic-style';
import { Icon } from '../shared/icon';
import { ExplainBack } from '../shared/explain-back';
import { KeywordCard } from '../shared/keyword-card';
import { I18n } from '../core/i18n.service';

type Doc =
  | { state: 'loading' }
  | { state: 'error' }
  | {
      state: 'ready';
      html: SafeHtml;
      toc: TocEntry[];
      hasMermaid: boolean;
      minutes: number;
      fallback: boolean;
    };

@Component({
  selector: 'app-playbook-reader',
  imports: [RouterLink, Icon, KeywordCard, ExplainBack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()', '(window:resize)': 'onScroll()' },
  template: `
    <div
      class="fixed inset-x-0 top-0 z-40 h-1 lg:left-72"
      [style]="vars(playbook()?.topicId)"
      aria-hidden="true"
    >
      <div class="progress-fill !rounded-none" [style.width.%]="progress()"></div>
    </div>

    @if (!kb.loaded()) {
      <div class="glass h-64 animate-pulse rounded-3xl"></div>
    } @else if (!playbook()) {
      <div class="py-20 text-center">
        <h1 class="text-2xl font-bold">{{ i18n.t('Không tìm thấy playbook') }}</h1>
        <a routerLink="/" class="btn-primary mt-6">{{ i18n.t('Về tất cả playbook') }}</a>
      </div>
    } @else {
      @let p = playbook()!;
      <div class="xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10" [style]="vars(p.topicId)">
        <article class="min-w-0">
          <a
            [routerLink]="['/topics', p.topicId]"
            class="mb-4 inline-flex flex-wrap items-center gap-x-1.5 text-sm text-muted hover:text-ink"
          >
            <app-icon name="arrowLeft" [size]="14" />
            {{ topic()?.name ?? i18n.t('Tất cả playbook') }}
            <span class="opacity-50">›</span>
            <span>{{
              i18n.t('Bài {n}/{total}', { n: position(), total: siblings().length })
            }}</span>
            <span class="opacity-50">·</span>
            <span>{{ i18n.t('Cấp {n} ·', { n: localLevel() }) }} {{ localLevelLabel() }}</span>
          </a>

          <header class="glass fade-up relative mb-10 overflow-hidden rounded-3xl p-6 sm:p-8">
            <div
              class="topic-gradient pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full opacity-30 blur-3xl"
            ></div>
            <div
              class="topic-gradient pointer-events-none absolute -bottom-32 -left-10 h-56 w-56 rounded-full opacity-15 blur-3xl"
            ></div>
            <div class="relative">
              <div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <a [routerLink]="['/topics', p.topicId]" class="badge hover:opacity-90">
                  <app-icon [name]="style(p.topicId).icon" [size]="13" />
                  {{ topic()?.name ?? p.topicId }}
                </a>
                <span class="inline-flex items-center gap-1.5 text-muted">
                  <app-icon name="calendar" [size]="14" />
                  <time [attr.datetime]="p.updatedAt">{{ p.updatedAt }}</time>
                </span>
                @if (minutes()) {
                  <span class="inline-flex items-center gap-1.5 text-muted">
                    <app-icon name="clock" [size]="14" />
                    {{ i18n.t('{n} phút đọc', { n: minutes() }) }}
                  </span>
                }
              </div>
              <h1 class="text-3xl font-bold leading-tight sm:text-[2.6rem]">{{ p.title }}</h1>
              <p class="mt-4 max-w-3xl text-lg leading-relaxed text-ink/80">{{ p.summary }}</p>

              <div class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p
                    class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"
                  >
                    <app-icon name="map" [size]="13" />
                    {{ i18n.t('Tầng {n} trong lộ trình chung — nên đọc trước', { n: level() }) }}
                  </p>
                  @if (prereqs().length) {
                    <div class="flex flex-wrap gap-1.5">
                      @for (r of prereqs(); track r.id) {
                        <a [routerLink]="['/playbooks', r.id]" class="chip hover:!text-ink">
                          @if (learning.isRead(r.id)) {
                            <app-icon name="check" [size]="12" class="text-emerald-500" />
                          } @else {
                            <app-icon name="lock" [size]="11" />
                          }
                          {{ r.title }}
                        </a>
                      }
                    </div>
                  } @else {
                    <p class="text-muted">
                      {{ i18n.t('Không cần kiến thức tiên quyết — có thể đọc ngay.') }}
                    </p>
                  }
                </div>
                @if (unlocks().length) {
                  <div>
                    <p
                      class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"
                    >
                      <app-icon name="target" [size]="13" /> {{ i18n.t('Mở khoá bài tiếp theo') }}
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      @for (r of unlocks(); track r.id) {
                        <a [routerLink]="['/playbooks', r.id]" class="chip hover:!text-ink">{{
                          r.title
                        }}</a>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  class="btn-secondary"
                  [class.!border-emerald-500]="isRead()"
                  [attr.aria-pressed]="isRead()"
                  (click)="toggleRead()"
                >
                  <app-icon
                    [name]="isRead() ? 'check' : 'eye'"
                    [size]="16"
                    [class]="isRead() ? 'text-emerald-500' : ''"
                  />
                  {{ isRead() ? i18n.t('Đã đọc') : i18n.t('Đánh dấu đã đọc') }}
                </button>
                @if (questionCount()) {
                  <a
                    routerLink="/practice/drill"
                    [queryParams]="{ playbook: p.id }"
                    class="btn-primary"
                  >
                    <app-icon name="lightbulb" [size]="16" />
                    {{ i18n.t('Luyện {n} câu hỏi', { n: questionCount() }) }}
                  </a>
                }
                <a routerLink="/flashcards" [queryParams]="{ playbook: p.id }" class="btn-primary">
                  <app-icon name="cards" [size]="16" />
                  {{ i18n.t('Ôn {n} hooks', { n: hooks().length }) }}
                </a>
                <span
                  class="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted"
                >
                  <app-icon name="brain" [size]="16" />
                  {{ i18n.t('Đã nhớ {k}/{h}', { k: knownHooks(), h: hooks().length }) }}
                </span>
              </div>
            </div>
          </header>

          @switch (doc().state) {
            @case ('loading') {
              <div class="space-y-3">
                @for (i of [1, 2, 3, 4, 5]; track i) {
                  <div class="glass h-4 animate-pulse rounded" [style.width.%]="100 - i * 9"></div>
                }
              </div>
            }
            @case ('error') {
              <p class="glass rounded-2xl p-4 text-sm text-red-500">
                {{
                  i18n.t(
                    'Không tải được {path}. Nếu đang offline, hãy mở ứng dụng một lần khi có mạng để thư viện được lưu offline.',
                    { path: p.filePath }
                  )
                }}
              </p>
            }
            @case ('ready') {
              @if (untranslated()) {
                <p
                  class="glass mb-6 rounded-2xl border-amber-400/40 p-4 text-sm text-amber-500"
                  role="status"
                >
                  {{ i18n.t('Bài này chưa có bản tiếng Anh — đang hiển thị bản tiếng Việt.') }}
                </p>
              }
              <div
                #content
                class="markdown prose prose-slate max-w-none dark:prose-invert"
                [innerHTML]="readyHtml()"
                (click)="onContentClick($event)"
              ></div>
            }
          }

          @if (explainQuestion(); as eq) {
            <div class="mt-14" [style]="vars(p.topicId)">
              <app-explain-back [question]="eq" />
            </div>
          }

          @if (hooks().length) {
            <section class="mt-14" aria-labelledby="hooks-title">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="hooks-title" class="flex items-center gap-2 text-xl font-semibold">
                  <span class="topic-tile h-8 w-8 !rounded-lg"
                    ><app-icon name="hash" [size]="16"
                  /></span>
                  Search Hooks
                </h2>
                <div class="flex gap-2">
                  <button type="button" class="btn-secondary !py-2 text-xs" (click)="copyAll()">
                    <app-icon [name]="copiedAll() ? 'check' : 'copy'" [size]="14" />
                    {{ copiedAll() ? i18n.t('Đã sao chép') : i18n.t('Sao chép tất cả') }}
                  </button>
                  <a
                    routerLink="/flashcards"
                    [queryParams]="{ playbook: p.id }"
                    class="btn-primary !py-2 text-xs"
                  >
                    <app-icon name="cards" [size]="14" /> Flashcards
                  </a>
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                @for (k of hooks(); track k.id) {
                  <app-keyword-card [keyword]="k" [showPlaybooks]="false" />
                }
              </div>
            </section>
          }

          <section
            class="glass mt-12 flex flex-wrap items-center gap-3 rounded-2xl p-4 sm:p-5"
            aria-label="{{ i18n.t('Hoàn thành bài học') }}"
          >
            <div class="min-w-0 flex-1">
              <p class="font-semibold">
                {{ isRead() ? i18n.t('Bạn đã đọc bài này') : i18n.t('Đã hiểu bài này?') }}
              </p>
              <p class="text-sm text-muted">
                {{
                  isRead()
                    ? i18n.t('Ôn lại bằng câu hỏi để nhớ lâu hơn.')
                    : i18n.t(
                        'Đánh dấu đã đọc để mở khoá bài tiếp theo và đưa câu hỏi vào Daily Drill.'
                      )
                }}
              </p>
            </div>
            @if (!isRead()) {
              <button type="button" class="btn-secondary" (click)="toggleRead()">
                <app-icon name="check" [size]="16" /> {{ i18n.t('Đánh dấu đã đọc') }}
              </button>
            }
            @if (next(); as nx) {
              <button type="button" class="btn-primary" (click)="finishAndNext(nx.id)">
                {{ isRead() ? i18n.t('Bài tiếp theo') : i18n.t('Đã đọc & bài tiếp') }}
                <app-icon name="arrowRight" [size]="16" />
              </button>
            }
          </section>

          @if (prev() || next()) {
            <nav
              class="mt-12 grid gap-3 sm:grid-cols-2"
              aria-label="{{ i18n.t('Điều hướng playbook') }}"
            >
              @if (prev(); as pr) {
                <a [routerLink]="['/playbooks', pr.id]" class="glass glass-hover rounded-2xl p-4">
                  <span class="flex items-center gap-1 text-xs text-muted">
                    <app-icon name="chevronLeft" [size]="14" />
                    {{ i18n.t('Bài trước trong lộ trình') }}
                  </span>
                  <span class="mt-1 block font-semibold">{{ pr.title }}</span>
                </a>
              } @else {
                <span class="hidden sm:block"></span>
              }
              @if (next(); as nx) {
                <a
                  [routerLink]="['/playbooks', nx.id]"
                  class="glass glass-hover rounded-2xl p-4 text-right"
                >
                  <span class="flex items-center justify-end gap-1 text-xs text-muted">
                    {{ i18n.t('Bài tiếp theo trong lộ trình') }}
                    <app-icon name="chevronRight" [size]="14" />
                  </span>
                  <span class="mt-1 block font-semibold">{{ nx.title }}</span>
                </a>
              }
            </nav>
          }
        </article>

        @if (toc().length) {
          <aside class="hidden xl:block">
            <nav
              class="glass sticky top-8 rounded-2xl p-4 text-sm"
              aria-label="{{ i18n.t('Mục lục') }}"
            >
              <p class="eyebrow mb-3">{{ i18n.t('Trong bài này') }}</p>
              <ul class="space-y-0.5">
                @for (t of toc(); track t.id) {
                  <li>
                    <a
                      [href]="'#' + t.id"
                      (click)="scrollTo($event, t.id)"
                      class="block rounded-lg py-1.5 pr-2 transition-colors"
                      [class.pl-3]="t.level === 2"
                      [class.pl-6]="t.level === 3"
                      [class.nav-active]="activeId() === t.id"
                      [class.text-muted]="activeId() !== t.id"
                      >{{ t.text }}</a
                    >
                  </li>
                }
              </ul>
              <div class="mt-4 border-t border-line pt-3">
                <div class="mb-1 flex justify-between text-xs text-muted">
                  <span>{{ i18n.t('Tiến độ đọc') }}</span
                  ><span>{{ roundedProgress() }}%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" [style.width.%]="progress()"></div>
                </div>
              </div>
              <button
                type="button"
                class="mt-3 text-xs text-muted hover:text-ink"
                (click)="scrollTop()"
              >
                {{ i18n.t('↑ Về đầu trang') }}
              </button>
            </nav>
          </aside>
        }
      </div>
    }
  `,
})
export class PlaybookReader {
  protected readonly i18n = inject(I18n);
  protected readonly kb = inject(KnowledgeService);
  private readonly md = inject(MarkdownService);
  private readonly theme = inject(ThemeService);
  private readonly clipboard = inject(ClipboardService);
  private readonly cards = inject(FlashcardStore);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private observer?: IntersectionObserver;

  protected readonly style = topicStyle;
  protected readonly vars = topicVars;

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
  protected readonly learning = inject(LearningStore);
  protected readonly level = computed(() => this.kb.levels().get(this.id()) ?? 0);
  protected readonly levelLabel = computed(() => levelName(this.level(), this.i18n.lang()));
  protected readonly prereqs = computed(() =>
    (this.kb.prereqs().get(this.id()) ?? [])
      .map((i) => this.kb.playbookById().get(i))
      .filter((x): x is NonNullable<typeof x> => !!x),
  );
  protected readonly unlocks = computed(() =>
    (this.kb.dependents().get(this.id()) ?? [])
      .map((i) => this.kb.playbookById().get(i))
      .filter((x): x is NonNullable<typeof x> => !!x),
  );
  protected readonly isRead = computed(() => this.learning.read().has(this.id()));
  protected readonly questionCount = computed(
    () => this.kb.questionsByPlaybook().get(this.id())?.length ?? 0,
  );
  protected readonly explainQuestion = computed(() =>
    this.kb
      .questionsByPlaybook()
      .get(this.id())
      ?.find((q) => q.type === 'explain'),
  );
  protected readonly knownHooks = computed(() =>
    this.cards.knownCount(this.hooks().map((k) => k.id)),
  );

  /** Lessons of this topic in learning order (basic to advanced). */
  protected readonly siblings = computed(() => {
    const p = this.playbook();
    return p ? (this.kb.orderedByTopic().get(p.topicId) ?? []) : [];
  });
  protected readonly position = computed(
    () => this.siblings().findIndex((x) => x.id === this.id()) + 1,
  );
  protected readonly localLevel = computed(() => this.kb.localLevels().get(this.id()) ?? 0);
  protected readonly localLevelLabel = computed(() =>
    levelName(this.localLevel(), this.i18n.lang()),
  );
  protected readonly prev = computed(() => {
    const list = this.siblings();
    const i = list.findIndex((x) => x.id === this.id());
    return i > 0 ? list[i - 1] : undefined;
  });
  protected readonly next = computed(() => {
    const list = this.siblings();
    const i = list.findIndex((x) => x.id === this.id());
    return i >= 0 && i < list.length - 1 ? list[i + 1] : undefined;
  });

  protected readonly doc = toSignal(
    toObservable(computed(() => this.playbook())).pipe(
      switchMap((pb) => {
        if (!pb) return of<Doc>({ state: 'loading' });
        return this.kb.getPlaybookMarkdown(pb).pipe(
          map(({ md, fallback }): Doc => {
            const r = this.md.render(md);
            return {
              state: 'ready',
              html: this.sanitizer.bypassSecurityTrustHtml(r.html),
              toc: r.toc,
              hasMermaid: r.hasMermaid,
              minutes: r.minutes,
              fallback,
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
  protected readonly untranslated = computed(() => {
    const d = this.doc();
    return d.state === 'ready' && d.fallback;
  });
  protected readonly minutes = computed(() => {
    const d = this.doc();
    return d.state === 'ready' ? d.minutes : 0;
  });
  protected readonly activeId = signal<string | null>(null);
  protected readonly progress = signal(0);
  protected readonly roundedProgress = computed(() => Math.round(this.progress()));
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
      setTimeout(() => this.onScroll());
    });

    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }

  protected onScroll(): void {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    this.progress.set(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
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

  protected finishAndNext(nextId: string): void {
    this.learning.setRead(this.id(), true);
    void this.router.navigate(['/playbooks', nextId]).then(() => window.scrollTo({ top: 0 }));
  }

  protected toggleRead(): void {
    this.learning.setRead(this.id(), !this.isRead());
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
