import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClipboardService } from '../core/clipboard.service';
import { FlashcardStore } from '../core/flashcard.store';
import { KnowledgeService } from '../core/knowledge.service';
import { Keyword } from '../core/models';
import { googleUrl } from '../core/search';
import { topicVars } from '../core/topic-style';
import { Icon } from './icon';
import { I18n } from '../core/i18n.service';

@Component({
  selector: 'app-keyword-card',
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let k = keyword();
    <article
      class="glass glass-hover relative flex h-full flex-col gap-2 overflow-hidden rounded-2xl p-4 pl-5"
      [id]="'kw-' + k.id"
      [style]="vars()"
    >
      <span class="topic-gradient absolute inset-y-0 left-0 w-1"></span>
      <div class="flex items-start justify-between gap-2">
        <h3 class="break-words font-mono text-[0.92rem] font-semibold leading-snug text-ink">
          {{ k.term }}
        </h3>
        <div class="-mr-1 -mt-1 flex shrink-0 items-center">
          @if (known()) {
            <span
              class="mr-1 text-xs text-emerald-500"
              title="{{ i18n.t('Đã nhớ trong flashcards') }}"
              >✓</span
            >
          }
          <button
            type="button"
            class="icon-btn"
            (click)="clipboard.copy(k.term, 'kw:' + k.id)"
            [attr.aria-label]="'Copy ' + k.term"
            title="{{ i18n.t('Sao chép term') }}"
          >
            <app-icon [name]="copied() ? 'check' : 'copy'" [size]="16" />
          </button>
          <a
            class="icon-btn"
            [href]="google()"
            target="_blank"
            rel="noopener noreferrer"
            [attr.aria-label]="'Search ' + k.term + ' on Google'"
            title="{{ i18n.t('Tìm trên Google') }}"
          >
            <app-icon name="external" [size]="16" />
          </a>
        </div>
      </div>
      <p class="topic-text text-sm font-semibold">{{ k.meaning }}</p>
      @if (!compact()) {
        <p class="text-sm leading-relaxed text-muted">{{ k.definition }}</p>
      }
      @if (showPlaybooks() && playbooks().length) {
        <div class="mt-auto flex flex-wrap gap-1.5 pt-2">
          @for (p of playbooks(); track p.id) {
            <a [routerLink]="['/playbooks', p.id]" class="chip hover:!text-ink">
              <app-icon name="book" [size]="12" />{{ p.title }}
            </a>
          }
        </div>
      }
    </article>
  `,
})
export class KeywordCard {
  protected readonly i18n = inject(I18n);
  protected readonly clipboard = inject(ClipboardService);
  private readonly kb = inject(KnowledgeService);
  private readonly cards = inject(FlashcardStore);
  readonly keyword = input.required<Keyword>();
  readonly compact = input(false);
  readonly showPlaybooks = input(true);

  protected readonly vars = computed(() => topicVars(this.keyword().topicId));
  protected readonly known = computed(() => this.cards.isKnown(this.keyword().id));
  protected readonly copied = computed(
    () => this.clipboard.lastCopied() === 'kw:' + this.keyword().id,
  );
  protected readonly google = computed(() => googleUrl(this.keyword().term));
  protected readonly playbooks = computed(
    () => this.kb.playbooksByKeyword().get(this.keyword().id) ?? [],
  );
}
