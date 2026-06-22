/**
 * Severity levels for SDK log calls, ordered debug &lt; info &lt; warn &lt; error.
 *
 * @remarks Used by {@link OlympexLogger} and {@link createConsoleLogger} to filter output.
 *
 * @see docs/logging.md
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Caller-provided logging surface. The SDK calls `log` at transport and
 * method boundaries when a logger is wired at {@link InitializeOptions.logger}.
 *
 * @remarks Implementations MUST NOT throw — use {@link createConsoleLogger} for a safe default.
 * When no logger is provided, the SDK emits no log output (silent-by-default).
 *
 * @see docs/logging.md
 */
export interface OlympexLogger {
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void;
}

/**
 * Configuration passed to {@link initialize} to create an {@link OlympexClient}.
 *
 * @remarks Server-side only. Keep `apiSecret` and `passphrase` in trusted backend runtimes
 * (BFF, server, or serverless functions) and never expose them in browser bundles.
 * Optional fee defaults in `defaultFees` are forwarded to the backend; the SDK does not calculate
 * fee amounts locally.
 *
 * @property apiKey - API key for request authentication.
 * @property apiSecret - Signing secret used for GraphQL requests.
 * @property passphrase - Account passphrase validated during authentication.
 * @property defaultFees - Optional client-level {@link FeeOptions} applied to all quote/swap calls.
 * @property logger - Optional {@link OlympexLogger}; omitted means silent-by-default.
 *
 * @see docs/getting-started.md
 * @see docs/authentication.md
 */
export interface InitializeOptions {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  defaultFees?: FeeOptions;
  headers?: Record<string, string>;
  /** Optional logger; when omitted the SDK emits no log output (silent-by-default). */
  logger?: OlympexLogger;
  timeoutMs?: number;
}

/**
 * Public SDK client bound to an API key.
 *
 * @remarks Returned by {@link initialize}. All methods forward parameters to the backend GraphQL API.
 * The SDK does not compute routes, fees, or swap calldata locally. Backend routing is resolved from
 * `OLYMPEX_BACKEND_URL` at call time (see docs/getting-started.md).
 *
 * @property apiKey - Authenticated API key (read-only).
 *
 * @see docs/getting-started.md
 */
export interface OlympexClient {
  readonly apiKey: string;

  /**
   * Creates API credentials via REST onboarding.
   *
   * @remarks Uses the backend base URL resolved from `OLYMPEX_BACKEND_URL`. For static usage
   * without initializing the SDK client, use the top-level `createAccount` export with
   * {@link CreateAccountOptions}.
   * @param input - Required onboarding fields.
   * @returns Freshly created credentials ({@link CreateAccountResponse}).
   * @throws {OlympexConfigError} When `name` or `password` is empty.
   * @throws {OlympexNetworkError} When REST onboarding fails, returns invalid JSON, or omits credentials.
   *
   * @see docs/authentication.md
   */
  createAccount(input: CreateAccountInput): Promise<CreateAccountResponse>;

  /**
   * Returns the SDK package version string.
   *
   * @remarks Delegates to the standalone {@link getVersion} export.
   * @returns Semantic version of the installed SDK (e.g. `'0.0.0'`).
   *
   * @see docs/getting-started.md
   */
  getVersion(): string;

