import { Injectable, computed, signal } from '@angular/core';
import type { Auth, User } from 'firebase/auth';

import { firebaseConfig } from '../../environments/environment';

export type AuthStatus = 'unknown' | 'signed-out' | 'signed-in';

export interface AuthUser {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly photoURL: string | null;
}

/**
 * Firebase Authentication, loaded on demand.
 *
 * The Firebase SDK is ~130 kB of JavaScript that a visitor who only wants to
 * look at a dashboard never needs. So it is never in the initial bundle: it is
 * imported when the visitor reaches for sign-in, and once on an idle callback
 * after first paint to restore an existing session. Until that import resolves
 * the status is `unknown` and the UI says nothing about who you are, rather
 * than flashing "Sign in" at somebody who is already signed in.
 *
 * There is no second identity system here. This is the same `sneat-eur3-1`
 * project, and the same modular `firebase/auth` SDK the Sneat libraries use —
 * what is not reused is `@sneat/auth-ui`, whose login screens are built out of
 * Ionic components that this PrimeNG application does not have.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = typeof window !== 'undefined';
  private authPromise?: Promise<Auth>;

  readonly status = signal<AuthStatus>('unknown');
  readonly user = signal<AuthUser | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly signedIn = computed(() => this.status() === 'signed-in');
  readonly shortName = computed(() => {
    const u = this.user();
    if (!u) return '';
    const name = u.displayName?.trim() || u.email?.split('@')[0] || 'you';
    return name.split(/\s+/)[0];
  });

  /**
   * Warm the SDK and restore any existing session. Safe to call more than once;
   * safe to call on the server, where it does nothing.
   */
  restore(): void {
    if (!this.isBrowser) return;
    void this.auth().catch(() => this.status.set('signed-out'));
  }

  async signInWithGoogle(): Promise<void> {
    await this.attempt(async (auth) => {
      const { GoogleAuthProvider, signInWithRedirect } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Redirect rather than popup: the fleet's Safari/iOS finding is that a
      // popup completing against a cross-origin auth domain races third-party
      // storage. With the Worker proxying /__/auth/* this stays first-party.
      await signInWithRedirect(auth, provider);
    });
  }

  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<boolean> {
    return this.attempt(async (auth) => {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName?.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }
      this.publish(credential.user);
    });
  }

  async signInWithEmail(email: string, password: string): Promise<boolean> {
    return this.attempt(async (auth) => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const credential = await signInWithEmailAndPassword(auth, email, password);
      this.publish(credential.user);
    });
  }

  async sendResetEmail(email: string): Promise<boolean> {
    return this.attempt(async (auth) => {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
    });
  }

  async signOut(): Promise<void> {
    await this.attempt(async (auth) => {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      this.publish(null);
    });
  }

  clearError(): void {
    this.error.set(null);
  }

  private async attempt(fn: (auth: Auth) => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn(await this.auth());
      return true;
    } catch (err) {
      this.error.set(readableAuthError(err));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private auth(): Promise<Auth> {
    this.authPromise ??= this.initAuth();
    return this.authPromise;
  }

  private async initAuth(): Promise<Auth> {
    const [{ initializeApp, getApps }, authModule] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);
    const config = firebaseConfig(window.location.hostname);
    const app = getApps()[0] ?? initializeApp(config);
    const auth = authModule.getAuth(app);

    authModule.onAuthStateChanged(auth, (user) => this.publish(user));

    // Completes a signInWithRedirect that started on a previous page load. A
    // failure here is the visitor's problem to see, not a silent no-op.
    authModule.getRedirectResult(auth).catch((err) => this.error.set(readableAuthError(err)));

    return auth;
  }

  private publish(user: User | null): void {
    this.user.set(
      user
        ? {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }
        : null,
    );
    this.status.set(user ? 'signed-in' : 'signed-out');
  }
}

/** Firebase error codes are precise and unreadable. These are the common ones. */
export function readableAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look right.';
    case 'auth/missing-password':
      return 'A password is required.';
    case 'auth/weak-password':
      return 'Six characters minimum — Dashboardius is counting.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is wrong. No hint about which — that is the point.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute, then try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for sign-in yet.';
    case 'auth/network-request-failed':
      return 'The network gave up. Check the connection and try again.';
    default:
      return code ? `Sign-in failed (${code}).` : 'Sign-in failed. Try again.';
  }
}
