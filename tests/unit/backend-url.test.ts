import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_BACKEND_URL,
  getGraphqlEndpoint,
  getRestBaseUrl,
  normalizeBase,
  resolveBackendBaseUrl,
} from '../../src/config/backend-url.js';
import { OlympexConfigError } from '../../src/errors/config-error.js';

const ENV_KEY = 'OLYMPEX_BACKEND_URL';

describe('resolveBackendBaseUrl', () => {
  it('returns production GraphQL default when env is unset', () => {
    vi.stubEnv(ENV_KEY, undefined);

    expect(resolveBackendBaseUrl()).toBe(DEFAULT_BACKEND_URL);
    expect(DEFAULT_BACKEND_URL).toBe('https://back.olympex.io/graphql');
  });

  it('returns staging GraphQL endpoint from origin override', () => {
    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io');

    expect(resolveBackendBaseUrl()).toBe('https://staging-back.olympex.io/graphql');
  });

  it('returns staging GraphQL endpoint from full override', () => {
    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io/graphql');

    expect(resolveBackendBaseUrl()).toBe('https://staging-back.olympex.io/graphql');
  });

  it('returns local development GraphQL endpoint from origin override', () => {
    vi.stubEnv(ENV_KEY, 'http://localhost:4000');

    expect(resolveBackendBaseUrl()).toBe('http://localhost:4000/graphql');
  });

  it('falls back to production default when env is empty', () => {
    vi.stubEnv(ENV_KEY, '');

    expect(resolveBackendBaseUrl()).toBe(DEFAULT_BACKEND_URL);
  });

  it('falls back to production default when env is whitespace-only', () => {
    vi.stubEnv(ENV_KEY, '   ');

    expect(resolveBackendBaseUrl()).toBe(DEFAULT_BACKEND_URL);
  });

  it('reads env at call time, not module load time', () => {
    vi.stubEnv(ENV_KEY, undefined);
    expect(resolveBackendBaseUrl()).toBe(DEFAULT_BACKEND_URL);

    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io/graphql');
    expect(resolveBackendBaseUrl()).toBe('https://staging-back.olympex.io/graphql');
  });

  it('throws OlympexConfigError for malformed URLs', () => {
    for (const value of ['not-a-url', 'ftp://x', 'https://x/api']) {
      vi.stubEnv(ENV_KEY, value);

      expect(() => resolveBackendBaseUrl()).toThrow(OlympexConfigError);
    }
  });
});

describe('normalizeBase', () => {
  it('strips a trailing slash from the base URL', () => {
    expect(normalizeBase('https://back.olympex.io/')).toBe('https://back.olympex.io');
  });

  it('leaves base URL unchanged when no trailing slash', () => {
    expect(normalizeBase('https://back.olympex.io')).toBe('https://back.olympex.io');
  });
});

describe('getGraphqlEndpoint', () => {
  it('derives GraphQL endpoint from production default', () => {
    vi.stubEnv(ENV_KEY, undefined);

    expect(getGraphqlEndpoint()).toBe('https://back.olympex.io/graphql');
  });

  it('derives GraphQL endpoint from staging origin override', () => {
    vi.stubEnv(ENV_KEY, 'https://staging-back.olympex.io');

    expect(getGraphqlEndpoint()).toBe('https://staging-back.olympex.io/graphql');
  });

  it('accepts full GraphQL URL override with trailing slash', () => {
    vi.stubEnv(ENV_KEY, 'https://back.olympex.io/graphql/');

    expect(getGraphqlEndpoint()).toBe('https://back.olympex.io/graphql');
  });
});

describe('getRestBaseUrl', () => {
  it('returns REST origin from production default', () => {
    vi.stubEnv(ENV_KEY, undefined);

    expect(getRestBaseUrl()).toBe('https://back.olympex.io');
  });

  it('returns local REST origin from GraphQL override', () => {
    vi.stubEnv(ENV_KEY, 'http://localhost:4000/graphql');

    expect(getRestBaseUrl()).toBe('http://localhost:4000');
  });

  it('returns REST origin from origin-only override', () => {
    vi.stubEnv(ENV_KEY, 'https://back.olympex.io/');

    expect(getRestBaseUrl()).toBe('https://back.olympex.io');
  });
});
