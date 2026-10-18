# Android automation performance: implementation tracker

## Mandatory real-phone acceptance gate

User requirement: **every performance implementation slice must run the existing
Amazon.de → Forge real-phone E2E**, not just unit tests, synthetic ADB,
host-side integrations or the Settings fixture. Documentation-only updates do
not require another phone run. A slice is not fully validated until this gate
passes; if blocked or skipped, record that explicitly and leave acceptance open.

- Use the active versioned [workflow v3.2 protocol](WORKFLOW-V3.md), retaining
  [v2](WORKFLOW-V2.md) as immutable historical evidence, and preserve
  frozen drivers, archived adapters and historical success/failure evidence.
  Capture a current equivalent baseline BEFORE each implementation change, then
  run the changed path with the same driver, correctness checks and comparable
  fixture/transport. Do not use an old historical run as a controlled new baseline.
- Verify shopping observations, all 30 exact numeric writes and all 30 persisted
  readbacks under the existing protocol. Record failures and retained test drafts;
  never weaken checks or discard failed runs to manufacture a faster result.
- Verify the changed extension is actually loaded in a fresh/reloaded Pi session
  and exercise the relevant registered tools on the real phone. A source-level
  workflow pass alone is NOT proof that the loaded extension works. If the frozen
  workflow does not cover the loaded path, add a separately disclosed loaded-tool
  check rather than silently altering the historical driver.
- Collect and validate the metrics as well as functional outcomes: source/driver
  revisions, completed/failed attempts, elapsed times, capture/command counts,
  available internal spans and completeness/truncation flags. Distinguish source
  instrumentation from loaded-tool profiler data; never pretend they share a
  clock or measure model latency. Newly instrumented paths not exercised by the
  workflow also need focused success/failure coverage; do not fabricate spans.
- Preserve before/after JSON and Markdown and report the measured delta, including
  regressions or no improvement. Correctness is mandatory. Instrumentation-only
  work need not be faster, but it must be checked for overhead; a speed-change
  slice needs equivalent paired evidence before any performance-gain claim.
  One pair is descriptive, not proof of a population effect or causality.
- Keep Amazon read-only: no cart, checkout or account changes. Forge changes stay
  within disclosed test drafts; never finish a real workout. Restore the original
  IME on success AND failure, return to Termux and independently verify both.
  Existing APK/permission/helper/debugging approval boundaries still apply.

**Live-validation checkpoint (2026-10-18):** command/reconnect instrumentation now
passes the frozen Amazon.de → Forge workflow and a separate loaded native-only
Settings check. A same-driver isolated pre-instrumentation reference was collected
AFTER implementation. All 30 writes and 30 persisted readbacks pass both runs.
Reference 290.458s / 74 captures; current 283.303s / 72 captures, but reference
needed two extra alignment cycles (7.173s): no demonstrated speedup or isolated
overhead estimate. Live reconnect/error paths were not forced; their controlled
regressions remain the evidence. See [full evidence and limits](reports/workflow-command-validation-2026-10-18.md).

## Optimization latitude and approval

The user welcomes unconventional or “hacky” approaches when they can improve
performance or the overall experience. Consider options beyond the current design;
prefer bounded, reversible experiments with explicit correctness, privacy and
before/after evidence. This is permission to propose experiments, not blanket
approval for scope expansion or persistent changes. Explain the benefit, risks,
rollback and measurement plan, and ask before risky/out-of-scope work, new APKs,
permissions, helpers or debugging exposure. Keep every failed report and historical
driver; acceptance checks remain intact. Carry this policy into future handoffs.

## Latest slice — reconnect timing accepted; next scope pending

User approved and this slice is now **PASS within disclosed success/controlled-path
scope**. Added opt-in discovery/selection and connect/authorization spans, owner-only
single-flight substage clocks, bounded IPC and OFFLINE companion vocabulary.
Recovery behavior/defaults unchanged. [Full evidence](reports/reconnect-timing-2026-10-18.md).

Fresh chronological f061509 before **304521.52ms**, after **304066.19ms**:
both 77 captures / 291 scoped command spans, all shopping checks + 30 writes +
30 persisted values. New comparator's 16 gates pass; source manifests independently
checked, frozen v3.2 and historical annotation comparator/reports untouched.
**−0.15% descriptive only, no demonstrated speedup or isolated reconnect overhead.**
Exact transport disables live recovery; 14 controlled process tests cover the new
success/failure/shared-clock paths. No live disconnect was forced.

Focused native Settings 6/6 each; disabled median **+3.12% slower**, enabled
**+2.23% slower** (three samples/mode; not isolated overhead/non-inferiority).
Fresh rebuilt actual Pi CLI registered android_look passes before/after
2523/2498ms; six build hashes checked, parent session NOT reloaded.
Two retained TEST drafts source-recon-before96 / source-recon-after96, all values
persisted. Original Gboard/Termux independently verified after live blocks.

Final validation: **761/761 units / 57 files (--maxWorkers=2)**, lint/build,
**9/9 isolated integrations**, companion **39/39**, build/check. Default parallel
CI remains unverified. Preserve disclosed expected RED runs, initial 733/736 unit
failure (historical comparator now tested in isolated matching f061509 snapshot)
and new comparator test's copied-delta-literal failure; see evidence. Historical
drivers and every failed report unchanged. Implementation/evidence published to
user-owned origin/main forks: pi-droid **0034706**, companion **7894df4**. Full
remote/local hashes independently matched and both trees were clean afterward.
This subsequent docs-only commit records publication; never push upstream.

