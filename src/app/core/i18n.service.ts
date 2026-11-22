import { Injectable, computed, signal } from '@angular/core';
import { UI_EN } from './ui-en';

export type Lang = 'vi' | 'en';
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { id: 'en', label: 'English', short: 'EN' },
];
const KEY = 'playbook-lang';

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'vi' || q === 'en') return q;
    const s = localStorage.getItem(KEY);
    if (s === 'vi' || s === 'en') return s;
  } catch {
    /* storage unavailable */
  }
  return 'vi';
}

/**
 * UI language. Vietnamese strings are the source keys; English lives in UI_EN.
 * Missing English entries fall back to the Vietnamese text, so a gap never breaks the UI.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(initialLang());
  readonly isEn = computed(() => this.lang() === 'en');
  readonly locale = computed(() => (this.lang() === 'en' ? 'en-US' : 'vi-VN'));

  constructor() {
    document.documentElement.lang = this.lang();
  }

  set(lang: Lang): void {
    this.lang.set(lang);
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* language still applies for this session */
    }
  }

  toggle(): void {
    this.set(this.lang() === 'vi' ? 'en' : 'vi');
  }

  /** Translate a Vietnamese source string; `{name}` placeholders are filled from `params`. */
  t(vi: string, params?: Record<string, string | number | undefined>): string {
    const text = this.lang() === 'en' ? (UI_EN[vi] ?? vi) : vi;
    return params ? text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : text;
  }
}
