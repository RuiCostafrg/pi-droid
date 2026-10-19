# Rejected transfer/cleanup fusion experiment

**Not active production code. Do not ship or treat as a supported SDK.**
Read [complete results](../../reports/fusion-experiment-2026-10-19.md).

The candidate reduced successful screenshot command counts but did not demonstrate
reliable latency improvement. Active `src/` and all six rebuilt baseline artifacts
were independently verified byte-identical to published `35de2c6` after rollback.
A fresh actual registered-tool check also passed on the restored build.

- `exec.ts.txt`, `screenshot.ts.txt`: exact measured experimental source. `.txt`
  prevents accidental compilation/discovery as production source.
- `experiment.patch`: zero-context patch; apply with `--unidiff-zero` to isolated **35de2c6** only. Contains both production
  changes, supporting test-fixture adaptations and new external-process tests.
  All files in this patch were reverted from the active tree using its exact
  reverse, not a broad reset or deletion of unrelated user changes.
- `../../archives/fusion-shell-v1.patch`: earlier source-only checkpoint, retained.
- Frozen `scripts/fusion-check.mjs` and `scripts/fusion-transport-probe.mjs` remain
  in their original measured locations. The transport probe requires this candidate
  source (`adbToFile` is NOT an active API); do not run it against restored main.
- `scripts/compare-workflow-fusion-v1.mjs` audits measured reports against these
  archived source bytes, not against active production. Its functional PASS is
  expressly not optimization acceptance or a shipping recommendation.

## Offline replay (no phone, no installs)

From repository root, with existing dependencies available:

```sh
ROOT="$PWD"
SNAPSHOT="$(mktemp -d "$TMPDIR/fusion-replay-XXXXXX")"
git archive 35de2c6 | tar -x -C "$SNAPSHOT"
git -C "$SNAPSHOT" apply --unidiff-zero "$ROOT/docs/performance/experiments/fusion-shell-v1/experiment.patch"
ln -s "$ROOT/node_modules" "$SNAPSHOT/node_modules"
for file in exec.ts screenshot.ts; do
  cmp "$SNAPSHOT/src/adb/$file" "$ROOT/docs/performance/experiments/fusion-shell-v1/$file.txt"
done
cd "$SNAPSHOT"
npx vitest run tests/adb/fusion-transfer.test.ts \
  tests/adb/fusion-screenshot.test.ts tests/adb/reconnect-timing.test.ts \
  tests/adb/png-concurrency-boundary.test.ts --maxWorkers=2
npm run build
```

This exact isolated source replay passed **41/41** tests. Its fresh rebuild matched
all six hashes in `fusion-loaded-after-2026-10-19.json`. It is not a claim that the
entire historical suite audits future source automatically: older comparator
fixtures are checkpoint-specific. The active historical PNG comparator tests now
supply an isolated matching b050b7f fixture without changing old reports/scripts.

Full candidate-tree units passed **861/861** before rollback and final archive-audit
adaptation; restored active-tree units passed **844/844** afterward. Those include
current offline audit tests not added by this implementation-only replay patch.

Live remeasurement needs NEW approval/authorized exact transport/hands-off fixture,
original IME/Termux restoration and NEW exclusive report names. Never restore this
candidate into the active user tree just to inspect a historical result.
