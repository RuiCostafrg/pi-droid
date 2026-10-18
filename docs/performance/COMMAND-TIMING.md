# Loaded native-only observation and command timing continuation

**Later continuation:** screenshot/OCR timing is now implemented and live-checked;
see [2026-10-18 evidence](reports/screenshot-ocr-timing-2026-10-18.md). The earlier
checkpoint and remaining-path audit below describe their original chronology.
Annotation and automatic runtime ingestion remain separate open slices.

Checkpoint at start: pi-droid `4a8534d`, companion `d7d1193`, both clean.
Historical reports, archived adapters and frozen v1/v2 drivers were not edited.
This slice adds diagnostics, not an observation/backend speed optimization.

## Loaded-session check (2026-10-17)

The fresh continuation session's actual `android_ui_dump` schema exposes optional
`all_elements` and `ocr_fallback` booleans. A **direct loaded-tool call**, not a
source-registered harness, accepted:

```json
{"all_elements":true,"ocr_fallback":false}
```

Read-only fixture: Settings → Termux app info, opened through the standard app
info intent. Returned package was Settings, 46 elements; the exact `Termux` title
was present as `[non-interactive]` and the exact `OPEN` button was present.
Neither control was activated. An initial direct dump also read the already-open
Settings page. No screenshot/OCR tool was invoked. This checks schema acceptance
and information output; it is not an independent subprocess-count trace of the
loaded tool. Native-only screenshot exclusion/error propagation have the existing
registered-tool process-boundary regressions. No loaded-tool latency comparison
or broader input-lifecycle verification is claimed.

Discovery anomaly: device registry discovery returned zero and secure mDNS auto
reported no service; ordinary loaded ADB tools nevertheless worked. Readiness
succeeded. Preflight confirmed ADB authorization/screen/storage and reported only
the expected inactive ADBKeyboard check (original Gboard was active). No keyboard
input was needed: the IME was never changed. No pairing, legacy TCP/IP, APK,
permission, settings change or new app record was introduced. Termux was relaunched
and a separate shell query verified both foreground `com.termux` and the original
Gboard component before coding resumed. Transport identifiers are omitted here.

## Implemented boundary

`AdbExecOptions.onCaptureSpan` opts into fixed-field diagnostics. `dumpUiTree`
creates one monotonic context and passes it into nested commands. Standalone
`adb` calls create their own context. An internal `captureClock` carries the same
origin across commands/retries; input options are copied, not mutated.

- `adb_attempt`: one local `execFile` await, stdout trimming and explicit failure
  conversion. Ends **before** recovery begins. Preserves the wrapper's observed
  timeout/cancel/exit/signal/spawn/buffer categories. Option/serial validation and
  dynamic-import setup are not command attempts and produce no fabricated span.
- `reconnect`: awaited secure recovery, including waiting on another caller's
  single-flight recovery. It is not a breakdown of discovery/connect commands.
  Non-ADB discovery failures are `unknown`; the final command error keeps its
  original category, as before. Retry rules and cancellation behavior are unchanged.
- Completed nested spans stream over the existing capture IPC channel; its fixed
  allowlist now accepts both stages. Default-disabled behavior, 128-event cap,
  sanitization and incomplete/truncated flags remain intact.

Stages overlap: command-attempt durations nest inside dump/transfer/foreground;
never sum all stages as wall time. A retry produces an error attempt, reconnect
and another attempt, not one successful attempt hiding failed work. Callback
exceptions cannot alter command/retry results. Commands, arguments, content,
identifiers, paths and raw errors are not attached to spans.

## Remaining-path boundary audit

Read `screenshot.ts`, `ocr.ts`, `reconnect.ts` and `annotate.ts` before this slice.
Screenshot capture is shell screencap → pull → dimensions query → optional local
base64 read; `screenshotBase64` is a separate capture/pull/read/cleanup path. Both
use the existing fixed remote PNG path (concurrent capture safety is not fixed).
OCR has a cached availability probe, optional screenshot, Tesseract exec and local
TSV parse. The existing availability boolean collapses probe failures to false;
future probe spans must not misreport that false result as successful availability.
Tesseract uses its own subprocess timeout, not the ADB wrapper's explicit deadline;
do not invent ADB timeout provenance for it. Annotation starts screenshot and dump
in parallel and then maps elements/builds the text index; no image compositing is
performed there. Future instrumentation must share one clock across those siblings
and keep completed nested spans distinct from parent elapsed time. Current parallel
failure does not cancel sibling work. No backend/concurrency/timeout policy was
changed to add command/recovery diagnostics.

