# Screenshot/OCR timing: implementation and real-phone acceptance

## Chronology and preserved attempts

Source started clean at `22af80b`. The [baseline checkpoint](workflow-shot-baseline-2026-10-18.md)
was saved BEFORE production edits. Frozen workflow, active bounded consumer,
archived adapters and historical reports were not changed.

1. [Workflow before attempt 1](workflow-shot-before-2026-10-18-attempt1.json): PASS.
2. [Focused Settings before attempt 1](screenshot-ocr-before-2026-10-18-attempt1.json):
   9/9 correct, saved before production edits; three rounds per public API.
3. Add screenshot/OCR spans and extend bounded IPC/offline importer vocabulary.
4. [Workflow after attempt 1](workflow-shot-after-2026-10-18-attempt1.json): FAIL,
   248255.74ms, 267 operation records, 61 hierarchy captures, all shopping checks
   and 30 writes pass. Exact `draft_card_visible` OCR identity check failed;
   persisted reopen/readback NOT verified. No raw OCR retained, so the specific
   misrecognition/cause is not asserted. Original IME/Termux cleanup passes and
   independent shell verification confirms both. Failed run is NOT a fast result.
5. [Workflow after attempt 2](workflow-shot-after-2026-10-18-attempt2.json): PASS,
   unchanged source and driver; distinct public run label, no relaxed OCR checks.
6. [Focused Settings after attempt 1](screenshot-ocr-after-2026-10-18-attempt1.json):
   9/9 correct with the SAME focused driver hash. All seven new stages exercised.
7. [Fresh loaded Pi CLI check](screenshot-ocr-loaded-2026-10-18.json): PASS.
8. [Offline validated pair](screenshot-ocr-comparison-2026-10-18.json): PASS.

## Measured workflow result — raw, not normalized

| Metric | Chronological before | Passing after attempt 2 |
| --- | ---: | ---: |
| Wall elapsed ms | 286223.78 | 309218.63 |
| Successful / failed operation records | 300 / 0 | 306 / 0 |
| Hierarchy captures | 72 | 74 |
| Direct hierarchy observations | 42 | 44 |
| Field selections | 30 | 30 |
| Exact numeric writes checked | 30/30 | 30/30 |
| Exact persisted readbacks checked | 30/30 | 30/30 |
| Alignment cycles | 0 | 2 |
| Complete alignment-cycle elapsed ms | 0 | 7044.88 |
| High-level capture spans | 360 | 370 |
| Scoped successful command-attempt spans | 276 | 282 |
| Explicit OCR calls | 1 | 1 |
| Capture errors / truncation | 0 / false | 0 / false |

Across ALL full attempts: **3 attempts, 2 passed / 1 failed**, 843698.15ms
reported elapsed (before 286223.78ms; after attempts total 557474.37ms).
The failed workflow is an assertion failure after 267 successful operation
records, not an ADB-command error; failed-operation counts must not conceal it.

Passing after is **22994.85ms / 8.03% slower**. Two extra unchanged alignment cycles
account for 7044.88ms, not the whole difference. Remaining variation is not
attributed to instrumentation, UIAutomator internals, OCR, host or network without
isolating evidence. **No demonstrated speedup, isolated instrumentation-overhead
estimate, non-inferiority or population claim.** The regression is retained, not
normalized away. The failed after attempt above remains part of all-attempt evidence.

Shopping observations match: exact query/focus/readback, three sampled comparable
offers and visible chosen product `/dp/` navigation. Public sample: unsweetened
and Original €19.99 / €2.50 per litre, Barista €18.94 / €2.37 per litre. No broader
market/stock/detail-price/exercise-name assertion or Versa Gripps coverage added.

The frozen workflow supplies its sink ONLY to hierarchy and field-selection
paths. Command counts are `captures * 3 + 30 * 2`, NOT whole-workflow counts.
It supplies NO sink to its explicit OCR call: no screenshot/OCR internal spans
are inferred from that report. No independent screenshot count, global span
clock, capture IDs or traceComplete flag exists in that driver. Both reports
have captureSpansTruncated:false; stage cardinalities/outcomes were audited.

