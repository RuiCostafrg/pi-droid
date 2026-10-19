# Screenshot transfer/cleanup fusion — rejected experiment

## Decision

**REJECTED for shipping: no reliable latency improvement demonstrated.**
The user approved this bounded reversible experiment after the screenshot diagnosis,
including a binary-safe transport seam, shared execution policies, unchanged public
results/file ownership/error semantics and extra content-free observability.

The implementation passed functional phone/process checks but the larger focused
pair regressed. A separately counterbalanced transfer-only probe then found little
separation between the existing and fused approaches. Fewer commands is not enough
to justify the additional runtime/framing complexity. Only our own experimental
runtime/test-fixture changes were reversed; all measurements, failures, source and
tests are retained. **All active `src/` bytes match published 35de2c6 exactly.**
There is no accepted production speed optimization in this checkpoint.

Starting commit `35de2c6096e76caa6b69aa95af268ed0312d868d` independently matched
user-owned origin/main and the tree was clean. See the saved
[pre-production-edit checkpoint](fusion-baseline-2026-10-19.md).

## Experiment and observability

Only candidate production files were `src/adb/exec.ts` and `screenshot.ts`:

- Extracted existing text execution selection/deadline/classification/recovery into
  one shared executor. Added binary-to-file transport with backpressure, no text
  decoding/trim and no stdout/image-size cap. Existing maxBuffer bounds stderr;
  explicit Infinity remains supported. No second production recovery policy.
- Preserved per-command timeout, caller cancellation provenance, exact transport
  and narrow selection-failure retry rules. A compound transfer now includes
  deletion within that ONE command deadline, unlike the baseline's two command
  envelopes. This granularity difference is disclosed, not claimed equivalent
  aggregate operation budgeting. Existing device-side termination limits remain.
- Retained UUID-owned remote/local files, saved images, quick/partial disposal,
  wm-size dimension behavior and return shapes. No capture lock/cache/pool.
- Transferred raw bytes with non-PTY `adb shell -T`, then removed only the owned
  remote PNG. A random bounded ASCII footer records transfer/cleanup status. The
  host verifies/removes it on disk, not by decoding the image. Missing/invalid
  acknowledgements fail closed; remote transfer failure cannot become success
  merely because a legacy transport returned host exit0.
- Cleanup failure/uncertainty keeps the existing recovery-disabled best-effort
  fallback, without replacing the primary result/error. Successful confirmed
  transfer cleanup removes the separate cleanup command.
- Opt-in `onScreenshotCleanup` emitted fixed phase/outcome categories, sink-safe;
  no new IPC stage vocabulary or companion runtime integration. This option/helper
  exists ONLY in the archive now, not active production.
- Existing screenshot_transfer span includes binary streaming, remote cleanup and
  local footer validation/truncation. It does NOT isolate device transfer vs rm
  time. One public clock per call, diagnostic scope attribution and independently
  measured process/operation clocks remain separate.

The new frozen `fusion-check.mjs` adds eight reversed-order rounds, sequential and
mixed concurrent APIs, API-vs-validation wall times, bounded spans and cleanup
outcomes. Before ignores the not-yet-implemented optional callback (zero events).
After all32 events confirm transfer cleanup; zero fallback commands/errors.
PNG signature/IHDR/dimension/byte equality checks do not prove full decoding or
frame identity; deterministic interleaving tests provide ownership evidence.

Reports omit images, raw errors/commands, transport identifiers and IME identities.
No user data collection, APK/helper/permission/debugging exposure was added.

## Fresh chronological full v3.2 evidence

No production edit occurred before the NEW equivalent baseline, both focused
baselines and actual fresh registered-tool baseline. Frozen driver/consumer and
historical acceptance scripts/reports were not changed.

| Attempt | Outcome | Elapsed ms | Captures | Scoped ADB spans | Writes/persisted |
| --- | --- | ---: | ---: | ---: | --- |
| Before1 | FAIL initial native dump exit | 9067.91 | 1 partial context | 1 error | 0/0 |
| Before2 | PASS | 318324.82 | 79 | 297 | 30/30 |
| After1 | FAIL native dump timeout after query readback | 43043.31 | partial; see JSON | see JSON | 0/0 |
| After2, unchanged retry | PASS | 321845.17 | 80 | 300 | 30/30 |

