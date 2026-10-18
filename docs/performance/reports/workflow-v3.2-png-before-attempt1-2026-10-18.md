# PNG isolation workflow attempt — before, fail

Immutable source report: [workflow-v3.2-png-before-attempt1-2026-10-18.json](workflow-v3.2-png-before-attempt1-2026-10-18.json).

- Status: **FAIL**; checkpoint: execution.
- Elapsed: **8907.613278ms**, including retained alignment/cleanup.
- Operations: 7; failed operations: 1.
- Completed device-dump spans: 1; scoped ADB attempts: 1 (not whole-workflow accounting).
- Product/field alignment cycles: 0/0.
- Numeric write records: 0; persisted numeric values: 0.
- Stage errors: 2; flat spans truncated: false; incomplete contexts: 1.
- Original IME restored: true; Termux restored: true. Both independently verified afterward.
- Frozen driver SHA-256: `58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c`.
- Bounded consumer SHA-256: `3b5006b8ac22f74b7585bcb350edc295a5b588fee5e27af602334c2a6a6fba27`.
- Recorded engine SHA-256: `a47e5b840af20e67f23c6e58b8576b66c26533c6838b60d0b5e5d4099f7a4b4e`.

Source-level frozen v3.2 only, not actual loaded-tool evidence. Independent per-capture
clocks, no whole-workflow traceComplete or independent screenshot count. Nested
span totals are not elapsed time. Failed work is never a faster passing result.
See [full PNG evidence](png-concurrency-2026-10-18.md) for scope and limitations.
