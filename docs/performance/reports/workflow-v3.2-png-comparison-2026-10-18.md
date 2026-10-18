# PNG isolation workflow v3.2 comparison

Acceptance: **pass**.

Fresh chronological 72559c9 baseline captured before PNG isolation production edits.

| Gate | Pass |
| --- | --- |
| focusedPngCorrectnessAndProvenance | true |
| bothPassed | true |
| correctPhases | true |
| sameFrozenDriver | true |
| sameBoundedConsumer | true |
| independentlyVerifiedSource | true |
| onlyScreenshotSourceSlice | true |
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
| elapsedMs | 309200.604882 | 300495.08743799996 |
| operations | 315 | 312 |
| captures | 77 | 76 |
| scopedCommandAttempts | 291 | 288 |
| product_scroll cycles / total ms | 3 / 13668.68 | 3 / 13769.84 |
| field_scroll cycles / total ms | 2 / 7170.73 | 1 / 3562.86 |

Current minus reference: -8705.52ms (-2.82%).

## Limits

- Same-v3.2 source workflow only; no isolated PNG overhead or speedup claim.
- One pair is descriptive, not causal/population/non-inferiority evidence.
- Alignment cycles are reported, never subtracted from elapsed time; only complete cycles normalized for retained-work gate.
- Per-capture source clocks, operation clocks and loaded-tool clocks are separate. Nested spans are not additive wall time.
- Scoped commands not whole-workflow counts. The workflow OCR invokes screenshot once without a sink; focused PNG concurrency and fresh registered tools are separate evidence.
