# PNG concurrency safety — acceptance and interrupted-session recovery

## Result and scope

**PASS for the approved PNG ownership/cleanup slice**, with measured latency
regressions disclosed below. This is a correctness fix, not a demonstrated speedup.
User approved the bounded scope and validation sequence in the local session
`2026-10-18T16-16-51-528Z_01a14fcd-3744-7341-adbb-d2f21d5bdb4d`.
That session was interrupted during final validation/report preparation. The
continuation recovered existing files and completed host validation; it did not
repeat live runs or claim a reload of the parent extension.

Only production change: `src/adb/screenshot.ts`. Both `takeScreenshot` and
`screenshotBase64` now generate invocation-owned UUID remote/local paths. Successful
saved screenshots remain retained; quick and failed/partial local files are removed
best-effort. Remote cleanup runs on success/failure with recovery disabled, without
masking the primary outcome. Public return shapes, dimensions, base64 options,
existing capture/transfer policies and optional tracing remain unchanged. Cleanup
adds an ADB attempt using the caller's timeout/signal, so it is not free and cannot
guarantee deletion after transport loss or cancellation. No global capture lock,
XML-path redesign, runtime ingestion, production timeout change or input-lifecycle
change is included. Unique files do not make concurrent UI/navigation atomic.

## Preserved fresh real-phone evidence

See [pre-implementation checkpoint](png-baseline-2026-10-18.md).
A NEW chronological baseline at published `72559c9` was captured before production
edits. The frozen v3.2 driver and bounded consumer are unchanged.

| Attempt | Outcome | Elapsed ms | Captures | Scoped ADB attempts | Writes/readbacks |
| --- | --- | ---: | ---: | ---: | --- |
| before attempt1 | FAIL at execution, before shopping/Forge | 8907.61 | 1 | 1 | 0/0 |
| before attempt2 | PASS | 309200.60 | 77 | 291 | 30/30 |
| after attempt1 | PASS | 300495.09 | 76 | 288 | 30/30 |

The first failure is retained; no proven failure cause is inferred from bounded
error metadata. Passing before/after satisfy all shopping checks, 30 exact numeric
writes and 30 persisted readbacks. All **16 comparator gates pass** in
[comparison JSON](workflow-v3.2-png-comparison-2026-10-18.json) and
[comparison Markdown](workflow-v3.2-png-comparison-2026-10-18.md).

Before had three product/two field alignment cycles; after three/one. The pair's
**−8705.52ms (−2.82%)** is descriptive only: differing alignment work is retained,
not subtracted. No causal/population speedup, isolated PNG overhead or
non-inferiority claim follows. The workflow exercises screenshot through one OCR
call without a screenshot sink; its capture/command accounting is scoped, not a
whole-workflow screenshot/command count. All recorded contexts complete, no flat
span truncation or capture-stage errors in either passing run.

- Frozen driver SHA-256: `58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c`.
- Bounded consumer: `3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27`.
- Before engine: `a47e5b840af20e67f23c6e58b8576b66c26533c6838b60d0b5e5d4099f7a4b4e`.
- After engine: `8b60b55bebb4a9524f1434d684a96b78e6e1788297486eb8658c80dc472ff9d3`.

## Focused costs — regressions retained

Same frozen NEW `scripts/png-concurrency-check.mjs`, Settings → Termux app info,
three rounds/mode, mixed saved/base64 capture pairs. **12/12 correct PNGs on each
side**, 1080×2340; saved bytes match returned base64. Static concurrent success
cannot prove frame ownership; deterministic external-process tests do that.

| Mode/API | Before median ms | After median ms | Change |
| --- | ---: | ---: | ---: |
| sequential/screenshot | 367.74 | 560.36 | **+52.38% slower** |
| sequential/base64 | 314.52 | 518.04 | **+64.71% slower** |
| concurrent/screenshot | 360.42 | 556.41 | **+54.38% slower** |
| concurrent/base64 | 315.33 | 469.11 | **+48.77% slower** |

After cleanup-command medians respectively **83.73, 70.97, 59.79, 55.81ms**.
These are nested command spans, not additive operation wall time; cleanup alone
does not explain every observed difference. All success traces complete and
untruncated. Three samples/mode are descriptive, not population-tail evidence.
Independent per-call clocks are not merged with workflow or tool clocks.

Raw numeric evidence: `png-focused-before-2026-10-18.json` and
`png-focused-after-2026-10-18.json`. Frozen focused driver SHA-256:
`29fbbf4f0ce84585d1662fab0f3ff3ab60d3b5ab61576a6a421a51669341a115`.

