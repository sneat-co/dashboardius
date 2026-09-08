import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Prerendered at build time, not rendered per request: the board's initial
 * state is a constant, so the homepage can ship as static HTML on Cloudflare's
 * edge with no server in the path at all. Hydration takes over from there.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Prerender },
];
