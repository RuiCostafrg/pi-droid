import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../src/adb/exec.js", () => ({ adb: vi.fn(), adbShell: vi.fn() }));
import { adb, adbShell } from "../../src/adb/exec.js";
import { readPowerSample, parsePowerSample, PowerObservationTracker, type PowerSample } from "../../src/adb/power-observation.js";
const bootId = "00000000-0000-0000-0000-000000000000";
const dump = `${bootId}\n100.00 99.00\n mWakefulness=Asleep\n PARTIAL_WAKE_LOCK 'fixture.lock' ACQ=-1s (uid=123)\n`;
const sample = (bootSeconds: number): PowerSample => ({ bootId, bootSeconds, wakefulness: "Asleep", partialWakeLockHeld: true });
beforeEach(() => vi.resetAllMocks());
describe("passive power observation", () => {
  it("parses positive evidence, not unrelated or disabled locks", () => {
    expect(parsePowerSample(dump, "fixture.lock")).toEqual(sample(100));
    expect(parsePowerSample(dump, "other.lock").partialWakeLockHeld).toBe(false);
    expect(parsePowerSample(dump.replace("ACQ", "disabled ACQ"), "fixture.lock").partialWakeLockHeld).toBe(false);
    expect(parsePowerSample(dump.replace("Asleep", "Dozing"), "fixture.lock").wakefulness).toBe("unknown");
    expect(() => parsePowerSample("permission denied", "fixture.lock")).toThrow();
  });
  it("pins serial on authorization and every read, with no recovery or UI commands", async () => {
    vi.mocked(adb).mockResolvedValue("device"); vi.mocked(adbShell).mockResolvedValue(dump);
    expect(await readPowerSample("fixture.lock", { serial: "fixture-serial", autoReconnect: true })).toEqual(sample(100));
    expect(adb).toHaveBeenCalledWith(["get-state"], expect.objectContaining({ serial: "fixture-serial", exactSerial: true, autoReconnect: false }));
    expect(adbShell).toHaveBeenCalledWith("cat /proc/sys/kernel/random/boot_id; cat /proc/uptime; dumpsys power", expect.objectContaining({ exactSerial: true }));
  });
  it("refuses implicit targets and unauthorized transports", async () => {
    await expect(readPowerSample("fixture.lock")).rejects.toThrow();
    expect(adb).not.toHaveBeenCalled();
    vi.mocked(adb).mockResolvedValue("unauthorized");
    await expect(readPowerSample("fixture.lock", { serial: "fixture" })).rejects.toThrow();
    expect(adbShell).not.toHaveBeenCalled();
  });
  it("retains all metrics and provenance on sampled completion", () => {
    const tracker = new PowerObservationTracker(10);
    tracker.add(sample(100)); tracker.add(sample(105));
    expect(tracker.add(sample(110))).toMatchObject({ outcome: "sampled", observedSeconds: 10, maxGapSeconds: 5, samples: [sample(100), sample(105), sample(110)], provenance: { exactTransport: true } });
    const snapshot = tracker.snapshot(); snapshot.samples.length = 0;
    expect(tracker.snapshot().samples).toHaveLength(3);
  });
  it("cannot bridge transport loss before or after Asleep evidence", () => {
    for (const started of [false, true]) {
      const tracker = new PowerObservationTracker(10);
      if (started) tracker.add(sample(100));
      expect(tracker.transportLost()).toMatchObject({ outcome: "inconclusive", reason: "transport-unavailable" });
      expect(tracker.add(sample(110)).outcome).toBe("inconclusive");
    }
  });
  it.each([
    [{ bootSeconds: 108 }, "inconclusive", "observation-gap"],
    [{ bootSeconds: 99 }, "inconclusive", "unknown-evidence"],
    [{ bootId: "different" }, "inconclusive", "device-rebooted"],
    [{ wakefulness: "unknown" }, "inconclusive", "unknown-evidence"],
    [{ wakefulness: "Awake" }, "interrupted", "screen-awake"],
    [{ partialWakeLockHeld: false }, "interrupted", "wake-lock-missing"],
  ])("classifies lost/negative evidence %j", (change, outcome, reason) => {
    const tracker = new PowerObservationTracker(10); tracker.add(sample(100));
    expect(tracker.add({ ...sample(101), ...change } as PowerSample)).toMatchObject({ outcome, reason });
  });
});
