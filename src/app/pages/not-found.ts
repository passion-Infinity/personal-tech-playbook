import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="py-20 text-center">
      <p class="font-mono text-sm text-accent-ink">404</p>
      <h1 class="mt-2 text-2xl font-bold text-ink">Page not found</h1>
      <p class="mt-2 text-muted">This playbook may have been renamed or merged.</p>
      <a routerLink="/" class="btn-primary mt-6 inline-flex">Back to all playbooks</a>
    </div>
  `,
})
export class NotFound {}
