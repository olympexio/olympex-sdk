import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';

import {
  countGlobalExamples,
  formatDiagnostic,
  hasSummary,
  isCallableDeclaration,
  loadManifest,
  lookupTier,
  mentionsModeDiscriminator,
  parseJSDoc,
  type TierLevel,
  type TierManifest,
  validatePerSymbolExamples,
} from './lib/jsdoc-utils.ts';
import { CLIColors } from './lib/CLIColors.ts';

export interface ExportViolation {
  file: string;
  line: number;
  symbol: string;
  tier: TierLevel;
  message: string;
}

export interface CollectOptions {
  projectRoot: string;
  indexPath: string;
  manifestPath: string;
  tsconfigPath?: string;
}

interface ResolvedExport {
  symbol: string;
  declaration: ts.Node;
  sourceFile: ts.SourceFile;
}

const MODE_DISCRIMINATOR_SYMBOLS = new Set([
  'QuoteRequest',
  'SwapRequest',
  'QuoteResult',
  'SwapResult',
  'SingleChainQuoteInput',
  'CrossChainQuoteInput',
  'SingleChainSwapInput',
  'CrossChainSwapInput',
]);

export function formatViolation(violation: ExportViolation): string {
  return formatDiagnostic(
    violation.file,
    violation.line,
    violation.symbol,
    violation.tier,
    violation.message,
  );
}

export function validateExampleQuotaViolations(
  manifest: TierManifest,
  exampleCountsBySymbol: ReadonlyMap<string, number>,
): ExportViolation[] {
  const violations: ExportViolation[] = [];
  const global = countGlobalExamples(manifest, exampleCountsBySymbol);

  if (global.count < global.minimum) {
    violations.push({
      file: 'scripts/public-jsdoc-tier-manifest.json',
      line: 1,
      symbol: '(global)',
      tier: 1,
      message: `Global @example count ${global.count}/${global.minimum}`,
    });
  }

  for (const perSymbol of validatePerSymbolExamples(manifest, exampleCountsBySymbol)) {
    violations.push({
      file: 'scripts/public-jsdoc-tier-manifest.json',
      line: 1,
      symbol: perSymbol.symbol,
      tier: 1,
      message: perSymbol.message,
    });
  }

  return violations;
}

export function validateSymbolJsdocRules(
  symbol: string,
  tier: TierLevel,
  declaration: ts.Node,
  manifest: TierManifest,
  checker: ts.TypeChecker,
): ExportViolation[] {
  const sourceFile = declaration.getSourceFile();
  const line = sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
  const file = relative(process.cwd(), sourceFile.fileName).replaceAll('\\', '/');
  const parsed = parseJSDoc(declaration);
  const violations: ExportViolation[] = [];

  const push = (message: string) => {
    violations.push({ file, line, symbol, tier, message });
  };

  if (!hasSummary(parsed)) {
    push('missing required summary description');
    return violations;
  }

  if (tier === 3) {
    return violations;
  }

  if (!parsed?.hasSeeTag) {
    push('missing required @see tag');
  }

  if (!parsed?.hasInlineLink) {
    push('missing required {@link} reference');
  }

  if (tier === 2) {
    if (ts.isInterfaceDeclaration(declaration)) {
      const hasPropertySignatures = declaration.members.some((member) =>
        ts.isPropertySignature(member),
      );

      if (hasPropertySignatures && (parsed?.propertyCount ?? 0) === 0) {
        const hasInlinePropertyDocs = declaration.members.some(
          (member) =>
            ts.isPropertySignature(member) && ts.getJSDocCommentsAndTags(member).length > 0,
        );

        if (!hasInlinePropertyDocs) {
          push('missing required @property tag for interface fields');
        }
      }
    }

    if (MODE_DISCRIMINATOR_SYMBOLS.has(symbol) && !mentionsModeDiscriminator(parsed)) {
      push('missing mode discriminator documentation');
    }

    return violations;
  }

  if (!parsed?.hasRemarks) {
    push('missing required @remarks tag');
  }

  if (isCallableDeclaration(declaration)) {
    const params = (declaration as ts.SignatureDeclaration).parameters ?? [];
    if (params.length > 0 && !parsed?.hasParam) {
      push('missing required @param tag');
    }

    if (hasNonVoidReturn(declaration, checker) && !parsed?.hasReturns) {
      push('missing required @returns tag');
    }
  }

  if (manifest.throwsRequired?.includes(symbol) && !parsed?.hasThrows) {
    push('missing required @throws tag');
  }

  return violations;
}

function hasNonVoidReturn(node: ts.Node, checker: ts.TypeChecker): boolean {
  if (!isCallableDeclaration(node)) {
    return false;
  }

  const signature = checker.getSignatureFromDeclaration(node as ts.SignatureDeclaration);
  if (!signature) {
    return false;
  }

  const returnType = checker.getReturnTypeOfSignature(signature);
  return !checker.typeToString(returnType).includes('void');
}

