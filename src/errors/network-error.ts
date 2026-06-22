import { OlympexSdkError } from './base-error.js';

/**
 * Thrown on network failures: timeouts, fetch errors, or non-2xx HTTP responses.
 *
 * @remarks Extends {@link OlympexSdkError}. Retry logic should consider exponential backoff;
 * inspect `error.metadata` for status codes when available.
 *
 * @see docs/errors.md
 */
export class OlympexNetworkError extends OlympexSdkError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'OLYMPEX_NETWORK_ERROR', metadata);
  }
}
