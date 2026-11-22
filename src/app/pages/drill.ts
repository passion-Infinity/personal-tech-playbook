import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { KnowledgeService } from '../core/knowledge.service';
import { LearningStore } from '../core/learning.store';
import { MarkdownService } from '../core/markdown.service';
import { Question } from '../core/models';
import { PracticeService } from '../core/practice.service';
import { topicVars } from '../core/topic-style';
import { ExplainBack } from '../shared/explain-back';
import { Icon } from '../shared/icon';
import { I18n } from '../core/i18n.service';

const TYPE_LABEL: Record<Question['type'], string> = {
  mcq: 'Trắc nghiệm',
  bug: 'Review code do AI sinh ra',
  explain: 'Tự giải thích',
};

@Component({
  selector: 'app-drill',
  imports: [RouterLink, Icon, ExplainBack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <header class="fade-up mb-6">
      <a
        routerLink="/practice"
        class="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <app-icon name="arrowLeft" [size]="14" /> {{ i18n.t('Luyện tập') }}
      </a>
      <h1 class="text-2xl font-bold sm:text-3xl">{{ title() }}</h1>
    </header>

    @if (!kb.loaded()) {
      <div class="glass mx-auto h-72 max-w-2xl animate-pulse rounded-3xl"></div>
    } @else if (!queue().length) {
      <div class="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <app-icon name="lightbulb" [size]="36" class="text-accent-ink" />
        <h2 class="mt-3 text-xl font-bold">{{ i18n.t('Chưa có câu hỏi phù hợp') }}</h2>
        <p class="mt-2 text-muted">
          {{
            i18n.t(
              'Daily Drill lấy câu hỏi từ những bài bạn đã đánh dấu "đã đọc". Hãy đọc một bài trong Roadmap rồi quay lại.'
            )
          }}
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-3">
          <a routerLink="/roadmap" class="btn-primary"
            ><app-icon name="map" [size]="16" /> {{ i18n.t('Mở Roadmap') }}</a
          >
          <a routerLink="/practice/drill" [queryParams]="{ all: 1 }" class="btn-secondary">{{
            i18n.t('Luyện thử các bài nền tảng')
          }}</a>
        </div>
      </div>
    } @else if (done()) {
      <div class="glass fade-up mx-auto max-w-2xl rounded-3xl p-6 sm:p-8">
        <div class="text-center">
          <span class="topic-tile mx-auto h-16 w-16 !rounded-2xl"
            ><app-icon name="trophy" [size]="30"
          /></span>
          <h2 class="mt-4 text-3xl font-bold">
            <span class="text-gradient">{{ percent() }}%</span> {{ i18n.t('chính xác') }}
          </h2>
          <p class="mt-1 text-muted">
            {{
              i18n.t('{correct}/{total} câu đúng · chuỗi ngày học: {streak} 🔥', {
                correct: correctCount(),
                total: results().length,
                streak: store.streak(),
              })
            }}
          </p>
        </div>
        <ul class="mt-6 space-y-2">
          @for (r of results(); track r.q.id) {
            <li class="glass flex items-start gap-3 rounded-2xl p-3">
              <app-icon
                [name]="r.correct ? 'check' : 'x'"
                [size]="18"
                [class]="r.correct ? 'text-emerald-500' : 'text-rose-500'"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium leading-snug">{{ r.q.question }}</p>
                @if (!r.correct) {
                  <a
                    [routerLink]="['/playbooks', r.q.playbookId]"
                    class="mt-1 inline-flex items-center gap-1 text-xs text-accent-ink hover:underline"
                  >
                    <app-icon name="book" [size]="12" /> {{ i18n.t('Đọc lại:') }}
                    {{ kb.playbookById().get(r.q.playbookId)?.title }}
                  </a>
                }
              </div>
            </li>
          }
        </ul>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" class="btn-primary" (click)="restart()">
            <app-icon name="rotate" [size]="16" /> {{ i18n.t('Luyện thêm') }}
          </button>
          <a routerLink="/practice" class="btn-secondary">{{ i18n.t('Về trang luyện tập') }}</a>
        </div>
      </div>
    } @else {
      @let q = current()!;
      <div class="mx-auto max-w-2xl">
        <div class="mb-4">
          <div class="mb-1.5 flex justify-between text-xs text-muted">
            <span>{{
              i18n.t('Câu {n} / {total}', { n: index() + 1, total: queue().length })
            }}</span>
            <span>{{ i18n.t(typeLabel[q.type]) }}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="(index() / queue().length) * 100"></div>
          </div>
        </div>

        <div class="fade-up" [style]="vars(playbookOf(q))">
          @if (q.type === 'explain') {
            <app-explain-back [question]="q" (rated)="onExplained($event)" />
          } @else {
            <section class="glass rounded-3xl p-5 sm:p-6">
              <div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span class="badge">{{ kb.playbookById().get(q.playbookId)?.title }}</span>
                <span
                  class="text-muted"
                  [attr.aria-label]="i18n.t('Độ khó {n}', { n: q.difficulty })"
                  >{{ '●'.repeat(q.difficulty) }}{{ '○'.repeat(3 - q.difficulty) }}</span
                >
                @if (q.type === 'bug') {
                  <span class="chip"
                    ><app-icon name="bug" [size]="12" /> {{ i18n.t('Tìm lỗi') }}</span
                  >
                }
              </div>
              <h2 class="text-lg font-semibold leading-snug sm:text-xl">{{ q.question }}</h2>
              @if (codeHtml(); as html) {
                <div
                  class="markdown prose prose-slate mt-3 max-w-none dark:prose-invert"
                  [innerHTML]="html"
                ></div>
              }
              @if (isMulti()) {
                <p class="mt-3 text-xs font-medium text-accent-ink">
                  {{ i18n.t('Chọn tất cả đáp án đúng') }}
                </p>
              }
              <div class="mt-4 space-y-2" role="group">
                @for (o of q.options ?? []; track $index) {
                  <button
                    type="button"
                    class="glass flex w-full items-start gap-3 rounded-2xl p-3.5 text-left transition hover:border-violet-400/60"
                    [class.!border-violet-400]="selected().includes($index) && !submitted()"
                    [class.!border-emerald-500]="submitted() && q.answer?.includes($index)"
                    [class.!border-rose-500]="
                      submitted() && selected().includes($index) && !q.answer?.includes($index)
                    "
                    [attr.aria-pressed]="selected().includes($index)"
                    (click)="toggle($index)"
                  >
                    <span class="kbd mt-0.5">{{ $index + 1 }}</span>
                    <span class="flex-1 text-[0.95rem] leading-snug">{{ o }}</span>
                    @if (submitted() && q.answer?.includes($index)) {
                      <app-icon name="check" [size]="18" class="text-emerald-500" />
                    } @else if (submitted() && selected().includes($index)) {
                      <app-icon name="x" [size]="18" class="text-rose-500" />
                    }
                  </button>
                }
              </div>
              @if (submitted()) {
                <div class="fade-up mt-4 rounded-2xl border border-line bg-accent-soft p-4">
                  <p
                    class="text-sm font-semibold"
                    [class.text-emerald-500]="lastCorrect()"
                    [class.text-rose-500]="!lastCorrect()"
                  >
                    {{ lastCorrect() ? i18n.t('Chính xác!') : i18n.t('Chưa đúng') }}
                  </p>
                  <p class="mt-1 text-[0.95rem] leading-relaxed">{{ q.explanation }}</p>
                  <a
                    [routerLink]="['/playbooks', q.playbookId]"
                    class="mt-2 inline-flex items-center gap-1 text-xs text-accent-ink hover:underline"
                  >
                    <app-icon name="book" [size]="12" /> {{ i18n.t('Xem lại bài') }}
                  </a>
                </div>
              }
            </section>
          }
        </div>

        <div class="mt-5 flex justify-end">
          @if (q.type === 'explain') {
            @if (submitted()) {
              <button type="button" class="btn-primary" (click)="next()">
                {{ isLast() ? i18n.t('Xem kết quả') : i18n.t('Câu tiếp theo') }}
                <app-icon name="arrowRight" [size]="16" />
              </button>
            }
          } @else if (!submitted()) {
            <button
              type="button"
              class="btn-primary"
              [disabled]="!selected().length"
              [class.opacity-50]="!selected().length"
              (click)="submit()"
            >
              {{ i18n.t('Kiểm tra') }} <span class="kbd !text-white/80">Enter</span>
            </button>
          } @else {
            <button type="button" class="btn-primary" (click)="next()">
              {{ isLast() ? i18n.t('Xem kết quả') : i18n.t('Câu tiếp theo') }}
              <app-icon name="arrowRight" [size]="16" />
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class Drill {
  protected readonly i18n = inject(I18n);
  protected readonly kb = inject(KnowledgeService);
  protected readonly store = inject(LearningStore);
  private readonly practice = inject(PracticeService);
  private readonly md = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);

  protected readonly typeLabel = TYPE_LABEL;
  protected readonly vars = topicVars;
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly queue = signal<Question[]>([]);
  protected readonly index = signal(0);
  protected readonly selected = signal<number[]>([]);
  protected readonly submitted = signal(false);
  protected readonly results = signal<Array<{ q: Question; correct: boolean }>>([]);

  protected readonly current = computed(() => this.queue()[this.index()]);
  protected readonly done = computed(
    () => this.queue().length > 0 && this.index() >= this.queue().length,
  );
  protected readonly isLast = computed(() => this.index() >= this.queue().length - 1);
  protected readonly isMulti = computed(() => (this.current()?.answer?.length ?? 0) > 1);
  protected readonly lastCorrect = computed(() => this.results().at(-1)?.correct ?? false);
  protected readonly correctCount = computed(() => this.results().filter((r) => r.correct).length);
  protected readonly percent = computed(() => {
    const n = this.results().length;
    return n ? Math.round((this.correctCount() / n) * 100) : 0;
  });

  protected readonly codeHtml = computed<SafeHtml | null>(() => {
    const c = this.current()?.code;
    if (!c) return null;
    return this.sanitizer.bypassSecurityTrustHtml(
      this.md.render('```' + c.language + '\n' + c.text + '\n```').html,
    );
  });

  protected readonly title = computed(() => {
    const p = this.params();
    const pb = p.get('playbook');
    if (pb)
      return this.i18n.t('Luyện: {name}', { name: this.kb.playbookById().get(pb)?.title ?? pb });
    const topic = p.get('topic');
    if (topic)
      return this.i18n.t('Luyện chủ đề: {name}', {
        name: this.kb.topicById().get(topic)?.name ?? topic,
      });
    if (p.get('type') === 'bug') return this.i18n.t('Review điều phối AI: tìm lỗi trong code');
    if (p.get('type') === 'explain')
      return this.i18n.t('Explain-back: giải thích bằng lời của bạn');
    return 'Daily Drill';
  });

  constructor() {
    effect(() => {
      if (!this.kb.loaded()) return;
      const p = this.params();
      untracked(() => this.start(p));
    });
  }

  private start(p: ParamMap): void {
    const playbookId = p.get('playbook') ?? undefined;
    const topicId = p.get('topic') ?? undefined;
    const type = (p.get('type') as Question['type'] | null) ?? undefined;
    const daily = !playbookId && !topicId && !type && !p.get('all');
    this.queue.set(
      this.practice.build({
        playbookId,
        topicId,
        type,
        daily,
        size: playbookId || topicId || type ? 10 : 7,
      }),
    );
    this.index.set(0);
    this.selected.set([]);
    this.submitted.set(false);
    this.results.set([]);
  }

  protected restart(): void {
    this.start(this.params());
  }

  protected playbookOf(q: Question): string | undefined {
    return this.kb.playbookById().get(q.playbookId)?.topicId;
  }

  protected toggle(i: number): void {
    if (this.submitted()) return;
    if (this.isMulti()) {
      this.selected.update((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
    } else {
      this.selected.set([i]);
    }
  }

  protected submit(): void {
    const q = this.current();
    if (!q || this.submitted() || !this.selected().length) return;
    const answer = [...(q.answer ?? [])].sort().join(',');
    const correct = [...this.selected()].sort().join(',') === answer;
    this.results.update((r) => [...r, { q, correct }]);
    this.store.answer(q.id, correct);
    this.submitted.set(true);
  }

  protected onExplained(rating: 1 | 2 | 3): void {
    const q = this.current();
    if (!q) return;
    this.results.update((r) => [...r, { q, correct: rating >= 2 }]);
    this.submitted.set(true);
  }

  protected next(): void {
    this.index.update((i) => i + 1);
    this.selected.set([]);
    this.submitted.set(false);
  }

  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === 'TEXTAREA' || t?.tagName === 'INPUT') return;
    const q = this.current();
    if (!q || this.done() || q.type === 'explain') return;
    if (/^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < (q.options?.length ?? 0)) this.toggle(i);
    } else if (e.key === 'Enter') {
      if (t?.tagName === 'BUTTON' && !(t as HTMLButtonElement).hasAttribute('aria-pressed')) return;
      e.preventDefault();
      if (this.submitted()) this.next();
      else this.submit();
    }
  }
}
