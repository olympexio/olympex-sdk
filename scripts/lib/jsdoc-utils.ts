import { readFileSync } from 'node:fs';
import ts from 'typescript';

export type TierLevel = 1 | 2 | 3;

export interface ExampleQuotas {
  globalMinimum: number;
  perSymbolMinimums: Record<string, number>;
  entryPointSymbols: string[];
}

export interface TierManifest {
  version: number;
  tiers: Record<'1' | '2' | '3', string[]>;
  exampleQuotas: ExampleQuotas;
  throwsRequired?: string[];
  symbolAliases?: Record<string, string>;
}

export interface TierLookupResult {
  tier: TierLevel;
  manifestMissing: boolean;
}

interface ParsedJSDoc {
  description: string;
  fullText: string;
  tags: ts.JSDocTag[];
  exampleCount: number;
  hasSeeTag: boolean;
  hasInlineLink: boolean;
  hasRemarks: boolean;
  hasParam: boolean;
  hasReturns: boolean;
  hasThrows: boolean;
  propertyCount: number;
}

export interface ExampleQuotaViolation {
  symbol: string;
  message: string;
}

export function loadManifest(manifestPath: string): TierManifest {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as TierManifest;

  if (raw.version !== 1) {
    throw new Error(`Unsupported manifest version: ${String(raw.version)}`);
  }

  for (const tier of ['1', '2', '3'] as const) {
    if (!Array.isArray(raw.tiers[tier])) {
      throw new Error(`Manifest tiers.${tier} must be an array`);
    }
  }

  if (!raw.exampleQuotas?.entryPointSymbols || raw.exampleQuotas.globalMinimum < 1) {
    throw new Error('Manifest exampleQuotas is invalid');
  }

  return raw;
}

function resolveSymbolAlias(manifest: TierManifest, symbol: string): string {
  return manifest.symbolAliases?.[symbol] ?? symbol;
}

export function lookupTier(manifest: TierManifest, qualifiedName: string): TierLookupResult {
  for (const tierKey of ['1', '2', '3'] as const) {
    const tier = Number(tierKey) as TierLevel;
    if (manifest.tiers[tierKey].includes(qualifiedName)) {
      return { tier, manifestMissing: false };
    }
  }

  return { tier: 2, manifestMissing: true };
}

export function getJSDocFullText(node: ts.Node): string {
  const docs = ts.getJSDocCommentsAndTags(node);
  return docs
    .filter((part): part is ts.JSDoc => ts.isJSDoc(part))
    .map((doc) => doc.getFullText())
    .join('\n');
}

export function parseJSDoc(node: ts.Node): ParsedJSDoc | null {
  const docs = ts
    .getJSDocCommentsAndTags(node)
    .filter((part): part is ts.JSDoc => ts.isJSDoc(part));

  if (docs.length === 0) {
    return null;
  }

  const tags = docs.flatMap((doc) => doc.tags ?? []);
  const fullText = docs.map((doc) => doc.getFullText()).join('\n');
  const description = docs
    .map((doc) => doc.comment?.toString().trim() ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();

  return {
    description,
    fullText,
    tags,
    exampleCount: countExampleTags(tags),
    hasSeeTag: hasSeeReference(fullText, tags),
    hasInlineLink: hasInlineLink(fullText),
    hasRemarks: tags.some((tag) => tag.tagName.text === 'remarks'),
    hasParam: tags.some((tag) => tag.tagName.text === 'param'),
    hasReturns: tags.some((tag) => tag.tagName.text === 'returns'),
    hasThrows: tags.some((tag) => tag.tagName.text === 'throws'),
    propertyCount: tags.filter((tag) => tag.tagName.text === 'property').length,
  };
}

export function countExampleTags(tags: readonly ts.JSDocTag[]): number {
  return tags.filter((tag) => tag.tagName.text === 'example').length;
}

export function hasInlineLink(commentText: string): boolean {
  return /\{@link\s+/.test(commentText);
}

export function hasSeeReference(commentText: string, tags: readonly ts.JSDocTag[]): boolean {
  if (tags.some((tag) => tag.tagName.text === 'see')) {
    return true;
  }

  return /(?:^|\n)\s*\*?\s*@see\s+\S/m.test(commentText) || /See\s+\{@link/i.test(commentText);
}

export function hasSummary(parsed: ParsedJSDoc | null): boolean {
  return Boolean(parsed?.description.trim());
}

export function mentionsModeDiscriminator(parsed: ParsedJSDoc | null): boolean {
  if (!parsed) {
    return false;
  }

  return /\bmode\b/i.test(parsed.fullText);
}

export function isCallableDeclaration(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  );
}

export function hasNonVoidReturn(node: ts.Node, checker: ts.TypeChecker): boolean {
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

export function countGlobalExamples(
  manifest: TierManifest,
  exampleCountsBySymbol: ReadonlyMap<string, number>,
): { count: number; minimum: number } {
  const minimum = manifest.exampleQuotas.globalMinimum;
  let count = 0;

  for (const symbol of manifest.exampleQuotas.entryPointSymbols) {
    count += exampleCountsBySymbol.get(symbol) ?? 0;
  }

  return { count, minimum };
}

export function validatePerSymbolExamples(
  manifest: TierManifest,
  exampleCountsBySymbol: ReadonlyMap<string, number>,
): ExampleQuotaViolation[] {
  const violations: ExampleQuotaViolation[] = [];

  for (const [rawSymbol, minimum] of Object.entries(manifest.exampleQuotas.perSymbolMinimums)) {
    const symbol = resolveSymbolAlias(manifest, rawSymbol);
    const count = exampleCountsBySymbol.get(symbol) ?? 0;

    if (count < minimum) {
      violations.push({
        symbol: rawSymbol,
        message: `${symbol} requires ≥${minimum} @example (found ${count})`,
      });
    }
  }

  return violations;
}

export function formatDiagnostic(
  file: string,
  line: number,
  symbol: string,
  tier: TierLevel,
  message: string,
): string {
  return `${file}:${line} ${symbol} [tier ${tier}] ${message}`;
}
