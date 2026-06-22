import type { FeeOptions } from '../types/public.js';

export function serializeFeeOptions(
  fees: FeeOptions | undefined,
): Record<string, number | string> | undefined {
  if (!fees) {
    return undefined;
  }

  const serialized: Record<string, number | string> = {};

  if (fees.feeBps !== undefined) {
    serialized.feeBps = fees.feeBps;
  }

  if (fees.feeRecipient !== undefined) {
    serialized.feeRecipient = fees.feeRecipient;
  }

  return Object.keys(serialized).length > 0 ? serialized : undefined;
}

export function mergeParamsWithFees<T extends Record<string, unknown>>(
  params: T,
  fees: FeeOptions | undefined,
): T {
  const serialized = serializeFeeOptions(fees);

  if (!serialized) {
    return params;
  }

  return {
    ...params,
    ...serialized,
  };
}
