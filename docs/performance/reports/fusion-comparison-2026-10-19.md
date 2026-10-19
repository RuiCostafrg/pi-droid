# Transfer/cleanup fusion workflow v3.2 comparison

Acceptance: **pass**.

Fresh chronological 35de2c6 baseline captured before transfer/cleanup fusion production edits.

| Gate | Pass |
| --- | --- |
| focusedPngCorrectnessAndProvenance | true |
| cleanupMetricsCorrectnessAndProvenance | true |
| bothPassed | true |
| correctPhases | true |
| sameFrozenDriver | true |
| sameBoundedConsumer | true |
| independentlyVerifiedSource | true |
| onlyApprovedSourceSlice | true |
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
| elapsedMs | 318324.81691 | 321845.174721 |
| operations | 321 | 324 |
| captures | 79 | 80 |
| scopedCommandAttempts | 297 | 300 |
| product_scroll cycles / total ms | 6 / 27324.84 | 6 / 27263.48 |
| field_scroll cycles / total ms | 1 / 3657.06 | 2 / 7406.39 |

Current minus reference: 3520.36ms (1.11%).

## Limits

- Same-v3.2 source workflow only; no isolated fusion overhead or speedup claim.
- One pair is descriptive, not causal/population/non-inferiority evidence.
- Alignment cycles are reported, never subtracted from elapsed time; only complete cycles normalized for retained-work gate.
- Per-capture source clocks, operation clocks and loaded-tool clocks are separate. Nested spans are not additive wall time.
- Scoped commands not whole-workflow counts. The workflow OCR invokes screenshot once without a sink; focused PNG concurrency and fresh registered tools are separate evidence.
