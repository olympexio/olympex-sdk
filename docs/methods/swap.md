# `swap`

Builds swap calldata and metadata from a backend quote path. The SDK validates and forwards parameters; execution happens on-chain via returned calldata.

## Signature

```ts
swap(input: SwapRequest): Promise<SwapResult>
```

Available on the object returned by `initialize`.

## Modes

| Mode           | GraphQL operation   | Key params                                                                         |
| -------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `single-chain` | `getQuoteSwap`      | `chainId`, tokens, `amount`, `slippage`, `gasPrice`, `account`, `aggregatorId`     |
| `cross-chain`  | `getCrossChainSwap` | `fromChainId`, `toChainId`, tokens, `amount`, `slippage`, `account`, bridge fields |

## Optional fees

Same integrator margin fields as `quote`. See [`fees.md`](../fees.md).

## Example — single-chain

```ts
import { initialize } from '@olympex-io/olympex-sdk';

const client = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  apiSecret: process.env.OLYMPEX_API_SECRET!,
  passphrase: process.env.OLYMPEX_PASSPHRASE!,
});

const result = await client.swap({
  mode: 'single-chain',
  params: {
    chainId: 1,
    inTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    outTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1',
    slippage: '1',
    gasPrice: '30',
    account: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    aggregatorId: 'olympex',
  },
  fees: {
    feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
});

console.log(result.mode, result.swap);
```

## Errors

| Failure                          | Error class           |
| -------------------------------- | --------------------- |
| Invalid fees, addresses, or mode | `OlympexConfigError`  |
| Backend `success: false`         | `OlympexDomainError`  |
| GraphQL errors                   | `OlympexGraphQLError` |
| Network / auth failures          | `OlympexNetworkError` |

See [`errors.md`](../errors.md).

## Non-goals

- Local calldata generation or fee math
- Wallet signing (integrator signs and submits returned transactions)
