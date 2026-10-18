import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "reconnect-timing-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs = require("node:fs"), path = require("node:path");
const args = process.argv.slice(2), mode = process.env.RECOVERY_MODE;
const marker = path.join(process.env.RECOVERY_DIR,"connected");
fs.appendFileSync(path.join(process.env.RECOVERY_DIR,"calls"),JSON.stringify(args)+"\\n");
if(args[0]==="mdns") {
  const service = "private _adb-tls-connect._tcp. ";
  setTimeout(()=>console.log(mode==="missing" ? service+"192.0.2.99:42000" :
    mode==="ambiguous" ? service+"192.0.2.42:42000\\n"+service+"192.0.2.42:42001" :
    service+"192.0.2.42:42000"),mode.startsWith("concurrent")?600:150);
} else if(args[0]==="connect") {
  if(mode==="connect-timeout") setInterval(()=>{},1000);
  else if(mode==="connect-reject") console.log("PRIVATE_REJECT");
  else if(mode==="connect-exit") { process.stderr.write("PRIVATE_EXIT"); process.exit(7); }
  else { fs.writeFileSync(marker,""); console.log("connected to 192.0.2.42:42000"); }
} else if(args[0]==="devices") {
  if(mode==="verify-exit") { process.stderr.write("PRIVATE_VERIFY"); process.exit(8); }
  else console.log("List of devices attached\\n192.0.2.42:42000 "+(mode==="unauthorized"?"unauthorized":"device"));
} else if(fs.existsSync(marker)) console.log("recovered");
else { process.stderr.write("error: device offline"); process.exit(1); }
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function probe(mode = "success") {
  const script = join(dir, "probe.mjs");
  await writeFile(script, `
import { adb } from ${JSON.stringify(resolve("src/adb/exec.ts"))};
import { readFile } from "node:fs/promises";
import { captureTiming } from ${JSON.stringify(resolve("src/adb/capture-timing.ts"))};
import { autoConnect } from ${JSON.stringify(resolve("src/adb/wifi.ts"))};
const spans=[], follower=[], ignored=[], mode=process.env.RECOVERY_MODE;
let failure, result;
const captureClock = mode==="clock" ? captureTiming(span=>spans.push(span)) : undefined;
if(captureClock) await new Promise(r=>setTimeout(r,80));
const options=Object.freeze({serial:"192.0.2.42:40000",
  ...(captureClock?{captureClock}:{}),
  ...(mode==="disabled"||mode==="concurrent-untraced-owner"?{}:{onCaptureSpan:span=>{
    (mode==="clock"?ignored:spans).push(span); if(mode==="throwing") throw Error("PRIVATE_SINK");
  }})});
try {
  if(mode.startsWith("concurrent")) {
    const first=adb(["shell","PRIVATE_COMMAND"],options);
    // Wait for the external discovery command so the owner is deterministic.
    while(!(await readFile(${JSON.stringify(join(dir,"calls"))},"utf8").catch(()=>"")).includes("mdns"))
      await new Promise(r=>setTimeout(r,5));
    const second=adb(["shell","PRIVATE_COMMAND"],{serial:options.serial,onCaptureSpan:span=>follower.push(span)});
    result=await Promise.all([first,second]);
  } else if(mode==="direct"||mode==="connect-timeout") result=await autoConnect({...options,timeout:2000});
  else result=await adb(["shell","PRIVATE_COMMAND"],options);
} catch(error) { failure={name:error.name,failureKind:error.failureKind}; }
console.log(JSON.stringify({result,failure,spans,follower,ignored,calls:(await readFile(${JSON.stringify(join(dir,"calls"))},"utf8")).trim().split("\\n").map(JSON.parse)}));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", script], {
    timeout: 10000, env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, RECOVERY_DIR: dir, RECOVERY_MODE: mode },
  });
  return JSON.parse(stdout);
}

it("attributes discovery and verified connect inside the public command recovery clock", async () => {
  const r = await probe();
  expect(r.result).toBe("recovered");
  expect(r.failure).toBeUndefined();
  const discovery = r.spans.find((s: { stage: string }) => s.stage === "reconnect_discovery");
  const connect = r.spans.find((s: { stage: string }) => s.stage === "reconnect_connect");
  const recovery = r.spans.find((s: { stage: string }) => s.stage === "reconnect");
  expect(discovery).toMatchObject({outcome:"ok"});
  expect(connect).toMatchObject({outcome:"ok"});
  expect(discovery.startMs).toBeGreaterThanOrEqual(recovery.startMs);
  expect(connect.startMs).toBeGreaterThanOrEqual(discovery.startMs + discovery.durationMs);
  expect(connect.startMs + connect.durationMs).toBeLessThanOrEqual(recovery.startMs + recovery.durationMs);
  expect(r.calls.map((a: string[]) => a.includes("mdns") ? "discovery" : a.includes("connect") ? "connect" : a.includes("devices") ? "verify" : "command"))
    .toEqual(["command","discovery","connect","verify","command"]);
  expect(JSON.stringify(r.spans)).not.toMatch(/PRIVATE|192\.0|42000|private|shell/);
},15000);

it.each(["missing","ambiguous"])("fails discovery selection without fabricating connect or retry: %s",async mode=>{
  const r=await probe(mode);
  expect(r.failure).toEqual({name:"AdbError",failureKind:"exit"});
  expect(r.spans.filter((s:{stage:string})=>s.stage.startsWith("reconnect")))
    .toMatchObject([{stage:"reconnect_discovery",outcome:"error",failureKind:"unknown"},
      {stage:"reconnect",outcome:"error",failureKind:"unknown"}]);
  expect(r.calls).toHaveLength(2);
  expect(JSON.stringify(r.spans)).not.toMatch(/PRIVATE|192\.0|private/);
},15000);

it.each([["connect-reject","unknown"],["connect-exit","exit"],["unauthorized","unknown"],["verify-exit","exit"]])(
  "retains failed connect/authorization evidence and original command failure: %s",async (mode,kind)=>{
    const r=await probe(mode);
    expect(r.failure).toEqual({name:"AdbError",failureKind:"exit"});
    expect(r.spans.filter((s:{stage:string})=>s.stage.startsWith("reconnect")))
      .toMatchObject([{stage:"reconnect_discovery",outcome:"ok"},
        {stage:"reconnect_connect",outcome:"error",failureKind:kind},
        {stage:"reconnect",outcome:"error",failureKind:kind}]);
    expect(r.calls.filter((a:string[])=>a.includes("PRIVATE_COMMAND"))).toHaveLength(1);
    expect(JSON.stringify(r.spans)).not.toMatch(/PRIVATE|192\.0|private/);
},15000);

it("retains an explicit connect command timeout without guessing from elapsed time",async()=>{
  const r=await probe("connect-timeout");
  expect(r.failure).toEqual({name:"AdbError",failureKind:"timeout"});
  expect(r.spans.filter((s:{stage:string})=>s.stage.startsWith("reconnect"))).toMatchObject([
    {stage:"reconnect_discovery",outcome:"ok"},
    {stage:"reconnect_connect",outcome:"error",failureKind:"timeout"}]);
  expect(r.calls.some((a:string[])=>a.includes("devices"))).toBe(false);
},15000);

it("keeps diagnostics disabled without opt-in",async()=>{
  const r=await probe("disabled");
  expect(r.result).toBe("recovered"); expect(r.spans).toEqual([]);
},15000);

it("does not let a throwing sink change recovery or retry",async()=>{
  const r=await probe("throwing");
  expect(r.result).toBe("recovered");
  expect(r.spans.filter((s:{stage:string})=>s.stage.startsWith("reconnect"))).toHaveLength(3);
},15000);

it("honors a caller clock over a separate sink without mutating frozen options",async()=>{
  const r=await probe("clock");
  expect(r.result).toBe("recovered"); expect(r.ignored).toEqual([]);
  expect(r.spans.every((s:{startMs:number})=>s.startMs>=75)).toBe(true);
},15000);

it("supports direct secure auto-connect on a single opt-in clock",async()=>{
  const r=await probe("direct");
  expect(r.result).toBe("192.0.2.42:42000");
  expect(r.spans.filter((s:{stage:string})=>s.stage.startsWith("reconnect")).map((s:{stage:string})=>s.stage))
    .toEqual(["reconnect_discovery","reconnect_connect"]);
  expect(r.spans.filter((s:{stage:string})=>s.stage==="reconnect_connect")[0].startMs)
    .toBeGreaterThanOrEqual(r.spans.find((s:{stage:string})=>s.stage==="reconnect_discovery").durationMs);
},15000);

it.each(["concurrent","concurrent-untraced-owner"])("keeps single-flight substages owner-local: %s",async mode=>{
  const r=await probe(mode);
  expect(r.result).toEqual(["recovered","recovered"]);
  expect(r.calls.filter((a:string[])=>a.includes("mdns"))).toHaveLength(1);
  expect(r.calls.filter((a:string[])=>a.includes("connect"))).toHaveLength(1);
  expect(r.follower.map((s:{stage:string})=>s.stage)).toEqual(["adb_attempt","reconnect","adb_attempt"]);
  const fine=r.spans.filter((s:{stage:string})=>["reconnect_discovery","reconnect_connect"].includes(s.stage));
  expect(fine).toHaveLength(mode==="concurrent"?2:0);
},15000);
