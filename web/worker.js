/**
 * dashboardius.com — the edge in front of the static build.
 *
 * Two jobs, and deliberately no more:
 *
 *   1. Reverse-proxy Firebase's auth handler. `/__/auth/*` lives on the
 *      Firebase project host, and serving it from THIS origin is what keeps
 *      `signInWithRedirect` first-party — otherwise Safari/iOS races the
 *      cross-origin completion against third-party storage partitioning and
 *      the visitor lands back signed out. Same pattern as noticeboard.cc.
 *
 *   2. Canonicalise the host and serve the prerendered app. `/` is real HTML
 *      produced at build time, so a crawler and a cold visitor both get the
 *      board without waiting for JavaScript.
 *
 * Everything else — routing, state, rendering — belongs in the app, not here.
 */

const FIREBASE_AUTH_ORIGIN = 'https://sneat-eur3-1.firebaseapp.com';
const CANONICAL_HOST = 'dashboardius.com';

/** Immutable build output: hashed filenames can be cached forever. */
const HASHED_ASSET = /-[A-Z0-9_]{8,}\.(?:js|css)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Firebase's auth handler, proxied verbatim — including the 302 it
    //    issues to Google, hence redirect: 'manual'.
    if (path.startsWith('/__/')) {
      const proxied = await fetch(FIREBASE_AUTH_ORIGIN + path + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      });
      return new Response(proxied.body, {
        status: proxied.status,
        statusText: proxied.statusText,
        headers: proxied.headers,
      });
    }

    // 2. One canonical host. `www` is a permanent redirect rather than a second
    //    custom domain serving duplicate content.
    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    const asset = await env.ASSETS.fetch(request);

    if (asset.status !== 404) {
      const response = new Response(asset.body, asset);
      if (HASHED_ASSET.test(path)) {
        response.headers.set('cache-control', 'public, max-age=31536000, immutable');
      } else if (path === '/' || path.endsWith('.html')) {
        // The shell changes on every deploy; let the edge hold it briefly and
        // revalidate rather than pinning a stale board to a browser.
        response.headers.set('cache-control', 'public, max-age=0, must-revalidate');
      }
      applySecurityHeaders(response.headers);
      return response;
    }

    // 3. Anything unrecognised is the single-page app's problem, and the app
    //    routes it to the board. Served as 200 at the requested URL so a deep
    //    link keeps its address instead of bouncing to `/`.
    const shell = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    const response = new Response(shell.body, { status: 200, headers: new Headers(shell.headers) });
    response.headers.set('content-type', 'text/html; charset=utf-8');
    response.headers.set('cache-control', 'public, max-age=0, must-revalidate');
    applySecurityHeaders(response.headers);
    return response;
  },
};

function applySecurityHeaders(headers) {
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('permissions-policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()');
}
