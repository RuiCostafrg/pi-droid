# Reconnect workflow v3.2 comparison

Acceptance: **pass**.

Fresh chronological f061509 baseline captured before reconnect production edits.

| Gate | Pass |
| --- | --- |
| independentRecoveryManifest | true |
| bothPassed | true |
| correctPhases | true |
| sameFrozenDriver | true |
| sameBoundedConsumer | true |
| independentlyVerifiedSource | true |
| onlyReconnectWorkflowSourceSlice | true |
| allRequiredChecks | true |
| identicalChecks | true |
| thirtyWritesAndPersistedValues | true |
| sameOffersAndChosenProduct | true |
| completeScopedAccounting | true |
| allOperationsOk | true |
| all30SelectionsAnd32Types | true |
| oneOcrEach | true |
| retainedOtherWork | true |

| Metric | Reference | Current |
| --- | ---: | ---: |
| elapsedMs | 304521.519572 | 304066.193582 |
| operations | 315 | 315 |
| captures | 77 | 77 |
| scopedCommandAttempts | 291 | 291 |
| product_scroll cycles / total ms | 3 / 13482.42 | 3 / 13468.36 |
| field_scroll cycles / total ms | 2 / 7176.30 | 2 / 7337.26 |

Current minus reference: -455.33ms (-0.15%).

## Limits

- Same-v3.2 source workflow only; no isolated reconnect overhead or speedup claim.
- One pair is descriptive, not causal/population/non-inferiority evidence.
- Alignment cycles are reported, never subtracted from elapsed time; only complete cycles normalized for retained-work gate.
- Per-capture source clocks, operation clocks and loaded-tool clocks are separate. Nested spans are not additive wall time.
- Scoped commands not whole-workflow counts. Exact transport disables recovery; controlled recovery tests and focused/loaded success checks required separately.
