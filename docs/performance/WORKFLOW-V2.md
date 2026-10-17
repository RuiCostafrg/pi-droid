# Amazon.de → Forge v2: adopting bounded field selection

## Result — 2026-10-17

The approved next step adopts `readSelectTap` in a real versioned source/API
workflow consumer. This is NOT a change to existing registered tools, v1,
perception backend or input implementation. All production `src/` files remain
unchanged from `abc2ac3`; the public helper was already implemented and tested.

| Measurement | Before consumer | Migrated consumer |
| --- | ---: | ---: |
| Complete workflow | PASS | PASS |
| Wall time | 370.746s | 289.733s |
| Completed hierarchy captures | 104 | 73 |
| Field selections | 30 | 30 |
| Captures inside those selections | 60 | 30 |
| Other direct hierarchy observations | 44 | 43 |
| Field-alignment cycles | 2 | 1 |
| Explicit OCR calls | 1 | 1 |
| Numeric values checked after writes | 30/30 | 30/30 |
| Numeric values checked after reopen | 30/30 | 30/30 |
| Original IME / Termux restoration | PASS | PASS |

**81.012s less elapsed time, 21.85% lower in this one live pair.** There are
**30 targeted capture removals**, plus ONE capture difference from an alignment
cycle that the unchanged driver did not need after migration. Polling was not
deleted or bypassed. Field-selection total time was 160.916s → 85.559s;
alignment-cycle total time was 7.293s → 3.615s. Do not attribute the entire wall
change causally to the 30 removals, claim population/tail performance, or compare
this to yesterday's v1 timings (different live prices and driver).

Same driver hash, same recorded nine-file engine hash, same public offer sample,
identical correctness checks. Stage sequences match after stripping ONLY complete
recognized alignment cycles; elapsed times/counts themselves are never adjusted.

## Evidence and chronology

1. [Baseline Markdown checkpoint](reports/workflow-v2-baseline-2026-10-17.md)
   was saved BEFORE changing the active consumer. Includes both failed attempts.
2. [Passing baseline attempt 3](reports/workflow-v2-before-2026-10-17-attempt3.json).
3. [Passing after](reports/workflow-v2-after-2026-10-17.json).
4. [Generated comparison and gates](reports/workflow-v2-comparison-2026-10-17.md).
5. Prior focused-operation contract/limits: [READ-SELECT-TAP.md](READ-SELECT-TAP.md).

Frozen passing-pair driver `scripts/workflow-v2.mjs`:
`af7688014fa3e06fd07fd21c734aab86f2406c78ea988871dd2172231f068ca0`.

Before consumer, byte-preserved as `scripts/workflow-field-action-before.mjs`:
`b4a1747e406a88cfe40b15339dd893f478c6204e672bbd2ffaf345b4107c698e`.

After active consumer `scripts/workflow-field-action.mjs`:
`3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27`.

Recorded engine hash:
`2a78ae7818fa317be9585b1877eb55ac52c22fa20b1d0ba0d1b3d79bc45d3ce6`.
The frozen driver explicitly hashes nine relevant engine files; this is NOT a
whole-repository/transitive-dependency attestation. The git source diff was also
checked: no `src/` changes in this consumer slice. Hashes record provenance, not
proof against deliberately fabricated report metadata.

Historical v1 driver is untouched and remains
`1c0b0bc754509619f2fc0940afe4463527468f6721e59424c050490107cdbfd6`.
All prior raw evidence remains unchanged.

## What changed, and what did not

Eligible sites are the **30 native numeric field selections**. In each iteration,
the frozen driver supplies a PURE synchronous selector that requires exactly six
visible numeric EditText fields and returns the current field by its fixed index.
The old consumer inspects, selects, dumps again to verify, and taps. The new
consumer delegates the same selector to the public bounded operation, selecting
and tapping from one fresh snapshot with its foreground/window/identity/geometry/
revision/cancellation guards intact. No cached token or stale caller coordinate
is passed into the new operation.

The driver retains:
- exact browser search-field readiness/focus and query readback;
- three comparable offer extraction and cheapest-sample choice;
- observed-control verification for browser/product/navigation actions;
- popup parent-activity guard;
- five exercise groups, six numeric fields each;
- bounded alignment retries and fresh observations when clipping requires them;
- identical explicit clearing/input sequence and 500ms settles on both strategies;
- grouped exact 20kg × 8 readbacks and all values after saved-draft reopen;
- OCR label identity, exact reopened title, IME/Termux finally cleanup and checks.

The clearing workaround/comment inherited from v1 is intentionally retained to
isolate capture work. Default `typeText(clear)` is already fixed; this comparison
is not another input-clear test. No browser-selection optimizations, removed
polling, larger cache TTL, relaxed helper window or callback guard bypass.

### Failed baseline development attempts (preserved)

- [Attempt 1](reports/workflow-v2-before-2026-10-17-attempt1.json): values written
  correctly, but exact draft OCR identity failed. Probe found the label ending
  `1l` at 44.58% confidence, not the exact known label ending `1`. Default 50%
  threshold and exact matching were NOT relaxed. Persisted reopen unverified.
- [Attempt 2](reports/workflow-v2-before-2026-10-17-attempt2.json): exact Amazon
  query readback failed; a later inspection found empty input. Focus/load timing
  was suspected, not proven. No Forge draft created.
- BEFORE a passing baseline, v2 was strengthened to require the exact search
  resource ID at stable geometry in two observations and a fresh focused-attribute
  check before typing. Those two failed reports have the earlier driver hash.
  The final passing baseline/after use the same strengthened frozen driver and
  unambiguous labels. No successful baseline assertions were weakened.

