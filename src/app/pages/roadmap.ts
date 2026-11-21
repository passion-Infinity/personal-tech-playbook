import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { KnowledgeService, levelName } from '../core/knowledge.service';
import { LearningStore } from '../core/learning.store';
import { Playbook } from '../core/models';
import { PracticeService } from '../core/practice.service';
import { topicStyle, topicVars } from '../core/topic-style';
import { Icon } from '../shared/icon';

interface Edge {
  from: string;
  to: string;
  d: string;
}
type NodeState = 'read' | 'ready' | 'waiting';

@Component({
  selector: 'app-roadmap',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:resize)': 'schedule()' },
  template: `
    <header class="fade-up mb-6">
      <p class="eyebrow flex items-center gap-2"><app-icon name="map" [size]="14" /> Roadmap</p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">
        Lộ trình học <span class="text-gradient">từ nền tảng đến chuyên sâu</span>
      </h1>
      <p class="mt-3 max-w-3xl text-muted">
        Đọc từ <b class="text-ink">trái sang phải</b>: bài ở tầng cao hơn xây trên các bài nối vào
        nó. Bài không phụ thuộc nhau nằm <b class="text-ink">cùng một tầng</b>. Rê chuột vào một bài
        để thấy chuỗi tiên quyết và các bài nó mở khoá.
      </p>
      <div class="mt-5 grid max-w-xl grid-cols-3 gap-3">
        <div class="glass rounded-2xl p-3">
          <p class="text-xs text-muted">Đã đọc</p>
          <p class="font-display text-2xl font-bold">
            {{ readCount() }}<span class="text-sm text-muted">/{{ kb.playbooks().length }}</span>
          </p>
        </div>
        <div class="glass rounded-2xl p-3">
          <p class="text-xs text-muted">Số tầng</p>
          <p class="font-display text-2xl font-bold">{{ kb.maxLevel() + 1 }}</p>
        </div>
        <div class="glass rounded-2xl p-3">
          <p class="text-xs text-muted">Sẵn sàng đọc</p>
          <p class="font-display text-2xl font-bold">{{ readyCount() }}</p>
        </div>
      </div>
    </header>

    @if (next().length) {
      <section class="mb-8" aria-labelledby="next-title">
        <h2 id="next-title" class="mb-3 flex items-center gap-2 text-lg font-semibold">
          <app-icon name="target" class="text-accent-ink" /> Tiếp theo nên học
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          @for (p of next(); track p.id) {
            <a
              [routerLink]="['/playbooks', p.id]"
              class="glass glass-hover relative overflow-hidden rounded-2xl p-4 pt-5"
              [style]="vars(p.topicId)"
            >
              <span class="topic-gradient absolute inset-x-0 top-0 h-1"></span>
              <p class="text-xs text-muted">
                Tầng {{ kb.levels().get(p.id) }} · {{ kb.topicById().get(p.topicId)?.name }}
              </p>
              <p class="mt-1 font-semibold leading-snug">{{ p.title }}</p>
            </a>
          }
        </div>
      </section>
    }

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <a routerLink="/roadmap" class="chip-filter" [class.chip-active]="!track()"
        >Tất cả {{ kb.playbooks().length }}</a
      >
      @for (t of kb.topics(); track t.id) {
        <a
          routerLink="/roadmap"
          [queryParams]="{ track: t.id }"
          class="chip-filter"
          [class.chip-active]="track() === t.id"
        >
          {{ t.name }}
          <span class="opacity-60">{{ kb.playbookCountByTopic().get(t.id) ?? 0 }}</span>
        </a>
      }
    </div>
    <div class="mb-5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5"
        ><span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Đã đọc</span
      >
      <span class="inline-flex items-center gap-1.5"
        ><span class="h-2.5 w-2.5 rounded-full bg-violet-400"></span> Sẵn sàng (đã đọc các bài tiên
        quyết)</span
      >
      <span class="inline-flex items-center gap-1.5"
        ><span class="h-2.5 w-2.5 rounded-full bg-slate-500"></span> Nên đọc tiên quyết trước</span
      >
    </div>

    @if (!kb.loaded()) {
      <div class="glass h-64 animate-pulse rounded-3xl"></div>
    } @else {
      <div class="-mx-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:px-0 [scrollbar-gutter:auto]">
        <div
          #wrap
          class="relative flex flex-col gap-8 lg:inline-flex lg:min-w-full lg:flex-row lg:gap-16"
        >
          <svg
            class="pointer-events-none absolute left-0 top-0 hidden overflow-visible lg:block"
            [attr.width]="size().w"
            [attr.height]="size().h"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0 10 5 0 10z" fill="currentColor" />
              </marker>
            </defs>
            @for (e of edges(); track e.from + e.to) {
              <path
                [attr.d]="e.d"
                fill="none"
                marker-end="url(#arrow)"
                class="transition-opacity"
                [class.text-violet-400]="isActive(e)"
                [class.text-slate-500]="!isActive(e)"
                [attr.stroke]="'currentColor'"
                [attr.stroke-width]="isActive(e) ? 2.2 : 1.4"
                [attr.opacity]="hover() && !isActive(e) ? 0.12 : 0.75"
              />
            }
          </svg>

          @for (col of columns(); track col.level) {
            <section class="w-full lg:w-64 lg:shrink-0" [attr.aria-label]="'Tầng ' + col.level">
              <h3 class="mb-3 flex items-baseline gap-2">
                <span
                  class="font-display text-sm font-bold uppercase tracking-wider text-accent-ink"
                  >Tầng {{ col.level }}</span
                >
                <span class="text-xs text-muted">{{ name(col.level) }}</span>
              </h3>
              <div class="flex flex-col gap-3">
                @for (n of col.nodes; track n.p.id) {
                  <a
                    [routerLink]="['/playbooks', n.p.id]"
                    [attr.data-node]="n.p.id"
                    class="glass glass-hover relative block overflow-hidden rounded-2xl p-3.5 pl-4"
                    [class.ring-2]="n.state === 'ready'"
                    [class.ring-violet-400]="n.state === 'ready'"
                    [class.opacity-60]="dim(n.p.id)"
                    [style]="vars(n.p.topicId)"
                    (mouseenter)="hover.set(n.p.id)"
                    (mouseleave)="hover.set(null)"
                    (focus)="hover.set(n.p.id)"
                    (blur)="hover.set(null)"
                  >
                    <span class="topic-gradient absolute inset-y-0 left-0 w-1"></span>
                    <div class="flex items-start justify-between gap-2">
                      <span
                        class="text-[0.68rem] font-semibold uppercase tracking-wider topic-text"
                        >{{ kb.topicById().get(n.p.topicId)?.name }}</span
                      >
                      @if (n.state === 'read') {
                        <app-icon name="check" [size]="15" class="text-emerald-500" />
                      } @else if (n.state === 'ready') {
                        <span class="h-2.5 w-2.5 rounded-full bg-violet-400"></span>
                      } @else {
                        <app-icon name="lock" [size]="13" class="text-muted" />
                      }
                    </div>
                    <p class="mt-1 text-[0.95rem] font-semibold leading-snug">{{ n.p.title }}</p>
                    @if (n.pre.length) {
                      <p class="mt-2 line-clamp-2 text-xs text-muted">Cần: {{ n.preNames }}</p>
                    }
                  </a>
                }
              </div>
            </section>
          }
        </div>
      </div>
    }
  `,
})
export class Roadmap {
  protected readonly kb = inject(KnowledgeService);
  private readonly store = inject(LearningStore);
  private readonly practice = inject(PracticeService);
  private readonly route = inject(ActivatedRoute);
  private readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');

