# Amazon.de → Forge: execution metadata slice and live evidence

## Baselines and chronology

1. [Original registered-tool baseline](workflow-baseline-2026-10-16.md), trace
   start 21:43 UTC: captured and saved **before implementation source edits**.
   Wall 512.882s, Android-busy union 262.514s, 253 tool calls. Full workflow
   completed with an explicit keyboard-clear workaround. Strict clear-first
   correctness failed despite successful tool responses. Do NOT compare this
   agent-assisted run's wall time with the deterministic source runs as a speedup.
2. A repeatable executable source/API driver was then developed. It is NOT a
   loaded Pi extension/SDK test. Reference source was extracted without edits
   from git commit `4a2b4f64c13af11735fffe6796b73d3e908b51ed` into a temporary
   directory, with existing node_modules linked. The working implementation
   was never reverted. This additional original-revision reference was measured
   after coding; it does not replace the chronological pre-change baseline.
3. [Passing source reference](workflow-source-before-2026-10-16-attempt5.json)
   and [changed-source run](workflow-source-after-2026-10-16.json) use identical
   harness hash `1c0b0bc754509619f2fc0940afe4463527468f6721e59424c050490107cdbfd6`.
   Both passed all 28 boolean correctness checks, plus 5 persisted field counts.
   Each recorded 364 source operations (including 94 fixed settling waits),
   102 fresh hierarchy observations, one explicit OCR label lookup, zero
   operation errors, and 505 completed capture spans. No traces truncated.
   Source hashes differ and are retained in JSON, proving the measured source
   boundaries were not the same stale active-session implementation.

## Measured comparison

Full reproducible [comparison table](workflow-comparison-2026-10-16.md), generated
by `scripts/compare-workflow.mjs` from the two original JSON files:

| Metric | Original source | Changed source |
| --- | ---: | ---: |
| Workflow wall | 361.679s | 362.485s |
| Fresh hierarchy observations | 102 | 102 |
| Observation median | 2629.12ms | 2625.87ms |
| Observation nearest-rank p95 | 2780.42ms | 2857.86ms |
| Observation max | 7254.19ms | 7839.92ms |
| Observation cumulative | 277.013s | 277.737s |
| Device-dump span cumulative (101 observations traced) | 257.487s | 257.736s |
| XML-transfer span cumulative | 5.288s | 5.448s |
| Local-read span cumulative | 0.114s | 0.128s |
| Parser span cumulative | 0.303s | 0.306s |
| Foreground span cumulative | 10.374s | 10.498s |
| Explicit fixed settling waits | 47.116s | 47.127s |

After minus before: **+805.75ms / +0.22% wall time**. No demonstrated speedup,
and a single pair cannot establish a regression. The change is diagnostic,
not an optimization. Hierarchy medians barely differed; tails and network/app
startup can vary. The popup's hierarchy observation was intentionally not
traced (its window foreground is unknown; parent activity is verified separately).
Source operations are not profiler tool calls. The live success path contains
no induced timeout, so diagnostic improvement is established by the offline
real-process-boundary regressions, NOT invented live failure evidence.

## Workload and correctness

- Same authorized phone/transport, portrait 1080×2340, installed Brave and Forge.
  Current wireless endpoint rediscovered after a disconnect; no stale endpoint
  committed. No builds/unit tests concurrent with the measured source pair.
- Tesseract 5.5.2 plus English data and dependencies installed in Termux with
  explicit user approval before the chronological baseline; no phone APK,
  Accessibility grant, browser debugging or helper installed.
- Query `Mandelmilch` read back in Amazon.de. Both source runs compared the same
  fixed Alpro offer sample: unsweetened 8×1L €16.99/€2.12 per litre, Original
  8×1L €16.99/€2.12 per litre, Barista 8×1L €18.94/€2.37 per litre. Chose the
  first cheapest tie. This is NOT the cheapest of all Amazon; later lower-priced
  listings existed. No purchases, cart, subscriptions or account changes.
