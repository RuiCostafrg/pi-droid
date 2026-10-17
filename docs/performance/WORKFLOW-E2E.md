# Amazon.de → Forge end-to-end regression protocol (v1)

**Historical frozen v1.** The later bounded-field consumer migration and its
separate, equivalent baseline are in [WORKFLOW-V2.md](WORKFLOW-V2.md). Do not
compare timings across versions or reinterpret this metadata-only v1 pair as
a speedup. The v1 runner and its raw reports remain unchanged.

User-requested, opt-in real-phone E2E. The original agent-assisted acceptance
protocol is below; an executable source/API fixture runner and offline comparison
are now available (usage at the end). Neither is an unattended/default CI test.
Offline fake-ADB tests remain the deterministic regression gate for execution
metadata. Never substitute a native probe or synthetic fixture for this workflow's
live result.

## Fixed inputs and acceptance

1. Start unlocked in Termux, original IME recorded. Use the same authorized
   phone, transport, portrait layout, Brave profile and installed Forge app.
   No concurrent benchmarks/builds/device actions. Discover the current ADB
   serial; never commit the endpoint. Tesseract 5.5.2/English was installed with
   user approval **before** the first baseline; keep it for both sides.
2. Start opt-in `android_perf` tracing. Open `https://www.amazon.de` in installed
   Brave. Search the literal `Mandelmilch`. Verify the query in the rendered UI.
   Compare the first three distinct available almond-drink offers encountered
   (at most six result-screen scrolls). Exclude unrelated products, sponsored
   duplicates and unavailable offers. Prefer displayed €/L; otherwise compute
   from displayed total price and volume. Record shipping separately; do not
   claim the cheapest product on all Amazon. Open the cheapest comparable offer
   in this bounded sample and verify its product/price. No cart, purchase,
   subscription, account, cookie-consent or permission changes.
3. Open installed `app.forge.gym`. Sessions → + → Lower → Start: create a NEW
   test draft from the existing Lower template, never edit an existing session
   or program. Fixed arbitrary test data for **every planned working set**:
   **20 kg × 8 reps**. No runtime randomness. These are automation fixture
   values, not a training prescription. Verify names and all saved values via
   visible UI/readback. Save/reopen the draft, without marking it as a real
   completed workout. If the app cannot safely create a separate draft, or
   exposes no reliable save/readback path, record that failure and stop.
4. Restore the original IME in `finally`; return to Termux and independently
   verify its foreground, on success, failure, timeout or interruption. Stop
   and export profiler trace. Never delete user records. Baseline and after
   drafts may remain separate; record exactly which test-created artifacts
   exist. Do not clean up unidentified drafts.

## Bounds and measurement

- 15-minute active workflow budget per run; no retries hidden. Discovery/setup
  and exploratory navigation are excluded and reported separately. A failed
  budget/correctness run is NOT a successful baseline.
- Export each run separately; never overwrite the original baseline.
- Record source revision, loaded/source execution path, profiler availability,
  tool attempts/failures/timeouts, summed per-tool durations (median/p95/max),
  union Android-busy time, workflow wall time and unobserved time. Overlapping
  calls must not be summed as wall time; unobserved is NOT model latency.
- Keep content-free trace JSON; Markdown may retain the public product/price
  observations and fixed workout fixture, never account information or screen
  dumps. Screenshots stay private in the normal pi-droid screenshot directory.
- Record correctness independently of successful tool responses: search input,
  comparable offers, chosen product, draft creation, exact numeric readback,
  persisted reopen, IME and Termux restoration.
- One run per side is a smoke comparison, not statistical evidence of speedup.
  Amazon content/network, cache, OCR, host load and agent decisions confound it.
  Missing internal timings must stay unknown, not be inferred from wall time.

## Before/after gate

Run and persist the baseline **before editing implementation source**. Then
implement structured execution failure metadata, run offline regression/build
checks, and rerun this unchanged protocol with the changed implementation
actually loaded. A stale active-session extension is not an after measurement;
use a fresh verified source-level/SDK runner if reload is unavailable. Preserve
failed/partial runs; do not quietly weaken assertions to get green.

This is primarily a reliability/diagnostic change; it has no promised latency
improvement. Compare diagnostic coverage as well as performance. Link results
and remaining blockers from PLAN.md.

## Follow-up: default replacement fixed

