import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly swUpdate = inject(SwUpdate);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /** A new build (app or knowledge) has been downloaded and is ready to activate. */
  readonly updateAvailable = signal(false);
  /** Native install prompt captured (Chromium on desktop/Android). */
  readonly canPromptInstall = signal(false);
  readonly isStandalone = signal(detectStandalone());
  readonly isIos = signal(detectIos());
  readonly showIosGuide = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateAvailable.set(true));
      this.swUpdate.unrecoverable.subscribe(() => this.updateAvailable.set(true));
      // Check for a new deployment when the app regains focus (cheap, uses ngsw.json).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.checkForUpdate();
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canPromptInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canPromptInstall.set(false);
      this.isStandalone.set(true);
    });
  }

  /** Show the Install button unless the app already runs installed. */
  canInstall(): boolean {
    return !this.isStandalone() && (this.canPromptInstall() || this.isIos());
  }

  async install(): Promise<void> {
    if (this.deferredPrompt) {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') this.canPromptInstall.set(false);
      this.deferredPrompt = null;
      return;
    }
    // iOS Safari (and browsers without beforeinstallprompt): show manual guide.
    this.showIosGuide.set(true);
  }

  checkForUpdate(): void {
    if (this.swUpdate.isEnabled) this.swUpdate.checkForUpdate().catch(() => undefined);
  }

  async reload(): Promise<void> {
    try {
      if (this.swUpdate.isEnabled) await this.swUpdate.activateUpdate();
    } finally {
      document.location.reload();
    }
  }

  dismissUpdate(): void {
    this.updateAvailable.set(false);
  }
}

function detectStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIos(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
