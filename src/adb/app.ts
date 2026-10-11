/**
 * App lifecycle management — launch, stop, check state.
 */

import { adbShell, getForegroundPackage, type AdbExecOptions } from "./exec.js";
import type { AppInfo } from "./types.js";

/**
 * Launch an app by package name.
 */
export async function launchApp(
  packageName: string,
  options: AdbExecOptions & { activity?: string } = {},
): Promise<void> {
  if (options.activity) {
    await adbShell(`am start -n ${packageName}/${options.activity}`, options);
  } else {
    // Launch via monkey (finds main activity automatically)
    await adbShell(
      `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`,
      options,
    );
  }
}

/**
 * Force stop an app.
 */
export async function stopApp(
  packageName: string,
  options: AdbExecOptions = {},
): Promise<void> {
  await adbShell(`am force-stop ${packageName}`, options);
}

/**
 * Check if an app is running and in foreground.
 */
export async function getAppInfo(
  packageName: string,
  options: AdbExecOptions = {},
): Promise<AppInfo> {
  // Check if process exists
  let running = false;
  try {
    const ps = await adbShell(`pidof ${packageName}`, options);
    running = ps.trim().length > 0;
  } catch {
    running = false;
  }

  // Check if in foreground
  const fg = await getForegroundPackage(options);
  const foreground = fg === packageName;

  return { packageName, running, foreground };
}

/**
 * List installed packages matching a filter.
 */
export async function listPackages(
  filter?: string,
  options: AdbExecOptions = {},
): Promise<string[]> {
  const cmd = filter
    ? `pm list packages | grep -i ${filter}`
    : "pm list packages";
  try {
    const output = await adbShell(cmd, options);
    return output
      .split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Keep the screen on (disable auto-sleep).
 */
export async function keepScreenOn(
  options: AdbExecOptions = {},
): Promise<void> {
  await adbShell("svc power stayon true", options);
}

/**
 * Restore default screen timeout behavior.
 */
export async function restoreScreenTimeout(
  options: AdbExecOptions = {},
): Promise<void> {
  await adbShell("svc power stayon false", options);
}

/**
 * Wake up the device screen.
 */
export async function wakeScreen(
  options: AdbExecOptions = {},
): Promise<void> {
  await adbShell("input keyevent KEYCODE_WAKEUP", options);
}

/** Check whether keyguard is showing, including when the screen was already on.
 * Fail closed if the platform's policy dump cannot establish lock state.
 */
export async function isKeyguardShowing(options: AdbExecOptions = {}): Promise<boolean> {
  const output = await adbShell("dumpsys window policy", options);
  const section = output.slice(output.indexOf("KeyguardServiceDelegate"));
  const matches = [...section.matchAll(/\b(?:showing|mIsShowing)=(true|false)\b/g)];
  if (output.includes("KeyguardServiceDelegate") && matches.length) {
    return matches.some(match => match[1] === "true");
  }
  const fallback = output.match(/\b(?:mShowingLockscreen|isStatusBarKeyguard|mKeyguardShowing)=(true|false)\b/);
  if (fallback) return fallback[1] === "true";
  throw new Error("Could not verify keyguard state from Android window policy");
}

/** Parse old Display Power dumps and newer OEM Display State dumps. */
export function parseScreenOn(output: string): boolean {
  const display = output.match(/Display Power:.*?\bstate=(\w+)/) ??
    output.match(/\bDisplay State=(\w+)/);
  if (display) return display[1] === "ON";
  return /\bmWakefulness=Awake\b/.test(output);
}

/**
 * Check if screen is on.
 */
export async function isScreenOn(
  options: AdbExecOptions = {},
): Promise<boolean> {
  return parseScreenOn(await adbShell("dumpsys power", options));
}