The original v1 workflow runner below is intentionally frozen with its explicit
clear workaround so stored before/after hashes remain reproducible. Default
`clear_first` is now fixed; its dedicated source regression is
`scripts/input-replacement-e2e.mjs`. It calls default replacement without that
workaround and reuses/restores the known test draft rather than creating more
workouts. Prefix, numeric-string, emoji and empty readbacks all pass. See
[input replacement evidence](reports/input-replacement-fix-2026-10-16.md).
This does not retroactively turn the original failing baseline into a pass or
prove the active session has reloaded. See the report for the non-IME fallback
replacement safety restriction and remaining focus/broadcast limitations.

## Executable source/API fixture (opt-in)

`node --import tsx scripts/workflow-e2e.mjs` drives real public pi-droid source
APIs, not a model, active-session extension or full Pi SDK. The installed fixture
must remain portrait **1080×2340** with unchanged Forge Lower template and
Brave layout. It verifies observed controls before coordinate actions and fails
closed if moved. It is fixture-specific, not arbitrary-app automation.

Before EACH run: wake/unlock/discover exactly one authorized device; put Forge
in its normal Overview/Sessions navigation screen (not an open draft/dialog),
then return to Termux. Do not run alongside other ADB captures, builds or tests.
Do not invoke blindly against another user's data.

```sh
# Export ANDROID_SERIAL from fresh authorized discovery, never an old endpoint.
# Use a unique public run label: lowercase/digits/hyphens, max 32 characters.
PI_DROID_WORKFLOW_E2E=1 PI_DROID_E2E_RUN_ID=before5 \
  node --import tsx scripts/workflow-e2e.mjs before /private/new-before.json
# Implement the change, then run the exact same harness/fixture:
PI_DROID_WORKFLOW_E2E=1 PI_DROID_E2E_RUN_ID=after5 \
  node --import tsx scripts/workflow-e2e.mjs after /private/new-after.json
node scripts/compare-workflow.mjs /private/new-before.json /private/new-after.json /private/new-comparison.md
```

Optional `PI_DROID_E2E_SOURCE=/absolute/root` loads an explicitly isolated source
tree (with existing dependencies available). The original-revision reference
used `git archive` of the recorded baseline commit into a private temporary root,
with node_modules symlinked; it did NOT modify the working implementation.
Reports retain hashes of exec/capture-timing source plus the entire runner.
Outputs use exclusive creation: never overwrite a baseline. The compare script
is offline and reusable; differing harness hashes or failed workflows prevent
a passing comparison.

Each run creates ONE new draft `E2E Lower v1 source-<run-id>` with 15 unchecked
sets, **20kg × 8 reps**. No done/Finish button, deletion, existing routine edit,
account mutation or purchase. Failed runs may leave partial test drafts: record
them explicitly. Use a unique label per invocation; do not silently reuse a draft.

The source fixture uses explicit `ADB_CLEAR_TEXT` before typing because the
original tool baseline reproduced broken clear-first replacement. It validates
all 30 numeric values and all 30 after reopening the OCR-labelled draft. It
assumes the same five exercise names/template; independent name assertions are
follow-up. Amazon source assertions cover exact search readback, three fixed
Alpro offer/price comparisons and navigation to the selected observed product's
detail URL, not a separate detail-page price/stock assertion. The agent-assisted
protocol above has broader visual checks. Never call this a test of all Amazon
products or the default input-clear lifecycle.

Measurements: operation counts/timing including explicit 500ms settling waits,
102 fresh hierarchy observations in the passing pair, per-capture spans,
correctness checkpoints, source/harness hashes and public sampled prices. These
are NOT Pi tool counts or LLM/orchestration metrics. One popup capture is untraced
because its current-focus window has no package; parent activity is checked.

Caught assertion/execution failures restore IME and Termux in `finally`; report
checks independently verify both. The 15-minute budget is checked between
operations and each ADB command has its own deadline; it is NOT a hard aggregate
process-group deadline. External SIGTERM/SIGKILL/host crashes can bypass JavaScript
cleanup: the supervising agent must restore and verify foreground/IME separately
if the process is interrupted. No interruption occurred in the measured pair.

Evidence: [chronological tool baseline](reports/workflow-baseline-2026-10-16.md),
[source pair and failed attempts](reports/workflow-evidence-2026-10-16.md),
[generated comparison](reports/workflow-comparison-2026-10-16.md).
