# Capture-envelope diagnostic — validated, production unchanged

## Decision and approved scope

**Diagnostic slice complete within the disclosed scope. No screenshot optimization implemented.**
User approved a bounded device-side capture-envelope diagnostic, its external-process/public screenshot/offline-audit test seams, and reiterated full Amazon → Forge validation. After two baseline failures, the user requested another retry and continuation. The unchanged third baseline passed; no workflow adjustment or guard relaxation was necessary.

Starting published checkpoint `21b30855ae70a262ea22fc9559d741484798c1ce` matched local HEAD, origin/main and an independent remote query; tree was initially clean. All active `src/` remains byte-identical to published `35de2c6`. Rejected fusion stays archived, not active or reintroduced. Historical measured scripts, reports, comparators and protocol versions are unchanged.

New files:
- `scripts/capture-envelope-diagnostic.mjs`
- `scripts/audit-capture-envelope.mjs`
- `scripts/compare-workflow-capture-envelope-v1.mjs`
- `tests/adb/capture-envelope-diagnostic.test.ts`
- `tests/adb/capture-envelope-audit.test.ts`
- New evidence and tracker/handoff updates only.

## New observability and limits

The diagnostic counterbalances eight rounds of three variants, reversing order on alternating rounds:

1. **Plain:** unchanged `screencap -p` to a fresh UUID-owned `/sdcard` PNG.
2. **Bracketed:** the same capture with device elapsed readings immediately before/after its command, using shell built-in reads from `/proc/uptime` and fixed numeric markers.
3. **Control:** the same bracket around shell `true`, without capture or transfer.

All capture variants retain separate `adb pull`, separate owned remote deletion, local PNG validation and local disposal. No binary transport/footer/transfer-cleanup fusion, filename pool, cache, alternate backend or production dimension semantic change.

- A separate bracketed `sleep 0.05` capability check verifies parseable advancing device time and sufficiently fine representation before samples. This is not a calibrated sleep or clock-accuracy measurement.
- Observed device representation quantum **10ms**. Reported `clockQuantumMs` means representation precision, not independently measured accuracy/resolution. The audit rejects unsupported/coarser clocks, unequal precision, reversed/nonfinite/oversized intervals and malformed markers.
- Absolute uptime exists only transiently in bounded parser memory; exports contain elapsed device milliseconds, representation quantum and fixed exit/status categories. Marker buffering is capped at1024 bytes; no new PNG/image-size cap is introduced.
- Separate host spawn/first-output/complete-marker-receipt/close times, byte counts, transfer/cleanup envelopes and host validation time. Per-sample `totalMs` is sampled at checkpoint start: earlier phase-progress writes are included, but the final checkpoint serialization/write is not. It is not the whole runner wall time. Host, device, source-capture, actual tool and model clocks are not merged. Marker receipt is not device execution time. No model latency measurement.
- The **device bracket includes begin-marker printf, final uptime read, scheduling, capture, encoding and file-write work**. The final printf is outside its interval. Neither the control nor a difference of host/device medians is subtracted to claim isolated device capture or network overhead.
- Reports are exclusively reserved mode0600 before phone interaction. Bounded rounds2–20,120s measurement budget,15s local ADB command deadlines. Progress saves before/after phases; active/incomplete work and interruption remain explicit. Safety restoration/cleanup has separately bounded commands outside the measurement budget.
- SIGINT/SIGTERM/caller abort and explicit timeout are distinguished; cleanup is independent of the aborted measurement signal. This is diagnostic local-child handling, NOT production cancellation redesign or proof that device-side work terminates.
- A progress-write failure does not bypass owned cleanup. Successful PNG signature/IHDR/dimensions are checked, not full decoding or live concurrent frame identity. Existing public/process interleaving tests provide frame-ownership evidence.
- Exported reports contain no images, commands, raw output/errors, absolute uptime, remote/local scratch paths, device identifiers/endpoints or IME identities. Manifest source filenames/hashes, fixed fixture dimensions and image byte counts are retained.

## Fresh full real-phone workflow — failures retained, blocker resolved

