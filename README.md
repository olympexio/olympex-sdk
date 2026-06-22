# Olympex SDK

> **Server-side SDK — not for direct browser usage.**  
> Run in your backend or BFF with signed API credentials (`apiKey`, `apiSecret`, `passphrase`).
> Browser clients must proxy through your own server. See [`docs/authentication.md`](./docs/authentication.md).

Official TypeScript SDK for Olympex partner integrations — package scope **`@olympex-io/olympex-sdk`**.

The SDK is a thin GraphQL/REST client over the Olympex backend. It does not duplicate quote, swap, routing, fee, or cross-chain business logic locally.

## Install

```bash
yarn add @olympex-io/olympex-sdk
# or
npm install @olympex-io/olympex-sdk
```

Requires **Node.js 22.15.0+** (server-side only). Never bundle `apiSecret` or `passphrase` in browser code.

## Quickstart

### 1. Bootstrap credentials (once)

```ts
import { createAccount } from '@olympex-io/olympex-sdk';

const { apiKey, secretKey } = await createAccount({
  name: 'My App',
  password: process.env.OLYMPEX_ACCOUNT_PASSWORD!,
});
// Persist apiKey, secretKey, and password in your secret store
```

See [`docs/methods/create-account.md`](./docs/methods/create-account.md).

### 2. Initialize client

```ts
import { initialize } from '@olympex-io/olympex-sdk';

const olympex = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  apiSecret: process.env.OLYMPEX_API_SECRET!,
  passphrase: process.env.OLYMPEX_PASSPHRASE!,
});
```

Optional defaults for integrator margin:

```ts
const olympex = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  apiSecret: process.env.OLYMPEX_API_SECRET!,
  passphrase: process.env.OLYMPEX_PASSPHRASE!,
  defaultFees: {
    feeBps: 15,
    feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
});
```

### 3. Quote and swap

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

const swap = await olympex.swap({
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
});
```

Method contracts: [`docs/methods/`](./docs/methods/README.md).

## Fees

`feeBps` (0–100) + `feeRecipient` are **integrator margin** inputs. The SDK validates and forwards them; the backend resolves your channel from signed auth and applies `platformFeeIntegrator` plus partner policy. See [`docs/fees.md`](./docs/fees.md).

## Errors

Typed errors extend `OlympexSdkError`:

| Class                 | When                                        |
| --------------------- | ------------------------------------------- |
| `OlympexConfigError`  | Invalid local input before any network call |
| `OlympexDomainError`  | Backend `success: false`                    |
| `OlympexGraphQLError` | GraphQL `errors[]` on HTTP 200              |
| `OlympexNetworkError` | Timeouts, HTTP failures, auth 401/403       |

Full matrix: [`docs/errors.md`](./docs/errors.md).

## Configuration

| Variable              | Description                                    | Default                   |
| --------------------- | ---------------------------------------------- | ------------------------- |
| `OLYMPEX_BACKEND_URL` | Backend origin (scheme + host + optional port) | `https://back.olympex.io` |

## Documentation

| Topic           | Doc                                                    |
| --------------- | ------------------------------------------------------ |
| Getting started | [`docs/getting-started.md`](./docs/getting-started.md) |
| Authentication  | [`docs/authentication.md`](./docs/authentication.md)   |
| Fees            | [`docs/fees.md`](./docs/fees.md)                       |
| Errors          | [`docs/errors.md`](./docs/errors.md)                   |
| Methods         | [`docs/methods/`](./docs/methods/README.md)            |
| Logging         | [`docs/logging.md`](./docs/logging.md)                 |

## Development scripts

```bash
yarn install --immutable
yarn typecheck
yarn lint
yarn lint:jsdoc
yarn test
yarn test:packaging
yarn test:coverage
yarn build
npm pack --dry-run
```

### Local smoke test

```bash
OLYMPEX_API_KEY=... OLYMPEX_API_SECRET=... OLYMPEX_PASSPHRASE=... yarn debugging
```

Uses `scripts/sdk-instance.ts` — see [`docs/authentication.md`](./docs/authentication.md).

## Release

See [RELEASE.md](./RELEASE.md) for Changesets workflow, Trusted Publishing (OIDC), and pre-release checks.

## SemVer

Public API follows SemVer from `0.1.0` onward. Pre-1.0 minors may include breaking changes — review changelog entries on each upgrade.
