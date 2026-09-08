import { DOCUMENT, ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';

import { AuthDialogComponent, AuthIntent } from '../../auth/auth-dialog.component';
import { AuthService } from '../../auth/auth.service';
import { DashboardStore } from '../state/dashboard-store';
import { commandById } from '../state/command-catalog';
import { GridEngine } from '../model/board.model';
import { DashboardAction } from '../state/dashboard-actions';
import { AppBarComponent } from './app-bar.component';
import { BoardGridComponent } from './board-grid.component';
import { CommandBarComponent } from './command-bar.component';
import { PreviewActionsComponent } from './preview-actions.component';
import { SiteFooterComponent } from './site-footer.component';

/**
 * dashboardius.com.
 *
 * The homepage IS a dashboard. There is no hero, no screenshot of the product
 * above the product, and no three feature cards explaining what a visitor could
 * be doing instead of doing it. What the page has to say — that a card can be a
 * chart or a table or a paragraph, that metrics hide without being deleted,
 * that a DataTug query is a card's source — it says by being those things.
 */
@Component({
  selector: 'db-dashboard-page',
  standalone: true,
  imports: [
    AppBarComponent,
    CommandBarComponent,
    BoardGridComponent,
    PreviewActionsComponent,
    AuthDialogComponent,
    SiteFooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="db-skip-link" href="#board">Skip to the dashboard</a>

    <db-app-bar (signIn)="openAuth('sign-in')" />

    <main>
      <div class="shell">
        <div class="board-head">
          <div class="titles">
            <p class="crumbs">
              <span>Demo workspace</span>
              <span aria-hidden="true">/</span>
              <span>Boards</span>
            </p>
            <h2 class="board-title">
              {{ store.board().title }}
              @if (!store.isPristine()) {
                <span class="edited" title="This board has unsaved changes">edited</span>
              }
            </h2>
            <p class="tagline">Any data. Your metrics. One view.</p>
          </div>

          <div class="controls">
            <div class="history" role="group" aria-label="History">
              <button type="button" [disabled]="!store.canUndo()" (click)="store.undo()" title="Undo (Ctrl+Z)">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M6.2 3.4 2.6 6.6l3.6 3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M2.9 6.6h6.3a4 4 0 0 1 0 8H6.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                </svg>
                <span class="btn-label">Undo</span>
              </button>
              <button type="button" [disabled]="!store.canRedo()" (click)="store.redo()" title="Redo (Ctrl+Shift+Z)">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M9.8 3.4l3.6 3.2-3.6 3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M13.1 6.6H6.8a4 4 0 0 0 0 8h2.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                </svg>
                <span class="btn-label">Redo</span>
              </button>
              <button type="button" class="reset" [disabled]="store.isPristine()" (click)="reset()">
                Reset
              </button>
            </div>
            <db-preview-actions />
          </div>
        </div>

        <db-command-bar />

        <div id="board" class="board-area" tabindex="-1">
          <db-board-grid
            [board]="store.board()"
            [tableViews]="tableViews()"
            [gridEngines]="gridEngines()"
            (act)="dispatch($event)"
            (runAction)="onCardAction($event)"
            (toggleTableView)="toggleTableView($event)"
            (setGridEngine)="setGridEngine($event)"
            (resetRequested)="reset()"
          />
        </div>

        @if (resetNotice()) {
          <p class="reset-notice" role="status">
            Back to the original board. Nothing was saved, because nothing is saved yet.
          </p>
        }
      </div>

      <db-site-footer />
    </main>

    <!-- Deferred: PrimeNG's Dialog and the sign-in form are ~80 kB that a
         visitor who never signs in should not download to look at a board. -->
    @defer (when authRequested()) {
      <db-auth-dialog [(open)]="authOpen" [(intent)]="authIntent" />
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }

    main {
      display: block;
    }

    .shell {
      max-width: var(--shell-max);
      margin: 0 auto;
      padding: 18px 20px 34px;
    }

    .board-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
    }

    .crumbs {
      display: flex;
      gap: 6px;
      margin: 0 0 3px;
      font-size: 10.5px;
      font-weight: 620;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .board-title {
      display: flex;
      align-items: center;
      gap: 9px;
      margin: 0;
      font-size: 24px;
      font-weight: 660;
      letter-spacing: -0.024em;
      color: var(--ink);
    }

    .edited {
      padding: 2px 7px;
      border: 1px solid var(--hairline-strong);
      border-radius: 999px;
      font-size: 10px;
      font-weight: 650;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .tagline {
      margin: 3px 0 0;
      font-size: 13px;
      color: var(--ink-muted);
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .history {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--hairline);
      border-radius: 8px;
      background: var(--card);
      overflow: hidden;
    }

    .history button {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 30px;
      padding: 0 10px;
      border: 0;
      border-right: 1px solid var(--hairline);
      background: transparent;
      color: var(--ink-muted);
      font-size: 12.5px;
      font-weight: 560;
      cursor: pointer;
      transition:
        background var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .history button:last-child {
      border-right: 0;
    }

    .history button svg {
      width: 14px;
      height: 14px;
    }

    .history button:hover:not(:disabled) {
      background: var(--paper-sunken);
      color: var(--ink);
    }

    .history button:disabled {
      color: var(--ink-faint);
      opacity: 0.5;
      cursor: default;
    }

    .history .reset {
      font-weight: 620;
      color: var(--brand);
    }

    .history .reset:hover:not(:disabled) {
      background: var(--brand-wash);
      color: var(--brand);
    }

    .board-area {
      margin-top: 16px;
      scroll-margin-top: 72px;
    }

    .board-area:focus {
      outline: none;
    }

    .reset-notice {
      margin: 14px 0 0;
      padding: 9px 12px;
      border: 1px solid var(--hairline);
      border-left: 3px solid var(--good);
      border-radius: 8px;
      background: var(--card);
      font-size: 12.5px;
      color: var(--ink-muted);
      animation: fade-in var(--dur) var(--ease);
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }

    @media (max-width: 700px) {
      .shell {
        padding: 14px 12px 26px;
      }

      .board-title {
        font-size: 20px;
      }

      /* Undo and Redo become their icons so both control groups fit one row —
         on a phone the board should start above the fold, not below a stack of
         toolbars. Reset keeps its word: it is the one a lost visitor needs to
         find without decoding a glyph. */
      .btn-label {
        display: none;
      }

      .history button {
        padding: 0 9px;
      }

      .controls {
        width: 100%;
        gap: 6px;
      }
    }
  `,
})
export class DashboardPageComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly auth = inject(AuthService);
  private readonly doc = inject(DOCUMENT);

  /** Latches once, so the deferred dialog is not torn down when it closes. */
  protected readonly authRequested = signal(false);
  protected readonly authOpen = signal(false);
  protected readonly authIntent = signal<AuthIntent>('sign-in');
  protected readonly resetNotice = signal(false);

  /** Cards currently showing their table twin instead of their plot. */
  private readonly tableViewIds = signal<ReadonlySet<string>>(new Set());
  protected readonly tableViews = computed(() => this.tableViewIds());

  /**
   * Which grid engine each query card is using.
   *
   * Kept as VIEW state rather than board state on purpose: DataTug's board
   * schema has no field for "which JavaScript grid library rendered this", and
   * inventing one would be Dashboardius writing its rendering preferences into
   * a shared data format. Reset clears it along with everything else.
   */
  private readonly gridEngineByCard = signal<ReadonlyMap<string, GridEngine>>(new Map());
  protected readonly gridEngines = computed(() => this.gridEngineByCard());

  constructor() {
    afterNextRender(() => {
      // Restore an existing session once the page is interactive, so the
      // Firebase SDK never competes with first paint for bandwidth.
      const idle =
        (window as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ??
        ((cb: () => void) => setTimeout(cb, 400));
      idle(() => this.auth.restore());

      this.doc.addEventListener('keydown', this.onKeydown);
    });
  }

  protected dispatch(actions: readonly DashboardAction[]): void {
    this.store.dispatch(actions);
    this.resetNotice.set(false);
  }

  protected setGridEngine({ cardId, engine }: { cardId: string; engine: GridEngine }): void {
    const next = new Map(this.gridEngineByCard());
    next.set(cardId, engine);
    this.gridEngineByCard.set(next);
  }

  protected toggleTableView(cardId: string): void {
    const next = new Set(this.tableViewIds());
    if (!next.delete(cardId)) next.add(cardId);
    this.tableViewIds.set(next);
  }

  protected reset(): void {
    this.store.reset();
    this.tableViewIds.set(new Set());
    this.gridEngineByCard.set(new Map());
    this.resetNotice.set(true);
    setTimeout(() => this.resetNotice.set(false), 5200);
  }

  protected openAuth(intent: AuthIntent): void {
    this.authIntent.set(intent);
    this.authRequested.set(true);
    this.authOpen.set(true);
  }

  /** A card footer button asked for something. */
  protected onCardAction(action: string): void {
    if (action === 'sign-up' || action === 'sign-in') {
      this.openAuth(action);
      return;
    }
    if (action.startsWith('command:')) {
      const command = commandById(action.slice('command:'.length));
      if (command) void this.store.run(command.text, { command, typeText: true });
    }
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    // Never steal undo from a field the visitor is typing in.
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
    event.preventDefault();
    if (event.shiftKey) this.store.redo();
    else this.store.undo();
  };
}
