import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  /** Key of the last copied item, cleared after a short delay (for "Copied" feedback). */
  readonly lastCopied = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  async copy(text: string, key = text): Promise<boolean> {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopy(text);
    }
    if (ok) {
      this.lastCopied.set(key);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.lastCopied.set(null), 1500);
    }
    return ok;
  }
}

export function fallbackCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