- Original agent baseline visually verified product stock, size and one-time
  price on the detail page. The scripted runner verifies navigation to a
  product-detail URL after tapping the selected observed offer, not a separate
  detail-page price/stock assertion. Do not overstate its commerce coverage.
- Forge uses the installed Lower template: Squat, Romanian deadlift, Lunge,
  Leg curl, Calf raise, 3 sets each; every set **20 kg × 8 reps**, unchecked.
  Arbitrary deterministic test values, not advice or a record of actual exercise.
  The runner verifies 6 exact numeric fields per exercise before leaving and
  after reopening the correctly labelled draft. Template exercise names were
  visually verified during baseline exploration; the scripted numeric checks
  assume that unchanged template (they do not independently assert each name).
- Workaround is explicit `ADB_CLEAR_TEXT` + type + exact UI readback. This
  slice does NOT fix `clear_first`, focus verification in the default type tool,
  or broadcast exposure. Original Gboard was restored and Termux independently
  verified after each run, including failed runs and at the end of validation.

## Failed harness attempts (preserved, not counted as passes)

- [Attempt 1](workflow-source-before-2026-10-16-attempt1.json): 284.335s,
  entered all 30 fields but reopened the older baseline draft. Harness now uses
  OCR label containment instead of assuming a fixed first-card position.
- [Attempt 2](workflow-source-before-2026-10-16-attempt2.json): 68.766s,
  stopped at the first exercise visibility gate, before numeric mutation.
- [Attempt 3](workflow-source-before-2026-10-16-attempt3.json): 326.750s,
  all numeric write/readbacks passed; persisted first-exercise visibility failed
  because a row was clipped at the top. Harness aligns clipped rows in either
  direction and uses non-field margin swipes plus explicit 500ms settling waits.
- [Attempt 4](workflow-source-before-2026-10-16-attempt4.json): 42.783s,
  failed closed at a control gate because Forge resumed an open draft, not its
  navigation screen. No new draft created. Setup subsequently returned Forge
  to Sessions before starting the final pair.
- Harness evolved during these failed attempts; they are NOT comparable paired
  timings. Raw JSON retained separately and never overwritten.

## Retained app artifacts

Six explicitly test-created drafts remain, separate from the user's original
Custom session and weekly program: `E2E Lower v1 baseline`, `E2E Lower v1
source-before`, `source-before2`, `source-before3`, `source-before5`, and
`source-after5` (each source name has the same `E2E Lower v1 ` prefix).
`source-before2` is partial/default numeric data; the others received all fixture
values. No draft was marked finished. No user workout or program was deleted.
Retained drafts are disclosed, not silently cleaned up or represented as real
training history. Future runs need unique public run labels and start in Forge's
normal navigation screen; do not resume/edit an existing draft.

## Validation and remaining work

- `npm run test:unit`: **586 tests / 46 files pass**. Includes 9 execution-boundary
  tests, real timeout/cancellation/signal/exit/buffer/spawn, 18 capture tests and
  adversarial parent IPC allowlist/overflow coverage. Focused timeout test first
  failed for absent metadata, then passed with implementation.
- An initial full unit rerun failed a synthetic foreground command's overly
  tight 300ms test timeout under parallel host load; fixture limit adjusted to
  2000ms. This is a test scheduling correction, not a production latency claim.
- Type check/build, all four script syntax checks, diff whitespace: pass.
- Isolated sequential integration with existing explicit time allowances:
  **9/9 pass**. Default parallel CI reliability remains unresolved/unclaimed.
- Companion profiler `npm test`/`npm run check`: **16/16 pass**; no companion edits.
- Metadata categories now survive AdbError → capture span → worker IPC → parent
  report, including swallowed capture failures. Unknown failures remain unknown;
  no duration-based timeout inference, command/path/serial/raw-error export.
- Still open: finer command-attempt/screenshot/OCR/reconnect spans, profiler
  ingestion, whole-observation/sibling cancellation, active-session tool reload,
  default input replacement bug, and a true controlled latency optimization.
