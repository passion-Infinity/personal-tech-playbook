import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PwaService } from '../core/pwa.service';
import { Icon } from './icon';
import { I18n } from '../core/i18n.service';

/** Update toast ("New knowledge update available") + iOS "Add to Home Screen" guide. */
@Component({
  selector: 'app-pwa-prompts',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pwa.updateAvailable()) {
      <div
        class="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 glass-strong rounded-2xl px-4 py-3 shadow-xl lg:bottom-6 lg:left-auto lg:right-6"
        role="status"
      >
        <app-icon name="refresh" class="text-accent-ink" />
        <p class="flex-1 text-sm text-ink">{{ i18n.t('Có bản cập nhật kiến thức mới') }}</p>
        <button type="button" class="btn-primary" (click)="pwa.reload()">
          {{ i18n.t('Tải lại') }}
        </button>
        <button
          type="button"
          class="icon-btn"
          aria-label="{{ i18n.t('Đóng') }}"
          (click)="pwa.dismissUpdate()"
        >
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
          class="w-full max-w-sm glass-strong rounded-3xl p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-title"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-4 flex items-center gap-3">
            <img src="icons/icon-96x96.png" alt="" width="44" height="44" class="rounded-xl" />
            <div>
              <h2 id="install-title" class="font-semibold text-ink">
                {{ i18n.t('Cài đặt Playbook') }}
              </h2>
              <p class="text-sm text-muted">{{ i18n.t('Đọc offline, mở từ màn hình chính.') }}</p>
            </div>
          </div>
          @if (pwa.isIos()) {
            <ol class="space-y-3 text-sm text-ink">
              <li class="flex items-center gap-3">
                <span class="step">1</span>
                <span>{{ i18n.t('Mở trang này bằng Safari, bấm Chia sẻ (Share)') }}</span>
                <app-icon name="share" class="ml-auto text-accent-ink" />
              </li>
              <li class="flex items-center gap-3">
                <span class="step">2</span>
                <span>{{ i18n.t('Chọn Thêm vào Màn hình chính (Add to Home Screen)') }}</span>
                <app-icon name="plusSquare" class="ml-auto text-accent-ink" />
              </li>
              <li class="flex items-center gap-3">
                <span class="step">3</span>
                <span>{{
                  i18n.t('Bấm Thêm (Add) — toàn bộ thư viện được lưu để đọc offline.')
                }}</span>
              </li>
            </ol>
          } @else {
            <p class="text-sm text-ink">
              {{
                i18n.t(
                  'Dùng menu trình duyệt → Cài đặt ứng dụng / Thêm vào Màn hình chính. Trên Chrome hoặc Edge (máy tính), bấm biểu tượng cài đặt ở thanh địa chỉ.'
                )
              }}
            </p>
          }
          <button
            type="button"
            class="btn-secondary mt-5 w-full"
            (click)="pwa.showIosGuide.set(false)"
          >
            {{ i18n.t('Đã hiểu') }}
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
  protected readonly i18n = inject(I18n);
  protected readonly pwa = inject(PwaService);
}
