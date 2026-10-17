# Workflow v2 consumer migration comparison

Comparison gates pass: **true**.

| Gate | Pass |
| --- | --- |
| bothPassed | true |
| correctModes | true |
| sameDriver | true |
| sameEngine | true |
| changedConsumer | true |
| allRequiredChecks | true |
| identicalChecks | true |
| sameOffers | true |
| exactCaptureAccounting | true |
| allOperationsOk | true |
| all30Selections | true |
| retainedOtherWork | true |
| oneOcrEach | true |

| Metric | Before | After |
| --- | ---: | ---: |
| Workflow wall ms | 370745.62 | 289733.50 |
| Completed hierarchy captures | 104 | 73 |
| Field-selection operations | 30 | 30 |
| Other direct hierarchy observations | 44 | 43 |
| Explicit OCR calls | 1 | 1 |
| Field-alignment cycles | 2 | 1 |
| Source operation records | 306 | 303 |
| Field-selection total ms | 160915.59 | 85558.71 |
| Alignment-cycle total ms | 7292.58 | 3615.34 |

Observed before minus after: **81012.12ms (21.85% lower elapsed time)**. This is one live pair, not a population or causal estimate.

## Work retained and variation

The 30 targeted duplicate captures are removed by consumer adoption of the public bounded operation. The remaining capture-count difference is reported separately: field alignment ran 2 → 1 cycles. Each such cycle includes a scroll, settling wait and fresh observation. Those checks were NOT deleted; the unchanged driver needed a different number. The entire wall-time difference must not be attributed solely to the 30 removals.

All 30 numeric values, all 30 persisted values, query/product navigation and cleanup must pass. Only full, explicitly recognized alignment cycles are normalized for the retained-other-work gate; reported elapsed times/counts are NEVER normalized. Other polling/operation differences fail that gate. Explicit OCR is one call each; this is not an independently instrumented screenshot count.

## Limits

Source/API workflow only: not model latency, active Pi tools, all Amazon offers, independent exercise-name/stock/detail-price checks, or hard process-group cancellation. See the protocol/evidence for preserved failures and test drafts. Driver/engine hashes record provenance, not cryptographic attestation of a report. Input/UI/network/host load can vary. Raw errors, page content, device identifiers and private paths are not copied into this comparison. Earlier v1 timings are NOT the reference for v2.
