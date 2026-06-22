const SENSITIVE_KEY_PATTERN = /api[-_]?key|authorization|cookie|token|secret|password/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function redact<T extends Record<string, unknown>>(value: T): T;
export function redact(value: unknown): unknown;
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '<REDACTED>' : redact(entry),
    ]),
  );
}
