# Next-session handoff

Read `docs/performance/PLAN.md` first (mandatory real-phone acceptance gate),
then `reports/annotation-timing-2026-10-18.md`,
`reports/annotation-audit-2026-10-18.json` and `CAPTURE-BENCHMARK.md`.
Prior screenshot/OCR evidence remains in its unchanged report and checkpoint.

## Latest continuation — annotation acceptance PASS under v3.2

Read [new complete evidence](reports/annotation-v3.2-acceptance-2026-10-18.md) and
[active protocol](WORKFLOW-V3.md) before treating the older OPEN checkpoint below
as current. Historical reports/audits remain untouched.

- Selected v3.2 for correct bounded offscreen product alignment, not speed. Frozen
  v2, initial v3/v3.1 and all failures preserved. Zero-area origin geometry must
  not reverse scroll direction; v3.2 retains last direction, initially forward.
  All eight-scroll/identity/actionability/nonzero-bounds/visibility/fresh-confirm
  guards, shopping assertions, Forge writes/persistence and cleanup retained.
- New driver scripts/workflow-v3.2.mjs SHA-256
  58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c;
  new comparator scripts/compare-workflow-v3.2.mjs. No production source changes.
- Retrospective isolated 09c3cc8 reference attempt2 PASS 313865.858162ms,
  current attempt1 PASS 311786.372745ms. Both 30 writes + 30 persisted values;
  all 15 comparator gates pass. Captures 79/78, scoped spans 297/294; six product
  cycles each, one/zero field cycles. −2079.49ms (−0.66%) is descriptive only;
  extra reference field cycle 3464.07ms not subtracted. No speedup, isolated
  overhead, population/non-inferiority or v2-v3 performance inference.
- Preserved failures: v3/v3.1 reference visibility (65.637s / 67.173s), no Forge;
  v3.2 reference1 OCR exact token (297.316s), 30 writes but zero persisted values.
  Diagnostic OCR found exact source-ann32-ref1 at confidence 44.42 (<50). Retry
  used documented unique historical-style run label, no threshold/driver changes.
- Three new retained TEST drafts: E2E Lower v3.2 source-ann32-ref1,
  source-ann-before94, source-ann-after94 (latter two all persistence verified).
  No Amazon mutation or completed workouts. Original Gboard and Termux independently
  verified after every attempt/diagnosis/loaded check. Latest foreground Termux.
- Fresh rebuild + unchanged annotation-loaded-check.mjs actual fresh Pi JSON CLI
  registered android_look passes (2998ms), exact Termux/OPEN and all four build
  hashes match prior after and remain unchanged during call. Parent NOT reloaded.
  Existing focused annotation pair/failure/IPC/companion evidence still applicable
  because production source unchanged. All/base64 +1.22% regression still disclosed.
- Validation 721/721 units / 55 files with --maxWorkers=2; lint/build/new syntax/
  whitespace checks pass. Six driver regressions (zero-area RED→GREEN), 21 offline
  comparator checks including 18 adversarial failures. Default parallel CI not
  verified, integration/companion results not rerun here. No new implementation.
- Continuation files are not committed/pushed yet. Review/stage all protocol,
  drivers, tests, failed/success reports and docs together; preserve historical
  evidence. Only origin user fork if publishing, never upstream.

### Next exact actions (supersedes older list)

1. Review/commit this acceptance continuation, including all failed reports;
   check git status and immutable driver hashes. No further phone run needed for
   docs-only review. Do not relabel retrospective evidence chronological.
2. Before a new implementation slice, select ONE from the existing backlog with
   the user: runtime companion ingestion, finer reconnect, cancellation, fixed
   remote PNG concurrency, production input lifecycle, or default CI reliability.
3. Any performance slice needs NEW fresh equivalent v3.2 baseline before edits,
   same frozen full after workflow with 30 writes/readbacks and actual fresh
   relevant registered-tool verification. Respect hands-off/IME/Termux boundaries.
4. Do not reuse this pair indefinitely or infer speedup; investigate CI separately.

