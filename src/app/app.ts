import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FlashcardStore } from './core/flashcard.store';
import { KnowledgeService } from './core/knowledge.service';
import { LearningStore } from './core/learning.store';
import { PwaService } from './core/pwa.service';
import { ThemeService } from './core/theme.service';
import { topicStyle, topicVars } from './core/topic-style';
import { UiService } from './core/ui.service';
import { Icon } from './shared/icon';
import { PwaPrompts } from './shared/pwa-prompts';
import { SearchPalette } from './shared/search-palette';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, SearchPalette, PwaPrompts],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>

    <a
      href="#main"
      class="btn-primary sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
    >
      Skip to content
    </a>

    <!-- Mobile top bar -->
    <header
      class="glass-strong sticky top-0 z-30 flex h-14 items-center gap-2 border-x-0 border-t-0 px-3 pt-[env(safe-area-inset-top)] lg:hidden"
    >
      <button
        type="button"
        class="icon-btn"
        aria-label="Open menu"
        (click)="ui.drawerOpen.set(true)"
      >
        <app-icon name="menu" />
      </button>
      <a routerLink="/" class="flex min-w-0 items-center gap-2 font-display font-semibold text-ink">
        <img src="icons/icon-96x96.png" alt="" width="28" height="28" class="rounded-lg" />
        <span class="truncate">Playbook</span>
      </a>
      <button
        type="button"
        class="glass ml-auto flex h-9 flex-1 items-center gap-2 rounded-xl px-3 text-sm text-muted sm:max-w-xs"
        (click)="ui.openPalette()"
      >
        <app-icon name="search" [size]="16" /> Search…
      </button>
    </header>

    @if (ui.drawerOpen()) {
      <div
        class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        (click)="ui.drawerOpen.set(false)"
      ></div>
    }

    <!-- Sidebar (desktop) / slide-over drawer (mobile) -->
    <aside
      class="glass-strong fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-y-0 border-l-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 lg:z-20 lg:translate-x-0 lg:bg-sidebar"
      [class.-translate-x-full]="!ui.drawerOpen()"
    >
      <div class="flex h-20 items-center gap-3 px-5">
        <a routerLink="/" class="group flex items-center gap-3" (click)="ui.drawerOpen.set(false)">
          <span class="relative">
            <span
              class="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 opacity-60 blur-md transition group-hover:opacity-90"
            ></span>
            <img
              src="icons/icon-96x96.png"
              alt=""
              width="40"
              height="40"
              class="relative rounded-xl"
            />
          </span>
          <span class="leading-tight">
            <span class="block font-display text-[0.95rem] font-semibold text-ink"
              >Personal Tech</span
            >
            <span class="text-gradient block font-display text-sm font-semibold">Playbook</span>
          </span>
        </a>
        <button
          type="button"
          class="icon-btn ml-auto lg:hidden"
          aria-label="Close menu"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="x" />
        </button>
      </div>

      <div class="px-4 pb-4">
        <button
          type="button"
          class="glass flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm text-muted transition hover:border-violet-400/50"
          (click)="ui.openPalette()"
        >
          <app-icon name="search" [size]="16" />
          <span>Search…</span>
          <span class="ml-auto hidden gap-1 sm:flex">
            <kbd class="kbd">{{ modKey }}</kbd
            ><kbd class="kbd">K</kbd>
          </span>
        </button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        <p class="eyebrow mb-2 px-3 !text-muted">Learn</p>
        <a
          routerLink="/"
          [queryParams]="{}"
          routerLinkActive="nav-active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="nav-item"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="book" [size]="17" /> All Playbooks
          <span class="count">{{ kb.playbooks().length }}</span>
        </a>
        <a
          routerLink="/roadmap"
          routerLinkActive="nav-active"
          class="nav-item"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="map" [size]="17" /> Roadmap
          <span class="count">{{ learning.read().size }}/{{ kb.playbooks().length }}</span>
        </a>
        <a
          routerLink="/practice"
          routerLinkActive="nav-active"
          class="nav-item"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="flame" [size]="17" /> Luyện tập
          @if (learning.streak() > 0) {
            <span class="count !text-orange-400">🔥 {{ learning.streak() }}</span>
          }
        </a>
        <a
          routerLink="/flashcards"
          routerLinkActive="nav-active"
          class="nav-item"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="cards" [size]="17" /> Flashcards
          <span class="count">{{ knownTotal() }}/{{ kb.keywords().length }}</span>
        </a>
        <a
          routerLink="/keywords"
          routerLinkActive="nav-active"
          class="nav-item"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="hash" [size]="17" /> Search Hooks
          <span class="count">{{ kb.keywords().length }}</span>
        </a>

        <p class="eyebrow mb-2 mt-7 px-3 !text-muted">Topics</p>
        @for (t of kb.topics(); track t.id) {
          <a
            routerLink="/"
            [queryParams]="{ topic: t.id }"
            class="nav-item"
            [class.nav-active]="activeTopic() === t.id"
            [title]="t.description"
            [style]="vars(t.id)"
            (click)="ui.drawerOpen.set(false)"
          >
            <span class="topic-tile h-7 w-7 !rounded-lg">
              <app-icon [name]="style(t.id).icon" [size]="15" />
            </span>
            <span class="truncate">{{ t.name }}</span>
            <span class="count">{{ kb.playbookCountByTopic().get(t.id) ?? 0 }}</span>
          </a>
        }
      </nav>

      <div class="space-y-2 border-t border-line p-3">
        @if (pwa.canInstall()) {
          <button type="button" class="btn-primary w-full" (click)="pwa.install()">
            <app-icon name="download" [size]="16" /> Install App
          </button>
        }
        <button type="button" class="nav-item w-full" (click)="theme.toggle()">
          <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="17" />
          {{ theme.theme() === 'dark' ? 'Light mode' : 'Dark mode' }}
        </button>
      </div>
    </aside>

    <main
      id="main"
      class="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-14 lg:pl-72"
    >
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <router-outlet />
      </div>
    </main>

    <!-- Mobile bottom bar -->
    <nav
      class="glass-strong fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-4 rounded-2xl shadow-2xl shadow-black/30 lg:hidden"
      aria-label="Bottom navigation"
    >
      <a
        routerLink="/"
        routerLinkActive="tab-active"
        [routerLinkActiveOptions]="{ exact: true }"
        class="tab"
      >
        <app-icon name="book" /> Playbooks
      </a>
      <a routerLink="/roadmap" routerLinkActive="tab-active" class="tab">
        <app-icon name="map" /> Roadmap
      </a>
      <a routerLink="/practice" routerLinkActive="tab-active" class="tab">
        <app-icon name="flame" /> Luyện tập
      </a>
      <button type="button" class="tab" (click)="ui.drawerOpen.set(true)">
        <app-icon name="menu" /> Menu
      </button>
    </nav>

    <app-search-palette />
    <app-pwa-prompts />
  `,
})
export class App {
  protected readonly kb = inject(KnowledgeService);
  protected readonly ui = inject(UiService);
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaService);
  private readonly cards = inject(FlashcardStore);
  protected readonly learning = inject(LearningStore);
  private readonly router = inject(Router);

  protected readonly style = topicStyle;
  protected readonly vars = topicVars;
  protected readonly modKey = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? '⌘'
    : 'Ctrl';

  protected readonly knownTotal = computed(() =>
    this.cards.knownCount(this.kb.keywords().map((k) => k.id)),
  );

  protected readonly activeTopic = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        const tree = this.router.parseUrl(this.router.url);
        const path = tree.root.children['primary']?.segments.map((s) => s.path).join('/') ?? '';
        return path === '' ? tree.queryParamMap.get('topic') : null;
      }),
    ),
    { initialValue: null },
  );

  protected onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (this.ui.paletteOpen()) this.ui.closePalette();
      else this.ui.openPalette();
    } else if (e.key === '/' && !this.ui.paletteOpen() && !isTyping(e.target)) {
      e.preventDefault();
      this.ui.openPalette();
    } else if (e.key === 'Escape') {
      this.ui.closePalette();
      this.ui.drawerOpen.set(false);
    }
  }
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
