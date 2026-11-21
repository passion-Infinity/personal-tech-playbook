import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KnowledgeService } from '../core/knowledge.service';
import { LearningStore } from '../core/learning.store';
import { topicVars } from '../core/topic-style';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-challenges',
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
      <p class="eyebrow flex items-center gap-2">
        <app-icon name="target" [size]="14" /> Design Challenge
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">
        Đề thiết kế & <span class="text-gradient">debug thực tế</span>
      </h1>
      <p class="mt-2 max-w-2xl text-muted">
        Đề giống tình huống đi làm. Tự nghĩ và viết ra trước, rồi mới xem rubric và lời giải để tự
        chấm.
      </p>
    </header>
    <div class="grid gap-4 md:grid-cols-2">
      @for (c of kb.challenges(); track c.id) {
        <a
          [routerLink]="['/practice/challenge', c.id]"
          class="glass glass-hover relative flex flex-col overflow-hidden rounded-2xl p-5 pt-6"
          [style]="vars(c.topicId)"
        >
          <span class="topic-gradient absolute inset-x-0 top-0 h-1"></span>
          <div class="mb-2 flex items-center justify-between text-xs">
            <span class="badge">{{ kb.topicById().get(c.topicId)?.name }}</span>
            <span class="text-muted"
              >{{ '●'.repeat(c.difficulty) }}{{ '○'.repeat(3 - c.difficulty) }}</span
            >
          </div>
          <h2 class="text-lg font-semibold leading-snug">{{ c.title }}</h2>
          <p class="mt-2 line-clamp-3 text-sm text-muted">{{ c.scenario }}</p>
          <div class="mt-auto pt-4 text-xs text-muted">
            @if (store.challenges()[c.id]?.doneOn) {
              <span class="text-emerald-500"
                >✓ Hoàn thành {{ store.challenges()[c.id].score }}/{{
                  store.challenges()[c.id].max
                }}
                điểm</span
              >
            } @else if (store.challenges()[c.id]?.draft) {
              <span>Đang viết dở…</span>
            } @else {
              <span>Chưa làm</span>
            }
          </div>
        </a>
      } @empty {
        <p class="text-muted">Chưa có đề nào.</p>
      }
    </div>
  `,
})
export class Challenges {
  protected readonly kb = inject(KnowledgeService);
  protected readonly store = inject(LearningStore);
  protected readonly vars = topicVars;
}
