# Annotation timing: implemented; full-workflow acceptance OPEN

## Verdict

Shared-clock annotation instrumentation is implemented and controlled regressions,
focused real-phone checks and actual freshly loaded registered-tool checks pass.
**The mandatory Amazon.de → Forge acceptance gate is NOT complete.** Both after
attempts stop at the frozen Amazon `chosen_product_visible` assertion, before
Forge navigation. There is no passing after workflow, no verified after 30 writes
or 30 persisted values, and **no valid full-workflow elapsed-time delta**.

Focused timing was checked and one mode regressed. No demonstrated speedup,
isolated overhead estimate, zero-overhead, non-inferiority or population claim.
Do not start another implementation slice by treating this gate as passed.

## Chronology and immutable evidence

1. Started from clean production source `09c3cc8`; authorized device rediscovered,
   original Gboard captured, Termux foreground and normal Forge Sessions navigation
   verified. Existing hands-off authorization followed; no concurrent phone use.
2. Fresh frozen workflow [before attempt 1](workflow-annotation-before-2026-10-18-attempt1.json)
   PASS, **290991.75ms**, 74 hierarchy captures, 306 successful operation records.
   All shopping assertions, 30 numeric writes and 30 persisted values pass.
3. New frozen source fixture [before](annotation-before-2026-10-18-attempt1.json)
   PASS 6/6. New loaded CLI runner initially fails twice before tool events:
   [loaded1](annotation-loaded-before-2026-10-18-attempt1.json),
   [loaded2](annotation-loaded-before-2026-10-18-attempt2.json). Its piped stdin
   was left open; closing it produces [loaded before3](annotation-loaded-before-2026-10-18-attempt3.json)
   PASS. Exception/deadline details from those failed setup attempts were not
   retained; do not invent timeout provenance. The corrected loaded driver is
   frozen across its passing pair. See [pre-code checkpoint](annotation-baseline-2026-10-18.md).
4. Red → green at the pre-agreed public source/external process seam. Implement
   shared context, sibling and synchronous mapping/index spans; extend bounded
   capture IPC and companion OFFLINE vocabulary only.
5. [After workflow1](workflow-annotation-after-2026-10-18-attempt1.json) FAIL,
   **28415.32ms**, 18 successful operation records / 6 captures / 18 scoped command
   attempts. Exact query/focus/readback and three comparable offers pass;
   chosen-product visibility fails. No Forge navigation/draft/numeric writes.
6. [After workflow2](workflow-annotation-after-2026-10-18-attempt2.json) FAIL,
   unchanged source/driver, **27662.10ms**, same counts/checkpoint. No new draft.
7. Read-only native inspection of the current Brave search results shows the
   chosen Barista product at y=2089 (clipped below the frozen 200<y<1900 guard).
   This corroborates a current fixture mismatch; it does NOT prove the exact
   coordinates/cause during either earlier failed capture. No raw UI retained
   in published evidence. No page scrolling, search-policy change, visibility
   relaxation or frozen-driver edit was used to manufacture a passing workflow.
8. [Focused after](annotation-after-2026-10-18-attempt1.json) PASS 6/6.
   [Actual loaded after](annotation-loaded-after-2026-10-18-attempt1.json) PASS.
9. [Offline checkpoint audit](annotation-audit-2026-10-18.json) validates reports,
   provenance, scoped counts, focused sibling nesting and loaded results, while
   explicitly retaining `fullWorkflowAcceptance:"open"` and `workflowDelta:null`.

Full workflows: **3 attempts, 1 pass / 2 failures**, 347069.18ms all-attempt
reported elapsed; after failed work totals 56077.42ms. Assertion failures occur
outside operation wrappers, so zero failed operation records does NOT imply a
passing workflow. Both afters have zero capture stage errors and no truncation;
that is not correctness acceptance. They are not fast completed-workflow results.

## Focused equivalent source fixture

Settings → Termux app info, read-only exact OPEN control and all-elements Termux
label, numbered mapping/index checks, optional PNG signature. New driver
`scripts/annotation-check.mjs` frozen BEFORE production edits; first samples
retained. Three sequential rounds per mode, six calls per side; same transport,
fixture and options. Fresh `skipCache:true` passed through existing source option
forwarding (JS driver), without changing annotation's declared options/defaults.

