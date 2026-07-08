import { defineConfig } from 'vitest/config';

import { readPackageVersion } from './scripts/lib/package-version';

const sdkVersion = readPackageVersion();

export default defineConfig({
  define: {
    __SDK_VERSION__: JSON.stringify(sdkVersion),
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['tests/setup/vitest.setup.ts'],
    pool: 'threads',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
