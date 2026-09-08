#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Deliberately more than a 200: a Worker that serves an empty shell, or a build
 * whose prerender silently produced nothing, both return 200 happily. So this
 * asserts the things that would actually be broken — the board is in the HTML,
 * the sample-data labelling survived, the canonical URL is right, and the
 * Firebase auth proxy is reachable, since that path is invisible until someone
 * tries to sign in and cannot.
 */
const base = (process.argv[2] ?? 'https://dashboardius.com').replace(/\/$/, '');

/**
 * The very first deploy attaches the custom domain moments before this runs, so
 * the runner's resolver has not seen the record yet and every check fails on
 * DNS rather than on anything about the site. Wait for the name to resolve
 * before concluding the deploy is broken — but bound the wait, because a name
 * that never resolves IS a broken deploy.
 */
async function waitForDns(attempts = 10) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await fetch(base + '/', { method: 'HEAD' });
      return;
    } catch (err) {
      const dns = String(err?.cause?.code ?? '') === 'ENOTFOUND';
      if (!dns || i === attempts) return; // let the real checks report it
      const wait = Math.min(30_000, 2_000 * 2 ** (i - 1));
      console.log(`…${base} does not resolve yet; retrying in ${wait / 1000}s (${i}/${attempts})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

await waitForDns();

const failures = [];
const check = (label, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures.push(label);
};

const res = await fetch(base + '/', { redirect: 'follow' });
check(`GET / responds 200 (got ${res.status})`, res.status === 200);

const html = await res.text();
check('the board is in the served HTML', html.includes('Product pulse'));
check('the tagline is in the served HTML', html.includes('Any data. Your metrics. One view.'));
check('demo data is labelled', html.includes('Sample data'));
check('canonical URL points at the apex', html.includes('href="https://dashboardius.com/"'));
check('a chart ships its table twin', html.includes('<table'));

// The Firebase auth handler is reverse-proxied by the Worker. Sign-in is broken
// without it, and nothing else on the page would reveal that.
const auth = await fetch(`${base}/__/auth/iframe.js`, { redirect: 'manual' });
check(`/__/auth/* is proxied (got ${auth.status})`, auth.status > 0 && auth.status < 500);

// A deep link must reach the app, not a 404 page.
const deep = await fetch(`${base}/anything/not/real`, { redirect: 'follow' });
check(`a deep link serves the app (got ${deep.status})`, deep.status === 200);

if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed.`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
