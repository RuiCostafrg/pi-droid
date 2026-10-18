/**
 * Screenshot capture — pull screenshots from device to local storage.
 */

import { mkdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { adb, adbShell, type AdbExecOptions } from "./exec.js";
import { captureTiming } from "./capture-timing.js";
import type { ScreenshotResult } from "./types.js";

const REMOTE_PATH = "/sdcard/pi-droid-screen.png";

let screenshotDir = join(tmpdir(), "pi-droid", "screenshots");

export function setScreenshotDir(dir: string): void {
  screenshotDir = dir;
}

/**
 * Take a screenshot and pull it to local storage.
 */
export async function takeScreenshot(
  options: AdbExecOptions & { prefix?: string; includeBase64?: boolean } = {},
): Promise<ScreenshotResult> {
  const timing = options.captureClock ?? captureTiming(options.onCaptureSpan);
  options = { ...options, captureClock: timing };
  if (!existsSync(screenshotDir)) {
    await mkdir(screenshotDir, { recursive: true });
  }

  // Capture on device
  await timing.async("screenshot_capture", () => adbShell(`screencap -p ${REMOTE_PATH}`, options));

  // Pull to local
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = options.prefix ?? "screen";
  const localPath = join(screenshotDir, `${prefix}_${ts}.png`);
  await timing.async("screenshot_transfer", () => adb(["pull", REMOTE_PATH, localPath], options));

  // Get dimensions
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
}

/**
 * Take a screenshot and return base64 directly (no file save).
 */
export async function screenshotBase64(options: AdbExecOptions = {}): Promise<string> {
  const timing = options.captureClock ?? captureTiming(options.onCaptureSpan);
  options = { ...options, captureClock: timing };
  await timing.async("screenshot_capture", () => adbShell(`screencap -p ${REMOTE_PATH}`, options));

  // Pull to temp, read, return base64, then clean up
  const tmpPath = join(tmpdir(), `pi-droid-quick-${Date.now()}.png`);
  await timing.async("screenshot_transfer", () => adb(["pull", REMOTE_PATH, tmpPath], options));
  try {
    return await timing.async("screenshot_read", async () => (await readFile(tmpPath)).toString("base64"));
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