**Next recommendation, not approved/started:** fixed remote PNG concurrency safety.
Agree one bounded scope/test seams first; no new implementation until confirmation.
Runtime ingestion, cancellation, input lifecycle and CI remain separate.
Every new performance slice still requires a NEW equivalent frozen v3.2 baseline
before edits, full real-phone pair, focused coverage and fresh relevant actual
registered-tool checks. Ask before forced disconnects or connectivity changes.

## Earlier acceptance checkpoints

**Prior: annotation acceptance PASS under v3.2 (2026-10-18).**
User-approved separately versioned protocol preserves v2 and all failures.
Real offscreen zero-area bounds made v3/v3.1 reverse direction; v3.2 retains
last direction through unknown geometry without weakening visibility/actionability,
identity, ambiguity, fresh-confirmation or eight-scroll guards. Select v3.2 as
active acceptance protocol for correctness, not speed.

Same frozen v3.2 retrospective 09c3cc8 reference PASS **313865.86ms / 79 captures /
297 scoped command spans**, current PASS **311786.37ms / 78 / 294**. Both complete
all shopping checks, 30 writes and 30 persisted values; all 15 comparison gates
pass, independently verified source/driver/consumer hashes. **−0.66% descriptive**;
reference has one extra 3464.07ms field-alignment cycle, never subtracted. Not
chronological pre-code evidence, not a v2-v3 speed comparison, no speedup/isolated
overhead/non-inferiority claim. Source workflow does not exercise annotation.

Fresh rebuild + actual fresh Pi CLI registered android_look PASS **2998ms**,
exact Settings/Termux/OPEN index and build hashes verified; parent session not
reloaded. Existing focused pair remains valid for unchanged production source:
interactive −2.14%, all/base64 **+1.22%**; regression still disclosed. Historical
annotation report/audit remain unchanged OPEN-at-checkpoint evidence, superseded
for acceptance only by [new complete evidence](reports/annotation-v3.2-acceptance-2026-10-18.md).

Continuation retains two visibility failures and one later OCR-identity reference
failure (30 writes, no persisted readbacks); passing retry changes only the public
run label, not OCR threshold/identity guards. Three new retained TEST drafts;
Gboard/Termux independently verified after every attempt/check. No production
source changes. **721/721 units / 55 files (--maxWorkers=2)**, lint/build, script
syntax/whitespace checks pass. Default parallel CI still unverified; historical
integration/companion results not rerun. Next slices require a new fresh baseline,
full v3.2 pair and relevant loaded-tool checks; none started here.

**Previous checkpoint: annotation timing implemented; full-workflow gate OPEN.**
Fresh chronological before source `09c3cc8` PASS **290991.75ms / 74 captures**,
all shopping checks + 30 writes + 30 persisted values. Both unchanged-source after
attempts FAIL at Amazon `chosen_product_visible`, **28415.32ms / 27662.10ms**,
each 6 captures, before Forge navigation: no new after drafts/writes/persistence.
Current read-only inspection finds the chosen Barista result clipped below the
frozen visibility guard. Do NOT weaken driver checks or call failed runs faster.
No passing workflow pair/delta; acceptance stays OPEN.

Shared annotation clock + screenshot/UI sibling, map and text-index spans added,
default-off, existing parallel/fallback/retry/timeout/failure policies unchanged.
No compositing or sibling cancellation. Late sibling spans can follow rejection.
IPC/offline companion vocabulary extended; automatic runtime ingestion separate.
Focused Settings pair **6/6 each**, unchanged frozen driver, all four new stages;
interactive/no-base64 median **−2.14%**, all/base64 **+1.22%**. No isolated
overhead/non-inferiority/speedup claim. Actual fresh Pi CLI registered android_look
passes before/after **2799ms / 2555ms** (one each, separate tool clocks), with
rebuilt dist hashes checked. Two failed pre-code CLI-runner setup attempts retained;
closing child stdin fixed the probe; no tool events or deadline provenance retained.
Parent active session not reloaded. Detailed [evidence](reports/annotation-timing-2026-10-18.md),
[checkpoint audit](reports/annotation-audit-2026-10-18.json) and NEXT-SESSION.md.

Validation: **694/694 units / 53 files**, lint/build, **9 isolated integrations**;
companion **38/38**, build/check. One new TEST draft, **15 total**; original
Gboard/Termux independently restored/verified throughout. Historical evidence,
frozen drivers/adapters/comparator untouched. Default parallel CI remains open.
Next: close this slice's workflow gate before another implementation slice. If
Amazon's fixture remains incompatible, agree a separate versioned protocol with
fresh equivalent BEFORE/AFTER evidence, never rewrite the frozen driver.

**Prior: screenshot/OCR timing implemented and live-checked (2026-10-18).**
Fresh chronological baseline saved before code; full workflow before PASS
286223.78ms / 72 captures, after attempt 1 FAIL at exact draft-card OCR identity
(all 30 writes pass, persistence unverified), unchanged after attempt 2 PASS
309218.63ms / 74 captures. All 30 writes + 30 persisted values pass the completed
pair. **After is +8.03% slower**, two extra alignment cycles total 7044.88ms;
remaining variation unexplained. No demonstrated speedup/isolated overhead estimate.

Separate same-driver Settings pair: 9/9 correct each; screenshot median −1.24%,
quick-base64 **+7.43%**, OCR −0.68% (three rounds/API, not non-inferiority).
All seven new stages exercise one clock per API, not the frozen workflow's OCR
(which has no sink). A real fresh nonpersistent Pi CLI session loading rebuilt
dist passes actual registered native dump, screenshot dimensions and exact OCR
Termux fixture; parent session not reloaded. Source/tool clocks remain separate.

