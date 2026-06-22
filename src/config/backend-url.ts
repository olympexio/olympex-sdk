import { OlympexConfigError } from '../errors/config-error.js';

export const DEFAULT_BACKEND_URL = 'https://back.olympex.io/graphql';

const BACKEND_URL_ENV = 'OLYMPEX_BACKEND_URL';
const GRAPHQL_PATH = '/graphql';

function readBackendUrlEnv(): string | undefined {
  const raw = process.env[BACKEND_URL_ENV];
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validateBackendUrl(url: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new OlympexConfigError(`Invalid ${BACKEND_URL_ENV}: ${url}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new OlympexConfigError(`Invalid ${BACKEND_URL_ENV}: ${url}`);
  }

  if (parsed.search || parsed.hash) {
    throw new OlympexConfigError(`Invalid ${BACKEND_URL_ENV}: ${url}`);
  }

  const pathname = parsed.pathname.replace(/\/$/, '') || '/';
  if (pathname !== '/' && pathname !== GRAPHQL_PATH) {
    throw new OlympexConfigError(`Invalid ${BACKEND_URL_ENV}: ${url}`);
  }

  return parsed;
}

export function normalizeBase(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function toGraphqlEndpoint(url: string): string {
  const parsed = validateBackendUrl(url);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';

  if (pathname === GRAPHQL_PATH) {
    return `${parsed.origin}${GRAPHQL_PATH}`;
  }

  return `${parsed.origin}${GRAPHQL_PATH}`;
}

export function resolveBackendBaseUrl(): string {
  const configured = readBackendUrlEnv();
  const candidate = configured ?? DEFAULT_BACKEND_URL;
  return toGraphqlEndpoint(candidate);
}

export function getGraphqlEndpoint(): string {
  return normalizeBase(resolveBackendBaseUrl());
}

export function getRestBaseUrl(): string {
  const graphqlEndpoint = normalizeBase(resolveBackendBaseUrl());

  if (graphqlEndpoint.endsWith(GRAPHQL_PATH)) {
    return graphqlEndpoint.slice(0, -GRAPHQL_PATH.length);
  }

  return graphqlEndpoint;
}