  /**
   * Fetches a swap quote for single-chain or cross-chain routes.
   *
   * @remarks Forwards params unchanged to the backend. Does not compute routes or fees locally.
   * Per-request {@link FeeOptions} in `input.fees` override {@link InitializeOptions.defaultFees}.
   * @param input - Discriminated by {@link QuoteRequest.mode | mode}.
   * @returns {@link QuoteResult} normalized for the selected mode.
   * @throws {OlympexConfigError} Local validation failure (e.g. invalid {@link FeeOptions.feeBps}).
   * @throws {OlympexDomainError} Backend `success: false` domain response.
   * @throws {OlympexGraphQLError} GraphQL errors in an otherwise successful HTTP response.
   * @throws {OlympexNetworkError} Network, timeout, or non-2xx HTTP failure.
   *
   * @example Single-chain quote with fee options
   * ```ts
   * const result = await client.quote({
   *   mode: 'single-chain',
   *   params: {
   *     chainId: 1,
   *     inTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
   *     outTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
   *     amount: '1000000',
   *     slippage: '0.5',
   *     gasPrice: '20000000000',
   *   },
   *   fees: { feeBps: 25, feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
   * });
   * ```
   *
   * @example Cross-chain bridge quote
   * ```ts
   * const result = await client.quote({
   *   mode: 'cross-chain',
   *   params: {
   *     fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
   *     toTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
   *     fromChainId: 1,
   *     toChainId: 42161,
   *     amount: '1000000',
   *     slippage: '0.5',
   *   },
   * });
   * ```
   *
   * @see docs/methods/quote.md
   */
  quote(input: QuoteRequest): Promise<QuoteResult>;

  /**
   * Checks whether a chain ID is supported by the backend.
   *
   * @remarks Chain enablement is backend-authoritative; the SDK forwards the query unchanged.
   * Use before {@link OlympexClient.quote} or {@link OlympexClient.swap} to validate `chainId`.
   * @param chainId - EVM chain ID as number or string.
   * @returns `true` when the chain is enabled for quotes and swaps.
   * @throws {OlympexDomainError} Backend domain failure on unsupported or invalid chain.
   * @throws {OlympexGraphQLError} GraphQL errors in an otherwise successful HTTP response.
   * @throws {OlympexNetworkError} Network, timeout, or non-2xx HTTP failure.
   *
   * @example
   * ```ts
   * const supported = await client.supportChain(42161);
   * if (!supported) {
   *   throw new Error('Arbitrum not enabled for this account');
   * }
   * ```
   *
   * @see docs/methods/support-chain.md
   */
  supportChain(chainId: string | number): Promise<boolean>;

  /**
   * Builds swap calldata from a prior quote's `aggregatorId`.
   *
   * @remarks Forwards params unchanged to the backend. Does not compute swap data locally.
   * @param input - Discriminated by {@link SwapRequest.mode | mode}.
   * @returns {@link SwapResult} with executable calldata for the selected mode.
   * @throws {OlympexConfigError} Local validation failure (e.g. invalid {@link FeeOptions.feeBps}).
   * @throws {OlympexDomainError} Backend `success: false` domain response.
   * @throws {OlympexGraphQLError} GraphQL errors in an otherwise successful HTTP response.
   * @throws {OlympexNetworkError} Network, timeout, or non-2xx HTTP failure.
   *
   * @example Single-chain swap
   * ```ts
   * const { swap } = await client.swap({
   *   mode: 'single-chain',
   *   params: {
   *     chainId: 1,
   *     inTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
   *     outTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
   *     amount: '1000000',
   *     slippage: '0.5',
   *     gasPrice: '20000000000',
   *     account: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
   *     aggregatorId: quote.quote.aggregatorId,
   *   },
   * });
   * ```
   *
   * @example Cross-chain swap
   * ```ts
   * const { swap } = await client.swap({
   *   mode: 'cross-chain',
   *   params: {
   *     account: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
   *     fromChainId: 1,
   *     toChainId: 42161,
   *     inTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
   *     outTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
   *     amount: '1000000',
   *     slippage: '0.5',
   *     aggregatorId: quote.quote.aggregatorId,
   *   },
   * });
   * ```
   *
   * @see docs/methods/swap.md
   */
  swap(input: SwapRequest): Promise<SwapResult>;

