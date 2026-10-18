# Reconnect discovery/connect timing — 2026-10-18

## Verdict and agreed scope

**PASS within the disclosed scope.** User approved the single bounded timing-only
slice and requested final commits/pushes plus a continuation handoff. Annotation
acceptance remains closed under v3.2; no historical driver, comparator or report
was changed. No recovery redesign or performance speedup is claimed.

Production changes: `src/adb/exec.ts`, `reconnect.ts`, `wifi.ts` and the
`CaptureStage` type in `capture-timing.ts`. IPC and the companion OFFLINE importer
accept the two new stages. Runtime companion ingestion remains unimplemented.

- `reconnect_discovery`: secure discovery (existing ADB mDNS/independent browse
  fallback) AND exact candidate filtering/selection. Empty or ambiguous selection
  is an error, not a successful zero-endpoint recovery. Backend subprocess/socket
  time is not separately broken down by this slice.
- `reconnect_connect`: connect command AND device-list authorization verification.
  Failed connect output or offline/unauthorized verification is error/unknown;
  thrown AdbError categories retain their explicit provenance. The original
  failed action still retains its original error category, not the recovery error.
- Existing `reconnect` envelope still measures each caller's recovery wait.
  Only the single-flight OWNER emits finer spans on its own observation clock.
  Followers get their own wait envelope, never copied/rebased owner events. If
  an untraced caller owns recovery, a traced follower has no finer spans.
- Direct `autoConnect` honors an explicit captureClock over a sink, otherwise
  creates one clock from its opt-in sink. Frozen caller options remain untouched.
- Existing command attempt tracing nests inside connect. Discovery backend and
  verification list commands retain their previous independent/default diagnostics
  behavior: scoped attempt spans are NOT all recovery commands. Nested stage totals
  are not elapsed wall time; missing substages on followers do not mean no work.
- Tracing stays default-off and content-free. Throwing sinks cannot alter results.
  Single-flight keys, stale-port resolution, discovery/command timeouts, retries,
  candidate/authorization checks, fallback and cancellation behavior are unchanged.
  No signal forwarding, cancellation, remote PNG fix, input lifecycle or CI changes.

## Fresh chronology and full real-phone pair

Baseline source: **f061509**, measured BEFORE production edits, not an isolated
retrospective annotation reference. User-owned origin/main matched the full local
HEAD at resumption. Authorized transport was rediscovered afresh and privately
pinned; original Gboard and initial Termux foreground recorded. Preflight confirmed
connectivity/authorization/screen/storage and installed ADBKeyboard; its inactive
keyboard warning was expected because original Gboard was active. The frozen
workflow owns its bounded IME switch/restoration.

Same unchanged `scripts/workflow-v3.2.mjs` and bounded consumer ran on the same
phone. No builds/tests/concurrent device work during measurements, no forced
disconnect, no mid-run intervention, viewport/settings or fixture/check changes.

| Metric | Fresh before attempt 1 | After attempt 1 |
| --- | ---: | ---: |
| Status | PASS | PASS |
| Elapsed ms | 304521.519572 | 304066.193582 |
| Operations | 315 | 315 |
| Captures | 77 | 77 |
| Scoped command attempts | 291 | 291 |
| Product alignment cycles / ms | 3 / 13482.42 | 3 / 13468.36 |
| Field alignment cycles / ms | 2 / 7176.30 | 2 / 7337.26 |
| Numeric writes / persisted values | 30 / 30 | 30 / 30 |

All 34 shopping/Forge/cleanup checks match. Both captures' scoped traces are
complete/nontruncated, zero stage errors; counts are not whole-workflow command
accounting or independent screenshot counts. Source workflow uses exact transport
with recovery disabled: it does NOT exercise the new recovery substages.

**After minus before −455.33ms (−0.15%).** Alignment stays included. One pair is
descriptive only; no isolated reconnect overhead, causal/population speedup or
non-inferiority inference. The workflow pair validates successful default paths,
not live reconnect or failure behavior.

Immutable JSON AND Markdown for each attempt:
- [Before](workflow-v3.2-reconnect-before-attempt1-2026-10-18.md)
- [After](workflow-v3.2-reconnect-after-attempt1-2026-10-18.md)
- [Comparison](workflow-v3.2-reconnect-comparison-2026-10-18.md)

New `compare-workflow-reconnect-v1.mjs` preserves all workflow correctness,
retained-work and accounting checks and adds supplemental recovery provenance:
16 gates pass. Independently recomputes baseline hashes from git f061509 and after
from disk. The frozen workflow's ten-file manifest omits wifi/reconnect; NEW frozen
focused runner manifests both plus exec/timing/mdns/ui-tree, and the comparator
checks them independently. Only four expected production files differ. It does
not change or repurpose the annotation-specific comparator. Reproduction:

```sh
node scripts/compare-workflow-reconnect-v1.mjs \
  docs/performance/reports/workflow-v3.2-reconnect-before-attempt1-2026-10-18.json \
  docs/performance/reports/workflow-v3.2-reconnect-after-attempt1-2026-10-18.json \
  docs/performance/reports/reconnect-focused-before-2026-10-18.json \
  docs/performance/reports/reconnect-focused-after-2026-10-18.json \
  /private/NEW-comparison.json /private/NEW-comparison.md
```

## Focused same-driver and actual fresh loaded checks

