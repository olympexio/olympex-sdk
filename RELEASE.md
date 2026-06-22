# Release Process

This document describes how official versions of `@Olympex-io/olympex-sdk` are versioned, built, and published.

## Versioning

The SDK uses [Changesets](https://github.com/changesets/changesets) for SemVer, changelog generation, and release pull requests.

1. Add a changeset with `yarn changeset`.
2. Merge the generated release PR opened by the `Release` GitHub Action.
3. Publishing runs through NPM Trusted Publishing/OIDC with package provenance.

## Publishing

The release workflow does not require a classic `NPM_TOKEN`. Before the first publish, link this GitHub repository as a trusted publisher for the package in NPM.

The workflow publishes with:

- `id-token: write` for OIDC
- `yarn npm publish --provenance --access public`

## Pre-release Checks

Before merging a release PR, ensure these pass on the release branch:

```bash
yarn typecheck
yarn lint
yarn test
yarn build
```
