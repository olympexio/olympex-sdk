import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getVersion } from '../../src/methods/get-version.js';

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8'),
) as { version: string };

describe('getVersion', () => {
  it('returns the package version from package.json', () => {
    expect(getVersion()).toBe(packageJson.version);
  });
});