See [full evidence, boundaries and failures](reports/screenshot-ocr-timing-2026-10-18.md)
and [validated pair](reports/screenshot-ocr-comparison-2026-10-18.json).
Three new TEST drafts retained, **14 total**. Gboard/Termux independently verified
after every attempt/check. No shopping changes, completed sets or real workouts.

Validation: **682/682 units, 52 files**, lint/build, **9 isolated integrations**;
companion **37/37**, build/check. Partial IPC retention, privacy, default-off,
controlled failures and native fallback share-clock tests pass. Annotation,
finer reconnect subcommands, runtime ingestion, default parallel CI and automatic
production input lifecycle remain open. Next is annotation as a separate slice,
with a NEW equivalent baseline before implementation and the mandatory live gate.

**Prior implementation: loaded native-only tool verified; command/reconnect timing
and offline companion ingestion implemented.** See [COMMAND-TIMING.md](COMMAND-TIMING.md).
The following implementation checkpoint predates the new live evidence.
The fresh continuation session exposes both options; direct loaded
`android_ui_dump(all_elements:true, ocr_fallback:false)` on Settings → Termux
app info returned the exact non-interactive title and OPEN control. Gboard stayed
unchanged; original IME and Termux foreground independently verified afterward.
No new live timing or speedup claim. Historical evidence/drivers untouched.

Opt-in `adb_attempt` and `reconnect` completed spans now share the capture clock,
retain explicit failure categories and stream through the bounded IPC allowlist.
Companion offline CLI ingests traced reports with privacy/bounds validation,
per-capture clocks, partial flags and failure-aware summaries; the preserved
20-round historical baseline imported successfully without modification.
Automatic runtime ingestion and finer screenshot/OCR/annotation spans remain open.
Validation: **665/665 units, 51 files; 9/9 isolated integrations; lint/build/syntax**.
Companion **36/36**, build/check. Default parallel CI is not claimed fixed.

**Prior: registered text-observation slice implemented and compared.**
Existing `android_ui_dump` now accepts `all_elements:true` and
`ocr_fallback:false`: include information labels, force a fresh native hierarchy,
never capture screenshots/OCR or reuse cached OCR/merged text, propagate native
acquisition errors. Defaults are unchanged. User confirmed this interface and
registered-tool/synthetic-ADB output seam before tests; equivalent old-path
baseline JSON + Markdown were saved BEFORE source edits.
See [TEXT-OBSERVATION.md](TEXT-OBSERVATION.md) for the contract, evidence and limits.

Live same-driver read-only task: **6/6 correct on both paths**, image captures and
pulls **6 → 0**, native captures **6 → 6**. Median **3077.87 → 3128.77ms (+1.65%)**:
**no demonstrated latency speedup**. Old native-only summary omitted the title;
old `android_look(all_elements:true)` was the equivalent information-reading path.
No new drafts/typing/settings/installs; original Gboard and Termux verified restored.
Frozen v1/v2 workflows/evidence remain untouched.

Latest validation: **662/662 unit tests / 51 files with `--maxWorkers=2`**, 13 new
registered-tool regressions, **9/9 isolated sequential integrations**, lint/build/
script syntax/diff checks; companion **16/16**, build/check, unchanged.
The initial DEFAULT unit run was **661/662** (existing old-adapter test hit its
5s test limit); isolated workflow rerun **5/5**. No old tests/limits were changed.
Bounded concurrency success is NOT default full-suite/parallel-CI success.
Loaded native-only observation is now verified above; production automatic
input lifecycle remains unverified.

**Prior next action (now completed above):** capture a fresh equivalent current baseline BEFORE
implementing screenshot capture/transfer/read/dimension and OCR availability/
engine/parse spans. The command checkpoint's live-validation gap is closed within
the disclosed successful-path scope; see the new evidence above. Preserve frozen
drivers and historical reports, then repeat full Amazon.de → Forge E2E and loaded
tool checks after the next implementation under the mandatory gate. Annotation
and automatic profiler runtime ingestion follow separately. The live driver
exercises source APIs, not loaded Pi tools or model latency; its frozen metric
limits are documented. Default CI reliability and automatic input lifecycle remain open.

**Prior completed slice: full v2 source-workflow adoption of bounded field selection.**
The public `readSelectTap` now backs all 30 numeric-field selections in the
versioned Amazon.de → Forge consumer. Baseline JSON AND Markdown were saved
before consumer migration; the original adapter is archived byte-for-byte.
Same driver/recorded engine hashes and public offers, identical correctness
checks: **370.746s → 289.733s (81.012s / 21.85% lower in this pair)**.
Captures **104 → 73**: 30 intentional duplicate removals, PLUS one fewer
alignment cycle under unchanged polling. Do NOT attribute all time/capture
variation solely to the migration or claim a population effect. All 30 values
and all 30 persisted values pass. See [WORKFLOW-V2.md](WORKFLOW-V2.md).
The earlier focused operation result remains in [READ-SELECT-TAP.md](READ-SELECT-TAP.md).

