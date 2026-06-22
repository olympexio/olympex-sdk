import { OlympexSdkError } from './base-error.js';

/**
 * Thrown when SDK configuration or caller input fails local validation before a network call.
 *
 * @remarks Extends {@link OlympexSdkError}. Safe to catch by `instanceof` or `error.code`
 * (`OLYMPEX_CONFIG_ERROR`). Examples: empty `apiKey`, invalid `OLYMPEX_BACKEND_URL`, invalid
 * {@link FeeOptions.feeBps | feeBps}.
 *
 * @see docs/errors.md
 */
export class OlympexConfigError extends OlympexSdkError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'OLYMPEX_CONFIG_ERROR', metadata);
  }
}
