# @getnumra/vue

**A debounced phone-check composable and a risk badge for Vue, talking to your own backend.**

[![npm version](https://img.shields.io/npm/v/@getnumra/vue)](https://www.npmjs.com/package/@getnumra/vue) [![npm downloads](https://img.shields.io/npm/dm/@getnumra/vue)](https://www.npmjs.com/package/@getnumra/vue) [![licence: MIT](https://img.shields.io/npm/l/@getnumra/vue)](LICENSE)

The browser half, Vue-shaped. Calls **your** backend — it never holds a Numra
API key and cannot be made to.

```bash
npm install @getnumra/vue
```

## You need the other half first

This package talks to an endpoint you mount yourself, with one of:
`@getnumra/express`, `@getnumra/fastify`, `@getnumra/next`, `@getnumra/nuxt`,
`numra/laravel`, or `Numra\Handlers` in plain PHP. That endpoint holds the key.

Numra reads a shared fraud ledger, so a key in a bundle is a key in everyone's
hands. There is no `apiKey` option here, and a test fails the build if one ever
appears.

## Use it

```vue
<script setup>
import { ref } from 'vue';
import { useNumraCheck, RiskBadge } from '@getnumra/vue';

const phone = ref('');
const { data, isLoading } = useNumraCheck(phone);
</script>

<template>
  <input v-model="phone" inputmode="tel" />
  <RiskBadge :check="data" :loading="isLoading" show-score />
</template>
```

`phone` may be a ref, a getter, or a plain string. An empty value disables the
lookup rather than sending one.

## What it does that a plain fetch would not

- **Debounces.** Typing a number otherwise fires a request per keystroke, and
  every lookup is billable.
- **Aborts the superseded request** rather than ignoring it, so the cancelled
  one stops on the wire.
- **Drops a late answer by identity**, not by catching `AbortError`. An abort
  landing while `res.json()` is still running does not always throw, and the
  operator would be shown the verdict for a number they already changed.
- **Clears the verdict when the field is cleared.** An old badge beside an
  empty box says the blank field has a rating.

All of that lives in `@getnumra/browser`, shared with the React, Svelte and
Angular packages, so the four cannot drift apart.

## Reading the result

`riskScore` alone **cannot** tell a checked-and-clean customer from a complete
stranger — both come back low. On a cash-on-delivery store most buyers are
new, so `RiskBadge` renders an unrated number as **“No history”**, never “Low
risk”, and a blacklisted number as **“Blacklisted”** even when its band says
something milder. Those two rules are what stop a storefront contradicting the
control panel.

## Options

| | |
|---|---|
| `endpoint` | default `/api/numra` |
| `enabled` | ref or boolean; false holds the lookup |
| `debounceMs` | default 400 |

Returns `{ data, error, status, isLoading, refetch }` — all refs except
`refetch`.

## Errors

`error.value` is a `NumraRequestError` carrying the code your own endpoint
returned: `NUMRA_NOT_CONFIGURED`, `FORBIDDEN`, `QUOTA_EXCEEDED`,
`UPSTREAM_UNAVAILABLE`. Branch on `.code`, not on the message.

## Building your own badge

```js
import { riskStateFor, RISK_STATES } from '@getnumra/vue';
```

Same decision, your markup.

## Release notes

Every release is tagged and written up on the
[Releases page](https://github.com/NumraApp/numra-vue/releases). The same
history in one file is in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Bug reports and patches are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers
running the tests, the regression test a change is expected to bring with it,
and which repository a given fix actually belongs in.

## Security

Vulnerabilities go privately to the address in [SECURITY.md](SECURITY.md).
**Do not open a public issue for a security problem** — a public report is a
working exploit for every merchant running the released version until a fix
ships.

## The rest of the family

Twelve packages, one contract. The server side holds the API key; the browser
side calls the endpoint the server side mounts.

Server:

| Package | Repository |
|---|---|
| `@getnumra/core` | [numra-js-core](https://github.com/NumraApp/numra-js-core) |
| `@getnumra/express` | [numra-express](https://github.com/NumraApp/numra-express) |
| `@getnumra/fastify` | [numra-fastify](https://github.com/NumraApp/numra-fastify) |
| `@getnumra/next` | [numra-next](https://github.com/NumraApp/numra-next) |
| `@getnumra/nuxt` | [numra-nuxt](https://github.com/NumraApp/numra-nuxt) |
| `numra/numra-php` | [numra-php](https://github.com/NumraApp/numra-php) |
| `numra/laravel` | [numra-laravel](https://github.com/NumraApp/numra-laravel) |

Browser:

| Package | Repository |
|---|---|
| `@getnumra/browser` | [numra-browser](https://github.com/NumraApp/numra-browser) |
| `@getnumra/react` | [numra-react](https://github.com/NumraApp/numra-react) |
| `@getnumra/vue` | [numra-vue](https://github.com/NumraApp/numra-vue) — this repo |
| `@getnumra/svelte` | [numra-svelte](https://github.com/NumraApp/numra-svelte) |
| `@getnumra/angular` | [numra-angular](https://github.com/NumraApp/numra-angular) |

Documentation for all of them is at [numra.ma/docs](https://numra.ma/docs).

## Licence

MIT
