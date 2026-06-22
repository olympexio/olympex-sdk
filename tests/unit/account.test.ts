import { afterEach, describe, expect, it, vi } from 'vitest';

import { OlympexConfigError, OlympexNetworkError, createAccount } from '../../src/index.js';

const ENV_KEY = 'OLYMPEX_BACKEND_URL';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createAccount', () => {
  it('creates credentials through REST onboarding without initialize', async () => {
    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ apiKey: 'api-key-1', secretKey: 'secret-key-1' }), {
        status: 200,
      }),
    );

    await expect(
      createAccount({
        name: 'Integrator A',
        password: 'super-secret',
      }),
    ).resolves.toEqual({
      apiKey: 'api-key-1',
      secretKey: 'secret-key-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://staging-back.olympex.io/api/v1/accounts',
      expect.objectContaining({
        body: JSON.stringify({
          name: 'Integrator A',
          password: 'super-secret',
        }),
        method: 'POST',
      }),
    );
  });

  it('uses production default REST URL when env is unset', async () => {
    vi.stubEnv(ENV_KEY, undefined);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ apiKey: 'api-key-1', secretKey: 'secret-key-1' }), {
        status: 200,
      }),
    );

    await createAccount({
      name: 'Integrator A',
      password: 'super-secret',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://back.olympex.io/api/v1/accounts',
      expect.any(Object),
    );
  });

  it('strips trailing slash from REST base URL', async () => {
    vi.stubEnv(ENV_KEY, 'https://back.olympex.io/');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ apiKey: 'api-key-1', secretKey: 'secret-key-1' }), {
        status: 200,
      }),
    );

    await createAccount({
      name: 'Integrator A',
      password: 'super-secret',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://back.olympex.io/api/v1/accounts',
      expect.any(Object),
    );
  });

  it('accepts nested credentials payloads from backend wrappers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            apiKey: 'api-key-2',
            secretKey: 'secret-key-2',
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      createAccount({
        name: 'Integrator B',
        password: 'another-secret',
      }),
    ).resolves.toEqual({
      apiKey: 'api-key-2',
      secretKey: 'secret-key-2',
    });
  });

  it('fails fast on empty input fields', async () => {
    await expect(
      createAccount({
        name: ' ',
        password: 'pass',
      }),
    ).rejects.toThrow(OlympexConfigError);

    await expect(
      createAccount({
        name: 'Integrator C',
        password: ' ',
      }),
    ).rejects.toThrow(OlympexConfigError);
  });

  it('throws network error when response is not successful', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'rate limit' }), {
        status: 429,
        statusText: 'Too Many Requests',
      }),
    );

    await expect(
      createAccount({
        name: 'Integrator D',
        password: 'pass',
      }),
    ).rejects.toThrow(OlympexNetworkError);
  });
});
