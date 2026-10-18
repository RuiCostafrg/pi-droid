# Next-session handoff

Read `docs/performance/PLAN.md` first (mandatory real-phone acceptance gate),
then `reports/screenshot-ocr-timing-2026-10-18.md` and `CAPTURE-BENCHMARK.md`.
Earlier command checkpoint remains in COMMAND-TIMING.md and historical reports.

## Latest checkpoint

- Screenshot/OCR opt-in spans implemented in screenshot.ts, ocr.ts and
  capture-timing.ts: capture, pull, dimensions, local read+base64; availability,
  engine and TSV parse. One clock across a source call and native OCR fallback.
  Default-off, no retry/backend/timeout-policy change. Tesseract failures remain
  unknown (even its own Node timeout), not invented ADB deadline provenance.
- Capture IPC and companion OFFLINE importer accept seven new stages with
  existing privacy/128-event/partial flags. Automatic runtime ingestion separate.
- Fresh chronological baseline source `22af80b` ran BEFORE implementation:
  workflow PASS 286223.78ms / 72 captures. After attempt1 FAIL 248255.74ms at exact
  draft-card OCR identity: shopping and 30 writes pass, persisted reopen UNVERIFIED.
  Unchanged after attempt2 PASS 309218.63ms / 74 captures, 30 writes + 30 persisted
  values pass. All attempts preserved; same frozen driver/consumer, no weakened checks.
- Passing after is **+8.03% slower**, two extra alignment cycles 7044.88ms explain
  only part of +22994.85ms. Remaining variation unexplained. NO demonstrated
  speedup, isolated instrumentation overhead or non-inferiority estimate.
- Separate same-driver read-only Settings pair: 9/9 each, three samples per API.
  Screenshot median −1.24%, quick-base64 **+7.43%**, OCR −0.68%. All seven new
  stages covered, 24 command spans before → 63 spans after. Source clocks per
  API call, synchronous-sink traceComplete; NOT IPC or tool-clock completeness.
- Frozen workflow DOES NOT pass sink to explicit OCR call: no finer screenshot/
  OCR spans are expected there. Scoped command attempts 276 → 282, NOT workflow
  command counts. No independent screenshot count or workflow traceComplete flag.
- Actual freshly started nonpersistent Pi JSON CLI loaded rebuilt dist/index.js
  explicitly, with no other extensions/MCP and a three-tool allowlist. Real
  registered native UI dump 2643ms (Termux + OPEN), screenshot 439ms (1080×2340),
  current-screen OCR 1259ms (exact Termux). All pass, agent settled; dist hashes
  saved and checked afterward. Parent active session NOT reloaded. No source/tool
  clocks merged; registered tools use default-disabled diagnostics.
- Three new TEST drafts remain: `E2E Lower v2 source-shot-before91`,
  `E2E Lower v2 source-shot-after91` (failed reopen), `E2E Lower v2 source-shot-post88`.
  **14 total** including prior 11. All 15 sets unchecked at 20kg × 8. No real
  workout finished or Amazon mutation. Original Gboard/Termux independently
  verified AFTER EACH full attempt, focused run and loaded check. No new phone
  APK/helper/permission/debugging exposure. Hands-off use was requested.
- Validation: **682/682 units, 52 files**, lint/build; **9 isolated integrations**
  with existing 20s/30s allowances. Companion **37/37**, build/check. Source failure,
  timeout-unknown, fallback/shared-clock, privacy/default-off/throwing sink and
  partial IPC tests pass. Default parallel CI and automatic input lifecycle open.
- New focused runner: scripts/screenshot-ocr-check.mjs (frozen across its pair).
  New offline audit: scripts/validate-screenshot-ocr-pair.mjs (does NOT change old
  migration comparator). Engine hashes independently recomputed from baseline
  git source and measured current source. Full report has reproduction command.
- Published implementation/evidence: pi-droid `5669bcd`, companion `93fbf54`, both
  pushed to user-owned origin/main with remote hashes independently verified and
  clean trees afterward. This subsequent docs-only checkpoint records the hashes.
  Publish only to those origin forks; never upstream. Historical evidence/adapters/
  drivers untouched. Private loaded JSONL stays temporary; allowlisted metadata only.

## Next exact actions

1. Discover the currently authorized phone afresh; ensure exclusive use, capture
   original IME, verify Termux foreground and normal Forge navigation.
2. Next implementation priority is **annotation as a separate slice**. Inspect
   annotate.ts: screenshot and dump currently start in parallel with independent
   contexts unless caller supplies one; mapping/text-index construction follow.
   No compositing is performed. Preserve default backend/concurrency/retry/
   timeout/failure behavior; sibling cancellation is NOT currently implemented.
3. Capture a FRESH equivalent baseline BEFORE that change: full frozen Amazon.de
   → Forge workflow PLUS relevant focused annotated fixture and loaded-tool check.
   Today's pair is not an evergreen baseline. Preserve all attempts. Workflow
   does not exercise annotation, so cannot substitute for focused path coverage.
4. Use the pre-agreed public source/external process seam for controlled success/
   failure/default-off/privacy/partial tests, then implement shared-clock sibling
   and mapping/text-index spans. Do not count nested sums as wall elapsed.
5. Repeat full workflow and actual freshly loaded registered annotation-tool check.
   Validate shopping observations, 30 writes + 30 persisted values, elapsed,
   failed/completed attempts, scoped counts and flags. Disclose unexercised paths.
   Do not alter frozen driver, old migration comparator or historical evidence.
6. Keep automatic runtime companion ingestion, finer reconnect discovery/connect,
   cancellation, fixed remote PNG concurrency safety and production input
   lifecycle as explicit later slices. Update tracker, validate, commit and push
   only to origin forks. Retain unexplained regressions honestly.

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
