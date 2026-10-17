# Next-session handoff

Read `docs/performance/PLAN.md` first, especially the mandatory real-phone
acceptance gate, then `docs/performance/COMMAND-TIMING.md`.

## Checkpoints

- pi-droid: `ce7d0b1`, pushed and clean before this handoff file.
- Companion `~/projects/pi-android-perf`: `b18e04a`, pushed and clean.
- Implemented: loaded native-only dump options verified on Settings; opt-in
  command-attempt/reconnect spans; bounded offline companion capture ingestion.
- Validation: 665 unit tests, 9 isolated integrations, 36 companion tests,
  builds/type checks. Default parallel CI reliability is not claimed fixed.
- **Gap:** latest instrumentation has NOT had the full Amazon.de → Forge
  real-phone E2E or a live timing pair. No new speedup is established.

## Next actions

1. Close the live-validation gap BEFORE more implementation. Read
   `WORKFLOW-V2.md` in this directory and run the existing real-phone workflow
   against the current command/reconnect instrumentation.
2. Verify the changed extension is loaded in a fresh/reloaded Pi session and
   exercise relevant registered tools. Source-level E2E alone is not proof of
   loaded-extension correctness.
3. Validate shopping observations, all 30 exact numeric writes and persisted
   readbacks, elapsed time, failed/completed attempts, capture/command counts,
   available internal spans and completeness flags. Disclose unexercised paths.
4. For overhead comparison, collect an equivalent reference from an isolated
   pre-instrumentation revision using the same driver. Label this reference as
   collected AFTER implementation, not a chronological pre-change baseline.
   Preserve successes AND failures without rewriting historical evidence.
5. Then capture a fresh current baseline BEFORE implementing finer screenshot
   capture/transfer/read/dimension and OCR availability/engine/parse spans.
   Repeat the mandatory real-phone E2E and loaded-extension acceptance afterward.
   Annotation and automatic runtime profiler ingestion follow separately.

## Mandatory boundaries

Every performance implementation slice needs the existing Amazon + Forge
real-phone E2E, loaded-extension checks and validated metrics, with equivalent
before/after evidence. Report gains, regressions or no improvement honestly;
passing tests or removing work is not evidence of speedup. If blocked, leave
acceptance open explicitly. Documentation-only updates need no phone run.

Preserve frozen drivers, archived adapters and historical reports. Amazon stays
read-only: no cart, checkout or account changes. Forge changes stay within
explicitly disclosed test drafts; never finish a real workout. Restore original
IME on success AND failure; return to Termux and independently verify both.
No new APKs, permissions, helpers or debugging exposure without approval.

Update PLAN.md, test, commit and push to the user's origin forks.

## User preference: phone-friendly handoffs

The user is on a phone and copying long prompts is difficult. Save detailed
next-session instructions in this file (update it to the latest checkpoint),
then give only a short ready-to-copy prompt pointing to this file. Do not paste
the full handoff into chat again.
