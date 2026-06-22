import { readFileSync } from 'node:fs';

export const SNAPSHOT_SYMBOL_KEYS = [
  'initialize',
  'quote',
  'swap',
  'OlympexSdkError',
  'OlympexConfigError',
  'OlympexDomainError',
  'OlympexGraphQLError',
  'OlympexNetworkError',
  'OlympexNotImplementedError',
] as const;

export type SnapshotSymbolKey = (typeof SNAPSHOT_SYMBOL_KEYS)[number];

const ANCHORS: Record<SnapshotSymbolKey, string> = {
  initialize: 'declare function initialize',
  quote: 'quote(input: QuoteRequest)',
  swap: 'swap(input: SwapRequest)',
  OlympexSdkError: 'declare class OlympexSdkError',
  OlympexConfigError: 'declare class OlympexConfigError',
  OlympexDomainError: 'declare class OlympexDomainError',
  OlympexGraphQLError: 'declare class OlympexGraphQLError',
  OlympexNetworkError: 'declare class OlympexNetworkError',
  OlympexNotImplementedError: 'declare class OlympexNotImplementedError',
};

/**
 * Normalize JSDoc text for snapshot comparison: CRLF → LF; trim trailing whitespace per line only.
 */
export function normalizeJsdocComment(comment: string): string {
  return comment
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n');
}

function extractPrecedingJsdoc(content: string, anchor: string, symbolKey: string): string {
  const anchorIndex = content.indexOf(anchor);
  if (anchorIndex === -1) {
    throw new Error(`Anchor not found for "${symbolKey}": ${anchor}`);
  }

  const beforeAnchor = content.slice(0, anchorIndex);
  const commentStart = beforeAnchor.lastIndexOf('/**');
  if (commentStart === -1) {
    throw new Error(`No JSDoc block before anchor for "${symbolKey}"`);
  }

  const commentEnd = content.indexOf('*/', commentStart);
  if (commentEnd === -1 || commentEnd >= anchorIndex) {
    throw new Error(`Malformed JSDoc block before anchor for "${symbolKey}"`);
  }

  return normalizeJsdocComment(content.slice(commentStart, commentEnd + 2));
}

export function extractDtsJsdoc(dtsContent: string): Record<SnapshotSymbolKey, string> {
  const result = {} as Record<SnapshotSymbolKey, string>;

  for (const key of SNAPSHOT_SYMBOL_KEYS) {
    result[key] = extractPrecedingJsdoc(dtsContent, ANCHORS[key], key);
  }

  return result;
}

export function extractDtsJsdocFromFile(dtsPath: string): Record<SnapshotSymbolKey, string> {
  const content = readFileSync(dtsPath, 'utf8');
  return extractDtsJsdoc(content);
}