## Previous checkpoint — full-workflow acceptance OPEN

- Annotation implemented as its own slice in annotate.ts/capture-timing.ts:
  `annotation_screenshot`, `annotation_ui_dump`, `annotation_map`,
  `annotation_text_index`. One context for parallel siblings and descendants,
  or preserve caller's explicit captureClock. No compositing. Default-off;
  no backend/concurrency/cache/retry/timeout/fallback/failure-policy changes.
- Promise.all still rejects early without sibling cancellation. Sink can receive
  later sibling completion; no fabricated mapping/index spans on acquisition
  failure. Controlled tests cover both rejecting siblings and late successful
  sibling events, explicit ADB timeout, fallback/cache, all/base64 options,
  supplied-clock precedence, frozen options, throwing sinks and privacy.
- Capture IPC and companion OFFLINE importer accept four stages with unchanged
  privacy/128-event/partial rules. Actual capture CLI is hierarchy-only, does NOT
  run annotation. Synthetic worker regression verifies retention, not live path
  coverage or runtime ingestion. Runtime automatic ingestion remains separate.
- FRESH chronological baseline source `09c3cc8` ran BEFORE production edits:
  workflow PASS **290991.75ms / 74 captures / 282 scoped command spans**,
  all shopping checks + 30 writes + 30 persisted values.
- After attempt1 FAIL **28415.32ms**, unchanged after attempt2 FAIL **27662.10ms**,
  each at exact Amazon `chosen_product_visible` guard: query/focus/readback and
  three offers pass, chosen visible fails. Each 18 successful operation records,
  6 captures / 18 scoped command spans; no Forge navigation, after drafts or
  numeric writes. All attempts retained. NO passing workflow pair or wall delta.
- Read-only native inspection AFTER second failure finds Barista result clipped
  at y=2089, below frozen 200<y<1900 guard. Corroborates current changed fixture,
  NOT exact historical coordinates or proof of failure cause. No relaxed checks,
  scrolling intervention, driver edits or fake success. Gate remains OPEN.
- Same frozen new focused Settings driver: **6/6 each**, three rounds/mode.
  Interactive/no-base64 median 2552.23 → 2497.65ms (**−2.14%**);
  all/base64 2503.80 → 2534.38ms (**+1.22%**). 87 → 111 spans, +24 (4×6).
  Counts 10/46, exact labels/numbered index/PNG pass. Baseline independent sibling
  clocks; after one clock/call with overlapping envelopes/contained descendants.
  No isolated overhead, zero-overhead, non-inferiority or speedup claim.
- Actual fresh nonpersistent Pi JSON CLI explicitly loads rebuilt dist/index.js,
  no discovered extensions/MCP, only android_look allowed. Before 2799ms / after
  2555ms, exact Settings/Termux/OPEN index, start/end + settled(not aborted),
  build hashes independently rechecked. Tool/source clocks not merged; diagnostics
  default-off. Parent interactive session NOT reloaded. Raw JSONL private/temp.
- Two failed pre-code loaded-runner setup attempts retained. Child piped stdin
  was left open; closing stdin makes probe pass. Both had no tool events; detailed
  exception/deadline provenance not retained. Do not call them ADB timeout tests.
  Corrected passing loaded driver frozen across its pair.
- New scripts: `annotation-check.mjs`, `annotation-loaded-check.mjs`,
  `audit-annotation-checkpoint.mjs`. Audit is CHECKPOINT-SPECIFIC and explicitly
  emits fullWorkflowAcceptance:open and workflowDelta:null; not a passing-pair
  comparator. Independent git baseline/current source/build hashes pass. Nine
  adversarial offline audit probes rejected; reproduction in full report.
- Workflow does NOT exercise annotation or hash annotate.ts in its nine-file
  engine hash; focused source hash DOES. No workflow global span clock,
  traceComplete flag or independent screenshot count. Scoped command counts NOT
  whole workflow counts. Nested sums NOT elapsed wall time.
