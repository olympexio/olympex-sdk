import { createHash, createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { OlympexGraphQLClient } from '../../src/client/graphql-client.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OlympexGraphQLClient auth headers', () => {
  it('sends signed headers on each GraphQL request', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ data: { ping: true } }), { status: 200 }));

    const client = new OlympexGraphQLClient({
      apiKey: 'partner-api-key',
      apiSecret: 'partner-secret-key',
      endpoint: 'https://back.olympex.io/graphql',
      headers: { 'x-custom-header': 'custom-value' },
      passphrase: 'partner-passphrase',
      timeoutMs: 5_000,
    });

    await expect(client.request('query Ping { ping }', {})).resolves.toEqual({ ping: true });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const requestInit = init as RequestInit | undefined;
    const headers = new Headers(requestInit?.headers);
    const body = String(requestInit?.body ?? '');
    const valueInfo = headers.get('x-value-info');
    const decodedValueInfo = Buffer.from(valueInfo ?? '', 'base64').toString('utf8');
    const [timestamp, nonce, bodyHash] = decodedValueInfo.split('\n');

    expect(url).toBe('https://back.olympex.io/graphql');
    expect(headers.get('x-api-key-id')).toBe('partner-api-key');
    expect(headers.get('x-passphrase')).toBe('partner-passphrase');
    expect(headers.get('x-custom-header')).toBe('custom-value');
    expect(headers.get('sdk-api-key')).toBeNull();
    expect(timestamp).toMatch(/^\d+$/);
    expect(nonce).toMatch(/^[a-f0-9]{24}$/);
    expect(bodyHash).toBe(createHash('sha256').update(body).digest('base64url'));
    expect(headers.get('x-signature')).toBe(
      createHmac('sha256', 'partner-secret-key').update(decodedValueInfo).digest('hex'),
    );
  });
});
