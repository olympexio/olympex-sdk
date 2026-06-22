import type { OlympexGraphQLClient } from '../client/graphql-client.js';
import { requirePayload, requireSuccessfulDomainResponse } from '../client/domain-response.js';
import { redact } from '../errors/redact.js';
import { resolveFeeOptions } from '../fees/defaults.js';
import { mergeParamsWithFees } from '../fees/serialize.js';
import { validateFeeOptions } from '../fees/validation.js';
import type { FeeOptions, OlympexLogger } from '../types/public.js';
import { GET_CROSS_CHAIN_QUOTE, GET_QUOTE } from '../graphql/operations.js';
import type {
  CrossChainQuote,
  QuoteRequest,
  QuoteResult,
  SingleChainQuote,
} from '../types/public.js';

interface SingleChainQuoteData {
  readonly getQuote?: SingleChainQuote | null;
}

interface CrossChainQuoteData {
  readonly getCrossChainQuote?: {
    readonly code: number;
    readonly message: string;
    readonly success: boolean;
    readonly crossChainQuote?: CrossChainQuote | null;
  } | null;
}

export function createQuoteMethod(
  graphqlClient: OlympexGraphQLClient,
  defaultFees: FeeOptions | undefined,
  logger?: OlympexLogger,
) {
  return async function quote(input: QuoteRequest): Promise<QuoteResult> {
    const fees = resolveFeeOptions(input.fees, defaultFees);
    validateFeeOptions(fees);

    if (input.mode === 'single-chain') {
      logger?.log(
        'info',
        'Olympex quote requested',
        redact({
          chainId: input.params.chainId,
          mode: 'single-chain',
        }),
      );

      const data = await graphqlClient.request<SingleChainQuoteData, Record<string, unknown>>(
        GET_QUOTE,
        {
          getQuoteParams: mergeParamsWithFees(input.params, fees),
        },
      );

      return {
        mode: 'single-chain',
        quote: requirePayload(data.getQuote, 'getQuote'),
      };
    }

    logger?.log(
      'info',
      'Olympex quote requested',
      redact({
        fromChainId: input.params.fromChainId,
        mode: 'cross-chain',
        toChainId: input.params.toChainId,
      }),
    );

    const data = await graphqlClient.request<CrossChainQuoteData, Record<string, unknown>>(
      GET_CROSS_CHAIN_QUOTE,
      {
        params: mergeParamsWithFees(input.params, fees),
      },
    );
    const response = requireSuccessfulDomainResponse(data.getCrossChainQuote, 'getCrossChainQuote');

    return {
      mode: 'cross-chain',
      quote: requirePayload(response.crossChainQuote, 'crossChainQuote'),
    };
  };
}
