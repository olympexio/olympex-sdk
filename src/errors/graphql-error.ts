import { OlympexSdkError } from './base-error.js';

/**
 * Thrown when the GraphQL response contains an `errors[]` array on an otherwise successful HTTP 200.
 *
 * @remarks Extends {@link OlympexSdkError}. Distinct from {@link OlympexNetworkError} — the
 * transport succeeded but the GraphQL layer reported execution or validation failures.
 *
 * @see docs/errors.md
 */
export class OlympexGraphQLError extends OlympexSdkError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'OLYMPEX_GRAPHQL_ERROR', metadata);
  }
}
