# Contributing JSDoc to the public SDK surface

JSDoc on symbols exported from `src/index.ts` flows into `dist/index.d.ts` for IDE hover text and published types. CI enforces compliance automatically — this guide is the contributor-facing source of truth for that contract.

## Neutral wording

Public JSDoc and `docs/` must use **neutral technical language**. Describe contracts and behavior without assuming who consumes the SDK.

## Enforcement layers

| Layer            | Command                                            | What it checks                                                                               |
| ---------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ESLint           | `yarn lint`                                        | Baseline tags on public implementation files (`eslint-plugin-jsdoc`)                         |
| Export validator | `yarn lint:jsdoc`                                  | Tier rules, manifest membership, `@example` quotas, every `index.ts` export                  |
| Snapshot         | `yarn test tests/jsdoc/dts-jsdoc-snapshot.test.ts` | Full JSDoc text for nine Tier-1 keys in `dist/index.d.ts` (runs `yarn build` in `beforeAll`) |

Run locally before opening a PR:

```bash
yarn typecheck
yarn lint
yarn lint:jsdoc
yarn test
yarn build
```

CI order: `typecheck` → `lint` → `lint:jsdoc` → `test` → `coverage` → `build`.

## Where to write JSDoc

- **Do** attach comments to the **implementation site** (`src/types/public.ts`, `src/config/initialize.ts`, `src/errors/*.ts`, etc.).
- **Do not** add JSDoc on `src/index.ts` re-exports (barrel only).
- **Do not** add JSDoc under internal paths: `src/client/`, `src/fees/`, `src/graphql/operations.ts`, `src/errors/redact.ts`, or method factories (`src/methods/quote.ts`, etc.).

## Symbol tiers

Tiers are defined in `scripts/public-jsdoc-tier-manifest.json`.

| Tier  | Examples                                                                                | Required tags                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | `initialize`, `OlympexClient` methods, `FeeOptions`, `InitializeOptions`, error classes | Summary, `@remarks`, `@param` / `@returns` (callables), `@throws` (when listed in manifest), `@see`, `{@link}`, `@example` on entry points |
| **2** | Request/result unions, `createConsoleLogger`, `getVersion`, `TxStatusInput`, constants  | Summary, `@see`, `{@link}`, `@property` on interface fields (or inline property docs)                                                      |
| **3** | Nested response types (`QuoteRoute`, `QuoteMarket`, …)                                  | One-line summary only — no field-level `@property`                                                                                         |

### Unknown exports

If a symbol is exported from `src/index.ts` but **missing from the manifest**, `yarn lint:jsdoc` fails twice:

1. `Export 'SymbolName' missing from manifest — add tier entry`
2. Tier-2 tag violations (default tier until listed)

Add an explicit tier entry — do not rely on the default.

## Checklist: new public API (e.g. `limitOrder`)

### 1. Implement and export

- Add the method to `OlympexClient` in `src/types/public.ts` with JSDoc on the interface method.
- Add related public types (inputs, results) in the same file or appropriate public module.
- Wire the runtime implementation (e.g. `src/methods/limit-order.ts` — **no JSDoc there**).
- Return the method from `initialize()` in `src/config/initialize.ts`.
- Re-export from `src/index.ts` if needed.

### 2. Update the tier manifest

Edit `scripts/public-jsdoc-tier-manifest.json`:

```json
{
  "tiers": {
    "1": ["OlympexClient.limitOrder", "..."]
  },
  "throwsRequired": ["OlympexClient.limitOrder"],
  "exampleQuotas": {
    "perSymbolMinimums": { "limitOrder": 1 },
    "entryPointSymbols": ["OlympexClient.limitOrder"]
  }
}
```

Only add `perSymbolMinimums` / `entryPointSymbols` when the symbol is an integration entry point with `@example`. Nested DTO types belong in tier **2** or **3**, not tier 1.

### 3. Write JSDoc (Tier 1 method template)

Copy style from `OlympexClient.quote` or `initialize`:

