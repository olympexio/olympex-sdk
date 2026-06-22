# Getting Started

This SDK is a thin GraphQL client over the Olympex backend. It signs requests **server-side**
using `apiKey`, `apiSecret`, and `passphrase`.

> **Server-side only** — do not use this SDK directly in browser bundles. See
> `docs/authentication.md`.

## Backend URL

The SDK resolves the GraphQL endpoint from `OLYMPEX_BACKEND_URL` at call time. When unset,
empty, or whitespace-only, it defaults to production (`https://back.olympex.io/graphql`).

You may set either the backend origin or the full GraphQL path:

| Deployment | Example `OLYMPEX_BACKEND_URL`                                                  |
| ---------- | ------------------------------------------------------------------------------ |
| Production | _(unset — uses default)_                                                       |
| Staging    | `https://staging-back.olympex.io` or `https://staging-back.olympex.io/graphql` |
| Local dev  | `http://localhost:4000` or `http://localhost:4000/graphql`                     |

GraphQL requests use the resolved endpoint. REST onboarding POSTs to `{origin}/api/v1/accounts`
(the SDK strips `/graphql` from the resolved endpoint when needed).

## Minimal Node example

```ts
import { initialize } from '@olympex-io/olympex-sdk';

const client = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  apiSecret: process.env.OLYMPEX_API_SECRET!,
  passphrase: process.env.OLYMPEX_PASSPHRASE!,
});

console.log(client.getVersion());
console.log(await client.supportChain(1));
```

For staging or local backends, set `OLYMPEX_BACKEND_URL` in your environment before calling
`initialize` or `createAccount`.

## Account onboarding

`createAccount` is REST-based and does not require `initialize`:

```ts
import { createAccount } from '@olympex-io/olympex-sdk';

const credentials = await createAccount({
  name: 'My App',
  password: process.env.OLYMPEX_ACCOUNT_PASSWORD!,
});

// credentials.apiKey    → OLYMPEX_API_KEY
// credentials.secretKey → OLYMPEX_API_SECRET
// password above        → OLYMPEX_PASSPHRASE
```

See `docs/authentication.md` for the full credential lifecycle.

## Quote

Fees are configured per request with `feeRecipient` and optional `feeBps`. These declare **integrator margin**; channel resolution and `platformFeeIntegrator` are backend-owned from signed auth. See [`fees.md`](./fees.md).

```ts
const quote = await client.quote({
  mode: 'cross-chain',
  params: {
    fromChainId: 56,
    toChainId: 137,
    fromTokenAddress: '0x...',
    toTokenAddress: '0x...',
    amount: '1',
    slippage: '0.5',
  },
  fees: {
    feeBps: 15,
    feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
});
```

## Swap

```ts
const swap = await client.swap({
  mode: 'single-chain',
  params: {
    chainId: 1,
    inTokenAddress: '0x...',
    outTokenAddress: '0x...',
    amount: '1',
    slippage: '1',
    gasPrice: '30',
    account: '0x...',
    aggregatorId: 'olympex',
  },
  fees: {
    feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
});
```

Optional fee fields (`feeBps`, `feeRecipient`) can also be set once via
`initialize({ defaultFees })`. Per-call `fees` override client defaults.
See [docs/fees.md](./fees.md).