Before1 failed before shopping/Forge; a subsequent read-only Amazon launch/native
inspection succeeded. No proven failure cause inferred. After1 retained explicit
15s native device_dump/adb_attempt timeout provenance, before offer checks/Forge;
no screenshot had been invoked there. Neither was discarded or called a fast run.

Both successful runs pass all shopping guards, 30 exact writes and all30 persisted
readbacks. Each had six product-alignment cycles; before had one field-alignment
cycle, after two. Descriptive raw delta **+3520.36ms / +1.11% slower**, never adjusted
by subtracting alignment work. One pair does not establish causal/population gain,
isolated overhead or non-inferiority. Scoped commands are NOT whole-workflow counts;
the workflow screenshot occurs through one OCR call without a screenshot sink.

New comparator passes **17/17** functional/provenance gates, including independent
baseline/archived-candidate engine hashes, only two approved production changes,
correct checks/writes/persistence/retained work and both focused report contracts.
Its final archival output explicitly says REJECTED experiment, not active-production
optimization acceptance. Original pre-rollback comparison output is also retained.

Retained TEST drafts: `E2E Lower v3.2 source-fuse-before14` and
`E2E Lower v3.2 source-fuse-after14`, each15 unchecked sets at20kg ×8. After1 created
no draft; retry reused that unused public label. No real workout completed.

## Focused results — contradictory blocks, regressions disclosed

### Frozen png-concurrency-check, three samples per mode/API

12/12 correct each side; its wall includes harness validation:

| Mode/API | Before median ms | After median ms | Change |
| --- | ---: | ---: | ---: |
| Sequential saved | 570.76 | 548.97 | −3.82% |
| Sequential base64 | 510.09 | 456.80 | −10.45% |
| Concurrent saved | 584.69 | 509.64 | −12.83% |
| Concurrent base64 | 499.28 | 468.57 | −6.15% |

### New frozen fusion-check, eight samples per mode/API

32/32 correct each side; API wall EXCLUDES validation/disposal:

| Mode/API | Before median ms | After median ms | Change |
| --- | ---: | ---: | ---: |
| Sequential saved | 523.83 | 578.57 | **+10.45% slower** |
| Sequential base64 | 451.14 | 500.38 | **+10.92% slower** |
| Concurrent saved | 511.53 | 593.02 | **+15.93% slower** |
| Concurrent base64 | 446.63 | 501.32 | **+12.25% slower** |

No cross-runner wall comparison is controlled. Capture medians also changed:
eight-round before roughly336–349ms, after368–399ms. Transfer envelope rose from
roughly30–36ms to102–117ms, now INCLUDING rm/footer work formerly outside it.
Do not subtract medians/nested spans to claim isolated cause or saved overhead.
Successful command counts declined saved4→3, quick3→2, but this is not a speedup.
No first sample, failure or regression was excluded.

## Transfer-only follow-up

`fusion-transport-probe.mjs` counterbalances eight rounds of three variants. Each
owns/captures a fresh UUID PNG; capture is recorded separately and excluded from
the transfer+cleanup interval. All24 measured transfers/PNG validations PASS:

| Variant | Median ms | Min–max ms |
| --- | ---: | ---: |
| Existing adb pull + rm | 88.60 | 73.50–146.84 |
| Fused shell -T | 87.28 | 64.78–115.01 |
| Fused exec-out diagnostic ONLY | 86.18 | 69.46–111.44 |

Intervals include local footer validation/truncation where applicable, but exclude
PNG validation. The extra unconditional safety cleanup in the diagnostic finally
is OUTSIDE measured transfer+cleanup. The point is comparison, not total workflow
time. Eight observations, reversed order rather than randomization; no population
or tail claim. These small median differences do not justify shipping complexity.

