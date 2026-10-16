# Local reliability extraction: first increment

Reusable pieces from Pocket's migration handoff are library APIs, not a new
supervisor, survival guarantee or second ADB/screenshot stack. No live plugin
configuration, tmux hooks, device settings or production bridge were changed.

## Host-local identity

```js
import { inspectHostProcess } from 'pi-droid/host';
const owner = await inspectHostProcess(pid, {
  cwd: '/absolute/service', executable: process.execPath,
  entryPoint: '/absolute/service/server.js',
});
// { pid, parent, startTicks }
```

This requires Linux/Termux host procfs. It does NOT inspect the selected Android
device. It validates cwd, executable and final command argument and refuses
missing/unknown/mismatched evidence. It reads start ticks twice to detect PID
reuse during inspection. Resolve `/proc/PID/exe`'s **readlink target** before
realpath: Termux can otherwise report linker64. Tests retain that regression.
No raw command line or OS errors are returned. This helper sends no signals and
does not prove HTTP ownership, database idleness or permission to stop. Adapters
must still validate their lock, HTTP owner and admission transaction and recheck
immediately before mutation. Pocket's standalone controller is retained, not
silently switched to a new dependency.

## Passive power samples

```js
import { readPowerSample, PowerObservationTracker } from 'pi-droid';
const tracker = new PowerObservationTracker(30, 8);
// First wait for user-controlled screen-off; do not call ensureReady here.
const sample = await readPowerSample('com.termux.app.TermuxService', {
  serial: explicitlyAuthorizedSerial, timeout: 5000,
});
const result = tracker.add(sample);
```

The read verifies `get-state`, then reads boot ID, `/proc/uptime` and
`dumpsys power` through the existing ADB execution layer. `exactSerial: true`
bypasses BOTH remembered endpoint aliases and reconnect, even when other calls
have recovered a new port. An explicit serial is mandatory. The option is also
available to other `AdbExecOptions` callers; normal reconnect behavior is
unchanged. Re-establish authorized transport separately, then begin a fresh
observation; never splice intervals across reconnects.

The caller schedules bounded polling, waits for initial Asleep, and performs
app-specific work/assertions separately. Feed samples only when beginning the
strict interval. Device uptime includes suspend and avoids assuming the host
shares the phone's BOOTTIME. Boot ID changes invalidate the interval. Each
snapshot retains all sample metadata, provenance, observed duration and maximum
gap; it omits serial, raw dumps, screenshots and credentials. Keep reports
private if associating them with local device details.

- `observing`: interval not yet complete.
- `sampled`: required sampled Asleep/held-lock interval met. **Not work success.**
- `inconclusive`: transport loss (`transportLost()`), unknown evidence, reboot,
  nonmonotonic clock or gap >= limit. Failure before Asleep is not a screen-off
  result. Catch a sample-read failure and call `transportLost()`; retain the
  snapshot, do not reconnect inside the measurement.
- `interrupted`: explicit Awake or missing requested partial wake lock.

Terminal trackers do not resume; create a new one for a new agreed run. Snapshots
are detached copies. There is no internal polling service or work callback, so
cancellation simply stops scheduling reads; mark an unfinished run inconclusive
in the caller's report, never successful.

No pairing, wake, unlock, key input, setting mutation, wake-lock acquisition or
release is performed. Secure unlock stays user-controlled. Short polling under
a held lock cannot establish Doze, battery-pressure, all-night, provider-network,
APK lifecycle or app reconnect survival. No new Android background mechanism
was added.

## Pocket adapter and retained responsibilities

Pocket supplies the optional external `plugins/pi-droid-pocket` package. It
wraps the existing guarded launcher, declares approval for all mutations,
requires explicit confirmation and has a no-op heartbeat. Installation/activation
is manual. Core contains no Pocket database/schema/token code. Admission,
backup, storage ownership, worktree/journal and exact-ID non-replay remain
Pocket's responsibility. No autonomous restart, stale-lock cleanup or signal
helper is exposed.

Deferred: swapping Pocket's working standalone identity implementation to a
package dependency; migration of its concurrently evolving Python physical-test
observer; generic tmux lifecycle APIs; explicit-consent pairing. Existing secure
reconnect remains the only discovery/recovery implementation. No manual pairing
wizard, gym launcher or production state is migrated.

## Isolated evidence

`npm run lint`, `npm run build`, and `npm run test:ci -- --maxWorkers=2
--testTimeout=30000` passed: 46 files / 585 tests. New contracts cover Termux
identity/PID reuse, exact transport bypass, passive parsing, provenance, retained
metrics and lost/negative evidence. Pocket's plugin contract, 42 bridge tests
and separate-socket real-tmux backup/restart/non-replay harness also passed.
These are host/synthetic tests, not physical survival evidence.
