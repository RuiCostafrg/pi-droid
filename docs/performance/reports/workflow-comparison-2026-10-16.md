# Source workflow before/after comparison

Both workflows passed: **true**. Same harness hash: **true**. Same sampled public offers: **true**.

| Metric | Before | After |
| --- | ---: | ---: |
| Workflow wall ms | 361678.97 | 362484.73 |
| Source operations (including settles/cleanup) | 364 | 364 |
| Explicit operation errors | 0 | 0 |

After minus before: **805.75 ms** (**0.22%**).

Single pair only: descriptive, not evidence of a speedup/regression. Source/API operations are NOT loaded Pi tool calls. Includes fixed 500ms settling waits.

| Stage | Before n | After n | Before total ms | After total ms | Before median ms | After median ms | Before p95 ms | After p95 ms | Before max ms | After max ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shell | 36 | 36 | 4014.97 | 3915.35 | 111.78 | 109.89 | 126.79 | 125.49 | 160.84 | 139.09 |
| screen_size | 1 | 1 | 82.78 | 72.63 | 82.78 | 72.63 | 82.78 | 72.63 | 82.78 | 72.63 |
| ui_dump | 102 | 102 | 277012.89 | 277737.41 | 2629.12 | 2625.87 | 2780.42 | 2857.86 | 7254.19 | 7839.92 |
| tap | 48 | 48 | 4576.91 | 4685.96 | 97.69 | 99.59 | 111.07 | 109.58 | 114.09 | 117.62 |
| settle | 94 | 94 | 47116.39 | 47127.43 | 501.12 | 501.32 | 502.01 | 502.06 | 503.70 | 504.03 |
| type | 32 | 32 | 6041.37 | 5957.52 | 190.55 | 187.31 | 212.63 | 204.84 | 220.73 | 215.20 |
| key | 34 | 34 | 3300.11 | 3359.00 | 96.74 | 100.14 | 112.03 | 110.33 | 123.25 | 112.01 |
| app | 1 | 1 | 5632.28 | 5654.13 | 5632.28 | 5654.13 | 5632.28 | 5654.13 | 5632.28 | 5654.13 |
| swipe | 11 | 11 | 5649.02 | 5630.52 | 515.35 | 513.58 | 530.45 | 539.41 | 530.45 | 539.41 |
| field_scroll | 2 | 2 | 966.05 | 987.76 | 483.02 | 493.88 | 503.54 | 496.61 | 503.54 | 496.61 |
| ocr | 1 | 1 | 1350.71 | 1355.82 | 1350.71 | 1355.82 | 1350.71 | 1355.82 | 1350.71 | 1355.82 |
| restore_ime | 1 | 1 | 101.02 | 97.12 | 101.02 | 97.12 | 101.02 | 97.12 | 101.02 | 97.12 |
| restore_termux | 1 | 1 | 5602.69 | 5652.18 | 5602.69 | 5652.18 | 5602.69 | 5652.18 | 5602.69 | 5652.18 |

## Limits

First samples and failures are retained in raw reports. Stage p95 is nearest-rank, not a population tail estimate. App/network/cache/device/host load may differ. This report does not measure LLM latency, whole-observation cancellation, or guarantee that successful commands produced correct UI state. Review named correctness checks and the workflow evidence narrative separately.
