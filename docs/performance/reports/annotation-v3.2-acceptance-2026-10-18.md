# Annotation acceptance closed under workflow v3.2 — 2026-10-18

## Verdict and protocol decision

**PASS within the disclosed success-path scope.** The mandatory Amazon.de → Forge
workflow now has a validated same-v3.2 retrospective reference/current pair, each
with all shopping checks, 30 exact numeric writes, exact OCR draft reopening and
30 persisted numeric values. A freshly rebuilt/loaded registered `android_look`
also passes independently. No production source was changed during this
continuation; existing focused annotation success/failure evidence still applies.

**Select v3.2 as the active acceptance protocol; preserve v2 as historical.**
The reason is correct bounded alignment of today's offscreen product, not speed.
V2 cannot complete its unchanged visibility guard on this layout. Initial v3 and
v3.1 failed; v3.2 passes while retaining exact identity, ambiguity rejection,
nonzero bounds, enabled/clickable/non-scrollable controls, strict 200<y<1900,
eight-scroll cap and fresh pre-tap confirmation. V2 and its comparator are untouched.
Do not compare historical v2 times against v3.2 as a controlled performance result.

The original annotation report/audit remain immutable checkpoint evidence with
acceptance OPEN at that earlier point. This report closes that gap; it does not
retroactively turn earlier failures into passes or relabel chronology.

## Preserved attempts

All reports below are in this directory with date 2026-10-18:

| Report prefix / attempt | Result | Elapsed ms | Writes / persisted values | Captures / scoped command spans |
| --- | --- | ---: | ---: | ---: |
| workflow-v3-annotation-reference / 1 | FAIL visibility | 65637.22 | 0 / 0 | 15 / 45 |
| workflow-v3.1-annotation-reference / 1 | FAIL visibility | 67173.07 | 0 / 0 | 15 / 45 |
| workflow-v3.2-annotation-reference / 1 | FAIL exact OCR draft identity | 297316.42 | 30 / 0 | 69 / 267 |
| workflow-v3.2-annotation-reference / 2 | PASS | 313865.86 | 30 / 30 | 79 / 297 |
| workflow-v3.2-annotation-current / 1 | PASS | 311786.37 | 30 / 30 | 78 / 294 |

All have zero capture-stage errors and nontruncated retained spans. This does NOT
make failed workflows successful or their traces whole-workflow command accounting.
Frozen-v2 failures remain retained separately. No failed elapsed time is used as
completed-workflow performance evidence.

## Diagnosis and regression

Controlled forward scroll/native observation reproduced
2089 → 0 → 0 → 0 → 0 → 1967 → 1608; screenshot corroborates the visible card.
Zero-height clipped geometry at y=2089 and origin-position offscreen observations
must not determine a reversal. The old driver reversed at y=0 and undid progress.
V3.2 retains the last direction through missing/zero-area geometry, initially
forward. It allows valid positive-area geometry to update direction; tap guards
are unchanged. On the successful reference the actual observed sequence was
2089 → 0 → 0 → 0 → 0 → 1991 → 1626, confirmed freshly before tap.

An external fake-ADB regression at the real driver/process seam failed under
copied v3.1 behavior, then passed after this change. Six driver regressions pass,
including bounded failure, identity change, ambiguity and cleanup after deliberate
later Forge failure. Artificial overshoot coverage remains labeled artificial.

V3.2 reference attempt1 reached all 30 writes but exact OCR token lookup failed.
Read-only inspection found the exact visible/native title; diagnostic OCR at
confidence 0 found `source-ann32-ref1` at 44.42, below default 50. No threshold,
OCR fallback, identity matching or retained draft was altered. Attempt2 uses a
unique historical-style `ann-before94` run label; current uses `ann-after94`.
This fixture-label adjustment was documented before the second reference.
See [diagnosis](workflow-v3.2-attempt1-diagnosis-2026-10-18.md) and
[premeasurement checkpoint](workflow-v3.2-premeasurement-2026-10-18.md).

## Comparable timing and provenance

