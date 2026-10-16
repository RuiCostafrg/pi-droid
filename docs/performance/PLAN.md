# Android automation performance: implementation tracker

## Resume here

**Current priority: Step 2 — opt-in internal capture timing spans.**
Step 1's offline feedback loop and opt-in live runner are implemented and
validated. A read-only live static-label baseline is now recorded: 20/20 correct
captures on Settings → Termux app info. No paired optimization comparison or
live editable-field validation exists yet; Step 1 is NOT fully complete.
See [runner documentation](CAPTURE-BENCHMARK.md) and
[live evidence](reports/settings-capture-baseline-2026-10-16.md).

Recovery on 2026-10-16: the previous session stopped after launching validation
without saving its result or updating this tracker. Revalidation passed 554 tests,
type checking, build, script syntax and diff whitespace checks. That recovery
preserved the existing edits; all performance work is now committed locally in
both repositories (see commit checkpoint below).

Step 2's high-level timing and partial-span streaming slices are implemented at
the public `dumpUiTree`/benchmark CLI seams, tested with synthetic ADB at the
process boundary. Latest validation: **561 pi-droid unit tests, 16 companion tests,
and 9 isolated sequential integration tests pass**. Default parallel CI still
hits the documented short integration time limits; it is NOT marked passing.

Partial-span streaming is implemented and regression-tested under deadline and
SIGTERM (including interruption before any stage completes). Parent retention is
allowlisted and bounded, with explicit trace completeness/truncation flags.

**Next exact action:** preserve explicit execution timeout/cancellation/error
metadata through ADB/capture wrappers, starting at the existing process-boundary
seam. Do not infer timeout from duration. Then add finer command-attempt,
screenshot/OCR/reconnect spans and companion-profiler ingestion.

Live result: capture median 2.557s, p95 2.602s, max 2.610s; device-dump spans
accounted for ~94.3% of cumulative capture time. This is one fixture baseline,
not a speedup or a diagnosis of UIAutomator internals. No new installs or
persistent phone changes; Termux foreground restored and verified.

## Completion snapshot

- [x] Prior active-IME safety guard and failure-aware profiler summaries.
- [x] Deterministic capture correctness/deadline/cleanup feedback loop.
- [x] Opt-in high-level timing spans and bounded partial-span streaming.
- [x] Content-free 20-round live static-label baseline and evidence report.
- [x] Unit/build/type validation plus isolated integration verification.
- [x] Review and local commits for all code, tests, documentation and evidence.
- [ ] Full Step 2 instrumentation, explicit failure metadata and profiler ingestion.
- [ ] Active-session tool reload verification and live editable-field/input checks.
- [ ] Default CI scheduling/time-limit reliability on this Termux host.
- [ ] Controlled optimization and paired before/after measurement.

Read this file first, then [the original handoff](handoff-2026-10-16.md).
Companion repository: `~/projects/pi-android-perf`.
Update this tracker after each slice with files, commands, results, limitations,
and the next exact action. A checked box means its stated criterion is met,
not that the entire performance problem is solved.

## Verified starting state (2026-10-16)

- [x] Read the handoff and inspect both repositories' working-tree diffs.
- [x] Preserve original handoff in this directory (temporary original may vanish).
- [x] Read completed-run evidence and relevant implementation/API boundaries.
- [x] Verify phone foreground is `com.termux` before coding/reporting.
- [x] Re-run existing validation (results below).
- [x] Confirm prior local changes exist and preserve them (initially uncommitted).
  The user subsequently authorized review/local commits; these are complete
  and recorded below. Do not push without a separate request.

Historical starting HEADs: pi-droid `e09bba3`, pi-android-perf `c950e08`.
The local commits recorded below supersede these initial checkpoints.

### Already implemented before this continuation

- [x] Profiler counts all attempts and failed elapsed time, and ranks by
  `wallTotalMs`: companion `src/metrics.ts`, `src/trace.ts`,
  `tests/core.test.mjs`, `README.md`.
- [x] Input rejects inactive ADBKeyboard before clear/send:
  `src/adb/input.ts`, `tests/adb/input.test.ts`, `README.md`.
- [ ] Input lifecycle verified end to end (focus → replacement → readback →
  original IME restoration). The guard alone does not provide this.
- [ ] Running Pi tools reloaded and verified against changed source.

### Evidence, not causal conclusions

`~/projects/pi-android-perf/reports/amazon-de-completed-run.json` records
16 UI dumps totaling ~99.1 seconds, median ~3.28 seconds, max ~16.26 seconds.
The native three-round dump median was ~2.98 seconds. Three samples are not a
population tail estimate. The first failed workflow also lost time in failed
screenshots; do not attribute that to the same cause without internal spans.
The native local scan is NOT the full pi-droid parser. Screenshot streaming
is NOT the same implementation as pi-droid capture/pull.

