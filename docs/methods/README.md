# Public methods

Method-level contracts for the partner SDK. Each page describes inputs, outputs, and error boundaries. The SDK is a thin GraphQL/REST client — it does not compute routes, fees, or calldata locally.

| Method | Doc | Requires `initialize` |
| ------ | --- | --------------------- |
| `initialize` | [`getting-started.md`](../getting-started.md) | — |
| `createAccount` | [`create-account.md`](./create-account.md) | No |
| `quote` | [`quote.md`](./quote.md) | Yes |
| `swap` | [`swap.md`](./swap.md) | Yes |
| `supportChain` | [`getting-started.md`](../getting-started.md) | Yes |
| `txStatus` | SDK JSDoc / backend schema | Yes |
| `getVersion` | README | No |

## GitBook export note

Partner documentation lives in this repository under `docs/`. For GitBook or similar portals, sync these markdown files (plus `README.md`) rather than maintaining a separate copy. Suggested structure:

- Getting started → `docs/getting-started.md`
- Authentication → `docs/authentication.md`
- Fees → `docs/fees.md`
- Errors → `docs/errors.md`
- Methods → `docs/methods/*`

Until a GitBook space is provisioned, treat this folder as the source of truth.