- Frozen focused runner `traceComplete` is valid for measured SUCCESS samples;
  its finally assignment on an error would NOT prove sibling completion. Treat
  future failed traces as partial; version the runner separately for any fix,
  never rewrite measured driver/history. Live failure/cache/OCR/reconnect paths
  not forced. Controlled source seam is the disclosed evidence for those paths.
- Validation: **694/694 units, 53 files**, lint/build; **9 isolated integrations**
  with existing 20s/30s allowances. Companion **38/38**, build/check. Source red
  (missing parent spans), IPC red (discarded stages), companion red (37/38) all
  followed by green. Default parallel CI remains open.
- One new TEST draft: `E2E Lower v2 source-ann-before88`, **15 total** including
  prior 14; 15 unchecked sets at 20kg × 8, all persisted values verified. Neither
  failed after created a draft. No real workout finished or Amazon mutation.
  Original Gboard/Termux independently verified after every attempt/check and
  read-only inspection. No new APK/helper/permission/debugging exposure.
- Published implementation/evidence: pi-droid **`d119e04`**, companion
  **`57e04fc`**, both pushed to user-owned origin/main forks. Remote main hashes
  independently matched each local HEAD and both trees were clean afterward.
  This subsequent docs-only checkpoint records publication; acceptance remains
  OPEN. Never push upstream. Historical drivers/adapters/evidence untouched.

## Next exact actions

1. Rediscover authorized phone afresh; ensure exclusive hands-off use, capture
   original IME, verify Termux and normal Forge navigation. No old endpoint reuse.
2. **Close this slice's OPEN full-workflow gate before another implementation
   slice.** Do NOT label annotation accepted solely from focused/loaded tests.
   Both after failures are preserved real acceptance failures, not passing fast runs.
3. Determine whether the unchanged frozen Amazon fixture is compatible again,
   read-only. Do not change shopping state, viewport/settings or inject mid-run
   scrolling merely to get a passing result. A new full attempt may be legitimate
   only with an equivalent fixture; preserve it regardless of outcome and use NEW
   output/run IDs. Current baseline is not indefinitely reusable.
4. If current Amazon layout remains incompatible, ask user to agree a SEPARATELY
   VERSIONED workflow protocol that can observe/align a currently offscreen chosen
   product. Preserve frozen v2 and old comparator. Capture a fresh equivalent
   pre-annotation reference BEFORE new measured after attempts (isolated extraction
   of `09c3cc8`, no active-tree rollback, reuse host dependencies, no installs).
   Disclose retrospective reference chronology; do not rebrand it pre-code evidence.
   No changes to old checks or failed reports to manufacture acceptance.
5. Under agreed protocol, verify shopping checks, 30 writes + 30 persisted values,
   completed/failed attempts, elapsed/scoped counts/flags and actual newly loaded
   relevant registered tool. Repeat focused fixture if measurement equivalence or
   source changes require it. Preserve all attempts. Do not merge tool/source clocks.
6. Later separate slices: automatic runtime companion ingestion; finer reconnect
   discovery/connect; cancellation; fixed remote PNG concurrency; production input
   lifecycle. Default full-parallel CI remains unverified. Do not start these
   while silently dropping the current mandatory gate.
7. Update tracker, validate/review, commit/push only origin forks. Never hide
   regressions or claim zero overhead/speedup from a single descriptive pair.

## Mandatory boundaries

Every performance implementation slice needs the existing Amazon + Forge
real-phone E2E, actual loaded-extension checks and equivalent before/after metrics.
Instrumentation need not be faster, but overhead must be checked; passing tests
is not speedup evidence. If blocked, leave acceptance open. Docs-only updates
need no extra phone run.

Amazon stays read-only: no cart/checkout/account changes. Forge mutations stay
in disclosed TEST drafts; never finish a real workout. Restore original IME on
success AND failure; return to Termux and independently verify both. No new APKs,
permissions, helpers or debugging exposure without approval.

## Phone-friendly handoff

Save detailed continuation instructions here, then give only a short ready-to-copy
prompt pointing here. Do not paste the full handoff into chat.