## Companion ingestion

`~/projects/pi-android-perf/src/capture.ts` and `capture-cli.ts` provide **offline**
version-1 traced capture-report ingestion. Build and run:

```sh
cd ~/projects/pi-android-perf
npm run build
node dist/capture-cli.js /path/to/traced-capture-report.json
```

The importer retains capture-local clocks, correctness outcomes, explicit fixed
failure categories, completeness/truncation flags and failure-aware stage totals.
It does not copy arbitrary report keys, infer timeout from duration, merge clocks
into tool timelines, fabricate missing stages or execute phone commands. Limits:
4 MiB input, 100 captures, 128 spans per capture. Invalid/untraced input fails with
a fixed message without echoing its filename/content. Old high-level reports are
supported: the preserved 20-round Settings baseline was successfully imported
without modifying the report (20 attempts for each of its five original stages).
Automatic runtime hook ingestion, screenshot/OCR/annotation internals and finer
reconnect subcommands remain open.

## Validation and limits

- pi-droid bounded full unit run: **665/665, 51 files**; lint/build, capture-script
  syntax and whitespace checks pass. Isolated sequential integrations: **9/9**
  with the tracker’s existing 20s test / 30s hook allowances.
- New tests cover disabled direct command tracing and reconnect success/failure;
  existing process-boundary cases now also assert attempt spans for all seven
  explicit failure categories, throwing sinks and private-field exclusion.
  Capture/IPC tests verify nested ordering and partial retention under timeout
  and SIGTERM. Concurrent recovery still uses one discovery with per-caller spans.
- Companion: **36/36** tests, build/check; includes bounded CLI input, malformed
  events, privacy allowlisting, old stages, partial empty traces and failure totals.
  Initial companion run was 31/32: an overbroad test regex matched the fixed word
  `commands` in the explanatory note, not a private value. The assertion now checks
  private sentinels and serialized keys; no production privacy rule was weakened.
- No new live performance measurement, paired speed comparison, default parallel
  CI repair, device-side cancellation or automatic input lifecycle is claimed.
  Existing text-observation result remains **no demonstrated latency speedup**.

## Live acceptance follow-up — 2026-10-18

The successful-path full real-phone workflow and separate loaded-tool check now
pass; see [complete evidence](reports/workflow-command-validation-2026-10-18.md).
Both immutable live attempts preserve all 30 exact numeric writes and all 30
persisted readbacks. Current ran first (283.303s / 72 captures), isolated
pre-instrumentation reference second (290.458s / 74 captures), both collected
AFTER implementation. Reference needed two additional unchanged alignment cycles
(7.173s), approximately the raw difference: no demonstrated speedup or isolated
instrumentation-overhead estimate. Same frozen driver and bounded consumer;
expected engine differences were independently verified.

Current emitted 276 successful command-attempt spans within traced hierarchy and
selection paths, not a whole-workflow command count. No live reconnect/failure
was forced; exact transport disables recovery in this driver. Nontruncation and
stage accounting pass, but the frozen workflow has no traceComplete flag or
independent screenshot counts. Loaded Settings dump passes both options and exact
fixture labels; metadata-only tool time 2654.78ms. Source and tool clocks remain
separate. Earlier failed/wrong-fixture loaded probes are disclosed, not hidden.

Validation rerun: 665 units, 9 isolated integrations, lint/build and byte-equal
changed dist files; companion 36 tests, build/check. Original Gboard and Termux
independently verified after each run/check. Two new disclosed test drafts remain,
11 including historical nine; no real workout finished or shopping mutation.

Next: capture a FRESH equivalent baseline BEFORE screenshot capture/transfer/
read/dimension and OCR availability/engine/parse spans. Test controlled success/
failure, privacy and defaults, then repeat full real-phone E2E and loaded-tool
acceptance. Annotation and automatic runtime ingestion follow separately. Do not
attribute UIAutomator variance to internals that have not been measured.
