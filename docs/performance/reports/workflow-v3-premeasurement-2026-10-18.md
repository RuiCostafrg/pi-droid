# V3 premeasurement checkpoint — 2026-10-18

Saved before the new measured reference/current attempts. User approved separately
versioned bounded product alignment and requested a post-test v2/v3 decision with
additional useful observability. See ../WORKFLOW-V3.md for limits and full contract.

- Active source: published annotation checkpoint 1526b19, no production src edits.
- Isolated reference: git archive 09c3cc8, existing host node_modules symlinked,
  existing source built successfully without installs or active-tree rollback.
- New v3 driver copied byte-identically into reference; unchanged bounded field
  consumer independently compared byte-identical across both roots.
- V3 driver SHA-256: a5a45adffdb5fe45c90f0aba540c9b21c7f53d11254854d4e16355db854b88c4.
- Bounded consumer: 3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27.
- Frozen v2 driver remains af7688014fa3e06fd07fd21c734aab86f2406c78ea988871dd2172231f068ca0.
- Frozen v2 comparator remains 862ed42fd2f1bcd9e5012ef62cc090b428460f76675e4cad25ce0e5e5fda2e62.
- Four executable source-driver/external fake-ADB regressions pass: same-identity
  alignment + fresh confirmation, permanently clipped product (8-scroll limit),
  changed identity (no unrelated tap), ambiguous targets (fail before scrolling).
  Deliberate later fake Forge failure verifies cleanup, not full fake success.
  These were written after the new driver; no driver red-first claim.
- Original Gboard captured; normal Forge Sessions verified; fresh read-only Amazon
  observation again shows chosen Barista at y=2089. No manual scrolling, viewport
  change, new drafts or shopping changes. Termux and unchanged IME independently
  verified after inspection. Phone rediscovered securely with existing pairing;
  no new authorization, permission, APK, helper or debugging exposure.

The forthcoming reference is RETROSPECTIVE (after annotation implementation),
although collected before the new current attempt. It is not pre-code evidence.
The annotation full-workflow gate remains OPEN. All measured attempts will be
retained with new paths/IDs; no host tests/builds/device actions during measurement.
Focused/loaded annotation checks remain separate because this source workflow
does not invoke annotation or actual registered Pi tools. No speedup/overhead
claim from old v2 timings. V2/v3 active-protocol decision pending new evidence.
