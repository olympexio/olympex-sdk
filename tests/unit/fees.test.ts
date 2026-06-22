import { describe, expect, it } from 'vitest';

import { mergeParamsWithFees, serializeFeeOptions } from '../../src/fees/serialize.js';
import { resolveFeeOptions } from '../../src/fees/defaults.js';
import { validateFeeOptions } from '../../src/fees/validation.js';
import { OlympexConfigError } from '../../src/index.js';

const VALID_RECIPIENT = '0x0000000000000000000000000000000000000001';

describe('fee options validation', () => {
  it('accepts undefined or empty fee options', () => {
    expect(() => validateFeeOptions(undefined)).not.toThrow();
    expect(() => validateFeeOptions({})).not.toThrow();
  });

  it('rejects feeBps below 0 or above 100', () => {
    expect(() => validateFeeOptions({ feeBps: -1 })).toThrow(OlympexConfigError);
    expect(() => validateFeeOptions({ feeBps: 101 })).toThrow(OlympexConfigError);
  });

  it('throws feeBps range error message naming feeBps and bounds', () => {
    expect(() => validateFeeOptions({ feeBps: 101 })).toThrow('feeBps must be between 0 and 100');
  });

  it('accepts feeBps within 0-100', () => {
    expect(() => validateFeeOptions({ feeBps: 0 })).not.toThrow();
    expect(() => validateFeeOptions({ feeBps: 100 })).not.toThrow();
  });

  it('rejects invalid feeRecipient format', () => {
    expect(() => validateFeeOptions({ feeRecipient: 'not-an-address' })).toThrow(
      OlympexConfigError,
    );
  });

  it('accepts valid feeRecipient', () => {
    expect(() => validateFeeOptions({ feeRecipient: VALID_RECIPIENT })).not.toThrow();
  });
});

describe('fee options resolution', () => {
  it('merges per-call fees over client defaults', () => {
    expect(
      resolveFeeOptions({ feeBps: 25 }, { feeBps: 10, feeRecipient: VALID_RECIPIENT }),
    ).toEqual({
      feeBps: 25,
      feeRecipient: VALID_RECIPIENT,
    });
  });

  it('returns undefined when no fees are configured', () => {
    expect(resolveFeeOptions(undefined, undefined)).toBeUndefined();
  });
});

describe('fee serialization', () => {
  it('serializes present fee fields only', () => {
    expect(
      serializeFeeOptions({
        feeBps: 15,
        feeRecipient: VALID_RECIPIENT,
      }),
    ).toEqual({
      feeBps: 15,
      feeRecipient: VALID_RECIPIENT,
    });
  });

  it('returns undefined when no fee fields are set', () => {
    expect(serializeFeeOptions({})).toBeUndefined();
    expect(serializeFeeOptions(undefined)).toBeUndefined();
  });

  it('merges serialized fees into operation params', () => {
    expect(
      mergeParamsWithFees(
        { amount: '1', chainId: 1 },
        { feeBps: 20, feeRecipient: VALID_RECIPIENT },
      ),
    ).toEqual({
      amount: '1',
      chainId: 1,
      feeBps: 20,
      feeRecipient: VALID_RECIPIENT,
    });
  });

  it('leaves params unchanged when fees are absent', () => {
    const params = { amount: '1', chainId: 1 };

    expect(mergeParamsWithFees(params, undefined)).toBe(params);
    expect(mergeParamsWithFees(params, {})).toBe(params);
  });
});
