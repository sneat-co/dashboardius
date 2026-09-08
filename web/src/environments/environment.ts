/**
 * ONE environment, decided at runtime from the hostname — no
 * `environment.prod.ts`, no `fileReplacements`. The fleet's reason for this
 * (see communitycentrum's environment.ts) is that a mis-built or mis-deployed
 * bundle can then never point real users at the wrong project: there is only
 * one config, and the only thing that varies is which auth domain the browser
 * is actually on.
 *
 * Dashboardius shares the production Sneat Firebase project, `sneat-eur3-1`, so
 * a Sneat account signs in here without a second registration. That is the
 * point of the ecosystem: one identity across the products.
 */

export interface DashboardiusFirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
  readonly messagingSenderId: string;
}

export const PRODUCTION_HOST = 'dashboardius.com';

/**
 * The project's own Firebase-hosted auth domain. Used verbatim on localhost and
 * on any host that is not the production apex, because `signInWithRedirect`
 * needs an authorised domain and an unknown preview host will not be one.
 */
const FIREBASE_AUTH_HOST = 'sneat-eur3-1.firebaseapp.com';

/**
 * On dashboardius.com the auth domain is dashboardius.com ITSELF: the Cloudflare
 * Worker reverse-proxies Firebase's `/__/auth/*` handler, which keeps the whole
 * redirect first-party and avoids the third-party-storage completion race that
 * Safari/iOS hits when the handler lives on another origin. See worker.js.
 *
 * Two things must be true in the Firebase/Google consoles for that to work, and
 * neither is code: `dashboardius.com` must be an authorised Firebase Auth
 * domain, and `https://dashboardius.com/__/auth/handler` must be a Google OAuth
 * authorised redirect URI. Until then this falls back safely — an unauthorised
 * host simply uses the Firebase-hosted domain instead.
 */
export function firebaseConfig(hostname: string): DashboardiusFirebaseConfig {
  const isProductionApex = hostname === PRODUCTION_HOST || hostname === `www.${PRODUCTION_HOST}`;
  return {
    // Shared with the rest of the Sneat platform. A Firebase web apiKey is a
    // public identifier, not a secret — access is decided by security rules.
    apiKey: 'AIzaSyCeQu1WC182yD0VHrRm4nHUxVf27fY-MLQ',
    projectId: 'sneat-eur3-1',
    messagingSenderId: '588648831063',
    // TODO(founder): register a `dashboardius` Web App in the sneat-eur3-1
    // Firebase console and paste its appId here. Auth is unaffected by which
    // registered web app id is used; this only matters if Dashboardius ever
    // turns on Firebase Analytics, which it deliberately does not today.
    appId: '1:588648831063:web:303af7e0c5f8a7b10d6b12',
    authDomain: isProductionApex ? PRODUCTION_HOST : FIREBASE_AUTH_HOST,
  };
}
