# Bounded fresh read → select → tap — 2026-10-17

## Outcome

User approved both the recommended operation and its public source/synthetic ADB
and opt-in live CLI test seams. `readSelectTap` is now a production source/SDK
export, not just a benchmark optimization. Existing registered tools, defaults,
cache TTL and frozen v1 Amazon → Forge runner are unchanged.

Equivalent old-path baseline was saved **before production edits**. Same live
driver hash before/after:
`2a1ffb2842f2ccd965a29718dba2c476cc8888dc02832cdcc0c5d6d27e477ba7`.

| Measurement | Existing inspect-then-click path | `readSelectTap` |
| --- | ---: | ---: |
| Exact action/readback checks | 4/4 PASS | 4/4 PASS |
| Hierarchy captures per measured operation | 2 | 1 |
| Total measured hierarchy attempts | 8 | 4 |
| Capture-stage failures | 0 | 0 |
| Median measured operation | 5322.77ms | 2806.34ms |
| Full focused runner, including setup/checks/cleanup | 84518.91ms | 74357.49ms |

**Measured operation median was 47.28% lower**, with a mechanically verified
2 → 1 capture reduction. Full focused runner was 12.02% lower. These are four
samples per path on one fixture, not a population/tail claim or a whole-workflow
speedup. The prior 46 adjacent captures remain candidates, not proven removals.
At this focused-operation checkpoint, the full workflow had not yet been
migrated. The subsequent [v2 consumer adoption](WORKFLOW-V2.md) now has its own
complete pre-migration/after comparison; do not substitute focused timings for it.

Immutable evidence:
- [Before](reports/read-select-tap-before-2026-10-17.json)
- [After](reports/read-select-tap-after-2026-10-17.json)
- Earlier [audit](OBSERVATION-AUDIT.md) and separate single-capture reference.

## Public interface

Exported from both `src/adb/index.ts` and package `src/index.ts`:

```ts
import { readSelectTap } from "pi-droid";

const serial = process.env.ANDROID_SERIAL; // freshly selected authorized device
if (!serial) throw new Error("Explicit authorized target required");
const controller = new AbortController();

const tapped = await readSelectTap(
  elements => elements.filter(element =>
    element.resourceId === "your.app:id/search" && element.enabled),
  { serial, expectedPackage: "your.app", signal: controller.signal },
);
// A tap was dispatched; independently read back the intended app result next.
```

`FreshTargetSelector` receives ALL native elements, including information labels,
in a recursively frozen, readonly `FreshUIElement[]`. It must synchronously return
an array containing **exactly one of those objects**. Returning no matches,
multiple matches, a copied/forged object, an older observation or a Promise fails
before this operation's tap. The returned `FreshUIElement` is also immutable.

The selector is trusted local code, pure with respect to device interaction and
snapshot contents; it may request cancellation. It is NOT asynchronous model
reasoning, untrusted plugin code or a sandbox. Do not launch background work,
change device state or await in the selector. Span observers are diagnostic only
and must not issue device actions. Existing callback exceptions are propagated
(selector) or ignored (diagnostic span sink), respectively.

Options:
- Required explicit nonempty `serial` and `expectedPackage`.
- Normal `AdbExecOptions` for command timeout/buffer/signal.
- `operationTimeoutMs`: cooperative whole-operation deadline, default 15000ms,
  maximum 30000ms; must be a positive integer.
- `selectionMs`: bounded post-capture selection **plus final foreground check**,
  default 500ms, maximum 1000ms; must be a positive integer. It is not a cache TTL.
- Optional existing content-free `onCaptureSpan`. Its capture stages do NOT
  separately instrument the final foreground guard or tap; operation timing does.

The operation always pins the exact serial, disables reconnect/retry, bypasses
cache reads, requires the dump success marker, and disables screenshot/OCR
fallback. Acquisition errors propagate via the new opt-in `dumpUiTree` option
`throwOnError: true`. Default capture/fallback behavior remains unchanged.

After capture it checks expected foreground, makes an immutable selection view,
checks exact membership/uniqueness, enabled/clickable-or-focusable state, target
package and finite nondegenerate bounds/center containment. Before tapping it
rechecks foreground and the selection window, cancellation and an internal
capture/input revision. The revision changes on cache writes/input invalidation,
not on TTL reads; the TTL is unchanged and the operation works with TTL zero.
No previously captured snapshot is accepted as input.

The whole-operation controller is forwarded through acquisition, final
foreground query and input. Deadline/cancellation listeners and timers are
removed in finally. Abort before capture dispatches no command. Cancellation of
an active failed hierarchy does not fall through to foreground/OCR. A tap failure
is never replayed, including when its stderr looks like a reconnectable error.

## Live fixture and protocol

Driver: `scripts/read-select-tap-e2e.mjs`. Before mode was run against unchanged
production at `ea6b97f`; after mode invokes the public implementation. Only the
mode and NEW report path differ. No implementation tests/builds ran concurrently
with live measurement.

