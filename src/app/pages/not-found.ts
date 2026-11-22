import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="py-20 text-center">
      <p class="text-gradient font-display text-7xl font-bold">404</p>
      <h1 class="mt-2 text-2xl font-bold text-ink">{{ i18n.t('Không tìm thấy trang') }}</h1>
      <p class="mt-2 text-muted">{{ i18n.t('Playbook này có thể đã được đổi tên hoặc gộp.') }}</p>
      <a routerLink="/" class="btn-primary mt-6">{{ i18n.t('Về tất cả playbook') }}</a>
    </div>
  `,
})
export class NotFound {
  protected readonly i18n = inject(I18n);
}