## Ordered implementation steps

### 1. P0 — Build a bounded, red-capable feedback loop

- [x] Audit existing coverage: companion native benchmark checks XML/PNG and
  has budgets, but does not assert target field/text through pi-droid's real
  capture/parser path. `tests/adb/ui-tree.test.ts` duplicates parser logic;
  its parsing assertions do not exercise the production parser.
- [x] Confirm capture-only seams and provisional budgets (user approved in the
  previous session after scope proposal).
- [x] Add deterministic `tests/fixtures/capture.xml` with known text, field
  value, resource ID, bounds and non-interactive information.
- [x] Exercise public `dumpUiTree({ skipCache: true, ... })` with synthetic
  ADB transport at the process boundary, not a duplicated XML parser. Catch
  missing/wrong text, wrong bounds and silent fallback/empty success.
- [x] Demonstrate a deliberately wrong expected field value produces red;
  retain a regression at the same public seam.
- [x] Provide opt-in `scripts/capture-benchmark.mjs` and `capture-worker.mjs`.
  Verify expected field/text, source, foreground and dump success marker;
  disable OCR/reconnect for hierarchy-only capture and omit private content.
- [x] Bound observations and total run; terminate local worker/ADB groups on
  deadline/interruption, classify timeout/cancel, and stop after timeout.
  This does NOT prove device-side UIAutomator termination. Generic incorrect
  captures are retained; later rounds can still run within the budget.
- [x] Implement repeated fresh capture reporting: retain first sample/failures,
  successful capture and harness latency distributions, failed elapsed time,
  and all-attempt totals. Local scratch cleanup is regression-tested.
- [x] Use an authorized stable non-sensitive fixture: Settings → Termux app info,
  unique non-interactive app-title and OPEN-button labels. No app/helper install,
  permission grant or button activation. Display page was rejected because of
  repeated resource IDs. Static labels do not prove editable-field capture.
- [x] Run repeated live static-label captures and retain a content-free baseline:
  20/20 correct, no timeout, all capture targets met. See linked evidence above.
- [ ] Validate live known editable-field values separately, without conflating
  static labels or empty switch text with verified text input.
- [ ] Run paired before/after on the same fixture after one controlled change.

**Approved Step 1 seams (also used for the next timing slice):**

1. Public `dumpUiTree` at a fake ADB process boundary: catches production
   capture/pull/parser/selector correctness and fallback behavior; cannot prove
   device UIAutomator behavior or wireless stability.
2. Opt-in live runner CLI/report: catches expected field/text and capture-budget
   failures on a fixed device fixture; cannot measure model latency or generalize
   to every app. No keyboard writes in the first capture-only slice.

**Provisional budgets (not measured requirements):** 5 seconds desired per fresh
capture, 10 seconds hard observation deadline, 120 seconds total run budget,
20 requested samples (report actual completed count if budget exhausts).
Correctness must pass for every completed capture; budget exhaustion must not
be called a passing baseline. These limits are intentionally capable of rejecting
the previously observed 10–16 second captures. Confirm/adjust before using them
as acceptance criteria. First deterministic slice should run in seconds offline.

### 2. P0 — Instrument real pi-droid stages

- [x] Inspect `exec.ts`, `ui-tree.ts` and `cache.ts` for the first timing slice.
- [ ] Finish the instrumentation-boundary audit of `screenshot.ts`, `ocr.ts`,
  `reconnect.ts` and `annotate.ts` before instrumenting those internal paths.
- [x] Add opt-in high-level `dumpUiTree` spans: device dump, XML transfer,
  local read, parsing/filtering, foreground, cache lookup/hit and whole OCR call.
  `src/adb/capture-timing.ts` supplies fixed fields/stages and per-call monotonic
  clocks. `dumpUiTree({ onCaptureSpan })` is off by default; callback exceptions
  are ignored. CLI config `trace: true` exports spans only when opted in.
- [x] Test normal/default-disabled traces, a controlled dump delay, failed dump
  success marker/pull, cache miss/hit and throwing consumers through real source
  APIs with fake ADB at the process boundary. Assert private values stay absent.
- [ ] Exercise the OCR span with a controlled OCR success/failure boundary;
  existing OCR behavior tests pass but do not assert span semantics.
- [ ] Add finer command-attempt, screenshot capture/transfer, OCR-engine,
  annotation and reconnect spans (not provided by this first capture slice).
- [ ] Preserve explicit timeout/cancellation/error metadata through wrappers.
- [x] Verify first-slice capture spans contain only fixed fields/stages,
  relative timings, ok/error and optional cache-hit boolean; tests assert no
  page text, paths, serial, package or raw errors. Tracing is absent by default.