## Focused equivalent read-only fixture pair

Settings → Termux app info, exact native title and OPEN fixture guard. The new
`scripts/screenshot-ocr-check.mjs` was frozen BEFORE implementation and runs
screenshot-with-base64, quick-base64 and current-screen OCR sequentially, three
rounds each. PNG signature/dimensions or exact OCR word `Termux` must pass.
First samples retained. No concurrent builds/tests/phone actions during runs.

| API median ms | Before | After | Delta |
| --- | ---: | ---: | ---: |
| takeScreenshot(includeBase64:true) | 466.87 | 461.07 | −1.24% |
| screenshotBase64 | 363.30 | 390.28 | **+7.43%** |
| runOcrOnCurrentScreen | 1097.79 | 1090.34 | −0.68% |

9/9 correct each; 24 prior command spans → 63 total spans after (24 command
attempts + 39 new internal spans). **Nine** screencap/pull pairs are executed by the audited sequential driver:
three screenshot + three quick-base64 + three OCR. This is driver/production-path
accounting, NOT an independently counted device subprocess trace. Dimensions
run six times; base64 reads six times; availability/engine/parse three times each.
No raw images/OCR text/paths/serials exported. The availability check probes once
and then uses its existing cached true state; spans include cached checks too.
There is no availability-cache-hit flag, and stage duration is not used to infer it.

The +7.43% quick-base64 regression is disclosed. Three sequential samples and one
before/after pair do not isolate overhead from transport/host variation or prove
non-inferiority. Timing was checked, not proved free. Source fixture spans have
one clock per API call; traceComplete reflects a completed synchronous local
sink, not capture-worker IPC or tool-hook completeness. All are complete and
nontruncated here. Nested stages MUST NOT be summed as wall elapsed.

## Implemented contract and limits

Public source APIs accept opt-in `onCaptureSpan` and share `captureClock`:

- `screenshot_capture`: existing device screencap command await.
- `screenshot_transfer`: existing pull await.
- `screenshot_dimensions`: existing wm-size command and same parsing behavior
  (including zero dimensions for unparseable output).
- `screenshot_read`: local file read AND base64 conversion, only when requested
  or in quick-base64. OCR's default screenshot does not request base64.
- `ocr_availability`: existing cached availability check or version probe. False,
  including cached false, emits error/unknown, not successful availability. The
  public boolean API remains nonthrowing. No probe-cache-hit field added.
- `ocr_engine`: Tesseract execFile await, same timeout/maxBuffer/backend.
- `ocr_parse`: existing local TSV parsing/filtering.

One context covers screenshot commands, dimensions/read, availability, engine and
parse; native `ocr_fallback` passes its context through these descendants.
`runOcrOnImage` supports the sink directly without capturing an image. Callbacks
cannot change results; options are copied rather than mutated; diagnostics stay
default-off. Fixed fields only, no paths/arguments/content/raw errors. ADB errors
retain explicit categories; Tesseract uses its OWN existing Node timeout, so
non-ADB engine/probe failures remain `unknown`, including controlled engine
timeout. No timeout is invented from duration or killed/signal hints.

No retry/backend/timeout defaults changed. Directory setup, cleanup, result
assembly and callbacks are not separately timed. No annotation shared sibling
clock, active-stage events, sibling cancellation, device-side cancellation,
concurrent fixed-remote-PNG safety or automatic runtime companion ingestion added.
No live failures/reconnect/native OCR fallback/cache-false forced. Controlled
process-boundary coverage handles those exercised failures; parse exceptions
were not fabricated (normal parser accepts malformed/low-confidence rows).

The capture IPC parent and companion OFFLINE importer accept all seven stages
without changing bounds, sanitization or flags. The capture CLI itself still
disables OCR; a synthetic adversarial worker regression verifies completed new
events survive parent deadline with traceComplete:false. This is not a live OCR
hard-kill experiment. Offline importer tests retain unknown failures and partial
clocks. No runtime tool/source clocks are merged.

