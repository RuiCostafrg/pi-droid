# Android automation performance: implementation tracker

## Resume here

**Next speed priority: reduce redundant fresh observations without weakening correctness.**
First audit caller/tool capture duplication against the recorded workflow, then
save a current-source baseline BEFORE any optimization. Choose a narrow text-only
or observation-reuse path only where it actually removes capture work; the
existing text dump is already screenshot-free. Fresh observation before
coordinate-based actions remains mandatory. Keep the frozen v1 harness and
historical reports intact; compare correctness, dump/screenshot counts and wall
time on equivalent execution paths. No such optimization is implemented yet.
Finer Step 2 spans and profiler ingestion remain unfinished follow-up work.
Step 1's offline feedback loop and opt-in live runner are implemented and
validated. A read-only live static-label baseline is now recorded: 20/20 correct
captures on Settings → Termux app info. A separate Amazon.de → Forge workflow
now has a saved pre-implementation tool baseline and passing original/changed
source pair, including editable-field persistence checks with an explicit clear
workaround. A follow-up now fixes default whole-field clearing and Unicode XML
readback, with **4/4 focused live cases passing without a replacement workaround**.
See [input fix evidence](reports/input-replacement-fix-2026-10-16.md). No controlled
full-workflow latency optimization exists; Step 1 is NOT fully complete.
See [workflow protocol](WORKFLOW-E2E.md), [evidence](reports/workflow-evidence-2026-10-16.md)
and [comparison](reports/workflow-comparison-2026-10-16.md).
See [runner documentation](CAPTURE-BENCHMARK.md) and
[live evidence](reports/settings-capture-baseline-2026-10-16.md).

Recovery on 2026-10-16: the previous session stopped after launching validation
without saving its result or updating this tracker. Revalidation passed 554 tests,
type checking, build, script syntax and diff whitespace checks. That recovery
preserved the existing edits; prior performance work was committed locally in
both repositories (see commit checkpoint below). The later execution-metadata,
workflow harness/evidence and input fixes are included in the current publication
checkpoint; do not conflate them with the earlier historical commits.

Step 2's high-level timing and partial-span streaming slices are implemented at
the public `dumpUiTree`/benchmark CLI seams, tested with synthetic ADB at the
process boundary. Latest input-fix validation: **599 pi-droid unit tests and
9 isolated sequential integration tests pass**; the preceding metadata slice
also passed **16 companion tests**, rerun successfully with build/type checking
for the publication checkpoint. Default parallel CI still
hits the documented short integration time limits; it is NOT marked passing.

Partial-span streaming is implemented and regression-tested under deadline and
SIGTERM (including interruption before any stage completes). Parent retention is
allowlisted and bounded, with explicit trace completeness/truncation flags.

**Next exact action:** inspect observation/caller paths and count avoidable fresh
dumps/screenshots, preserving safety-critical observations. Save the next current
baseline before implementation, then regression-test one scoped optimization.
Finer command-attempt/screenshot/OCR/reconnect spans and profiler ingestion remain
open; add them where required to attribute the change. Explicit execution metadata
is implemented/tested (see validation below); do not infer timeout from duration. The workflow-reproduced input clear
bug is now fixed and source-level live regression-tested; production automatic
focus/value verification, broadcast exposure and active-session reload remain open.

Workflow source pair: **361.679s before / 362.485s after (+0.22%)**, same harness
hash and 364 operations each, all numeric write/persistence checks pass. This
is diagnostic validation, NOT a speedup. The original chronological tool baseline
was saved before source edits; the additional original-revision source reference
was run afterward from an isolated git extraction. Failed harness attempts are
preserved. Six explicitly test-created Forge drafts remain; no real workout was
marked finished. Gboard and Termux restored/verified after every run.

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
- [x] Review and local commits for the earlier capture/timing slice (hashes below).
- [x] Explicit execution failure metadata and privacy/IPC regression coverage.
- [x] User-requested Amazon.de → Forge E2E, immutable baseline and source-pair comparison.
- [x] Review the metadata/workflow/input changes and prepare all code, tests and
  sanitized evidence for the user-requested commit/push checkpoint below.
- [ ] Full Step 2 instrumentation and companion-profiler ingestion.
- [x] Fix default whole-field ADBKeyboard replacement and numeric Unicode XML
  readback; 4/4 focused source live cases pass without a replacement workaround.
- [ ] Active-session tool reload and production automatic focus/readback/IME
  lifecycle verification (focused source harness is not a production guarantee).
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
  and recorded below. The later explicit commit/push request supersedes the
  earlier local-only restriction; publish only to each repository's origin fork.

Historical starting HEADs: pi-droid `e09bba3`, pi-android-perf `c950e08`.
The local commits recorded below supersede these initial checkpoints.

### Already implemented before this continuation

- [x] Profiler counts all attempts and failed elapsed time, and ranks by
  `wallTotalMs`: companion `src/metrics.ts`, `src/trace.ts`,
  `tests/core.test.mjs`, `README.md`.
- [x] Input rejects inactive ADBKeyboard before clear/send:
  `src/adb/input.ts`, `tests/adb/input.test.ts`, `README.md`.
- [x] Focus → default replacement → exact readback → original IME restoration
  verified in the dedicated source-level Forge fixture, on failure and success.
