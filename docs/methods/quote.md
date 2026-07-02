# `quote`

Returns a backend-computed quote for a single-chain or cross-chain swap. The SDK validates and forwards parameters; it does not calculate routes, amounts, or fees.

## Signature

```ts
quote(input: QuoteRequest): Promise<QuoteResult>
```

Available on the object returned by `initialize`.

## Modes

| Mode           | GraphQL operation    | Key params                                                        |
| -------------- | -------------------- | ----------------------------------------------------------------- |
| `single-chain` | `getQuote`           | `chainId`, token addresses, `amount`, `slippage`, `gasPrice`      |
| `cross-chain`  | `getCrossChainQuote` | `fromChainId`, `toChainId`, token addresses, `amount`, `slippage` |

## Optional fees

Pass `fees: { feeBps?, feeRecipient? }` to declare integrator margin for this call. Per-call `fees` override `initialize({ defaultFees })`. See [`fees.md`](../fees.md).

## Integrator fee breakdown (single-chain only)

Integrator accounts receive `integratorFeeBreakdown` on successful single-chain quotes (`result.quote.integratorFeeBreakdown`). Cross-chain quotes do not expose this field. Field semantics, amount units, and channel rules are defined in [`fees.md`](../fees.md).

```ts
const result = await client.quote({
  mode: 'single-chain',
  params: {
    /* ... */
  },
});

if (result.mode === 'single-chain') {
  const breakdown = result.quote.integratorFeeBreakdown;
  // breakdown.protocolFeeAmount + breakdown.integratorMarginAmount — see fees.md
}
```

## Example — single-chain

```ts
import { initialize } from '@olympex-io/olympex-sdk';

const client = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  apiSecret: process.env.OLYMPEX_API_SECRET!,
  passphrase: process.env.OLYMPEX_PASSPHRASE!,
});

const result = await client.quote({
  mode: 'single-chain',
  params: {
    chainId: 1,
    inTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    outTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1',
    slippage: '1',
    gasPrice: '30',
  },
  fees: {
    feeBps: 15,
    feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
});

console.log(result.mode, result.quote);
```

## Example — cross-chain

```ts
const result = await client.quote({
  mode: 'cross-chain',
  params: {
    fromChainId: 56,
    toChainId: 137,
    fromTokenAddress: '0x...',
    toTokenAddress: '0x...',
    amount: '1',
    slippage: '0.5',
  },
});
```

## Errors

| Failure                            | Error class                            |
| ---------------------------------- | -------------------------------------- |
| Invalid `feeBps`, address, or mode | `OlympexConfigError` (no network call) |
| Backend `success: false`           | `OlympexDomainError`                   |
| GraphQL execution errors           | `OlympexGraphQLError`                  |
| Network, timeout, 401/403          | `OlympexNetworkError`                  |

See [`errors.md`](../errors.md).

## Non-goals

- Local route or price calculation
- Channel detection or protocol fee selection
