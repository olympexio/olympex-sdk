import { afterEach, describe, expect, it, vi } from 'vitest';

import { OlympexGraphQLClient } from '../../../src/client/graphql-client.js';
import { OlympexGraphQLError, OlympexNetworkError } from '../../../src/index.js';
import type { OlympexLogger } from '../../../src/types/public.js';

const API_KEY_FIXTURE = 'secret-key-fixture';
const API_SECRET_FIXTURE = 'secret-key-value-fixture';
const PASSPHRASE_FIXTURE = 'passphrase-fixture';
const ENDPOINT = 'https://api.example.com/graphql';

afterEach(() => {
  vi.restoreAllMocks();
});

function createMockLogger() {
  return vi.fn<OlympexLogger['log']>();
}

function createClient(logger?: OlympexLogger) {
  return new OlympexGraphQLClient({
    apiKey: API_KEY_FIXTURE,
    apiSecret: API_SECRET_FIXTURE,
    endpoint: ENDPOINT,
    logger,
    passphrase: PASSPHRASE_FIXTURE,
    timeoutMs: 5_000,
  });
}

function capturedMetadata(logger: ReturnType<typeof createMockLogger>) {
  return logger.mock.calls.map((call) => call[2]);
}

describe('OlympexGraphQLClient logging', () => {
  it('warns on GraphQL errors response with redacted metadata', async () => {
    const logger = createMockLogger();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ extensions: { code: 'BAD_INPUT' }, message: 'Invalid input' }],
        }),
        { status: 200 },
      ),
    );

    const client = createClient({ log: logger });
    await expect(client.request('{ q }', {})).rejects.toThrow(OlympexGraphQLError);

    const warnCall = logger.mock.calls.find(
      (call) => call[1] === 'Olympex GraphQL response contains errors',
    );
    expect(warnCall).toBeDefined();
    expect(warnCall?.[0]).toBe('warn');
    expect(warnCall?.[2]).toEqual({
      endpoint: ENDPOINT,
      errorCount: 1,
      extensions: { code: 'BAD_INPUT' },
      firstMessage: 'Invalid input',
    });
  });

  it('errors on HTTP non-2xx with status metadata', async () => {
    const logger = createMockLogger();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: null }), { status: 500, statusText: 'Server Error' }),
    );

    const client = createClient({ log: logger });
    await expect(client.request('{ q }', {})).rejects.toThrow(OlympexNetworkError);

    const errorCall = logger.mock.calls.find(
      (call) => call[1] === 'Olympex GraphQL request failed with HTTP status',
    );

    expect(errorCall).toBeDefined();
    expect(errorCall?.[0]).toBe('error');
    expect(errorCall?.[2]).toEqual({
      endpoint: ENDPOINT,
      status: 500,
      statusText: 'Server Error',
    });
  });

  it('errors on non-JSON body with contentType metadata', async () => {
    const logger = createMockLogger();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not json', {
        headers: { 'content-type': 'text/html' },
        status: 200,
      }),
    );

    const client = createClient({ log: logger });
    await expect(client.request('{ q }', {})).rejects.toThrow(OlympexNetworkError);

    const errorCall = logger.mock.calls.find(
      (call) => call[1] === 'Olympex GraphQL response was not valid JSON',
    );
    expect(errorCall).toBeDefined();
    expect(errorCall?.[0]).toBe('error');
    expect(errorCall?.[2]).toEqual({
      contentType: 'text/html',
      endpoint: ENDPOINT,
      status: 200,
    });
  });

  it('errors on fetch rejection with AbortError metadata', async () => {
    const logger = createMockLogger();
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    const client = createClient({ log: logger });
    await expect(client.request('{ q }', {})).rejects.toThrow(OlympexNetworkError);

    const errorCall = logger.mock.calls.find(
      (call) => call[1] === 'Olympex GraphQL network failure',
    );
    expect(errorCall).toBeDefined();
    expect(errorCall?.[0]).toBe('error');
    expect(errorCall?.[2]).toEqual({
      endpoint: ENDPOINT,
      errorMessage: 'The operation was aborted',
      errorName: 'AbortError',
    });
  });

  it('emits zero log calls when logger is omitted across error paths', async () => {
    const logger = createMockLogger();
    const client = createClient(undefined);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ errors: [{ message: 'fail' }] }), { status: 200 }),
    );
    await expect(client.request('{ q }', {})).rejects.toThrow();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('{}', { status: 500, statusText: 'Error' }),
    );
    await expect(client.request('{ q }', {})).rejects.toThrow();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('not json', { status: 200 }));
    await expect(client.request('{ q }', {})).rejects.toThrow();

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    await expect(client.request('{ q }', {})).rejects.toThrow();

    expect(logger).toHaveBeenCalledTimes(0);
  });

  it('never includes apiKey in log metadata', async () => {
    const logger = createMockLogger();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'fail' }] }), { status: 200 }),
    );

    const client = createClient({ log: logger });
    await expect(
      client.request('{ q }', { apiKey: API_KEY_FIXTURE, nested: { token: 't' } }),
    ).rejects.toThrow();

    for (const metadata of capturedMetadata(logger)) {
      expect(JSON.stringify(metadata)).not.toContain(API_KEY_FIXTURE);
    }
  });
});