````ts
/**
 * Short one-line summary.
 *
 * @remarks SDK forwards params unchanged; does not compute routes or fees locally.
 * @param input - {@link LimitOrderInput} order parameters.
 * @returns {@link LimitOrderResult} normalized backend response.
 * @throws {OlympexConfigError} Local validation failure.
 * @throws {OlympexDomainError} Backend domain error.
 *
 * @example
 * ```ts
 * const result = await client.limitOrder({ ... });
 * ```
 *
 * @see docs/methods/limit-order.md
 */
limitOrder(input: LimitOrderInput): Promise<LimitOrderResult>;
````

Tier-2 interfaces need `@see`, at least one `{@link}`, and `@property` for non-obvious fields (`mode`, `feeBps`, etc.).

### 4. `@see` targets

Prefer existing repo docs:

| Topic          | `@see`                                            |
| -------------- | ------------------------------------------------- |
| Bootstrap      | `docs/getting-started.md`                         |
| Fees           | `docs/fees.md`                                    |
| Auth / account | `docs/authentication.md`                          |
| Logging        | `docs/logging.md`                                 |
| Methods        | `docs/methods/<method>.md` (planned paths are OK) |
| Errors         | `docs/errors.md` (planned)                        |

Use short `@example` blocks in JSDoc; long guides stay in markdown.

### 5. Verify

```bash
yarn lint:jsdoc    # fix until exit 0
yarn lint
yarn typecheck
yarn test
yarn build
```

Fix validator output first — messages include `file:line symbol [tier N] message`.

## Snapshot regression (nine Tier-1 keys)

Snapshots cover: `initialize`, `quote`, `swap`, and the six exported error classes.

- The snapshot test **always rebuilds** (`yarn build` in `beforeAll`) and reads `dist/index.d.ts`, not `src/` directly.
- Changing JSDoc wording on a snapshotted symbol without updating the snapshot fails:

  ```bash
  yarn test tests/jsdoc/dts-jsdoc-snapshot.test.ts
  ```

- Intentional JSDoc updates:

  ```bash
  yarn test tests/jsdoc/dts-jsdoc-snapshot.test.ts -u
  ```

  Commit the updated `tests/jsdoc/__snapshots__/dts-jsdoc-snapshot.test.ts.snap` in the same PR.

New methods like `limitOrder` are **not** snapshotted unless you extend `SNAPSHOT_SYMBOL_KEYS` in `tests/jsdoc/extract-dts-jsdoc.ts` (optional, for critical entry points only).

## `@example` quotas

The validator enforces:

- **Global:** ≥ 12 `@example` tags across `entryPointSymbols` in the manifest.
- **Per symbol:** at least one `@example` each on `initialize`, `quote`, `swap`, and `createConsoleLogger` (aliases map `quote` / `swap` → `OlympexClient.*`).

Both gates fail independently.

## Quick reference

| Task            | File / command                                                   |
| --------------- | ---------------------------------------------------------------- |
| Tier list       | `scripts/public-jsdoc-tier-manifest.json`                        |
| Validator logic | `scripts/validate-export-jsdoc.ts`, `scripts/lib/jsdoc-utils.ts` |
| Lint script     | `yarn lint:jsdoc`                                                |
| Snapshots       | `tests/jsdoc/dts-jsdoc-snapshot.test.ts`                         |
| This guide      | `docs/contributing-jsdoc.md`                                     |

## Common mistakes

| Symptom                             | Cause                                              | Fix                                                                                |
| ----------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `missing from manifest`             | New export not in JSON                             | Add tier entry                                                                     |
| `missing required @see` / `{@link}` | Tier 1–2 tags incomplete                           | Add tags per tier table                                                            |
| `missing required @property`        | Tier-2 interface without field docs                | Add `@property` or inline member JSDoc                                             |
| Snapshot passes but JSDoc changed   | Stale `dist/` (older test behavior)                | Snapshot test now rebuilds; run `yarn test tests/jsdoc/dts-jsdoc-snapshot.test.ts` |
| `yarn build` fails DTS              | Interface method not implemented in `initialize()` | Wire runtime before expecting green snapshots                                      |
