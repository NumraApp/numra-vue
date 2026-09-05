import type { ComputedRef, DefineComponent, MaybeRefOrGetter, Ref } from 'vue';
import type { BrowserCheck, NumraRequestError } from '@numra/browser';

export interface UseNumraCheckOptions {
  /** Your own backend, mounted by one of the Numra server packages. */
  endpoint?: string;
  enabled?: MaybeRefOrGetter<boolean>;
  debounceMs?: number;
}

export interface UseNumraCheckResult {
  data: Ref<BrowserCheck | null>;
  error: Ref<NumraRequestError | null>;
  status: Ref<'idle' | 'loading' | 'success' | 'error'>;
  isLoading: ComputedRef<boolean>;
  /** Re-run now, skipping the debounce. */
  refetch: () => Promise<BrowserCheck | null>;
}

/**
 * Look up a phone number through your own backend.
 *
 * There is no apiKey option, by design: this package runs in a browser, and a
 * key in a bundle is a key in everyone's hands.
 */
export declare function useNumraCheck(
  phone: MaybeRefOrGetter<string | null>,
  options?: UseNumraCheckOptions,
): UseNumraCheckResult;

export declare const RiskBadge: DefineComponent<{
  check?: Partial<BrowserCheck> | null;
  loading?: boolean;
  /** Pass the composable's `error` and the badge says the check did not run. */
  error?: unknown;
  showScore?: boolean;
  badgeStyle?: Record<string, unknown>;
}>;

export { riskStateFor, RISK_STATES, NumraRequestError } from '@numra/browser';
export type { BrowserCheck, RiskState } from '@numra/browser';
