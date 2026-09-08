import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';

import { AuthService } from './auth.service';

export type AuthIntent = 'sign-up' | 'sign-in';

/**
 * Sign-in and sign-up, in a Dashboardius dialog.
 *
 * Deliberately not a provider-hosted screen the visitor is thrown out to: they
 * were mid-way through poking at a dashboard, and the fastest way to lose them
 * is to replace it with somebody else's login page. Google sign-in still leaves
 * the page (a redirect, not a popup — see AuthService), but email sign-up
 * completes right here and the board is exactly where they left it.
 */
@Component({
  selector: 'db-auth-dialog',
  standalone: true,
  imports: [Dialog, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="open()"
      (visibleChange)="open.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      closeAriaLabel="Close sign-in"
      [style]="{ width: 'min(94vw, 400px)' }"
      [header]="isSignUp() ? 'Join the sample size' : 'Welcome back'"
    >
      <p class="lede">
        {{
          isSignUp()
            ? 'One Sneat account works across every Sneat product — including this one, once it has more than sample data to show you.'
            : 'Sign in with the Sneat account you already have.'
        }}
      </p>

      <button type="button" class="google" [disabled]="auth.busy()" (click)="google()">
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
        </svg>
        Continue with Google
      </button>

      <p class="rule"><span>or with an email address</span></p>

      <form (ngSubmit)="submit()">
        @if (isSignUp()) {
          <label>
            <span>Name <em>optional</em></span>
            <input type="text" name="name" autocomplete="name" [(ngModel)]="name" placeholder="How should we address you?" />
          </label>
        }
        <label>
          <span>Email</span>
          <input
            type="email"
            name="email"
            required
            autocomplete="email"
            [(ngModel)]="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            required
            [autocomplete]="isSignUp() ? 'new-password' : 'current-password'"
            [(ngModel)]="password"
            [placeholder]="isSignUp() ? 'At least six characters' : 'Your password'"
          />
        </label>

        @if (auth.error(); as error) {
          <p class="error" role="alert">{{ error }}</p>
        }
        @if (notice(); as text) {
          <p class="notice" role="status">{{ text }}</p>
        }

        <button type="submit" class="primary" [disabled]="auth.busy() || !canSubmit()">
          {{ auth.busy() ? 'One moment…' : isSignUp() ? 'Create my account' : 'Sign in' }}
        </button>
      </form>

      <p class="switch">
        @if (isSignUp()) {
          Already have an account?
          <button type="button" (click)="intent.set('sign-in')">Sign in</button>
        } @else {
          No account yet?
          <button type="button" (click)="intent.set('sign-up')">Create one</button>
          <span aria-hidden="true">·</span>
          <button type="button" (click)="resetPassword()">Forgot password</button>
        }
      </p>
    </p-dialog>
  `,
  styles: `
    .lede {
      margin: 0 0 14px;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--ink-muted);
    }

    .google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      width: 100%;
      min-height: 40px;
      border: 1px solid var(--control-border);
      border-radius: var(--radius-control);
      background: var(--card);
      color: var(--ink);
      font-size: 13.5px;
      font-weight: 580;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        background var(--dur-fast) var(--ease);
    }

    .google:hover:not(:disabled) {
      background: var(--paper-sunken);
      border-color: var(--ink-faint);
    }

    .google svg {
      width: 17px;
      height: 17px;
    }

    .rule {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 15px 0;
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    .rule::before,
    .rule::after {
      content: '';
      flex: 1 1 auto;
      height: 1px;
      background: var(--hairline);
    }

    form {
      display: grid;
      gap: 10px;
    }

    label {
      display: grid;
      gap: 4px;
    }

    label > span {
      font-size: 11px;
      font-weight: 640;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    label em {
      font-style: normal;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      opacity: 0.8;
    }

    input {
      min-height: 38px;
      padding: 0 10px;
      border: 1px solid var(--control-border);
      border-radius: var(--radius-control);
      background: var(--card);
      color: var(--ink);
      font: inherit;
      font-size: 13.5px;
    }

    input:focus-visible {
      border-color: var(--brand);
      outline: 2px solid var(--brand);
      outline-offset: 1px;
    }

    .primary {
      min-height: 40px;
      margin-top: 3px;
      border: 0;
      border-radius: var(--radius-control);
      background: var(--brand);
      color: var(--brand-ink);
      font-size: 13.5px;
      font-weight: 620;
      cursor: pointer;
      transition: background var(--dur-fast) var(--ease);
    }

    .primary:hover:not(:disabled) {
      background: var(--brand-hover);
    }

    .primary:disabled {
      opacity: 0.55;
      cursor: default;
    }

    .error,
    .notice {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--radius-control);
      font-size: 12px;
      line-height: 1.45;
    }

    .error {
      background: color-mix(in srgb, var(--critical) 12%, transparent);
      color: var(--critical);
    }

    .notice {
      background: var(--brand-wash);
      color: var(--brand);
    }

    .switch {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 14px 0 0;
      padding-top: 12px;
      border-top: 1px solid var(--hairline);
      font-size: 12px;
      color: var(--ink-muted);
    }

    .switch button {
      padding: 0;
      border: 0;
      background: none;
      color: var(--brand);
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  `,
})
export class AuthDialogComponent {
  readonly open = model.required<boolean>();
  readonly intent = model.required<AuthIntent>();
  /** Fires however the dialog was dismissed — Escape, close button, or mask. */
  readonly closed = output<void>();

  protected readonly auth = inject(AuthService);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly name = signal('');
  protected readonly notice = signal<string | null>(null);

  protected readonly isSignUp = computed(() => this.intent() === 'sign-up');
  protected readonly canSubmit = computed(
    () => this.email().includes('@') && this.password().length >= 6,
  );

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => {
        // Reopening should never show the last attempt's failure.
        if (open) {
          this.auth.clearError();
          this.notice.set(null);
        } else if (this.wasOpen) {
          this.closed.emit();
        }
        this.wasOpen = open;
      });
    });
  }

  private wasOpen = false;

  protected google(): void {
    void this.auth.signInWithGoogle();
  }

  protected async submit(): Promise<void> {
    this.notice.set(null);
    const ok = this.isSignUp()
      ? await this.auth.signUpWithEmail(this.email(), this.password(), this.name())
      : await this.auth.signInWithEmail(this.email(), this.password());
    if (ok) {
      this.password.set('');
      this.open.set(false);
    }
  }

  protected async resetPassword(): Promise<void> {
    if (!this.email().includes('@')) {
      this.notice.set('Enter your email address first, then press this again.');
      return;
    }
    if (await this.auth.sendResetEmail(this.email())) {
      this.notice.set('Reset email sent, if that address has an account.');
    }
  }
}