- [ ] Make that verified lifecycle automatic in production tools and verify reload.
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
- [x] Validate live known editable-field values separately: Forge source workflow
  wrote/reopened/read back all 30 exact numeric fields. Explicit ADB_CLEAR_TEXT
  workaround required; does not verify/fix the default clear_first lifecycle.
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
- [x] Preserve explicit timeout/cancellation/error metadata through ADB/capture
  spans and benchmark IPC. Command AbortSignal supported; whole-observation and
  sibling cancellation, reconnect cancellation and default tool signal forwarding
  remain outside this slice.
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
- [x] Add direct regression coverage for parent IPC allowlisting, malformed
  events, fixed failure categories, retention cap and truncation flags:
  tests/adb/capture-ipc.test.ts exercises the real CLI with adversarial worker IPC.
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
- [x] Fix whole-field clearing using the active IME, not unreliable keyevent
  selection. Non-IME fallback replacement now fails before mutation; insertion
  remains supported. Dedicated live prefix/numeric-string/emoji/empty cases pass.
- [ ] Review implicit broadcast exposure for sensitive input.
- [x] Verify focus/replacement/exact accessible value in the dedicated source
  fixture; production tools still require caller focus and readback.
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

Remaining at that historical checkpoint: explicit ADB metadata (now implemented
in the continuation below); finer instrumentation/profiler ingestion, OCR span
coverage, active-session reload, default input lifecycle, controlled optimization
and default CI scheduling/time limits remain open.
No faster-backend choice or demonstrated device latency improvement is claimed.

### Execution metadata + requested workflow E2E continuation

See [workflow evidence](reports/workflow-evidence-2026-10-16.md) for chronology,
all failed attempts, preserved baselines, source/harness hashes, validation and
retained app artifacts. Core files: `src/adb/exec.ts`, `capture-timing.ts`,
`index.ts`, both capture scripts; new `execution-boundary.test.ts` and
`capture-ipc.test.ts`, plus existing capture/exec tests. Executable opt-in live
runner: `scripts/workflow-e2e.mjs`; offline comparison:
`scripts/compare-workflow.mjs`. No commit/push made in this continuation.

- Red → green at the real fake-ADB subprocess boundary for explicit timeout.
- Full unit suite: **586/586**; type check/build/script syntax/diff: PASS.
- Sequential isolated integration: **9/9** with documented time allowances.
- Companion tests/check: **16/16**, no source changes.
- Original tool baseline saved BEFORE implementation: 512.882s / 253 calls,
  strict clear-first correctness failure with successful explicit workaround.
- Identical-harness original/changed source smoke pair: both PASS, 361.679s /
  362.485s; no speedup or population-tail claim. No stale-session after claim.
- Both passing runs created/reopened a NEW Lower draft with 15 unchecked sets,
  each 20kg × 8 reps. No purchases or changes to existing training records.
- User authorized Tesseract host install; no APK/debug exposure/permissions added.
- Current phone foreground and original Gboard independently verified restored.

### Whole-field input replacement continuation

User selected the remaining clear-first issue. See
[input replacement evidence](reports/input-replacement-fix-2026-10-16.md) and its
three preserved JSON reports (before, intermediate Unicode readback failure,
final success). Before: 0/4 exact live cases; final: **4/4**. Same existing test
draft title reused and restored; no new drafts or workout numeric changes.

- Root cause: sequential Shift/End keyevents are not a held chord; Delete removed
  one character. ADBKeyboard clear now uses its InputConnection operation.
- A separate raw-XML probe confirmed correct emoji insertion but undecoded
  `&#129371;` readback. Parser now decodes valid decimal/hex XML references once.
- New 9 input process-boundary tests and 4 capture/parser regressions, red → green.
- **599 unit tests / 47 files, 9 isolated sequential integrations**, lint/build,
  script syntax and whitespace PASS. Companion not rerun; no companion changes.
- Small input-call median 536.56ms → 267.96ms, 5 → 3 ADB calls. Not a full-workflow
  speedup, and before samples were incorrect. Frozen workflow comparison unchanged.
- Gboard, fixture title and Termux restored/independently verified on every run.
- Built code exists; current active-session tool reload remains unverified.
- At completion of this input experiment there were no new commits/pushes.
  The subsequent publication checkpoint below includes this work and preserves
  the earlier metadata/workflow changes.

### Publication checkpoint

The user explicitly requested committing ALL accumulated changes, pushing and
updating Markdown. Both origin forks were fetched; each local main is ahead
with no remote-only commits. This checkpoint includes the metadata/capture IPC,
workflow runners and all preserved success/failure reports, default replacement
and XML fixes, regression tests and progress/changelog updates. No historical
JSON evidence was rewritten. Publication results/hashes are recorded here after
push verification; do not infer a successful push from commit preparation.

Validation retained: pi-droid 599 unit tests and 9 isolated integrations;
companion 16 tests plus build/type check rerun for publication. Default parallel
CI and the running user-session extension reload remain unverified. Next work
is the observation audit/current-source baseline above, not an implemented
full-workflow speedup. Original Gboard/Termux were restored after the last live
run; this publication task does not interact with the phone.

## Operating boundaries

Return to Termux and verify foreground whenever device interaction pauses.
Restore original IME after any bounded input block, including failures. Discover
current authorized device afresh; never save its serial/IP in reports. Amazon.de
shopping remains read-only (Versa Gripps and almond milk): no cart, checkout or
account changes. No new APK, permission, persistent helper or browser debugging
without explaining the tradeoff and obtaining approval.
