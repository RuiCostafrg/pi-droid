# V3.2 reference attempt1 — retained failure

Retrospective 09c3cc8, frozen driver
58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c.
FAIL 297316.42ms at draft_card_visible. Shopping passes: observations
2089 → 0 → 0 → 0 → 0 → 1991 → 1626, fresh confirmation 1626;
correct product opens. All 30 writes and five immediate six-value readbacks pass.
69 completed dumps, no capture-stage errors, one OCR call. No persisted readback
was attempted. Retained TEST draft: E2E Lower v3.2 source-ann32-ref1.

Post-run independent Termux/Gboard verification passes. Read-only Forge inspection
shows the draft title visibly and natively. Normal OCR at confidence 50 omits its
identity token. Diagnostic OCR with confidence 0 reports EXACT source-ann32-ref1
at confidence 44.42. This supports threshold exclusion, not a missing draft.
Threshold was NOT changed in any source/measurement driver. No draft was renamed,
no numeric edits made, no workout completed. Termux/Gboard restored and independently
verified again after inspection. UI reports 17 sessions (not a count of TEST drafts).

Next attempt will keep the byte-identical v3.2 protocol, default OCR threshold,
and all exact identity/readback guards. Use a unique run label in the historical
OCR-readable ann-beforeNN style (ann-before94), rather than ann32-ref1. This is
an explicitly disclosed fixture-label adjustment, not an OCR fallback or relaxed
check. Preserve attempt1 regardless of later results. Reference still precedes
any measured current-source attempt. No passing pair/delta; acceptance OPEN.