Read-only constant-output protocol probes showed shell -T on this phone separates
stderr/exit7; exec-out merges stderr into stdout and returns host exit0. An initial
extra-quoted exec-out command was malformed and is not a capability/timing result;
corrected forms established the diagnostic protocol observation. No screen/user
content was probed. Nonzero legacy footer behavior is controlled-test evidence,
not a live old-Android acceptance claim. No production exec-out variant was installed.

## Connectivity interruption and continuation

The first transport-probe launch stopped at opt-in validation because device
selection was empty/offline: no report or measured probe existed yet. A secure
rediscovery briefly returned an endpoint, but readiness failed and refresh still
reported unreachable. Subsequent auto-discovery found no service; host adb devices
was empty. User asked to continue. Host-side validation continued while blocked.

A later secure rediscovery found a reachable authorized transport; current Gboard
and Termux were independently verified BEFORE resuming, then after the24-sample
probe. No old endpoint guessed, legacy TCP/IP enabled, pairing performed, forced
disconnect, network setting changed or phone helper installed. No cause of the
connectivity interruption is asserted. No identifier is retained in these reports.

## Controlled tests, review and rollback verification

- Binary helper RED before implementation (missing helper); GREEN then covers
  hostile bytes/12MB image with1KB diagnostic cap, explicit timeout/cancel/exit/
  stderr-buffer provenance, and timeout return despite a SIGTERM-ignoring fake child.
  Controlled fake PID is killed by test cleanup; no real process/device killed.
- Public screenshot RED (no cleanup acknowledgement/extra command) then GREEN:
  exact binary/saved bytes, missing/invalid/legacy nonzero footer, partial transfer,
  dimensions, successful image despite cleanup failure, throwing sink safety.
- Existing deterministic PNG frame interleavings/same-timestamp saved files/quick
  removal, read/dimension/transfer failure and primary-error preservation retained.
  Fixtures adapted to binary transfer; read failure still explicitly exercised by
  deleting only the owned sandbox file through the optional event seam.
- Shared recovery checked for binary transport and exact-transport no-recovery.
  One new expected string was accidentally escaped as literal backslash-n; corrected
  to newline after the controlled failure. Production bytes were already correct.
- New fusion comparator35 tests include adversarial provenance/checks/values/
  partial traces/cleanup events/scope/private fields/output exclusivity. It audits
  archived candidate source after rollback, never today's baseline as the candidate.
- First full candidate units **823/826**, three historical PNG positive comparator
  cases failed because that historical test audited current candidate source.
  Frozen comparator/reports remain untouched; fixture now extracts matching
  published b050b7f source. Its unchanged historical contract passes29/29.
- Full candidate-tree units **861/861 /63 files (--maxWorkers=2), 266.91s PASS**,
  before rollback/final archival-audit adaptation. Earlier targeted63/63 and
  subsequent22/22 PASS; the prior newline-literal failure is retained in private
  logs. No default parallel CI claim.
- Rejected candidate source archived as .txt plus an exact replay patch. Reverse
  applied only our changes. `git diff --exit-code 35de2c6 -- src` PASS. No active
  cancellation/transport/API change remains. Supporting candidate fixture edits
  and15 new candidate tests were archived/reverted, not left failing in main.
- Independently extracted35de2c6, applied archive patch outside active tree, compared
  both source files byte-for-byte, reused existing dependencies without installing.
  Isolated replay **41/41** targeted tests PASS. Its fresh rebuild matched ALL SIX
  measured experimental loaded-after hashes.
- Restored active full units **844/844 /61 files (--maxWorkers=2), 265.05s PASS**,
  lint/build/three new script syntax checks and whitespace PASS. Isolated restored
  integrations **9/9 PASS** with existing20s/30s allowances. Companion unchanged/
  not rerun; default fully parallel CI unverified.
- Restored fresh build independently matched all six pre-edit loaded hashes.
  Another actual fresh registered screenshot/look run PASS on restored build,
  **1443/3784ms**, all image/index/checks and unchanged build hashes. These late
  single observations were slower and are retained; changed time/connectivity/
  state precludes calling them a controlled before/after or a rollback speedup.