See [comparison JSON](workflow-v3.2-annotation-comparison-2026-10-18.json) and
[Markdown](workflow-v3.2-annotation-comparison-2026-10-18.md).
All **15 comparison gates pass**: both phases/statuses, frozen driver/consumer,
independent ten-file source manifests, annotation-only source slice, 34 identical
checks, all writes/persisted values, identical offers/chosen identity, complete
scoped capture accounting, successful operations, selections/types/OCR and retained
operation sequence after normalizing only complete alignment triples.

Reference is isolated `git archive 09c3cc8`, measured AFTER annotation implementation
but BEFORE this current measurement. It is **retrospective**, not a chronological
pre-code baseline. No tests/builds/concurrent device work ran during measurements.
One discovered exact transport was pinned privately; no identity is published.

Frozen driver SHA-256:
`58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c`.
Consumer SHA-256:
`3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27`.
Source independently matches 09c3cc8/current; only annotate.ts and capture-timing.ts
differ, and the current production tree is unchanged in this continuation.

Current minus reference: **−2079.49ms (−0.66%)**. Both needed six product alignment
cycles (26657.76 / 27028.18ms). Reference needed one extra field alignment cycle
(3464.07ms), current zero. Alignment remains INCLUDED in elapsed times. No adjusted
or isolated-overhead estimate, speedup, population effect or non-inferiority claim.
Scoped command spans are NOT whole-workflow counts; nested sums are not wall time.
Source workflow does not exercise annotation; its provenance includes annotate.ts
but coverage comes from the separately disclosed focused/loaded checks.

## Fresh actual loaded extension

`npm run build` succeeded; unchanged `scripts/annotation-loaded-check.mjs` starts
a fresh nonpersistent Pi JSON CLI, explicitly loading only `dist/index.js`, MCP
disabled. Actual registered `android_look(include_image:false,all_elements:true)`
called exactly once on Settings → Termux app info. Exact numbered Termux and OPEN
labels, no tool error, matching start/end, settled-not-aborted and unchanged build
hashes all pass. New [loaded report](annotation-v3.2-loaded-2026-10-18.json):
**2998ms**, tool clock only. All four build hashes match the previous after report;
this is a new loaded verification, not a reload of the parent interactive session.
No new loaded reference pair or performance inference from this one call.

Existing frozen focused pair remains applicable to unchanged production source:
6/6 per side, interactive/no-base64 median −2.14%, all/base64 **+1.22%**.
The latter regression remains disclosed. Controlled source/IPC/companion tests,
not this success workflow, cover sibling failure/late completion, timeout,
fallback/cache and partial retention. See immutable
[annotation evidence](annotation-timing-2026-10-18.md).

## Safety and validation

Three new retained TEST drafts in this continuation:
- `E2E Lower v3.2 source-ann32-ref1`: all 30 writes/immediate readbacks, persisted
  readbacks NOT attempted by the failed workflow.
- `E2E Lower v3.2 source-ann-before94`: all 30 writes and persisted values verified.
- `E2E Lower v3.2 source-ann-after94`: all 30 writes and persisted values verified.

No Amazon cart/account/purchase changes, no completed sets/workouts, no new APK,
permission/helper/debugging exposure. Original Gboard and Termux independently
verified after diagnosis, each measured attempt and the fresh loaded check.
All failed attempts and drafts retained; no mid-measurement manual intervention.

Validation: **721/721 unit tests, 55 files, --maxWorkers=2**, including 6 external
ADB driver and 21 offline comparator tests (18 adversarial failures, real pair,
privacy and no-overwrite). Lint/build, new script syntax and whitespace checks pass.
Default full-parallel CI remains unverified. Existing integration/companion results
are historical, not rerun here; no changes to those runtimes.

Future slices require their own fresh comparable baseline before implementation,
full v3.2 workflow pair and actual fresh relevant-tool checks. Closing this gate
does not implement runtime ingestion, cancellation, finer reconnect stages,
remote screenshot concurrency or production automatic input lifecycle.