All full runs use frozen v3.2 driver hash
`58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c`
and the unchanged bounded consumer. The passing baseline, focused baseline and actual registered-tool baseline were saved BEFORE diagnostic implementation. These are new measurements, not recycled fusion/PNG evidence.

| Attempt | Result | Duration ms | Numeric writes / persisted values |
| --- | --- | ---: | ---: |
| Before1 | FAIL product visibility after eight allowed cycles | 80952.85 | 0 / 0 |
| Before2, unchanged retry | FAIL foreground check during sixth product cycle | 66004.37 | 0 / 0 |
| Before3, user-requested unchanged retry | PASS | 304955.36 | 30 / 30 |
| After1 | PASS | 304765.49 | 30 / 30 |

The first two pass search/focus/query/three offers and never reach Forge. All partial reports and the earlier [blocked checkpoint](capture-envelope-baseline-blocked-2026-10-19.md) remain unchanged historical evidence. Later read-only Brave inspection at that checkpoint found Barista at y2089, not proof of exact prior geometry or failure cause. No manual alignment, fixture viewport/settings change, weakened guards or protocol edit. The third attempt passed with three product cycles. Do not infer why it passed or why previous attempts failed.

Passing pair: same shopping checks/offers/chosen product, all30 exact writes and30 persisted numeric values,315 operations,77 hierarchy captures/291 scoped command attempts each; three product and two field cycles each. New comparator passes **15/15 gates**, independently verifying pinned/current source, driver/consumer hashes, values, complete scoped accounting, unchanged production and retained work.

Raw descriptive difference **−189.87ms / −0.0623%**. No alignment subtraction, isolated overhead, causal/population/non-inferiority or speedup claim. The workflow does not run the new bracketed diagnostic or annotation; direct diagnostic/focused/actual registered checks cover those disclosed paths separately. Scoped counts are not whole-workflow ADB counts; no independent screenshot total is fabricated.

Two retained TEST drafts:
- `E2E Lower v3.2 source-capenv-before27`
- `E2E Lower v3.2 source-capenv-after27`

Each has15 unchecked sets at20kg ×8 with all30 numeric persisted values verified. Earlier failed attempts created no draft. Amazon read-only; no cart/checkout/account mutation, existing-training edit or completed workout.

## Device/host capture envelopes — two unchanged diagnostic blocks

Chronology: full/focused/actual baseline → implementation/controlled tests → diagnostic block1 → unchanged block2 → full after → fresh rebuild/focused/actual after → host validation. No tests/builds ran concurrently with live measurement. Before each diagnostic, fresh native Settings → Termux app-info labels/foreground were checked. Both blocks pass **24/24 samples**:16 captured/transferred/validated/cleaned PNGs and8 no-capture controls, plus a separate clock capability probe. No sample/failure/warmup excluded.

| Block | Variant | Host command median ms (min–max) | Device bracket median ms (min–max) |
| --- | --- | ---: | ---: |
| 1 | plain | 343.87 (310.32–353.27) | not measured |
| 1 | bracketed | 377.07 (345.64–406.10) | 315 (290–340) |
| 1 | control | 80.13 (70.02–93.60) | 20 (10–20) |
| 2 | plain | 343.04 (322.46–366.21) | not measured |
| 2 | bracketed | 388.18 (369.25–407.85) | 325 (310–340) |
| 2 | control | 75.82 (66.43–85.95) | 10 (10–20) |

Representation quantum10ms throughout. All markers valid, no timeout/truncation. Bracketed host observations are higher than plain in both blocks: the measurement wrapper is not transparent. These counterbalanced observations describe wrapper perturbation, not an isolated overhead estimator or justification for production instrumentation.

Plain transfer medians29.20/31.40ms, cleanup62.15/68.30ms, host PNG validation0.80/0.98ms. Bracketed transfer29.41/39.90ms, cleanup68.40/70.84ms, validation0.88/0.93ms. All phases remain separate; no median sums/subtractions or compound transfer-envelope claim.

The new device envelope is measurable, but **no historical regression root cause is established**. Capture/encoding/write/scheduling remain unresolved within it; neither thermal/CPU/FUSE/compositor nor network cause is asserted. No optimized backend or path is selected from these results. Full numeric reports and strict audit retain ranges, byte distributions and both unchanged blocks.

