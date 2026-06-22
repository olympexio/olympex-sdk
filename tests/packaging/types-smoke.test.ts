import { execSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const tsconfigPath = path.join(repoRoot, 'tests/packaging/fixtures/ts-consumer/tsconfig.json');

describe('TypeScript declaration smoke', () => {
  it('type-checks a consumer project against dist/index.d.ts', () => {
    expect(() => {
      execSync(`yarn exec tsc --noEmit -p "${tsconfigPath}"`, {
        cwd: repoRoot,
        stdio: 'pipe',
        env: process.env,
      });
    }).not.toThrow();
  });
});