**Information-reading follow-up is now implemented above.** The prior text dump
was already screenshot-free on native success; this slice exposes omitted text
and adds an explicit no-screenshot/OCR policy without a new tool or TTL change.
Finer Step 2 spans and profiler ingestion remain unfinished follow-up work.
Step 1's offline feedback loop and opt-in live runner are implemented and
validated. A read-only live static-label baseline is now recorded: 20/20 correct
captures on Settings → Termux app info. A separate Amazon.de → Forge workflow
now has a saved pre-implementation tool baseline and passing original/changed
source pair, including editable-field persistence checks with an explicit clear
workaround. A follow-up now fixes default whole-field clearing and Unicode XML
readback, with **4/4 focused live cases passing without a replacement workaround**.
See [input fix evidence](reports/input-replacement-fix-2026-10-16.md). The later
v2 consumer now has the controlled migration pair above; broader acceptance
(independent name/stock/detail-price checks and loaded-tool path) remains open.
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
process boundary. Latest consumer-migration validation: **649 pi-droid unit
tests / 50 files, 9 isolated sequential integration tests, and 16 companion tests
pass**, plus both builds/type checks. The initial full unit run was 647/648;
its test-only timing follow-up and final rerun are disclosed below. Default parallel CI still
hits the documented short integration time limits; it is NOT marked passing.

Partial-span streaming is implemented and regression-tested under deadline and
SIGTERM (including interruption before any stage completes). Parent retention is
allowlisted and bounded, with explicit trace completeness/truncation flags.

**Audit/reference complete:** see [OBSERVATION-AUDIT.md](OBSERVATION-AUDIT.md).
Historical workflow has 46 adjacent second captures (120.63s), not 46 proven-safe
removals. Current unchanged source passed a new **6/6** read-only Settings capture
reference (median 2589.66ms); this is not a paired-operation or workflow baseline.
**Bounded-operation slice complete:** consent, pre-change operation baseline,
30 process-level regressions, public implementation/export and same-driver live
pair are recorded in [READ-SELECT-TAP.md](READ-SELECT-TAP.md).
**Consumer slice complete:** [v2 protocol and results](WORKFLOW-V2.md), including
failed baseline attempts, frozen passing driver, archived before adapter and
strict offline comparison. No production src/ changes were needed for adoption.
**Text-output follow-up complete:** the agreed registered-tool seam, equivalent
old-path task baseline and same-driver comparison are in [TEXT-OBSERVATION.md](TEXT-OBSERVATION.md).
Only the existing dump gains optional parameters; frozen v1/v2 remain unchanged.
Finer command-attempt/screenshot/OCR/reconnect spans and profiler ingestion remain
open; add them where required to attribute the change. Explicit execution metadata
is implemented/tested (see validation below); do not infer timeout from duration. The workflow-reproduced input clear
bug is now fixed and source-level live regression-tested; production automatic
focus/value verification, broadcast exposure and active-session reload remain open.

Historical metadata-only v1 source pair: **361.679s before / 362.485s after (+0.22%)**, same harness
hash and 364 operations each, all numeric write/persistence checks pass. This
is diagnostic validation, NOT a speedup. The original chronological tool baseline
was saved before source edits; the additional original-revision source reference
was run afterward from an isolated git extraction. Failed harness attempts are
preserved. Six v1 test drafts remain; v2 adds three disclosed test drafts,
**nine total**. No real workout was marked finished. Gboard and Termux were
restored/verified after every run.

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
- [x] Review, commit and push all metadata/workflow/input changes, tests and
  sanitized evidence to origin/main; see the verified publication checkpoint.
- [ ] Full Step 2 instrumentation and companion-profiler ingestion.
- [x] Fix default whole-field ADBKeyboard replacement and numeric Unicode XML
  readback; 4/4 focused source live cases pass without a replacement workaround.
- [x] Fresh loaded-session native-only observation schema/output on a read-only fixture.
- [ ] Production automatic focus/readback/IME lifecycle verification (focused
  source harness is not a production guarantee).
- [ ] Default CI scheduling/time-limit reliability on this Termux host.
- [x] Controlled focused source-operation optimization and paired before/after
  measurement with exact action/readback checks and verified capture counts.
- [x] Versioned full source-workflow consumer adoption and equivalent comparison,
  with identical correctness, preserved polling and explicit alignment variation.
- [x] Registered information-reading tool interface and equivalent task comparison;
  image work removed, no latency speedup demonstrated. See TEXT-OBSERVATION.md.

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
- [x] Fresh-session loaded native-only dump schema/output verified on the fixture;
  this does not verify every changed source path or automatic input lifecycle.

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
- [x] Paired focused-operation and v2 multi-app source fixtures after controlled
  changes; v2 keeps its own equivalent baseline rather than using old v1 timings.
  This is not a static Settings-backend or loaded Pi-tool comparison.

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
- [x] Finish the instrumentation-boundary audit of `screenshot.ts`, `ocr.ts`,
  `reconnect.ts` and `annotate.ts`; see COMMAND-TIMING.md. Only command/recovery
  wait spans implemented in this slice, not the remaining internal stages.
- [x] Add opt-in high-level `dumpUiTree` spans: device dump, XML transfer,
  local read, parsing/filtering, foreground, cache lookup/hit and whole OCR call.
  `src/adb/capture-timing.ts` supplies fixed fields/stages and per-call monotonic
  clocks. `dumpUiTree({ onCaptureSpan })` is off by default; callback exceptions
  are ignored. CLI config `trace: true` exports spans only when opted in.
- [x] Test normal/default-disabled traces, a controlled dump delay, failed dump
  success marker/pull, cache miss/hit and throwing consumers through real source
  APIs with fake ADB at the process boundary. Assert private values stay absent.
- [x] Exercise OCR with controlled screenshot/availability/engine failures and
  successful parse, shared-clock nesting and default-off/privacy tests at the
  public source/process seam. Engine timeout remains unknown, not inferred ADB provenance.
