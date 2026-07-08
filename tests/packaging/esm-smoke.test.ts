import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8'),
) as { version: string };

import {
  createAccount,
  createConsoleLogger,
  getVersion,
  initialize,
  OlympexConfigError,
  OlympexSdkError,
} from '../../dist/index.mjs';

describe('ESM packaging smoke', () => {
  it('resolves public exports from dist/index.mjs', () => {
    expect(typeof initialize).toBe('function');
    expect(typeof createAccount).toBe('function');
    expect(typeof getVersion).toBe('function');
    expect(typeof createConsoleLogger).toBe('function');
    expect(OlympexSdkError).toBeDefined();
    expect(OlympexConfigError).toBeDefined();
  });

  it('initialize returns a client with public methods', () => {
    const client = initialize({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      passphrase: 'test-passphrase',
    });

    expect(typeof client.getVersion).toBe('function');
    expect(typeof client.quote).toBe('function');
    expect(typeof client.swap).toBe('function');
    expect(typeof client.supportChain).toBe('function');
    expect(typeof client.txStatus).toBe('function');
    expect(getVersion()).toBe(packageJson.version);
  });
});
