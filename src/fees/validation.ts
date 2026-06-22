import { isAddress } from 'ethers';
import { OlympexConfigError } from '../errors/config-error.js';
import type { FeeOptions } from '../types/public.js';
import { FEE_BPS_MAX, FEE_BPS_MIN } from './constants.js';

export function validateFeeOptions(fees: FeeOptions | undefined): void {
  if (!fees) {
    return;
  }

  if (fees.feeBps !== undefined) {
    if (!Number.isFinite(fees.feeBps) || fees.feeBps < FEE_BPS_MIN || fees.feeBps > FEE_BPS_MAX) {
      throw new OlympexConfigError(`feeBps must be between ${FEE_BPS_MIN} and ${FEE_BPS_MAX}`);
    }
  }

  if (fees.feeRecipient !== undefined && !isAddress(fees.feeRecipient)) {
    throw new OlympexConfigError('feeRecipient must be a valid Ethereum address');
  }
}
