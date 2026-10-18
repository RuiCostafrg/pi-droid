# Annotation workflow v3 comparison

Acceptance: **pass**.

Retrospective isolated 09c3cc8 reference collected after annotation implementation; not pre-code evidence.

| Gate | Pass |
| --- | --- |
| bothPassed | true |
| correctPhases | true |
| sameFrozenDriver | true |
| sameBoundedConsumer | true |
| independentlyVerifiedSource | true |
| onlyAnnotationSourceSlice | true |
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
| elapsedMs | 313865.858162 | 311786.372745 |
| operations | 321 | 318 |
| captures | 79 | 78 |
| scopedCommandAttempts | 297 | 294 |
| product_scroll cycles / total ms | 6 / 26657.76 | 6 / 27028.18 |
| field_scroll cycles / total ms | 1 / 3464.07 | 0 / 0.00 |

Current minus reference: -2079.49ms (-0.66%).

## Limits

- Same-v3 source workflow only; not v2-v3 speedup or isolated annotation overhead.
- One pair is descriptive, not causal/population/non-inferiority evidence.
- Alignment cycles are reported, never subtracted from elapsed time; only complete cycles normalized for retained-work gate.
- Per-capture source clocks, operation clocks and loaded-tool clocks are separate. Nested spans are not additive wall time.
- Scoped commands not whole-workflow counts. Source workflow does not exercise annotation; focused/loaded checks required separately.
