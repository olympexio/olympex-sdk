# Changelog

## 0.3.0

### Minor Changes

- 0821e7e: Stricter integrator fee validation in `validateFeeOptions` (after `resolveFeeOptions` merge):
  - `feeRecipient` is required when `feeBps > 0`
  - Non-integer `feeBps` values (including fractional values, `NaN`, and `Infinity`) are rejected
  - `feeRecipient` must not be the zero address

  This MINOR release aligns the SDK client gate with the existing backend transport contract integrators already hit when sending fee options.

## 0.2.1

### Patch Changes

- 4361586: `getVersion()` and `OlympexClient.getVersion()` now return the actual installed package version from `package.json` (build-time injection) instead of a hardcoded placeholder. Corrects published `0.1.0` builds that reported `0.0.0`.

## 0.2.0

### Minor Changes

- 734f702: Single-chain `quote` responses now include `integratorFeeBreakdown` for integrator accounts — Olympex protocol fee and integrator margin lines (amounts in payment-token smallest units). The SDK requests and returns backend values verbatim; no local fee calculation. Cross-chain quotes are unchanged.

## 0.1.0

### Minor Changes

- 9c1a4d8: First public release (`0.1.0`) of the Olympex partner SDK.
  - Package scope `@olympex-io/olympex-sdk` with ESM/CJS/types packaging smoke gates
  - Normative partner docs: fees, errors, authentication, and method contracts
  - Server-side signed GraphQL client for `quote`, `swap`, `supportChain`, and `txStatus`
  - REST `createAccount` bootstrap for partner credentials
  - Changesets-driven releases with npm provenance from GitHub Actions

All notable changes to this package will be documented here by Changesets.
