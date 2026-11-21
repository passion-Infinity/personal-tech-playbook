import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { FlashcardStore } from '../core/flashcard.store';
import { KnowledgeService } from '../core/knowledge.service';
import { topicStyle, topicVars } from '../core/topic-style';
import { LearningStore } from '../core/learning.store';
import { PracticeService } from '../core/practice.service';
import { UiService } from '../core/ui.service';
import { Icon } from '../shared/icon';

const QUOTES = [
  'Hiểu sâu một khái niệm hôm nay đáng giá hơn lướt qua mười khái niệm.',
  'Mỗi trade-off bạn nắm được là một câu trả lời interview bạn đã có sẵn.',
  'Đọc 5 phút, nhớ cả đời: ôn lại Search Hooks trước khi quên.',
  'Kiến trúc tốt bắt đầu từ việc biết khi nào KHÔNG dùng một pattern.',
  'Consistency in learning beats intensity.',
  'Hôm nay học một điều, ngày mai giải thích được cho người khác.',
];

@Component({
  selector: 'app-playbook-list',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!topicId()) {
      <!-- Hero -->
      <section
        class="glass fade-up relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-10"
        aria-labelledby="hero-title"
      >
        <div
          class="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-500/40 to-cyan-400/30 blur-3xl"
        ></div>
        <p class="eyebrow flex items-center gap-2">
          <app-icon name="sparkles" [size]="14" /> {{ greeting() }}
        </p>
        <h1 id="hero-title" class="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
          Hôm nay học gì <span class="text-gradient">thật sâu</span>?
        </h1>
        <p class="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{{ quote() }}</p>

        <div class="mt-6 flex flex-wrap gap-3">
          <a routerLink="/practice" class="btn-primary">
            <app-icon name="flame" [size]="16" /> Luyện hôm nay
          </a>
          <a routerLink="/roadmap" class="btn-secondary">
            <app-icon name="map" [size]="16" /> Roadmap
          </a>
          <button type="button" class="btn-secondary" (click)="ui.openPalette()">
            <app-icon name="search" [size]="16" /> Tìm kiếm
            <span class="kbd hidden sm:inline-flex">{{ modKey }} K</span>
          </button>
        </div>

        <dl class="mt-8 grid max-w-xl grid-cols-3 gap-3">
          <div class="glass rounded-2xl p-3 sm:p-4">
            <dt class="text-xs text-muted">Playbooks</dt>
            <dd class="mt-1 font-display text-2xl font-bold sm:text-3xl">
              {{ kb.playbooks().length }}
            </dd>
          </div>
          <div class="glass rounded-2xl p-3 sm:p-4">
            <dt class="text-xs text-muted">Search Hooks</dt>
            <dd class="mt-1 font-display text-2xl font-bold sm:text-3xl">
              {{ kb.keywords().length }}
            </dd>
          </div>
          <div class="glass rounded-2xl p-3 sm:p-4">
            <dt class="text-xs text-muted">Đã nhớ</dt>
            <dd class="mt-1 font-display text-2xl font-bold sm:text-3xl">
              <span class="text-gradient">{{ knownPercent() }}%</span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Today -->
      <section class="mb-10" aria-labelledby="today-title">
        <h2 id="today-title" class="mb-4 text-lg font-semibold">Hôm nay</h2>
        <div class="grid gap-4 md:grid-cols-3">
          <a
            routerLink="/practice/drill"
            class="glass glass-hover rounded-2xl p-5"
            style="--t-from:#8b5cf6;--t-to:#6366f1"
          >
            <span class="topic-tile h-10 w-10"><app-icon name="cards" [size]="18" /></span>
            <p class="mt-3 font-semibold">Daily Drill</p>
            <p class="mt-1 text-sm text-muted">
              {{ due() }} câu đến hạn ôn · {{ fresh() }} câu mới
            </p>
          </a>
          @if (challenge(); as ch) {
            <a
              [routerLink]="['/practice/challenge', ch.id]"
              class="glass glass-hover rounded-2xl p-5"
              [style]="vars(ch.topicId)"
            >
              <span class="topic-tile h-10 w-10"><app-icon name="target" [size]="18" /></span>
              <p class="mt-3 font-semibold">Design Challenge</p>
              <p class="mt-1 line-clamp-2 text-sm text-muted">{{ ch.title }}</p>
            </a>
          }
          @if (nextUp()[0]; as n) {
            <a
              [routerLink]="['/playbooks', n.id]"
              class="glass glass-hover rounded-2xl p-5"
              [style]="vars(n.topicId)"
            >
              <span class="topic-tile h-10 w-10"><app-icon name="map" [size]="18" /></span>
              <p class="mt-3 font-semibold">Nên học tiếp</p>
              <p class="mt-1 line-clamp-2 text-sm text-muted">
                Cấp {{ kb.levels().get(n.id) }} · {{ n.title }}
              </p>
            </a>
          }
        </div>
      </section>

      <!-- Topic cards -->
      <section class="mb-10" aria-labelledby="topics-title">
        <h2 id="topics-title" class="mb-4 text-lg font-semibold">Chủ đề</h2>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (t of topicCards(); track t.topic.id; let i = $index) {
            <a
              routerLink="/"
              [queryParams]="{ topic: t.topic.id }"
              class="glass glass-hover fade-up group relative flex flex-col overflow-hidden rounded-2xl p-5"
              [style]="vars(t.topic.id)"
              [style.animation-delay.ms]="i * 60"
            >
              <div
                class="topic-gradient pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition group-hover:opacity-50"
              ></div>
              <span class="topic-tile h-11 w-11">
                <app-icon [name]="style(t.topic.id).icon" [size]="20" />
              </span>
              <h3 class="mt-4 text-lg font-semibold">{{ t.topic.name }}</h3>
              <p class="mt-1 line-clamp-2 text-sm text-muted">{{ t.topic.description }}</p>
              <div class="mt-auto pt-5">
                <div class="mb-1.5 flex justify-between text-xs text-muted">
                  <span>{{ t.playbooks }} playbooks · {{ t.hooks }} hooks</span>
                  <span>{{ t.known }}/{{ t.hooks }} nhớ</span>
                </div>
                <div class="progress-track">
                  <div
                    class="progress-fill"
                    [style.width.%]="t.hooks ? (t.known / t.hooks) * 100 : 0"
                  ></div>
                </div>
              </div>
            </a>
          }
        </div>
      </section>
    } @else {
      <header class="fade-up mb-8" [style]="vars(topicId())">
        <a
          routerLink="/"
          class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <app-icon name="arrowLeft" [size]="14" /> Tất cả playbooks
        </a>
        <div class="flex items-center gap-4">
          <span class="topic-tile h-14 w-14 !rounded-2xl">
            <app-icon [name]="style(topicId()).icon" [size]="26" />
          </span>
          <div>
            <p class="eyebrow">Topic</p>
            <h1 class="topic-text text-3xl font-bold sm:text-4xl">
              {{ topic()?.name ?? topicId() }}
            </h1>
          </div>
        </div>
        <p class="mt-4 max-w-2xl text-muted">{{ topic()?.description }}</p>
        <a routerLink="/flashcards" [queryParams]="{ topic: topicId() }" class="btn-secondary mt-5">
          <app-icon name="cards" [size]="16" /> Ôn flashcards topic này
        </a>
      </header>
    }

    <div class="mb-5 flex flex-wrap items-center gap-2">
      <h2 class="mr-auto text-lg font-semibold">
        {{ topicId() ? 'Playbooks' : 'Mới cập nhật' }}
      </h2>
      <a routerLink="/" class="chip-filter" [class.chip-active]="!topicId()">
        All <span class="opacity-60">{{ kb.playbooks().length }}</span>
      </a>
      @for (t of kb.topics(); track t.id) {
        <a
          routerLink="/"
          [queryParams]="{ topic: t.id }"
          class="chip-filter"
          [class.chip-active]="topicId() === t.id"
        >
          {{ t.name }}
          <span class="opacity-60">{{ kb.playbookCountByTopic().get(t.id) ?? 0 }}</span>
        </a>
      }
    </div>

    @if (kb.error()) {
      <p class="glass rounded-2xl border-red-500/40 p-4 text-sm text-red-500">{{ kb.error() }}</p>
    } @else if (!kb.loaded()) {
      <div class="grid gap-4 md:grid-cols-2">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="glass h-44 animate-pulse rounded-2xl"></div>
        }
      </div>
    } @else {
      <div class="grid gap-4 md:grid-cols-2">
        @for (p of playbooks(); track p.id; let i = $index) {
          <a
            [routerLink]="['/playbooks', p.id]"
            class="glass glass-hover fade-up group relative flex flex-col overflow-hidden rounded-2xl p-5 pt-6"
            [style]="vars(p.topicId)"
            [style.animation-delay.ms]="Math.min(i, 10) * 40"
          >
            <span class="topic-gradient absolute inset-x-0 top-0 h-1 opacity-80"></span>
            <div class="mb-3 flex items-center justify-between gap-2 text-xs">
              <span class="badge">
                <app-icon [name]="style(p.topicId).icon" [size]="12" />
                {{ kb.topicById().get(p.topicId)?.name ?? p.topicId }}
              </span>
              <span class="flex items-center gap-2 text-muted">
                <span class="chip">Cấp {{ kb.levels().get(p.id) ?? 0 }}</span>
                @if (learning.isRead(p.id)) {
                  <app-icon name="check" [size]="14" class="text-emerald-500" />
                }
              </span>
            </div>
            <h3 class="text-lg font-semibold leading-snug transition group-hover:text-accent-ink">
              {{ p.title }}
            </h3>
            <p class="mt-2 text-sm leading-relaxed text-muted">{{ p.summary }}</p>
            <div class="mt-4 flex flex-wrap gap-1.5">
              @for (id of p.keywordIds.slice(0, 3); track id) {
                <span class="chip font-mono">{{ kb.keywordById().get(id)?.term ?? id }}</span>
              }
              @if (p.keywordIds.length > 3) {
                <span class="chip">+{{ p.keywordIds.length - 3 }}</span>
              }
            </div>
            <div class="mt-auto flex items-center gap-3 pt-5 text-xs text-muted">
              <div class="progress-track flex-1">
                <div
                  class="progress-fill"
                  [style.width.%]="(cards.knownCount(p.keywordIds) / p.keywordIds.length) * 100"
                ></div>
              </div>
              <span>{{ cards.knownCount(p.keywordIds) }}/{{ p.keywordIds.length }} hooks</span>
              <app-icon
                name="arrowRight"
                [size]="15"
                class="text-accent-ink transition group-hover:translate-x-1"
              />
            </div>
          </a>
        } @empty {
          <p class="text-muted">Chưa có playbook trong topic này.</p>
        }
      </div>
    }
  `,
})
export class PlaybookList {
  protected readonly kb = inject(KnowledgeService);
  protected readonly ui = inject(UiService);
  protected readonly cards = inject(FlashcardStore);
  protected readonly learning = inject(LearningStore);
  private readonly practice = inject(PracticeService);
  protected readonly due = computed(() => this.practice.dueCount());
  protected readonly fresh = computed(() => this.practice.freshCount());
  protected readonly challenge = computed(() => this.practice.dailyChallenge());
  protected readonly nextUp = computed(() => this.practice.nextUp(1));
  private readonly route = inject(ActivatedRoute);
  protected readonly Math = Math;
  protected readonly style = topicStyle;
  protected readonly vars = topicVars;
  protected readonly modKey = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? '⌘'
    : 'Ctrl';

  protected readonly topicId = toSignal(this.route.queryParamMap.pipe(map((q) => q.get('topic'))), {
    initialValue: null,
  });
  protected readonly topic = computed(() => {
    const id = this.topicId();
    return id ? this.kb.topicById().get(id) : undefined;
  });
  protected readonly playbooks = computed(() => {
    const id = this.topicId();
    const all = this.kb.sortedPlaybooks();
    return id ? all.filter((p) => p.topicId === id) : all;
  });

  protected readonly topicCards = computed(() =>
    this.kb.topics().map((topic) => {
      const ids = this.kb
        .keywords()
        .filter((k) => k.topicId === topic.id)
        .map((k) => k.id);
      return {
        topic,
        playbooks: this.kb.playbookCountByTopic().get(topic.id) ?? 0,
        hooks: ids.length,
        known: this.cards.knownCount(ids),
      };
    }),
  );

  protected readonly knownPercent = computed(() => {
    const ids = this.kb.keywords().map((k) => k.id);
    return ids.length ? Math.round((this.cards.knownCount(ids) / ids.length) * 100) : 0;
  });

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 11
      ? 'Chào buổi sáng'
      : h < 14
        ? 'Chào buổi trưa'
        : h < 18
          ? 'Chào buổi chiều'
          : 'Chào buổi tối';
  });

  /** One quote per day, stable through the day. */
  protected readonly quote = computed(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    return QUOTES[day % QUOTES.length];
  });
}
