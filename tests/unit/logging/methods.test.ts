import { afterEach, describe, expect, it, vi } from 'vitest';

import { OlympexConfigError, initialize } from '../../../src/index.js';
import type { OlympexGraphQLClient } from '../../../src/client/graphql-client.js';
import { createQuoteMethod } from '../../../src/methods/quote.js';
import { createSwapMethod } from '../../../src/methods/swap.js';
import type { OlympexLogger } from '../../../src/types/public.js';

const BASE_AUTH = {
  apiKey: 'partner-key',
  apiSecret: 'partner-secret',
  passphrase: 'partner-passphrase',
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

function createMockLogger() {
  return vi.fn<OlympexLogger['log']>();
}

function mockGraphQLClient() {
  return {
    request: vi.fn().mockResolvedValue({
      getQuote: { aggregatorId: 'olympex', outAmount: '1', routes: [] },
      getCrossChainQuote: {
        code: 200,
        crossChainQuote: {
          aggregatorId: 'bridge',
          bridgeInfo: {},
          estimateCostInUSD: '1',
          fromTokenAmount: '1',
          minimumReceived: '0.9',
          toTokenAmount: '0.95',
        },
        message: 'ok',
        success: true,
      },
      getQuoteSwap: {
        code: 200,
        message: 'ok',
        quoteSwap: {
          approveTransaction: '0x',
          data: '0x',
          minOutAmount: '1',
          outAmount: '1',
          value: '0',
        },
        success: true,
      },
      getCrossChainSwap: {
        code: 200,
        crossChainSwap: {
          approveTransaction: '0x',
          calldata: '0x',
          dexHash: 'h',
          value: '0',
        },
        message: 'ok',
        success: true,
      },
    }),
  } as unknown as OlympexGraphQLClient;
}

const FORBIDDEN_KEYS = [
  'aggregatorId',
  'excludeMetaAggregatorId',
  'inTokenAddress',
  'outTokenAddress',
  'fromTokenAddress',
  'toTokenAddress',
  'amount',
  'slippage',
  'gasPrice',
  'gasMultiplier',
  'account',
  'feeBps',
  'feeRecipient',
  'fees',
  'routes',
  'market',
  'outAmount',
] as const;

describe('quote and swap info logging', () => {
  it('logs single-chain quote with mode and chainId only', async () => {
    const logger = createMockLogger();
    const quote = createQuoteMethod(mockGraphQLClient(), undefined, { log: logger });

    await quote({
      mode: 'single-chain',
      params: {
        amount: '100',
        chainId: 10,
        excludeMetaAggregatorId: ['skip'],
        gasPrice: '30',
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '1',
      },
    });

    expect(logger).toHaveBeenCalledOnce();
    expect(logger.mock.calls[0]?.[0]).toBe('info');
    expect(logger.mock.calls[0]?.[1]).toBe('Olympex quote requested');
    expect(logger.mock.calls[0]?.[2]).toEqual({ chainId: 10, mode: 'single-chain' });
  });

  it('logs cross-chain quote with mode and chain ids only', async () => {
    const logger = createMockLogger();
    const quote = createQuoteMethod(mockGraphQLClient(), undefined, { log: logger });

    await quote({
      mode: 'cross-chain',
      params: {
        amount: '100',
        fromChainId: 1,
        fromTokenAddress: '0xFrom',
        slippage: '1',
        toChainId: 137,
        toTokenAddress: '0xTo',
      },
    });

    expect(logger).toHaveBeenCalledOnce();
    expect(logger.mock.calls[0]?.[2]).toEqual({
      fromChainId: 1,
      mode: 'cross-chain',
      toChainId: 137,
    });
  });

  it('logs single-chain and cross-chain swap with allowed metadata only', async () => {
    const logger = createMockLogger();
    const swap = createSwapMethod(mockGraphQLClient(), undefined, { log: logger });

    await swap({
      mode: 'single-chain',
      params: {
        account: '0xAccount',
        aggregatorId: 'olympex',
        amount: '1',
        chainId: 42161,
        gasPrice: '1',
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '1',
      },
    });

    expect(logger.mock.calls[0]?.[1]).toBe('Olympex swap requested');
    expect(logger.mock.calls[0]?.[2]).toEqual({ chainId: 42161, mode: 'single-chain' });

    logger.mockClear();

    await swap({
      mode: 'cross-chain',
      params: {
        account: '0xAccount',
        aggregatorId: 'bridge',
        amount: '1',
        fromChainId: 56,
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '1',
        toChainId: 43114,
      },
    });

    expect(logger.mock.calls[0]?.[1]).toBe('Olympex swap requested');
    expect(logger.mock.calls[0]?.[2]).toEqual({
      fromChainId: 56,
      mode: 'cross-chain',
      toChainId: 43114,
    });
  });

  it('does not include forbidden keys in info metadata', async () => {
    const logger = createMockLogger();
    const quote = createQuoteMethod(mockGraphQLClient(), undefined, { log: logger });

    await quote({
      fees: { feeRecipient: '0x0000000000000000000000000000000000000001', feeBps: 50 },
      mode: 'single-chain',
      params: {
        amount: '999',
        chainId: 1,
        excludeMetaAggregatorId: ['x'],
        gasMultiplier: 'HIGH',
        gasPrice: '30',
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '1',
      },
    });

    const metadata = logger.mock.calls[0]?.[2] ?? {};
    for (const key of FORBIDDEN_KEYS) {
      expect(metadata).not.toHaveProperty(key);
    }
  });

  it('does not log when local fee validation fails', async () => {
    const logger = createMockLogger();
    const quote = createQuoteMethod(mockGraphQLClient(), undefined, { log: logger });

    await expect(
      quote({
        fees: { feeBps: 101 },
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
    ).rejects.toThrow(OlympexConfigError);

    expect(logger).not.toHaveBeenCalled();
  });

  it('emits zero log calls when logger is omitted', async () => {
    const logger = createMockLogger();
    const client = mockGraphQLClient();
    const quote = createQuoteMethod(client, undefined);
    const swap = createSwapMethod(client, undefined);

    await quote({
      mode: 'single-chain',
      params: {
        amount: '1',
        chainId: 1,
        gasPrice: '30',
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '1',
      },
    });

    await swap({
      mode: 'single-chain',
      params: {
        account: '0xAccount',
        aggregatorId: 'olympex',
        amount: '1',
        chainId: 1,
        gasPrice: '30',
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '1',
      },
    });

    expect(logger).not.toHaveBeenCalled();
  });

  it('forwards logger from initialize to quote and swap', async () => {
    const logger = createMockLogger();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { getQuote: { aggregatorId: 'olympex', outAmount: '1', routes: [] } },
        }),
      ),
    );

    const client = initialize({
      ...BASE_AUTH,
      logger: { log: logger },
    });

    await client.quote({
      mode: 'single-chain',
      params: {
        amount: '1',
        chainId: 1,
        gasPrice: '30',
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '1',
      },
    });

    expect(logger.mock.calls.some((call) => call[1] === 'Olympex quote requested')).toBe(true);
  });
});
