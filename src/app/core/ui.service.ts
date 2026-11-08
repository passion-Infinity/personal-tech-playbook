import { Injectable, signal } from '@angular/core';

/** Cross-component UI state (command palette, mobile drawer). */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly paletteOpen = signal(false);
  readonly paletteQuery = signal('');
  readonly drawerOpen = signal(false);

  openPalette(query = ''): void {
    this.paletteQuery.set(query);
    this.drawerOpen.set(false);
    this.paletteOpen.set(true);
  }

  closePalette(): void {
    this.paletteOpen.set(false);
  }
}
