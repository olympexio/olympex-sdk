import type { OlympexGraphQLClient } from '../client/graphql-client.js';
import { requirePayload } from '../client/domain-response.js';
import { GET_ENABLED_CHAINS } from '../graphql/operations.js';

interface EnabledChainsData {
  readonly getEnabledChains?: {
    readonly chainIds: readonly string[];
  } | null;
}

export function createSupportChainMethod(graphqlClient: OlympexGraphQLClient) {
  return async function supportChain(chainId: string | number): Promise<boolean> {
    const data = await graphqlClient.request<EnabledChainsData, Record<string, never>>(
      GET_ENABLED_CHAINS,
      {},
    );
    const enabledChains = requirePayload(data.getEnabledChains, 'getEnabledChains');

    return enabledChains.chainIds.includes(String(chainId));
  };
}
