import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

function parsePackDryRunFiles(output: string): string[] {
  const lines = output.split('\n');
  const start = lines.findIndex((line) => line.includes('Tarball Contents'));
  if (start === -1) {
    throw new Error('npm pack --dry-run did not report Tarball Contents');
  }

  return lines
    .slice(start + 1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('npm notice'))
    .map((line) => {
      const match = line.match(/^npm notice [\d.]+\w* (.+)$/);
      return match?.[1] ?? '';
    })
    .filter(Boolean);
}

function isAllowedPublishPath(relativePath: string): boolean {
  if (relativePath === 'LICENSE') return true;
  if (relativePath === 'README.md') return true;
  if (relativePath === 'package.json') return true;
  if (relativePath.startsWith('dist/')) return true;
  if (relativePath.startsWith('docs/')) return true;
  return false;
}

describe('npm pack --dry-run publishable files gate', () => {
  it('includes only release-safe paths from package files policy', () => {
    const output = execSync('npm pack --dry-run 2>&1', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    const packedFiles = parsePackDryRunFiles(output);
    expect(packedFiles.length).toBeGreaterThan(0);

    const disallowed = packedFiles.filter((file) => !isAllowedPublishPath(file));
    expect(disallowed, `Unexpected publish paths: ${disallowed.join(', ')}`).toEqual([]);

    const packageJson = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
      files: string[];
    };

    for (const allowRoot of packageJson.files) {
      if (allowRoot === 'dist' || allowRoot === 'docs') {
        expect(packedFiles.some((file) => file.startsWith(`${allowRoot}/`))).toBe(true);
        continue;
      }

      expect(packedFiles).toContain(allowRoot);
    }
  });
});