  /**
   * Polls cross-chain transaction status after a cross-chain swap.
   *
   * @remarks Requires `hash`, `chainId`, and `dexHash` from the originating cross-chain swap.
   * @param input - Transaction identifiers from {@link CrossChainSwap.dexHash} and related fields.
   * @returns Current bridge status and chain pair metadata.
   * @throws {OlympexDomainError} Backend domain failure or invalid status payload.
   * @throws {OlympexGraphQLError} GraphQL errors in an otherwise successful HTTP response.
   * @throws {OlympexNetworkError} Network, timeout, or non-2xx HTTP failure.
   *
   * @example
   * ```ts
   * const status = await client.txStatus({
   *   hash: '0xabc...',
   *   chainId: '1',
   *   dexHash: swap.dexHash,
   * });
   * console.log(status.status, status.detailStatus);
   * ```
   *
   * @see docs/methods/tx-status.md
   */
  txStatus(input: TxStatusInput): Promise<TxStatus>;
}

/**
 * Input for {@link OlympexClient.createAccount}.
 *
 * @remarks Use the top-level `createAccount` export with {@link CreateAccountOptions} when you
 * need onboarding without calling {@link initialize}.
 *
 * @property name - Human-readable account display name.
 * @property password - Passphrase/password used for account authentication.
 *
 * @see docs/authentication.md
 */
export interface CreateAccountInput {
  readonly name: string;
  readonly password: string;
}

/**
 * Input for static onboarding via top-level `createAccount` export.
 *
 * @remarks This shape is server-side only and does not require {@link initialize}.
 *
 * @property name - Human-readable account display name.
 * @property password - Passphrase/password used for account authentication.
 *
 * @see docs/authentication.md
 */
export type CreateAccountOptions = CreateAccountInput;

/**
 * Response payload from account onboarding.
 *
 * @remarks `secretKey` is returned once by onboarding flows. Store it securely.
 *
 * @property apiKey - API key identifier ({@link InitializeOptions.apiKey}).
 * @property secretKey - Signing secret ({@link InitializeOptions.apiSecret}).
 *
 * @see docs/authentication.md
 */
export interface CreateAccountResponse {
  readonly apiKey: string;
  readonly secretKey: string;
}

/**
 * Gas urgency preset forwarded to the {@link OlympexClient.quote} backend.
 *
 * @remarks Maps to backend gas estimation multipliers; does not affect local SDK behavior.
 *
 * @see docs/methods/quote.md
 */
export type GasMultiplier = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Sort order for quote route ranking on the {@link OlympexClient.quote} backend.
 *
 * @remarks The SDK forwards this value unchanged; route selection is backend-authoritative.
 *
 * @see docs/methods/quote.md
 */
export type QuoteOrderBy = 'MAX_OUT_AMOUNT' | 'MAX_ESTIMATE_GAS' | 'MIN_ESTIMATE_GAS';

/**
 * Fee options forwarded to the backend on {@link OlympexClient.quote} and
 * {@link OlympexClient.swap} calls.
 *
 * @remarks The SDK does not calculate fee amounts. Values are validated locally then
 * serialized to the backend, which is authoritative for final fee application.
 *
 * @property feeBps - Optional margin in basis points (0–100). Backend is authoritative.
 * @property feeRecipient - EVM address that receives the fee portion.
 *
 * @example Per-request fees and client-level defaults
 * ```ts
 * const client = initialize({
 *   apiKey: '...',
 *   apiSecret: '...',
 *   passphrase: '...',
 *   defaultFees: { feeBps: 10, feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
 * });
 *
 * // Per-request override:
 * await client.quote({
 *   mode: 'single-chain',
 *   params: { ... },
 *   fees: { feeBps: 25 },
 * });
 * ```
 *
 * @see docs/fees.md
 */
export interface FeeOptions {
  readonly feeBps?: number;
  readonly feeRecipient?: string;
}

