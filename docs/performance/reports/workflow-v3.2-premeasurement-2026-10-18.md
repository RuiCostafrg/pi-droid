# V3.2 premeasurement checkpoint — 2026-10-18

V3.1 reference attempt1 FAIL 67173.07ms: eight scrolls oscillate between
2089 and 0. No Forge/draft/numeric work. Existing drivers/reports stay frozen.

Controlled phone diagnosis reproduced native offscreen title transitions:
2089 → 0 → 0 → 0 → 0 → 1967 → 1608 using six forward 350px/600ms swipes.
Screenshot at 1608 confirms the chosen Barista card. Native duplicate nodes
have identical geometry; a clipped observation reports [462,2089][1042,2089]
(zero height). Thus y=0 is not trustworthy evidence of an above-screen title.
The page visibly moves normally. No product tap or Amazon mutation was made.
Termux and original Gboard independently verified restored after diagnosis.

V3.2 changes ONLY direction inference: retain the last direction through missing
or zero-area geometry, initially forward. Positive-area geometry may update it.
The strict visibility/nonzero bounds/actionability/identity/ambiguity/fresh
confirmation guards, eight-scroll cap, 350px/600ms gesture, and all shopping,
Forge, 30-write/30-persisted-readback and cleanup work remain unchanged.
Title prefix is E2E Lower v3.2. No production source changes.

External fake-ADB regression cycles forever under copied v3.1 behavior through
zero-area origin nodes: targeted test RED (amazon_product_open absent). After
v3.2 change all six tests GREEN, including exact identity, ambiguity, capped
failure, artificial overshoot and cleanup after deliberate Forge launch failure.
These fixtures are not real-workflow acceptance.

Frozen v3.2 SHA-256:
58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c.
Separate comparator: scripts/compare-workflow-v3.2.mjs, revision 3.2 only.
Run isolated retrospective 09c3cc8 first, then current under identical driver.
No concurrent device work/tests/builds during measurement. Capture exact serial
privately. Preserve all attempts, never subtract alignment from elapsed time.
This is retrospective evidence, not chronological pre-code baseline. Gate OPEN.
