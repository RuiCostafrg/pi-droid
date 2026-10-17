# Workflow v2 baseline saved BEFORE consumer migration

Source engine: committed `abc2ac3`, unchanged. Versioned driver:
`scripts/workflow-v2.mjs`. Baseline consumer:
`scripts/workflow-field-action-before.mjs` (byte-for-byte preserved from
the active `workflow-field-action.mjs` BEFORE migration).

## Passing baseline

[Raw attempt 3](workflow-v2-before-2026-10-17-attempt3.json):
**PASS, 370745.62ms (370.746s)**, 306 recorded source operations.
All 30 numeric values and all 30 values after reopening passed. Cleanup checks
passed for original IME and Termux.

- 104 completed device-dump spans, zero capture-stage errors.
- 30 field-selection operations, two captures each.
- 44 other hierarchy observations; one explicit OCR call.
- Five field groups, six fields each; all persisted counts exactly six.
- Fixed 500ms settling, 11 swipes, 2 field-alignment scrolls; retained.
- Public sampled offers: €19.99/€2.50 per litre, €19.99/€2.50 per litre,
  €18.94/€2.37 per litre. Selected cheapest in this bounded three-offer sample
  (Barista), not across Amazon. These differ from yesterday's old v1 sample,
  so do NOT compare v2's wall time against the old v1 baseline as a speedup.
- Retained test draft: `E2E Lower v2 source-before55`; all sets unchecked,
  20kg × 8 reps, no existing-record changes or purchases.

Frozen driver SHA-256:
`af7688014fa3e06fd07fd21c734aab86f2406c78ea988871dd2172231f068ca0`.

Baseline consumer SHA-256:
`b4a1747e406a88cfe40b15339dd893f478c6204e672bbd2ffaf345b4107c698e`.

Engine hash (nine explicitly named perception/execution/input source files,
not a whole-repository hash):
`2a78ae7818fa317be9585b1877eb55ac52c22fa20b1d0ba0d1b3d79bc45d3ce6`.

Only the active field consumer is to change now. Driver and engine must stay
byte-identical across the passing pair. Preserve all polling, field alignment,
input/clearing, grouped readback, persisted reopen and cleanup. New operation's
foreground recheck/window guards remain enabled, not bypassed for timing.

## Preserved failed baseline attempts (not successful references)

1. [Attempt 1](workflow-v2-before-2026-10-17-attempt1.json): all numeric write/
   readbacks passed, but exact OCR draft-card identity failed before reopen.
   A focused read-only probe found `source-v2before1l` at 44.58% confidence
   instead of the exact `source-v2before1`; normal threshold is 50. No fuzzy
   matching or lowered confidence was accepted. Retained draft:
   `E2E Lower v2 source-v2before1`; persisted reopen not independently verified.
2. [Attempt 2](workflow-v2-before-2026-10-17-attempt2.json): failed exact Amazon
   query readback; later field inspection found an empty query. No Forge draft
   was created. Timing/focus instability was suspected, not established as the
   proven cause. Before another baseline, v2 was strengthened to require the
   exact search resource ID at stable geometry on two observations and explicit
   focused-attribute verification before typing. No successful baseline was
   weakened or overwritten; attempts 1/2 have the prior driver hash.
3. Attempt 3 uses the final frozen driver, an unambiguous public run label,
   default OCR confidence and exact matching. Both prior failures retained
   successful IME/Termux restoration checks. No migration happened before this
   passing baseline or its Markdown checkpoint was saved.

The historical v1 driver/hash/reports are untouched. Future comparisons must use
the final v2 driver, not conflate the failed development attempts with the
passing reference. Private transport endpoints, raw errors and UI content are
not retained. The public prices and synthetic test labels above are deliberate.
