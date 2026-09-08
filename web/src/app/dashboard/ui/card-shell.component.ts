import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';

import { CardMenuComponent } from './card-menu.component';
import { CardMenuGroup } from './card-menu.model';

/**
 * The chrome around every widget: title, drag handle, menu, body, footer.
 *
 * Widgets never draw their own frame. One shell means one hover state, one
 * focus ring, one drag affordance and one place to change the card language —
 * which is most of what stops a dashboard of eight different cards from
 * looking like eight different products.
 */
@Component({
  selector: 'db-card-shell',
  standalone: true,
  imports: [CardMenuComponent, CdkDragHandle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'db-card',
    '[class.is-arriving]': 'arriving()',
  },
  template: `
    <header class="head" cdkDragHandle [cdkDragHandleDisabled]="!draggable()">
      <span class="grip" aria-hidden="true" [class.is-draggable]="draggable()">
        <svg viewBox="0 0 10 16" focusable="false">
          <circle cx="3" cy="3" r="1.1" />
          <circle cx="7" cy="3" r="1.1" />
          <circle cx="3" cy="8" r="1.1" />
          <circle cx="7" cy="8" r="1.1" />
          <circle cx="3" cy="13" r="1.1" />
          <circle cx="7" cy="13" r="1.1" />
        </svg>
      </span>
      <h3 class="title">{{ title() }}</h3>
      @if (badge(); as text) {
        <span class="badge">{{ text }}</span>
      }
      <db-card-menu [cardTitle]="title()" [groups]="menu()" (select)="menuSelect.emit($event)" />
    </header>

    <div class="body">
      <ng-content />
    </div>

    <!-- Exactly ONE ng-content per selector. Two of them (one per branch of a
         conditional) does not give a card two chances to show its action — the
         second slot receives nothing at all, and the card silently loses its
         button. So the footer is always in the template and hides itself when
         there is nothing to put in it. -->
    <footer class="foot" [class.is-bare]="!note() && !hasAction()">
      @if (note()) {
        <span class="note">{{ note() }}</span>
      }
      <ng-content select="[cardAction]" />
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--card);
      border: 1px solid var(--hairline);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      transition:
        box-shadow var(--dur) var(--ease),
        border-color var(--dur) var(--ease),
        transform var(--dur) var(--ease);
    }

    :host(:hover) {
      border-color: var(--hairline-strong);
      box-shadow: var(--shadow-lift);
    }

    :host(:focus-within) {
      border-color: var(--hairline-strong);
    }

    /* A card that has just arrived says so once, then stops. */
    :host(.is-arriving) {
      animation: arrive var(--dur-slow) var(--ease);
    }

    @keyframes arrive {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.985);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    .head {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 8px 9px 6px;
      border-bottom: 1px solid var(--hairline);
      background: var(--card);
      cursor: grab;
      touch-action: none;
    }

    .head:active {
      cursor: grabbing;
    }

    .grip {
      display: grid;
      place-items: center;
      width: 16px;
      height: 22px;
      flex: none;
      color: transparent;
      transition: color var(--dur-fast) var(--ease);
    }

    .grip.is-draggable {
      cursor: grab;
    }

    :host(:hover) .grip.is-draggable {
      color: var(--ink-faint);
    }

    .grip svg {
      width: 10px;
      height: 16px;
      fill: currentColor;
    }

    .title {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 12.5px;
      font-weight: 620;
      letter-spacing: 0.005em;
      color: var(--ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge {
      flex: none;
      padding: 2px 6px;
      border: 1px solid var(--hairline-strong);
      border-radius: 999px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .body {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .foot {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 8px 12px 10px;
      border-top: 1px solid var(--hairline);
    }

    .foot.is-bare {
      display: none;
    }

    .note {
      margin-right: auto;
      font-size: 11px;
      line-height: 1.35;
      color: var(--ink-faint);
      min-width: 0;
    }
  `,
})
export class CardShellComponent {
  readonly title = input.required<string>();
  readonly menu = input.required<readonly CardMenuGroup[]>();
  readonly note = input<string | undefined>(undefined);
  readonly badge = input<string | undefined>(undefined);
  readonly draggable = input(true);
  /** Whether a `[cardAction]` node was projected — the shell cannot see one. */
  readonly hasAction = input(false);
  readonly arriving = input(false);
  readonly menuSelect = output<string>();
}
