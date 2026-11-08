import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClipboardService } from '../core/clipboard.service';
import { KnowledgeService } from '../core/knowledge.service';
import { Keyword } from '../core/models';
import { googleUrl } from '../core/search';
import { Icon } from './icon';

@Component({
  selector: 'app-keyword-card',
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let k = keyword();
    <article
      class="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/50"
      [id]="'kw-' + k.id"
    >
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-mono text-[0.95rem] font-semibold leading-snug text-ink break-words">
          {{ k.term }}
        </h3>
        <div class="-mr-1 -mt-1 flex shrink-0 items-center">
          <button
            type="button"
            class="icon-btn"
            (click)="clipboard.copy(k.term, 'kw:' + k.id)"
            [attr.aria-label]="'Copy ' + k.term"
            title="Copy term"
          >
            <app-icon [name]="copied() ? 'check' : 'copy'" [size]="16" />
          </button>
          <a
            class="icon-btn"
            [href]="google()"
            target="_blank"
            rel="noopener noreferrer"
            [attr.aria-label]="'Search ' + k.term + ' on Google'"
            title="Search on Google"
          >
            <app-icon name="external" [size]="16" />
          </a>
        </div>
      </div>
      <p class="text-sm font-medium text-accent-ink">{{ k.meaning }}</p>
      @if (!compact()) {
        <p class="text-sm leading-relaxed text-muted">{{ k.definition }}</p>
      }
      @if (showPlaybooks() && playbooks().length) {
        <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
          @for (p of playbooks(); track p.id) {
            <a
              [routerLink]="['/playbooks', p.id]"
              class="chip hover:border-accent hover:text-accent-ink"
            >
              <app-icon name="book" [size]="12" />{{ p.title }}
            </a>
          }
        </div>
      }
    </article>
  `,
})
export class KeywordCard {
  protected readonly clipboard = inject(ClipboardService);
  private readonly kb = inject(KnowledgeService);
  readonly keyword = input.required<Keyword>();
  readonly compact = input(false);
  readonly showPlaybooks = input(true);

  protected readonly copied = computed(
    () => this.clipboard.lastCopied() === 'kw:' + this.keyword().id,
  );
  protected readonly google = computed(() => googleUrl(this.keyword().term));
  protected readonly playbooks = computed(
    () => this.kb.playbooksByKeyword().get(this.keyword().id) ?? [],
  );
}
