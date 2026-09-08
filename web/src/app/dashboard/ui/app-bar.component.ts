import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';

/**
 * The masthead.
 *
 * The wordmark is the page's `<h1>`: it is genuinely the top-level heading, and
 * putting a separate hero headline underneath it purely for a crawler would
 * mean shipping a marketing page bolted to an app. The tagline sits with the
 * board it describes, one level down.
 */
@Component({
  selector: 'db-app-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- A real <header>: the masthead is the page's banner landmark, and
         without it the page offered exactly one landmark to jump between. -->
    <header class="inner">
      <h1 class="wordmark">
        <span class="mark" aria-hidden="true">
          <svg viewBox="0 0 22 22" focusable="false">
            <!-- A gauge: the arc a dial sweeps, and the needle on it. -->
            <path d="M2.6 16.2a10 10 0 1 1 16.8 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" />
            <path d="M11 12.6 15.6 6.9" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" />
            <circle cx="11" cy="13.1" r="1.9" fill="currentColor" />
          </svg>
        </span>
        Dashboardius
      </h1>

      <p class="badge">
        <span class="badge-dot" aria-hidden="true"></span>
        Live demo board
      </p>

      <div class="spacer"></div>

      <button
        type="button"
        class="ghost icon"
        [attr.aria-label]="theme.isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
        (click)="theme.toggle()"
      >
        @if (theme.isDark()) {
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="10" cy="10" r="3.9" fill="currentColor" />
            <g stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="M10 1.6v2.1M10 16.3v2.1M18.4 10h-2.1M3.7 10H1.6M15.9 4.1l-1.5 1.5M5.6 14.4l-1.5 1.5M15.9 15.9l-1.5-1.5M5.6 5.6 4.1 4.1" />
            </g>
          </svg>
        } @else {
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M16.6 12.4A7.2 7.2 0 0 1 7.6 3.4a7.2 7.2 0 1 0 9 9Z"
              fill="currentColor"
            />
          </svg>
        }
      </button>

      @switch (auth.status()) {
        @case ('signed-in') {
          <div class="account">
            <span class="who" title="{{ auth.user()?.email }}">
              <span class="avatar" aria-hidden="true">{{ initial() }}</span>
              {{ auth.shortName() }}
            </span>
            <button type="button" class="ghost" (click)="auth.signOut()">Sign out</button>
          </div>
        }
        @case ('signed-out') {
          <button type="button" class="solid" (click)="signIn.emit()">Sign in</button>
        }
        @default {
          <span class="account-pending" aria-hidden="true"></span>
        }
      }
    </header>
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: 30;
      display: block;
      background: color-mix(in srgb, var(--paper) 88%, transparent);
      backdrop-filter: saturate(180%) blur(12px);
      border-bottom: 1px solid var(--hairline);
    }

    .inner {
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: var(--shell-max);
      margin: 0 auto;
      padding: 9px 20px;
    }

    .wordmark {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      font-size: 15px;
      font-weight: 680;
      letter-spacing: -0.022em;
      color: var(--ink);
    }

    .mark {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      color: var(--brand);
    }

    .mark svg {
      width: 20px;
      height: 20px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin: 0;
      padding: 2px 8px;
      border: 1px solid var(--hairline-strong);
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 620;
      letter-spacing: 0.03em;
      color: var(--ink-muted);
      white-space: nowrap;
    }

    .badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--good);
    }

    .spacer {
      flex: 1 1 auto;
    }

    .ghost,
    .solid {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      padding: 0 11px;
      border-radius: 7px;
      font-size: 12.5px;
      font-weight: 580;
      cursor: pointer;
      transition:
        background var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .ghost {
      border: 1px solid transparent;
      background: transparent;
      color: var(--ink-muted);
    }

    .ghost:hover {
      background: var(--paper-sunken);
      border-color: var(--hairline);
      color: var(--ink);
    }

    .icon {
      width: 30px;
      padding: 0;
      justify-content: center;
    }

    .icon svg {
      width: 17px;
      height: 17px;
    }

    .solid {
      border: 1px solid var(--brand);
      background: var(--brand);
      color: var(--brand-ink);
    }

    .solid:hover {
      background: var(--brand-hover);
      border-color: var(--brand-hover);
    }

    .account {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .who {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 4px 0 0;
      font-size: 12.5px;
      font-weight: 580;
      color: var(--ink);
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .avatar {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--brand);
      color: var(--brand-ink);
      font-size: 11px;
      font-weight: 700;
    }

    /* Auth state is unknown until the SDK loads; hold the space instead of
       flashing "Sign in" at somebody who is already signed in. */
    .account-pending {
      width: 66px;
      height: 30px;
      border-radius: 7px;
      background: var(--paper-sunken);
    }

    @media (max-width: 700px) {
      .inner {
        padding: 8px 12px;
        gap: 7px;
      }

      .badge {
        display: none;
      }

      .who {
        max-width: 92px;
      }
    }
  `,
})
export class AppBarComponent {
  readonly signIn = output<void>();

  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected initial(): string {
    const u = this.auth.user();
    const source = u?.displayName || u?.email || '?';
    return source.trim().charAt(0).toUpperCase();
  }
}
