import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Popover } from 'primeng/popover';

import { CardMenuGroup } from './card-menu.model';

/**
 * A card's menu.
 *
 * PrimeNG supplies the overlay — positioning, outside-click, Escape, the
 * portal — and Dashboardius supplies the contents, because the interesting row
 * here is a CHECKABLE METRIC, not a link. That is the whole point of the
 * hidden-metric picker: a chart's available metrics stay listed whether or not
 * they are on screen, so hiding one is a view decision rather than a deletion.
 *
 * Keyboard: Up/Down move, Home/End jump, Enter/Space activate, Escape closes
 * and returns focus to the trigger.
 */
@Component({
  selector: 'db-card-menu',
  standalone: true,
  imports: [Popover],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      class="trigger"
      [attr.aria-label]="'Card menu: ' + cardTitle()"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      (click)="toggle($event)"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="3" cy="8" r="1.4" />
        <circle cx="8" cy="8" r="1.4" />
        <circle cx="13" cy="8" r="1.4" />
      </svg>
    </button>

    <p-popover #popover [dismissable]="true" (onShow)="onShow()" (onHide)="open.set(false)">
      <div class="menu" role="menu" [attr.aria-label]="cardTitle() + ' options'" (keydown)="onKeydown($event)">
        @for (group of groups(); track group.id) {
          @if (group.label) {
            <p class="group-label">{{ group.label }}</p>
          }
          @for (entry of group.entries; track entry.id) {
            <button
              type="button"
              class="entry"
              [class.is-danger]="entry.danger"
              [class.is-checked]="entry.checked"
              [attr.role]="entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox'"
              [attr.aria-checked]="entry.checked === undefined ? null : entry.checked"
              [disabled]="entry.disabled"
              (click)="choose(entry.id)"
            >
              @if (entry.checked !== undefined) {
                <span class="tick" aria-hidden="true">
                  @if (entry.checked) {
                    <svg viewBox="0 0 14 14" focusable="false">
                      <path d="M2.5 7.4 5.6 10.5 11.5 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  } @else {
                    <svg viewBox="0 0 14 14" focusable="false">
                      <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.4" />
                    </svg>
                  }
                </span>
              }
              <span class="label">{{ entry.label }}</span>
              @if (entry.hint) {
                <span class="hint">{{ entry.hint }}</span>
              }
            </button>
          }
          @if (!$last) {
            <hr />
          }
        }
      </div>
    </p-popover>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .trigger {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: var(--ink-faint);
      cursor: pointer;
      transition:
        color var(--dur-fast) var(--ease),
        background var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease);
    }

    .trigger svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    .trigger:hover,
    .trigger[aria-expanded='true'] {
      color: var(--ink);
      background: var(--paper-sunken);
      border-color: var(--hairline);
    }

    .menu {
      display: grid;
      gap: 1px;
      min-width: 214px;
      max-width: 280px;
    }

    .group-label {
      margin: 8px 6px 3px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .group-label:first-child {
      margin-top: 2px;
    }

    hr {
      margin: 5px 0;
      border: 0;
      border-top: 1px solid var(--hairline);
    }

    .entry {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--ink-soft);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
    }

    .entry:hover:not(:disabled),
    .entry:focus-visible {
      background: var(--paper-sunken);
      color: var(--ink);
    }

    .entry:disabled {
      opacity: 0.42;
      cursor: default;
    }

    .entry.is-danger:hover:not(:disabled) {
      background: color-mix(in srgb, var(--critical) 12%, transparent);
      color: var(--critical);
    }

    .entry.is-checked {
      color: var(--ink);
      font-weight: 560;
    }

    .tick {
      display: grid;
      place-items: center;
      width: 15px;
      height: 15px;
      flex: none;
      color: var(--ink-faint);
    }

    .entry.is-checked .tick {
      color: var(--brand);
    }

    .tick svg {
      width: 14px;
      height: 14px;
    }

    .label {
      flex: 1 1 auto;
      min-width: 0;
    }

    .hint {
      flex: none;
      font-size: 11px;
      color: var(--ink-faint);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CardMenuComponent {
  readonly cardTitle = input.required<string>();
  readonly groups = input.required<readonly CardMenuGroup[]>();
  readonly select = output<string>();

  protected readonly open = signal(false);

  private readonly popover = viewChild.required<Popover>('popover');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected toggle(event: Event): void {
    this.popover().toggle(event);
    this.open.update((o) => !o);
  }

  protected onShow(): void {
    this.open.set(true);
    queueMicrotask(() => this.focusEntry(0));
  }

  protected choose(id: string): void {
    this.select.emit(id);
    this.popover().hide();
    this.trigger().nativeElement.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const items = this.itemElements();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusEntry((current + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusEntry((current - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        this.focusEntry(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusEntry(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.popover().hide();
        this.trigger().nativeElement.focus();
        break;
      default:
        break;
    }
  }

  private itemElements(): HTMLButtonElement[] {
    const container = this.popover().container as HTMLElement | undefined;
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLButtonElement>('.entry:not(:disabled)'));
  }

  private focusEntry(index: number): void {
    const items = this.itemElements();
    items[Math.max(0, Math.min(index, items.length - 1))]?.focus();
  }
}