| Mode / median ms | Before | After | Descriptive delta |
| --- | ---: | ---: | ---: |
| Interactive, no base64 | 2552.23 | 2497.65 | −2.14% |
| All elements, base64 | 2503.80 | 2534.38 | **+1.22%** |

All 12 calls correct: counts 10 interactive / 46 all-elements. Base64 absent
when unrequested; present and PNG signature valid when requested. Driver checks
every sequential label and its type/text/center in the index. This is not a
pixel-level image-rendering test: no compositing exists in this path.

Before **87 spans**, after **111 spans**, exactly 24 added spans (four × six).
Each call has 6 scoped command-attempt spans: three screenshot commands and
three hierarchy commands. Six screenshot+pull pairs and six native captures per
side follow from the audited source driver/path, NOT independent global device
subprocess accounting. No OCR/cache/reconnect is forced live. All source fixture
sinks complete/nontruncated; baseline sibling clocks independent, after ONE clock
per annotation call with overlapping sibling envelopes and contained descendants.
`traceComplete` here describes a synchronous local sink, NOT IPC or Pi hook
completeness. Nested sums are not elapsed wall time.

The **+1.22%** all/base64 regression remains disclosed. Three samples/mode and one
chronological pair do not isolate instrumentation overhead from normal variation
or establish non-inferiority. Median reductions are not speedup evidence.

## Public contract and failure behavior

`annotatedScreenshot({ onCaptureSpan })` creates a context once, or reuses an
explicit `captureClock`, then forwards it to both existing concurrent source calls:

- `annotation_screenshot`: entire `takeScreenshot` sibling, including nested
  command/capture/pull/dimensions/optional base64-read spans.
- `annotation_ui_dump`: entire `dumpUiTree` sibling, including existing cache,
  hierarchy, foreground and fallback paths when exercised.
- `annotation_map`: selection of existing all/interactive elements and mapping to
  the same zero-based annotation data.
- `annotation_text_index`: existing line/header construction and join. **Not
  compositing/rendering**; `generateAnnotationSvg` is untouched and not called.

Fixed stage/relative-time/outcome/failure fields only; no paths, serials, package,
selector, raw text, commands or raw errors. Sink exceptions ignored, options
copied (including frozen callers), default-off, no global collector. Existing
backend, cache TTL, retry, timeout, concurrency, fallback and output unchanged.

`Promise.all` still rejects on the first rejecting sibling WITHOUT cancelling
or waiting for the other. A sink can receive late completed sibling events after
annotation rejection. Tests explicitly preserve this behavior and absence of
mapping/index events after acquisition rejection. No total wall span, active-stage
start event or synthetic interrupted-stage failure is added. Caller snapshots
must not claim complete traces at early rejection. The frozen focused fixture
runner's local `traceComplete` flag is validated only for its successful samples;
on an acquisition-error run its `finally` assignment alone would not prove a
sibling finished. Any future failure evidence must conservatively treat that
trace as partial (use a separately versioned runner if changing that behavior).
No sibling/device cancellation,
fixed-remote-PNG concurrency protection, runtime companion hooks or production
input lifecycle added.

IPC/companion accept the four new stages under existing 128-event/privacy/partial
rules. The capture CLI itself still runs hierarchy-only, NOT annotation. Its
adversarial worker test verifies vocabulary/retention under deadline, not actual
live annotation IPC or device-side cancellation. Companion test retains partial
annotation error events without private fields. Runtime ingestion is separate.

## Freshly loaded actual tool pair

A real fresh nonpersistent Pi JSON CLI explicitly loads rebuilt `./dist/index.js`,
with no discovered extensions/MCP, only `android_look` allowed. Exactly one actual
registered call per successful check: `include_image:false, all_elements:true`.
No mocks or source-registration harness substitution. Exact Settings foreground,
Termux/OPEN in numbered index, matching start/end, no tool/JSON error,
`agent_settled(aborted:false)`. Pre-run build hashes match files afterward.

- Before attempt3: **2799ms** tool execute.
- After attempt1: **2555ms** tool execute.