- [x] Add opt-in command-attempt and reconnect-wait spans sharing the capture
  clock; explicit failure metadata, callback safety and concurrent recovery tests.
- [x] Add screenshot capture/transfer/dimensions/base64-read and OCR availability/
  engine/parse spans; chronological baseline, retained failed run, passing full
  workflow, equivalent focused pair and fresh loaded registered tools checked.
- [x] Annotation sibling shared-clock/map/text-index spans, focused/loaded checks
  and full-workflow acceptance PASS under v3.2. Earlier OPEN checkpoint and all
  failed reports remain historical evidence; see latest acceptance report above.
- [x] Finer reconnect discovery/selection and connect/authorization spans; fresh
  workflow/focused/loaded success pair plus controlled failure/single-flight tests.
  Live reconnect not forced; see reconnect timing evidence above.
- [x] Preserve explicit timeout/cancellation/error metadata through ADB/capture
  spans and benchmark IPC. Command AbortSignal supported; whole-observation and
  sibling cancellation, reconnect cancellation and default tool signal forwarding
  remain outside this slice.
- [x] Verify first-slice capture spans contain only fixed fields/stages,
  relative timings, ok/error and optional cache-hit boolean; tests assert no
  page text, paths, serial, package or raw errors. Tracing is absent by default.
- [x] Extend privacy/default-off and diagnostic safety coverage to screenshot/OCR.
- [x] Annotation public process success/failure/default-off/privacy/cache/fallback/
  explicit-clock/timeout/late-sibling coverage and bounded partial IPC acceptance.
- [ ] Extend coverage again for future reconnect/runtime paths.
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
- [x] Companion offline ingestion of bounded traced source-capture reports;
  preserves partial flags, separate clocks, explicit failures and old evidence.
- [ ] Automatic runtime internal-span ingestion into companion tool traces;
  offline summaries are not merged clocks or runtime hook integration.
- [x] Add direct regression coverage for parent IPC allowlisting, malformed
  events, fixed failure categories, retention cap and truncation flags:
  tests/adb/capture-ipc.test.ts exercises the real CLI with adversarial worker IPC.
- [ ] Decide whether active-stage start events are needed to identify work
  interrupted before completion. Current traces retain completed stages only;
  do not fabricate a completed stage or infer its cause from missing evidence.

Depends on Step 1's feedback loop. Do not assign the variable dump latency to
cache/OCR/reconnect until spans distinguish them.

### 3. P1 — Reduce unnecessary observation work and round trips

- [x] Audit production callers/output and historical workflow adjacency; preserve
  a fresh current-source capture-only reference before implementation. See
  [observation audit](OBSERVATION-AUDIT.md), including the safe-removal limits,
  proposed source/API test seams and a separate input-helper issue discovered.
- [x] User confirmed bounded fresh read/select/tap interface/test seams; preserved
  equivalent old-path baseline before edits, implemented public helper and guards,
  30 regressions and 4/4 live cases on both paths with the same frozen driver.
- [x] Explicit native-only registered observation with no screenshots/OCR, fresh
  capture and error propagation (`android_ui_dump`, optional `ocr_fallback:false`).
- [x] Information-reading output including non-interactive text (`all_elements:true`).
- [ ] Add focused output and bounded action/wait/observe batches, with explicit
  verification checkpoints and cancellation.
- [x] Compare bounded v2 consumer correctness and latency against its equivalent
  pre-migration baseline; all values/reopen pass and 30 targeted captures removed.
- [x] Equivalent source-registered text-observation task baseline/comparison
  (separate from the static Settings reference or v2 source workflow). 6/6 both
  paths; screenshots removed but median +1.65%, NOT a speedup. Active reload open.

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
updating Markdown. Both origin forks were fetched before publication; neither
had remote-only commits. All pushes succeeded without force, and remote main
hashes were independently checked against the local implementation HEADs:

- **pi-droid:** `f41350c` — Improve ADB failure diagnostics and fix whole-field
  text replacement. Published to `https://github.com/RuiCostafrg/pi-droid`, main.
  The push also includes earlier local commits `3055003`, `3439e6d`, `4a2b4f6`.
- **pi-android-perf:** `d7d1193` — Count failed work in performance bottleneck
  summaries. Published to `https://github.com/RuiCostafrg/pi-android-perf`, main.
  No new companion edits were needed; its previously local commit is now remote.

The implementation checkpoint includes metadata/capture IPC, workflow runners,
ALL preserved success/failure reports, default replacement and XML fixes,
regression tests and progress/changelog updates. No historical JSON evidence
was rewritten. Both working trees were clean after the verified implementation
push; this follow-up Markdown-only commit records those publication results.

Publication validation: pi-droid **599 unit tests / 47 files**, lint/build,
all five runner script syntax checks and staged diff whitespace PASS; the
preceding input-fix validation also passed **9 isolated integrations** with the
documented time allowances. Companion **16 tests**, build/type check rerun PASS. Default parallel
CI and the running user-session extension reload remain unverified. Next work
is the observation audit/current-source baseline above, not an implemented
full-workflow speedup. Original Gboard/Termux were restored after the last live
run; this publication task does not interact with the phone.

### Bounded read/select/tap continuation — 2026-10-17

User confirmed the recommended interface and both proposed seams. See
[READ-SELECT-TAP.md](READ-SELECT-TAP.md) for contract, reproduction, both immutable
JSON reports, source/driver hashes and limitations.

- Before production edits: existing test title fixture, 4/4 exact readbacks,
  2 captures per measured operation, median 5322.77ms; report created exclusively.
