import { describe, expect, it } from 'vitest';

import {
  requirePayload,
  requireSuccessfulDomainResponse,
} from '../../src/client/domain-response.js';
import { OlympexDomainError } from '../../src/index.js';

describe('domain-response helpers', () => {
  it('requirePayload treats only null and undefined as missing', () => {
    expect(requirePayload(0, 'count')).toBe(0);
    expect(requirePayload('', 'label')).toBe('');
    expect(requirePayload(false, 'flag')).toBe(false);
    expect(requirePayload({ ok: true }, 'object')).toEqual({ ok: true });
  });

  it('requirePayload throws for null or undefined', () => {
    expect(() => requirePayload(null, 'value')).toThrow(OlympexDomainError);
    expect(() => requirePayload(undefined, 'value')).toThrow(/Missing value payload/);
  });

  it('requireSuccessfulDomainResponse treats only null and undefined as missing', () => {
    const response = { success: true as const };
    expect(requireSuccessfulDomainResponse(response, 'quote')).toBe(response);
  });

  it('requireSuccessfulDomainResponse throws for null or undefined', () => {
    expect(() => requireSuccessfulDomainResponse(null, 'quote')).toThrow(OlympexDomainError);
    expect(() => requireSuccessfulDomainResponse(undefined, 'quote')).toThrow(
      /Missing quote response/,
    );
  });
});
