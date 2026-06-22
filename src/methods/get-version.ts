const VERSION = '0.0.0';

/**
 * Returns the SDK package version string (standalone export).
 *
 * @remarks Prefer {@link OlympexClient.getVersion} on an initialized client for the same value.
 * @returns Semantic version of the installed SDK (e.g. `'0.0.0'`).
 *
 * @see docs/getting-started.md
 */
export function getVersion(): string {
  return VERSION;
}
