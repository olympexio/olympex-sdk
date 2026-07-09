---
'@olympex-io/olympex-sdk': patch
---

`getVersion()` and `OlympexClient.getVersion()` now return the actual installed package version from `package.json` (build-time injection) instead of a hardcoded placeholder. Corrects published `0.1.0` builds that reported `0.0.0`.
