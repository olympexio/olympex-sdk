# Fee options

Optional fee fields on `quote` and `swap` declare **integrator margin** — where your share of the trade fee should accrue. The SDK validates shape and bounds locally, then forwards the fields unchanged. It never computes fee amounts, routes, or payout splits.

## Responsibility model

| Layer                   | Owns                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Integrator (you)**    | Supplying `feeBps` (0–100) and `feeRecipient` when you want margin on a quote/swap               |
| **SDK**                 | Local validation (range, address format) and GraphQL serialization only                          |
| **Backend**             | Resolving integrator channel from signed auth (`x-api-key-id`, signature headers)                |
| **Backend + contracts** | Applying `platformFeeIntegrator` (integrator-channel protocol fee) and partner commercial policy |

The SDK does **not** identify whether the caller is an external integrator or Olympex's own frontend. Channel classification and protocol fees are backend/contracts-owned from the signed partner auth context.

## Fee fields

| Field          | Type             | SDK behavior                                                |
| -------------- | ---------------- | ----------------------------------------------------------- |
| `feeBps`       | `number` (0–100) | Validated locally when present; forwarded to GraphQL params |
| `feeRecipient` | Ethereum address | Format-validated when present; forwarded to GraphQL params  |

When a field is omitted, the SDK does not send it. The backend decides whether fee fields apply for your authenticated account and channel.

Set defaults once via `initialize({ defaultFees })`, or override per call with `fees`.

## Example

```ts
import { initialize } from '@olympex-io/olympex-sdk';

const client = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  apiSecret: process.env.OLYMPEX_API_SECRET!,
  passphrase: process.env.OLYMPEX_PASSPHRASE!,
  defaultFees: {
    feeBps: 15,
    feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
});

await client.quote({
  mode: 'single-chain',
  params: {
    chainId: 1,
    inTokenAddress: '0x...',
    outTokenAddress: '0x...',
    amount: '1',
    slippage: '1',
    gasPrice: '30',
  },
  fees: { feeBps: 20, feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
});
```

## What the SDK does not do

- Compute quotes, routes, or fee breakdowns
- Expose or accept `platformFeeIntegrator` as consumer input
- Branch on caller channel or apply Olympex protocol fee tiers locally

Protocol fees configured by Olympex for your integrator channel are applied by the backend from your authenticated account — SDK consumers do not set them.

See also [`authentication.md`](./authentication.md) for how channel context is derived from signed requests.