  protected readonly vars = topicVars;
  protected readonly style = topicStyle;
  protected readonly name = levelName;
  protected readonly hover = signal<string | null>(null);
  protected readonly edges = signal<Edge[]>([]);
  protected readonly size = signal({ w: 0, h: 0 });

  protected readonly track = toSignal(this.route.queryParamMap.pipe(map((q) => q.get('track'))), {
    initialValue: null,
  });

  protected readonly readCount = computed(() => this.store.read().size);
  protected readonly next = computed(() => this.practice.nextUp(4));
  protected readonly readyCount = computed(
    () =>
      this.kb.playbooks().filter((p) => !this.store.isRead(p.id) && this.practice.isReady(p))
        .length,
  );

  /** Levels that actually contain playbooks for the current filter, each with its nodes. */
  protected readonly columns = computed(() => {
    const t = this.track();
    const levels = this.kb.levels();
    const pre = this.kb.prereqs();
    const byId = this.kb.playbookById();
    const read = this.store.read();
    const topicOrder = new Map(this.kb.topics().map((tp, i) => [tp.id, i]));
    const groups = new Map<number, Playbook[]>();
    for (const p of this.kb.playbooks()) {
      if (t && p.topicId !== t) continue;
      const l = levels.get(p.id) ?? 0;
      groups.set(l, [...(groups.get(l) ?? []), p]);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([level, list]) => ({
        level,
        nodes: list
          .sort(
            (a, b) =>
              (topicOrder.get(a.topicId) ?? 99) - (topicOrder.get(b.topicId) ?? 99) ||
              a.title.localeCompare(b.title),
          )
          .map((p) => {
            const ids = pre.get(p.id) ?? [];
            const state: NodeState = read.has(p.id)
              ? 'read'
              : ids.every((i) => read.has(i))
                ? 'ready'
                : 'waiting';
            return {
              p,
              pre: ids,
              state,
              preNames: ids.map((i) => byId.get(i)?.title ?? i).join(' · '),
            };
          }),
      }));
  });

