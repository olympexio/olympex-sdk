/**
 * Base error for all SDK-thrown failures. Subclasses map to specific failure modes.
 *
 * @remarks Every SDK error exposes a stable `code` string and optional `metadata`.
 * Catch by `instanceof` or compare `error.code` for transport-agnostic handling.
 * See {@link OlympexConfigError}, {@link OlympexDomainError}, {@link OlympexGraphQLError},
 * {@link OlympexNetworkError}, and {@link OlympexNotImplementedError}.
 *
 * @example
 * ```ts
 * import {
 *   OlympexSdkError,
 *   OlympexConfigError,
 *   OlympexDomainError,
 * } from '@Olympex-io/olympex-sdk';
 *
 * try {
 *   await client.quote({ mode: 'single-chain', params: { ... } });
 * } catch (error) {
 *   if (error instanceof OlympexConfigError) {
 *     console.error('Invalid input:', error.code, error.message);
 *   } else if (error instanceof OlympexDomainError) {
 *     console.error('Backend rejected:', error.code, error.metadata);
 *   } else if (error instanceof OlympexSdkError) {
 *     console.error('SDK error:', error.code);
 *   }
 * }
 * ```
 */
export class OlympexSdkError extends Error {
  readonly code: string;
  readonly metadata: Record<string, unknown> | undefined;

  constructor(message: string, code = 'OLYMPEX_SDK_ERROR', metadata?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.metadata = metadata;
  }
}
