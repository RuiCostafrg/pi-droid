# Command/reconnect instrumentation: live acceptance checkpoint

## Chronology and immutable evidence

This closes the previously missing **successful-path full real-phone workflow and
loaded-tool check** for the command/reconnect instrumentation. It does not close
all Step 2 work or prove reconnect/failure behavior live.

1. Current source `e3bc49e099df8787746f0b7beb46bcd8a0875b05`, containing
   instrumentation commit `fca7737`, ran first:
   [current attempt 1](workflow-command-current-2026-10-18-attempt1.json).
2. Isolated `git archive fca7737^` source
   `4a8534df2a20f5359fa5032f44f5020961826a0f` ran second:
   [reference attempt 1](workflow-command-reference-2026-10-18-attempt1.json).
   This reference was collected **AFTER implementation**, not a chronological
   pre-change baseline. It reused existing node_modules, not the active source.
3. [Validated comparison JSON](workflow-command-comparison-2026-10-18.json)
   retains source/driver/consumer/engine provenance, counts, outcomes and limits.
4. [Loaded-tool metadata-only export](command-loaded-tool-2026-10-18.json)
   is a separate tool clock, not source spans or model latency.

Both live attempts passed; no failed full-workflow attempts in this checkpoint.
Historical drivers, adapters, JSON and Markdown were left byte-for-byte unchanged.
The same active bounded consumer was used on BOTH sides; `before` labels the
reference report, not the archived pre-consumer strategy.

Driver SHA256: `af7688014fa3e06fd07fd21c734aab86f2406c78ea988871dd2172231f068ca0`.
Consumer SHA256: `3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27`.
Engine hashes differ as expected and were independently recomputed against each
source root using the frozen driver's nine-file list; see comparison JSON.
Only `exec.ts`, `capture-timing.ts` and `ui-tree.ts` differ under src/ between
these revisions. No production code or frozen workflow was changed this session.

## Results (raw, not normalized)

| Metric | Post-implementation reference | Current |
| --- | ---: | ---: |
| Workflow status | PASS | PASS |
| Wall elapsed | 290458.23ms | 283302.93ms |
| Completed / failed operation records | 306 / 0 | 300 / 0 |
| Hierarchy captures | 74 | 72 |
| Direct hierarchy observations | 44 | 42 |
| Field selections | 30 | 30 |
| Exact numeric values checked after writes | 30/30 | 30/30 |
| Exact numeric persisted values checked after reopen | 30/30 | 30/30 |
| Explicit OCR calls | 1 | 1 |
| Alignment cycles | 2 | 0 |
| Complete alignment-cycle elapsed | 7173.10ms | 0ms |
| High-level capture spans | 370 | 360 |
| Emitted command-attempt spans | unavailable | 276 |
| Emitted reconnect spans | unavailable | 0 |
| Error capture spans | 0 | 0 |
| captureSpansTruncated | false | false |

Current is 7155.31ms / 2.46% lower elapsed in this pair. Reference needed two
additional, unchanged `field_scroll → settle → ui_dump` cycles taking 7173.10ms.
Their elapsed time is approximately the entire raw difference. **No demonstrated
speedup and no isolated instrumentation-overhead estimate**: one pair with
fixture/host/network variation cannot establish causality or non-inferiority.
Reported wall times and counts are never adjusted by removing those cycles.

Shopping checks passed on both: exact query/focus/readback, three comparable
sampled offers, chosen visible product and `/dp/` URL navigation. Both sampled
Alpro unsweetened and Original at €19.99 / €2.50 per litre, Barista at €18.94 /
€2.37 per litre; Barista was cheapest in this bounded sample. No independent
stock/detail-price assertion or claim about all Amazon offers. Frozen workflow
still does not assert independent exercise names or shop for Versa Gripps.

## Metric validation and what is NOT counted

Offline assertions checked status, all 34 unique checks/count entries, all 30
selections, both sets of 30 exact numeric readbacks, 32 type operations (query,
title and 30 numeric fields), all operation outcomes, finite non-negative timings,
fixed span-key allowlist, zero errors, nontruncation, source hashes and identical
public offers. Stage sequences match after stripping ONLY complete recognized
alignment cycles. Each capture has exactly one of each of the five high-level
stages. Current has 636 spans: 360 high-level plus 276 successful `adb_attempt`
spans. The expected traced attempt count is `72 * 3 + 30 * 2 = 276`: three
commands per hierarchy plus the two field-selection foreground guards.

