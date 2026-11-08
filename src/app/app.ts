import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { KnowledgeService } from './core/knowledge.service';
import { PwaService } from './core/pwa.service';
import { ThemeService } from './core/theme.service';
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
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 btn-primary"
    >
      Skip to content
    </a>

    <!-- Mobile top bar -->
    <header
      class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden"
    >
      <button
        type="button"
        class="icon-btn"
        aria-label="Open menu"
        (click)="ui.drawerOpen.set(true)"
      >
        <app-icon name="menu" />
      </button>
      <a routerLink="/" class="flex min-w-0 items-center gap-2 font-semibold text-ink">
        <img src="icons/icon-96x96.png" alt="" width="26" height="26" class="rounded-md" />
        <span class="truncate">Playbook</span>
      </a>
      <button
        type="button"
        class="ml-auto flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted sm:max-w-xs"
        (click)="ui.openPalette()"
      >
        <app-icon name="search" [size]="16" /> Search…
      </button>
    </header>

    <!-- Drawer backdrop (mobile) -->
    @if (ui.drawerOpen()) {
      <div
        class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        (click)="ui.drawerOpen.set(false)"
      ></div>
    }

    <!-- Sidebar (desktop) / slide-over drawer (mobile) -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-sidebar pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-transform duration-200 lg:z-20 lg:translate-x-0"
      [class.-translate-x-full]="!ui.drawerOpen()"
    >
      <div class="flex h-16 items-center gap-2.5 px-5">
        <a routerLink="/" class="flex items-center gap-2.5" (click)="ui.drawerOpen.set(false)">
          <img src="icons/icon-96x96.png" alt="" width="32" height="32" class="rounded-lg" />
          <span class="leading-tight">
            <span class="block text-sm font-semibold text-ink">Personal Tech</span>
            <span class="block text-xs text-muted">Playbook</span>
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

      <div class="px-4 pb-3">
        <button
          type="button"
          class="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted hover:border-accent/60"
          (click)="ui.openPalette()"
        >
          <app-icon name="search" [size]="16" />
          <span>Search…</span>
          <span class="ml-auto hidden gap-1 sm:flex"
            ><kbd class="kbd">{{ modKey }}</kbd
            ><kbd class="kbd">K</kbd></span
          >
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        <a
          routerLink="/"
          [queryParams]="{}"
          routerLinkActive="nav-active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="nav-item"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="book" [size]="16" /> All Playbooks
          <span class="count">{{ kb.playbooks().length }}</span>
        </a>
        <a
          routerLink="/keywords"
          routerLinkActive="nav-active"
          class="nav-item"
          (click)="ui.drawerOpen.set(false)"
        >
          <app-icon name="hash" [size]="16" /> Search Hooks
          <span class="count">{{ kb.keywords().length }}</span>
        </a>

        <p class="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Topics
        </p>
        @for (t of kb.topics(); track t.id) {
          <a
            routerLink="/"
            [queryParams]="{ topic: t.id }"
            class="nav-item"
            [class.nav-active]="activeTopic() === t.id"
            [title]="t.description"
            (click)="ui.drawerOpen.set(false)"
          >
            <app-icon name="folder" [size]="16" /> {{ t.name }}
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
          <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="16" />
          {{ theme.theme() === 'dark' ? 'Light mode' : 'Dark mode' }}
        </button>
      </div>
    </aside>

    <main id="main" class="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-12 lg:pl-72">
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <router-outlet />
      </div>
    </main>

    <!-- Mobile bottom bar -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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
      <button type="button" class="tab" (click)="ui.openPalette()">
        <app-icon name="search" /> Search
      </button>
      <a routerLink="/keywords" routerLinkActive="tab-active" class="tab">
        <app-icon name="hash" /> Hooks
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
  private readonly router = inject(Router);

  protected readonly modKey = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? '⌘'
    : 'Ctrl';

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