/**
 * Single-chain quote parameters for one EVM network.
 *
 * @remarks Passed to {@link OlympexClient.quote} with `mode: 'single-chain'`.
 *
 * @property mode - Discriminator; must be `'single-chain'`.
 * @property params - Token, amount, and slippage fields for the source chain.
 * @property fees - Optional per-request {@link FeeOptions} override.
 *
 * @see docs/methods/quote.md
 */
export interface SingleChainQuoteInput {
  readonly mode: 'single-chain';
  readonly params: {
    readonly chainId: number;
    readonly inTokenAddress: string;
    readonly outTokenAddress: string;
    readonly amount: string;
    readonly slippage: string;
    readonly gasPrice: string;
    readonly excludeMetaAggregatorId?: readonly string[];
    readonly includeGasInfo?: boolean;
    readonly orderBy?: QuoteOrderBy;
    readonly gasMultiplier?: GasMultiplier;
  };
  readonly fees?: FeeOptions;
}

/**
 * Cross-chain quote parameters spanning two EVM networks.
 *
 * @remarks Passed to {@link OlympexClient.quote} with `mode: 'cross-chain'`.
 *
 * @property mode - Discriminator; must be `'cross-chain'`.
 * @property params - Source and destination chain/token fields for the bridge quote.
 * @property fees - Optional per-request {@link FeeOptions} override.
 *
 * @see docs/methods/quote.md
 */
export interface CrossChainQuoteInput {
  readonly mode: 'cross-chain';
  readonly params: {
    readonly fromTokenAddress: string;
    readonly toTokenAddress: string;
    readonly fromChainId: number;
    readonly toChainId: number;
    readonly amount: string;
    readonly slippage: string;
  };
  readonly fees?: FeeOptions;
}

/**
 * Quote request discriminated by {@link SingleChainQuoteInput.mode | mode}.
 *
 * @remarks Use `mode: 'single-chain'` for on-chain swaps on one network;
 * `mode: 'cross-chain'` for bridge/cross-chain quotes. Passed to {@link OlympexClient.quote}.
 *
 * @see docs/methods/quote.md
 */
export type QuoteRequest = SingleChainQuoteInput | CrossChainQuoteInput;

/**
 * Single-chain swap parameters for one EVM network.
 *
 * @remarks Passed to {@link OlympexClient.swap} with `mode: 'single-chain'`.
 *
 * @property mode - Discriminator; must be `'single-chain'`.
 * @property params - Token, account, and `aggregatorId` from a prior {@link SingleChainQuote}.
 * @property fees - Optional per-request {@link FeeOptions} override.
 *
 * @see docs/methods/swap.md
 */
export interface SingleChainSwapInput {
  readonly mode: 'single-chain';
  readonly params: {
    readonly chainId: number;
    readonly inTokenAddress: string;
    readonly outTokenAddress: string;
    readonly amount: string;
    readonly slippage: string;
    readonly gasPrice: string;
    readonly account: string;
    readonly aggregatorId: string;
  };
  readonly fees?: FeeOptions;
}

/**
 * Cross-chain swap parameters spanning two EVM networks.
 *
 * @remarks Passed to {@link OlympexClient.swap} with `mode: 'cross-chain'`.
 *
 * @property mode - Discriminator; must be `'cross-chain'`.
 * @property params - Bridge tokens, account, and `aggregatorId` from a prior {@link CrossChainQuote}.
 * @property fees - Optional per-request {@link FeeOptions} override.
 *
 * @see docs/methods/swap.md
 */
export interface CrossChainSwapInput {
  readonly mode: 'cross-chain';
  readonly params: {
    readonly account: string;
    readonly fromChainId: number;
    readonly toChainId: number;
    readonly inTokenAddress: string;
    readonly outTokenAddress: string;
    readonly amount: string;
    readonly slippage: string;
    readonly aggregatorId: string;
  };
  readonly fees?: FeeOptions;
}

