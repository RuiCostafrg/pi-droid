# Correctness-aware capture feedback loop

This is a **development/source-level** harness, not a newly registered Pi tool.
It needs this repository's existing dev dependencies (`tsx`) and Node >=20 on
a POSIX host (including Termux). It does not load potentially stale `dist/`.
No new APK, helper, permissions, IME changes or browser debugging are needed.

## Offline feedback loop (no device required)

From `~/projects/pi-droid`:

```sh
npm run test:capture
# Faster first tracer bullet:
npm run test:capture -- -t "captures known"
```

The test creates an executable fake `adb` at the OS process boundary, overrides
`PATH` and `ANDROID_SERIAL` only for that subprocess, and drives the **real**
`dumpUiTree`, production XML parser, foreground query and filesystem reads.
It does not copy parser logic or mock internal collaborators. No real ADB
command is run by these tests.

Fixture: `tests/fixtures/capture.xml`. Known literals assert:
- decoded, non-interactive status text;
- exact editable-field value and class;
- resource IDs and bounds;
- foreground package and UIAutomator source.

Other checks deliberately give a wrong field value/bounds/foreground, empty XML,
a zero-exit UIAutomator error with stale XML available, a hung ADB subprocess,
a run-budget expiry and SIGTERM. They verify failure classification, local
subprocess-group termination, scratch directory cleanup and content-free output.
The capture test suite takes tens of seconds here because it exercises actual
subprocesses and waits long enough to detect orphan work; the focused correctness
test takes a few seconds. Synthetic timings are NOT device performance evidence.

## Opt-in live runner

**Do not run until a stable fixture screen/app and its expected values have
been approved.** This slice does not supply/install an Android fixture app.
The synthetic fixture's package is fictional. Browser DOM IDs are not generally
UIAutomator resource IDs; do not assume a browser HTML fixture will work unchanged.

1. Discover the current authorized device with existing tooling. Do not reuse
   an old wireless endpoint. Explicitly set its current serial in
   `ANDROID_SERIAL`; the harness refuses an absent target.
2. Use a static, non-sensitive native screen with a known field value and status
   text. Do not type into it during this capture-only benchmark.
