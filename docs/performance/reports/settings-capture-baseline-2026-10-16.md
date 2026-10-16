# Live hierarchy-capture baseline — 2026-10-16

## Scope and fixture

Read-only source-level `scripts/capture-benchmark.mjs` run on the authorized
phone. Fixture: Android Settings → Termux app info, at its initial scroll
position. Exact native resource IDs, expected text and classes validated the
non-interactive app title and the OPEN button; no button was pressed. This
proves static label capture, **not editable text insertion/replacement**.
The private expectation file was deleted after the run. Exported JSON contains
no expectation text, resource IDs, serial/IP, paths or raw error messages.

User authorized the live benchmark in this continuation. No APK/helper install,
permission grant, keyboard switch, text entry or persistent setting change was
performed. Preflight's keyboard check failed because Gboard was active; this
was deliberately left unchanged because capture does not require ADBKeyboard.
Settings was navigated to only for measurement; Termux foreground was restored
in a `finally` block and independently verified afterward.

## Procedure

1. Discover exactly one currently authorized device (refuse ambiguity).
2. Open the fixture using the application-details Settings intent; wait 1 second.
3. Run current source via the development worker, with `trace: true`, 20 rounds,
   desired capture <=5s, per-observation deadline 10s and total budget 120s.
   Cache reads, OCR and reconnect are disabled. The initial sample is retained.
4. Save content-free JSON, delete the private expectation file, return to Termux.

No unit tests/builds were run concurrently with measurement. The worker is fresh
for each round, so process/TypeScript startup is visible as harness overhead.
Device model, wireless endpoint and private screen hierarchy are deliberately
not retained. This limits cross-device reproducibility; future comparisons must
use the same authorized phone, transport, screen/layout and budgets.

## Results

Raw evidence: [settings-capture-baseline-2026-10-16.json](settings-capture-baseline-2026-10-16.json).

- **20/20 correct**, no failures/timeouts; all desired capture targets met.
- All 20 traces complete and untruncated.
- Full run: **63.77s**.
- Actual `dumpUiTree`: median **2.557s**, nearest-rank p95 **2.602s**, max **2.610s**.
- Including worker startup/shutdown: median **3.184s**, p95 **3.222s**, max **3.236s**.

| Completed stage | Median | Total across 20 captures |
| --- | ---: | ---: |
| Device dump | 2413.50ms | 48366.60ms |
| XML transfer | 29.87ms | 623.51ms |
| Local read | 3.04ms | 70.33ms |
| Parser + interactive filtering | 7.03ms | 142.75ms |
| Foreground lookup | 94.11ms | 1912.96ms |

Device-dump spans account for about **94.3%** of cumulative actual capture time
in this run. They include the ADB shell round trip and success-marker validation,
not exclusively device CPU time. Stage totals exclude directory setup/cleanup,
result assembly and diagnostic delivery overhead. No internal reconnect/command
attempt attribution was enabled; this runner disables reconnect entirely.

## Conclusions and limits

The highest measured cost on **this fixture** is the device-dump boundary, not
local XML parsing. These data justify investigating fewer fresh dumps and/or
persistent perception backends before a parser-language rewrite. They do not
identify the internal cause of time spent inside UIAutomator.

This is one steady-state baseline, **not a before/after optimization comparison**.
It is not comparable to the dynamic Amazon page as a speedup measurement. The
sample p95 is descriptive only; 20 observations do not establish population tail
latency or wireless reliability. No screenshot, OCR, input lifecycle, model timing
or full loaded Pi-tool path was benchmarked. The currently running extension has
not been reloaded/verified against the changed source.
