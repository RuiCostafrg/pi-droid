# PNG isolation workflow attempt — before, pass

Immutable source report: [workflow-v3.2-png-before-attempt2-2026-10-18.json](workflow-v3.2-png-before-attempt2-2026-10-18.json).

- Status: **PASS**; elapsed **309200.604882ms**, including retained alignment/cleanup.
- Operations: 315; failed operations: 0.
- Completed device-dump spans: 77; scoped ADB attempts: 291
  (not whole-workflow accounting).
- Product/field alignment cycles: 3/2.
- Numeric writes: 30; persisted numeric values: 30; all shopping checks pass.
- Capture-stage errors: 0; flat spans truncated: false; incomplete contexts: 0.
- Original IME and Termux restoration pass; independently checked after live run.
- Frozen driver: `58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c`.
- Consumer: `3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27`.
- Recorded engine: `a47e5b840af20e67f23c6e58b8576b66c26533c6838b60d0b5e5d4099f7a4b4e`.

Source-level frozen v3.2, not loaded-tool evidence. Independent per-capture clocks;
no whole-workflow traceComplete or independent screenshot count. Nested span totals
are not elapsed time. See [full evidence](png-concurrency-2026-10-18.md), including
focused regressions and separate registered-tool checks. No speedup claim.
