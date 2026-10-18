# Fresh reconnect timing workflow — after attempt 1

- Status: **pass**; elapsed **304066.19ms**.
- Started: 2026-10-18T15:40:39.413Z. Changed reconnect instrumentation; same frozen v3.2 driver.
- Shopping and all 34 checks pass; 30 writes and 30 persisted numeric values.
- 77 captures; 291 scoped command spans (not whole-workflow command accounting).
- 77 capture contexts; all complete/nontruncated, zero capture-stage errors.
- Driver SHA-256: `58b1d3034dfbfc1d903ff4d3cdbd515c0585b4dc5e2d2e5bcb4ec72c2515db9c`.
- Engine SHA-256: `a47e5b840af20e67f23c6e58b8576b66c26533c6838b60d0b5e5d4099f7a4b4e`; per-file manifest retained in adjacent JSON.
- Exact transport disables recovery. No live reconnect/cancellation/companion runtime coverage inferred.
- TEST draft: `E2E Lower v3.2 source-recon-after96`; no completed workout or Amazon mutation.
- Original Gboard and Termux restored by workflow and independently checked afterward.

Raw metrics are in the adjacent immutable JSON; see [slice evidence](reconnect-timing-2026-10-18.md) and [paired comparison](workflow-v3.2-reconnect-comparison-2026-10-18.md).
No speedup or isolated overhead claim from this single pair.
