import type { FeeOptions } from '../types/public.js';

export function resolveFeeOptions(
  callFees: FeeOptions | undefined,
  clientDefaultFees: FeeOptions | undefined,
): FeeOptions | undefined {
  if (!callFees && !clientDefaultFees) {
    return undefined;
  }

  return {
    ...clientDefaultFees,
    ...callFees,
  };
}
