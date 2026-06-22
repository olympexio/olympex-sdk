import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import {
  countGlobalExamples,
  lookupTier,
  parseJSDoc,
  validatePerSymbolExamples,
} from '../../scripts/lib/jsdoc-utils.js';
import {
  collectExportViolations,
  formatViolation,
  validateExampleQuotaViolations,
  validateSymbolJsdocRules,
  type ExportViolation,
} from '../../scripts/validate-export-jsdoc.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_MANIFEST = join(REPO_ROOT, 'scripts/public-jsdoc-tier-manifest.json');

const FAILT_MISSING_MANIFEST_MESSAGE = `/**
 * Partner fee configuration.
 *
 * @remarks Uses {@link InitializeOptions}.
 */
export interface FeeOptions {
  readonly partnerFeeBps?: number;
}`;

function writeFixture(root: string, files: Record<string, string>): string {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(absolutePath, content, 'utf8');
  }

  return root;
}

function minimalManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    tiers: {
      '1': ['initialize'],
      '2': ['FeeOptions'],
      '3': ['QuoteRoute'],
    },
    exampleQuotas: {
      globalMinimum: 12,
      perSymbolMinimums: {
        initialize: 1,
        quote: 1,
        swap: 1,
        createConsoleLogger: 1,
      },
      entryPointSymbols: [
        'initialize',
        'createConsoleLogger',
        'OlympexClient.quote',
        'OlympexClient.swap',
      ],
    },
    throwsRequired: ['initialize'],
    symbolAliases: {
      quote: 'OlympexClient.quote',
      swap: 'OlympexClient.swap',
    },
    ...overrides,
  };
}

