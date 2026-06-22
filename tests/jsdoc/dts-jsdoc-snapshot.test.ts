import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  extractDtsJsdocFromFile,
  SNAPSHOT_SYMBOL_KEYS,
  type SnapshotSymbolKey,
} from './extract-dts-jsdoc.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DTS_PATH = join(REPO_ROOT, 'dist/index.d.ts');

describe('dist/index.d.ts JSDoc snapshots (Tier-1 keys)', () => {
  let jsdocBySymbol: Record<SnapshotSymbolKey, string>;

  beforeAll(() => {
    execSync('yarn build', { cwd: REPO_ROOT, stdio: 'inherit' });

    jsdocBySymbol = extractDtsJsdocFromFile(DTS_PATH);
  });

  it.each(SNAPSHOT_SYMBOL_KEYS)('%s JSDoc matches snapshot', (symbolKey) => {
    expect(jsdocBySymbol[symbolKey]).toMatchSnapshot();
  });
});
