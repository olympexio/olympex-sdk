# Error handling

The SDK throws typed subclasses of `OlympexSdkError`. Catch by `instanceof` or compare `error.code` for stable handling across releases.

## Error class matrix

| Class                        | Code                      | When thrown                                                                                                               | Network call?                   | Typical action                                                          |
| ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `OlympexConfigError`         | `OLYMPEX_CONFIG_ERROR`    | Invalid `initialize` options, invalid `OLYMPEX_BACKEND_URL`, invalid local input (e.g. `feeBps` > 100, malformed address) | **No** — fail-fast before fetch | Fix caller input or env configuration                                   |
| `OlympexDomainError`         | `OLYMPEX_DOMAIN_ERROR`    | HTTP 200 with backend payload `success: false` (business rule rejection)                                                  | Yes (completed)                 | Inspect `message` and `metadata`; adjust request or contact Olympex ops |
| `OlympexGraphQLError`        | `OLYMPEX_GRAPHQL_ERROR`   | HTTP 200 with GraphQL `errors[]` (schema/execution failure)                                                               | Yes (completed)                 | Inspect GraphQL error details; often input or backend state issue       |
| `OlympexNetworkError`        | `OLYMPEX_NETWORK_ERROR`   | Timeouts, fetch failures, non-2xx HTTP, invalid JSON body, auth HTTP failures (401/403)                                   | Attempted                       | Retry with backoff; check connectivity, credentials, and backend status |
| `OlympexNotImplementedError` | `OLYMPEX_NOT_IMPLEMENTED` | Public method not yet backed by live backend contract                                                                     | Varies                          | Upgrade SDK or wait for backend rollout; see changelog                  |
| `OlympexSdkError`            | `OLYMPEX_SDK_ERROR`       | Base class for unexpected SDK failures                                                                                    | Varies                          | Log `code` + `metadata`; treat as SDK bug if reproducible               |

## Failure boundaries

### SDK-local validation (`OlympexConfigError`)

Thrown when the SDK can detect invalid input **without** backend state:

- Empty `apiKey`, `apiSecret`, or `passphrase` at `initialize`
- `feeBps` outside 0–100
- Malformed Ethereum address in `feeRecipient`
- Invalid backend URL resolution

```ts
import { OlympexConfigError } from '@olympex-io/olympex-sdk';

try {
  await client.quote({
    mode: 'single-chain',
    params: {
      /* ... */
    },
    fees: { feeBps: 150 },
  });
} catch (error) {
  if (error instanceof OlympexConfigError) {
    // Fix integrator input — no request reached Olympex
  }
}
```

### Backend/domain failures (`OlympexDomainError`, `OlympexGraphQLError`)

Thrown after a successful HTTP transport when the backend reports a domain or GraphQL failure. The SDK does not retry or reinterpret these responses.

### Transport/auth failures (`OlympexNetworkError`)

Includes authentication failures returned as HTTP **401** (invalid signature, passphrase, or timestamp window) and **403** (body hash mismatch). See [`authentication.md`](./authentication.md#error-handling).

## Metadata and redaction

All errors may include `metadata` with diagnostic context. The SDK redacts sensitive keys (secrets, tokens) in log paths; treat raw error objects as potentially sensitive in production logs.

## Related docs

- [`methods/quote.md`](./methods/quote.md) — quote-specific inputs that trigger config errors
- [`methods/swap.md`](./methods/swap.md) — swap-specific inputs
- [`fees.md`](./fees.md) — fee validation rules
