import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type ThemeChoice = 'system' | 'light' | 'dark';

/** The chrome + series colours a canvas chart cannot read from CSS by itself. */
export interface ThemeTokens {
  readonly ink: string;
  readonly inkMuted: string;
  readonly inkFaint: string;
  readonly hairline: string;
  readonly card: string;
  readonly series: readonly string[];
  readonly dark: boolean;
}

const STORAGE_KEY = 'dashboardius.theme';

const FALLBACK: ThemeTokens = {
  ink: '#15181d',
  inkMuted: '#5c6470',
  inkFaint: '#8b93a0',
  hairline: '#e3e1dc',
  card: '#ffffff',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: false,
};

/**
 * Owns the colour scheme.
 *
 * CSS handles the scheme on its own — every token is declared for both schemes
 * and switched by `prefers-color-scheme` or the `.db-dark` / `.db-light` class
 * this service stamps. The service exists for the one thing CSS cannot do:
 * hand literal hex values to a `<canvas>`, which has no cascade to read.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = typeof window !== 'undefined';

  readonly choice = signal<ThemeChoice>('system');
  /** Bumped whenever the resolved scheme changes, so charts re-read tokens. */
  readonly tokens = signal<ThemeTokens>(FALLBACK);

  constructor() {
    if (this.isBrowser) {
      const stored = safeRead(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') this.choice.set(stored);

      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', () => {
        if (this.choice() === 'system') this.refreshTokens();
      });
    }

    effect(() => {
      const choice = this.choice();
      if (!this.isBrowser) return;
      const root = this.doc.documentElement;
      root.classList.toggle('db-dark', choice === 'dark');
      root.classList.toggle('db-light', choice === 'light');
      safeWrite(STORAGE_KEY, choice);
      this.refreshTokens();
    });
  }

  toggle(): void {
    this.choice.set(this.isDark() ? 'light' : 'dark');
  }

  isDark(): boolean {
    if (!this.isBrowser) return false;
    const choice = this.choice();
    if (choice !== 'system') return choice === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private refreshTokens(): void {
    if (!this.isBrowser) return;
    const style = getComputedStyle(this.doc.documentElement);
    const read = (name: string, fallback: string): string =>
      style.getPropertyValue(name).trim() || fallback;

    this.tokens.set({
      ink: read('--ink', FALLBACK.ink),
      inkMuted: read('--ink-muted', FALLBACK.inkMuted),
      inkFaint: read('--ink-faint', FALLBACK.inkFaint),
      hairline: read('--hairline', FALLBACK.hairline),
      card: read('--card', FALLBACK.card),
      series: FALLBACK.series.map((fb, i) => read(`--series-${i + 1}`, fb)),
      dark: this.isDark(),
    });
  }
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode, blocked site data — the choice just doesn't persist */
  }
}
