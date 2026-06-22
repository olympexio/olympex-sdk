import { createHash, createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { buildSignedHeaders, generateBodySignature } from '../../src/client/request-signing.js';

describe('request signing', () => {
  it('generates body hash as base64url sha256', () => {
    const body = JSON.stringify({
      query: 'query GetContractAddress { getContractAddress { success } }',
      variables: { chainId: 1 },
    });

    const expectedHash = createHash('sha256').update(body).digest('base64url');

    expect(generateBodySignature(body)).toBe(expectedHash);
  });

  it('builds deterministic signed headers when timestamp and nonce are provided', () => {
    const apiKey = 'partner-api-key';
    const apiSecret = 'partner-secret-key';
    const passphrase = 'partner-passphrase';
    const timestamp = '1718100000';
    const nonce = '00112233445566778899aabb';
    const body = JSON.stringify({
      query: 'query Ping { ping }',
      variables: {},
    });

    const expectedBodyHash = createHash('sha256').update(body).digest('base64url');
    const expectedMessage = `${timestamp}\n${nonce}\n${expectedBodyHash}`;
    const expectedSignature = createHmac('sha256', apiSecret).update(expectedMessage).digest('hex');

    const headers = buildSignedHeaders({
      apiKey,
      apiSecret,
      body,
      nonce,
      passphrase,
      timestamp,
    });

    expect(headers).toEqual({
      'x-api-key-id': apiKey,
      'x-passphrase': passphrase,
      'x-signature': expectedSignature,
      'x-value-info': Buffer.from(expectedMessage).toString('base64'),
    });
  });
});
