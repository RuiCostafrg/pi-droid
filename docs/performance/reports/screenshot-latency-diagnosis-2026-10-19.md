# Screenshot latency diagnosis — 2026-10-19

## Status and agreement

**Diagnostic slice complete; no production optimization implemented or approved.**
The user approved diagnostic-first scope and public-API/external-process test seams,
then explicitly encouraged additional logs/metrics. Initial published checkpoint
was `d211b537e8b4780c445028deb2f2c6cb1f2f1f36`, independently matching user-owned
origin/main, with PNG implementation `b050b7f` and docs checkpoint `c37e2e8` in
its ancestry. Working tree was clean. Changes since b050b7f were documentation-only.

Only new diagnostic scripts, tests, evidence and documentation were added. All
`src/` files, historical measured drivers/reports and workflow protocols remain
unchanged. No new equivalent full-workflow pre-optimization baseline has been
captured; these focused runs are NOT a substitute for that gate.

## Initial evidence and hypotheses

The historical PNG focused regression was 48.77–64.71%, three samples/mode.
Re-reading its JSON showed capture medians also rose, not just cleanup cost:

| Mode/API | Historical before capture ms | Historical after capture ms |
| --- | ---: | ---: |
| Sequential saved | 284.05 | 367.04 |
| Sequential base64 | 286.05 | 380.83 |
| Concurrent saved | 266.17 | 381.89 |
| Concurrent base64 | 285.80 | 385.45 |

Historical after cleanup-command medians were 55.81–83.73ms. Medians/nested
spans cannot be added or subtracted to attribute the full operation regression.

Ranked hypotheses were disclosed before live probes:
1. Device/capture/run-order variability; repeat unchanged source/driver.
2. Added command round-trip cost; measure cleanup and an independent shell no-op.
3. File location/name effects; counterbalance equally UUID-owned paths.

After the first block, the source diff suggested a fourth hypothesis: old captures
overwrote an existing shared PNG while new captures create a fresh owned file.
Test this only within UUID-owned diagnostic probes, never by restoring a shared
production filename. This follow-up and an unchanged repeat were disclosed before
execution. No device-side CPU/thermal/compositor instrumentation was added; causes
inside capture remain unresolved, not inferred from host process clocks.

## New observability and contracts

- `scripts/screenshot-latency-diagnostic.mjs`: public `takeScreenshot` and
  `screenshotBase64`, eight rounds, reversed API order on alternating rounds,
  sequential calls and concurrent mixed pairs. Uses the existing explicit
  `captureClock` seam, one clock per invocation. Adds fixed-vocabulary `scope`
  attribution at span emission without changing production tracing vocabulary.
- `adb_attempt` outside a public screenshot stage is honestly `unscoped` (currently
  remote cleanup), not a fabricated production cleanup envelope. Failed cleanup
  stays visible even though the public API deliberately preserves success.
- `publicMs` is recorded immediately after the API returns, excluding harness PNG
  validation/saved-file disposal. `totalMs` includes validation/disposal. The
  historical focused runner includes validation in its measured `ms`, so these
  new public wall medians are NOT an equivalent historical before/after pair.
- Bounded 128-span traces; failures retained as partial. Success completion means
  the awaited public call and synchronous sink settled, not device-wide atomicity.
- Independent direct ADB probes record host spawn, first stdout and close times,
  stdout/stderr byte counts, success and fixed failure categories. An explicit
  timer supplies direct-process timeout provenance. They do NOT measure device
  CPU, encoding, network isolation or production reconnect/cancellation behavior.
- Direct variants: shell no-op; fresh long-name UUID PNG on `/sdcard`; fresh shorter
  UUID basename on `/sdcard`; fresh long-name UUID PNG in `/data/local/tmp`.
  All capture variants are pulled/validated and their owned files removed.
- `scripts/screenshot-file-creation-diagnostic.mjs`: eight reversed-order rounds,
  four variants (fresh/overwrite × sdcard/localtmp). Each sample first captures
  to its own UUID file, then measures capture to the same file or a second owned
  fresh file. Prime and measurement retained. No shared path or persistent helper.
- Signature/IHDR/dimensions and saved-file/base64 byte equality checks are bounded
  validation, not a complete PNG decode or concurrent-frame-identity proof. Existing
  deterministic PNG interleaving tests supply the ownership evidence.
- Reports exclude image content, commands, raw errors, paths, IME identities and
  device endpoints. Source filenames/hashes, numeric dimensions and byte counts
  are retained. Output is reserved exclusively before phone interaction, private
  mode 0600; progress saved after completed rounds. Abrupt interruption inside a
  round could lose that round's in-memory records; these three runs all completed.

