# SDK logging

The Olympex SDK is **silent by default**. No log output is produced unless you pass an `OlympexLogger` to `initialize({ logger })`.

## OlympexLogger contract

```typescript
interface OlympexLogger {
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

- Compatible with pino, winston, or any adapter that exposes the same `log(level, message, metadata?)` signature.
- Your implementation **must not throw** — a throwing logger can break SDK methods mid-flight.
- All SDK-emitted `metadata` is passed through `redact()` before reaching your logger (api keys, tokens, secrets stripped).

## createConsoleLogger

Zero-dependency console adapter for quick local debugging:

```typescript
import { createConsoleLogger, initialize } from '@olympex-io/olympex-sdk';

const client = initialize({
  apiKey: process.env.OLYMPEX_API_KEY!,
  logger: createConsoleLogger({ minLevel: 'info' }), // default minLevel is 'info'
});
```

| Option     | Default  | Description                                                             |
| ---------- | -------- | ----------------------------------------------------------------------- |
| `minLevel` | `'info'` | Suppresses levels below this rank (`debug` < `info` < `warn` < `error`) |

Use `minLevel: 'debug'` to see outgoing GraphQL request metadata in the console.

## Stable log message strings

Callers may grep or match on these strings. Treat them as part of the public log surface:

| Level   | Message                                           |
| ------- | ------------------------------------------------- |
| `debug` | `Sending Olympex GraphQL request`                 |
| `warn`  | `Olympex GraphQL response contains errors`        |
| `error` | `Olympex GraphQL request failed with HTTP status` |
| `error` | `Olympex GraphQL response was not valid JSON`     |
| `error` | `Olympex GraphQL network failure`                 |
| `info`  | `Olympex quote requested`                         |
| `info`  | `Olympex swap requested`                          |

Quote/swap `info` logs include only `mode` and chain id(s) — never amounts, routes, token addresses, or fee values.

## pino adapter (5 lines)

No peer dependency is bundled; wire pino yourself:

```typescript
import pino from 'pino';
import type { OlympexLogger } from '@olympex-io/olympex-sdk';

const pinoLogger = pino({ level: 'info' });
const logger: OlympexLogger = {
  log(level, message, metadata) {
    pinoLogger[level](metadata ?? {}, message);
  },
};
```

## winston adapter (5 lines)

```typescript
import winston from 'winston';
import type { OlympexLogger } from '@olympex-io/olympex-sdk';

const winstonLogger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()],
});
const logger: OlympexLogger = {
  log(level, message, metadata) {
    winstonLogger.log(level, message, metadata);
  },
};
```
