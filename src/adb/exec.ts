/**
 * Low-level ADB command execution.
 *
 * Wraps child_process.execFile for ADB commands with proper error handling,
 * serial targeting, and timeout management.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DeviceInfo, ScreenSize } from "./types.js";
import { captureTiming, type CaptureTiming, type CaptureSpanSink } from "./capture-timing.js";

const execAsync = promisify(execFile);

/** Fixed categories safe to export; raw AdbError fields remain private. */
export type ExecutionFailureKind = "timeout" | "cancelled" | "exit" | "signal" |
  "spawn" | "buffer" | "unknown";

export class AdbError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
    public readonly failureKind: ExecutionFailureKind = "unknown",
    public readonly signal: string | null = null,
    public readonly killed: boolean = false,
  ) {
    super(message);
    this.name = "AdbError";
  }
}

export interface AdbExecOptions {
  /** Opt-in content-free completed spans; diagnostic exceptions are ignored. */
  onCaptureSpan?: CaptureSpanSink;
  /** Internal shared observation clock; nested/retried work must not reset origin. */
  captureClock?: CaptureTiming;
  /** Device serial to target */
  serial?: string;
  /** Command timeout in ms (default: 30000) */
  timeout?: number;
  /** Cancel this command; does not guarantee device-side or sibling-work termination. */
  signal?: AbortSignal;
  /** Max stdout buffer size in bytes (default: 10MB) */
  maxBuffer?: number;
  /** Disable secure reconnect/retry for this command. */
  autoReconnect?: boolean;
  /** Pin this exact authorized transport; bypass remembered endpoints and recovery. */
  exactSerial?: boolean;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Execute an ADB command and return stdout.
 */
export async function adb(args: string[], options: AdbExecOptions = {}): Promise<string> {
  const timing = options.captureClock ?? captureTiming(options.onCaptureSpan);
  options = { ...options, captureClock: timing };
  const deviceCommand = ["shell", "exec-out", "push", "pull", "install", "uninstall", "get-state"].includes(args[0]);
  const { resolveSerial, reconnect } = await import("./reconnect.js");
  if (options.exactSerial && !options.serial?.trim()) throw new Error("Exact transport requires an explicit serial.");
  const serial = deviceCommand && !options.exactSerial ? resolveSerial(options.serial) : options.serial;
  const fullArgs = serial ? ["-s", serial, ...args] : args;

  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  if (!Number.isInteger(timeout) || timeout < 0) throw new RangeError("Invalid ADB timeout");
  // Own the deadline so timeout is an observed event, not a guess based on
  // elapsed time, `killed`, signal, or an error-message substring. First abort wins.
  const controller = new AbortController();
  let interruption: "timeout" | "cancelled" | undefined;
  const interrupt = (kind: "timeout" | "cancelled") => {
    if (controller.signal.aborted) return;
    interruption = kind;
    controller.abort();
  };
  const cancel = () => interrupt("cancelled");
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = timeout > 0 ? setTimeout(() => interrupt("timeout"), timeout) : undefined;
  timer?.unref();
  try {
    return await timing.async("adb_attempt", async () => {
      try {
        const { stdout } = await execAsync("adb", fullArgs, {
          // Disable Node's opaque timeout; our deadline above has explicit provenance.
          timeout: 0, signal: controller.signal,
          maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
        });
        return stdout.trim();
      } catch (err: unknown) {
        const error = err as { stderr?: string; code?: unknown; signal?: string; killed?: boolean };
        const exitCode = typeof error.code === "number" ? error.code : null;
        const failureKind: ExecutionFailureKind = interruption ?? (
          error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ? "buffer" :
          typeof error.code === "number" ? "exit" :
          error.signal ? "signal" :
          typeof error.code === "string" ? "spawn" : "unknown");
        throw new AdbError(
          `ADB command failed: adb ${fullArgs.join(" ")}`,
          `adb ${fullArgs.join(" ")}`,
          error.stderr ?? "",
          exitCode, failureKind, error.signal ?? null, error.killed === true,
        );
      }
    });
  } catch (err: unknown) {
    const original = err as AdbError;
    const failureKind = original.failureKind;
    // Only retry transport-selection failures: the command has not executed.
    // Never replay timeouts, closed connections, authorization or app errors.
    const unavailable = /^(?:adb: (?:error: )?|error: )?(?:no devices\/emulators found|device offline|device '[^']+' not found)\s*$/.test(original.stderr);
    const wirelessTarget = !serial || /^\d+\.\d+\.\d+\.\d+:\d+$/.test(serial);
    if (failureKind === "exit" && !options.signal?.aborted && deviceCommand &&
        !options.exactSerial && options.autoReconnect !== false && unavailable && wirelessTarget) {
      let recovered: string;
      try {
        // Includes single-flight waiting, not just discovery owned by this caller.
        recovered = await timing.async("reconnect", () => reconnect(serial));
      } catch (recoveryError) {
        throw new AdbError(
          `${original.message}; secure reconnect failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`,
          original.command, original.stderr, original.exitCode,
          original.failureKind, original.signal, original.killed,
        );
      }
      return adb(args, { ...options, serial: recovered, autoReconnect: false });
    }
    throw original;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}

/**
 * Execute a shell command on the device.
 */
export async function adbShell(command: string, options: AdbExecOptions = {}): Promise<string> {
  return adb(["shell", command], options);
}

/**
 * List connected ADB devices.
 */
export async function listDevices(): Promise<DeviceInfo[]> {
  const output = await adb(["devices", "-l"]);
  const lines = output.split("\n").slice(1); // Skip header

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const serial = parts[0];
      const state = parts[1] as DeviceInfo["state"];

      const props: Record<string, string> = {};
      for (const part of parts.slice(2)) {
        const [key, value] = part.split(":");
        if (key && value) props[key] = value;
      }

      return {
        serial,
        state,
        model: props.model,
        product: props.product,
        transport: serial.includes(":") ? "wifi" as const : "usb" as const,
      };
    });
}

/**
 * Get screen size of the device.
 */
export async function getScreenSize(options: AdbExecOptions = {}): Promise<ScreenSize> {
  const output = await adbShell("wm size", options);
  // Prefer "Override size:" over "Physical size:" — the override reflects what's actually displayed
  const overrideMatch = output.match(/Override size:\s*(\d+)x(\d+)/);
  if (overrideMatch) {
    return { width: parseInt(overrideMatch[1]), height: parseInt(overrideMatch[2]) };
  }
  const match = output.match(/(\d+)x(\d+)/);
  if (!match) throw new Error(`Could not parse screen size: ${output}`);
  return { width: parseInt(match[1]), height: parseInt(match[2]) };
}

/**
 * Check if ADB server is reachable and a device is connected.
 */
export async function isDeviceReady(serial?: string): Promise<boolean> {
  try {
    const devices = await listDevices();
    if (serial) {
      return devices.some((d) => d.serial === serial && d.state === "device");
    }
    return devices.some((d) => d.state === "device");
  } catch {
    return false;
  }
}

/**
 * Get the foreground activity's package name.
 */
export async function getForegroundPackage(options: AdbExecOptions = {}): Promise<string> {
  const output = await adbShell("dumpsys window | grep mCurrentFocus", options);
  const match = output.match(/\{[^}]*\s+([a-zA-Z0-9_.]+)\//);
  return match?.[1] ?? "unknown";
}