## Actual freshly loaded registered tools

A separate real **fresh nonpersistent Pi JSON CLI session** loaded ONLY explicit
`./dist/index.js` (`--no-extensions -e ./dist/index.js --no-mcp`). It used the
configured model, no tool mocks, and a three-tool allowlist. No stale active
session claim or source-registered harness substitution. Sequential actual tools:

- android_ui_dump(all_elements:true, ocr_fallback:false): exact native Termux
  title and OPEN control, **2643ms** execute time.
- android_screenshot(include_base64:false): **1080×2340**, **439ms**.
- android_ocr() current screen: exact OCR word Termux, **1259ms**.

All isError:false, no JSON error payload, three matching start/end events and
agent_settled(aborted:false). Pre-execution dist hashes match files afterward;
see the metadata-only loaded report. Registered tools use default-disabled source
diagnostics; no internal spans inferred. These tool execute clocks are NOT merged
with source clocks or model latency. Raw JSONL stays private in temporary storage,
not committed. The parent interactive session was not reloaded by this check.

## Safety and retained TEST drafts

Three new TEST drafts retained (14 including the previous 11):
- `E2E Lower v2 source-shot-before91`
- `E2E Lower v2 source-shot-after91` (failed reopen assertion)
- `E2E Lower v2 source-shot-post88`

Each received 15 unchecked sets at 20kg × 8, with all 30 immediate numeric values
verified. Persistence verified only for the passing pair, NOT the failed attempt.
No real workout finished or set checked; existing training untouched. Amazon
read-only, no cart/checkout/account changes. No APK/helper/permission/debugging
exposure added. Original Gboard and Termux independently verified AFTER each full
attempt, each focused fixture and loaded CLI check. Authorized device rediscovered
at start; normal Forge navigation and exclusive use verified.

## Validation and reproducibility

- Red → green: public screenshot spans, OCR spans, partial new-stage IPC
  acceptance, companion vocabulary. Initial synthetic screenshot fixture rejected
  `shell wm size` because it expected `wm size`; fixed test fixture before the
  meaningful missing-span red. No production policy weakened.
- pi-droid: **682/682 units, 52 files**, `--maxWorkers=2`; lint/build PASS.
- Isolated sequential extension-load/sandbox-install: **9/9**, existing 20s test /
  30s hook allowances; default parallel CI NOT claimed fixed.
- Companion: **37/37**, build/check PASS. First stage-parity run was 36/37,
  expected rejection before allowlist extension; then green.
- New public process suite: 16 tests (screenshot success and capture/transfer/
  dimensions/read failures; image-only/cached availability; engine failure/timeout;
  default-off/throwing sink; native fallback and command/shared-clock nesting).
- `scripts/validate-screenshot-ocr-pair.mjs` validates both complete check sets,
  offers, outcomes, finite/fixed spans, captures/attempts, complete recognized
  alignment triples, unchanged driver/consumer and focused stage sequences.
  Passing before/after nine-file engine hashes independently recomputed against
  `git show 22af80b` and current src. The comparator intentionally permits changed
  engine hashes but not changed driver/consumer. Historical migration comparator
  and evidence remain byte-identical.

To reproduce the offline audit from repo root (output must be NEW):

```sh
node scripts/validate-screenshot-ocr-pair.mjs \
  docs/performance/reports/workflow-shot-before-2026-10-18-attempt1.json \
  docs/performance/reports/workflow-shot-after-2026-10-18-attempt2.json \
  docs/performance/reports/screenshot-ocr-before-2026-10-18-attempt1.json \
  docs/performance/reports/screenshot-ocr-after-2026-10-18-attempt1.json \
  /private/NEW-comparison.json
```

Next: annotation as a SEPARATE slice, preceded by a fresh equivalent baseline,
then mandatory full workflow and loaded checks. Automatic runtime ingestion is
another separate slice. Performance regressions above remain unexplained, not
silently declared fixed. Default CI and production automatic input lifecycle open.