## Live results — all attempts preserved

Chronology: diagnostic attempt1 → file-creation attempt1 → unchanged diagnostic
attempt2. No builds/tests ran concurrently with measurement. Settings → Termux
app info title/OPEN labels and native foreground were checked before each block.
All three attempts PASS. No failed live attempt was discarded.

### Unchanged public API repetitions

Each cell has eight samples; each block has **32/32** successful public captures,
plus **32/32** direct probes. There were no public span errors/truncation.

| Mode/API | Block 1 public median ms | Block 2 public median ms | Block 1 capture median ms | Block 2 capture median ms | Block 1/2 unscoped command median ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sequential saved | 602.29 | 527.62 | 394.30 | 337.75 | 75.53 / 65.95 |
| Sequential base64 | 494.76 | 467.33 | 377.28 | 341.67 | 68.79 / 70.16 |
| Concurrent saved | 580.23 | 532.53 | 396.00 | 355.27 | 68.35 / 66.69 |
| Concurrent base64 | 494.63 | 450.58 | 392.30 | 352.37 | 61.98 / 59.83 |

Source and runner hashes match independently across both blocks and current disk.
Capture medians changed by about 36–57ms without an implementation change.
That establishes between-block variation in these observations, NOT its cause
or an estimate of how much historical regression was environmental.

The offline summary constructs disjoint intervals PER CALL from outer screenshot
stages plus unscoped command spans, verifies nonoverlap/envelope containment, then
summarizes the remaining time. Median uncovered time was **2.55–4.71ms** in block1,
**2.85–3.36ms** in block2. This is not the sum of nested spans or a difference of
medians. It does not isolate diagnostic instrumentation overhead or every host
operation. Current elapsed time is largely attributed, but the capture stage is
still an opaque host-observed envelope.

### Independent process probes

Eight samples/variant/block, host close-time medians:

| Variant | Block 1 ms | Block 2 ms |
| --- | ---: | ---: |
| No-op shell | 57.72 | 49.71 |
| sdcard long UUID capture | 372.16 | 335.61 |
| sdcard shorter UUID capture | 374.08 | 347.21 |
| localtmp long UUID capture | 355.62 | 330.50 |

Host spawn medians in block1 were about 9–11ms. First-output is not capture
completion; screencap may emit no stdout. Shorter filename has no useful signal.
Localtmp's modest descriptive advantage shrank in the repeat; this is not a
well-supported sole explanation or a justified production path change.

### Fresh versus overwrite

**32/32** successful probes; every probe retains prime and measured capture,
transfer/PNG checks and cleanup. Eight samples/variant:

| Variant | Prime median ms | Measured median ms |
| --- | ---: | ---: |
| sdcard fresh | 357.36 | 339.05 |
| sdcard overwrite | 340.42 | 324.14 |
| localtmp fresh | 329.78 | 332.18 |
| localtmp overwrite | 336.66 | 332.79 |

The roughly 15ms sdcard fresh/overwrite median difference is descriptive and much
smaller than the historical capture increase. Localtmp shows essentially none.
Separate samples are not identical frames or randomized causal pairs. Prime-first
ordering/cache effects and changing device state remain confounders. No reuse pool,
shared filename, serialization or weakened ownership was implemented.

## Findings and proposed next approval

1. Extra remote cleanup is a real additional awaited command, consistently tens
   of milliseconds here. It is NOT a complete explanation of the historical
   operation regression.
2. Historical capture-stage increase has no demonstrated single root cause.
   Temporal variation is visible; no-op/path/overwrite probes do not resolve
   capture internals. Do not label it a proven FUSE, UUID, CPU or thermal bug.
3. Shortening filenames or merely moving the file is not the recommended fix.
4. **Candidate for separate user confirmation:** a bounded command-consolidation
   experiment that transfers the invocation-owned PNG and performs best-effort
   deletion in the same binary-safe ADB process, keeping failure cleanup as a
   fallback. This targets observed round-trip cost rather than claiming to solve
   every capture-stage difference. It has NOT been implemented or benchmarked.

Before implementing that candidate, confirm exact transport/interface semantics:
raw PNG must not pass through existing text trim/decoding; no new image-size cap
relative to `adb pull`; preserve primary errors, timeout/cancellation/recovery
policies, unique frames/paths, saved retention and quick/partial disposal. Extend
the existing transport policy rather than silently creating a second production
recovery/cancellation implementation. Scope would include a binary-to-file transport
seam in `src/adb/exec.ts` plus screenshot integration, not just screenshot.ts.
A prototype can be rejected if preserving those contracts is not a bounded change.

