# Observation audit and pre-change capture reference — 2026-10-17

## Status

Audit and read-only capture reference complete; **no production optimization has
been implemented**. Starting source revision: `4222a47` (origin/main). This audit
changes only documentation and saves new evidence. Historical JSON and the v1
workflow driver are untouched. The next implementation needs an agreed public
interface/test seam; see the proposal below.

## What the saved workflow actually shows

Source: `reports/workflow-source-after-2026-10-16.json`.

- 102 `ui_dump` operations; 101 instrumented foreground spans (the popup's
  special capture is deliberately untraced).
- **46 adjacent pairs of `ui_dump` operations**, with no recorded operation
  between the first and second. Those second captures total **120,628.23ms**.
- The driver often reads a tree to select a search field, product, workout field
  or section header, then calls `click`, which always performs another `look`.
  Each numeric field loop also reads before `replaceAt`, which calls `click`.
- These are **candidate duplications**, NOT 46 proven-safe removals or a promised
  121-second speedup. Some repeated reads can be polling for asynchronously
  changing UI. No-input-between-reads does not prove an unchanged screen.

Reproduce the metadata-only count without touching the phone:

```sh
node --input-type=module - <<'JS'
import {readFileSync} from 'node:fs';
const r = JSON.parse(readFileSync('docs/performance/reports/workflow-source-after-2026-10-16.json'));
const ops = r.operations;
const candidates = ops.filter((op, i) => op.stage === 'ui_dump' && ops[i-1]?.stage === 'ui_dump');
console.log({dumps: ops.filter(op => op.stage === 'ui_dump').length,
  adjacentSecondCaptures: candidates.length,
  secondCaptureMs: candidates.reduce((n, op) => n + op.durationMs, 0)});
JS
```

This count is from the historical workflow, NOT a fresh current-source replay.
Changing only the benchmark to omit observations would optimize that driver, not
prove a library/registered-tool speedup. Keep those claims separate.

## Production-path audit

| Path | Current behavior / implication |
| --- | --- |
| `dumpUiTree` | Already screenshot-free for a successful native hierarchy; `ocrFallback: false` is required to guarantee no hidden screenshot/OCR fallback. Exposes all elements. |
| `android_ui_dump` → `Device.describeScreen` → `summarizeTree` | Captures a tree but exposes only interactive elements. Non-interactive information can therefore require another tool call even though it was already captured. |
| `android_look` → `annotatedScreenshot` | Always captures a screenshot, even when image inclusion is false. That flag controls payload inclusion, not capture. |
| `android_observe` → `observe` | Always captures a screenshot; source API returns all elements, but registered tool exposes only interactive elements. Also separately queries foreground in parallel while `dumpUiTree` queries it internally. |
| `findAndTap`, `Device.tapElement` | Can select/tap from one dump when the selector is already known. They do not solve dynamic selection from an independently inspected tree. They currently use the normal cache policy. |
| v1 workflow `look` → `click` | Dynamic selection followed by an unconditional second fresh dump; useful conservative reference but not an optimized reusable operation. |
| Cache | Global 2s TTL, invalidated on input. Raising TTL or trusting cached coordinates is NOT the proposed optimization; device/policy isolation would need separate review. |

Additional unrelated finding: `typeIntoField(clearFirst)` in automation.ts still
contains its own old keyevent clearing sequence instead of delegating to the
fixed `typeText({clear:true})`. The earlier input report specifically validated
`android_type`/`typeText`, not this helper. Track a separate regression/fix; do not
silently fold it into a performance measurement.

## Ranked hypotheses / discriminating measurements

1. **Dynamic read → select → tap duplication:** a bounded operation that selects
   synchronously from its own fresh tree should remove one capture where the
   current caller performs two, without weakening pre-action verification.
   Test with a changing fixture and compare actual dump counts/correct action.
2. **Incomplete text output causes extra observations:** exposing captured
   non-interactive text without a screenshot should let information tasks finish
   after one read. A known non-interactive-label task must pass from one result;
   source API availability alone does not prove registered-tool usefulness.
