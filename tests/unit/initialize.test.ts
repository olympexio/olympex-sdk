import { createHash, createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { OlympexConfigError, getVersion, initialize } from '../../src/index.js';

const BASE_AUTH = {
  apiKey: 'partner-key',
  apiSecret: 'partner-secret',
  passphrase: 'partner-passphrase',
} as const;

const ENV_KEY = 'OLYMPEX_BACKEND_URL';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SDK bootstrap', () => {
  it('creates an SDK client with normalized api key', () => {
    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io');

    const client = initialize({
      apiKey: ' partner-key ',
      apiSecret: ' partner-secret ',
      passphrase: ' partner-passphrase ',
    });

    expect(client.apiKey).toBe('partner-key');
    expect(client.getVersion()).toBe(getVersion());
    expect(client.quote).toEqual(expect.any(Function));
    expect(client.swap).toEqual(expect.any(Function));
    expect(client.txStatus).toEqual(expect.any(Function));
    expect(client.supportChain).toEqual(expect.any(Function));
  });

  it('rejects empty api keys', () => {
    expect(() => initialize({ ...BASE_AUTH, apiKey: ' ' })).toThrow(OlympexConfigError);
  });

  it('rejects empty api secrets', () => {
    expect(() => initialize({ ...BASE_AUTH, apiSecret: ' ' })).toThrow(OlympexConfigError);
  });

  it('rejects empty passphrases', () => {
    expect(() => initialize({ ...BASE_AUTH, passphrase: ' ' })).toThrow(OlympexConfigError);
  });

  it('rejects invalid default feeBps', () => {
    expect(() =>
      initialize({
        ...BASE_AUTH,
        defaultFees: { feeBps: 150 },
      }),
    ).toThrow(OlympexConfigError);
  });

  it('rejects invalid OLYMPEX_BACKEND_URL before network calls', () => {
    vi.stubEnv(ENV_KEY, 'not-a-url');

    expect(() => initialize(BASE_AUTH)).toThrow(OlympexConfigError);
  });

  it('sends signed auth headers when checking supported chains', async () => {
    vi.stubEnv(ENV_KEY, undefined);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            getEnabledChains: {
              chainIds: ['1', '137'],
            },
          },
        }),
      ),
    );

    const client = initialize({
      apiKey: ' partner-key ',
      apiSecret: ' partner-secret ',
      passphrase: ' partner-passphrase ',
    });

    await expect(client.supportChain(137)).resolves.toBe(true);

    const [, init] = fetchMock.mock.calls[0] ?? [];

    const headers = new Headers(init?.headers);
    const body = String(init?.body ?? '');
    const valueInfo = headers.get('x-value-info');
    const decodedValueInfo = Buffer.from(valueInfo ?? '', 'base64').toString('utf8');
    const [timestamp, nonce, bodyHash] = decodedValueInfo.split('\n');

    expect(fetchMock).toHaveBeenCalledWith('https://back.olympex.io/graphql', expect.any(Object));
    expect(headers.get('x-api-key-id')).toBe('partner-key');
    expect(headers.get('x-passphrase')).toBe('partner-passphrase');
    expect(headers.get('x-signature')).toBe(
      createHmac('sha256', 'partner-secret').update(decodedValueInfo).digest('hex'),
    );
    expect(headers.get('sdk-api-key')).toBeNull();
    expect(timestamp).toMatch(/^\d+$/);
    expect(nonce).toMatch(/^[a-f0-9]{24}$/);
    expect(bodyHash).toBe(createHash('sha256').update(body).digest('base64url'));
  });

  it('targets staging GraphQL endpoint when OLYMPEX_BACKEND_URL is set', async () => {
    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            getEnabledChains: {
              chainIds: ['137'],
            },
          },
        }),
      ),
    );

    const client = initialize(BASE_AUTH);
    await client.supportChain(137);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://staging-back.olympex.io/graphql',
      expect.any(Object),
    );
  });

  it('uses resolved backend URL for client createAccount', async () => {
    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ apiKey: 'new-api-key', secretKey: 'new-secret-key' }), {
        status: 200,
      }),
    );

    const client = initialize(BASE_AUTH);

    await expect(
      client.createAccount({ name: 'Integrator', password: 'secure-passphrase' }),
    ).resolves.toEqual({
      apiKey: 'new-api-key',
      secretKey: 'new-secret-key',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://staging-back.olympex.io/api/v1/accounts',
      expect.objectContaining({
        body: JSON.stringify({
          name: 'Integrator',
          password: 'secure-passphrase',
        }),
        method: 'POST',
      }),
    );
  });
});
