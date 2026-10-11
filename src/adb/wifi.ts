/**
 * WiFi ADB — connect, disconnect, and auto-detect wireless devices.
 *
 * Enables wireless device automation: switch a USB-connected device to
 * WiFi mode, discover its IP, and connect over the network.
 */

import { adb, adbShell, listDevices, type AdbExecOptions } from "./exec.js";
import { discoverWirelessEndpoints } from "./mdns.js";

const DEFAULT_PORT = 5555;

export interface WifiConnectResult {
  success: boolean;
  /** The host:port serial string (e.g., "192.168.1.42:5555") */
  serial: string;
  message: string;
}

/**
 * Connect to a device over WiFi via `adb connect`.
 */
export async function connectWifi(
  host: string,
  port: number = DEFAULT_PORT,
  options: AdbExecOptions = {},
): Promise<WifiConnectResult> {
  const target = `${host}:${port}`;
  const output = await adb(["connect", target], options);

  const success = output.includes("connected to") || output.includes("already connected");
  return { success, serial: target, message: output };
}

/**
 * Disconnect a WiFi-connected device via `adb disconnect`.
 *
 * If host is omitted, disconnects all WiFi devices.
 */
export async function disconnectWifi(
  host?: string,
  port: number = DEFAULT_PORT,
  options: AdbExecOptions = {},
): Promise<string> {
  if (host) {
    return adb(["disconnect", `${host}:${port}`], options);
  }
  return adb(["disconnect"], options);
}

/**
 * Enable WiFi ADB on a USB-connected device by switching to TCP/IP mode.
 *
 * The device must already be connected via USB. After this call the device
 * will listen on the given port for wireless ADB connections.
 */
export async function enableWifiAdb(
  options: AdbExecOptions & { port?: number } = {},
): Promise<string> {
  const port = options.port ?? DEFAULT_PORT;
  return adb(["tcpip", String(port)], options);
}

/**
 * Get the device's WiFi IP address from `wlan0`.
 *
 * Parses `ip addr show wlan0` and returns the first IPv4 address, or null
 * if the device is not connected to WiFi.
 */
export async function getWifiIp(options: AdbExecOptions = {}): Promise<string | null> {
  try {
    const output = await adbShell("ip addr show wlan0", options);
    const match = output.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if a WiFi device is currently connected.
 *
 * Looks for a `host:port` entry with state "device" in the device list.
 */
export async function isWifiConnected(
  host: string,
  port: number = DEFAULT_PORT,
): Promise<boolean> {
  const target = `${host}:${port}`;
  const devices = await listDevices();
  return devices.some((d) => d.serial === target && d.state === "device");
}

/** Discover the current secure Wireless debugging port and reconnect.
 * Never enables legacy unencrypted TCP/IP mode or initiates pairing.
 * Specify host when multiple phones advertise Wireless debugging.
 */
export async function autoConnect(
  options: AdbExecOptions & { host?: string; port?: number } = {},
): Promise<string> {
  const endpoints = await discoverWirelessEndpoints(options.timeout ?? 5000);
  const host = options.host ?? (options.serial?.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/)?.[1]);
  const candidates = endpoints.filter(endpoint =>
    (!host || endpoint.host === host) &&
    (options.port === undefined || endpoint.port === options.port),
  );
  const unique = [...new Map(candidates.map(endpoint => [`${endpoint.host}:${endpoint.port}`, endpoint])).values()];
  if (!unique.length) {
    throw new Error("No secure Wireless debugging service found. Enable Wireless debugging on the same WiFi network and ensure this ADB host is paired.");
  }
  if (unique.length > 1) {
    throw new Error("Multiple Wireless debugging endpoints found; specify host (and port if necessary) to select your phone.");
  }
  const endpoint = unique[0];
  const result = await connectWifi(endpoint.host, endpoint.port, { timeout: options.timeout });
  if (!result.success) throw new Error(`WiFi connect failed: ${result.message}`);
  const devices = await listDevices();
  if (!devices.some(device => device.serial === result.serial && device.state === "device")) {
    throw new Error("Wireless debugging connection is not authorized or is offline. Pair this ADB host in Android settings first.");
  }
  return result.serial;
}