Public/API plus external-process tests must exercise hostile binary bytes,
interleavings, partial transfer, read/dimension failures, cleanup failure, timeout
provenance, caller options and retained files. Observability must expose transfer
and cleanup outcomes without raw content; compound-process timing cannot pretend
to isolate device substeps without a separate supported measurement.

Only after approval: NEW equivalent chronological baseline before any production
edit, frozen full v3.2 pair with shopping + 30 writes + 30 persisted values, focused
pair, fresh actual registered screenshot/look calls and build hashes, full review/
validation. Never reuse this diagnostic or historical PNG pair as the new baseline.
Runtime ingestion, cancellation redesign, input lifecycle and CI remain separate.

## Validation, failures and safety

- New controlled diagnostic tests: **8/8 PASS**, covering unchanged public API
  results, scope attribution, trace bounds/partial failures, swallowed cleanup
  failure visibility, process boundaries/output privacy, explicit timeout, exclusive
  output reservation and disjoint-interval validation (overlap/out-of-envelope RED
  cases plus even/odd medians).
- Initial new targeted run before the interval test: **7/7 PASS**. Later combined
  unchanged reconnect/new diagnostic isolated run: **22/22 PASS**.
- Initial full two-worker command was terminated at its **180s tool deadline**,
  with no final suite summary. It had already recorded one existing reconnect
  test failure: serialized numeric spans unexpectedly matched
  `/PRIVATE|192\\.0|42000|private|shell/`. Complete serialized failure detail was
  not emitted before termination, so do not assert actual content leakage,
  accidental numeric match or a proven flake cause. Existing test unchanged.
- Unchanged isolated reconnect rerun **14/14 PASS**. Full rerun with 600s tool
  allowance completed in **233.13s: 809/809 units, 60 files, --maxWorkers=2 PASS**.
  Initial incomplete/failed run is retained, not relabelled passing.
- `npm run lint`, `npm run build`, all three new script syntax checks PASS.
  Isolated sequential integrations **9/9 PASS**, using existing documented
  `--testTimeout=20000 --hookTimeout=30000`; default full-parallel CI unverified.
- Offline summary/audit PASS: recorded success/completeness, expected counts,
  current source/driver hashes and disjoint timing envelopes independently checked.
  The summary is not proof arbitrary supplied reports were honestly measured.
- Companion unchanged/not rerun. No fresh actual registered-tool check or full
  v3.2 pair was run because no production implementation changed; no acceptance
  claim for a new optimization or parent extension reload follows.
- Authorized device freshly discovered; readiness passed except ADBKeyboard was
  inactive. This screenshot-only block correctly left Gboard active. After EACH
  live run, original Gboard and Termux foreground were independently queried and
  matched. Device screen-state check also showed unlocked Termux afterward.
- Amazon/Forge untouched; no shopping mutation, TEST draft, completed workout,
  APK/helper installation, permission or debugging exposure. Direct temporary
  files on both storage roots and host scratch were removed on all successful
  probes. No persistent phone change or shared production path introduced.

Private validation logs: `$TMPDIR/screenshot-diagnostic-units.log` (incomplete +
existing failure), `screenshot-diagnostic-targeted.log`,
`screenshot-diagnostic-units-final.log`, `screenshot-diagnostic-integrations.log`.

## Artifacts / reproduction

All retained reports are in this directory:
- `screenshot-latency-diagnostic-2026-10-19-attempt1.json`
- `screenshot-file-creation-diagnostic-2026-10-19-attempt1.json`
- `screenshot-latency-diagnostic-2026-10-19-attempt2.json`
- `screenshot-latency-summary-2026-10-19.json`

Live scripts require `PI_DROID_SCREENSHOT_DIAG=1`, freshly discovered exact
`ANDROID_SERIAL`, a NEW output path and optionally `PI_DROID_DIAG_ROUNDS` (2–20,
default8). Run `node --import tsx scripts/screenshot-latency-diagnostic.mjs NEW.json`
or `screenshot-file-creation-diagnostic.mjs` from Termux, with exclusive hands-off
phone use. Do not run tests/builds concurrently. Do not expose the transport value.

Offline audit, from repository root (NEW output, no phone interaction):

```sh
node scripts/summarize-screenshot-latency.mjs \
  docs/performance/reports/screenshot-latency-diagnostic-2026-10-19-attempt1.json \
  docs/performance/reports/screenshot-latency-diagnostic-2026-10-19-attempt2.json \
  docs/performance/reports/screenshot-file-creation-diagnostic-2026-10-19-attempt1.json \
  /private/NEW-summary.json
```

No speedup, population/non-inferiority, cumulative end-to-end gain or completed
optimization acceptance is claimed. This is an observability/diagnosis checkpoint.
