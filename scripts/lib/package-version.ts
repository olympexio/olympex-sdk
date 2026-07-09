import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function readPackageVersion(): string {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
    version: string;
  };

  return packageJson.version;
}