3. Keep expectation JSON in an untracked private temporary file. Example shape
   (replace all fictional values with the approved fixture's values):

```json
{
  "foregroundPackage": "com.example.capture",
  "assertions": [
    {
      "resourceId": "com.example.capture:id/query",
      "text": "almond milk",
      "className": "android.widget.EditText"
    },
    {
      "resourceId": "com.example.capture:id/status",
      "text": "Ready & steady",
      "bounds": { "left": 20, "top": 40, "right": 500, "bottom": 100 }
    }
  ],
  "rounds": 20,
  "desiredMs": 5000,
  "observationMs": 10000,
  "budgetMs": 120000
}
```

Each assertion requires exactly one matching resource ID and exact text;
class and bounds are optional. Unknown/ambiguous fields cannot pass.

4. From the repository root, run:
```sh
# ANDROID_SERIAL must already hold the freshly selected authorized target.
node scripts/capture-benchmark.mjs /private/temporary/expectations.json > /private/temporary/capture-report.json
```
Or `npm run benchmark:capture -- /private/temporary/expectations.json` for
interactive output. Use direct `node` when redirecting JSON: npm prints headers.

5. Return to Termux and verify foreground after device interaction pauses.
   The runner never navigates, wakes/unlocks, types or changes IME. It cannot
   restore foreground itself. Do not run alongside another pi-droid capture:
   production currently shares a fixed remote XML path.
6. Repeat with the same fixture, transport and budgets after one controlled
   implementation change. Retain the first sample and all failures.
   No paired comparison on this static capture fixture has been performed.
   A separate multi-app source workflow pair is linked below; it is not a
   static-fixture optimization comparison.

## Opt-in internal timing spans

Add `"trace": true` to the private expectation JSON to include `samples[].spans`.
Tracing is off by default; non-boolean `trace` values are rejected. The public
source API also accepts `dumpUiTree({ onCaptureSpan: span => { ... } })`.
Each observation has its own monotonic clock and callback (no global collector).
A callback that throws is ignored so diagnostics do not break capture.

Span fields are fixed: `stage`, `startMs`, `durationMs`, `outcome` (`ok`/`error`).
Failed spans additionally include a fixed `failureKind`: `timeout`, `cancelled`,
`exit`, `signal`, `spawn`, `buffer` or `unknown`. Cache lookup spans additionally
contain a boolean `cacheHit`. No raw error,
command, path, selector, device identifier or screen content is attached.

| Stage | Boundary |
| --- | --- |
| `cache_lookup` | Synchronous cache lookup; absent when `skipCache: true` |
| `device_dump` | ADB shell UIAutomator call, including required success-marker validation |
| `xml_transfer` | ADB pull |
| `xml_read` | Local UTF-8 file read |
| `xml_parse` | Production parser and interactive-element filtering |
| `foreground` | Foreground-package query |
| `ocr_fallback` | Entire OCR fallback call, when enabled by a source API caller |
| `adb_attempt` | One local execFile attempt through completion/rejection and explicit failure classification; excludes reconnect and preflight validation |
| `reconnect` | Awaited secure reconnect, including shared single-flight recovery waiting; discovery subcommands are not separately attached |
| `screenshot_capture` | Existing screencap command await |
| `screenshot_transfer` | Existing PNG pull await |
| `screenshot_dimensions` | wm-size command and unchanged dimensions parsing |
| `screenshot_read` | Local image read and base64 conversion, only when requested |
| `ocr_availability` | Cached availability check or version probe; unavailable is error/unknown |
| `ocr_engine` | Existing Tesseract execFile await; non-ADB failures remain unknown |
| `ocr_parse` | Existing local TSV parsing and confidence filtering |

The benchmark disables cache reads, OCR and reconnect. Its normal trace therefore
contains five high-level spans plus three nested `adb_attempt` spans, not fabricated
zero-duration spans for skipped work. Historical reports retain their original
five-span shape. All nested command/retry events share the observation clock.
`startMs` is relative to entry into this observation's timing context, not a
wall-clock timestamp. Errors caught by the existing fallback path still produce
an `error` stage even when `dumpUiTree` subsequently returns a result. This does
not change existing exception/fallback behavior or infer a timeout from duration.

Screenshot/OCR APIs now share these opt-in spans through native fallback or a
single public image/current-screen call; see [implementation and live evidence](reports/screenshot-ocr-timing-2026-10-18.md).
`runOcrOnImage` accepts the sink directly; `isTesseractAvailable(timeout, options)`
keeps its cached nonthrowing boolean contract. Cached false emits an error span;
no availability cache-hit field is exported. The capture CLI still disables OCR,
so it does not fabricate these spans. Its IPC allowlist and companion offline
importer accept them without changing the 128-event bound.

**Limits:** annotation shared sibling clocks/spans remain unimplemented.
Tesseract keeps its existing Node timeout; no ADB timeout provenance is inferred.
`adb_attempt` is local command-await time, not device CPU/UIAutomator internals.
`reconnect` measures caller waiting, not separate discovery/connect attempts.
Command and enclosing capture spans overlap; never sum them as elapsed wall time. Directory setup/cleanup, result
assembly, callback time and other uninstrumented work mean stage totals are not
the whole capture duration. Completed spans are streamed immediately over IPC,
validated/allowlisted by the parent and retained even if a later stage times out
or is interrupted. Each traced sample includes `traceComplete` and
`spansTruncated`; retention is capped at 128 spans per capture. `traceComplete`
means a worker result arrived without interruption/deadline/truncation, not that
the capture passed correctness or that every internal operation was instrumented.
An error result can therefore still have a complete trace.

Only completed spans received by the parent survive. A hard kill can lose queued
events; no span is fabricated for a stage that has not completed, and an empty
partial trace does not prove capture never started. No stage-start events or
interrupted-stage label are currently provided. Parent outcomes still record
explicit timeout/cancellation and elapsed time. The worker/parent now retain
allowlisted execution failure categories, including capture failures swallowed
by the existing fallback path (in their failed spans). Failed worker results
and parent-enforced interruption/deadline samples also carry `failureKind`.
A parent hard kill cannot fabricate the interrupted stage's failure metadata.
The companion profiler can now ingest these reports **offline** with
`node ~/projects/pi-android-perf/dist/capture-cli.js REPORT.json` after its build.
It preserves capture-local clocks and incomplete/truncated flags with sanitized,
failure-aware summaries. Automatic runtime hook ingestion is not implemented. Do
not treat this as complete Step 2 instrumentation or evidence of a device
performance improvement.

## Semantics and limits

- Exit 0: all requested captures correct, all `captureMs <= desiredMs`, no
  budget exhaustion/interruption. Exit 1: failed run. Exit 2: invalid config.
- Each attempt uses a fresh worker and `skipCache: true`; OCR and reconnect
  are disabled. Capture success requires UIAutomator's success marker before
  pulling XML, so a zero-exit idle-state error cannot validate a stale file.
  These opt-in controls do not change default tool fallback behavior.
- `captureMs` measures the actual `dumpUiTree` call. `ms` additionally includes
  worker startup/imports and shutdown. Worker startup is real harness overhead,
  not UI dump cost; compare `summary.capture` for capture distributions.
- `summary` latency distributions/`totalMs` use correctness-success samples;
  `wallTotalMs`, `failedMs`, attempts/failures/timeouts retain failed work.
  A correctness-success sample can still exceed the desired latency and fail
  the overall run. Desired 5s is an acceptance target, not a timeout inference.
- Parent-enforced deadlines kill the whole local worker/ADB process group,
  including siblings/descendants. SIGINT/SIGTERM cancel active work and produce
  a failed report. A timed-out run stops immediately rather than beginning
  another dump in uncertain device state.
- Killing ADB **does not prove device-side UIAutomator has stopped**. The CLI
  does not install a device-side cancellation helper. Cleanup/shutdown and
  filesystem operations may add scheduling overhead beyond deadlines; this is
  not a hard real-time guarantee.
- Temporary **local** XML is removed on success, failure, deadline and handled
  interruption. SIGKILL/host crash cannot run cleanup. Production's remote
  `/sdcard/pi-droid-ui.xml` is unchanged and may remain on the device.
- Workers suppress stdout/stderr and report only allowlisted outcomes/timings.
  JSON exports omit expectations, content, selectors, raw error strings,
  paths and device identifiers. Private expectation files are your responsibility.
- p95 is nearest-rank and small-sample descriptive, not a population claim.
  Optional high-level stage attribution is described above; no model latency,
  keyboard correctness, wireless stability guarantee or faster-backend claim
  is provided.

## Explicit execution metadata

`AdbError` preserves numeric exit code, signal/killed fields when provided by
Node, and a fixed `failureKind`. Raw command/stderr/message fields remain private;
only the category is attached to exported capture spans/results. Invalid or
unknown IPC categories are discarded, not copied into JSON. Parent retention,
malformed IPC and truncation are regression-tested through the actual CLI.

The ADB wrapper owns its deadline and records whether its timer or an explicit
`AdbExecOptions.signal` aborted first. It never infers timeout from elapsed time,
`killed`, SIGTERM or an error-message substring. Native execFile's opaque timer
is disabled. `timeout: 0` still disables the per-command deadline. Timeout,
cancellation, signal and buffer failures are not eligible for reconnect replay.
Ordinary classified transport-selection exit errors retain the existing retry.

This bounds/cancels a local ADB command via Node AbortSignal, not the whole
observation or its siblings, device-side UIAutomator, OCR subprocesses or
reconnect discovery. Node abort rejection need not wait for every descendant's
exit; it is not the benchmark parent's separate process-group cleanup guarantee.
Default tools do not yet uniformly forward their host cancellation signal.
Existing capture fallback behavior is unchanged; a caught dump timeout may
therefore leave a failed span followed by a successful fallback/foreground call.
Non-ADB capture errors remain `unknown`. Tracing is still off by default.

## User-requested multi-app workflow

The separate opt-in [Amazon.de → Forge protocol](WORKFLOW-E2E.md) and
[stored evidence](reports/workflow-evidence-2026-10-16.md) cover real typed values,
persisted workout drafts and the source before/after comparison. This capture-only
runner still never navigates or writes keyboard data. Do not conflate their
measurement scopes or reuse the workflow pair as a static-fixture speedup.

See [PLAN.md](PLAN.md) for progress and the exact next session action.