## Focused unchanged public APIs — regressions disclosed

Same frozen `png-concurrency-check.mjs`, identical source/driver hashes,12/12 PNG checks each. Three samples per mode/API; its wall includes harness validation/disposal, unlike the new command envelopes.

| Mode / API | Before median ms | After median ms | Change |
| --- | ---: | ---: | ---: |
| Sequential saved | 510.19 | 510.91 | +0.14% slower |
| Sequential base64 | 444.91 | 451.00 | +1.37% slower |
| Concurrent saved | 496.41 | 529.56 | +6.68% slower |
| Concurrent base64 | 428.19 | 446.51 | +4.28% slower |

Source unchanged: these regressions are retained, not assigned to a proven cause or dismissed as zero overhead. They are not a before/after test of the new device wrapper; plain/bracketed/control probes separately disclose its cost. No non-inferiority or screenshot speedup claim.

## Fresh actual registered-tool verification

Same frozen `png-loaded-check.mjs`, fresh nonpersistent Pi JSON CLI explicitly loading rebuilt `dist/index.js`, no discovered extensions/MCP, only actual registered screenshot/look allowed:

| Build | android_screenshot ms | android_look ms |
| --- | ---: | ---: |
| Fresh before | 628 | 2531 |
| Fresh after | 582 | 2546 |

Both pass exact call/options/start-end matching, valid images/dimensions, native Settings/Termux/OPEN numbered index, settled/not-aborted, unchanged build guards. Fresh before rebuild matched all six historical restored baseline build hashes. Fresh after rebuild and final independent hash queries match all six before/after hashes. No parent interactive session reload claim; these single tool observations do not estimate speedup and are not merged with source/device/model clocks. Raw JSONL/images stay private temporary data, not committed reports.

## Connectivity/setup attempts and safety

Secure wireless was freshly discovered for initial workflow and again for continuation. Between controlled tests and the first diagnostic launch, the prior transport disappeared from the connected-device list. The launch rejected empty explicit selection at options validation BEFORE output reservation/device calls; no measured report existed. Its summary helper then failed because no report existed. Both setup errors remain in logs; not a measured sample, timeout or diagnostic failure report.

Fresh authorized secure rediscovery returned a current endpoint; the first readiness check still failed at `dumpsys power`. A subsequent read-only device list showed reachable current transport and an offline older entry; host mDNS listing reported unsupported service. Secure rediscovery/refresh and exact authorized transport/state queries succeeded; readiness was rerun successfully BEFORE measurement. No endpoint guessed, legacy TCP/IP/pairing enabled, forced disconnect, network setting/debug exposure changed, or helper installed. No proven cause of transport change/readiness failure is asserted.

Original Gboard and Termux independently queried after EACH full attempt, focused run, registered-tool check, diagnostic block and the earlier read-only inspection. Rechecked before resumed diagnostic measurement after rediscovery. Screenshot-only blocks left original IME active; full workflows restore it on success/failure. No APK installation, permission grant, persistent helper or security change.

## Controlled tests, review and validation

