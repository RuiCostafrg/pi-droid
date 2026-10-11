/** Bounded, single-flight secure recovery for missing/offline ADB transports. */
import { autoConnect } from "./wifi.js";

const endpoints = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** Keep callers with an old host:port working after the debugging port changes. */
export function resolveSerial(serial?: string): string | undefined {
  if (!serial) return serial;
  const host = serial.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/)?.[1];
  return host ? endpoints.get(host) ?? serial : serial;
}

export async function reconnect(serial?: string): Promise<string> {
  const host = serial?.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/)?.[1];
  const key = host ?? "<untargeted>";
  const existing = pending.get(key);
  if (existing) return existing;
  const recovery = (async () => {
    const connected = await autoConnect({ host, timeout: 5000, autoReconnect: false });
    const connectedHost = connected.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/)?.[1];
    if (connectedHost) endpoints.set(connectedHost, connected);
    return connected;
  })();
  pending.set(key, recovery);
  try { return await recovery; }
  finally { pending.delete(key); }
}