- New public `readSelectTap` in its own module, exported from ADB and package
  entry points. Exact pinned transport; fresh native hierarchy; frozen local
  synchronous selection; unique captured identity/actionable geometry/package;
  foreground recheck; cancellation, operation/selection time bounds and revision
  guard against observed intervening input/capture. No retries or cached tokens.
- `dumpUiTree(throwOnError)` is opt-in; new internal cache revision does not alter
  TTL/default reads. Existing tools, automatic fallback and old workflows intact.
- Red → green at the approved source/external-ADB seam; **30 new cases**.
- Live after: 4/4 exact readbacks, 1 capture per measured operation, median
  2806.34ms. **47.28% lower operation median**, focused runner 84.52s → 74.36s.
  Not an Amazon/full-workout speedup or a population-tail claim.
- Both reports have the same driver hash; source hashes checked after measurement.
  Same seed/probe/readback/restoration on both paths. Test draft reused/restored;
  no new drafts, workout numeric changes, completed sets or purchases.
- Final validation: **629/629 unit tests, 48 files; 9/9 isolated sequential
  integrations; lint/build/script syntax PASS**. Companion **16/16**, build/check
  PASS, no companion edits. Default parallel CI/reload not claimed.
- Original Gboard and Termux restored and independently verified. Public helper
  requires exclusive device interaction; guards do not make Android atomic or
  preempt infinite JS callbacks. Always verify app outcome; never replay a failed
  tap automatically. Reports omit raw content/errors/transport identifiers.
- Published implementation/evidence checkpoint: **`9264bb3`**, `Capture once in
  bounded read-select-tap operations`, pushed to the user's pi-droid origin/main.
  Remote main independently matched the implementation HEAD and the working tree
  was clean after push. This follow-up Markdown-only commit records that result.
  Companion remains unchanged at previously published `d7d1193`; its validation
  was rerun successfully for this slice.

### Workflow v2 consumer migration — 2026-10-17

See [WORKFLOW-V2.md](WORKFLOW-V2.md), its immutable baseline Markdown/JSON,
failed attempts and generated comparison. Only the 30 numeric-field selection
consumer sites changed; all src/ files and frozen v1 remain unchanged.

- Baseline old consumer preserved as `scripts/workflow-field-action-before.mjs`.
  Active `workflow-field-action.mjs` now delegates to the public bounded helper.
  Same frozen `workflow-v2.mjs` for the successful pair, source hashes verified.
- **370745.62ms before → 289733.50ms after**, 81.01s / 21.85% lower in this pair;
  **104 → 73** completed hierarchy captures. 30 deliberate removals plus ONE
  alignment-cycle difference (2 → 1); not all elapsed improvement is causal proof.
- All 30 numeric values and all 30 persisted values pass; same 34 correctness/
  count entries, public offers and nine-file recorded engine hash. Query focus,
  polling, clipping alignment, input, settles and readback were not removed.
- Failed baseline 1: all numeric writes pass but OCR label misread; persisted
  reopen unverified. Failed baseline 2: query empty at readback; no Forge draft.
  Both restored IME/Termux and are preserved, not successful reference runs.
  Before the successful baseline the driver gained stable exact search-field
  and explicit focus checks; final before/after hash matches. OCR threshold and
  exact identity matching were NOT weakened.
- Three new test drafts retained: `E2E Lower v2 source-v2before1`,
  `E2E Lower v2 source-before55`, `E2E Lower v2 source-after55`; nine including
  earlier v1 artifacts. No purchases, existing training edits or completed sets.
- Public consumer/external ADB red → green (expected one dump, observed two),
  five adapter/guard cases; strict offline comparison CLI has 15 tests, including
  failures/provenance/correctness/removed work/privacy/output exclusivity.
- Initial full unit run: 647/648 (one rejected positive consumer functional test).
  Its original caught error was not retained, so host-load/selection-window cause
  is not asserted proven. Offline tests now expose failure diagnostics, use the
  supported 1000ms window ONLY for synthetic functional count tests, and add a
  controlled 700ms final-foreground delay proving the PRODUCTION DEFAULT 500ms
  window rejects before tap. No live driver, helper window or src/ changes.
- Final full unit rerun **649/649, 50 files PASS**. Isolated sequential integration
  **9/9**, lint/build/four new script syntax checks PASS. Companion **16/16** plus
  build/check PASS, no companion edits. Default parallel CI remains unverified.
- Original Gboard and Termux restored on every live outcome and independently
  verified at completion. No new APKs/helpers/permissions/debugging exposure.
- Published consumer/evidence checkpoint: **`ef767eb`**, `Adopt bounded field
  selection in versioned full workflow`, pushed to the user's origin/main.
  Remote main was independently verified against local HEAD and the working tree
  was clean after push. This follow-up Markdown-only commit records publication.
  Companion remains unchanged at published `d7d1193` with its validation rerun.

### Registered text-observation continuation — 2026-10-17

User confirmed the existing-tool optional interface and registered-output test
seam. Implemented in `src/tools/device.ts`, `src/adb/device.ts` and
`src/adb/ui-tree.ts`; 13 process-level regressions in `tests/tools/ui-dump.test.ts`.
Pre-change equivalent-task JSON/Markdown, frozen driver, after evidence and
validation/failure disclosures: [TEXT-OBSERVATION.md](TEXT-OBSERVATION.md).
README, changelog and screen skill now correctly describe text output (not raw XML).

- Both live paths: all exact non-interactive title/control/foreground checks pass,
  6 native captures; screenshots/image pulls/dimension queries 6 → 0 each.