- New diagnostic tests initially **13/13 RED** for absent module, then initial combined public/process target31/31 GREEN. Final diagnostic tests18/18 include marker parsing/privacy/overflow/missing/exit/deadline/cancellation, exclusive output, independent capture/transfer/cleanup/PNG validation, invalid PNG retention/disposal, cleanup despite progress-write failure, full bounded runner/capability/restoration and real SIGTERM preserving interrupted active work.
- One expanded fixture run was15/16: two scenarios reused the same sandbox output. Exclusive creation correctly rejected the second. Fixture now uses mode-specific outputs; no overwrite protection or production policy weakened. Next targeted18/18, then19/19 with progress-write case; final full suite includes new invalid-PNG case.
- Audit tests2/2 cover a synthetic positive device/host-clock report, **26 rejected diagnostic mutations**, exclusive summary output, and **11 rejected workflow mutations**. Workflow positives use isolated matching21b3085 source/driver files with the retained before3 report; synthetic cloned after is test-only, not live evidence.
- New live offline diagnostic audit PASS24/24 each; independently current source/driver manifests, strict allowlists, marker precision/order, phase completeness, sample order/count, PNG metadata and restoration. Host phase accounting sums only disjoint sequential intervals within one sample, never nested spans or medians. Offline invariants cannot attest arbitrary JSON was honestly measured.
- Full units first **863/863 /63 files**, then after adding invalid-PNG test **864/864 /63 files**, `--maxWorkers=2`; final275.65s PASS. No existing tests modified or relaxed.
- `npm run lint`, fresh `npm run build`, all three new script syntax checks and whitespace PASS.
- Isolated integrations **9/9 PASS** (extension7, sandbox2), existing20s/30s test/hook allowances, one worker. Sandbox install is host-only test infrastructure, not a phone APK/helper install.
- Companion unchanged/not rerun; default fully parallel CI reliability remains unverified. No production runtime ingestion, input lifecycle or cancellation changes.
- Manual standards/spec/safety review against approved scope. Tool discovery found no independent sub-agent facility; not an independent or multi-agent review. New comparator differs from frozen v3.2 comparator only in checkpoint/unchanged-source gate/diagnostic labels and limits, with original preserved. Measured diagnostic scripts frozen after live blocks.

Private logs retained under `$TMPDIR`: `capture-envelope-{baseline-build,workflow-before1,workflow-before2,workflow-before3,focused-before,loaded-before,red,targeted1,targeted2,targeted3,targeted4,targeted-final,diagnostic-block1,diagnostic-block1-attempt2,diagnostic-block2,workflow-after1,after-build,focused-after,loaded-after,units,units-final,lint,lint-final,build-final,integration-extension,integration-sandbox}.log`. The first post-build inline hash command also failed at Node eval/import syntax before measurement; corrected module invocation verified all six hashes. Its evidence is recorded in the blocked checkpoint.

## Artifacts and reproduction

All reports are in this directory. Preserve failed baseline attempts1/2, passing before3/after1, focused/loaded before/after, both diagnostic blocks, workflow comparison and diagnostic audit. Earlier blocked checkpoint remains historical; this report supersedes its acceptance status, not its evidence.

Live: freshly rediscover authorized transport, ensure exclusive hands-off device/original IME/Termux, NEW exclusive output and no concurrent tests/builds. Do not publish the transport value:

```sh
PI_DROID_CAPTURE_ENVELOPE=1 node --import tsx \
  scripts/capture-envelope-diagnostic.mjs /private/NEW-block.json
# ANDROID_SERIAL must already be set to freshly discovered exact authorized transport.
# Optional PI_DROID_DIAG_ROUNDS: integer2–20; default8.
```

Offline (NEW outputs only):

```sh
node --import tsx scripts/audit-capture-envelope.mjs \
  docs/performance/reports/capture-envelope-diagnostic-block1-2026-10-19.json \
  docs/performance/reports/capture-envelope-diagnostic-block2-2026-10-19.json \
  /private/NEW-audit.json /private/NEW-audit.md
node scripts/compare-workflow-capture-envelope-v1.mjs \
  docs/performance/reports/workflow-v3.2-capture-envelope-before-attempt3-2026-10-19.json \
  docs/performance/reports/workflow-v3.2-capture-envelope-after-attempt1-2026-10-19.json \
  /private/NEW-comparison.json /private/NEW-comparison.md
```

Audits are checkpoint-specific. Future source changes require isolated matching fixtures/new versioned comparators, not rewritten historical evidence.

## Next decision

No further implementation scope is approved automatically. Agree one different bounded optimization or deeper measurement with the user. More detailed device internals need explicit capability/privacy/overhead scope; do not infer cause from this envelope or reinstall rejected fusion. Preserve these diagnostic-only scripts as measured. Any next production slice requires a NEW equivalent pre-edit full v3.2 baseline, full Amazon +30 writes/+30 persisted readbacks after, focused pair and actual freshly loaded relevant tools/build hashes. These passing runs are not evergreen baselines. No speedup or cumulative gain claim.
