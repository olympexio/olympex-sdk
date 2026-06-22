import type { OlympexGraphQLClient } from '../client/graphql-client.js';
import { requirePayload, requireSuccessfulDomainResponse } from '../client/domain-response.js';
import { redact } from '../errors/redact.js';
import { resolveFeeOptions } from '../fees/defaults.js';
import { mergeParamsWithFees } from '../fees/serialize.js';
import { validateFeeOptions } from '../fees/validation.js';
import type { FeeOptions, OlympexLogger } from '../types/public.js';
import { GET_CROSS_CHAIN_SWAP, GET_QUOTE_SWAP } from '../graphql/operations.js';
import type { CrossChainSwap, SingleChainSwap, SwapRequest, SwapResult } from '../types/public.js';

interface SingleChainSwapData {
  readonly getQuoteSwap?: {
    readonly code: number;
    readonly message: string;
    readonly quoteSwap?: SingleChainSwap | null;
    readonly success: boolean;
  } | null;
}

interface CrossChainSwapData {
  readonly getCrossChainSwap?: {
    readonly code: number;
    readonly message: string;
    readonly success: boolean;
    readonly crossChainSwap?: CrossChainSwap | null;
  } | null;
}

export function createSwapMethod(
  graphqlClient: OlympexGraphQLClient,
  defaultFees: FeeOptions | undefined,
  logger?: OlympexLogger,
) {
  return async function swap(input: SwapRequest): Promise<SwapResult> {
    const fees = resolveFeeOptions(input.fees, defaultFees);
    validateFeeOptions(fees);

    if (input.mode === 'single-chain') {
      logger?.log(
        'info',
        'Olympex swap requested',
        redact({
          chainId: input.params.chainId,
          mode: 'single-chain',
        }),
      );

      const data = await graphqlClient.request<SingleChainSwapData, Record<string, unknown>>(
        GET_QUOTE_SWAP,
        {
          getQuoteSwapParams: mergeParamsWithFees(input.params, fees),
        },
      );
      const response = requireSuccessfulDomainResponse(data.getQuoteSwap, 'getQuoteSwap');

      return {
        mode: 'single-chain',
        swap: requirePayload(response.quoteSwap, 'quoteSwap'),
      };
    }

    logger?.log(
      'info',
      'Olympex swap requested',
      redact({
        fromChainId: input.params.fromChainId,
        mode: 'cross-chain',
        toChainId: input.params.toChainId,
      }),
    );

    const data = await graphqlClient.request<CrossChainSwapData, Record<string, unknown>>(
      GET_CROSS_CHAIN_SWAP,
      {
        params: mergeParamsWithFees(input.params, fees),
      },
    );
    const response = requireSuccessfulDomainResponse(data.getCrossChainSwap, 'getCrossChainSwap');

    return {
      mode: 'cross-chain',
      swap: requirePayload(response.crossChainSwap, 'crossChainSwap'),
    };
  };
}
