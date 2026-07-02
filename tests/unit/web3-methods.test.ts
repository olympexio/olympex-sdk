import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OlympexConfigError,
  OlympexDomainError,
  OlympexGraphQLError,
  OlympexNetworkError,
  initialize,
} from '../../src/index.js';

const BASE_AUTH_OPTIONS = {
  apiKey: 'partner-key',
  apiSecret: 'partner-secret',
  passphrase: 'partner-passphrase',
} as const;

const PINNED_BREAKDOWN = {
  protocolFeeBps: 30,
  integratorMarginBps: 37,
  protocolFeeAmount: '300000',
  integratorMarginAmount: '37000000',
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

function mockGraphQLResponse(data: Record<string, unknown>) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data })));
}

describe('Web3 methods', () => {
  it('passes integrator fee breakdown through on single-chain quotes', async () => {
    const fetchMock = mockGraphQLResponse({
      getQuote: {
        aggregatorId: 'olympex',
        integratorFeeBreakdown: PINNED_BREAKDOWN,
        outAmount: '100',
        routes: [],
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    const result = await client.quote({
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

    expect(result).toEqual({
      mode: 'single-chain',
      quote: {
        aggregatorId: 'olympex',
        integratorFeeBreakdown: PINNED_BREAKDOWN,
        outAmount: '100',
        routes: [],
      },
    });

    const request = JSON.stringify(requestBody(fetchMock));
    expect(request).toContain('integratorFeeBreakdown');
    expect(request).toContain('protocolFeeBps');
    expect(request).toContain('integratorMarginBps');
    expect(request).toContain('protocolFeeAmount');
    expect(request).toContain('integratorMarginAmount');
    expect(request).toContain('GetQuote');
  });

  it('returns app-channel quotes without integrator fee breakdown', async () => {
    mockGraphQLResponse({
      getQuote: {
        aggregatorId: 'olympex',
        outAmount: '100',
        routes: [],
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    const result = await client.quote({
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

    expect(result).toEqual({
      mode: 'single-chain',
      quote: {
        aggregatorId: 'olympex',
        outAmount: '100',
        routes: [],
      },
    });
    if (result.mode === 'single-chain') {
      expect(result.quote.integratorFeeBreakdown).toBeUndefined();
    }
  });

  it('passes zero-margin integrator breakdown through verbatim', async () => {
    const zeroMarginBreakdown = {
      protocolFeeBps: 30,
      integratorMarginBps: 0,
      protocolFeeAmount: '300000',
      integratorMarginAmount: '0',
    } as const;

    mockGraphQLResponse({
      getQuote: {
        aggregatorId: 'olympex',
        integratorFeeBreakdown: zeroMarginBreakdown,
        outAmount: '100',
        routes: [],
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    const result = await client.quote({
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

    expect(result).toEqual({
      mode: 'single-chain',
      quote: {
        aggregatorId: 'olympex',
        integratorFeeBreakdown: zeroMarginBreakdown,
        outAmount: '100',
        routes: [],
      },
    });
  });

  it('requests single-chain quotes without local quote calculation', async () => {
    const fetchMock = mockGraphQLResponse({
      getQuote: {
        aggregatorId: 'olympex',
        outAmount: '100',
        routes: [],
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    const result = await client.quote({
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

    expect(result).toEqual({
      mode: 'single-chain',
      quote: {
        aggregatorId: 'olympex',
        outAmount: '100',
        routes: [],
      },
    });
    expect(requestBody(fetchMock)).toEqual(
      expect.objectContaining({
        variables: {
          getQuoteParams: expect.objectContaining({
            amount: '1',
            chainId: 1,
          }),
        },
      }),
    );
  });

  it('returns backend swap calldata as-is', async () => {
    const fetchMock = mockGraphQLResponse({
      getCrossChainSwap: {
        code: 200,
        message: 'ok',
        success: true,
        crossChainSwap: {
          approveTransaction: '0xApprove',
          calldata: '0xCalldata',
          dexHash: 'dex-hash',
          value: '0',
        },
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    const result = await client.swap({
      mode: 'cross-chain',
      params: {
        account: '0xAccount',
        aggregatorId: 'bridge',
        amount: '1',
        fromChainId: 1,
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '0.5',
        toChainId: 137,
      },
    });

    expect(result).toEqual({
      mode: 'cross-chain',
      swap: {
        approveTransaction: '0xApprove',
        calldata: '0xCalldata',
        dexHash: 'dex-hash',
        value: '0',
      },
    });
    expect(JSON.stringify(requestBody(fetchMock))).toContain('GetCrossChainSwap');
  });

  it('forwards optional fee fields on cross-chain quotes', async () => {
    const fetchMock = mockGraphQLResponse({
      getCrossChainQuote: {
        code: 200,
        message: 'ok',
        success: true,
        crossChainQuote: {
          aggregatorId: 'bridge',
          bridgeInfo: {},
          estimateCostInUSD: '1',
          fromTokenAmount: '1',
          minimumReceived: '0.9',
          toTokenAmount: '0.95',
        },
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    await expect(
      client.quote({
        fees: {
          feeBps: 15,
          feeRecipient: '0x0000000000000000000000000000000000000001',
        },
        mode: 'cross-chain',
        params: {
          amount: '1',
          fromChainId: 1,
          fromTokenAddress: '0xIn',
          slippage: '0.5',
          toChainId: 137,
          toTokenAddress: '0xOut',
        },
      }),
    ).resolves.toMatchObject({
      mode: 'cross-chain',
      quote: {
        aggregatorId: 'bridge',
      },
    });

    expect(requestBody(fetchMock)).toEqual(
      expect.objectContaining({
        variables: {
          params: expect.objectContaining({
            amount: '1',
            feeBps: 15,
            feeRecipient: '0x0000000000000000000000000000000000000001',
          }),
        },
      }),
    );
  });

  it('omits fee fields from GraphQL variables when not provided on quote', async () => {
    const fetchMock = mockGraphQLResponse({
      getQuote: {
        aggregatorId: 'olympex',
        outAmount: '100',
        routes: [],
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

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

    const body = requestBody(fetchMock) as {
      variables: { getQuoteParams: Record<string, unknown> };
    };

    expect(body.variables.getQuoteParams).toEqual(
      expect.not.objectContaining({
        feeBps: expect.anything(),
        feeRecipient: expect.anything(),
      }),
    );
  });

  it('forwards optional fee fields on single-chain swap', async () => {
    const fetchMock = mockGraphQLResponse({
      getQuoteSwap: {
        code: 200,
        message: 'ok',
        quoteSwap: {
          approveTransaction: '0xApprove',
          data: '0xData',
          minOutAmount: '99',
          outAmount: '100',
          value: '0',
        },
        success: true,
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    await client.swap({
      fees: {
        feeBps: 20,
        feeRecipient: '0x0000000000000000000000000000000000000001',
      },
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

    const body = requestBody(fetchMock) as {
      variables: { getQuoteSwapParams: Record<string, unknown> };
    };

    expect(body.variables.getQuoteSwapParams).toEqual(
      expect.objectContaining({
        amount: '1',
        feeBps: 20,
        feeRecipient: '0x0000000000000000000000000000000000000001',
      }),
    );
  });

  it('forwards optional fee fields on cross-chain swap', async () => {
    const fetchMock = mockGraphQLResponse({
      getCrossChainSwap: {
        code: 200,
        message: 'ok',
        success: true,
        crossChainSwap: {
          approveTransaction: '0xApprove',
          calldata: '0xCalldata',
          dexHash: 'dex-hash',
          value: '0',
        },
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    await client.swap({
      fees: {
        feeBps: 25,
        feeRecipient: '0x0000000000000000000000000000000000000002',
      },
      mode: 'cross-chain',
      params: {
        account: '0xAccount',
        aggregatorId: 'bridge',
        amount: '1',
        fromChainId: 1,
        inTokenAddress: '0xIn',
        outTokenAddress: '0xOut',
        slippage: '0.5',
        toChainId: 137,
      },
    });

    expect(requestBody(fetchMock)).toEqual(
      expect.objectContaining({
        variables: {
          params: expect.objectContaining({
            amount: '1',
            feeBps: 25,
            feeRecipient: '0x0000000000000000000000000000000000000002',
          }),
        },
      }),
    );
  });

  it('omits fee fields from GraphQL variables when not provided on swap', async () => {
    const fetchMock = mockGraphQLResponse({
      getQuoteSwap: {
        code: 200,
        message: 'ok',
        quoteSwap: {
          approveTransaction: '0xApprove',
          data: '0xData',
          minOutAmount: '99',
          outAmount: '100',
          value: '0',
        },
        success: true,
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    await client.swap({
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

    const body = requestBody(fetchMock) as {
      variables: { getQuoteSwapParams: Record<string, unknown> };
    };

    expect(body.variables.getQuoteSwapParams).toEqual(
      expect.not.objectContaining({
        feeBps: expect.anything(),
        feeRecipient: expect.anything(),
      }),
    );
  });

  it('requests single-chain swaps and unwraps the domain response', async () => {
    mockGraphQLResponse({
      getQuoteSwap: {
        code: 200,
        message: 'ok',
        quoteSwap: {
          approveTransaction: '0xApprove',
          data: '0xData',
          minOutAmount: '99',
          outAmount: '100',
          value: '0',
        },
        success: true,
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    await expect(
      client.swap({
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
      }),
    ).resolves.toMatchObject({
      mode: 'single-chain',
      swap: {
        data: '0xData',
      },
    });
  });

  it('returns cross-chain transaction status', async () => {
    mockGraphQLResponse({
      getCrossChainTxStatus: {
        message: 'ok',
        success: true,
        txStatus: {
          detailStatus: 'completed',
          fromChainId: '1',
          status: 'DONE',
          toChainId: '137',
        },
      },
    });
    const client = initialize(BASE_AUTH_OPTIONS);

    await expect(
      client.txStatus({ chainId: '1', dexHash: 'dex-hash', hash: '0xHash' }),
    ).resolves.toEqual({
      detailStatus: 'completed',
      fromChainId: '1',
      status: 'DONE',
      toChainId: '137',
    });
  });

  it('normalizes GraphQL, network and domain failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ errors: [{ message: 'bad query' }] })),
    );
    const client = initialize(BASE_AUTH_OPTIONS);

    await expect(client.supportChain(1)).rejects.toThrow(OlympexGraphQLError);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 500 }),
    );
    await expect(client.supportChain(1)).rejects.toThrow(OlympexNetworkError);

    mockGraphQLResponse({
      getQuoteSwap: {
        code: 400,
        message: 'no route',
        quoteSwap: null,
        success: false,
      },
    });
    await expect(
      client.swap({
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
      }),
    ).rejects.toThrow(OlympexDomainError);
  });

  it('rejects out-of-range feeBps before making a request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = initialize(BASE_AUTH_OPTIONS);

    await expect(
      client.quote({
        fees: { feeBps: 150 },
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
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function requestBody(fetchMock: ReturnType<typeof vi.spyOn>) {
  const call = fetchMock.mock.calls[0];
  const init = call?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body)) as unknown;
}