- [ ] Extend privacy/default-behavior coverage to all future instrumented paths.
- [x] Stream completed span events before final worker result. Parent retains
  up to 128 allowlisted events, with `traceComplete`/`spansTruncated` flags.
  Timeout and SIGTERM regressions preserve earlier stages without fabricating
  success for the interrupted stage. Already queued IPC events may still be
  lost on hard kill; active-stage start events are not implemented.
- [x] Verify local worker/ADB process-group cleanup under timeout and SIGTERM
  in the development harness, including the synthetic orphan-work regression.
- [ ] Verify whole-observation cancellation in production tools, including
  parallel/sibling work. Harness process-group cleanup is not this guarantee.
- [x] Capture a controlled source-level live baseline with high-level spans.
- [ ] Connect internal spans to the companion profiler; native/tool-level
  summaries do not yet ingest these source-level events.
- [ ] Add direct regression coverage for the parent IPC allowlist, malformed
  events, retention cap and truncation flags. Normal privacy/completeness tests
  pass, but do not exercise the malformed/overflow branches.
- [ ] Decide whether active-stage start events are needed to identify work
  interrupted before completion. Current traces retain completed stages only;
  do not fabricate a completed stage or infer its cause from missing evidence.

Depends on Step 1's feedback loop. Do not assign the variable dump latency to
cache/OCR/reconnect until spans distinguish them.

### 3. P1 — Reduce unnecessary observation work and round trips

- [ ] Add text-only observation with no screenshot capture.
- [ ] Add information-reading output including non-interactive text.
- [ ] Add focused output and bounded action/wait/observe batches, with explicit
  verification checkpoints and cancellation.
- [ ] Compare correctness and latency against the Step 1 baseline.

Do not raise cache TTL blindly or reuse stale coordinates.

### 4. P2 — Compare perception backends behind one seam

- [ ] Establish baseline CLI UIAutomator behavior and backend contract.
- [ ] Check feasibility of persistent UIAutomator/Accessibility and Brave CDP
  using primary sources and actual device support.
- [ ] Obtain approval before APKs, permissions, helpers or debugging exposure.
- [ ] Compare setup, correctness, median/tail, failure/fallback and maintenance.

Browser DOM support does not replace native-app support. No alternative is
currently proved better or ruled out.

### 5. P1 — Make input a verified lifecycle

- [x] Fail before mutation when ADBKeyboard is inactive (prior change).
- [ ] Reconcile preflight's component recognition with the input guard.
- [ ] Review clear/replacement behavior and broadcast exposure.
- [ ] Verify focus, replacement and accessible value, not just broadcast exit.
- [ ] Capture and restore original IME in failure paths as well as success.
- [ ] Compare supported ADBKeyboard, `input text`, Accessibility and DOM paths
  only after approvals required by Step 4.

Sequencing follows the handoff: capture evidence before broadening input
backends. A reproduced input safety issue may justify an isolated earlier fix.

### 6. P3 — Optimize transport/language only from evidence

- [ ] Compare fewer shell calls/persistent helpers if measured spans justify it.
- [ ] Compare USB/Wi-Fi only with a controlled authorized setup.
- [ ] Consider Rust as a candidate helper backend, not a presumed solution.

## Validation log

2026-10-16 continuation (existing code, before new implementation):

| Repository | Command | Result |
| --- | --- | --- |
| pi-droid | `npm run test:unit` | PASS: 543 tests, 40 files |
| pi-droid | `npm run lint` | PASS |
| pi-droid | `npm run build` | PASS |
| pi-android-perf | `npm test` | PASS: 16 tests (includes build) |
| pi-android-perf | `npm run check` | PASS |

2026-10-16 recovery/revalidation (implemented Step 1, before timing spans):

| Repository | Command | Result |
| --- | --- | --- |
| pi-droid | `npm run test:unit` | PASS: 554 tests, 41 files; 11 capture tests |
| pi-droid | `npm run lint` / `npm run build` | PASS |
| pi-droid | `node --check scripts/capture-{benchmark,worker}.mjs` (each script) | PASS |
| pi-droid | `git diff --check` | PASS |

Prior session recorded red → green for correctness, unwanted OCR, timeout stop,
SIGTERM cleanup and zero-exit stale XML rejection. Recovery validation log:
`$TMPDIR/pi-droid-recovery-validation.log` (temporary, may disappear).

At this recovery checkpoint no new live capture/input experiment had been run;
the subsequent static-label baseline is recorded below. Test passes are not
proof of corrected device latency, reliable text insertion or wireless stability.
The active user's running extension still has not been verified against the
rebuilt source.

