# Fresh screenshot/OCR instrumentation baseline — 2026-10-18

Saved BEFORE production implementation changes. Source `22af80b`, clean
at start. Frozen v2 driver and active bounded consumer unchanged.

- [Attempt 1](workflow-shot-before-2026-10-18-attempt1.json): PASS,
  286223.78213ms, 72 hierarchy captures, 300 successful operation records,
  all 30 numeric writes and all 30 persisted values correct; 34 checks/counts.
- 636 source spans: 360 high-level and 276 successful ADB attempts within
  traced hierarchy/selection paths, not a whole-workflow command count.
  Zero errors; captureSpansTruncated:false; frozen driver has no traceComplete.
- One explicit OCR call, no independent screenshot count. Frozen driver does
  NOT pass its sink to OCR: finer internals need separate focused validation.
- Driver SHA256 `af7688014fa3e06fd07fd21c734aab86f2406c78ea988871dd2172231f068ca0`.
- Consumer SHA256 `3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27`.
- Nine-file engine SHA256 `6fd6bbb66ed9dbd09a09211998e575ec487dffb258b3c692a7d481e76361363e`.
- Shopping assertions pass; no cart/checkout/account changes. New TEST draft
  `E2E Lower v2 source-shot-before91` retained, 15 unchecked sets at 20kg × 8.
  12 disclosed performance test drafts total. No real workout finished.
- Authorized phone discovered afresh. Original Gboard captured before input;
  preflight passes except expected inactive ADBKeyboard. Normal Forge Sessions
  navigation verified before run. No concurrent phone actions/builds/tests.
- Finally cleanup passes; independent ADB shell checks AFTER run confirm original
  Gboard component and foreground com.termux. No installs, permissions, helpers
  or debugging exposure added. Transport identifiers omitted.

This is a chronological baseline, not a speedup claim. Preserve every attempt.
New spans require controlled success/failure/privacy/default-off tests and a
separate focused fixture check, then full workflow and freshly loaded tools.
