# Olympex SDK

> **Server-side SDK — not for direct browser usage.**  
> Run in your backend or BFF with signed API credentials (`apiKey`, `apiSecret`, `passphrase`).
> Browser clients must proxy through your own server. See [`docs/authentication.md`](./docs/authentication.md).

Official TypeScript SDK for Olympex.

This repository is bootstrapped for the public package `@olympex-io/olympex-sdk`. The SDK is intended to be a thin GraphQL client over the Olympex backend; it must not duplicate quote, swap, routing, fee, or cross-chain business logic locally.

## Runtime

- Node.js `22.15.0` or newer (server-side only)
- Signed API auth requires `apiSecret` and `passphrase` in trusted runtimes — **never in browser bundles**
- Yarn Berry via Corepack

## Scripts

```bash
yarn install --immutable
yarn typecheck
yarn lint
yarn test
yarn test:coverage
yarn build
```

## Current Contract Status

Signed GraphQL requests use `x-api-key-id`, `x-value-info`, `x-passphrase`, and
`x-signature`. `x-value-info` carries `timestamp\nnonce\nbodyHash`, and `x-signature` is
HMAC-SHA256 over that message.

GraphQL operations live in `src/graphql/operations.ts`. The SDK wraps backend calls; schema validation and business logic stay in backend.

Optional fee fields (`feeBps`, `feeRecipient`) may be passed on `quote` and `swap`; see `docs/fees.md`.

See `docs/getting-started.md` and `docs/authentication.md`.

### Local smoke test

```bash
OLYMPEX_API_KEY=... OLYMPEX_API_SECRET=... OLYMPEX_PASSPHRASE=... yarn debugging
```

Uses `scripts/sdk-instance.ts` — see `docs/authentication.md` for credential setup.

## Configuration

| Variable              | Description                                    | Default                   |
| --------------------- | ---------------------------------------------- | ------------------------- |
| `OLYMPEX_BACKEND_URL` | Backend origin (scheme + host + optional port) | `https://back.olympex.io` |

## Quickstart

```ts
import { initialize } from '@olympex-io/olympex-sdk';

const olympex = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  apiSecret: process.env.OLYMPEX_API_SECRET!,
  passphrase: process.env.OLYMPEX_PASSPHRASE!,
});

const version = olympex.getVersion();
const isSupported = await olympex.supportChain(1);
```

## Web3 Methods

`quote` and `swap` are thin wrappers over backend GraphQL operations. They select single-chain or cross-chain documents by `mode` and do not calculate routes, fees, prices or calldata locally.

```ts
const quote = await olympex.quote({
  mode: 'single-chain',
  params: {
    chainId: 1,
    inTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    outTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1',
    slippage: '1',
    gasPrice: '30',
  },
});
```

Onboarding can be called without `initialize`:

```ts
import { createAccount } from '@olympex-io/olympex-sdk';

const credentials = await createAccount({
  name: 'My App',
  password: process.env.OLYMPEX_ACCOUNT_PASSWORD!,
});
```

## Release

See [RELEASE.md](./RELEASE.md) for versioning, publishing, and pre-release checks.
