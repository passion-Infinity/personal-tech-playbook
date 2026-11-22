import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KnowledgeService } from '../core/knowledge.service';
import { LearningStore } from '../core/learning.store';
import { PracticeService } from '../core/practice.service';
import { topicStyle, topicVars } from '../core/topic-style';
import { Icon } from '../shared/icon';
import { I18n } from '../core/i18n.service';

const MESSAGES = [
  'AI viết code rất nhanh — người nắm nền tảng mới biết nó viết đúng hay sai.',
  'Mỗi ngày 10 phút hiệu quả hơn một buổi cuối tuần cày 3 tiếng.',
  'Hiểu "vì sao" là thứ giúp bạn điều phối AI thay vì bị AI dẫn đi.',
  'Đừng chỉ nhớ đáp án — hãy nói được trade-off.',
];

@Component({
  selector: 'app-practice',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="glass fade-up relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-8">
      <div
        class="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-cyan-400/25 blur-3xl"
      ></div>
      <p class="eyebrow flex items-center gap-2">
        <app-icon name="flame" [size]="14" /> {{ i18n.t('Luyện tập mỗi ngày') }}
      </p>
      <h1 class="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
        {{ i18n.t('Rèn') }} <span class="text-gradient">{{ i18n.t('tư duy') }}</span>
        {{ i18n.t('mỗi ngày') }}
      </h1>
      <p class="mt-3 max-w-2xl text-muted sm:text-lg">{{ i18n.t(message) }}</p>

      <div class="mt-6 flex flex-wrap items-center gap-6">
        <div class="flex items-center gap-3">
          <span class="topic-tile h-14 w-14 !rounded-2xl" style="--t-from:#fb923c;--t-to:#ef4444"
            ><app-icon name="flame" [size]="26"
          /></span>
          <div>
            <p class="font-display text-3xl font-bold leading-none">{{ store.streak() }}</p>
            <p class="text-xs text-muted">{{ i18n.t('ngày liên tiếp') }}</p>
          </div>
        </div>
        <div>
          <p class="mb-1.5 text-xs text-muted">
            {{ i18n.t('14 ngày gần nhất · hôm nay {n} hoạt động', { n: store.todayCount() }) }}
          </p>
          <div class="flex gap-1.5">
            @for (d of store.recentDays(); track d.date) {
              <span
                class="h-6 w-4 rounded-md border border-line sm:w-5"
                [class.bg-violet-500]="d.count > 0 && d.count < 6"
                [class.bg-fuchsia-500]="d.count >= 6"
                [title]="d.date + ': ' + d.count"
              ></span>
            }
          </div>
        </div>
      </div>
    </header>

    <h2 class="mb-4 text-lg font-semibold">{{ i18n.t('Bốn cách rèn luyện') }}</h2>
    <div class="grid gap-4 md:grid-cols-2">
      <a
        routerLink="/practice/drill"
        class="glass glass-hover group relative overflow-hidden rounded-3xl p-6"
        style="--t-from:#8b5cf6;--t-to:#6366f1"
      >
        <span class="topic-tile h-12 w-12"><app-icon name="cards" [size]="22" /></span>
        <h3 class="mt-4 text-xl font-semibold">Daily Drill</h3>
        <p class="mt-1 text-sm text-muted">
          {{
            i18n.t('5–7 câu trộn từ các bài đã đọc, ưu tiên phần sắp quên (lặp lại ngắt quãng).')
          }}
        </p>
        <p class="mt-4 text-sm">
          <b class="text-accent-ink">{{ due() }}</b> {{ i18n.t('đến hạn ôn ·') }}
          <b class="text-accent-ink">{{ fresh() }}</b> {{ i18n.t('câu mới sẵn sàng') }}
        </p>
        <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-ink"
          >{{ i18n.t('Bắt đầu') }}
          <app-icon name="arrowRight" [size]="15" class="transition group-hover:translate-x-1"
        /></span>
      </a>

      @if (challenge(); as ch) {
        <a
          [routerLink]="['/practice/challenge', ch.id]"
          class="glass glass-hover group relative overflow-hidden rounded-3xl p-6"
          [style]="vars(ch.topicId)"
        >
          <span class="topic-tile h-12 w-12"><app-icon name="target" [size]="22" /></span>
          <h3 class="mt-4 text-xl font-semibold">{{ i18n.t('Design Challenge hôm nay') }}</h3>
          <p class="mt-1 text-sm text-muted">
            {{ i18n.t('Một đề thiết kế/debug thực tế: tự viết giải pháp rồi chấm theo rubric.') }}
          </p>
          <p class="mt-4 text-sm font-medium">{{ ch.title }}</p>
          <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-ink"
            >{{ i18n.t('Làm đề này') }}
            <app-icon name="arrowRight" [size]="15" class="transition group-hover:translate-x-1"
          /></span>
        </a>
      }

      <a
        routerLink="/practice/drill"
        [queryParams]="{ type: 'bug' }"
        class="glass glass-hover group relative overflow-hidden rounded-3xl p-6"
        style="--t-from:#f43f5e;--t-to:#f59e0b"
      >
        <span class="topic-tile h-12 w-12"><app-icon name="bug" [size]="22" /></span>
        <h3 class="mt-4 text-xl font-semibold">{{ i18n.t('Review điều phối AI') }}</h3>
        <p class="mt-1 text-sm text-muted">
          {{
            i18n.t(
              'Đoạn code "do AI sinh ra" chứa lỗi tinh vi (race condition, N+1, thiếu idempotency…). Bạn phải tìm ra.'
            )
          }}
        </p>
        <p class="mt-4 text-sm">
          <b class="text-accent-ink">{{ count('bug') }}</b> {{ i18n.t('tình huống') }}
        </p>
        <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-ink"
          >{{ i18n.t('Tìm lỗi') }}
          <app-icon name="arrowRight" [size]="15" class="transition group-hover:translate-x-1"
        /></span>
      </a>

      <a
        routerLink="/practice/drill"
        [queryParams]="{ type: 'explain' }"
        class="glass glass-hover group relative overflow-hidden rounded-3xl p-6"
        style="--t-from:#22d3ee;--t-to:#3b82f6"
      >
        <span class="topic-tile h-12 w-12"><app-icon name="pencil" [size]="22" /></span>
        <h3 class="mt-4 text-xl font-semibold">Explain-back</h3>
        <p class="mt-1 text-sm text-muted">
          {{
            i18n.t(
              'Giải thích một khái niệm bằng lời của mình (Feynman), rồi so với đáp án mẫu. Đọc xong chưa chắc đã hiểu.'
            )
          }}
        </p>
        <p class="mt-4 text-sm">
          <b class="text-accent-ink">{{ count('explain') }}</b> {{ i18n.t('câu hỏi') }}
        </p>
        <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-ink"
          >{{ i18n.t('Viết thử') }}
          <app-icon name="arrowRight" [size]="15" class="transition group-hover:translate-x-1"
        /></span>
      </a>
    </div>

    <section class="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h2 class="mb-3 text-lg font-semibold">{{ i18n.t('Luyện theo chủ đề') }}</h2>
        <div class="flex flex-wrap gap-2">
          @for (t of kb.topics(); track t.id) {
            <a
              routerLink="/practice/drill"
              [queryParams]="{ topic: t.id }"
              class="chip-filter"
              [style]="vars(t.id)"
            >
              <span class="topic-tile h-5 w-5 !rounded-md"
                ><app-icon [name]="style(t.id).icon" [size]="11"
              /></span>
              {{ t.name }}
            </a>
          }
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <a routerLink="/practice/challenges" class="btn-secondary justify-start"
          ><app-icon name="target" [size]="16" />
          {{ i18n.t('Tất cả đề thiết kế ({n})', { n: kb.challenges().length }) }}</a
        >
        <a routerLink="/practice/exam" class="btn-secondary justify-start"
          ><app-icon name="target" [size]="16" />
          {{ i18n.t('Thi thử đặt giờ ({n} đề)', { n: kb.exams().length }) }}</a
        >
        <a routerLink="/flashcards" class="btn-secondary justify-start"
          ><app-icon name="cards" [size]="16" /> {{ i18n.t('Flashcards từ khoá') }}</a
        >
        <a routerLink="/roadmap" class="btn-secondary justify-start"
          ><app-icon name="map" [size]="16" /> {{ i18n.t('Roadmap lộ trình') }}</a
        >
      </div>
    </section>
  `,
})
export class Practice {
  protected readonly i18n = inject(I18n);
  protected readonly kb = inject(KnowledgeService);
  protected readonly store = inject(LearningStore);
  private readonly practice = inject(PracticeService);
  protected readonly vars = topicVars;
  protected readonly style = topicStyle;
  protected readonly message = MESSAGES[Math.floor(Date.now() / 86_400_000) % MESSAGES.length];

  protected readonly due = computed(() => this.practice.dueCount());
  protected readonly fresh = computed(() => this.practice.freshCount());
  protected readonly challenge = computed(() => this.practice.dailyChallenge());

  protected count(type: 'bug' | 'explain'): number {
    return this.kb.questions().filter((q) => q.type === type).length;
  }
}