**276 is not a whole-workflow command count.** The frozen driver only supplies
the sink to hierarchy/field-selection paths, not every shell, input, app or OCR
operation. Reference has no attempt instrumentation, so no measured reference
command count is asserted. Screenshots are not independently counted; one
explicit OCR call is recorded each. Source spans have independent per-observation
clocks concatenated without capture IDs. Do not merge them into the loaded-tool
clock, interpret all startMs as global, or sum nested spans as wall time.

The frozen workflow emits `captureSpansTruncated:false` but **no traceComplete
flag**. Cardinality and successful stage outcomes were checked; this is not a
claim about capture-worker IPC completeness. The old migration comparator was
not used/modified: it intentionally requires different consumer strategies,
identical engines and only the original five stages, so it is not the contract
for this instrumentation comparison.

Live reconnect, retry/error categories, cancellation, timeout, native failure,
cache hit and OCR fallback were not forced in this pair. The frozen workflow
uses exactSerial and autoReconnect:false. Existing controlled process-boundary
regressions cover these instrumentation paths; do not fabricate live spans or
claim a live recovery test. Screenshot/OCR/annotation internals and automatic
runtime companion ingestion remain unimplemented.

## Loaded extension, including earlier failed probe

After the passing pair, actual registered `android_ui_dump` accepted
`all_elements:true, ocr_fallback:false` on Settings → Termux app info and returned
46 elements, Settings foreground, exact non-interactive `Termux` title and `OPEN`
control. No control was activated and no screenshot/OCR tool was invoked.
Tool metadata records one successful dump at **2654.78ms**, no dropped/unfinished
spans. This single fixture time is not a before/after speed comparison.

Package configuration points Pi at this repository's `dist/index.js`. The dist
command/capture implementation already contained `adb_attempt`, `reconnect` and
the shared clock, and predated this session. Rebuilding unchanged source AFTER
the loaded check produced byte-identical SHA256s for dist/adb/exec.js,
ui-tree.js and capture-timing.js. Together with the direct registered call this
checks the loaded default-disabled path; registered tools do not expose the
source diagnostic sink. No internal source spans are claimed from that call.

The initial continuation on 2026-10-17 had an unsuccessful loaded fixture probe:
one native-only dump failed with the fixed fresh-hierarchy-confirmation error
(12030.31ms), then two dumps returned successful text but on Developer options
and Termux rather than the requested fixture (4520.50ms / 4724.96ms). Those two
are **not fixture passes**. The stopped tool trace reported 3 dump attempts,
1 error, 21275.77ms all-attempt time, zero dropped/unfinished spans. These numbers
are transcribed from actual tool output, not a preserved raw export or inferred
timeout classification. The changing foreground was not diagnosed; exclusive
control was requested and the user subsequently authorized hands-off execution.
No Amazon/Forge input happened in that probe; original IME/Termux were verified.
It is retained here rather than silently hiding the failed attempt.

## Phone safety / retained drafts

Two NEW test drafts remain, 11 total including the previously disclosed nine:
- `E2E Lower v2 source-cmd-current88`
- `E2E Lower v2 source-cmd-reference88`

Both contain five exercise groups, 15 unchecked sets at 20kg × 8 reps; all 30
numeric writes and all 30 persisted readbacks passed. No real workout was
finished, sets completed, existing workout edited, cart/checkout/account change,
install, permission grant, new helper or debugging exposure occurred. Host
Tesseract and ADBKeyboard were already installed. The original Gboard component
and foreground `com.termux` were independently verified via separate ADB shell
queries after EACH run and again after the loaded check. No concurrent device
actions, builds or tests ran during either measurement.

## Validation / next boundary

- pi-droid `npm run test:unit -- --maxWorkers=2`: **665/665, 51 files**.
- `npm run lint`, `npm run build`, unchanged dist hash checks: PASS.
- Isolated sequential extension-load/sandbox integrations with documented
  20s test / 30s hook limits: **9/9**. Default parallel CI not claimed fixed.
- Companion `npm test` / `npm run check`: **36/36**, build/typecheck; unchanged.
- JSON/privacy/frozen-file/diff checks recorded in the tracker.

Next slice MUST capture a fresh equivalent current baseline BEFORE changing
screenshot/OCR instrumentation, then repeat full E2E and loaded checks after it.
This successful current run is a checkpoint, not an indefinitely reusable future
baseline. No finer screenshot/OCR/annotation implementation was started here.
