---
'@olympex-io/olympex-sdk': minor
---

Stricter integrator fee validation in `validateFeeOptions` (after `resolveFeeOptions` merge):

- `feeRecipient` is required when `feeBps > 0`
- Non-integer `feeBps` values (including fractional values, `NaN`, and `Infinity`) are rejected
- `feeRecipient` must not be the zero address

This MINOR release aligns the SDK client gate with the existing backend transport contract integrators already hit when sending fee options.
