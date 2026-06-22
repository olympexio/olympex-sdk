# Fee options

Optional fee fields on `quote` and `swap` declare where fees should accrue. The SDK validates
and forwards them; the backend applies fee policy for your authenticated account (see
`docs/authentication.md`).

## Fee fields

| Field          | Type             | SDK behavior                                                |
| -------------- | ---------------- | ----------------------------------------------------------- |
| `feeBps`       | `number` (0–100) | Validated locally when present; forwarded to GraphQL params |
| `feeRecipient` | Ethereum address | Format-validated when present; forwarded to GraphQL params  |

When a field is omitted, the SDK does not send it. The backend decides whether fee fields apply
for your account.

Set defaults once via `initialize({ defaultFees })`, or override per call with `fees`.

## Example

```ts
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
  // optional per-call override
  fees: { feeBps: 20, feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
});
```

## Backend dependency

GraphQL input types must accept `feeBps` and `feeRecipient` before the live backend can process
them. Until then, requests that include these fields may receive GraphQL validation errors from
the server.

> **Note:** Backend implementation is in progress. When it is complete, **this documentation
> must be updated**.

Protocol fees configured by Olympex are applied by the backend from your authenticated account —
SDK consumers do not set them.
