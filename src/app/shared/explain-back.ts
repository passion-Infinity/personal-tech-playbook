import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LearningStore } from '../core/learning.store';
import { Question } from '../core/models';
import { Icon } from './icon';

const MIN_CHARS = 30;
const LABELS = ['Chưa đạt', 'Tạm ổn', 'Nắm chắc'];

/** Feynman-style check: explain the idea in your own words, then compare with a model answer. */
@Component({
  selector: 'app-explain-back',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let q = question();
    <section class="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <div
        class="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-400/20 blur-3xl"
      ></div>
      <p class="eyebrow flex items-center gap-2">
        <app-icon name="pencil" [size]="14" /> Explain-back
      </p>
      <h2 class="mt-2 text-lg font-semibold leading-snug sm:text-xl">{{ q.question }}</h2>
      <p class="mt-1 text-sm text-muted">
        Tự viết 3–5 câu bằng lời của mình, không nhìn bài. Viết xong mới xem đáp án mẫu.
      </p>

      <textarea
        class="glass mt-4 min-h-32 w-full resize-y rounded-2xl p-3 text-[0.95rem] leading-relaxed outline-none placeholder:text-muted focus:border-violet-400"
        placeholder="Giải thích bằng lời của bạn…"
        [value]="text()"
        (input)="onInput($event)"
        aria-label="Your explanation"
      ></textarea>

      @if (!revealed()) {
        <div class="mt-3 flex items-center justify-between gap-3">
          <span class="text-xs text-muted"
            >{{ text().trim().length }}/{{ min }} ký tự tối thiểu</span
          >
          <button
            type="button"
            class="btn-primary"
            [disabled]="text().trim().length < min"
            [class.opacity-50]="text().trim().length < min"
            (click)="revealed.set(true)"
          >
            <app-icon name="eye" [size]="16" /> Xem đáp án mẫu
          </button>
        </div>
      } @else {
        <div class="fade-up mt-5 rounded-2xl border border-line bg-accent-soft p-4">
          <p class="text-sm font-semibold text-accent-ink">Đáp án mẫu</p>
          <p class="mt-2 leading-relaxed">{{ q.modelAnswer }}</p>
          @if (q.keyPoints?.length) {
            <p class="mt-4 text-sm font-semibold">Ý chính cần có — tự đối chiếu:</p>
            <ul class="mt-2 space-y-1.5 text-sm">
              @for (k of q.keyPoints; track k) {
                <li class="flex gap-2">
                  <app-icon name="check" [size]="15" class="mt-0.5 text-emerald-500" />
                  <span>{{ k }}</span>
                </li>
              }
            </ul>
          }
        </div>
        @if (!chosen()) {
          <p class="mt-4 text-sm text-muted">
            Câu trả lời của bạn so với đáp án mẫu thế nào?
            @if (previous(); as prev) {
              <span class="text-xs">(Lần trước bạn chấm: {{ labels[prev - 1] }})</span>
            }
          </p>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <button type="button" class="btn-secondary !border-rose-500/40" (click)="rate(1)">
              Chưa đạt
            </button>
            <button type="button" class="btn-secondary" (click)="rate(2)">Tạm ổn</button>
            <button type="button" class="btn-primary" (click)="rate(3)">Nắm chắc</button>
          </div>
        } @else {
          <p class="mt-4 flex items-center gap-2 text-sm text-emerald-500">
            <app-icon name="check" [size]="16" /> Đã ghi nhận ({{ labels[chosen()! - 1] }}).
            {{
              chosen() === 1 ? 'Câu này sẽ quay lại sớm để ôn.' : 'Sẽ được nhắc ôn lại theo lịch.'
            }}
          </p>
        }
      }
    </section>
  `,
})
export class ExplainBack {
  private readonly store = inject(LearningStore);
  readonly question = input.required<Question>();
  readonly rated = output<1 | 2 | 3>();

  protected readonly min = MIN_CHARS;
  protected readonly labels = LABELS;
  protected readonly revealed = signal(false);
  protected readonly chosen = signal<1 | 2 | 3 | null>(null);
  private readonly typed = signal<string | null>(null);

  protected readonly text = computed(
    () => this.typed() ?? this.store.explains()[this.question().id]?.text ?? '',
  );
  /** Rating from an earlier session, shown as a hint; the learner can always rate again. */
  protected readonly previous = computed(() => this.store.explains()[this.question().id]?.rating);

  protected onInput(e: Event): void {
    const v = (e.target as HTMLTextAreaElement).value;
    this.typed.set(v);
    this.store.saveExplain(this.question().id, v, this.previous());
  }

  protected rate(r: 1 | 2 | 3): void {
    this.chosen.set(r);
    this.store.saveExplain(this.question().id, this.text(), r);
    this.store.answer(this.question().id, r >= 2);
    this.rated.emit(r);
  }
}
