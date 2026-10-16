# Amazon → Forge baseline (before execution-metadata implementation)

Protocol: [WORKFLOW-E2E.md](../WORKFLOW-E2E.md). Source HEAD:
`4a2b4f64c13af11735fffe6796b73d3e908b51ed`. No implementation source edits
preceded this run. Installed Tesseract 5.5.2/English before baseline. Agent-assisted
active-session registered tools (loaded revision not independently verified).
Evidence: [content-free tool trace](workflow-baseline-2026-10-16.json).

## Result: workflow completed with workaround; strict input regression FAIL

- Amazon.de opened in Brave, literal `Mandelmilch` input verified. Compared
  Alpro unsweetened 8×1L €16.99 (€2.12/L), Original 8×1L €16.99 (€2.12/L),
  Barista 8×1L €18.94 (€2.37/L). Eligible-first-order delivery shown as free,
  not a universal shipping guarantee. Opened unsweetened, confirmed in-stock,
  8×1L, one-time €16.99. No purchase/cart/account change. This is the cheapest
  tie in the first-three sample, NOT all Amazon; cheaper later listings existed.
- Created ONLY new draft `E2E Lower v1 baseline`: Squat, Romanian deadlift,
  Lunge, Leg curl, Calf raise; 3 sets each, every set **20 kg × 8 reps**.
  All 30 numeric values verified, exited to sessions and reopened; all 30
  verified again. No done checkbox or Finish session pressed. Existing Custom
  session and weekly program untouched. The new test draft is intentionally
  retained and distinguished from the user's records.
- `android_type(clear_first: true)` left the original title prefix while
  returning success. A Ctrl+A keycombination attempt also failed. Recovered
  using ADBKeyboard's `ADB_CLEAR_TEXT` broadcast, then typed/read back the exact
  title. Numeric multi-digit replacements used this explicit workaround.
  These extra actions remain in the trace. A successful tool outcome is NOT
  proof of correct text replacement. Input bug is outside metadata slice.
- Original Gboard restored; Termux foreground independently verified at finish.

## Metrics (single smoke run, includes recovery and agent decision time)

- Trace start: 2026-10-16T21:43:34.805Z; wall **512.882 s**.
- Android-busy union: **262.514 s**; unobserved **250.368 s** (NOT model time).
- **253 tool calls**, 0 explicit tool failures/timeouts, 0 unfinished/dropped.
  Separately: 2 observed input-replacement failures (clear-first, Ctrl+A),
  recovered with explicit broadcast. Workflow is not a clean correctness pass.

| Tool | Calls | Median ms | p95 ms | Max ms | Total ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| ui_dump | 71 | 2727.03 | 3693.90 | 8911.85 | 195125.97 |
| screenshot | 17 | 522.55 | 15969.22 | 15969.22 | 24363.28 |
| app | 2 | 5743.69 | 5811.78 | 5811.78 | 11487.37 |
| type | 34 | 200.93 | 562.85 | 577.20 | 9111.62 |
| tap | 47 | 122.96 | 143.48 | 144.27 | 5767.66 |
| scroll | 11 | 505.34 | 594.45 | 594.45 | 5654.71 |
| shell | 29 | 146.94 | 183.16 | 202.51 | 4188.93 |
| key | 36 | 107.90 | 127.19 | 127.23 | 3964.03 |
| swipe | 5 | 506.17 | 522.63 | 522.63 | 2540.51 |
| screen_state | 1 | 309.73 | 309.73 | 309.73 | 309.73 |

Cache state unknown. Screenshot first-call outlier retained; no causal
attribution. Internal ADB/OCR/reconnect timing and execution failure metadata
not available in this loaded-tool trace. Repeating with a different loaded
revision or without the same recovery actions is not a controlled speedup.
The 15-minute bound was met, but no timer-enforced unattended harness exists.
