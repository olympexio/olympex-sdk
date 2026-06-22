import { OlympexDomainError } from '../errors/domain-error.js';

interface DomainResponse {
  readonly code?: number;
  readonly message?: string;
  readonly success?: boolean;
}

export function requireSuccessfulDomainResponse<TResponse extends DomainResponse>(
  response: TResponse | null | undefined,
  payloadName: string,
): TResponse {
  if (response === null || response === undefined) {
    throw new OlympexDomainError(`Missing ${payloadName} response`);
  }

  if (response.success === false) {
    throw new OlympexDomainError(response.message ?? `${payloadName} failed`, {
      code: response.code,
      success: response.success,
    });
  }

  return response;
}

export function requirePayload<TPayload>(
  payload: TPayload | null | undefined,
  payloadName: string,
): TPayload {
  if (payload === null || payload === undefined) {
    throw new OlympexDomainError(`Missing ${payloadName} payload`);
  }

  return payload;
}