2026-10-16 first timing-span slice:

| Repository | Command | Result |
| --- | --- | --- |
| pi-droid | `npm run test:unit` | PASS: 559 tests, 41 files; 16 capture tests |
| pi-droid | `npm run lint` / `npm run build` | PASS |
| pi-droid | syntax checks for both capture scripts / `git diff --check` | PASS |
| pi-android-perf | `npm test` / `npm run check` | PASS: 16 tests, build and type check |

Red → green: `npm run test:capture -- -t 'opt-in content-free'` first failed
because spans were absent, then passed after capture instrumentation/CLI wiring.
A controlled synthetic 150ms dump delay is attributed to `device_dump`; this is
not device performance evidence. Validation output is temporarily retained at
`$TMPDIR/pi-droid-timing-validation.log`. No live capture, keyboard writes,
new APK/helper/permissions, commits or backend changes were performed.

Changed in this slice: `src/adb/capture-timing.ts`, `src/adb/ui-tree.ts`, both
capture scripts, `tests/adb/capture-benchmark.test.ts`, this tracker and
`CAPTURE-BENCHMARK.md`. Stage sums exclude setup/cleanup and result assembly;
command retry/reconnect time is not separately attributed. At that point, full
Step 2, live baseline and any demonstrated latency improvement remained incomplete. The next continuation below supersedes the baseline status.

2026-10-16 streaming + live continuation:

- Red → green: `npm run test:capture -- -t 'preserves completed'` initially
  failed because timed-out captures had no spans; now completed events survive.
- `npm run test:unit`: PASS **561 tests, 41 files; 18 capture tests**.
- Type check, build, both script syntax checks and diff whitespace: PASS.
- Companion `npm test` / `npm run check`: PASS **16 tests**, build/type check.
- Full validation log: `$TMPDIR/pi-droid-stream-validation.log` (temporary).
- Live runner exit 0: **20/20 correct**, no failures/timeouts, 63.77s total;
  capture median 2.557s / p95 2.602s / max 2.610s. All traces complete.
- Reports: `reports/settings-capture-baseline-2026-10-16.{json,md}`. Private
  expectations removed. Source-level capture only; no loaded-tool reload proof,
  input/screenshot benchmark, comparison or demonstrated speedup.
- Phone returned to Termux and independently verified. Gboard stayed active;
  no APK, helper, permission grant or persistent setting change was made.
- Additional default `npm run test:ci` run: NOT PASSING on this Termux host.
  567 tests passed, but extension-load hit its 5s test limit and sandbox-install
  setup hit its 10s hook limit; 2 sandbox tests were skipped by that failed hook.
  Do not hide this as a green default CI result. Log:
  `$TMPDIR/pi-droid-stream-ci.log` (temporary).
- Isolated, sequential integration rerun: PASS **9/9** without changing tests:
  `npx vitest run tests/integration/extension-load.test.ts tests/integration/sandbox-install.test.ts --no-file-parallelism --testTimeout=20000 --hookTimeout=30000`.
  This verifies harness extension loading and npm-pack/sandbox installation, not
  the active user's Pi session reload. No phone APK was installed. Log:
  `$TMPDIR/pi-droid-stream-integration.log` (temporary).
- [ ] Resolve/default-document integration scheduling/time allowances for slow
  Termux hosts; isolated success is not proof the parallel default CI is fixed.

### Local commit checkpoint

User requested finishing the outstanding work and next priority. Reviewed local
changes in both repositories and validated before committing; no pushes made.

- Companion profiler: `d7d1193` — `Count failed work in performance bottleneck summaries`.
- pi-droid: `3055003` — `Add bounded capture benchmark with streaming stage timings`.
  Includes the earlier active-IME guard, benchmark/fixtures, fixed-field tracing,
  streamed partial evidence, progress documents and sanitized live report.
- Both working trees were verified clean after these commits. This subsequent
  plan-only reconciliation records their hashes and separates completed work
  from remaining acceptance criteria; no new code or live test was run for it.

Remaining: explicit ADB timeout/cancellation/error metadata; finer instrumentation
and profiler ingestion; OCR span coverage; active-session reload verification;
live input lifecycle; controlled optimization comparison; default CI time limits.
No faster-backend choice or demonstrated device latency improvement is claimed.

## Operating boundaries

Return to Termux and verify foreground whenever device interaction pauses.
Restore original IME after any bounded input block, including failures. Discover
current authorized device afresh; never save its serial/IP in reports. Amazon.de
shopping remains read-only (Versa Gripps and almond milk): no cart, checkout or
account changes. No new APK, permission, persistent helper or browser debugging
without explaining the tradeoff and obtaining approval.
