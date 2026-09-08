import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { Popover } from 'primeng/popover';

/**
 * Save / Share / Save to GitHub.
 *
 * These are on the board because they are where the product is going, and a
 * dashboard tool without them would read as a toy. They are NOT wired up, and
 * pressing one says so plainly instead of showing a success toast for something
 * that did not happen — a fake save is the single fastest way to make everything
 * else on the page untrustworthy.
 */
@Component({
  selector: 'db-preview-actions',
  standalone: true,
  imports: [Popover],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="group" role="group" aria-label="Saving and sharing (in development)">
      @for (action of actions; track action.id) {
        <button type="button" (click)="show($event, action.id)">
          {{ action.label }}
        </button>
      }
      <span class="tag">Soon</span>
    </div>

    <p-popover #popover [dismissable]="true" (onHide)="openId.set(null)">
      <div class="explain">
        <h4>{{ current().title }}</h4>
        <p>{{ current().body }}</p>
      </div>
    </p-popover>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .group {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--hairline);
      border-radius: 8px;
      background: var(--card);
      overflow: hidden;
    }

    .group button {
      min-height: 30px;
      padding: 0 11px;
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

    .group button:hover {
      background: var(--paper-sunken);
      color: var(--ink);
    }

    .tag {
      padding: 0 8px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .explain {
      max-width: 288px;
    }

    .explain h4 {
      margin: 0 0 5px;
      font-size: 13px;
      font-weight: 660;
      color: var(--ink);
    }

    .explain p {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--ink-muted);
    }

    @media (max-width: 780px) {
      .group button:nth-child(3) {
        display: none;
      }
    }
  `,
})
export class PreviewActionsComponent {
  protected readonly actions = [
    {
      id: 'save',
      label: 'Save',
      title: 'Saving is not built yet',
      body:
        'Boards will save as DataTug boards — the same JSON this page is already rendering. Until that ships, your changes live in this browser tab and nowhere else, and Reset is the undo of last resort.',
    },
    {
      id: 'share',
      label: 'Share',
      title: 'Sharing is not built yet',
      body:
        'A shared board will be a link with a permission on it, borrowed from the Sneat space model rather than invented here. Nothing is shared today.',
    },
    {
      id: 'github',
      label: 'Save to GitHub',
      title: 'GitHub is not connected',
      body:
        'The plan is to commit a board to a repository as plain files, so a dashboard reviews like code. No GitHub authentication exists in this build — this button has never seen a repository.',
    },
  ] as const;

  protected readonly current = signal<(typeof this.actions)[number]>(this.actions[0]);
  protected readonly openId = signal<string | null>(null);

  private readonly popover = viewChild.required<Popover>('popover');

  protected show(event: Event, id: string): void {
    const popover = this.popover();
    if (this.openId() === id) {
      popover.hide();
      return;
    }
    const action = this.actions.find((a) => a.id === id);
    if (action) this.current.set(action);
    // Re-anchoring an open overlay to a different button: close first, then
    // reopen against the new target, or PrimeNG keeps the old position.
    popover.hide();
    this.openId.set(id);
    popover.show(event, event.currentTarget as HTMLElement);
  }
}
