import { defineConfig } from 'tsup';

import { readPackageVersion } from './scripts/lib/package-version';

const sdkVersion = readPackageVersion();

export default defineConfig({
  define: {
    __SDK_VERSION__: JSON.stringify(sdkVersion),
  },
  tsconfig: 'tsconfig.build.json',
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'node22',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
});
