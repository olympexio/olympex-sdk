# Release Process

How maintainers version, validate, and publish `@olympex-io/olympex-sdk` to the public npm registry.

## Versioning

The SDK uses [Changesets](https://github.com/changesets/changesets) for SemVer, changelog generation, and release pull requests.

| Bump      | When                                                                       |
| --------- | -------------------------------------------------------------------------- |
| **patch** | Bug fixes, docs-only corrections, internal fixes with no public API change |
| **minor** | Backward-compatible features or additive API surface                       |
| **major** | Breaking changes to the public TypeScript contract                         |

Add a changeset when a merged change should ship in the **next** npm release:

```bash
yarn changeset
```

Commit the generated `.changeset/*.md` with the feature PR, or in a follow-up PR when you decide to release.

## Maintainer workflow

1. Merge feature PRs to `main`.
2. Ensure a changeset exists for everything that should ship (or add one).
3. Push to `main` → the **Release** workflow runs `changesets/action`.
4. If pending changesets exist, review and merge the **Version packages** PR (version bump + `CHANGELOG.md`).
5. After that merge, the workflow publishes to npm with provenance.
6. Verify: `npm view @olympex-io/olympex-sdk version`

No manual `npm publish` is required when CI and Trusted Publishing are configured.

## Publishing (CI)

Publishing runs from `.github/workflows/release.yml` on push to `main` only:

- **Auth:** npm Trusted Publishing (OIDC) — no long-lived `NPM_TOKEN` in the workflow
- **Permission:** `id-token: write`
- **Command:** `yarn npm publish --provenance --access public`
- **Registry:** `https://registry.npmjs.org`

`package.json` must keep `repository.url` aligned with the GitHub repo used for provenance.

Trusted Publishing is configured once per package in npm package settings (GitHub Actions publisher, workflow filename `release.yml`, branch `main`). See [npm Trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Pre-release checks

Before merging a **Version packages** PR, confirm CI is green on the release branch:

```bash
yarn typecheck
yarn lint
yarn lint:jsdoc
yarn test
yarn test:packaging
yarn build
npm pack --dry-run
```

The Release workflow runs typecheck, test, build, and `npm pack --dry-run` before publish.

## Changeset content

Write changeset text for **integrators** — it becomes the `CHANGELOG.md` entry. Include:

- New or changed public API behavior
- Notable fixes or contract clarifications

Do **not** put maintainer checklists, rollout status, or one-time setup steps in changesets.

## Integrator install (reference)

After a version is published:

```bash
yarn add @olympex-io/olympex-sdk
```

See [`docs/getting-started.md`](./docs/getting-started.md) and [`docs/authentication.md`](./docs/authentication.md) for setup.
