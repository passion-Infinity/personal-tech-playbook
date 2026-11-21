import { Injectable, signal } from '@angular/core';

const KEY = 'playbook-flashcards-v1';

/** Per-device memory of which Search Hooks the learner already knows. */
@Injectable({ providedIn: 'root' })
export class FlashcardStore {
  readonly known = signal<ReadonlySet<string>>(load());

  isKnown(id: string): boolean {
    return this.known().has(id);
  }

  mark(id: string, known: boolean): void {
    const next = new Set(this.known());
    if (known) next.add(id);
    else next.delete(id);
    this.known.set(next);
    save(next);
  }

  knownCount(ids: Iterable<string>): number {
    const k = this.known();
    let n = 0;
    for (const id of ids) if (k.has(id)) n++;
    return n;
  }

  reset(): void {
    this.known.set(new Set());
    save(new Set());
  }
}

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function save(ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable: progress lasts for this session only */
  }
}
