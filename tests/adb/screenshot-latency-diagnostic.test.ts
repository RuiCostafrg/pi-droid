import { afterEach, beforeEach, expect, it } from "vitest";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "screenshot-diag-test-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs=require('node:fs');
const a=process.argv.slice(2);a.splice(0,2);const c=a.join(' ');
if(process.env.DIAG_MODE==='hang'){setInterval(()=>{},1000);}
else if(process.env.DIAG_MODE==='capture-fail'&&c.includes('screencap')){process.stderr.write('PRIVATE_ERROR');process.exit(7);}
else if(process.env.DIAG_MODE==='cleanup-fail'&&c.startsWith('shell rm -f')){process.stderr.write('PRIVATE_ERROR');process.exit(8);}
else if(a[0]==='pull'){fs.writeFileSync(a[2],Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKxkAAAAASUVORK5CYII=','base64'));}
else if(c==='shell wm size')console.log('Physical size: 1x1');
else if(c==='shell true')console.log('PRIVATE_OUTPUT');
else if(!c.includes('screencap')&&!c.startsWith('shell rm -f'))process.exit(9);
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function probe(mode = "ok") {
  const script = join(dir, "probe.mjs");
  await writeFile(script, `
import {measurePublic,processProbe,diagnosticClock,ordered,pngMetadata,run} from ${JSON.stringify(resolve("scripts/screenshot-latency-diagnostic.mjs"))};
import {setScreenshotDir} from ${JSON.stringify(resolve("src/adb/screenshot.ts"))};
import {writeFile,readFile} from 'node:fs/promises';
setScreenshotDir(${JSON.stringify(join(dir, "images"))});
const o={serial:'PRIVATE_SERIAL',exactSerial:true,autoReconnect:false,timeout:3000};
let result;
if(process.env.DIAG_MODE==='hang')result=await processProbe(['shell','true'],o.serial,50);
else if(process.env.DIAG_MODE==='existing'){
 const p=${JSON.stringify(join(dir, "prior.json"))};await writeFile(p,'PRIVATE_PRIOR');
 let rejected=false;try{await run(p,o.serial,2);}catch{rejected=true;}
 result={rejected,unchanged:await readFile(p,'utf8')==='PRIVATE_PRIOR'};
}else{
 const samples=await Promise.all(['saved','base64'].map(a=>measurePublic(a,'concurrent',1,o,{width:1,height:1})));
 const command=await processProbe(['shell','true'],o.serial);
 const trace={spans:[],spansTruncated:false};const clock=diagnosticClock(trace,1);
 await clock.async('screenshot_capture',()=>clock.async('adb_attempt',async()=>{}));
 let invalidRejected=false;try{pngMetadata(Buffer.from('PRIVATE_BAD'));}catch{invalidRejected=true;}
 result={samples,command,trace,invalidRejected,order1:ordered(['a','b'],1),order2:ordered(['a','b'],2)};
}
console.log(JSON.stringify(result));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", script], {
    env: { ...process.env, DIAG_MODE: mode, PATH: `${dir}:${process.env.PATH}` }, timeout: 15000,
  });
  return JSON.parse(stdout);
}

it("measures unchanged concurrent public APIs, validates bytes and attributes unscoped cleanup honestly", async () => {
  const r = await probe();
  for (const s of r.samples) {
    expect(s).toMatchObject({ outcome: "ok", width: 1, height: 1, traceComplete: true, spansTruncated: false });
    expect(s.publicMs).toBeGreaterThan(0);
    expect(s.totalMs).toBeGreaterThanOrEqual(s.publicMs);
    const commands = s.spans.filter((p: { stage: string }) => p.stage === "adb_attempt");
    expect(commands.map((p: { scope: string }) => p.scope)).toEqual(s.api === "saved" ?
      ["screenshot_capture", "screenshot_transfer", "screenshot_dimensions", "unscoped"] :
      ["screenshot_capture", "screenshot_transfer", "unscoped"]);
  }
  expect(r.samples[0]).toMatchObject({ fileMatchesBase64: true, returnedDimensionsMatch: true });
  expect(JSON.stringify(r)).not.toContain("PRIVATE_");
}, 20000);

it("records bounded partial traces, rejects invalid PNGs and reverses block order", async () => {
  const r = await probe();
  expect(r.trace.spansTruncated).toBe(true);
  expect(r.trace.spans).toHaveLength(1);
  expect(r.invalidRejected).toBe(true);
  expect(r.order1).toEqual(["a", "b"]);
  expect(r.order2).toEqual(["b", "a"]);
});

it("retains capture failure and later cleanup without inventing successful/complete traces", async () => {
  const r = await probe("capture-fail");
  for (const s of r.samples) {
    expect(s).toMatchObject({ outcome: "error", failureKind: "exit", traceComplete: false });
    expect(s.spans.at(-1)).toMatchObject({ stage: "adb_attempt", scope: "unscoped", outcome: "ok" });
  }
  expect(JSON.stringify(r)).not.toContain("PRIVATE_");
});

it("makes swallowed cleanup failure visible without changing the public success", async () => {
  const r = await probe("cleanup-fail");
  for (const s of r.samples) {
    expect(s.outcome).toBe("ok");
    expect(s.spans.at(-1)).toMatchObject({ stage: "adb_attempt", scope: "unscoped", outcome: "error", failureKind: "exit" });
  }
  expect(JSON.stringify(r)).not.toContain("PRIVATE_");
});

it("measures process boundaries and counts output without exporting it", async () => {
  const { command } = await probe();
  expect(command.outcome).toBe("ok");
  expect(command.stdoutBytes).toBeGreaterThan(0);
  expect(command.spawnMs).toBeGreaterThanOrEqual(0);
  expect(command.firstStdoutMs).toBeGreaterThanOrEqual(command.spawnMs);
  expect(command.closeMs).toBeGreaterThanOrEqual(command.firstStdoutMs);
  expect(JSON.stringify(command)).not.toContain("PRIVATE_");
});

it("records explicit direct-process timeout provenance", async () => {
  const r = await probe("hang");
  expect(r).toMatchObject({ outcome: "error", failureKind: "timeout" });
  expect(r.closeMs).toBeGreaterThanOrEqual(50);
});

it("audits disjoint timing intervals and rejects overlapping or invalid metrics", async () => {
  const script = join(dir, "summary-probe.mjs");
  await writeFile(script, `
import {stats,partition} from ${JSON.stringify(resolve("scripts/summarize-screenshot-latency.mjs"))};
const sample={publicMs:10,spans:[
 {stage:'screenshot_capture',startMs:0,durationMs:4},
 {stage:'adb_attempt',scope:'screenshot_capture',startMs:1,durationMs:2},
 {stage:'adb_attempt',scope:'unscoped',startMs:5,durationMs:3}]};
const good=partition(sample);let overlap=false,beyond=false,invalid=false;
try{partition({...sample,spans:[...sample.spans,{stage:'screenshot_read',startMs:3,durationMs:3}]});}catch{overlap=true;}
try{partition({...sample,publicMs:7});}catch{beyond=true;}
try{stats([NaN]);}catch{invalid=true;}
console.log(JSON.stringify({good,overlap,beyond,invalid,even:stats([4,1,3,2]),odd:stats([3,1,2])}));
`);
  const { stdout } = await exec(process.execPath, [script], { timeout: 5000 });
  expect(JSON.parse(stdout)).toMatchObject({ good: 3, overlap: true, beyond: true, invalid: true,
    even: { n: 4, median: 2.5 }, odd: { n: 3, median: 2 } });
});

it("refuses to overwrite prior evidence before phone interaction", async () => {
  const r = await probe("existing");
  expect(r).toEqual({ rejected: true, unchanged: true });
  expect(await readFile(join(dir, "prior.json"), "utf8")).toBe("PRIVATE_PRIOR");
});
