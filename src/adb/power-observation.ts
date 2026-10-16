/** Passive sampled evidence, not a Doze/survival or application-work verdict. */
import { adb, adbShell, type AdbExecOptions } from "./exec.js";

export interface PowerSample {
  /** Device boot ID and uptime (includes suspend); never the remote host clock. */
  bootId: string;
  bootSeconds: number;
  wakefulness: "Asleep" | "Awake" | "unknown";
  partialWakeLockHeld: boolean;
}
export interface PowerObservation {
  outcome: "observing" | "sampled" | "inconclusive" | "interrupted";
  reason?: "transport-unavailable" | "unknown-evidence" | "observation-gap" | "device-rebooted" | "screen-awake" | "wake-lock-missing";
  samples: PowerSample[];
  observedSeconds: number;
  maxGapSeconds: number;
  provenance: { source: "adb:dumpsys-power"; clock: "device-uptime"; exactTransport: true };
}

export function parsePowerSample(output: string, wakeLockTag: string): PowerSample {
  const [bootId, uptime, ...power] = output.trim().split(/\r?\n/);
  if (!/^[a-f0-9-]{36}$/i.test(bootId) || !/^\d+(?:\.\d+)?\s/.test(uptime)) throw new Error("Unknown power evidence.");
  const wakefulness = power.join("\n").match(/^\s*mWakefulness=(Asleep|Awake)\s*$/m)?.[1];
  return {
    bootId, bootSeconds: Number(uptime.split(/\s+/)[0]),
    wakefulness: wakefulness === "Asleep" || wakefulness === "Awake" ? wakefulness : "unknown",
    partialWakeLockHeld: power.some(line => /\bPARTIAL_WAKE_LOCK\b/.test(line) &&
      line.includes(`'${wakeLockTag}'`) && !/\bdisabled\b/i.test(line)),
  };
}

/** Never wakes/unlocks/pairs/reconnects; failures are observation loss, not work failure. */
export async function readPowerSample(wakeLockTag: string, options: AdbExecOptions = {}): Promise<PowerSample> {
  if (!options.serial?.trim() || !wakeLockTag || /[\r\n']/.test(wakeLockTag)) throw new Error("Explicit serial and wake-lock tag required.");
  const pinned = { ...options, exactSerial: true, autoReconnect: false };
  if (await adb(["get-state"], pinned) !== "device") throw new Error("Authorized transport required.");
  return parsePowerSample(await adbShell(
    "cat /proc/sys/kernel/random/boot_id; cat /proc/uptime; dumpsys power", pinned,
  ), wakeLockTag);
}

/** Stateful accumulator: callers schedule samples and retain fixture/work assertions. */
export class PowerObservationTracker {
  private result: PowerObservation = {
    outcome: "observing", samples: [], observedSeconds: 0, maxGapSeconds: 0,
    provenance: { source: "adb:dumpsys-power", clock: "device-uptime", exactTransport: true },
  };
  constructor(private targetSeconds: number, private maxGapSeconds = 8) {
    if (!Number.isFinite(targetSeconds) || targetSeconds <= 0 || !Number.isFinite(maxGapSeconds) || maxGapSeconds <= 0)
      throw new Error("Positive observation interval and gap required.");
  }
  snapshot(): PowerObservation { return structuredClone(this.result); }
  transportLost(): PowerObservation {
    if (this.result.outcome === "observing") {
      this.result.outcome = "inconclusive"; this.result.reason = "transport-unavailable";
    }
    return this.snapshot();
  }
  add(sample: PowerSample): PowerObservation {
    const r = this.result;
    if (r.outcome !== "observing") return this.snapshot();
    const previous = r.samples.at(-1);
    r.samples.push(structuredClone(sample));
    const gap = previous ? sample.bootSeconds - previous.bootSeconds : 0;
    r.maxGapSeconds = Math.max(r.maxGapSeconds, gap);
    if (previous && sample.bootId !== previous.bootId) { r.outcome = "inconclusive"; r.reason = "device-rebooted"; }
    else if (!Number.isFinite(sample.bootSeconds) || sample.bootSeconds < 0 || gap < 0 || sample.wakefulness === "unknown") {
      r.outcome = "inconclusive"; r.reason = "unknown-evidence";
    } else if (gap >= this.maxGapSeconds) { r.outcome = "inconclusive"; r.reason = "observation-gap"; }
    else if (sample.wakefulness !== "Asleep") { r.outcome = "interrupted"; r.reason = "screen-awake"; }
    else if (!sample.partialWakeLockHeld) { r.outcome = "interrupted"; r.reason = "wake-lock-missing"; }
    else {
      r.observedSeconds = sample.bootSeconds - r.samples[0].bootSeconds;
      if (r.observedSeconds >= this.targetSeconds) r.outcome = "sampled";
    }
    return this.snapshot();
  }
}
