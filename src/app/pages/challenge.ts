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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { KnowledgeService } from '../core/knowledge.service';
import { LearningStore } from '../core/learning.store';
import { MarkdownService } from '../core/markdown.service';
import { topicVars } from '../core/topic-style';
import { Icon } from '../shared/icon';

const DIFFICULTY = ['', 'Cơ bản', 'Trung cấp', 'Nâng cao'];

@Component({
  selector: 'app-challenge',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!kb.loaded()) {
      <div class="glass h-72 animate-pulse rounded-3xl"></div>
    } @else if (!c()) {
      <div class="py-16 text-center">
        <h1 class="text-2xl font-bold">Không tìm thấy đề</h1>
        <a routerLink="/practice/challenges" class="btn-primary mt-5">Xem tất cả đề</a>
      </div>
    } @else {
      @let ch = c()!;
      <div class="mx-auto max-w-3xl" [style]="vars(ch.topicId)">
        <a
          routerLink="/practice/challenges"
          class="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <app-icon name="arrowLeft" [size]="14" /> Tất cả đề thiết kế
        </a>
        <header class="glass fade-up relative mb-6 overflow-hidden rounded-3xl p-6">
          <div
            class="topic-gradient pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
          ></div>
          <div class="relative">
            <div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span class="badge">{{ kb.topicById().get(ch.topicId)?.name }}</span>
              <span class="chip">{{ difficulty[ch.difficulty] }}</span>
              @if (state()?.doneOn) {
                <span class="chip !text-emerald-500"
                  >✓ {{ state()!.score }}/{{ state()!.max }} điểm</span
                >
              }
            </div>
            <h1 class="text-2xl font-bold leading-tight sm:text-3xl">{{ ch.title }}</h1>
            <p class="mt-3 leading-relaxed text-ink/85">{{ ch.scenario }}</p>
          </div>
        </header>

        <section class="mb-5">
          <h2 class="mb-2 flex items-center gap-2 text-lg font-semibold">
            <app-icon name="target" class="text-accent-ink" /> Yêu cầu
          </h2>
          <ul class="glass space-y-2 rounded-2xl p-4 text-[0.95rem]">
            @for (r of ch.requirements; track r) {
              <li class="flex gap-2">
                <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400"></span> {{ r }}
              </li>
            }
          </ul>
        </section>

        @if (ch.prerequisites.length) {
          <p class="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted">
            Nên đọc trước:
            @for (id of ch.prerequisites; track id) {
              <a [routerLink]="['/playbooks', id]" class="chip hover:!text-ink">
                @if (store.isRead(id)) {
                  <app-icon name="check" [size]="12" class="text-emerald-500" />
                }
                {{ kb.playbookById().get(id)?.title ?? id }}
              </a>
            }
          </p>
        }

        <section class="mb-5">
          <h2 class="mb-2 flex items-center gap-2 text-lg font-semibold">
            <app-icon name="pencil" class="text-accent-ink" /> Phần trả lời của bạn
          </h2>
          <p class="mb-2 text-sm text-muted">
            Viết ra giải pháp (kiến trúc, trade-off, số liệu ước lượng, rủi ro)
            <b class="text-ink">trước khi</b> xem gợi ý hay đáp án. Bản nháp được lưu trên thiết bị
            này.
          </p>
          <textarea
            class="glass min-h-56 w-full resize-y rounded-2xl p-4 font-mono text-[0.88rem] leading-relaxed outline-none placeholder:text-muted focus:border-violet-400"
            placeholder="Ví dụ: 1) Ước lượng tải… 2) Thành phần chính… 3) Luồng xử lý… 4) Trade-off… 5) Điểm có thể hỏng…"
            [value]="draft()"
            (input)="onDraft($event)"
            aria-label="Your answer"
          ></textarea>
        </section>

        @if (ch.hints.length) {
          <section class="mb-6">
            <h2 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <app-icon name="lightbulb" class="text-accent-ink" /> Gợi ý
              <span class="text-xs font-normal text-muted">(mở từng cái khi bí)</span>
            </h2>
            <div class="space-y-2">
              @for (h of ch.hints; track $index) {
                @if ($index < hintsShown()) {
                  <p class="glass fade-up rounded-2xl p-3 text-[0.95rem]">
                    <b class="text-accent-ink">Gợi ý {{ $index + 1 }}.</b> {{ h }}
                  </p>
                }
              }
              @if (hintsShown() < ch.hints.length) {
                <button
                  type="button"
                  class="btn-secondary"
                  (click)="hintsShown.set(hintsShown() + 1)"
                >
                  Mở gợi ý {{ hintsShown() + 1 }}/{{ ch.hints.length }}
                </button>
              }
            </div>
          </section>
        }

        @if (!revealed()) {
          <div class="flex justify-end">
            <button
              type="button"
              class="btn-primary"
              [disabled]="draft().trim().length < 40"
              [class.opacity-50]="draft().trim().length < 40"
              (click)="revealed.set(true)"
            >
              <app-icon name="eye" [size]="16" /> Nộp bài & xem đáp án
            </button>
          </div>
          @if (draft().trim().length < 40) {
            <p class="mt-2 text-right text-xs text-muted">
              Hãy viết ít nhất vài câu ({{ draft().trim().length }}/40 ký tự) rồi mới mở đáp án.
            </p>
          }
        } @else {
          <section class="fade-up mb-6">
            <h2 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <app-icon name="check" class="text-accent-ink" /> Tự chấm theo rubric
            </h2>
            <div class="glass space-y-1 rounded-2xl p-3">
              @for (r of ch.rubric; track $index) {
                <label
                  class="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-accent-soft"
                >
                  <input
                    type="checkbox"
                    class="mt-1 h-4 w-4 accent-violet-500"
                    [checked]="checked().includes($index)"
                    (change)="toggleRubric($index)"
                  />
                  <span class="flex-1 text-[0.95rem] leading-snug">{{ r.item }}</span>
                  <span class="chip shrink-0">{{ r.points }}đ</span>
                </label>
              }
              <div class="flex items-center justify-between border-t border-line px-2 pt-3">
                <span class="font-display text-xl font-bold"
                  ><span class="text-gradient">{{ score() }}</span
                  >/{{ maxScore() }} điểm</span
                >
                <button type="button" class="btn-primary" (click)="finish()">
                  {{ state()?.doneOn ? 'Cập nhật điểm' : 'Hoàn thành' }}
                </button>
              </div>
            </div>
          </section>

          <section class="mb-6">
            <h2 class="mb-2 text-lg font-semibold">Lời giải tham khảo</h2>
            <div
              class="glass markdown prose prose-slate max-w-none rounded-2xl p-5 dark:prose-invert"
              [innerHTML]="solutionHtml()"
            ></div>
          </section>

          <section class="mb-6">
            <h2 class="mb-2 text-lg font-semibold">Lỗi hay gặp</h2>
            <ul class="glass space-y-2 rounded-2xl p-4 text-[0.95rem]">
              @for (p of ch.pitfalls; track p) {
                <li class="flex gap-2">
                  <app-icon name="x" [size]="15" class="mt-1 text-rose-500" /> <span>{{ p }}</span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    }
  `,
})
export class Challenge {
  protected readonly kb = inject(KnowledgeService);
  protected readonly store = inject(LearningStore);
  private readonly md = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);

  protected readonly vars = topicVars;
  protected readonly difficulty = DIFFICULTY;
  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly c = computed(() => this.kb.challenges().find((x) => x.id === this.id()));
  protected readonly state = computed(() => this.store.challenges()[this.id()]);
  protected readonly hintsShown = signal(0);
  protected readonly revealed = signal(false);
  protected readonly checked = signal<number[]>([]);
  private readonly typed = signal<string | null>(null);

  protected readonly draft = computed(() => this.typed() ?? this.state()?.draft ?? '');
  protected readonly maxScore = computed(
    () => this.c()?.rubric.reduce((a, r) => a + r.points, 0) ?? 0,
  );
  protected readonly score = computed(() => {
    const rubric = this.c()?.rubric ?? [];
    return this.checked().reduce((a, i) => a + (rubric[i]?.points ?? 0), 0);
  });
  protected readonly solutionHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.md.render(this.c()?.solution ?? '').html),
  );

  constructor() {
    // Reset per-attempt UI when navigating between challenges.
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.typed.set(null);
        this.revealed.set(false);
        this.hintsShown.set(0);
        this.checked.set(this.store.challenges()[id]?.checked ?? []);
      });
    });
  }

  protected onDraft(e: Event): void {
    const v = (e.target as HTMLTextAreaElement).value;
    this.typed.set(v);
    this.store.saveDraft(this.id(), v);
  }

  protected toggleRubric(i: number): void {
    this.checked.update((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  }

  protected finish(): void {
    this.store.finishChallenge(this.id(), this.score(), this.maxScore(), this.checked());
  }
}
