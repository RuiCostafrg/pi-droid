# Next-session handoff

Read `docs/performance/PLAN.md` first (mandatory real-phone acceptance gate),
then `COMMAND-TIMING.md` and
`reports/workflow-command-validation-2026-10-18.md` in this directory.

## Latest checkpoint

- Closed the command instrumentation's successful-path live-validation gap:
  current and isolated pre-instrumentation reference both pass frozen Amazon.de
  → Forge workflow, all 30 exact numeric writes and all 30 persisted readbacks.
- Current source `e3bc49e` (contains `fca7737`) ran FIRST: 283.303s, 72 captures.
  Reference `4a8534d` ran SECOND: 290.458s, 74 captures. It was collected AFTER
  implementation, NOT a chronological pre-change baseline. Same frozen driver
  and bounded consumer. Reference's two extra alignment cycles total 7.173s:
  **no demonstrated speedup or isolated instrumentation-overhead estimate**.
- Current 636 source spans: 360 high-level + 276 successful command attempts
  within traced hierarchy/selection paths, NOT whole-workflow command count.
  Zero errors/nontruncated; frozen driver emits NO traceComplete flag. No live
  reconnect/failure forced, no independent screenshot counts. Details in report.
- Separate actual loaded native-only dump passes Settings → Termux title/OPEN
  fixture, both options accepted, metadata-only 2654.78ms. Changed dist files
  already existed and rebuild byte-identical. Initial interrupted failed probe
  is disclosed, not discarded. Source/tool clocks are not merged.
- Two new test drafts remain: `E2E Lower v2 source-cmd-current88` and
  `E2E Lower v2 source-cmd-reference88`; **11 total** with prior nine. All unchecked,
  no real workout finished, Amazon read-only. Gboard/Termux independently verified
  after EACH run and after loaded check. User authorized hands-off control.
- Validation rerun: **665 units / 51 files, 9 isolated integrations**, lint/build,
  changed-dist byte equality; companion **36 tests**, build/check. Default
  parallel CI and automatic input lifecycle NOT claimed fixed.
- This is an evidence/docs checkpoint only. No production code, frozen driver,
  archived adapter or historical evidence changed. See latest git log for its
  publication commit. Companion remains unchanged at published `b18e04a`.

## Next exact actions

1. Discover the currently authorized phone afresh. Ensure exclusive device use,
   original IME captured, Termux foreground and normal Forge navigation.
2. Capture a FRESH equivalent current baseline BEFORE implementing finer
   screenshot capture/transfer/read/dimension and OCR availability/engine/parse
   spans. The completed current workflow is a checkpoint, not an evergreen
   baseline to reuse across sessions/fixture changes. Preserve all attempts.
3. Read screenshot.ts, ocr.ts, annotate.ts, capture-timing.ts, exec.ts and the
   existing process-boundary/IPC tests. The boundary audit is in COMMAND-TIMING.md.
   Implement shared-clock spans without changing backend/retry/timeout defaults;
   controlled success/failure, privacy/default-off and partial-span tests first.
4. Repeat mandatory full Amazon.de → Forge E2E and loaded-tool checks afterward.
   Validate shopping observations, 30 writes + 30 persisted readbacks, elapsed,
   failed/completed attempts, scoped capture/command counts, available spans and
   completeness flags. Explicitly disclose unexercised paths. Do not alter the
   frozen workflow or old migration comparator to make new results pass.
5. Keep annotation and automatic runtime companion ingestion as separate slices.
   Update PLAN.md, validate, commit and push only to the user's origin forks.

## Mandatory boundaries

Every performance implementation slice needs the existing Amazon + Forge
real-phone E2E, loaded-extension checks and validated equivalent before/after
metrics. Instrumentation need not be faster, but overhead must be checked;
passing tests/removing work is not speedup evidence. If blocked, leave acceptance
open. Documentation-only updates need no extra phone run.

Preserve frozen drivers, archived adapters and all historical reports. Amazon
stays read-only: no cart, checkout or account changes. Forge mutations stay in
explicitly disclosed TEST drafts; never finish a real workout. Restore original
IME on success AND failure; return to Termux and independently verify both.
No new APKs, permissions, helpers or debugging exposure without approval.

## Phone-friendly handoff

Save detailed continuation instructions here, then give only a short ready-to-copy
prompt pointing here. Do not paste the full handoff into chat.
