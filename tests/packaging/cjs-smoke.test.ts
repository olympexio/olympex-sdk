import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8'),
) as { version: string };

const requireCjs = createRequire(import.meta.url);
const pkg = requireCjs('../../dist/index.js');

describe('CJS packaging smoke', () => {
  it('resolves public exports from dist/index.js', () => {
    expect(typeof pkg.initialize).toBe('function');
    expect(typeof pkg.createAccount).toBe('function');
    expect(typeof pkg.getVersion).toBe('function');
    expect(typeof pkg.createConsoleLogger).toBe('function');
    expect(pkg.OlympexSdkError).toBeDefined();
    expect(pkg.OlympexConfigError).toBeDefined();
  });

  it('initialize returns a client with public methods', () => {
    const client = pkg.initialize({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      passphrase: 'test-passphrase',
    });

    expect(typeof client.quote).toBe('function');
    expect(typeof client.swap).toBe('function');
    expect(pkg.getVersion()).toBe(packageJson.version);
  });
});
