# Amazon.de → Forge v3: bounded product alignment

## Agreement and scope — 2026-10-18

User explicitly approved a separately versioned protocol after read-only inspection
again found Barista clipped at y=2089, outside v2's unchanged 200<y<1900 guard.
They requested that the v2/v3 decision follow performance testing and that useful
metrics/observability be added when needed. v2, its comparator and all historical
reports stay immutable. This is a protocol/acceptance slice, not a production
performance implementation. No production source changes are planned.

Public verification boundaries remain the executable source workflow with external
ADB process fixtures and the offline comparison CLI/report contract (as in v2).
The ADB fixture can check fail-before-tap and bounded alignment but not real layout,
network, UIAutomator or Forge persistence. The offline comparator checks report
invariants/provenance but cannot attest that arbitrary supplied JSON was honestly
measured. Actual phone execution and independent hash/state checks are required.

## Protocol frozen before measurement

`scripts/workflow-v3.mjs` derives from v2 and keeps its exact search readiness,
focus/query readback, three fixed comparable offers, lowest per-litre choice,
product navigation, normal Forge navigation, 30 bounded numeric selections,
30 exact writes and grouped readbacks, exact OCR draft identity/reopen and 30
persisted numeric values. New drafts have prefix **E2E Lower v3 source-**.
No purchases/account/cart changes or finished sets/workouts.

New product handling:
- Pin exact chosen title identity from the initial three-offer sample, retaining
  its offer index and SHA-256 fingerprint only in public reports.
- Require enabled, clickable, non-scrollable exact-identity controls. Duplicate
  accessibility nodes at identical geometry represent one target; distinct
  positions fail closed as ambiguous.
- At most **8** measured vertical scroll → 500ms settle → fresh native observation
  cycles. The current clipped-below product causes an upward gesture; an observed
  title above the guard causes a downward gesture. Missing titles get bounded
  forward search. No viewport/settings changes or manually injected mid-run scrolls.
- Keep the strict **200<y<1900** visibility guard and nonzero actionable bounds.
- Always make one additional fresh identity/actionability/visibility confirmation
  immediately before tapping. Never tap old clipped coordinates.
- A failed shopping guard stops before Forge. Every attempt gets a NEW report/run
  ID, including failures, and must independently restore/verify original IME/Termux.

## New observability (source driver only)

- Product observations: attempt, phase, distinct-target count, visibility and y;
  no raw title, UI tree, command, error, transport identity or endpoint.
- Separate product/field alignment cycle counts and outer operation times.
- Per-capture context IDs, completed spans, duration, 128-span bound and conservative
  trace-completeness flags. Failed contexts remain partial. Source spans retain
  their own capture-local clocks, never merged into operation/tool clocks.
- Explicit 30 write records (exercise/field/public numeric value) and five groups
  of six persisted numeric readbacks. These complement—not replace—correctness guards.
- Ten-file engine hash plus per-file SHA-256 manifest, including annotate.ts for
  provenance. The workflow still does NOT invoke annotation itself.
- Offline stage count/total/median/p95/max summaries, captures/scoped command counts,
  errors/completeness and strict correctness/source/retained-work gates.
  Scoped command spans are NOT whole-workflow command accounting; nested totals
  are NOT wall time; no independent screenshot counter is claimed.

## Fresh reference chronology

Use isolated extraction of **09c3cc8**, not active-tree rollback, with existing host
node_modules symlinked (no install). Copy the NEW frozen v3 driver and unchanged
bounded consumer into that extraction. Run reference BEFORE the new measured
current attempt. This reference is **retrospective**, collected after annotation
implementation; never relabel it pre-code evidence or reuse the earlier v2 baseline.
No builds/tests/concurrent device use during measurement. Pin freshly discovered
exact ANDROID_SERIAL; never publish it.

`compare-workflow-v3.mjs` independently recomputes reference source from git
09c3cc8 and current source from disk, verifies unchanged driver/consumer and only
the two expected source differences, all 34 checks, offers/choice, exact writes and
persisted values, capture contexts and complete recognized alignment triples.
Both sides use the bounded consumer. Only complete product/field alignment cycles
are normalized for retained-operation-sequence comparison; elapsed times/counts
are NEVER adjusted. Polling differences outside these cycles fail that gate.

```sh
PI_DROID_WORKFLOW_E2E=1 PI_DROID_E2E_RUN_ID=NEW-ID \
  node --import tsx scripts/workflow-v3.mjs before /private/NEW-reference.json
# Run current with phase after and its own NEW-ID/output.
node scripts/compare-workflow-v3.mjs /private/NEW-reference.json \
  /private/NEW-current.json /private/NEW-comparison.json /private/NEW-comparison.md
```

One pair checks correctness and descriptive overhead/variation, not population,
causal, non-inferiority or speedup claims. Cross-version v2/v3 wall-time comparison
is not a controlled estimate. Retain v2 as historical protocol; decide whether v3
becomes the active acceptance protocol only after measured results. Existing
focused and actual fresh registered-tool evidence remains separate; repeat loaded
current check for this acceptance continuation. No automatic companion runtime
ingestion or other next implementation slice while the gate is open.

## Active revision and results — v3.2

Select **v3.2** as the active acceptance protocol based on correct live alignment,
not a speed claim. Initial v3 and v3.1 drivers/reports remain frozen. V3.1 changes
the gesture to 350px/600ms; v3.2 additionally retains the last direction through
missing/zero-area offscreen geometry (initially forward). Positive-area geometry
may update direction. All original tap/correctness/cleanup guards stay in force.
Use `scripts/workflow-v3.2.mjs` and `scripts/compare-workflow-v3.2.mjs`, not the
initial revision commands above; title prefix is **E2E Lower v3.2 source-**.

The annotation gate is now **PASS** within its disclosed scope: retrospective
09c3cc8 reference 313865.86ms vs current 311786.37ms, 30 writes + 30 persisted
values each, all 15 comparison gates and a fresh actual registered android_look
check pass. Difference −0.66%, with one extra reference field-alignment cycle;
no demonstrated speedup or isolated annotation overhead. V2 remains immutable
historical protocol, not a comparable speed baseline. Failures remain preserved.

See [complete acceptance evidence](reports/annotation-v3.2-acceptance-2026-10-18.md),
[comparison](reports/workflow-v3.2-annotation-comparison-2026-10-18.md) and
[premeasurement](reports/workflow-v3.2-premeasurement-2026-10-18.md).
Future implementation slices still require a fresh equivalent before baseline,
full same-driver real-phone pair and freshly loaded relevant-tool verification.
