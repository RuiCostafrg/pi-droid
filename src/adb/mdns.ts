/** Secure Wireless debugging discovery, independent of ADB's mDNS backend. */
import multicastDns from "multicast-dns";
import { isIPv4 } from "node:net";
import { adb } from "./exec.js";

const SERVICE = "_adb-tls-connect._tcp.local";
export interface WirelessEndpoint { host: string; port: number; }

export async function discoverWirelessEndpoints(timeout = 5000): Promise<WirelessEndpoint[]> {
  // Prefer ADB's own discovery when supported. Never use pairing/legacy services.
  try {
    const output = await adb(["mdns", "services"], { timeout });
    const endpoints: WirelessEndpoint[] = [];
    for (const line of output.split("\n")) {
      const match = line.match(/\s_adb-tls-connect\._tcp\.?\s+(\d+\.\d+\.\d+\.\d+):(\d+)\s*$/);
      if (match && isIPv4(match[1]) && +match[2] > 0 && +match[2] <= 65535) {
        endpoints.push({ host: match[1], port: +match[2] });
      }
    }
    if (endpoints.length) return endpoints;
  } catch { /* Unsupported ADB mDNS backend: use independent discovery. */ }

  return new Promise((resolve, reject) => {
    const browser = multicastDns();
    const services = new Map<string, { target: string; port: number }>();
    const addresses = new Map<string, Set<string>>();
    let finished = false;
    let repeat: ReturnType<typeof setInterval>;
    let deadline: ReturnType<typeof setTimeout>;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearInterval(repeat);
      clearTimeout(deadline);
      browser.destroy();
      if (error) { reject(error); return; }
      const endpoints = new Map<string, WirelessEndpoint>();
      for (const service of services.values()) {
        for (const host of addresses.get(service.target) ?? []) {
          endpoints.set(`${host}:${service.port}`, { host, port: service.port });
        }
      }
      resolve([...endpoints.values()]);
    };
    browser.on("error", finish);
    browser.on("response", packet => {
      for (const record of [...(packet.answers ?? []), ...(packet.additionals ?? [])]) {
        const name = record.name.toLowerCase().replace(/\.$/, "");
        if (record.type === "PTR" && name === SERVICE && record.ttl !== 0) {
          browser.query([{ name: record.data, type: "SRV" }]);
        } else if (record.type === "SRV" && name.endsWith(`.${SERVICE}`)) {
          if (record.ttl === 0) { services.delete(name); continue; }
          const { target, port } = record.data;
          if (port > 0 && port <= 65535) {
            services.set(name, { target: target.toLowerCase().replace(/\.$/, ""), port });
            browser.query([{ name: target, type: "A" }]);
          }
        } else if (record.type === "A") {
          if (record.ttl === 0) { addresses.get(name)?.delete(record.data); continue; }
          if (isIPv4(record.data)) {
            if (!addresses.has(name)) addresses.set(name, new Set());
            addresses.get(name)!.add(record.data);
          }
        }
      }
    });
    const query = () => browser.query([{ name: SERVICE, type: "PTR" }]);
    repeat = setInterval(query, 1000);
    deadline = setTimeout(() => finish(), Math.max(1, timeout));
    query();
  });
}