## Actual fresh registered tools

Both fresh nonpersistent Pi JSON CLI runs explicitly loaded rebuilt `dist/index.js`,
with MCP/discovered extensions disabled. Actual registered
`android_screenshot(include_base64:true)` and
`android_look(include_image:true,all_elements:true)` each returned valid images;
look matched Settings foreground and exact numbered Termux/OPEN labels. Calls
matched starts/ends, no tool errors, agent settled/not aborted. Six build hashes
were checked unchanged during each run. **Parent session was not reloaded.**

| Tool | Before ms | After ms |
| --- | ---: | ---: |
| android_screenshot | 472 | 511 |
| android_look | 2563 | 2551 |

These are single tool-execute observations, not model latency/source spans or
concurrency coverage. Reports: `png-loaded-before-2026-10-18.json` and
`png-loaded-after-2026-10-18.json`. Frozen loaded driver SHA-256:
`b66835d034bc44f9191511abc966c6afa61584b095bf773b88aa3b40106c7fc2`.
Continuation independently rechecked focused before source against `git show
72559c9`, after source against disk, both driver hashes, and all six after build
hashes against a fresh rebuild. All matched. No production edits after live checks.

## Controlled regressions and final validation

- Public screenshot APIs plus external fake ADB: deterministic mixed saved/quick,
  saved/saved same timestamp, quick/quick interleavings preserve per-call frames.
  Capture/pull/read/dimension failures clean owned files; cleanup failure retains
  original success/error. Successful saved files remain. Ten cases, including
  parameterized failure scenarios. Original session recorded RED → GREEN.
- New comparator has **29 tests** covering passing evidence, adversarial correctness,
  provenance, incomplete tracing/cleanup, privacy and output exclusivity.
- Historical reconnect comparator now runs against an isolated matching `0034706`
  source fixture. Its script and measured reports remain unchanged; testing a
  historical checkpoint is not auditing today's screenshot source.
- Resume's initial two-worker units: **799/800**. Annotation's explicit 300ms
  synthetic deadline also timed out the supposedly successful UI sibling. The
  unchanged file passed **11/11** in isolation; unchanged sequential full units
  passed **800/800**. Host startup contention was a hypothesis, not a proven
  retrospective cause.
- A deterministic **400ms fake-process startup delay** then reproduced the exact
  failed sibling assertion (RED). The fixture now uses an explicit **1500ms test
  deadline** and a deliberately **4000ms fake screenshot delay**. Both 0/400ms
  startup cases must preserve screenshot timeout provenance, successful UI sibling,
  no fabricated annotation mapping and privacy. This is test-only: no production
  timeouts, live driver or acceptance checks changed. Targeted **12/12 GREEN**;
  final full units **801/801, 59 files, `--maxWorkers=2` PASS**.
- Isolated integrations **9/9 PASS**: extension-load 7 with 20s test allowance;
  sandbox-install 2 with 30s test/hook allowance (existing 60s install case).
- `npm run lint`, `npm run build`, new script syntax checks and `git diff --check`
  PASS. Default fully parallel CI remains unverified. Companion source unchanged;
  its prior 39/39 result is historical, not rerun in this continuation.

Private/temp validation logs: `$TMPDIR/png-resume-units.log`,
`png-resume-annotation.log`, `png-resume-units-sequential.log`,
`png-timeout-regression-red.log`, `png-timeout-regression-green.log`,
`png-resume-units-final.log`, `png-resume-integration-extension.log` and
`png-resume-integration-sandbox.log`. Initial interrupted final-test log remains
`$TMPDIR/png-safety-private/full-unit-final.log`. No claimed result from that
incomplete run. Original report-generation read-limit failure did not invalidate
source JSON; complete JSON parsing and current comparator tests pass.

## Safety and continuation

Original Gboard and Termux were independently verified after the saved live blocks.
Two TEST drafts retained: `E2E Lower v3.2 source-png-before98` and
`source-png-after98`, each 15 unchecked sets at 20kg × 8 with all values persisted.
No shopping mutation/completed workout/new APK/helper/permission/debug exposure.
This continuation made no phone UI changes. Historical drivers/reports unchanged.

Work is local and **not committed/pushed** at this checkpoint. Acceptance covers
PNG ownership/cleanup, with the above costs and controlled-path limitations. Next
slice requires new approval and fresh equivalent baseline/live/loaded gates; do
not silently bundle cleanup optimization, runtime ingestion or CI changes.