function collectInterfaceMembers(
  interfaceDecl: ts.InterfaceDeclaration,
  interfaceName: string,
): ResolvedExport[] {
  const exports: ResolvedExport[] = [
    {
      symbol: interfaceName,
      declaration: interfaceDecl,
      sourceFile: interfaceDecl.getSourceFile(),
    },
  ];

  for (const member of interfaceDecl.members) {
    const memberName = member.name?.getText();
    if (!memberName) {
      continue;
    }

    if (!ts.isMethodDeclaration(member) && !ts.isMethodSignature(member)) {
      continue;
    }

    const qualified = `${interfaceName}.${memberName}`;
    exports.push({
      symbol: qualified,
      declaration: member,
      sourceFile: member.getSourceFile(),
    });
  }

  return exports;
}

function collectExportsFromIndex(
  indexPath: string,
  program: ts.Program,
  checker: ts.TypeChecker,
): ResolvedExport[] {
  const sourceFile = program.getSourceFile(indexPath);
  if (!sourceFile) {
    return [];
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    return [];
  }

  const exports: ResolvedExport[] = [];

  for (const exportSymbol of checker.getExportsOfModule(moduleSymbol)) {
    const exportName = exportSymbol.getName();
    if (exportName === 'ts' || exportName.startsWith('__')) {
      continue;
    }

    const aliased = checker.getAliasedSymbol(exportSymbol);
    const declaration = aliased.declarations?.[0];
    if (!declaration) {
      continue;
    }

    if (ts.isInterfaceDeclaration(declaration) && exportName === 'OlympexClient') {
      exports.push(...collectInterfaceMembers(declaration, exportName));
      continue;
    }

    exports.push({
      symbol: exportName,
      declaration,
      sourceFile: declaration.getSourceFile(),
    });
  }

  return exports;
}

export function collectExportViolations(options: CollectOptions): ExportViolation[] {
  const projectRoot = options.projectRoot;
  const tsconfigPath = options.tsconfigPath ?? join(projectRoot, 'tsconfig.json');
  const configFile = ts.readConfigFile(tsconfigPath, (path) => readFileSync(path, 'utf8'));
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot);

  const manifest = loadManifest(options.manifestPath);
  const rootNames = [...new Set([options.indexPath, ...parsedConfig.fileNames])];
  const program = ts.createProgram(rootNames, parsedConfig.options);
  const checker = program.getTypeChecker();
  const _exports = collectExportsFromIndex(options.indexPath, program, checker);

  const violations: ExportViolation[] = [];
  const exampleCounts = new Map<string, number>();

  for (const resolved of _exports) {
    const lookup = lookupTier(manifest, resolved.symbol);

    if (lookup.manifestMissing) {
      violations.push({
        file: relative(projectRoot, resolved.sourceFile.fileName).replaceAll('\\', '/'),
        line:
          resolved.sourceFile.getLineAndCharacterOfPosition(resolved.declaration.getStart()).line +
          1,
        symbol: resolved.symbol,
        tier: lookup.tier,
        message: `Export '${resolved.symbol}' missing from manifest — add tier entry (defaults to Tier 2)`,
      });
    }

    const parsed = parseJSDoc(resolved.declaration);
    if (parsed) {
      exampleCounts.set(resolved.symbol, parsed.exampleCount);
    }

    violations.push(
      ...validateSymbolJsdocRules(
        resolved.symbol,
        lookup.tier,
        resolved.declaration,
        manifest,
        checker,
      ),
    );
  }

  for (const entrySymbol of manifest.exampleQuotas.entryPointSymbols) {
    if (!exampleCounts.has(entrySymbol)) {
      exampleCounts.set(entrySymbol, 0);
    }
  }

  violations.push(...validateExampleQuotaViolations(manifest, exampleCounts));

  return violations;
}

function parseCliArgs(argv: string[]): CollectOptions {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const options: CollectOptions = {
    projectRoot: repoRoot,
    indexPath: join(repoRoot, 'src/index.ts'),
    manifestPath: join(repoRoot, 'scripts/public-jsdoc-tier-manifest.json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--project-root' && value) {
      options.projectRoot = value;
      index += 1;
    } else if (arg === '--index' && value) {
      options.indexPath = value;
      index += 1;
    } else if (arg === '--manifest' && value) {
      options.manifestPath = value;
      index += 1;
    } else if (arg === '--tsconfig' && value) {
      options.tsconfigPath = value;
    }
  }

  return options;
}

export function main(argv = process.argv.slice(2)): number {
  const cwd = process.cwd();
  const options = parseCliArgs(argv);
  const violations = collectExportViolations(options).map((violation) => ({
    ...violation,
    file: violation.file.startsWith('/') ? violation.file : join(cwd, violation.file),
  }));

  if (violations.length === 0) {
    return 0;
  }

  for (const violation of violations) {
    console.error(CLIColors.red(`${formatViolation(violation)}`));
  }

  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
