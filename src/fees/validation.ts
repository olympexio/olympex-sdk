import { isAddress, ZeroAddress } from 'ethers';
import { OlympexConfigError } from '../errors/config-error.js';
import type { FeeOptions } from '../types/public.js';
import { FEE_BPS_MAX, FEE_BPS_MIN } from './constants.js';

/**
 * Validates integrator fee options, typically after `resolveFeeOptions` merge.
 *
 * @throws {OlympexConfigError} when `feeBps` is not an integer, out of range,
 *   greater than zero without `feeRecipient`, or `feeRecipient` is the zero address.
 */
export function validateFeeOptions(fees: FeeOptions | undefined): void {
  if (!fees) {
    return;
  }

  if (fees.feeBps !== undefined) {
    if (!Number.isInteger(fees.feeBps)) {
      throw new OlympexConfigError('feeBps must be an integer');
    }

    if (fees.feeBps < FEE_BPS_MIN || fees.feeBps > FEE_BPS_MAX) {
      throw new OlympexConfigError(`feeBps must be between ${FEE_BPS_MIN} and ${FEE_BPS_MAX}`);
    }
  }

  const feeRecipient = fees.feeRecipient?.trim();
  const feeBps = fees.feeBps ?? 0;

  if (feeRecipient) {
    if (feeRecipient === ZeroAddress) {
      throw new OlympexConfigError('feeRecipient must not be the zero address');
    }

    if (!isAddress(feeRecipient)) {
      throw new OlympexConfigError('feeRecipient must be a valid Ethereum address');
    }
  }

  if (feeBps > 0 && !feeRecipient) {
    throw new OlympexConfigError('feeRecipient is required when feeBps > 0');
  }
}
