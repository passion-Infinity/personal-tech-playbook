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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClipboardService } from '../core/clipboard.service';
import { FlashcardStore } from '../core/flashcard.store';
import { KnowledgeService } from '../core/knowledge.service';
import { Keyword } from '../core/models';
import { googleUrl } from '../core/search';
import { topicStyle, topicVars } from '../core/topic-style';
import { UiService } from '../core/ui.service';
import { Icon } from '../shared/icon';

const SWIPE_THRESHOLD = 90;
const CONFETTI_COLORS = ['#a78bfa', '#22d3ee', '#f472b6', '#fbbf24', '#34d399'];

@Component({
  selector: 'app-flashcards',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <header class="fade-up mb-4 sm:mb-6">
      <p class="eyebrow flex items-center gap-2">
        <app-icon name="cards" [size]="14" /> Flashcards
      </p>
      <h1 class="mt-2 text-2xl font-bold sm:text-4xl">
        Ôn <span class="text-gradient">Search Hooks</span>
      </h1>
      <p class="mt-2 hidden max-w-2xl text-muted sm:block">
        Nhìn term tiếng Anh, tự nhớ nghĩa, rồi lật thẻ kiểm tra. Đã nhớ
        <b class="text-ink">{{ knownAll() }}/{{ kb.keywords().length }}</b> hooks.
      </p>
    </header>

    <!-- Filters -->
    <div
      class="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0"
    >
      @if (playbookFilter(); as pb) {
        <span class="chip-filter chip-active" [style]="vars(pb.topicId)">
          <app-icon name="book" [size]="14" /> {{ pb.title }}
          <a
            routerLink="/flashcards"
            class="-mr-1 ml-1 rounded-full p-0.5 hover:bg-accent-soft"
            aria-label="Clear playbook filter"
          >
            <app-icon name="x" [size]="13" />
          </a>
        </span>
      } @else {
        <a routerLink="/flashcards" class="chip-filter" [class.chip-active]="!topicId()">
          All <span class="opacity-60">{{ kb.keywords().length }}</span>
        </a>
        @for (t of kb.topics(); track t.id) {
          <a
            routerLink="/flashcards"
            [queryParams]="{ topic: t.id }"
            class="chip-filter"
            [class.chip-active]="topicId() === t.id"
          >
            {{ t.name }}
            <span class="opacity-60">{{ kb.keywordCountByTopic().get(t.id) ?? 0 }}</span>
          </a>
        }
      }
      <div class="flex gap-2 sm:ml-auto">
        <button
          type="button"
          class="chip-filter"
          [class.chip-active]="onlyUnknown()"
          [attr.aria-pressed]="onlyUnknown()"
          (click)="onlyUnknown.set(!onlyUnknown())"
          title="Chỉ thẻ chưa nhớ"
        >
          <app-icon name="brain" [size]="14" />
          <span class="hidden sm:inline">Chỉ thẻ chưa nhớ</span>
        </button>
        <button
          type="button"
          class="chip-filter"
          (click)="restart(true)"
          title="Xáo bài"
          aria-label="Shuffle"
        >
          <app-icon name="shuffle" [size]="14" /> <span class="hidden sm:inline">Shuffle</span>
        </button>
      </div>
    </div>

    @if (!kb.loaded()) {
      <div class="glass mx-auto h-80 max-w-xl animate-pulse rounded-3xl"></div>
    } @else if (!order().length) {
      <div class="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <app-icon name="trophy" [size]="40" class="text-accent-ink" />
        <h2 class="mt-3 text-2xl font-bold">Bạn đã nhớ hết bộ này!</h2>
        <p class="mt-2 text-muted">
          Tắt "Chỉ thẻ chưa nhớ" để ôn lại toàn bộ, hoặc chọn topic khác.
        </p>
        <button type="button" class="btn-primary mt-6" (click)="onlyUnknown.set(false)">
          <app-icon name="rotate" [size]="16" /> Ôn lại tất cả
        </button>
      </div>
    } @else if (done()) {
      <!-- Session summary -->
      <div
        class="glass fade-up relative mx-auto max-w-xl overflow-hidden rounded-3xl p-8 text-center sm:p-10"
      >
        <div class="confetti" aria-hidden="true">
          @for (c of confetti; track $index) {
            <i
              [style.left.%]="c.left"
              [style.background]="c.color"
              [style.animation-delay.ms]="c.delay"
              [style.animation-duration.ms]="c.duration"
              [style.rotate.deg]="c.rotate"
            ></i>
          }
        </div>
        <span class="topic-tile mx-auto h-16 w-16 !rounded-2xl"
          ><app-icon name="trophy" [size]="30"
        /></span>
        <h2 class="mt-5 text-3xl font-bold">
          <span class="text-gradient">{{ sessionPercent() }}%</span> đã nhớ
        </h2>
        <p class="mt-2 text-muted">
          {{ sessionKnown() }} nhớ · {{ sessionUnknown().length }} cần ôn lại ·
          {{ order().length }} thẻ
        </p>
        @if (sessionUnknown().length) {
          <div class="mt-5 flex flex-wrap justify-center gap-1.5">
            @for (k of sessionUnknown(); track k.id) {
              <span class="chip font-mono">{{ k.term }}</span>
            }
          </div>
        }
        <div class="mt-7 flex flex-wrap justify-center gap-3">
          @if (sessionUnknown().length) {
            <button type="button" class="btn-primary" (click)="reviewUnknown()">
              <app-icon name="rotate" [size]="16" /> Ôn lại thẻ chưa nhớ
            </button>
          }
          <button type="button" class="btn-secondary" (click)="restart(true)">
            <app-icon name="shuffle" [size]="16" /> Bộ mới
          </button>
        </div>
      </div>
    } @else {
      <!-- Session progress -->
      <div class="mx-auto mb-4 max-w-xl">
        <div class="mb-1.5 flex justify-between text-xs text-muted">
          <span>Thẻ {{ index() + 1 }} / {{ order().length }}</span>
          <span>
            <span class="text-emerald-500">✓ {{ sessionKnown() }}</span> ·
            <span class="text-rose-500">✗ {{ sessionUnknown().length }}</span>
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="(index() / order().length) * 100"></div>
        </div>
      </div>

      @for (k of currentList(); track k.id) {
        <div class="fade-up mx-auto max-w-xl [perspective:1400px]" [style]="vars(k.topicId)">
          <div
            class="card-drag relative select-none"
            [style.transform]="'translateX(' + dragX() + 'px) rotate(' + dragX() / 22 + 'deg)'"
            [class.dragging]="dragging()"
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointercancel)="resetDrag()"
          >
            <span class="swipe-hint left-4 text-rose-400" [style.opacity]="-dragX() / 120"
              >Chưa nhớ</span
            >
            <span class="swipe-hint right-4 text-emerald-400" [style.opacity]="dragX() / 120"
              >Nhớ rồi</span
            >
            <div
              class="flip-card relative min-h-[16.5rem] sm:min-h-[23rem]"
              [class.flipped]="flipped()"
              role="button"
              tabindex="0"
              [attr.aria-label]="
                flipped()
                  ? 'Answer for ' + k.term
                  : 'Flashcard: ' + k.term + '. Press Space to flip.'
              "
            >
              <!-- Front -->
              <div
                class="face glass-strong flex flex-col items-center justify-center rounded-3xl p-8 text-center"
              >
                <div
                  class="topic-gradient pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
                ></div>
                <span class="badge absolute left-5 top-5">
                  <app-icon [name]="style(k.topicId).icon" [size]="12" />
                  {{ kb.topicById().get(k.topicId)?.name ?? k.topicId }}
                </span>
                @if (cards.isKnown(k.id)) {
                  <span class="chip absolute right-5 top-5 !text-emerald-500">✓ đã nhớ</span>
                }
                <h2 class="relative font-display text-3xl font-bold leading-tight sm:text-4xl">
                  {{ k.term }}
                </h2>
                <p class="relative mt-6 text-sm text-muted">
                  Nghĩa là gì? Chạm để lật<span class="hidden sm:inline">
                    · <kbd class="kbd">Space</kbd></span
                  >
                </p>
              </div>
              <!-- Back -->
              <div class="face back glass-strong flex flex-col rounded-3xl p-6 sm:p-8">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-mono text-sm text-muted">{{ k.term }}</p>
                  <div class="-mr-2 -mt-2 flex">
                    <button
                      type="button"
                      class="icon-btn"
                      (click)="copy(k)"
                      [attr.aria-label]="'Copy ' + k.term"
                    >
                      <app-icon
                        [name]="clipboard.lastCopied() === 'fc:' + k.id ? 'check' : 'copy'"
                        [size]="16"
                      />
                    </button>
                    <a
                      class="icon-btn"
                      [href]="google(k.term)"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Search on Google"
                    >
                      <app-icon name="external" [size]="16" />
                    </a>
                  </div>
                </div>
                <h2 class="topic-text mt-3 text-2xl font-bold leading-snug sm:text-[1.7rem]">
                  {{ k.meaning }}
                </h2>
                <p class="mt-4 leading-relaxed text-ink/85">{{ k.definition }}</p>
                @if (kb.playbooksByKeyword().get(k.id); as pbs) {
                  <div class="mt-auto flex flex-wrap gap-1.5 pt-5">
                    @for (p of pbs; track p.id) {
                      <a [routerLink]="['/playbooks', p.id]" class="chip hover:!text-ink">
                        <app-icon name="book" [size]="12" /> {{ p.title }}
                      </a>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Actions -->
      <div class="mx-auto mt-5 grid max-w-xl grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
        <button
          type="button"
          class="btn-secondary !border-rose-500/40 !px-2 !py-3 whitespace-nowrap"
          (click)="answer(false)"
        >
          <app-icon name="x" [size]="18" class="text-rose-500" />
          <span>Chưa nhớ</span>
        </button>
        <button type="button" class="btn-secondary !px-2 !py-3 whitespace-nowrap" (click)="flip()">
          <app-icon name="rotate" [size]="18" /> <span>Lật</span>
        </button>
        <button
          type="button"
          class="btn-primary !px-2 !py-3 whitespace-nowrap"
          (click)="answer(true)"
        >
          <app-icon name="check" [size]="18" /> <span>Nhớ rồi</span>
        </button>
      </div>
      <p class="mt-4 hidden text-center text-xs text-muted sm:block">
        <kbd class="kbd">←</kbd> chưa nhớ · <kbd class="kbd">Space</kbd> lật ·
        <kbd class="kbd">→</kbd> nhớ rồi
      </p>
      <p class="mt-4 text-center text-xs text-muted sm:hidden">
        Vuốt trái: chưa nhớ · vuốt phải: nhớ rồi
      </p>
    }
  `,
  styles: `
    .card-drag {
      touch-action: pan-y;
      transition: transform 0.25s ease;
      cursor: grab;
    }
    .card-drag.dragging {
      transition: none;
      cursor: grabbing;
    }
    .flip-card {
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .flip-card.flipped {
      transform: rotateY(180deg);
    }
    .face {
      position: absolute;
      inset: 0;
      overflow: hidden;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      box-shadow: 0 30px 60px -30px rgb(76 29 149 / 0.55);
    }
    .face.back {
      transform: rotateY(180deg);
      border-color: color-mix(in srgb, var(--t-from) 45%, transparent);
    }
    .swipe-hint {
      position: absolute;
      top: -2rem;
      z-index: 1;
      font-weight: 700;
      font-size: 0.8rem;
      pointer-events: none;
    }
    .confetti {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .confetti i {
      position: absolute;
      top: -12px;
      width: 8px;
      height: 14px;
      border-radius: 2px;
      opacity: 0;
      animation: confetti-fall linear forwards;
    }
    @keyframes confetti-fall {
      0% {
        opacity: 1;
        transform: translateY(0) rotate(0);
      }
      100% {
        opacity: 0;
        transform: translateY(420px) rotate(540deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .flip-card,
      .card-drag {
        transition: none;
      }
      .confetti {
        display: none;
      }
    }
  `,
})
export class Flashcards {
  protected readonly kb = inject(KnowledgeService);
  protected readonly cards = inject(FlashcardStore);
  protected readonly clipboard = inject(ClipboardService);
  private readonly ui = inject(UiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly style = topicStyle;
  protected readonly vars = topicVars;
  protected readonly google = googleUrl;

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly topicId = computed(() => this.params().get('topic'));
  protected readonly playbookFilter = computed(() => {
    const id = this.params().get('playbook');
    return id ? this.kb.playbookById().get(id) : undefined;
  });
  protected readonly onlyUnknown = signal(false);

  private readonly baseDeck = computed<Keyword[]>(() => {
    const byId = this.kb.keywordById();
    const pb = this.playbookFilter();
    if (pb) return pb.keywordIds.map((id) => byId.get(id)).filter((k): k is Keyword => !!k);
    const t = this.topicId();
    const all = this.kb.sortedKeywords();
    return t ? all.filter((k) => k.topicId === t) : all;
  });

  protected readonly order = signal<string[]>([]);
  protected readonly index = signal(0);
  protected readonly flipped = signal(false);
  private readonly session = signal<ReadonlyMap<string, boolean>>(new Map());
  protected readonly dragX = signal(0);
  protected readonly dragging = signal(false);
  private dragStart: { x: number; id: number } | null = null;

  protected readonly current = computed(() =>
    this.kb.keywordById().get(this.order()[this.index()]),
  );
  /** Single-item list so each new card is a fresh element (replays the entry animation). */
  protected readonly currentList = computed(() => {
    const c = this.current();
    return c ? [c] : [];
  });
  protected readonly done = computed(
    () => this.order().length > 0 && this.index() >= this.order().length,
  );
  protected readonly sessionKnown = computed(
    () => [...this.session().values()].filter(Boolean).length,
  );
  protected readonly sessionUnknown = computed(() => {
    const byId = this.kb.keywordById();
    return [...this.session()]
      .filter(([, known]) => !known)
      .map(([id]) => byId.get(id))
      .filter((k): k is Keyword => !!k);
  });
  protected readonly sessionPercent = computed(() => {
    const n = this.session().size;
    return n ? Math.round((this.sessionKnown() / n) * 100) : 0;
  });
  protected readonly knownAll = computed(() =>
    this.cards.knownCount(this.kb.keywords().map((k) => k.id)),
  );

  protected readonly confetti = Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: (i * 83) % 900,
    duration: 1600 + ((i * 131) % 1400),
    rotate: (i * 47) % 360,
  }));

  constructor() {
    // New deck whenever the filter changes (not when a card is marked).
    effect(() => {
      const ids = this.baseDeck().map((k) => k.id);
      this.onlyUnknown();
      untracked(() => this.start(ids, true));
    });
  }

  private start(ids: string[], shuffle: boolean): void {
    let list = this.onlyUnknown() ? ids.filter((id) => !this.cards.isKnown(id)) : [...ids];
    if (shuffle) list = shuffled(list);
    this.order.set(list);
    this.index.set(0);
    this.flipped.set(false);
    this.session.set(new Map());
    this.resetDrag();
  }

  protected restart(shuffle: boolean): void {
    this.start(
      this.baseDeck().map((k) => k.id),
      shuffle,
    );
  }

  protected reviewUnknown(): void {
    const ids = this.sessionUnknown().map((k) => k.id);
    this.order.set(shuffled(ids));
    this.index.set(0);
    this.flipped.set(false);
    this.session.set(new Map());
  }

  protected flip(): void {
    if (this.current()) this.flipped.update((f) => !f);
  }

  protected answer(known: boolean): void {
    const k = this.current();
    if (!k) return;
    this.cards.mark(k.id, known);
    this.session.update((m) => new Map(m).set(k.id, known));
    this.flipped.set(false);
    this.resetDrag();
    this.index.update((i) => i + 1);
  }

  protected copy(k: Keyword): void {
    void this.clipboard.copy(k.term, 'fc:' + k.id);
  }

  protected onKey(e: KeyboardEvent): void {
    if (this.ui.paletteOpen() || this.done() || !this.current()) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (tag === 'BUTTON' || tag === 'A') return; // let the focused control handle it
      e.preventDefault();
      this.flip();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.answer(true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.answer(false);
    }
  }

  protected onPointerDown(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('a,button')) return;
    this.dragStart = { x: e.clientX, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this.dragging.set(true);
  }

  protected onPointerMove(e: PointerEvent): void {
    if (this.dragStart?.id === e.pointerId) this.dragX.set(e.clientX - this.dragStart.x);
  }

  protected onPointerUp(e: PointerEvent): void {
    if (this.dragStart?.id !== e.pointerId) return;
    const dx = e.clientX - this.dragStart.x;
    this.dragStart = null;
    this.dragging.set(false);
    if (Math.abs(dx) >= SWIPE_THRESHOLD) this.answer(dx > 0);
    else {
      this.dragX.set(0);
      if (Math.abs(dx) < 8) this.flip();
    }
  }

  protected resetDrag(): void {
    this.dragStart = null;
    this.dragging.set(false);
    this.dragX.set(0);
  }
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
