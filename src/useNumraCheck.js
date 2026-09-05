import { computed, ref, toValue, watch, onScopeDispose } from 'vue';
import { createCheckController, IDLE } from '@numra/browser';

/* ═══════════════════════════════════════════════════════════════════════════
   @numra/vue — the browser half, Vue-shaped
   ───────────────────────────────────────────────────────────────────────────
   No apiKey option, and no way to add one: this package talks to YOUR
   backend, the endpoint one of the server packages mounts.

   Debounce, abort and stale-answer rejection live in @numra/browser's
   controller, shared with React and Svelte — see there for why a late answer
   is dropped by identity rather than by catching AbortError. This file turns
   that controller's state into refs and hands Vue's reactivity to it.

   Plain JavaScript with render functions rather than .vue single-file
   components, so the package needs no build step and publishes exactly what
   is in the repo.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Look up a phone number through your own backend.
 *
 * `phone` may be a ref, a getter, or a plain string — whichever your form
 * already has. A falsy value disables the lookup rather than sending one.
 *
 * @param {import('vue').MaybeRefOrGetter<string|null>} phone
 * @param {{ endpoint?: string, enabled?: import('vue').MaybeRefOrGetter<boolean>, debounceMs?: number }} [options]
 */
export function useNumraCheck(phone, options = {}) {
  const { endpoint = '/api/numra', enabled = true, debounceMs = 400 } = options;

  const status = ref(IDLE.status);
  const data = ref(IDLE.data);
  const error = ref(IDLE.error);

  const controller = createCheckController({
    endpoint,
    debounceMs,
    onState: (s) => {
      status.value = s.status;
      data.value = s.data;
      error.value = s.error;
    },
  });

  const stop = watch(
    () => [toValue(phone), toValue(enabled)],
    ([value, on]) => controller.set(value, on),
    { immediate: true },
  );

  onScopeDispose(() => {
    controller.dispose();
    stop();
  });

  return {
    data,
    error,
    status,
    isLoading: computed(() => status.value === 'loading'),
    refetch: () => controller.refetch(),
  };
}
