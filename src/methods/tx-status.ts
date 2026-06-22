import type { OlympexGraphQLClient } from '../client/graphql-client.js';
import { requirePayload, requireSuccessfulDomainResponse } from '../client/domain-response.js';
import { GET_CROSS_CHAIN_TX_STATUS } from '../graphql/operations.js';
import type { TxStatus, TxStatusInput } from '../types/public.js';

interface TxStatusData {
  readonly getCrossChainTxStatus?: {
    readonly message: string;
    readonly success: boolean;
    readonly txStatus?: TxStatus | null;
  } | null;
}

export function createTxStatusMethod(graphqlClient: OlympexGraphQLClient) {
  return async function txStatus(input: TxStatusInput): Promise<TxStatus> {
    const data = await graphqlClient.request<TxStatusData, TxStatusInput>(
      GET_CROSS_CHAIN_TX_STATUS,
      input,
    );
    const response = requireSuccessfulDomainResponse(
      data.getCrossChainTxStatus,
      'getCrossChainTxStatus',
    );

    return requirePayload(response.txStatus, 'txStatus');
  };
}