Frozen `scripts/reconnect-check.mjs`: Settings → Termux app info, six source native
captures per phase, three each diagnostics disabled/enabled, alternating in the
same order. Exact Termux/OPEN and Settings foreground required, native-only/fresh
capture; no controls activated. Both phases **6/6 PASS**, enabled traces eight
spans/call; disabled traces none. All observed successful calls complete,
nontruncated. No recovery exercised/forced; these are success-path overhead checks.

| Median ms | Before | After | Change |
| --- | ---: | ---: | ---: |
| Diagnostics disabled | 2427.88 | 2503.55 | **+3.12% slower** |
| Diagnostics enabled | 2441.05 | 2495.46 | **+2.23% slower** |

First disabled sample 3557.09ms is retained, not discarded as warm-up. These small
fixtures do not isolate instrumentation overhead or prove non-inferiority; both
regressions remain disclosed. JSON: `reconnect-focused-{before,after}-2026-10-18.json`.

NEW frozen `scripts/reconnect-loaded-check.mjs` derives from the earlier loaded
runner without changing it. Fresh rebuild BEFORE each phase, fresh nonpersistent
actual Pi JSON CLI explicitly loading only dist/index.js with MCP disabled. Actual
registered `android_look(include_image:false,all_elements:true)` once per phase,
exact Settings/Termux/OPEN numbered index, matching start/end, no tool error,
agent settled/not aborted and unchanged six build hashes pass. Tool times
**2523ms → 2498ms**; separate tool clocks, not source spans/model latency.

The build manifest includes changed exec/reconnect/wifi modules and capture timing;
exec/reconnect/wifi hashes differ, index/device hashes stay unchanged. Capture timing
JS is unchanged because its new vocabulary is type-only. Raw CLI JSONL is private
in temporary storage. Parent interactive session was NOT reloaded. Registered
success does not exercise or prove live automatic recovery. JSON:
`reconnect-loaded-{before,after}-2026-10-18.json`.

## Controlled regressions, failures and validation

Public/process seams agreed before tests: real public adb/autoConnect against
external fake ADB executables, actual benchmark CLI/worker IPC and offline importer.
No live transport failure is inferred from these controlled fixtures.

- New source process test first RED: no discovery span. Then GREEN. Fourteen new
  cases cover success/shared clock, missing/ambiguous selection, rejected/exit
  connect, unauthorized/exit verification, explicit connect timeout, disabled
  tracing, throwing sink, explicit clock precedence/frozen options, direct auto,
  traced owner/follower and untraced owner/traced follower. Only one discovery and
  connect per single-flight operation; failures never replay the action.
- First focused old reconnect suite rerun: 19/20 overall because an old mock
  asserted an exact internal options object without the new clock. Updated that
  test to require the clock's two functions AND all original recovery options;
  no production behavior/check was weakened. Source/focused rerun 49/49.
- IPC RED: new stages discarded. GREEN after allowlist extension; timeout retains
  completed finer events with traceComplete=false, privacy and
  existing 128-event bound unchanged. Full IPC suite 4/4.
- Companion RED 38/39: unsupported stages. GREEN **39/39**, build/check pass.
  Accepts partial finer traces, preserves fixed failures and discards private keys.
- Initial bounded full units **733/736**, three historical annotation comparator
  positive cases failed against today's changed production tree. The checkpoint-
  specific comparator/reports were NOT edited. Its tests now run the exact frozen
  comparator against matching f061509 source/driver/consumer extracted into an
  isolated temporary snapshot, with explicit original git object directory. All
  original 21 cases pass, including 18 adversarial failures. No active-tree rollback.
- New reconnect comparator first test run 20/21: a copied expected-delta literal
  still used the old annotation before time. Corrected only that test literal.
  Final **25/25**, including 22 adversarial report/manifest/driver rejections,
  successful real pair, privacy and no-overwrite checks.
- Final `npm run test:unit -- --maxWorkers=2`: **761/761, 57 files**.
- `npm run lint`, `npm run build`, script syntax and whitespace checks pass.
- Isolated sequential integrations: **9/9**, using existing 20s test / 30s hook
  allowances. Default full-parallel CI reliability is still NOT claimed fixed.

Expected red/setup/test-maintenance failures above are retained in this report;
private/temp full logs are not durable evidence. No failed live attempts in this
slice; every historical failed live report remains intact.

## Phone safety and continuation

Two NEW retained TEST drafts:
- `E2E Lower v3.2 source-recon-before96`
- `E2E Lower v3.2 source-recon-after96`

Each has 15 unchecked sets, 20kg × 8, all 30 persisted values verified. No existing
training edit, completed set/workout, Amazon cart/account/checkout mutation, new
APK/helper/permission/debugging exposure. Original Gboard and Termux were restored
by every workflow/focused/loaded driver and independently verified after workflow
attempts and focused/loaded blocks. Final phone foreground Termux.

Next work must be a separately agreed bounded slice with its OWN NEW equivalent
baseline, full frozen v3.2 phone pair and actual fresh relevant registered-tool
verification. Recommend proposing fixed remote PNG concurrency safety next; do
not implement it or silently add runtime ingestion/cancellation/input/CI work.
Unconventional optimization proposals remain welcome, with risk/rollback/measurement
plans and explicit approval before risky or out-of-scope changes. See PLAN.md and
NEXT-SESSION.md for current publication/continuation instructions.