## Retained test artifacts / phone safety

Three additional, explicitly TEST-created drafts remain:
1. `E2E Lower v2 source-v2before1` — failed OCR-reopen attempt; all numeric
   write/readbacks passed, persisted reopen not independently verified.
2. `E2E Lower v2 source-before55` — complete baseline; all 30 persisted values pass.
3. `E2E Lower v2 source-after55` — complete after; all 30 persisted values pass.

The six earlier v1 test drafts remain as previously disclosed; **nine total**
test-created drafts. Existing real sessions/programs untouched. No completed
sets/Finish action, purchases, subscriptions, cart/account edits or new installs,
permissions, helpers or debugging exposure. Each run restored original Gboard and
Termux, including both failures; supervisor independently verifies final state.

Sampled prices on BOTH passing runs: Alpro unsweetened and Original 8×1L each
€19.99 / €2.50 per litre; Barista €18.94 / €2.37 per litre. Chose Barista in this
bounded three-offer sample. Not cheapest across Amazon, a stock assertion or a
separate detail-price check. Browser detail navigation uses the original URL
check. Screenshots stay private; JSON/Markdown omit target endpoints and raw UI
or private error text. Labels and public prices here are deliberate fixture data.

## Reproduction

Live operations require the same authorized portrait 1080×2340 phone, installed
Brave/Forge, unchanged Lower template, existing host Tesseract and normal Forge
navigation (not an open draft/dialog). Discover exactly one authorized device
freshly; export ANDROID_SERIAL. Return to Termux before the run. No concurrent
builds/tests/device actions during measurement. Each live invocation creates a
NEW draft; use a unique public run ID and NEW output path.

**The `before`/`after` argument labels a report; it does not swap the consumer.**
The active module decides the path and exports its recorded strategy. To repeat
the baseline, use an isolated checkout/worktree of the published v2 revision,
reuse existing dev dependencies, and copy `workflow-field-action-before.mjs`
over that isolated checkout's `workflow-field-action.mjs`. Never overwrite the
active working copy or prior reports. Verify the baseline consumer/driver/engine
hashes above before running. After comparison must use the migrated active file.

```sh
# In the explicitly prepared baseline checkout, then migrated checkout respectively:
PI_DROID_WORKFLOW_E2E=1 PI_DROID_E2E_RUN_ID=unique-before \
  node --import tsx scripts/workflow-v2.mjs before /private/NEW-before.json
PI_DROID_WORKFLOW_E2E=1 PI_DROID_E2E_RUN_ID=unique-after \
  node --import tsx scripts/workflow-v2.mjs after /private/NEW-after.json
# Offline (no phone):
node scripts/compare-workflow-v2.mjs /private/NEW-before.json /private/NEW-after.json /private/NEW-comparison.md
```

The v2 driver refuses an existing output before navigation, rejects the old
source-root override, records consumer and engine hashes, and exclusively creates
JSON. `compare-workflow-v2.mjs` refuses a passing comparison for changed driver/
engine/offers, missing/failed checks or persisted counts, capture accounting/
truncation/errors, wrong strategy, changed selection count, removed safety work,
malformed alignment or non-finite timings. Only complete recognized alignment
triples are exempted from the stage-sequence equality gate. Reports are never
rewritten and comparison creation is exclusive. Raw payloads/unknown private
properties are not copied to generated Markdown.

## Validation and limits

- Public consumer/external-ADB seam: red first (expected 1 capture, got 2), then
  green after public helper adoption. Five cases cover one-capture behavior,
  executable archived old path, fail-before-tap on missing/ambiguous selection,
  and default-window rejection of a deliberately slow final foreground guard.
- Offline comparison CLI: red → green on the real pair, then 15 cases including
  negative/provenance/correctness/capture/safety/privacy/exclusive-output gates.
- Final validation: **649/649 unit tests, 50 files; 9/9 isolated sequential
  integrations; lint/build/script syntax PASS**. Companion **16/16**, build/check
  PASS, unchanged. Publication checkpoint is recorded in PLAN.md.
- The first full unit attempt was 647/648: a positive consumer functional test
  returned rejection under parallel load, but its original error was swallowed,
  so the precise cause is not asserted proven. The offline fixture now retains
  error diagnostics, uses the documented 1000ms window only for synthetic
  functional count tests, and tests an injected 700ms guard delay against the
  unchanged production 500ms default. Live driver/core/window were not altered.
  The complete suite was rerun and passed; the initial failure is not hidden.

Source/API execution, not loaded Pi tools or LLM timing. Reported workflow wall
starts after module imports and ends before final report serialization; it is
not complete Node-process startup/shutdown latency. Native dumps and
foreground checks are not atomic with input. The helper requires exclusive device
interaction and pure synchronous selection; readback remains mandatory.
Independent exercise-name/stock/detail-price assertions remain outside this
fixture. Explicit OCR calls are counted; screenshots are NOT independently
instrumented. No new screenshot/finer command/reconnect spans were added.

As before, the 15-minute workflow budget is checked between operations; it is
not a hard process-group deadline. Per-command/helper deadlines do not guarantee
device-side cancellation. Finally restores caught failures, not SIGKILL/host
crashes; supervisor must restore/verify if interrupted. Default parallel CI
limits, active-session reload, automatic production input lifecycle and the
separately discovered `typeIntoField(clearFirst)` issue remain open.

Next: design a text-only registered observation interface that exposes already
captured non-interactive information and can explicitly skip screenshots/OCR.
Agree the tool-output seam and save its equivalent baseline before implementation;
existing `android_ui_dump` is already screenshot-free on a successful hierarchy.
Do not assume a new name alone reduces observations or extend cache TTL blindly.