function writeManifest(root: string, manifest: Record<string, unknown>): string {
  const manifestPath = join(root, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifestPath;
}

function violationMessages(violations: ExportViolation[]): string[] {
  return violations.map((violation) => violation.message);
}

describe('validate-export-jsdoc', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    tempDirs.length = 0;
  });

  describe('tier resolution', () => {
    it('unknown export defaults to tier 2 and emits manifest-missing error', () => {
      const root = mkdtempSync(join(tmpdir(), 'jsdoc-fixture-'));
      tempDirs.push(root);

      const manifestPath = writeManifest(root, minimalManifest());
      writeFixture(root, {
        'src/index.ts': `export { MysteryExport } from './mystery.ts';`,
        'src/mystery.ts': `/** Summary with {@link Foo}. @see docs/foo.md */\nexport const MysteryExport = 1;`,
        'tsconfig.json': JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'Bundler',
              strict: true,
              skipLibCheck: true,
            },
            include: ['src'],
          },
          null,
          2,
        ),
      });

      const violations = collectExportViolations({
        projectRoot: root,
        indexPath: join(root, 'src/index.ts'),
        manifestPath,
      });

      const manifestErrors = violations.filter((violation) =>
        violation.message.includes('missing from manifest'),
      );

      expect(manifestErrors).toHaveLength(1);
      expect(manifestErrors[0]?.symbol).toBe('MysteryExport');
      expect(manifestErrors[0]?.tier).toBe(2);
    });
  });

  describe('tier 3 relaxation', () => {
    it('QuoteRoute with summary only passes without @property or @example', () => {
      const root = mkdtempSync(join(tmpdir(), 'jsdoc-fixture-'));
      tempDirs.push(root);

      const manifestPath = writeManifest(root, minimalManifest());
      writeFixture(root, {
        'src/index.ts': `export type { QuoteRoute } from './public.ts';`,
        'src/public.ts': `/** Route split with percentage allocation in a single-chain quote. */\nexport interface QuoteRoute {\n  readonly percentage: number;\n}`,
        'tsconfig.json': JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'Bundler',
              strict: true,
              skipLibCheck: true,
            },
            include: ['src'],
          },
          null,
          2,
        ),
      });

      const violations = collectExportViolations({
        projectRoot: root,
        indexPath: join(root, 'src/index.ts'),
        manifestPath,
      }).filter((violation) => violation.symbol === 'QuoteRoute');

      expect(violations).toHaveLength(0);
    });
  });

  describe('tier 2 @see and {@link}', () => {
    const manifest = {
      version: 1,
      tiers: { '1': [], '2': ['FeeOptions'], '3': [] },
      exampleQuotas: {
        globalMinimum: 1,
        perSymbolMinimums: {},
        entryPointSymbols: [],
      },
    };

    it('fails when @see is missing even if {@link} is present', () => {
      const { declaration, checker } = createInterfaceFixture(FAILT_MISSING_MANIFEST_MESSAGE);

      const parsed = parseJSDoc(declaration);
      expect(parsed?.hasInlineLink).toBe(true);
      expect(parsed?.hasSeeTag).toBe(false);

      const violations = validateSymbolJsdocRules('FeeOptions', 2, declaration, manifest, checker);
      expect(violationMessages(violations)).toContain('missing required @see tag');
    });

    it('fails when {@link} is missing even if @see is present', () => {
      const { declaration, checker } = createInterfaceFixture(`/**
 * Partner fee configuration.
 *
 * @see docs/fees.md
 */
export interface FeeOptions {
  readonly partnerFeeBps?: number;
}`);

      const violations = validateSymbolJsdocRules('FeeOptions', 2, declaration, manifest, checker);
      expect(violationMessages(violations)).toContain('missing required {@link} reference');
    });
  });

  describe('@example global quota', () => {
    it('fails when global count is 11/12', () => {
      const manifest = {
        globalMinimum: 12,
        perSymbolMinimums: {},
        entryPointSymbols: ['initialize', 'createConsoleLogger', 'OlympexClient.quote'],
      };
      const counts = new Map<string, number>([
        ['initialize', 6],
        ['createConsoleLogger', 3],
        ['OlympexClient.quote', 2],
      ]);

      const { count, minimum } = countGlobalExamples(
        { version: 1, tiers: { '1': [], '2': [], '3': [] }, exampleQuotas: manifest },
        counts,
      );
      expect(count).toBe(11);
      expect(minimum).toBe(12);

      const violations = validateExampleQuotaViolations(
        { version: 1, tiers: { '1': [], '2': [], '3': [] }, exampleQuotas: manifest },
        counts,
      );

      expect(violationMessages(violations)).toContain('Global @example count 11/12');
    });

    it('passes when global count is 12/12', () => {
      const manifest = {
        globalMinimum: 12,
        perSymbolMinimums: {},
        entryPointSymbols: ['initialize', 'createConsoleLogger', 'OlympexClient.quote'],
      };
      const counts = new Map<string, number>([
        ['initialize', 6],
        ['createConsoleLogger', 4],
        ['OlympexClient.quote', 2],
      ]);

      const violations = validateExampleQuotaViolations(
        { version: 1, tiers: { '1': [], '2': [], '3': [] }, exampleQuotas: manifest },
        counts,
      );

      expect(
        violations.filter((violation) => violation.message.startsWith('Global @example')),
      ).toHaveLength(0);
    });
  });

  describe('@example per-symbol quota', () => {
    it('fails citing swap when global is 12 but OlympexClient.swap has 0 examples', () => {
      const manifest = {
        globalMinimum: 12,
        perSymbolMinimums: {
          initialize: 1,
          quote: 1,
          swap: 1,
          createConsoleLogger: 1,
        },
        entryPointSymbols: [
          'initialize',
          'createConsoleLogger',
          'OlympexClient.quote',
          'OlympexClient.swap',
        ],
      };
      const tierManifest = {
        version: 1,
        tiers: { '1': [], '2': [], '3': [] },
        exampleQuotas: manifest,
        symbolAliases: {
          quote: 'OlympexClient.quote',
          swap: 'OlympexClient.swap',
        },
      };
      const counts = new Map<string, number>([
        ['initialize', 4],
        ['createConsoleLogger', 4],
        ['OlympexClient.quote', 4],
        ['OlympexClient.swap', 0],
      ]);

      const global = countGlobalExamples(tierManifest, counts);
      expect(global.count).toBeGreaterThanOrEqual(12);

      const perSymbol = validatePerSymbolExamples(tierManifest, counts);

      expect(perSymbol).toHaveLength(1);
      expect(perSymbol[0]?.symbol).toBe('swap');
      expect(perSymbol[0]?.message).toContain('OlympexClient.swap');
      expect(perSymbol[0]?.message).toContain('found 0');
    });
  });

  describe('CLI integration', () => {
    it('spawns validator against fixture index.ts with exit code and stderr shape', () => {
      const root = mkdtempSync(join(tmpdir(), 'jsdoc-cli-'));
      tempDirs.push(root);

      const manifestPath = writeManifest(root, minimalManifest());
      writeFixture(root, {
        'src/index.ts': `export { Broken } from './broken.ts';`,
        'src/broken.ts': `/** Broken export without cross references. */\nexport const Broken = true;`,
        'tsconfig.json': JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'Bundler',
              strict: true,
              skipLibCheck: true,
            },
            include: ['src'],
          },
          null,
          2,
        ),
      });

      const validatorPath = join(REPO_ROOT, 'scripts/validate-export-jsdoc.ts');

      let exitCode = 0;
      let stderr = '';

      try {
        execFileSync(
          process.execPath,
          [
            '--experimental-strip-types',
            validatorPath,
            '--project-root',
            root,
            '--index',
            join(root, 'src/index.ts'),
            '--manifest',
            manifestPath,
          ],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
        );
      } catch (error) {
        const execError = error as { status?: number; stderr?: string };
        exitCode = execError.status ?? 1;
        stderr = execError.stderr ?? '';
      }

      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/src\/broken\.ts:\d+ Broken \[tier 2\]/);
      expect(stderr).toMatch(/missing from manifest/);
    });
  });

  describe('manifest lookup helper', () => {
    it('resolves known tier 3 symbols from the default manifest', () => {
      const manifest = JSON.parse(readFileSync(DEFAULT_MANIFEST, 'utf8'));
      const lookup = lookupTier(manifest, 'QuoteRoute');
      expect(lookup).toEqual({ tier: 3, manifestMissing: false });
    });
  });

  describe('formatViolation', () => {
    it('renders file:line symbol [tier N] message', () => {
      const formatted = formatViolation({
        file: 'src/foo.ts',
        line: 9,
        symbol: 'Foo',
        tier: 2,
        message: 'missing required @see tag',
      });

      expect(formatted).toBe('src/foo.ts:9 Foo [tier 2] missing required @see tag');
    });
  });
});

function createInterfaceFixture(source: string): {
  declaration: ts.InterfaceDeclaration;
  checker: ts.TypeChecker;
} {
  const fileName = 'fee.ts';
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const declaration = sourceFile.statements.find(ts.isInterfaceDeclaration);

  if (!declaration) {
    throw new Error('Expected interface declaration in fixture');
  }

  const program = ts.createProgram({
    rootNames: [fileName],
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    host: {
      ...ts.createCompilerHost({}),
      getSourceFile: (name) => (name === fileName ? sourceFile : undefined),
      writeFile: () => undefined,
    },
  });

  return { declaration, checker: program.getTypeChecker() };
}
