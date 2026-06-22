import { OlympexSdkError } from './base-error.js';

/**
 * Thrown when a public method is not yet backed by a live backend contract.
 *
 * @remarks Extends {@link OlympexSdkError}. Use when exposing explicitly unsupported
 * temporary paths while backend contracts are still in progress.
 *
 * @see docs/errors.md
 */
export class OlympexNotImplementedError extends OlympexSdkError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'OLYMPEX_NOT_IMPLEMENTED', metadata);
  }
}