One sample/side; not speedup/overhead evidence. Registered tool diagnostics remain
default-disabled; no internal spans inferred. Tool/source clocks NOT merged and
not model latency. Parent interactive session NOT reloaded. Private JSONL kept
temporary, no raw payloads committed. Raw image inclusion on the registered tool
was not exercised in this loaded pair; source base64 coverage is separate.

## Validation / provenance

- **694/694 units, 53 files**, `npm run test:unit -- --maxWorkers=2`.
- **9/9 isolated sequential integrations**, existing 20s test / 30s hook
  allowances; lint/build, new script syntax and diff whitespace checks pass.
  Default full-parallel CI remains unverified, not declared fixed.
- Companion **38/38**, build/check pass. New vocabulary first red (37/38), then
  green. Source first red on missing annotation envelopes, then green. IPC first
  red on discarded annotation stages, then green. No existing limits weakened.
- Eleven new public process cases: shared-clock overlapping siblings, explicit
  ADB timeout, all/interactive/base64 options, disabled/throwing diagnostics,
  supplied-clock precedence, cache hit, native OCR fallback, each sibling failure
  and late completion. No fabricated mapping/index exceptions: production parser
  returns valid arrays, and invalid collaborator-return mocks are not this seam.
- Audit independently hashes baseline engine bytes from `git show 09c3cc8` and
  measured current source; verifies focused/loaded drivers unchanged and actual
  built hashes. Frozen workflow's nine-file hash does NOT include annotate.ts;
  focused source hash DOES include it. Workflow does not exercise annotation.
- Nine temporary offline adversarial probes rejected: missing persisted check,
  false passing-after claim, wrong driver hash, incomplete/truncated fixture,
  broken sibling timing, negative duration, failed loaded-build check, and existing
  output refusal. These are separate audit probes, not additional unit-test counts.
- Historical reports, frozen v1/v2 drivers/adapters and migration comparator remain
  byte-identical. New audit is checkpoint-specific, not an evergreen passing-pair
  validator. It intentionally accepts these TWO documented failed afters only,
  and must not be repurposed to silently bless other failures.

Reproduce audit from repository root; output must be NEW:

```sh
node scripts/audit-annotation-checkpoint.mjs \
  docs/performance/reports/workflow-annotation-before-2026-10-18-attempt1.json \
  docs/performance/reports/workflow-annotation-after-2026-10-18-attempt1.json \
  docs/performance/reports/workflow-annotation-after-2026-10-18-attempt2.json \
  docs/performance/reports/annotation-before-2026-10-18-attempt1.json \
  docs/performance/reports/annotation-after-2026-10-18-attempt1.json \
  docs/performance/reports/annotation-loaded-before-2026-10-18-attempt3.json \
  docs/performance/reports/annotation-loaded-after-2026-10-18-attempt1.json \
  /private/NEW-annotation-audit.json
```

Live runners need freshly discovered exact `ANDROID_SERIAL`; Settings → Termux
app info must be selected before each focused/loaded run. Use unique NEW outputs:
`PI_DROID_ANNOTATION_CHECK=1 node --import tsx scripts/annotation-check.mjs OUTPUT`
and the same opt-in for `scripts/annotation-loaded-check.mjs`. Both restore Termux
and verify unchanged IME; the supervisor must independently verify afterward.
No concurrent builds/tests/device actions during measurement. Frozen full workflow
invocation and safety limits remain in WORKFLOW-V2.md.

## Safety / next action

One new TEST draft: `E2E Lower v2 source-ann-before88`, **15 total** including
prior 14. Its 15 sets remain unchecked at 20kg × 8, all persisted values verified.
Neither failed after creates a draft. No real workouts finished, account/cart/
checkout changes, new APK/permission/helper/debugging exposure. Gboard and Termux
independently verified after every full/focused/loaded attempt and inspection.

Next is to close this OPEN full-workflow gate without weakening frozen checks.
If Amazon fixture remains changed, obtain agreement on a separately versioned
protocol and fresh equivalent BEFORE/AFTER pair; never edit historical drivers or
use these failed after timings as a performance result. This baseline is not
indefinitely reusable. Automatic runtime ingestion, finer reconnect, cancellation,
remote capture concurrency and production input lifecycle stay separate later slices.
