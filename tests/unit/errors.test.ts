import { afterEach, describe, expect, it, vi } from 'vitest';

import { OlympexGraphQLClient } from '../../src/client/graphql-client.js';
import { OlympexGraphQLError, OlympexNetworkError } from '../../src/index.js';
import { redact } from '../../src/errors/redact.js';

const AUTH_FIXTURE = {
  apiKey: 'partner-key',
  apiSecret: 'partner-secret',
  passphrase: 'partner-passphrase',
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errors and redaction', () => {
  it('redacts sensitive keys while preserving non-sensitive values', () => {
    expect(
      redact({
        apiKey: 'secret',
        nested: {
          authorization: 'bearer token',
          list: [{ cookie: 'cookie' }, 'visible-string'],
          walletAddress: '0x1234',
        },
        publicNumber: 1,
      }),
    ).toEqual({
      apiKey: '<REDACTED>',
      nested: {
        authorization: '<REDACTED>',
        list: [{ cookie: '<REDACTED>' }, 'visible-string'],
        walletAddress: '0x1234',
      },
      publicNumber: 1,
    });
    expect(redact(null)).toBeNull();
  });

  it('raises GraphQL errors when data is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({})));
    const client = new OlympexGraphQLClient({
      ...AUTH_FIXTURE,
      endpoint: 'https://back.olympex.io/graphql',
      timeoutMs: 100,
    });

    await expect(client.request('query Test { test }', {})).rejects.toThrow(OlympexGraphQLError);
  });

  it('raises network errors when a successful response body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>gateway error</html>', {
        headers: { 'content-type': 'text/html' },
        status: 200,
      }),
    );
    const client = new OlympexGraphQLClient({
      ...AUTH_FIXTURE,
      endpoint: 'https://back.olympex.io/graphql',
      timeoutMs: 100,
    });

    await expect(client.request('query Test { test }', {})).rejects.toMatchObject({
      code: 'OLYMPEX_NETWORK_ERROR',
      message: 'GraphQL response was not valid JSON',
      metadata: {
        contentType: 'text/html',
        status: 200,
      },
    });
  });

  it('wraps thrown fetch failures as network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('socket closed'));
    const client = new OlympexGraphQLClient({
      ...AUTH_FIXTURE,
      endpoint: 'https://back.olympex.io/graphql',
      timeoutMs: 100,
    });

    await expect(client.request('query Test { test }', {})).rejects.toThrow(OlympexNetworkError);
  });
});