/**
 * Swap request discriminated by {@link SingleChainSwapInput.mode | mode}.
 *
 * @remarks Use `mode: 'single-chain'` for on-chain execution; `mode: 'cross-chain'` for bridge swaps.
 * `aggregatorId` must come from a matching prior {@link OlympexClient.quote} result.
 *
 * @see docs/methods/swap.md
 */
export type SwapRequest = SingleChainSwapInput | CrossChainSwapInput;

/**
 * Quote response discriminated by `mode` — matches the originating {@link QuoteRequest}.
 *
 * @remarks Branch on `result.mode` to access mode-specific quote fields from
 * {@link SingleChainQuote} or {@link CrossChainQuote}.
 *
 * @example
 * ```ts
 * const result = await client.quote({ mode: 'single-chain', params: { ... } });
 *
 * if (result.mode === 'single-chain') {
 *   console.log(result.quote.outAmount, result.quote.aggregatorId);
 * } else {
 *   console.log(result.quote.toTokenAmount, result.quote.estimatedTime);
 * }
 * ```
 *
 * @see docs/methods/quote.md
 */
export type QuoteResult =
  | { readonly mode: 'single-chain'; readonly quote: SingleChainQuote }
  | { readonly mode: 'cross-chain'; readonly quote: CrossChainQuote };

/**
 * Swap response discriminated by `mode` — matches the originating {@link SwapRequest}.
 *
 * @remarks Branch on `result.mode` to access {@link SingleChainSwap} calldata or
 * {@link CrossChainSwap} bridge data.
 *
 * @see docs/methods/swap.md
 */
export type SwapResult =
  | { readonly mode: 'single-chain'; readonly swap: SingleChainSwap }
  | { readonly mode: 'cross-chain'; readonly swap: CrossChainSwap };

/**
 * Single-chain quote payload from the backend aggregator.
 *
 * @remarks Nested under {@link QuoteResult} when `mode` is `'single-chain'`.
 *
 * @property outAmount - Estimated output token amount.
 * @property aggregatorId - Backend route identifier; required for {@link OlympexClient.swap}.
 * @property routes - Route splits returned by the aggregator.
 *
 * @see docs/methods/quote.md
 */
export interface SingleChainQuote {
  readonly outAmount: string;
  readonly estimatedGas?: string | null;
  readonly aggregatorId: string;
  readonly aggregatorOrder?: readonly string[] | null;
  readonly market?: readonly QuoteMarket[] | null;
  readonly routes: readonly QuoteRoute[];
  readonly dataFeeTransaction?: DataFeeTransaction | null;
  readonly gasMultiplier?: string | null;
}

// TODO: esto no estoy seguro si deberiamos mostrarlo, yo pienso que no pero lo dejo para luego discutirlo con Pablo
/** DEX market slice in a single-chain quote response (field details may change pre-beta). */
export interface QuoteMarket {
  readonly dexName?: string | null;
  readonly swapAmount?: string | null;
  readonly dexImageURL?: string | null;
}

/** Route split with percentage allocation in a single-chain quote. */
export interface QuoteRoute {
  readonly percentage: number;
  readonly subRoutes: readonly QuoteSubRoute[];
}

/** Sub-route segment within a {@link QuoteRoute}. */
export interface QuoteSubRoute {
  readonly from: string;
  readonly to: string;
  readonly dexes: readonly QuoteDex[];
}

/** DEX entry within a {@link QuoteSubRoute}. */
export interface QuoteDex {
  readonly name?: string | null;
  readonly percentage?: number | null;
}

/** Fee and gas metadata attached to a single-chain quote. */
export interface DataFeeTransaction {
  readonly effectiveGasPrice?: string | null;
  readonly nativePrice?: string | null;
  readonly transactionFee?: string | null;
  readonly transactionFeeInUSD?: string | null;
  readonly tokenPrice?: string | null;
  readonly transactionFeeInTokenIn?: string | null;
  readonly valueToApprove?: string | null;
}

