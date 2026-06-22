import { getRestBaseUrl } from '../config/backend-url.js';
import { OlympexConfigError } from '../errors/config-error.js';
import { OlympexNetworkError } from '../errors/network-error.js';
import type { CreateAccountOptions, CreateAccountResponse } from '../types/public.js';

const CREATE_ACCOUNT_PATH = '/api/v1/accounts';

interface CredentialsPayload {
  readonly apiKey: string;
  readonly secretKey: string;
}

function extractCredentials(payload: unknown): CreateAccountResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const directPayload = payload as Record<string, unknown>;
  const candidatePayloads: unknown[] = [directPayload];

  if (directPayload.data !== undefined) {
    candidatePayloads.push(directPayload.data);
  }

  for (const candidate of candidatePayloads) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const values = candidate as Partial<CredentialsPayload>;
    if (typeof values.apiKey === 'string' && typeof values.secretKey === 'string') {
      return {
        apiKey: values.apiKey,
        secretKey: values.secretKey,
      };
    }
  }

  return null;
}

function parseResponseMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const maybeMessage = (payload as { message?: unknown }).message;
  return typeof maybeMessage === 'string' ? maybeMessage : undefined;
}

/**
 * Creates API credentials via public REST onboarding.
 *
 * @remarks Server-side only. Does not require {@link initialize}. Store returned `secretKey`
 * securely; it is shown once by the backend. Backend routing is resolved from
 * `OLYMPEX_BACKEND_URL` at call time.
 * @param options - {@link CreateAccountOptions} with onboarding fields.
 * @returns Fresh {@link CreateAccountResponse} credentials for subsequent {@link initialize}.
 * @throws {OlympexConfigError} When `name` or `password` is empty, or `OLYMPEX_BACKEND_URL` is invalid.
 * @throws {OlympexNetworkError} When REST onboarding fails or omits credentials.
 *
 * @see docs/authentication.md
 */
export async function createAccount({
  name,
  password,
}: CreateAccountOptions): Promise<CreateAccountResponse> {
  const normalizedName = name.trim();
  const normalizedPassword = password.trim();

  if (!normalizedName) {
    throw new OlympexConfigError('name is required');
  }

  if (!normalizedPassword) {
    throw new OlympexConfigError('password is required');
  }

  const endpoint = `${getRestBaseUrl()}${CREATE_ACCOUNT_PATH}`;

  const response = await fetch(endpoint, {
    body: JSON.stringify({ name: normalizedName, password: normalizedPassword }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new OlympexNetworkError('createAccount response was not valid JSON', {
      contentType: response.headers.get('content-type') ?? undefined,
      endpoint,
      status: response.status,
      statusText: response.statusText,
    });
  }

  if (!response.ok) {
    throw new OlympexNetworkError(`createAccount request failed with status ${response.status}`, {
      endpoint,
      responseMessage: parseResponseMessage(responseBody),
      status: response.status,
      statusText: response.statusText,
    });
  }

  // TODO: tenemos el control tanto del código del SDK como del backend por lo que podemos
  // hacer que el SDK sepa como extraer las credenciales de la respuesta sin tener una
  // función tna verbosa de manera innecesaria
  const credentials = extractCredentials(responseBody);
  if (!credentials) {
    throw new OlympexNetworkError('createAccount response did not include credentials', {
      endpoint,
      status: response.status,
    });
  }

  return credentials;
}
