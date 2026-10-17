# Registered text-observation slice — 2026-10-17

## Outcome and public interface

User confirmed extending **existing `android_ui_dump`** with `all_elements` and
`ocr_fallback`, and testing the actual registered tool output with synthetic ADB.
No new tool name, default change, cache TTL change or workflow migration.

```json
{"all_elements": true, "ocr_fallback": false}
```

- `all_elements` defaults to false. True includes every native hierarchy node,
  including non-interactive information. Existing text/description/resource/class
  label precedence, centers and hierarchy order remain. Nodes outside the enabled
  interactive set carry `[non-interactive]`; this also covers disabled controls.
  It does not make labels tappable. Empty layout nodes can appear in this mode.
- `ocr_fallback` defaults to true (same automatic fallback as before). False
  requests a **fresh native-only capture**, bypassing cache so old merged/OCR
  information cannot leak into the result. Requires the dump success marker and
  propagates dump/pull/read errors instead of returning an apparently successful
  empty observation. It never runs screenshots/OCR. A successful native hierarchy
  can still omit inaccessible/custom-rendered text; zero matching information is
  not proof the screen is empty. With `all_elements:false`, a non-interactive-only
  hierarchy legitimately yields zero output elements.
- Omitting both options preserves the old interactive summary byte-for-byte and
  its existing cache/fallback behavior. False fallback forces freshness even if
  `all_elements` is omitted; these options have independent output/acquisition roles.
- Source callers: `Device.describeScreen({allElements:true, ocrFallback:false})`.
  The shared `summarizeTree(tree, {allElements:true})` only formats a supplied
  observation; it makes no freshness/no-OCR acquisition guarantee on its own.

Implementation: `src/tools/device.ts` → `Device.describeScreen` → existing
`dumpUiTree` flags → `summarizeTree`. No capture backend or lower-level fallback
policy was changed for other callers. Existing whole-tool cancellation/reconnect
limitations remain; this option is not a strict whole-observation deadline.

## Equivalent task and preserved baseline

Task: read the exact non-interactive **Termux** title and **OPEN** button from
Settings → Termux app info, and check Settings foreground. No button activation.
Old `android_ui_dump({})` already captured the title but omitted it in the summary
(title absent / OPEN present verified on BOTH runs). Therefore the equivalent
old information-reading path is `android_look({all_elements:true,include_image:false})`.
That existing tool still captures/pulls a screenshot even with `include_image:false`.
It captures hierarchy and image in parallel; removing the image does not imply
lower wall time. Comparing only the old incomplete dump would fail task equivalence.

Immutable evidence saved before production edits:
- [Before JSON](reports/text-observation-before-2026-10-17.json)
- [Before Markdown](reports/text-observation-before-2026-10-17.md)

After implementation, same frozen driver:
- [After JSON](reports/text-observation-after-2026-10-17.json)
- [After Markdown](reports/text-observation-after-2026-10-17.md)