- Median 3077.87 → 3128.77ms (+1.65%); no demonstrated speedup, no attribution of
  small timing variation. Wrapper observes fixed external command categories.
- Red → green: missing information option, OCR policy, cached OCR contamination,
  and silent native acquisition failures. Defaults/fallback remain covered.
- First DEFAULT unit attempt: 661/662 (one old-adapter test exceeded 5000ms).
  Isolated unchanged workflow suite 5/5; bounded full run **662/662**, 51 files.
  No claim of default CI repair. Isolated sequential integrations **9/9**;
  lint/build/syntax/diff checks and companion **16/16** plus build/check pass.
- No source/workflow edits after measured after-hashes; baseline reports frozen.
  Original Gboard and Termux independently verified restored; no new phone records.
- Published implementation/evidence checkpoint: **`2664006`**, `Expose native-only
  information in registered text observations`, pushed to the user's origin/main.
  Remote main independently matched local HEAD and the working tree was clean.
  This follow-up Markdown-only commit records publication. Companion remains
  unchanged at published `d7d1193`; its clean tree and matching remote main were
  independently verified. Active-session schema reload remains the next action.

### Loaded native-only observation + command timing continuation — 2026-10-17

See [COMMAND-TIMING.md](COMMAND-TIMING.md) for the loaded-tool fixture result,
restoration, exact boundaries, companion CLI, validation and remaining work.
Original checkpoint `4a8534d`; historical evidence/drivers preserved unchanged.

- Loaded direct `android_ui_dump` accepts both options and reads the title/control
  on Settings → Termux app info. Gboard unchanged; Termux/IME separately verified.
- Source `adb_attempt` and `reconnect` spans share the observation clock; IPC
  allowlist extended without changing retry rules, retention or fallback defaults.
- `npm run test:unit -- --maxWorkers=2`: **665/665, 51 files**, twice. `npm run lint`,
  `npm run build`, both capture-script syntax checks and `git diff --check`: PASS.
- Isolated integration command unchanged from above: **9/9** with 20s/30s limits.
  Final follow-up changed only concurrent-recovery assertions/docs in pi-droid;
  full units rerun. Default full-parallel CI reliability is still not claimed.
- Companion `npm test` / `npm run check`: **36/36**, build/check PASS. Initial test
  regex failure disclosed in COMMAND-TIMING.md. Historical 20-round source report
  ingests offline successfully; raw report untouched. No automatic runtime hooks.
- No new live timing run or speedup claim. Next: finer screenshot/OCR stages,
  then annotation and runtime companion ingestion. Production input lifecycle open.
- Published implementation checkpoints (both origin/main hashes independently
  matched to local HEAD after push, both working trees clean): pi-droid
  **`fca7737`** — `Trace ADB attempts and reconnect waits on the capture clock`;
  companion **`b18e04a`** — `Ingest bounded source capture timings offline`.
  This subsequent tracker-only commit records publication; no new phone test or
  implementation change was made after the validated implementation checkpoints.

### Command timing live acceptance — 2026-10-18

See [evidence](reports/workflow-command-validation-2026-10-18.md), both immutable
attempt JSONs, [validated comparison](reports/workflow-command-comparison-2026-10-18.json)
and separate [loaded-tool trace](reports/command-loaded-tool-2026-10-18.json).
No production code, frozen driver, archived adapter or historical report changed.

- Current `e3bc49e` first, isolated reference `4a8534d` second, both collected
  after implementation; same frozen driver and bounded consumer, expected changed
  engine hashes independently verified. Both PASS, identical 34 checks/counts,
  offers, 30 selections, exact 30 writes and 30 persisted readbacks.
- Current **283302.93ms / 72 captures / 300 successful operation records**;
  reference **290458.23ms / 74 / 306**. Reference's two extra alignment cycles
  total **7173.10ms**. Raw current delta **−7155.31ms / −2.46%**, not a proven
  speedup or isolated overhead estimate. No failed full-workflow attempts.
- Current has 636 source spans: 360 high-level and **276 successful command
  attempts** in traced hierarchy/selection paths, NOT the whole workflow command
  count. No reconnect exercised; no measured command count in reference. Both
  nontruncated/zero errors; frozen driver does not emit traceComplete. Explicit
  OCR one each; screenshot count unavailable. No clocks merged or nested sums.
- Loaded native-only dump passes Settings title/control, **2654.78ms** metadata
  time. Changed dist command/capture files predate session and rebuild byte-equal.
  Initial interrupted probe's one failure and two wrong-fixture successes are
  disclosed in evidence, not counted as fixture passes or inferred timeouts.
- Two test drafts retained: `E2E Lower v2 source-cmd-current88` and
  `E2E Lower v2 source-cmd-reference88`; **11 total** including historical nine.
  No real workouts finished or shopping mutations. Gboard/Termux independently
  verified after each run and loaded check. No new phone helper/permission/install.
- Validation: **665/665 units (51 files), 9/9 isolated integrations**, lint/build,
  unchanged dist hashes; companion **36/36**, build/check, unchanged source.
  Default parallel CI and automatic production input lifecycle remain open.
- No finer screenshot/OCR implementation started. Fresh equivalent baseline is
  required before that next slice; this checkpoint is not an evergreen baseline.

### Screenshot/OCR timing continuation — 2026-10-18

[Detailed evidence](reports/screenshot-ocr-timing-2026-10-18.md) is authoritative.
Before source `22af80b`; new source spans and IPC vocabulary in screenshot.ts,
ocr.ts, capture-timing.ts and capture-benchmark.mjs. Companion offline allowlist
extended; no runtime hooks. Frozen workflows/adapters/historical reports unchanged.