/**
 * Single-chain swap calldata and approval data from the backend.
 *
 * @remarks Nested under {@link SwapResult} when `mode` is `'single-chain'`.
 *
 * @property data - Encoded swap calldata for the wallet transaction.
 * @property minOutAmount - Minimum output amount after slippage.
 * @property outAmount - Expected output amount.
 * @property approveTransaction - ERC-20 approval calldata when required.
 *
 * @see docs/methods/swap.md
 */
export interface SingleChainSwap {
  readonly data: string;
  readonly estimatedGas?: string | null;
  readonly minOutAmount: string;
  readonly outAmount: string;
  readonly value: string;
  readonly approveTransaction: string;
}

/**
 * Cross-chain quote payload including bridge cost and timing estimates.
 *
 * @remarks Nested under {@link QuoteResult} when `mode` is `'cross-chain'`.
 *
 * @property aggregatorId - Backend bridge route identifier; required for {@link OlympexClient.swap}.
 * @property fromTokenAmount - Source-chain input amount.
 * @property toTokenAmount - Destination-chain estimated output.
 * @property estimateCostInUSD - Estimated bridge cost in USD.
 *
 * @see docs/methods/quote.md
 */
export interface CrossChainQuote {
  readonly aggregatorId: string;
  readonly estimatedGas?: string | null;
  readonly estimatedTime?: string | null;
  readonly estimateCostInUSD: string;
  readonly fromTokenAmount: string;
  readonly toTokenAmount: string;
  readonly minimumReceived: string;
  readonly bridgeInfo: {
    readonly icon?: string | null;
    readonly displayName?: string | null;
  };
  readonly middlewareRoute?: {
    readonly chainFrom?: readonly CrossChainRouteAssetPair[] | null;
    readonly chainTo?: readonly CrossChainRouteAssetPair[] | null;
  } | null;
}

/** Asset pair in a cross-chain middleware route. */
export interface CrossChainRouteAssetPair {
  readonly fromAsset?: CrossChainRouteAsset | null;
  readonly toAsset?: CrossChainRouteAsset | null;
}

/** Token asset reference in a cross-chain route. */
export interface CrossChainRouteAsset {
  readonly address?: string | null;
  readonly decimals?: number | null;
  readonly symbol?: string | null;
}

/**
 * Cross-chain swap calldata including bridge transaction hash.
 *
 * @remarks Nested under {@link SwapResult} when `mode` is `'cross-chain'`.
 * Use {@link CrossChainSwap.dexHash} with {@link OlympexClient.txStatus}.
 *
 * @property calldata - Encoded bridge swap calldata.
 * @property dexHash - Bridge transaction identifier for status polling.
 * @property approveTransaction - ERC-20 approval calldata when required.
 *
 * @see docs/methods/swap.md
 */
export interface CrossChainSwap {
  readonly calldata: string;
  readonly value: string;
  readonly approveTransaction: string;
  readonly dexHash: string;
}

/**
 * Input for {@link OlympexClient.txStatus} cross-chain status polling.
 *
 * @property hash - Source-chain transaction hash.
 * @property chainId - Source chain ID as string.
 * @property dexHash - Bridge identifier from {@link CrossChainSwap.dexHash}.
 *
 * @see docs/methods/tx-status.md
 */
export interface TxStatusInput {
  readonly hash: string;
  readonly chainId: string;
  readonly dexHash: string;
}

/**
 * Cross-chain transaction status returned by the backend.
 *
 * @remarks Poll via {@link OlympexClient.txStatus} after a {@link CrossChainSwap} until
 * `status` reaches a terminal state.
 *
 * @property toChainId - Destination chain ID.
 * @property fromChainId - Source chain ID.
 * @property detailStatus - Granular bridge status from the backend.
 * @property status - High-level bridge status.
 *
 * @see docs/methods/tx-status.md
 */
export interface TxStatus {
  readonly toChainId: string;
  readonly fromChainId: string;
  readonly detailStatus: string;
  readonly status: string;
}
