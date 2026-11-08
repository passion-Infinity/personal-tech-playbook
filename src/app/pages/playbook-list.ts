import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { KnowledgeService } from '../core/knowledge.service';
import { UiService } from '../core/ui.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-playbook-list',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-accent-ink">
        {{ topic() ? 'Topic' : 'Library' }}
      </p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {{ topic()?.name ?? 'All Playbooks' }}
      </h1>
      <p class="mt-2 max-w-2xl text-muted">
        {{
          topic()?.description ??
            'Short, deep, actionable engineering playbooks. Everything is cached for offline reading.'
        }}
      </p>
    </header>

    <div class="mb-5 flex flex-wrap gap-2">
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
      <p
        class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300"
      >
        {{ kb.error() }}
      </p>
    } @else if (!kb.loaded()) {
      <div class="grid gap-4 md:grid-cols-2">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="h-40 animate-pulse rounded-xl border border-line bg-surface"></div>
        }
      </div>
    } @else {
      <div class="grid gap-4 md:grid-cols-2">
        @for (p of playbooks(); track p.id) {
          <a
            [routerLink]="['/playbooks', p.id]"
            class="group flex flex-col rounded-xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg"
          >
            <div class="mb-3 flex items-center justify-between gap-2 text-xs">
              <span class="badge">{{ kb.topicById().get(p.topicId)?.name ?? p.topicId }}</span>
              <time class="text-muted" [attr.datetime]="p.updatedAt">{{ p.updatedAt }}</time>
            </div>
            <h2 class="text-lg font-semibold text-ink group-hover:text-accent-ink">
              {{ p.title }}
            </h2>
            <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ p.summary }}</p>
            <div class="mt-4 flex flex-wrap gap-1.5">
              @for (id of p.keywordIds.slice(0, 4); track id) {
                <span class="chip font-mono">{{ kb.keywordById().get(id)?.term ?? id }}</span>
              }
              @if (p.keywordIds.length > 4) {
                <span class="chip">+{{ p.keywordIds.length - 4 }}</span>
              }
            </div>
          </a>
        } @empty {
          <p class="text-muted">No playbooks in this topic yet.</p>
        }
      </div>

      <button
        type="button"
        class="mt-8 flex w-full items-center gap-3 rounded-xl border border-dashed border-line p-4 text-left text-sm text-muted hover:border-accent/60 hover:text-ink lg:hidden"
        (click)="ui.openPalette()"
      >
        <app-icon name="search" /> Search across {{ kb.playbooks().length }} playbooks and
        {{ kb.keywords().length }} search hooks…
      </button>
    }
  `,
})
export class PlaybookList {
  protected readonly kb = inject(KnowledgeService);
  protected readonly ui = inject(UiService);
  private readonly route = inject(ActivatedRoute);

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
}
