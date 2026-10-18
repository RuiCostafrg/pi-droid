/**
 * Screenshot capture — pull screenshots from device to local storage.
 */

import { mkdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { adb, adbShell, type AdbExecOptions } from "./exec.js";
import { captureTiming } from "./capture-timing.js";
import type { ScreenshotResult } from "./types.js";

let screenshotDir = join(tmpdir(), "pi-droid", "screenshots");

export function setScreenshotDir(dir: string): void {
  screenshotDir = dir;
}

// Only internally generated paths reach the shell. Cleanup must not initiate
// recovery, mask the primary result/error, or delete another call's image.
async function removeRemote(path: string, options: AdbExecOptions): Promise<void> {
  await adbShell(`rm -f ${path}`, { ...options, autoReconnect: false }).catch(() => {});
}

/**
 * Take a screenshot and pull it to local storage. Successful local files are
 * retained for the caller; partial/failed results are removed best-effort.
 */
export async function takeScreenshot(
  options: AdbExecOptions & { prefix?: string; includeBase64?: boolean } = {},
): Promise<ScreenshotResult> {
  const timing = options.captureClock ?? captureTiming(options.onCaptureSpan);
  options = { ...options, captureClock: timing };
  if (!existsSync(screenshotDir)) {
    await mkdir(screenshotDir, { recursive: true });
  }

  // UUIDs isolate both device and host files, including across processes and
  // calls sharing a timestamp. No global lock serializes unrelated captures.
  const id = randomUUID();
  const remotePath = `/sdcard/pi-droid-screen-${id}.png`;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = options.prefix ?? "screen";
  const localPath = join(screenshotDir, `${prefix}_${ts}_${id}.png`);
  try {
    await timing.async("screenshot_capture", () => adbShell(`screencap -p ${remotePath}`, options));
    await timing.async("screenshot_transfer", () => adb(["pull", remotePath, localPath], options));

    const { width, height } = await timing.async("screenshot_dimensions", async () => {
      const sizeOutput = await adbShell("wm size", options);
      const match = sizeOutput.match(/(\d+)x(\d+)/);
      return { width: match ? parseInt(match[1]) : 0, height: match ? parseInt(match[2]) : 0 };
    });
    const result: ScreenshotResult = { path: localPath, width, height };
    if (options.includeBase64) {
      result.base64 = await timing.async("screenshot_read", async () => (await readFile(localPath)).toString("base64"));
    }
    return result;
  } catch (error) {
    await unlink(localPath).catch(() => {});
    throw error;
  } finally {
    await removeRemote(remotePath, options);
  }
}

/**
 * Take a screenshot and return base64 directly (no retained file).
 */
export async function screenshotBase64(options: AdbExecOptions = {}): Promise<string> {
  const timing = options.captureClock ?? captureTiming(options.onCaptureSpan);
  options = { ...options, captureClock: timing };
  const id = randomUUID();
  const remotePath = `/sdcard/pi-droid-screen-${id}.png`;
  const tmpPath = join(tmpdir(), `pi-droid-quick-${id}.png`);
  try {
    await timing.async("screenshot_capture", () => adbShell(`screencap -p ${remotePath}`, options));
    await timing.async("screenshot_transfer", () => adb(["pull", remotePath, tmpPath], options));
    return await timing.async("screenshot_read", async () => (await readFile(tmpPath)).toString("base64"));
  } finally {
    await unlink(tmpPath).catch(() => {});
    await removeRemote(remotePath, options);
  }
}