- Fresh before 286223.78ms, 72 captures, PASS; after1 248255.74ms FAIL at draft-card
  OCR identity (30 writes pass, persistence unverified); unchanged after2
  309218.63ms, 74 captures, PASS with 30 writes + 30 persisted readbacks.
- Raw +22994.85ms / +8.03%; after2 needs two extra alignment cycles (7044.88ms).
  Remaining variation unexplained; no overhead isolation/non-inferiority/speedup.
- Scoped command attempts 276 → 282, NOT whole workflow. Frozen OCR receives no
  sink; no independent screenshot count/traceComplete flag inferred from workflow.
- Equivalent same-driver Settings pair 9/9 each, all seven new stages measured.
  Screenshot −1.24%, quick-base64 **+7.43%**, OCR −0.68% medians; three samples/API.
  Each source call has its own clock and complete synchronous sink, not IPC/tool time.
- Fresh actual Pi CLI session with explicit rebuilt dist/index.js: native dump
  2643ms, screenshot 439ms (1080×2340), OCR 1259ms (exact Termux). Three actual
  registered calls, no mocks, agent settled. Metadata-only report/hashes retained;
  parent active session was NOT reloaded. No clocks merged or internal spans inferred.
- Three new TEST drafts: source-shot-before91, source-shot-after91 (failed reopen),
  source-shot-post88; **14 total**. All unchecked, no real workout finished. Amazon
  read-only. Gboard/Termux independently restored/verified after EACH attempt/check.
- Validation: **682 units / 52 files**, 16 new source process regressions plus new
  partial-IPC test, lint/build, **9 isolated integrations**, companion **37/37**
  build/check. Syntax/privacy/diff checks; unchanged frozen hashes. Default CI open.
- Next: separate annotation slice, NEW baseline first. Runtime ingestion remains
  another slice. No new APK/helper/permission/debugging exposure.
- Published implementation/evidence: pi-droid **`5669bcd`** (`Trace screenshot and
  OCR stages with preserved real-phone evidence`); companion **`93fbf54`**
  (`Accept screenshot and OCR stages in offline capture ingestion`). Pushed only
  to user-owned origin/main forks; remote main independently matched each HEAD,
  both trees clean afterward. This subsequent docs-only checkpoint records those
  verified hashes; no production/frozen driver/live evidence changed after validation.

### Annotation timing continuation — 2026-10-18

See [full evidence and OPEN gate](reports/annotation-timing-2026-10-18.md).
Fresh baseline checkpoint saved before production edits; all full/focused/loaded
attempts preserved, including two failed pre-code loaded-runner setup probes.
New source annotation sibling/map/index spans, IPC/offline vocabulary and process
regressions; no backend/retry/timeout/failure-policy or workflow-driver changes.

- Full before PASS 290991.75ms / 74 captures / 282 scoped command spans; after1
  FAIL 28415.32ms and after2 FAIL 27662.10ms, each 6 captures / 18 scoped command
  spans at chosen-product visibility. No after Forge navigation or numeric writes.
  All 3 attempts total 347069.18ms; failed work NOT called a workflow speedup.
- Focused pair 6/6 each: 87 → 111 spans, +24 for four stages × six calls;
  −2.14% interactive/no-base64, **+1.22%** all/base64 medians. Three rounds/mode,
  no overhead isolation. After one clock/call; baseline independent sibling clocks.
- Real fresh CLI android_look: exact Settings/Termux/OPEN index before and after,
  2799ms / 2555ms, rebuilt dist checked unchanged; default-disabled source spans,
  no merged clocks or active parent-session reload claim. Registered image inclusion
  unexercised; source base64 covered separately.
- New scripts annotation-check.mjs, annotation-loaded-check.mjs (passing pair
  frozen), audit-annotation-checkpoint.mjs. Audit independently recomputes baseline
  and current hashes and explicitly emits fullWorkflowAcceptance:open, no delta.
  It is checkpoint-specific, NOT a passing-workflow comparator.
- 11 public process regressions; annotation IPC retention test; **694/694 units**
  (53 files), lint/build, **9/9** isolated integrations with existing 20s/30s
  allowances. Companion **38/38**, build/check. Default parallel CI remains open.
- One new TEST draft `E2E Lower v2 source-ann-before88`, **15 total**, all unchecked
  20kg × 8 with 30 persisted values checked. No after drafts or shopping mutations.
  Original Gboard/Termux independently verified after each attempt/check/inspection.
- Full-workflow acceptance stays OPEN. Close it without weakening frozen assertions;
  if a newly versioned protocol is required, agree it and collect a fresh equivalent
  before/after pair. No additional implementation slice until this is resolved.
- Published implementation/evidence: pi-droid **`d119e04`** (`Trace annotation
  stages with preserved open workflow acceptance`), companion **`57e04fc`**
  (`Accept annotation stages in offline capture ingestion`). Pushed only to each
  user-owned origin/main; remote main independently matched local HEAD, both
  working trees clean afterward. This docs-only checkpoint records publication,
  NOT completion of the still-OPEN mandatory full-workflow gate.

## Operating boundaries

Return to Termux and verify foreground whenever device interaction pauses.
Restore original IME after any bounded input block, including failures. Discover
current authorized device afresh; never save its serial/IP in reports. Amazon.de
shopping remains read-only (Versa Gripps and almond milk): no cart, checkout or
account changes. No new APK, permission, persistent helper or browser debugging
without explaining the tradeoff and obtaining approval.