Driver `scripts/text-observation-e2e.mjs` SHA-256 on BOTH reports:
`68a295ec48d859066c1e4e624bc31f9738f3abe489c5f550294cd0b9b9f81a22`.
All src/*.ts provenance is recorded recursively. Only `src/adb/device.ts`,
`src/adb/ui-tree.ts` and `src/tools/device.ts` differ. Current files were checked
against the after hashes; no source edits followed the after measurement.

One initial harness invocation failed **before report creation/navigation**:
`dumpsys window windows` did not expose this device's foreground marker. Driver
was corrected to the existing production query, `dumpsys window | grep mCurrentFocus`,
before the successful baseline. Neither passing report was overwritten or repaired.

## Controlled live comparison

| Measurement | Old registered `android_look` | New registered native-only dump |
| --- | ---: | ---: |
| Exact title + OPEN + foreground checks | 6/6 PASS | 6/6 PASS |
| Hierarchy captures / XML pulls | 6 / 6 | 6 / 6 |
| Screenshot captures / image pulls | 6 / 6 | 0 / 0 |
| Screen-dimension queries | 6 | 0 |
| Foreground queries | 6 | 6 |
| Forbidden/recovery/mutation command attempts | 0 | 0 |
| Median registered-tool elapsed | 3077.87ms | 3128.77ms |
| Max elapsed (six samples only) | 3133.80ms | 3191.81ms |
| Six-round measured loop | 18452.20ms | 18819.05ms |

**No demonstrated latency speedup.** Median is **1.65% higher** in this pair;
loop is 1.99% higher. This is a capability/image-work reduction, not a measured
speed optimization. Native capture count is unchanged. Parallel screenshot work
was removed, but this experiment does not establish why the modest timing
variation occurred. No population/tail, general-app or workflow claim follows.

External ADB wrapper retains fixed operation categories only, including screenshot
attempts and transfers, not inferred capture counts. Both paths use the same
wrapper overhead and same untimed default-dump warmup. Cache invalidated before
every measured round (TTL unchanged); driver imports/setup/cleanup excluded.
No builds/tests/device operations ran concurrently with either live measurement.
No raw screen text/XML/images, paths, raw errors or target endpoints are retained
in reports. Private local screenshot/XML scratch was removed in finally.

Gboard remained active and original IME + Termux restored on both runs, independently
verified afterward. No typing, installs, permissions, persistent settings, purchases,
record deletion, draft creation, training edits or completed sets. The existing
nine labelled test drafts are untouched. v1/v2 drivers and evidence remain frozen.

## Regression and validation evidence

`tests/tools/ui-dump.test.ts` invokes the **registered tool definition's execute**
in a fresh subprocess. Real registration/Device/capture/parser/cache/OCR/formatting
run; ONLY external ADB and Tesseract executables are synthetic. This catches missing
schema/arguments, silently omitted information, incorrect centers/labels, unintended
screenshots/OCR and cached OCR contamination. It does not prove real Android,
active-session schema reload or model/tool choice. The separate live pair covers
this one real static fixture through source-registered tools, not LLM dispatch.

Red → green retained in session:
1. `all_elements` schema/output missing → information labels and centers present.
2. `ocr_fallback` missing → minimal native hierarchy captured without image/OCR.
3. A real earlier OCR/merged capture was reused → fresh native-only data instead.
4. Dump exit, zero-exit/no-marker and pull errors silently succeeded → propagated.

**13 new regressions:** above behaviors plus exact default/explicit-false output,
explicit-true/default OCR behavior, disabled/description-only labels and native-only
acquisition independent of the information-output flag.

Validation:
- Focused new tests: **13/13 PASS**.
- First default full unit run: **661/662**, one existing preserved-old-adapter test
  exceeded its **5000ms** test limit. This is an observed timeout, not a proved cause.
  No old tests/driver/time limits were changed. Isolated existing workflow suite
  rerun: **5/5 PASS** (old-adapter case 2172ms).
- `npm run test:unit -- --maxWorkers=2`: **662/662 PASS, 51 files**. This bounded
  concurrency result is NOT a passing default full-suite/parallel-CI claim.
- Lint/build/script syntax/diff whitespace: PASS.
- Isolated sequential extension-load + sandbox integration with documented
  20s test / 30s hook allowances: **9/9 PASS**. Default CI remains unverified.
- Companion `npm test` + `npm run check`: **16/16 PASS**, build/type check, unchanged.

## Reproduction and remaining work

Require the same authorized portrait phone and initial English Settings fixture.
Return to Termux first; screen awake/unlocked. Driver discovers exactly one current
authorized ADB transport and refuses ambiguity. No saved endpoint is needed.
Explicit opt-in and NEW JSON + adjacent Markdown paths are required; report creation
uses exclusive opens. A label chooses the tool, **not the production revision**.
Use an isolated checkout of baseline revision `730a189` with this frozen driver
and existing dev dependencies to reproduce the original-source old path; do not
rewrite historical reports. After path requires the implemented revision.

```sh
PI_DROID_TEXT_E2E=1 node --import tsx scripts/text-observation-e2e.mjs before /private/NEW-before.json
PI_DROID_TEXT_E2E=1 node --import tsx scripts/text-observation-e2e.mjs after /private/NEW-after.json
```

Six rounds, 120s budget checked between operations and 15s external command
bounds. These are not a hard whole-process budget/device-side termination guarantee.
Finally handles caught failures, not SIGKILL/host crashes; independently restore
IME and Termux after interruption. Driver records hashes/correctness/counts but
has no automated paired-report acceptance CLI. Compare only equivalent passing
reports, identical driver, unchanged non-target source hashes and complete checks.

Next exact action: verify a freshly loaded Pi session actually exposes the new
schema and native-only output on a read-only fixture. Then finish finer
command/screenshot/OCR/reconnect timing and companion ingestion before selecting
another speed change. Native UIAutomator still dominates the earlier static-label
capture reference; this slice did not remove any native capture or diagnose its
internal cost. Automatic production input verification and default CI reliability
remain separate unfinished work. See [PLAN.md](PLAN.md).
