# V3.1 premeasurement checkpoint — 2026-10-18

Initial v3 reference attempt1 FAIL 65637.22ms at chosen_product_visible; 15 captures,
no stage errors, no Forge navigation, no draft/numeric writes. All exact query and
three-offer checks pass. Product observations alternate y=2089 and y=0 for eight
scrolls, then confirmation remains invisible. The initial driver is preserved
byte-for-byte as scripts/workflow-v3.mjs, with its failed report and premeasurement
checkpoint unchanged. Original Gboard and Termux independently verified afterward.

Ranked diagnostic predictions: large gesture overshoot; zero-area clipped bounds
making direction ambiguous; duplicate accessibility-node representation. A new
external-ADB fixture that maps a large gesture to overshoot fails the initial
algorithm. Separately versioned scripts/workflow-v3.1.mjs uses 350px/600ms gestures
instead of 900px/400ms, retaining eight-scroll limit, exact identity/actionability,
ambiguity rejection, fresh confirmation and strict 200<y<1900 guard. All five
external-ADB regressions now pass, including the overshoot red → green. This
supports the controlled regression, not proof of exact real browser scroll physics.

V3.1 driver SHA-256:
ba4d13838d291cc9a917f7ec0049cc744f8c645a5a1bd4fc412dd5c491d393b6.
The protocol is explicitly recorded as revision 3.1 with step/duration metrics;
title prefix E2E Lower v3.1. No production source, old driver or evidence changed.
No current-source full attempt has been made yet. Fresh isolated 09c3cc8 reference
under this exact new frozen driver must precede current measurement. Same earlier
retrospective chronology/privacy/cleanup/phone boundaries apply. Offline comparator
is restricted to revision 3.1 and independently hashes the new driver/source.

The annotation gate remains OPEN; no speedup or passing pair yet.
