import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PwaService } from '../core/pwa.service';
import { Icon } from './icon';

/** Update toast ("New knowledge update available") + iOS "Add to Home Screen" guide. */
@Component({
  selector: 'app-pwa-prompts',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pwa.updateAvailable()) {
      <div
        class="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-xl lg:bottom-6 lg:left-auto lg:right-6"
        role="status"
      >
        <app-icon name="refresh" class="text-accent-ink" />
        <p class="flex-1 text-sm text-ink">New knowledge update available</p>
        <button type="button" class="btn-primary" (click)="pwa.reload()">Reload</button>
        <button type="button" class="icon-btn" aria-label="Dismiss" (click)="pwa.dismissUpdate()">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    @if (pwa.showIosGuide()) {
      <div
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
        (click)="pwa.showIosGuide.set(false)"
      >
        <div
          class="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-title"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-4 flex items-center gap-3">
            <img src="icons/icon-96x96.png" alt="" width="44" height="44" class="rounded-xl" />
            <div>
              <h2 id="install-title" class="font-semibold text-ink">Install Playbook</h2>
              <p class="text-sm text-muted">Read offline, launch from your home screen.</p>
            </div>
          </div>
          @if (pwa.isIos()) {
            <ol class="space-y-3 text-sm text-ink">
              <li class="flex items-center gap-3">
                <span class="step">1</span>
                <span>Open this page in <b>Safari</b>, tap <b>Share</b></span>
                <app-icon name="share" class="ml-auto text-accent-ink" />
              </li>
              <li class="flex items-center gap-3">
                <span class="step">2</span>
                <span>Choose <b>Add to Home Screen</b></span>
                <app-icon name="plusSquare" class="ml-auto text-accent-ink" />
              </li>
              <li class="flex items-center gap-3">
                <span class="step">3</span>
                <span>Tap <b>Add</b> — the whole library is cached for offline use.</span>
              </li>
            </ol>
          } @else {
            <p class="text-sm text-ink">
              Use your browser menu → <b>Install app</b> / <b>Add to Home Screen</b>. In Chrome or
              Edge on desktop, click the install icon in the address bar.
            </p>
          }
          <button
            type="button"
            class="btn-secondary mt-5 w-full"
            (click)="pwa.showIosGuide.set(false)"
          >
            Got it
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .step {
      display: inline-flex;
      height: 1.5rem;
      width: 1.5rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      background: var(--color-accent-soft);
      color: var(--color-accent-ink);
      font-size: 0.75rem;
      font-weight: 600;
    }
  `,
})
export class PwaPrompts {
  protected readonly pwa = inject(PwaService);
}
