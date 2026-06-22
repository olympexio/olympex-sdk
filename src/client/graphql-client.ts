import { OlympexGraphQLError } from '../errors/graphql-error.js';
import { OlympexNetworkError } from '../errors/network-error.js';
import { redact } from '../errors/redact.js';
import type { OlympexLogger } from '../types/public.js';
import { buildSignedHeaders } from './request-signing.js';

interface GraphQLErrorPayload {
  readonly message: string;
  readonly extensions?: Record<string, unknown>;
  readonly path?: readonly (string | number)[];
}

interface GraphQLResponse<TData> {
  readonly data?: TData;
  readonly errors?: readonly GraphQLErrorPayload[];
}

export interface GraphQLClientOptions {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase: string;
  readonly endpoint: string;
  readonly headers?: Record<string, string> | undefined;
  readonly logger?: OlympexLogger | undefined;
  readonly timeoutMs: number;
}

export class OlympexGraphQLClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly passphrase: string;
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly logger: OlympexLogger | undefined;
  private readonly timeoutMs: number;

  constructor(options: GraphQLClientOptions) {
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.passphrase = options.passphrase;
    this.endpoint = options.endpoint;
    this.headers = options.headers ?? {};
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs;
  }

  async request<TData, TVariables extends object>(
    document: string,
    variables: TVariables,
  ): Promise<TData> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger?.log(
        'debug',
        'Sending Olympex GraphQL request',
        redact({
          endpoint: this.endpoint,
          variables,
        }),
      );

      const bodyToFetch = JSON.stringify({ query: document, variables });
      const signedHeaders = buildSignedHeaders({
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
        body: bodyToFetch,
        passphrase: this.passphrase,
      });

      const response = await fetch(this.endpoint, {
        body: bodyToFetch,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...this.headers,
          ...signedHeaders,
        },
        method: 'POST',
        signal: controller.signal,
      });

      let body: GraphQLResponse<TData>;
      try {
        body = (await response.json()) as GraphQLResponse<TData>;
      } catch {
        this.logger?.log(
          'error',
          'Olympex GraphQL response was not valid JSON',
          redact({
            contentType: response.headers.get('content-type') ?? undefined,
            endpoint: this.endpoint,
            status: response.status,
          }),
        );
        throw new OlympexNetworkError('GraphQL response was not valid JSON', {
          contentType: response.headers.get('content-type') ?? undefined,
          status: response.status,
          statusText: response.statusText,
        });
      }

      if (!response.ok) {
        this.logger?.log(
          'error',
          'Olympex GraphQL request failed with HTTP status',
          redact({
            endpoint: this.endpoint,
            status: response.status,
            statusText: response.statusText,
          }),
        );
        throw new OlympexNetworkError(`GraphQL request failed with status ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
        });
      }

      if (body?.errors?.length) {
        const firstError = body.errors[0];
        this.logger?.log(
          'warn',
          'Olympex GraphQL response contains errors',
          redact({
            endpoint: this.endpoint,
            errorCount: body.errors.length,
            extensions: firstError?.extensions,
            firstMessage: firstError?.message,
          }),
        );
        throw new OlympexGraphQLError(body.errors[0]?.message ?? 'GraphQL request failed', {
          errors: body.errors.map((error) => ({
            extensions: error.extensions,
            message: error.message,
            path: error.path,
          })),
        });
      }

      if (!body?.data) {
        throw new OlympexGraphQLError('GraphQL response did not include data');
      }

      return body.data;
    } catch (error) {
      if (error instanceof OlympexGraphQLError || error instanceof OlympexNetworkError) {
        throw error;
      }

      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      this.logger?.log(
        'error',
        'Olympex GraphQL network failure',
        redact({
          endpoint: this.endpoint,
          errorMessage,
          errorName,
        }),
      );
      throw new OlympexNetworkError(errorMessage);
    } finally {
      clearTimeout(timeout);
    }
  }
}