  /** Playbooks on the hovered playbook's prerequisite / unlock chain. */
  private readonly chain = computed(() => {
    const h = this.hover();
    if (!h) return null;
    return new Set([h, ...this.kb.ancestors(h), ...this.kb.descendants(h)]);
  });

  /** [prerequisite, playbook] pairs to draw: everything in a single track, or just the hovered chain. */
  private readonly pairs = computed<Array<[string, string]>>(() => {
    const chain = this.chain();
    const t = this.track();
    const visible = new Set(this.columns().flatMap((c) => c.nodes.map((n) => n.p.id)));
    const out: Array<[string, string]> = [];
    for (const [id, pre] of this.kb.prereqs()) {
      for (const p of pre) {
        if (!visible.has(id) || !visible.has(p)) continue;
        if (t || (chain && chain.has(id) && chain.has(p))) out.push([p, id]);
      }
    }
    return out;
  });

  constructor() {
    effect(() => {
      this.pairs();
      this.columns();
      this.schedule();
    });
  }

  protected dim(id: string): boolean {
    const c = this.chain();
    return !!c && !c.has(id);
  }

  protected isActive(e: Edge): boolean {
    const c = this.chain();
    return !c || (c.has(e.from) && c.has(e.to));
  }

  protected schedule(): void {
    setTimeout(() => this.measure());
  }

  private measure(): void {
    const el = this.wrap()?.nativeElement;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const pos = new Map<string, DOMRect>();
    el.querySelectorAll<HTMLElement>('[data-node]').forEach((n) =>
      pos.set(n.dataset['node']!, n.getBoundingClientRect()),
    );
    const out: Edge[] = [];
    for (const [from, to] of this.pairs()) {
      const a = pos.get(from);
      const b = pos.get(to);
      if (!a || !b) continue;
      const x1 = a.right - box.left;
      const y1 = a.top + a.height / 2 - box.top;
      const x2 = b.left - box.left - 4;
      const y2 = b.top + b.height / 2 - box.top;
      const dx = Math.max(36, Math.abs(x2 - x1) / 2);
      out.push({ from, to, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}` });
    }
    this.edges.set(out);
    this.size.set({ w: el.scrollWidth, h: el.scrollHeight });
  }
}
