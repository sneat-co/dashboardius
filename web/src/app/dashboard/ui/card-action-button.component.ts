import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { ICardAction } from '../model/board.model';
import { AuthService } from '../../auth/auth.service';

/**
 * The call to action in a card's footer.
 *
 * "Add me" on the sign-ups chart and "Sign me in" on the sign-ins chart are the
 * two jokes on this page that also do real work: they read as captions for the
 * metric next to them, and they start the actual Firebase flow. Once the
 * visitor is signed in the button stops asking and starts acknowledging —
 * anything else would be a button that lies about what pressing it does.
 *
 * The metric itself does NOT move when you sign up. It is sample data, it says
 * so in the footer, and quietly incrementing a fake number would be the exact
 * kind of small dishonesty that makes a product hard to trust later.
 */
@Component({
  selector: 'db-card-action-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (action().kind === 'link') {
      <a class="cta" [href]="action().href" target="_blank" rel="noopener">
        {{ label() }}
        <span class="arrow" aria-hidden="true">↗</span>
      </a>
    } @else {
      <button
        type="button"
        class="cta"
        [class.is-done]="done()"
        [disabled]="done()"
        (click)="run.emit(action().kind === 'command' ? 'command:' + action().commandId : action().kind)"
      >
        {{ label() }}
        @if (!done()) {
          <span class="arrow" aria-hidden="true">→</span>
        }
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      padding: 0 10px;
      border: 1px solid var(--brand);
      border-radius: 999px;
      background: var(--brand);
      color: var(--brand-ink);
      font-size: 12px;
      font-weight: 620;
      white-space: nowrap;
      text-decoration: none;
      cursor: pointer;
      transition:
        background var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        transform var(--dur-fast) var(--ease);
    }

    .cta:hover:not(:disabled) {
      background: var(--brand-hover);
      border-color: var(--brand-hover);
    }

    .cta:active:not(:disabled) {
      transform: translateY(1px);
    }

    .cta.is-done {
      background: transparent;
      border-color: var(--hairline-strong);
      color: var(--ink-muted);
      cursor: default;
    }

    .arrow {
      font-size: 11px;
      transition: transform var(--dur-fast) var(--ease);
    }

    .cta:hover .arrow {
      transform: translateX(2px);
    }
  `,
})
export class CardActionButtonComponent {
  readonly action = input.required<ICardAction>();
  readonly run = output<string>();

  private readonly auth = inject(AuthService);

  /** An auth CTA is "done" once the visitor is signed in. */
  protected readonly done = computed(() => {
    const kind = this.action().kind;
    return (kind === 'sign-up' || kind === 'sign-in') && this.auth.signedIn();
  });

  protected readonly label = computed(() => {
    const action = this.action();
    return this.done() && action.signedInLabel ? action.signedInLabel : action.label;
  });
}
