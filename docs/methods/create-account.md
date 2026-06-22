# `createAccount`

Server-side REST bootstrap for partner credentials. Does **not** require `initialize`.

## Signature

```ts
createAccount(input: CreateAccountInput, options?: CreateAccountOptions): Promise<CreateAccountResponse>
```

## REST contract

```
POST {origin}/api/v1/accounts
Content-Type: application/json

{ "name": "<app name>", "password": "<strong passphrase>" }
```

The SDK resolves `{origin}` from `OLYMPEX_BACKEND_URL` (see [`getting-started.md`](../getting-started.md#backend-url)).

## Response

| Field              | Maps to                                             |
| ------------------ | --------------------------------------------------- |
| `apiKey`           | `initialize({ apiKey })` / `OLYMPEX_API_KEY`        |
| `secretKey`        | `initialize({ apiSecret })` / `OLYMPEX_API_SECRET`  |
| `password` (input) | `initialize({ passphrase })` / `OLYMPEX_PASSPHRASE` |

`secretKey` is returned **once** at creation. Store it immediately in a secret manager.

## Example

```ts
import { createAccount, initialize } from '@olympex-io/olympex-sdk';

const { apiKey, secretKey } = await createAccount({
  name: 'My Integration',
  password: process.env.OLYMPEX_ACCOUNT_PASSWORD!,
});

const client = initialize({
  apiKey,
  apiSecret: secretKey,
  passphrase: process.env.OLYMPEX_ACCOUNT_PASSWORD!,
});
```

Run bootstrap only from trusted server automation — never from browser code. See [`authentication.md`](../authentication.md).

## Errors

| Failure                             | Error class           |
| ----------------------------------- | --------------------- |
| Invalid input (empty name/password) | `OlympexConfigError`  |
| HTTP/network failure                | `OlympexNetworkError` |
| Unexpected response shape           | `OlympexNetworkError` |

## Non-goals

- Credential rotation API (contact Olympex ops)
- Browser-accessible onboarding
