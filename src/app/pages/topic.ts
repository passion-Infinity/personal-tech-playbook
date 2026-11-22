import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { KnowledgeService, levelName } from '../core/knowledge.service';
import { LearningStore } from '../core/learning.store';
import { Playbook } from '../core/models';
import { topicStyle, topicVars } from '../core/topic-style';
import { Icon } from '../shared/icon';
import { I18n } from '../core/i18n.service';

interface Row {
  p: Playbook;
  n: number;
  prereqs: Array<{ p: Playbook; sameTopic: boolean }>;
  state: 'read' | 'ready' | 'waiting';
}
interface Group {
  level: number;
  rows: Row[];
}

/** A topic as a course outline: numbered lessons grouped by level, with "read first" links. */
@Component({
  selector: 'app-topic',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!kb.loaded()) {
      <div class="glass h-64 animate-pulse rounded-3xl"></div>
    } @else if (!topic()) {
      <div class="py-20 text-center">
        <h1 class="text-2xl font-bold">{{ i18n.t('Không tìm thấy chủ đề') }}</h1>
        <a routerLink="/" class="btn-primary mt-6">{{ i18n.t('Về trang chủ') }}</a>
      </div>
    } @else {
      @let t = topic()!;
      <div [style]="vars(t.id)">
        <a
          routerLink="/"
          class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <app-icon name="arrowLeft" [size]="14" /> {{ i18n.t('Tất cả playbooks') }}
        </a>

        <header class="glass fade-up relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-8">
          <div
            class="topic-gradient pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
          ></div>
          <div class="relative flex items-start gap-4">
            <span class="topic-tile h-14 w-14 shrink-0 !rounded-2xl"
              ><app-icon [name]="style(t.id).icon" [size]="26"
            /></span>
            <div class="min-w-0">
              <p class="eyebrow">{{ i18n.t('Lộ trình chủ đề') }}</p>
              <h1 class="topic-text text-3xl font-bold sm:text-4xl">{{ t.name }}</h1>
              <p class="mt-2 max-w-2xl text-muted">{{ t.description }}</p>
            </div>
          </div>
          <div class="relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div class="min-w-48 flex-1">
              <div class="mb-1.5 flex justify-between text-xs text-muted">
                <span>{{
                  i18n.t('{n}/{total} bài đã đọc', { n: readCount(), total: total() })
                }}</span>
                <span>{{ percent() }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="percent()"></div>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (resume(); as r) {
                <a [routerLink]="['/playbooks', r.id]" class="btn-primary">
                  <app-icon name="arrowRight" [size]="16" />
                  {{ readCount() ? i18n.t('Tiếp tục') : i18n.t('Bắt đầu') }}: {{ r.title }}
                </a>
              } @else {
                <span class="chip !text-emerald-500">{{ i18n.t('✓ Đã đọc hết chủ đề') }}</span>
              }
              <a routerLink="/practice/drill" [queryParams]="{ topic: t.id }" class="btn-secondary">
                <app-icon name="lightbulb" [size]="16" /> {{ i18n.t('Luyện chủ đề') }}
              </a>
            </div>
          </div>
        </header>

        @if (external().length) {
          <section class="glass mb-8 rounded-2xl p-4">
            <p class="mb-2 flex items-center gap-2 text-sm font-semibold">
              <app-icon name="lock" [size]="14" class="text-accent-ink" />
              {{ i18n.t('Nên nắm trước từ chủ đề khác') }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              @for (e of external(); track e.id) {
                <a [routerLink]="['/playbooks', e.id]" class="chip hover:!text-ink">
                  @if (learning.isRead(e.id)) {
                    <app-icon name="check" [size]="12" class="text-emerald-500" />
                  }
                  {{ e.title }} · {{ kb.topicById().get(e.topicId)?.name }}
                </a>
              }
            </div>
          </section>
        }

        <ol class="space-y-8">
          @for (g of groups(); track g.level) {
            <li>
              <div class="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h2 class="font-display text-sm font-bold uppercase tracking-wider text-accent-ink">
                  {{ i18n.t('Cấp {n} ·', { n: g.level }) }} {{ name(g.level, i18n.lang()) }}
                </h2>
                @if (g.rows.length > 1) {
                  <span class="text-xs text-muted">{{
                    i18n.t('{n} bài độc lập — đọc thứ tự nào cũng được', { n: g.rows.length })
                  }}</span>
                }
              </div>
              <ul class="space-y-3">
                @for (r of g.rows; track r.p.id) {
                  <li>
                    <a
                      [routerLink]="['/playbooks', r.p.id]"
                      class="glass glass-hover group relative flex gap-4 overflow-hidden rounded-2xl p-4 pl-5"
                      [class.ring-2]="r.state === 'ready'"
                      [class.ring-violet-400]="r.state === 'ready'"
                    >
                      <span class="topic-gradient absolute inset-y-0 left-0 w-1"></span>
                      <span
                        class="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                        [class]="
                          r.state === 'read'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-accent-soft text-accent-ink'
                        "
                      >
                        @if (r.state === 'read') {
                          <app-icon name="check" [size]="16" />
                        } @else {
                          {{ r.n }}
                        }
                      </span>
                      <div class="min-w-0 flex-1">
                        <h3
                          class="text-[1.02rem] font-semibold leading-snug group-hover:text-accent-ink"
                        >
                          {{ r.p.title }}
                        </h3>
                        <p class="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                          {{ r.p.summary }}
                        </p>
                        @if (r.prereqs.length) {
                          <p class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            {{ i18n.t('Đọc trước:') }}
                            @for (x of r.prereqs; track x.p.id) {
                              <span class="chip">
                                @if (learning.isRead(x.p.id)) {
                                  <app-icon name="check" [size]="11" class="text-emerald-500" />
                                }
                                {{ x.p.title
                                }}{{
                                  x.sameTopic
                                    ? ''
                                    : ' · ' + (kb.topicById().get(x.p.topicId)?.name ?? '')
                                }}
                              </span>
                            }
                          </p>
                        }
                      </div>
                      @if (r.state === 'ready') {
                        <span class="chip hidden self-start sm:inline-flex !text-violet-400">{{
                          i18n.t('Sẵn sàng')
                        }}</span>
                      }
                    </a>
                  </li>
                }
              </ul>
            </li>
          }
        </ol>
      </div>
    }
  `,
})
export class TopicPage {
  protected readonly i18n = inject(I18n);
  protected readonly kb = inject(KnowledgeService);
  protected readonly learning = inject(LearningStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly vars = topicVars;
  protected readonly style = topicStyle;
  protected readonly name = levelName;

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });
  protected readonly topic = computed(() => this.kb.topicById().get(this.id()));
  private readonly items = computed(() => this.kb.orderedByTopic().get(this.id()) ?? []);

  protected readonly groups = computed<Group[]>(() => {
    const local = this.kb.localLevels();
    const pre = this.kb.prereqs();
    const byId = this.kb.playbookById();
    const read = this.learning.read();
    const out = new Map<number, Row[]>();
    this.items().forEach((p, i) => {
      const ids = pre.get(p.id) ?? [];
      const prereqs = ids
        .map((x) => byId.get(x))
        .filter((x): x is Playbook => !!x)
        .map((x) => ({ p: x, sameTopic: x.topicId === p.topicId }));
      const state: Row['state'] = read.has(p.id)
        ? 'read'
        : ids.every((x) => read.has(x))
          ? 'ready'
          : 'waiting';
      const l = local.get(p.id) ?? 0;
      out.set(l, [...(out.get(l) ?? []), { p, n: i + 1, prereqs, state }]);
    });
    return [...out.entries()].sort((a, b) => a[0] - b[0]).map(([level, rows]) => ({ level, rows }));
  });

  protected readonly total = computed(() => this.items().length);
  protected readonly readCount = computed(
    () => this.items().filter((p) => this.learning.isRead(p.id)).length,
  );
  protected readonly percent = computed(() =>
    this.total() ? Math.round((this.readCount() / this.total()) * 100) : 0,
  );
  /** First unread lesson in reading order. */
  protected readonly resume = computed(() => this.items().find((p) => !this.learning.isRead(p.id)));

  /** Prerequisites that belong to other topics. */
  protected readonly external = computed(() => {
    const pre = this.kb.prereqs();
    const byId = this.kb.playbookById();
    const seen = new Set<string>();
    const out: Playbook[] = [];
    for (const p of this.items()) {
      for (const id of pre.get(p.id) ?? []) {
        const x = byId.get(id);
        if (x && x.topicId !== this.id() && !seen.has(id)) {
          seen.add(id);
          out.push(x);
        }
      }
    }
    return out;
  });
}
