#!/usr/bin/env node
// Read-only focused default-success overhead check. Does NOT force/live-test recovery.
import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { adbShell, getForegroundPackage } from "../src/adb/exec.ts";
import { dumpUiTree } from "../src/adb/ui-tree.ts";
if (process.env.PI_DROID_RECONNECT_CHECK !== "1" || !process.env.ANDROID_SERIAL || !process.argv[2]) throw Error("Opt-in required");
try { await access(process.argv[2]); throw Error("Existing report"); } catch (e) { if(e.code !== "ENOENT") throw e; }
const options = { serial: process.env.ANDROID_SERIAL, exactSerial: true, autoReconnect: false };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const files = ["exec.ts","reconnect.ts","wifi.ts","capture-timing.ts","mdns.ts","ui-tree.ts"];
const sourceHashes = Object.fromEntries(await Promise.all(files.map(async f => [f,sha(await readFile(new URL("../src/adb/"+f,import.meta.url)))])));
const report = {kind:"reconnect-focused-success-check",status:"fail",driverHash:sha(await readFile(new URL(import.meta.url))),
  sourceHashes,samples:[],limits:["Three native Settings samples per diagnostics mode; descriptive only, no isolated reconnect overhead.",
  "Recovery disabled/exact transport; new discovery/connect stages require controlled process tests, not this fixture.",
  "Per-call source clock; not loaded-tool or model latency."]};
const originalIme = await adbShell("settings get secure default_input_method",options);
try {
  for (let round=0; round<3; round++) for (const trace of [false,true]) {
    const spans=[], start=performance.now();
    let ok=false;
    try {
      const tree=await dumpUiTree({...options,skipCache:true,ocrFallback:false,requireDumpSuccess:true,throwOnError:true,
        ...(trace?{onCaptureSpan:span=>spans.push(span)}:{})});
      ok=tree.foregroundPackage==="com.android.settings" && tree.elements.some(e=>e.text==="Termux") && tree.elements.some(e=>e.text==="OPEN");
      if(!ok) throw Error("fixture");
    } finally { report.samples.push({round,trace,ok,durationMs:performance.now()-start,spans,traceComplete:ok,spansTruncated:false}); }
  }
  report.status="pass";
} catch { report.status="fail"; }
finally {
  report.imeUnchanged=await adbShell("settings get secure default_input_method",options)===originalIme;
  await adbShell("am start -W -n com.termux/.app.TermuxActivity",options);
  report.termuxRestored=await getForegroundPackage(options)==="com.termux";
  if(!report.imeUnchanged||!report.termuxRestored) report.status="fail";
  await writeFile(process.argv[2],JSON.stringify(report,null,2),{flag:"wx",mode:0o600});
}
console.log(JSON.stringify({status:report.status,samples:report.samples.map(({spans,...s})=>({...s,spanCount:spans.length}))}));
process.exitCode=report.status==="pass"?0:1;
