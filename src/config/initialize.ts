import { OlympexGraphQLClient } from '../client/graphql-client.js';
import { OlympexConfigError } from '../errors/config-error.js';
import { validateFeeOptions } from '../fees/validation.js';
import { createAccount } from '../methods/account.js';
import { getVersion } from '../methods/get-version.js';
import { createQuoteMethod } from '../methods/quote.js';
import { createSupportChainMethod } from '../methods/support-chain.js';
import { createSwapMethod } from '../methods/swap.js';
import { createTxStatusMethod } from '../methods/tx-status.js';
import type { InitializeOptions, OlympexClient } from '../types/public.js';
import { getGraphqlEndpoint } from './backend-url.js';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Creates an {@link OlympexClient} bound to an API key.
 *
 * @remarks Logging is silent-by-default unless {@link InitializeOptions.logger} is provided.
 * Fee defaults in `defaultFees` are validated locally then forwarded to the backend.
 * Backend routing is resolved from `OLYMPEX_BACKEND_URL` at call time.
 * @param options - {@link InitializeOptions} configuration.
 * @returns Configured {@link OlympexClient} ready for quote, swap, and status calls.
 * @throws {OlympexConfigError} When auth credentials are empty, `OLYMPEX_BACKEND_URL` is invalid, or `defaultFees` fail validation.
 *
 * @example Minimal bootstrap
 * ```ts
 * import { initialize } from '@Olympex-io/olympex-sdk';
 *
 * const client = initialize({
 *   apiKey: process.env.OLYMPEX_API_KEY!,
 *   apiSecret: process.env.OLYMPEX_API_SECRET!,
 *   passphrase: process.env.OLYMPEX_PASSPHRASE!,
 * });
 * ```
 *
 * @example With opt-in console logging
 * ```ts
 * import { initialize, createConsoleLogger } from '@Olympex-io/olympex-sdk';
 *
 * const client = initialize({
 *   apiKey: process.env.OLYMPEX_API_KEY!,
 *   apiSecret: process.env.OLYMPEX_API_SECRET!,
 *   passphrase: process.env.OLYMPEX_PASSPHRASE!,
 *   logger: createConsoleLogger({ minLevel: 'debug' }),
 * });
 * ```
 *
 * @see docs/getting-started.md
 */
export function initialize(options: InitializeOptions): OlympexClient {
  const apiKey = options.apiKey.trim();
  const apiSecret = options.apiSecret.trim();
  const passphrase = options.passphrase.trim();

  if (!apiKey) {
    throw new OlympexConfigError('apiKey is required');
  }

  if (!apiSecret) {
    throw new OlympexConfigError('apiSecret is required');
  }

  if (!passphrase) {
    throw new OlympexConfigError('passphrase is required');
  }

  validateFeeOptions(options.defaultFees);

  const graphqlClient = new OlympexGraphQLClient({
    apiKey,
    apiSecret,
    endpoint: getGraphqlEndpoint(),
    headers: options.headers,
    logger: options.logger,
    passphrase,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  return {
    apiKey,
    createAccount,
    getVersion,
    quote: createQuoteMethod(graphqlClient, options.defaultFees, options.logger),
    supportChain: createSupportChainMethod(graphqlClient),
    swap: createSwapMethod(graphqlClient, options.defaultFees, options.logger),
    txStatus: createTxStatusMethod(graphqlClient),
  };
}
