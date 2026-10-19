# Capture-envelope diagnostic workflow comparison

Acceptance: **pass**.

Fresh chronological current-source baseline before new diagnostic implementation; production source unchanged.

| Gate | Pass |
| --- | --- |
| bothPassed | true |
| correctPhases | true |
| sameFrozenDriver | true |
| sameBoundedConsumer | true |
| independentlyVerifiedSource | true |
| unchangedProductionSource | true |
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
| elapsedMs | 304955.355873 | 304765.489258 |
| operations | 315 | 315 |
| captures | 77 | 77 |
| scopedCommandAttempts | 291 | 291 |
| product_scroll cycles / total ms | 3 / 13285.47 | 3 / 13399.84 |
| field_scroll cycles / total ms | 2 / 7216.98 | 2 / 7136.02 |

Current minus reference: -189.87ms (-0.06%).

## Limits

- Same-v3.2 unchanged-source workflow only; no optimization or isolated instrumentation-overhead claim.
- One pair is descriptive, not causal/population/non-inferiority evidence.
- Alignment cycles are reported, never subtracted from elapsed time; only complete cycles normalized for retained-work gate.
- Per-capture source clocks, operation clocks and loaded-tool clocks are separate. Nested spans are not additive wall time.
- Scoped commands not whole-workflow counts. Source workflow does not exercise annotation; focused/loaded checks required separately.