```sh
# Open the existing TEST draft's title editor first, then return to Termux.
# Freshly discover exactly one authorized device and export ANDROID_SERIAL.
PI_DROID_SELECT_TAP_E2E=1 node --import tsx scripts/read-select-tap-e2e.mjs before /private/new-before.json
# Implement/validate the operation; do not edit this driver between measurements.
PI_DROID_SELECT_TAP_E2E=1 node --import tsx scripts/read-select-tap-e2e.mjs after /private/new-after.json
```

Fixture: existing `E2E Lower v1 source-after5`, title field only. Each round:
1. Outside timing, assert the uniquely identified editor contains the known title.
2. Measure the old or new fresh selection/tap operation.
3. Type a fixed round-specific probe through the same existing `typeText(clear)`
   on BOTH paths. Assert exact UI readback to prove the intended field received
   focus/input, not just a successful ADB exit or returned coordinate.
4. Restore the original title, dismiss the keyboard, verify restoration.

Old path captures to choose a target, captures again and verifies that target
before tapping. New path selects synchronously from its own single fresh
capture with bounds/identity/window/cancellation checks and a final foreground
guard. Both paths retain the SAME independent input/readback/restoration checks.
Readback/setup/cleanup captures are excluded from the measured capture counts
and operation timings, but included in full runner elapsed time.

All cleanup flags were true on both runs. Gboard and Termux were independently
verified after measurement. No new drafts, exercise/numeric workout changes,
completed sets, purchases, APK/helper/permission changes or debugging exposure.
Private target endpoints and screen content are absent from saved JSON. Output
creation is exclusive (`wx`); existing report paths are refused before navigation.

## Reproducibility and validation

The JSON `sources` maps cover the driver-selected source files, not a full repo
hash. `automation.ts` and `input.ts` match across runs; `ui-tree.ts` adds the
opt-in acquisition error propagation, and read-select-tap.ts is new. Cache guard
provenance, not included by the frozen driver's source list:

| Source | SHA-256 |
| --- | --- |
| `cache.ts` at baseline `ea6b97f` | `f2b471b37440e8a19110f25592d66e9c286cc1bf384bc190f9ef0b702f14513c` |
| `cache.ts` with revision guard | `494d93ad114dec388b277919eadf336f82f5f6c427175e8e99f1096dcef8a752` |

All after-report source hashes and both driver hashes were checked against the
files after measurement. Baseline JSON was not rewritten. Before report was
saved at 08:37 UTC, before the first production helper was written; after report
started at 08:44 UTC. Existing v1 workflow evidence/harness remains intact.

Tests: `npx vitest run tests/adb/read-select-tap.test.ts` invokes the public ADB
export through a real subprocess, with synthetic executable ADB replacing ONLY
the external transport. Real capture/pull/parser/foreground/cache/input code runs.
Known literal results are checked; implementation collaborators are not mocked.

Red → green demonstrated for missing capability, immutable-coordinate protection
and selection expiry. 30 regression cases now cover missing/ambiguous/forged/
old/async/throwing selections, non-actionable/disabled/wrong-package/invalid-bounds
targets, changed foreground, invalid configuration, cached moved layout, TTL
independence, cancellation before/during capture and during selection, deadline
expiry, input invalidation and no tap replay. Fake transport does not prove real
Android behavior; the separate live fixture checks do.

See [PLAN.md](PLAN.md) for the final validation counts and published checkpoint.

## Important limits and next slice

- Requires exclusive device interaction, not a mutex across tools/processes. The
  revision guard is process-local and global across devices: unrelated captured
  trees/input can conservatively reject an operation; raw ADB/external users are
  not tracked. It does not make Android capture and input atomic.
- Other apps can animate or change within the bounded interval. No fixed finite
  window proves semantic UI stability. Do not use this path where asynchronous
  model decisions or further polling are needed; capture fresh again instead.
- Trusted synchronous code cannot be preempted by a JS timer. Slow-returning
  selectors fail elapsed checks before tap; an infinite loop blocks the process.
  This is a cooperative deadline, not a hard real-time process-group watchdog.
- Signal rejection/ADB termination does not prove device-side work stopped. If
  cancellation/failure happens after input dispatch, action outcome is uncertain;
  read back before deciding what to do. Never automatically replay the tap.
- A returned control/ADB success is not app-level success. Caller must read back.
  No screenshots/OCR fallback means inaccessible native targets fail rather than
  silently attempting a different perception backend.
- Live driver finally restores fixture/IME/Termux for caught failures, not external
  SIGKILL/host crashes. Supervisor restoration remains necessary if interrupted.
- No registered-tool changes, active-session reload proof, automatic migration of
  existing workflows, UI backend change or fix to `typeIntoField(clearFirst)`.

Follow-up complete: [v2](WORKFLOW-V2.md) adopts this helper for 30 eligible
numeric-field selections, preserves polling/checkpoints and records a separate
equivalent full source-workflow pair. Original v1 and registered tools remain
unchanged. Non-interactive text-only tool output is the next separate slice,
not part of either this focused comparison or the v2 migration.
