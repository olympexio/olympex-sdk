import { OlympexSdkError } from './base-error.js';

/**
 * Thrown when the backend returns a domain-level `success: false` response.
 *
 * @remarks Extends {@link OlympexSdkError}. The HTTP request succeeded but the payload
 * indicates a business-rule or validation failure. Inspect `error.message` and `error.metadata`
 * for backend-provided context.
 *
 * @see docs/errors.md
 */
export class OlympexDomainError extends OlympexSdkError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'OLYMPEX_DOMAIN_ERROR', metadata);
  }
}
