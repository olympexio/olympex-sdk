import { afterEach, describe, expect, it, vi } from 'vitest';

import { initialize } from '../../../src/index.js';
import type { OlympexLogger } from '../../../src/types/public.js';

const API_KEY_FIXTURE = 'secret-key-fixture';
const API_SECRET_FIXTURE = 'secret-value-fixture';
const PASSPHRASE_FIXTURE = 'passphrase-fixture';
afterEach(() => {
  vi.restoreAllMocks();
});

function deepContainsKey(obj: unknown, keyPattern: RegExp): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => deepContainsKey(item, keyPattern));
  }
  if (typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).some(
      ([key, value]) => keyPattern.test(key) || deepContainsKey(value, keyPattern),
    );
  }
  return false;
}

describe('logging redaction across SDK log points', () => {
  it('never leaks apiKey in metadata or stringified log output', async () => {
    const logFn = vi.fn<OlympexLogger['log']>();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: 'GraphQL failure' }],
        }),
        { status: 200 },
      ),
    );

    const client = initialize({
      apiKey: API_KEY_FIXTURE,
      apiSecret: API_SECRET_FIXTURE,
      logger: { log: logFn },
      passphrase: PASSPHRASE_FIXTURE,
    });

    await expect(
      client.quote({
        mode: 'single-chain',
        params: {
          amount: '1',
          chainId: 1,
          gasPrice: '30',
          inTokenAddress: '0xIn',
          outTokenAddress: '0xOut',
          slippage: '1',
        },
      }),
    ).rejects.toThrow();

    expect(logFn.mock.calls.length).toBeGreaterThan(0);

    for (const call of logFn.mock.calls) {
      const metadata = call[2];
      if (metadata !== undefined) {
        expect(deepContainsKey(metadata, /api[-_]?key/i)).toBe(false);
      }
      expect(JSON.stringify(call)).not.toContain(API_KEY_FIXTURE);
    }
  });
});