- Manual review against approved scope and repo policies: no independent review
  sub-agent was available. Standards concern was added transport/framing complexity;
  spec concern was unproven speed benefit/mixed overhead. Rejection avoids shipping
  either concern. Do not describe this as independent or multi-agent review.

## Registered tools and safety

Fresh nonpersistent Pi JSON CLI explicitly loads rebuilt dist/index.js; no MCP or
discovered extensions. Actual screenshot(include_base64:true) and look(image/all)
checks pass, exact Settings/Termux/OPEN index, valid PNGs, matched starts/ends and
settled/not aborted. Six build hashes verified unchanged during each call:

| Build | Screenshot ms | Look ms |
| --- | ---: | ---: |
| New pre-edit baseline | 591 | 2544 |
| Candidate after | 569 | 2600 |
| Restored baseline, later | 1443 | 3784 |

No parent interactive extension reload claim; source/tool/model clocks not merged.
No raw events/images exported. Gboard/Termux independently queried after EACH live
attempt/block and after the connectivity recovery/restored-tool check. Amazon stays
read-only; Forge changes only in the two disclosed TEST drafts. No completed
workout/APK/helper/permission/debugging exposure or persistent device change.

## Artifacts and next action

- Full reports: `workflow-v3.2-fusion-{before,after}-attempt{1,2}-2026-10-19.json`.
- Focused reports: `fusion-focused-{before,after}-2026-10-19.json` and
  `fusion-metrics-{before,after}-2026-10-19.json`.
- Registered tools: `fusion-loaded-{before,after,restored}-2026-10-19.json`.
- Transfer probe: `fusion-transport-probe-2026-10-19.json`.
- Original comparison and final archived comparison JSON/Markdown both retained:
  `fusion-comparison-2026-10-19.*`, `fusion-archived-comparison-2026-10-19.*`.
- [Archive/replay](../experiments/fusion-shell-v1/README.md), pre-edit baseline
  checkpoint and frozen new scripts. Existing historical evidence unchanged.
- Private logs: `$TMPDIR/fusion-transfer-red.log`, `fusion-screenshot-red.log`,
  `fusion-targeted-1.log`, `fusion-targeted-2.log` (new newline-literal failure),
  `fusion-units-first.log` (historical-fixture failures),
  `fusion-units-experiment-final.log`, `fusion-archive-replay.log`,
  `fusion-units-restored-final.log`, `fusion-restored-integrations.log`.
- New script setup failures: fusion-check extra parenthesis and an accidentally
  identical no-op replacement fixed before its first measurement. New comparator
  generation initially included literal backslash-n tokens; syntax check rejected
  it before execution/report creation, corrected before comparison measurements.
- Final staged whitespace check initially flagged unified-patch blank context lines
  as trailing spaces (patch data, not runtime source). Archives were regenerated
  with zero context; use `git apply --unidiff-zero`. Fresh isolated application
  reconstructs all12 archived source/test files byte-for-byte; source-only reverse
  check also passes. No measured source or historical report changed.

Next: agree a DIFFERENT single bounded optimization or a deeper device-capture
measurement before any new production edits. No automatic adoption of exec-out,
PNG-derived dimensions, pooling/caching, cancellation/input/CI changes. Explain
interface/error/dimension tradeoffs first. Any production slice needs a NEW current
equivalent chronological baseline/full v3.2 pair/focused metrics/actual freshly
loaded relevant tools with build hashes. These historical experimental runs are
not indefinitely reusable. No speedup, cumulative gain or accepted optimization
has been established by this experiment.

## Verified publication

Rejected experiment/source archive/tests/evidence published as
**40cbb332f0ff6a030c42ef687e8a27e85e869b5d** to user-owned origin/main.
`git ls-remote origin refs/heads/main` independently matched the full local hash;
working tree was clean. No upstream push. This follow-up docs-only checkpoint
records publication, not an accepted optimization. Active source and measured
artifacts remain unchanged after validation/rollback.
