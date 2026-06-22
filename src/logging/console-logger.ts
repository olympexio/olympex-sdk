import type { LogLevel, OlympexLogger } from '../types/public.js';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Options for {@link createConsoleLogger}.
 *
 * @property minLevel - Minimum {@link LogLevel} to emit; defaults to `'info'`.
 */
export interface CreateConsoleLoggerOptions {
  readonly minLevel?: LogLevel;
}

/**
 * Returns a safe {@link OlympexLogger} that writes to `console` at the configured minimum level.
 *
 * @remarks Implementations never throw. Messages below `minLevel` are filtered out.
 * @param options - Optional {@link CreateConsoleLoggerOptions}; `minLevel` defaults to `'info'`.
 * @returns Frozen {@link OlympexLogger} suitable for {@link InitializeOptions.logger}.
 *
 * @example
 * ```ts
 * import { createConsoleLogger } from '@olympex-io/olympex-sdk';
 *
 * const logger = createConsoleLogger({ minLevel: 'warn' });
 * logger.log('info', 'filtered out');
 * logger.log('warn', 'visible', { requestId: 'abc' });
 * ```
 *
 * @see docs/logging.md
 */
export function createConsoleLogger(options: CreateConsoleLoggerOptions = {}): OlympexLogger {
  const minRank = LEVEL_RANK[options.minLevel ?? 'info'];

  const target = (level: LogLevel): ((...args: unknown[]) => void) => {
    const method = globalThis.console[level];
    return typeof method === 'function'
      ? method.bind(globalThis.console)
      : globalThis.console.log.bind(globalThis.console);
  };

  return Object.freeze({
    log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
      if (LEVEL_RANK[level] < minRank) {
        return;
      }

      try {
        const write = target(level);
        if (metadata === undefined) {
          write(message);
        } else {
          write(message, metadata);
        }
      } catch {
        /* logging must never throw */
      }
    },
  });
}
