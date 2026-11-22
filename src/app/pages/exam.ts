import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { KnowledgeService } from '../core/knowledge.service';
import { Exam, Question } from '../core/models';
import { Icon } from '../shared/icon';

const BEST_KEY = 'playbook-exams-v1';

type Phase = 'intro' | 'running' | 'result';

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Authored questions are not position-balanced, so shuffle options per attempt. */
function shuffleOptions(q: Question): Question {
  const opts = q.options ?? [];
  const order = shuffle(opts.map((_, i) => i));
  return {
    ...q,
    options: order.map((i) => opts[i]),
    answer: (q.answer ?? []).map((a) => order.indexOf(a)).sort((x, y) => x - y),
  };
}

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function saveBest(best: Record<string, number>): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* storage unavailable: best score just is not remembered */
  }
}

@Component({
  selector: 'app-exam',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fade-up mb-6">
      <a
        routerLink="/practice"
        class="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <app-icon name="arrowLeft" [size]="14" /> Luyện tập
      </a>
      <h1 class="text-2xl font-bold sm:text-3xl">
        {{ exam()?.title ?? 'Thi thử' }}
      </h1>
    </header>

    @if (!kb.loaded()) {
      <div class="glass mx-auto h-72 max-w-2xl animate-pulse rounded-3xl"></div>
    } @else if (!exam()) {
      <p class="mb-4 max-w-2xl text-muted">
        Đề thi thử đặt giờ, chấm điểm ở cuối và chỉ ra bài cần học lại. Câu hỏi do Playbook tự
        soạn để luyện tập, không phải đề thi chính thức.
      </p>
      <div class="grid gap-4 md:grid-cols-2">
        @for (e of kb.exams(); track e.id) {
          <a
            [routerLink]="['/practice/exam', e.id]"
            class="glass glass-hover rounded-3xl p-5"
            style="--t-from:#f472b6;--t-to:#8b5cf6"
          >
            <span class="topic-tile h-11 w-11"><app-icon name="target" [size]="20" /></span>
            <h2 class="mt-3 text-lg font-semibold">{{ e.title }}</h2>
            <p class="mt-1 text-sm text-muted">{{ e.description }}</p>
            <p class="mt-3 text-xs text-muted">
              {{ e.questionCount }} câu · {{ e.minutes }} phút · đạt {{ e.passPercent }}%
              @if (best()[e.id] !== undefined) {
                · điểm cao nhất {{ best()[e.id] }}%
              }
            </p>
          </a>
        } @empty {
          <p class="text-muted">Chưa có đề thi.</p>
        }
      </div>
    } @else if (phase() === 'intro') {
      <div class="glass mx-auto max-w-xl rounded-3xl p-6 text-center sm:p-8">
        <p class="text-muted">{{ exam()!.description }}</p>
        <p class="mt-4 font-semibold">
          {{ pool().length < exam()!.questionCount ? pool().length : exam()!.questionCount }} câu ·
          {{ exam()!.minutes }} phút · đạt từ {{ exam()!.passPercent }}%
        </p>
        <ul class="mx-auto mt-4 max-w-sm space-y-1 text-left text-sm text-muted">
          <li>• Không hiện đáp án trong lúc làm; chấm điểm khi nộp bài.</li>
          <li>• Hết giờ hệ thống tự nộp. Có thể đánh dấu câu để xem lại.</li>
          <li>• Câu "chọn tất cả đáp án đúng" phải chọn đủ và đúng.</li>
          <li>• Đây là đề luyện tập tự soạn, không phải đề thi chính thức.</li>
        </ul>
        <button type="button" class="btn-primary mt-6" (click)="start()">
          <app-icon name="target" [size]="16" /> Bắt đầu
        </button>
      </div>
    } @else if (phase() === 'running') {
      @let q = current()!;
      <div class="mx-auto max-w-3xl">
        <div class="glass sticky top-2 z-10 mb-4 rounded-2xl p-3">
          <div class="flex items-center justify-between text-sm">
            <span>Câu {{ index() + 1 }} / {{ questions().length }}</span>
            <span
              class="font-mono font-semibold"
              [class.text-rose-500]="remaining() < 60"
              aria-live="off"
              >{{ clock() }}</span
            >
            <button type="button" class="btn-secondary !py-1 text-xs" (click)="submit(false)">
              Nộp bài
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-1">
            @for (x of questions(); track x.id; let i = $index) {
              <button
                type="button"
                class="h-6 w-6 rounded-md border border-line text-[11px]"
                [class.bg-violet-500]="answered(x.id)"
                [class.text-white]="answered(x.id)"
                [class.!border-amber-400]="flags().has(x.id)"
                [class.ring-2]="i === index()"
                [attr.aria-label]="'Tới câu ' + (i + 1)"
                (click)="index.set(i)"
              >
                {{ i + 1 }}
              </button>
            }
          </div>
        </div>

        <section class="glass fade-up rounded-3xl p-5 sm:p-6">
          <div class="mb-2 text-xs text-muted">
            {{ kb.playbookById().get(q.playbookId)?.title }}
          </div>
          <h2 class="text-lg font-semibold leading-snug sm:text-xl">{{ q.question }}</h2>
          @if ((q.answer?.length ?? 0) > 1) {
            <p class="mt-3 text-xs font-medium text-accent-ink">Chọn tất cả đáp án đúng</p>
          }
          <div class="mt-4 space-y-2" role="group">
            @for (o of q.options ?? []; track $index) {
              <button
                type="button"
                class="glass flex w-full items-start gap-3 rounded-2xl p-3.5 text-left transition hover:border-violet-400/60"
                [class.!border-violet-400]="chosen(q.id).includes($index)"
                (click)="toggle(q, $index)"
              >
                <span
                  class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-xs font-semibold"
                  >{{ letters[$index] }}</span
                >
                <span class="min-w-0 flex-1 break-words">{{ o }}</span>
              </button>
            }
          </div>
          <div class="mt-5 flex flex-wrap justify-between gap-2">
            <button type="button" class="btn-secondary" [disabled]="index() === 0" (click)="go(-1)">
              Câu trước
            </button>
            <button type="button" class="btn-secondary" (click)="toggleFlag(q.id)">
              {{ flags().has(q.id) ? 'Bỏ đánh dấu' : 'Đánh dấu xem lại' }}
            </button>
            @if (index() < questions().length - 1) {
              <button type="button" class="btn-primary" (click)="go(1)">Câu sau</button>
            } @else {
              <button type="button" class="btn-primary" (click)="submit(false)">Nộp bài</button>
            }
          </div>
        </section>
      </div>
    } @else {
      <div class="mx-auto max-w-3xl">
        <section class="glass fade-up rounded-3xl p-6 text-center sm:p-8">
          <h2 class="text-4xl font-bold">
            <span class="text-gradient">{{ score().percent }}%</span>
          </h2>
          <p class="mt-1 text-lg font-semibold" [class.text-emerald-500]="score().passed" [class.text-rose-500]="!score().passed">
            {{ score().passed ? 'Đạt' : 'Chưa đạt' }} (mốc {{ exam()!.passPercent }}%)
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ score().correct }}/{{ questions().length }} câu đúng · thời gian làm
            {{ usedLabel() }}{{ timedOut() ? ' · hết giờ' : '' }}
          </p>
        </section>

        <h3 class="mb-2 mt-6 font-semibold">Theo bài học (yếu nhất trước)</h3>
        <ul class="space-y-2">
          @for (r of breakdown(); track r.id) {
            <li class="glass flex items-center justify-between gap-3 rounded-2xl p-3 text-sm">
              <a [routerLink]="['/playbooks', r.id]" class="min-w-0 flex-1 truncate hover:underline">{{
                r.title
              }}</a>
              <span class="shrink-0 text-muted">{{ r.correct }}/{{ r.total }}</span>
            </li>
          }
        </ul>

        <h3 class="mb-2 mt-6 font-semibold">Xem lại từng câu</h3>
        <ul class="space-y-3">
          @for (x of questions(); track x.id; let i = $index) {
            <li class="glass rounded-2xl p-4">
              <div class="flex items-start gap-2">
                <app-icon
                  [name]="isCorrect(x) ? 'check' : 'x'"
                  [size]="18"
                  [class]="isCorrect(x) ? 'text-emerald-500' : 'text-rose-500'"
                />
                <p class="text-sm font-medium leading-snug">{{ i + 1 }}. {{ x.question }}</p>
              </div>
              <ul class="mt-2 space-y-1 text-sm">
                @for (o of x.options ?? []; track $index) {
                  <li
                    class="rounded-lg px-2 py-1"
                    [class.bg-emerald-500/15]="x.answer?.includes($index)"
                    [class.bg-rose-500/15]="chosen(x.id).includes($index) && !x.answer?.includes($index)"
                  >
                    {{ letters[$index] }}. {{ o }}
                    @if (chosen(x.id).includes($index)) {
                      <span class="text-xs text-muted"> (bạn chọn)</span>
                    }
                  </li>
                }
              </ul>
              @if (x.explanation) {
                <p class="mt-2 text-xs text-muted">{{ x.explanation }}</p>
              }
              <a
                [routerLink]="['/playbooks', x.playbookId]"
                class="mt-2 inline-flex items-center gap-1 text-xs text-accent-ink hover:underline"
              >
                <app-icon name="book" [size]="12" /> Đọc lại:
                {{ kb.playbookById().get(x.playbookId)?.title }}
              </a>
            </li>
          }
        </ul>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" class="btn-primary" (click)="start()">
            <app-icon name="rotate" [size]="16" /> Làm lại với bộ câu mới
          </button>
          <a routerLink="/practice/exam" class="btn-secondary">Chọn đề khác</a>
        </div>
      </div>
    }
  `,
})
export class ExamPage {
  protected readonly kb = inject(KnowledgeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: null,
  });

  protected readonly letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  protected readonly phase = signal<Phase>('intro');
  protected readonly questions = signal<Question[]>([]);
  protected readonly index = signal(0);
  protected readonly answers = signal<Record<string, number[]>>({});
  protected readonly flags = signal<Set<string>>(new Set());
  protected readonly remaining = signal(0);
  protected readonly timedOut = signal(false);
  protected readonly best = signal<Record<string, number>>(loadBest());
  private total = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly exam = computed<Exam | null>(
    () => this.kb.exams().find((e) => e.id === this.id()) ?? null,
  );
  protected readonly current = computed(() => this.questions()[this.index()] ?? null);

  protected readonly pool = computed<Question[]>(() => {
    const e = this.exam();
    if (!e) return [];
    const topics = new Set(e.topicIds);
    const byId = this.kb.playbookById();
    return this.kb
      .questions()
      .filter(
        (q) =>
          q.type === 'mcq' &&
          (q.answer?.length ?? 0) > 0 &&
          topics.has(byId.get(q.playbookId)?.topicId ?? ''),
      );
  });

  protected readonly clock = computed(() => {
    const s = this.remaining();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  protected readonly usedLabel = computed(() => {
    const used = Math.max(0, this.total - this.remaining());
    return `${Math.floor(used / 60)} phút ${used % 60} giây`;
  });

  protected readonly score = computed(() => {
    const qs = this.questions();
    const correct = qs.filter((q) => this.isCorrect(q)).length;
    const percent = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    return { correct, percent, passed: percent >= (this.exam()?.passPercent ?? 70) };
  });

  protected readonly breakdown = computed(() => {
    const m = new Map<string, { id: string; title: string; correct: number; total: number }>();
    for (const q of this.questions()) {
      const r = m.get(q.playbookId) ?? {
        id: q.playbookId,
        title: this.kb.playbookById().get(q.playbookId)?.title ?? q.playbookId,
        correct: 0,
        total: 0,
      };
      r.total++;
      if (this.isCorrect(q)) r.correct++;
      m.set(q.playbookId, r);
    }
    return [...m.values()].sort((a, b) => a.correct / a.total - b.correct / b.total);
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  protected start(): void {
    const e = this.exam();
    if (!e) return;
    this.stopTimer();
    this.questions.set(shuffle(this.pool()).slice(0, e.questionCount).map(shuffleOptions));
    this.answers.set({});
    this.flags.set(new Set());
    this.index.set(0);
    this.timedOut.set(false);
    this.total = e.minutes * 60;
    this.remaining.set(this.total);
    this.phase.set('running');
    this.timer = setInterval(() => {
      this.remaining.update((s) => s - 1);
      if (this.remaining() <= 0) this.submit(true);
    }, 1000);
  }

  protected chosen(id: string): number[] {
    return this.answers()[id] ?? [];
  }

  protected answered(id: string): boolean {
    return this.chosen(id).length > 0;
  }

  protected toggle(q: Question, i: number): void {
    const multi = (q.answer?.length ?? 0) > 1;
    this.answers.update((a) => {
      const cur = a[q.id] ?? [];
      const next = multi
        ? cur.includes(i)
          ? cur.filter((x) => x !== i)
          : [...cur, i]
        : [i];
      return { ...a, [q.id]: next };
    });
  }

  protected toggleFlag(id: string): void {
    this.flags.update((f) => {
      const n = new Set(f);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected go(delta: number): void {
    this.index.update((i) => Math.min(this.questions().length - 1, Math.max(0, i + delta)));
  }

  protected isCorrect(q: Question): boolean {
    const want = [...(q.answer ?? [])].sort();
    const got = [...this.chosen(q.id)].sort();
    return want.length === got.length && want.every((v, i) => v === got[i]);
  }

  protected submit(auto: boolean): void {
    if (this.phase() !== 'running') return;
    this.stopTimer();
    this.timedOut.set(auto);
    this.phase.set('result');
    const e = this.exam();
    if (e) {
      const p = this.score().percent;
      const prev = this.best()[e.id] ?? -1;
      if (p > prev) {
        const next = { ...this.best(), [e.id]: p };
        this.best.set(next);
        saveBest(next);
      }
    }
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
