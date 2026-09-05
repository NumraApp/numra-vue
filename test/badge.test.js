import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { RiskBadge } from '../src/RiskBadge.js';

const render = (props) => renderToString(createSSRApp({ render: () => h(RiskBadge, props) }));

test('a rated number renders its band', async () => {
  const html = await render({ check: { isRated: true, riskLevel: 'HIGH', riskScore: 72 } });
  assert.match(html, /High risk/);
  assert.match(html, /background:#FDECEC/);
});

test('a blacklisted number renders blacklisted, not its band', async () => {
  /* The rule the whole shared package exists to hold. If this ever renders
     "Medium risk", a Vue storefront is contradicting the control panel. */
  const html = await render({ check: { isBlacklisted: true, isRated: true, riskLevel: 'MEDIUM' } });
  assert.match(html, /Blacklisted/);
  assert.doesNotMatch(html, /Medium/);
});

test('an unrated number says so instead of claiming low risk', async () => {
  const html = await render({ check: { isRated: false, riskLevel: 'LOW', riskScore: 12 } });
  assert.match(html, /No history/);
  assert.doesNotMatch(html, /Low risk/);
});

test('loading is its own state', async () => {
  const html = await render({ check: { isRated: true, riskLevel: 'HIGH' }, loading: true });
  assert.match(html, /Checking/);
  assert.doesNotMatch(html, /High risk/);
});

test('nothing to show renders nothing', async () => {
  const html = await render({ check: null });
  assert.match(html, /^<!---->$/, 'an empty comment node, not a stray empty badge');
});

test('the score shows only when asked for and only when rated', async () => {
  const on = await render({ check: { isRated: true, riskLevel: 'HIGH', riskScore: 72 }, showScore: true });
  assert.match(on, /72/);

  const off = await render({ check: { isRated: true, riskLevel: 'HIGH', riskScore: 72 } });
  assert.doesNotMatch(off, /72/);

  /* "No history 12" reads as a measurement, and there is nothing measured. */
  const unrated = await render({ check: { isRated: false, riskLevel: 'LOW', riskScore: 12 }, showScore: true });
  assert.doesNotMatch(unrated, /12/);
});

test('a caller style merges over the container without losing the base', async () => {
  const html = await render({
    check: { isRated: true, riskLevel: 'LOW' },
    badgeStyle: { background: 'rebeccapurple' },
  });
  assert.match(html, /background:rebeccapurple/);
  assert.match(html, /display:inline-flex/);
});

test('the dot is hidden from assistive technology', async () => {
  /* It carries no information the label does not already say. */
  const html = await render({ check: { isRated: true, riskLevel: 'LOW' } });
  assert.match(html, /aria-hidden="true"/);
});

test('every numeric style carries its unit', async () => {
  /* The style OBJECTS went straight to h(). Vue, unlike React, does not
     append px to a bare number, so `width:7`, `height:7`, `border-radius:999`
     and `font-size:13` were all invalid and the browser dropped every one of
     them: the status dot rendered 0×0 and the pill came out square. Only Vue
     had this — Svelte and Angular already ran the objects through
     styleString(). */
  const html = await render({ check: { isRated: true, riskLevel: 'HIGH', riskScore: 72 }, showScore: true });

  for (const prop of ['width', 'height', 'border-radius', 'font-size', 'gap']) {
    /* Anchored on the separator so `height` does not match `line-height`. */
    const m = html.match(new RegExp(`[;"]${prop}:([^;"]+)`));
    assert.ok(m, `${prop} is not in the rendered style at all`);
    assert.doesNotMatch(m[1], /^-?\d+(\.\d+)?$/, `${prop}:${m[1]} has no unit and the browser drops it`);
  }
  /* The dot is 7px square and round, not 0×0 and square. */
  assert.match(html, /width:7px/);
  assert.match(html, /height:7px/);
  assert.match(html, /border-radius:999px/);
  assert.match(html, /border-radius:50%/);

  /* The properties where a bare number IS the value keep it. */
  assert.match(html, /font-weight:600(;|")/);
  assert.match(html, /opacity:0\.75(;|")/);
  assert.match(html, /line-height:1\.4(;|")/);
});

test('an absent score does not print the word "undefined"', async () => {
  /* The guard was `!== null`, and String(undefined) is five letters that
     rendered beside "High risk" as if they were the score. */
  const html = await render({ check: { isRated: true, riskLevel: 'HIGH', riskScore: undefined }, showScore: true });
  assert.match(html, /High risk/);
  assert.doesNotMatch(html, /undefined|NaN/);

  const nan = await render({ check: { isRated: true, riskLevel: 'HIGH', riskScore: NaN }, showScore: true });
  assert.doesNotMatch(nan, /undefined|NaN/);

  /* A real score, including zero, still shows. */
  assert.match(await render({ check: { isRated: true, riskLevel: 'LOW', riskScore: 0 }, showScore: true }), />0</);
});

test('a failed lookup says the check did not run', async () => {
  /* There was no error prop, so a 403, a 503 QUOTA_EXCEEDED and a dead
     network rendered exactly what an empty field renders: nothing. */
  const html = await render({ check: null, error: new Error('QUOTA_EXCEEDED') });
  assert.match(html, /Check unavailable/);
  assert.doesNotMatch(html, /risk|No history|Blacklisted/i, 'it must not read as a verdict');
});

test('the badge is announced when it appears', async () => {
  /* It appears and changes on its own while the operator is typing somewhere
     else; without a live region a screen-reader user never hears the verdict. */
  for (const props of [
    { check: { isRated: true, riskLevel: 'HIGH' } },
    { check: null, loading: true },
    { check: null, error: new Error('boom') },
  ]) {
    assert.match(await render(props), /role="status"/, `${Object.keys(props)} is not announced`);
  }
  /* No aria-label: the words are already inside, and naming it twice reads
     it twice. */
  assert.doesNotMatch(await render({ check: { isRated: true, riskLevel: 'HIGH' } }), /aria-label/);
});
