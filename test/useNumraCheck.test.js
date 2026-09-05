import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref } from 'vue';
import { useNumraCheck } from '../src/useNumraCheck.js';

/* An effect scope stands in for a component: watch and onScopeDispose behave
   exactly as they would inside one, and scope.stop() is an unmount. Mounting
   a real component to test a composable would be testing Vue. */
function inScope(fn) {
  const scope = effectScope();
  const out = scope.run(fn);
  return { ...out, stop: () => scope.stop() };
}

/** Replaces global fetch for one test, recording the calls. */
function stubFetch(handler) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init, calls.length);
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const RATED = { isRated: true, riskLevel: 'HIGH', riskScore: 72 };

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

test('an empty phone never spends a lookup', async () => {
  const f = stubFetch(() => ok(RATED));
  const c = inScope(() => useNumraCheck(ref(''), { debounceMs: 5 }));

  await tick(30);
  assert.equal(c.status.value, 'idle');
  assert.equal(f.calls.length, 0);

  c.stop();
  f.restore();
});

test('typing fires one lookup, not one per keystroke', async () => {
  /* Every lookup is billable. Without the debounce a merchant pays for every
     prefix of the number their operator typed, and the answer that lands
     last is often the answer to a prefix. */
  const f = stubFetch(() => ok(RATED));
  const phone = ref('06');
  const c = inScope(() => useNumraCheck(phone, { debounceMs: 20 }));

  phone.value = '060';
  await nextTick();
  phone.value = '0600';
  await nextTick();
  phone.value = '0600000000';
  await tick(60);

  assert.equal(f.calls.length, 1);
  assert.equal(JSON.parse(f.calls[0].init.body).phone, '0600000000');
  assert.equal(c.status.value, 'success');
  assert.equal(c.data.value.riskLevel, 'HIGH');

  c.stop();
  f.restore();
});

test('a slow earlier answer cannot overwrite a newer one', async () => {
  /* The failure this guards: the first lookup takes 80ms, the second 5ms,
     and the operator is shown the verdict for a number they already changed. */
  const f = stubFetch(async (_url, init, n) => {
    const phone = JSON.parse(init.body).phone;
    await tick(n === 1 ? 80 : 5);
    return ok({ ...RATED, phone, riskLevel: n === 1 ? 'LOW' : 'CRITICAL' });
  });

  const phone = ref('0611111111');
  const c = inScope(() => useNumraCheck(phone, { debounceMs: 1 }));
  await tick(20);
  phone.value = '0622222222';
  await tick(120);

  assert.equal(c.data.value.riskLevel, 'CRITICAL', 'the newer answer wins');
  assert.equal(c.data.value.phone, '0622222222');

  c.stop();
  f.restore();
});

test('a failing endpoint surfaces the server’s own code', async () => {
  const f = stubFetch(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: 'NUMRA_NOT_CONFIGURED', message: 'This endpoint has no authorize function.' }),
  }));
  const c = inScope(() => useNumraCheck(ref('0600000000'), { debounceMs: 1 }));

  await tick(40);
  assert.equal(c.status.value, 'error');
  assert.equal(c.error.value.code, 'NUMRA_NOT_CONFIGURED');
  assert.equal(c.data.value, null);

  c.stop();
  f.restore();
});

test('unmounting mid-lookup cancels rather than leaking', async () => {
  /* A component that goes away must not leave a timer holding its state, nor
     a request nobody will read. */
  let aborted = false;
  const f = stubFetch(async (_url, init) => {
    init.signal.addEventListener('abort', () => { aborted = true; });
    await tick(100);
    return ok(RATED);
  });

  const c = inScope(() => useNumraCheck(ref('0600000000'), { debounceMs: 1 }));
  await tick(20);
  c.stop();
  await tick(20);

  assert.equal(aborted, true);
  f.restore();
});

test('clearing the field drops the previous verdict', async () => {
  /* Leaving the old badge up beside an empty box says the blank field has a
     rating. */
  const f = stubFetch(() => ok(RATED));
  const phone = ref('0600000000');
  const c = inScope(() => useNumraCheck(phone, { debounceMs: 1 }));

  await tick(30);
  assert.equal(c.data.value.riskLevel, 'HIGH');

  phone.value = '';
  await tick(30);
  assert.equal(c.data.value, null);
  assert.equal(c.status.value, 'idle');

  c.stop();
  f.restore();
});

test('enabled: false holds the lookup until it is true', async () => {
  const f = stubFetch(() => ok(RATED));
  const on = ref(false);
  const c = inScope(() => useNumraCheck(ref('0600000000'), { enabled: on, debounceMs: 1 }));

  await tick(20);
  assert.equal(f.calls.length, 0);

  on.value = true;
  await tick(30);
  assert.equal(f.calls.length, 1);
  assert.equal(c.status.value, 'success');

  c.stop();
  f.restore();
});