3. **Unconditional screenshot/duplicate foreground work:** optional strict
   hierarchy-only observation should eliminate screenshot/OCR work. Native dump
   latency may still dominate because captures currently run in parallel; fewer
   commands is not automatically lower wall time. Measure both counts and time.

These are different slices. Do not change all three simultaneously and then
attribute the improvement to one of them.

## Fresh current-source capture reference (BEFORE implementation)

Raw evidence:
[observation-audit-capture-before-2026-10-17.json](reports/observation-audit-capture-before-2026-10-17.json).

Same approved non-sensitive fixture as the earlier baseline: Settings → Termux
app info, native title and OPEN label verified by exact unique ID/text/class.
No button activation, input, IME switch, new draft, APK/helper/permission or
browser debugging. Gboard stayed active; its preflight warning was expected for
this capture-only run. Authorized wireless target freshly discovered and never
written into the report.

Measured with UNCHANGED `scripts/capture-benchmark.mjs` at `4222a47`:
- 6 requested rounds; desired capture <=5000ms, observation deadline 10000ms,
  total budget 45000ms, `trace: true`.
- `skipCache: true`, OCR/reconnect disabled, required dump success marker.
- **6/6 correct**, zero failures/timeouts; capture targets met.
- Capture median **2589.66ms**, max/p95 **2611.59ms** (small-sample descriptive).
- Including fresh worker/import/shutdown: median **3221.17ms**;
  all-attempt time **19318.08ms**.
- Across six captures: device dump **14687.33ms**, transfer **169.86ms**, read
  **17.36ms**, parse **41.51ms**, foreground **576.78ms**. Dump remains dominant.
- Bootstrap attempt with a 1s navigation settle rejected the foreground before
  benchmark start; no successful result was fabricated. After a 3s settle, the
  six-round benchmark passed. Termux/unchanged IME verified in both attempts.

A temporary supervisor launched the approved Settings intent, verified the
fixture, created private expectations, called the existing CLI, exclusively
created the report, removed private expectations, and restored/verified Termux
and the original IME in finally. It was removed after measurement. No tests or
builds ran concurrently. External SIGKILL/crash cleanup is not guaranteed.

Hashes of production files at this reference:

| File | SHA-256 |
| --- | --- |
| `src/adb/ui-tree.ts` | `c99c33a684de6abe225f56696f5b61cb44efbc6484b68c724555b7a629a6c41c` |
| `src/adb/automation.ts` | `eaa063e6532a952802adeb5b85c9aa94505250d0514caa9b90f93585b2196c08` |
| `src/tools/device.ts` | `6f96a9945e7d628b32e8f354e88d5674653dc17a9c539ddebbb6d92d64138b50` |

**Scope limitation:** this is a single-capture reference, not an equivalent
baseline for a new batched API, visual-vs-text observation, or complete Amazon
→ Forge workflow. Before implementing the chosen operation, freeze its driver
and save the equivalent old-path operation baseline as well. No speedup claimed.

## Proposed next implementation and test agreement

Recommend addressing hypothesis 1 first with a narrow production **fresh
read/select/tap** operation, rather than a long-lived observation-token cache.
Selection must be synchronous and local to that operation. It must refuse a
missing/ambiguous target, enforce foreground/element validity, respect
cancellation and fail closed before mutation. No snapshot reuse across unrelated
calls, actions, asynchronous model decisions or elapsed polling is assumed safe.
The default existing tool behavior and frozen workflow remain intact.

Before writing implementation tests, confirm these public seams:

1. **Public source operation → synthetic external ADB.** Exercises real capture,
   parser, selection and input; verifies the intended control is selected from
   one fresh capture, fail-before-tap behavior and cancellation. Does not prove
   real Android layout/input behavior or agent orchestration performance.
2. **Opt-in live source/API CLI on an approved test-only fixture.** Same logical
   selection/action/readback through the old and new paths, same unchanged driver,
   preserved pre-change baseline and all failures, actual counts and elapsed time.
   Proves that fixture, not model latency or arbitrary apps. Restore fixture,
   original keyboard and Termux on every outcome.

A later text-only registered-tool slice can expose non-interactive content and
skip screenshots explicitly. It needs its own tool-output test agreement and
visual-vs-text baseline; it is not bundled into the first capture-removal change.
