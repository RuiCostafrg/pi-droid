/** Checked app launch with an explicit, opt-in website fallback. */
import { adbShell, type AdbExecOptions } from "./exec.js";
import { launchApp } from "./app.js";

export type AppLaunchResult =
  | { launched: string; fallback: false }
  | { launched: string; fallback: true; requestedPackage: string; url: string }
  | { launched: null; fallback: false; error: "app_not_installed"; package: string; suggestion: string };

function validatePackage(value: string): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(value)) {
    throw new Error("Invalid Android package name");
  }
}

function quote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

/** Do not treat a transport/permission failure as an absent application. */
async function installed(packageName: string, options: AdbExecOptions): Promise<boolean> {
  const output = await adbShell(`pm list packages ${packageName}`, options);
  if (output.trim() && !output.trim().split("\n").every(line => /^package:\S+$/.test(line.trim()))) {
    throw new Error(`Could not check installed package: ${output.trim()}`);
  }
  return output.split("\n").some(line => line.trim() === `package:${packageName}`);
}

export async function launchAppWithFallback(
  packageName: string,
  options: AdbExecOptions & { fallbackUrl?: string; browserPackage?: string } = {},
): Promise<AppLaunchResult> {
  validatePackage(packageName);
  const { fallbackUrl, browserPackage, ...execOptions } = options;
  if (browserPackage) validatePackage(browserPackage);
  if (browserPackage && !fallbackUrl) throw new Error("browserPackage requires fallbackUrl");
  if (fallbackUrl !== undefined) {
    let url: URL;
    try { url = new URL(fallbackUrl); } catch { throw new Error("fallbackUrl must be an HTTP(S) URL"); }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || /[\x00-\x1f\x7f]/.test(fallbackUrl)) {
      throw new Error("fallbackUrl must be an HTTP(S) URL without credentials or control characters");
    }
  }
  if (await installed(packageName, execOptions)) {
    await launchApp(packageName, execOptions);
    return { launched: packageName, fallback: false };
  }
  if (!fallbackUrl) {
    return {
      launched: null, fallback: false, error: "app_not_installed", package: packageName,
      suggestion: "Ask for an alternative or supply fallback_url with the intended website; no app was launched or installed.",
    };
  }
  if (browserPackage && !await installed(browserPackage, execOptions)) {
    throw new Error(`Fallback browser ${browserPackage} is not installed`);
  }
  // Use the user's default URL handler unless an installed browser is explicitly supplied.
  const output = await adbShell(
    `am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d ${quote(fallbackUrl)}` +
    (browserPackage ? ` -p ${browserPackage}` : ""), execOptions,
  );
  const activity = output.match(/^Activity:\s*([^/\s]+)\/\S+/m);
  if (!/^Status:\s*ok\s*$/m.test(output) || !activity || /(?:Error:|Exception|unable to resolve)/i.test(output)) {
    throw new Error(`Website fallback did not launch successfully: ${output.trim()}`);
  }
  if (activity[1] === "android") throw new Error("Website fallback requires choosing a browser on the device");
  return { launched: activity[1], fallback: true, requestedPackage: packageName, url: fallbackUrl };
}
