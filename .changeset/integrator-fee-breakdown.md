---
'@olympex-io/olympex-sdk': minor
---

Single-chain `quote` responses now include `integratorFeeBreakdown` for integrator accounts — Olympex protocol fee and integrator margin lines (amounts in payment-token smallest units). The SDK requests and returns backend values verbatim; no local fee calculation. Cross-chain quotes are unchanged.
