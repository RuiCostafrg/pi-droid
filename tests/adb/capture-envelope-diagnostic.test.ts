import { afterEach, beforeEach, expect, it } from "vitest";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "capture-envelope-test-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs=require('node:fs');const a=process.argv.slice(4), c=a.join(' '), m=process.env.ENVELOPE_MODE;
if(m?.startsWith('runner')) {
 if(c.includes('settings get secure default_input_method'))console.log('private.ime/.IME');
 else if(c.includes('am start'))fs.writeFileSync(process.env.ENVELOPE_STATE,c.includes('APPLICATION_DETAILS_SETTINGS')?'com.android.settings':'com.termux');
 else if(c.includes('mCurrentFocus'))console.log('mCurrentFocus=Window{abc u0 '+(fs.existsSync(process.env.ENVELOPE_STATE)?fs.readFileSync(process.env.ENVELOPE_STATE,'utf8'):'com.termux')+'/.Main}');
 else if(c.includes('uiautomator dump'))console.log('UI hierchary dumped to: /sdcard/pi-droid-ui.xml');
 else if(c==='shell wm size')console.log('Physical size: 1x1');
 else if(a[0]==='pull')fs.writeFileSync(a[2],a[1].endsWith('.xml')?'<hierarchy><node text="Termux" class="android.widget.TextView" package="com.android.settings" bounds="[0,0][1,1]" enabled="true"/><node text="OPEN" class="android.widget.Button" package="com.android.settings" clickable="true" enabled="true" bounds="[0,0][1,1]"/></hierarchy>':Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKxkAAAAASUVORK5CYII=','base64'));
 else if(c.includes('sleep 0.05')&&m==='runner-capability')console.log('PRIVATE_BAD');
 else if(c.includes('screencap')&&m==='runner-fail')process.exit(7);
 else if(c.includes('screencap')&&m==='runner-interrupt'){fs.writeFileSync(process.env.ENVELOPE_STARTED,'1');setInterval(()=>{},1000);}
 else if(c.includes('PDC1'))console.log('PDC1 B 12345.10\\nPDC1 E 12345.30 0');
 else if(!c.includes('screencap')&&!c.includes('rm -f'))process.exit(9);
}
else if(m==='hang'){setInterval(()=>{},1000);}
else if(c.startsWith('pull ')){if(m==='pull-fail')process.exit(7);fs.writeFileSync(a[2],m==='bad-png'?Buffer.from('PRIVATE_BAD_PNG'):Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKxkAAAAASUVORK5CYII=','base64'));}
else if(c.includes('rm -f')){if(m==='cleanup-fail'){console.error('PRIVATE_ERROR');process.exit(8);}}
else if(m==='overflow')process.stdout.write('PRIVATE_'.repeat(1000));
else if(m==='missing')console.log('PDC1 B 12345.10');
else if(m==='malformed')console.log('PDC1 B PRIVATE_BAD\\nPDC1 E 12345.30 0');
else if(m==='noise')console.log('PRIVATE_NOISE\\nPDC1 B 12345.10\\nPDC1 E 12345.30 0');
else if(m==='exit'){console.log('PDC1 B 12345.10\\nPDC1 E 12345.30 7');process.exit(7);}
else {process.stdout.write('PDC1 B 12345.');setTimeout(()=>{process.stdout.write('10\\nPDC1 E 12345.30 0\\n');process.stderr.write('PRIVATE_STDERR');},5);}
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function probe(action = "process", mode = "ok") {
  const script = join(dir, "probe.mjs");
  await writeFile(script, `
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {parseMarkers,runProcess,measureProbe,run} from ${JSON.stringify(resolve("scripts/capture-envelope-diagnostic.mjs"))};
const serial='PRIVATE_SERIAL';let r;
if(${JSON.stringify(action)}==='parse'){
 let rejected=0;
 for(const s of ['PDC1 B 9.10\\nPDC1 E 9.00 0\\n','PDC1 B 9.10\\nPDC1 E 9.20 0\\nPRIVATE','PDC1 B 9.1\\nPDC1 E 9.20 0\\n','PDC1 B NaN\\nPDC1 E 9.20 0\\n']){try{parseMarkers(s);}catch{rejected++;}}
 r={good:parseMarkers('PDC1 B 12345.10\\nPDC1 E 12345.30 0\\n'),rejected};
}else if(${JSON.stringify(action)}==='existing'){
 const p=${JSON.stringify(join(dir, "prior.json"))};await writeFile(p,'PRIVATE_PRIOR');let rejected=false;
 try{await run(p,serial,2);}catch{rejected=true;}r={rejected,unchanged:await readFile(p,'utf8')==='PRIVATE_PRIOR'};
}else if(${JSON.stringify(action)}==='runner'){
 const p=${JSON.stringify(join(dir, `report-${mode}.json`))};r=await run(p,serial,2);
 r.savedMatches=JSON.stringify(r)===JSON.stringify(JSON.parse(await readFile(p,'utf8')));
}else if(['sample','progressfail'].includes(${JSON.stringify(action)})){
 let seen,failed=false;
 try{r=await measureProbe('bracketed',1,{serial,local:${JSON.stringify(dir)},width:1,height:1,timeout:3000},async s=>{seen=s;if(${JSON.stringify(action)}==='progressfail'&&s.activePhase==='cleanup')throw Error('PRIVATE_WRITE_FAILURE');});}
 catch{failed=true;r=seen;}
 if(${JSON.stringify(action)}==='progressfail')r.progressFailurePropagated=failed;
 r.localPngs=(await readdir(${JSON.stringify(dir)})).filter(p=>p.endsWith('.png')).length;
}else if(${JSON.stringify(action)}==='cancel'){
 const ac=new AbortController();setTimeout(()=>ac.abort(),100);r=await runProcess(['shell','true'],serial,{markers:true,timeout:3000,signal:ac.signal});
}else r=await runProcess(['shell','true'],serial,{markers:true,timeout:process.env.ENVELOPE_MODE==='hang'?100:3000});
console.log(JSON.stringify(r));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", script], {
    env: { ...process.env, ENVELOPE_MODE: mode, ENVELOPE_STATE: join(dir, "foreground"), ENVELOPE_STARTED: join(dir, "started"), TMPDIR: dir, PATH: `${dir}:${process.env.PATH}` }, timeout: 20000,
  });
  return JSON.parse(stdout);
}

it("accepts split markers and exports only elapsed device time and host envelopes", async () => {
  const r = await probe();
  expect(r).toMatchObject({ outcome: "ok", markerStatus: "valid", deviceMs: 200, clockQuantumMs: 10, commandExit: 0 });
  expect(r.beginReceivedMs).toBeGreaterThanOrEqual(r.spawnMs);
  expect(r.endReceivedMs).toBeGreaterThanOrEqual(r.beginReceivedMs);
  expect(r.closeMs).toBeGreaterThanOrEqual(r.endReceivedMs);
  expect(r.stderrBytes).toBeGreaterThan(0);
  expect(JSON.stringify(r)).not.toMatch(/PRIVATE|12345/);
});

it("rejects reversed clocks, unequal precision, nonfinite time and extra output", async () => {
  expect(await probe("parse")).toMatchObject({ good: { deviceMs: 200, clockQuantumMs: 10, commandExit: 0 }, rejected: 4 });
});

for (const mode of ["missing", "malformed", "noise", "overflow", "exit", "hang"]) {
  it(`retains ${mode} as an explicit incomplete failure without content`, async () => {
    const r = await probe("process", mode);
    expect(r.outcome).toBe("error");
    expect(r.failureKind).toBe(mode === "hang" ? "timeout" : mode === "overflow" ? "buffer" : mode === "exit" ? "exit" : "protocol");
    expect(JSON.stringify(r)).not.toMatch(/PRIVATE|12345/);
  });
}

it("distinguishes explicit caller cancellation from deadline", async () => {
  expect(await probe("cancel", "hang")).toMatchObject({ outcome: "error", failureKind: "cancelled" });
});

it("validates PNGs and separately records transfer, cleanup and validation", async () => {
  const r = await probe("sample");
  expect(r).toMatchObject({ outcome: "ok", traceComplete: true, dimensionsMatch: true, localPngs: 0,
    capture: { outcome: "ok", deviceMs: 200 }, transfer: { outcome: "ok" }, cleanup: { outcome: "ok" } });
  expect(r.validationMs).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(r)).not.toMatch(/PRIVATE|12345|\/sdcard|\.png/);
});

it("retains a transfer failure, attempts cleanup and never fabricates validation", async () => {
  const r = await probe("sample", "pull-fail");
  expect(r).toMatchObject({ outcome: "error", traceComplete: false, transfer: { outcome: "error", failureKind: "exit" }, cleanup: { outcome: "ok" }, localPngs: 0 });
  expect(r.validationMs).toBeUndefined();
});

it("retains invalid PNG validation and still removes owned local and remote files", async () => {
  const r = await probe("sample", "bad-png");
  expect(r).toMatchObject({ outcome: "error", traceComplete: false, validationFailure: true, localRemoved: true, localPngs: 0, cleanup: { outcome: "ok" } });
  expect(r.validationMs).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(r)).not.toMatch(/PRIVATE/);
});

it("still attempts owned cleanup when progress persistence throws", async () => {
  const r = await probe("progressfail");
  expect(r).toMatchObject({ progressFailurePropagated: true, cleanup: { outcome: "ok" }, localRemoved: true, localPngs: 0 });
});

it("does not conceal remote cleanup failures", async () => {
  const r = await probe("sample", "cleanup-fail");
  expect(r).toMatchObject({ outcome: "error", traceComplete: false, capture: { outcome: "ok" }, cleanup: { outcome: "error", failureKind: "exit" } });
});

it("runs the real diagnostic CLI path with bounded rounds, progress and restoration", async () => {
  const r = await probe("runner", "runner");
  expect(r).toMatchObject({ status: "pass", clockSupported: true, sourceUnchanged: true, imeRestored: true, termuxRestored: true, localRemoved: true, savedMatches: true });
  expect(r.samples).toHaveLength(6);
  expect(r.samples.map((s: { variant: string }) => s.variant)).toEqual(["plain", "bracketed", "control", "control", "bracketed", "plain"]);
  expect(r.samples.every((s: { traceComplete: boolean; activePhase: string }) => s.traceComplete && s.activePhase === "settled")).toBe(true);
  expect(JSON.stringify(r)).not.toMatch(/PRIVATE|12345|private\.ime/);
}, 20000);

it("preserves capture failures and rejects unsupported clocks without claiming completeness", async () => {
  const failure = await probe("runner", "runner-fail");
  expect(failure).toMatchObject({ status: "fail", savedMatches: true, imeRestored: true, termuxRestored: true });
  expect(failure.samples.filter((s: { traceComplete: boolean }) => !s.traceComplete)).toHaveLength(4);
  const unsupported = await probe("runner", "runner-capability");
  expect(unsupported).toMatchObject({ status: "fail", failureCheckpoint: "capability", clockSupported: false, samples: [], imeRestored: true, termuxRestored: true });
}, 20000);

it("retains interrupted active work and restores through a real SIGTERM", async () => {
  const output = join(dir, "interrupted.json");
  const child = spawn(process.execPath, ["--import", "tsx", "scripts/capture-envelope-diagnostic.mjs", output], {
    stdio: ["ignore", "ignore", "ignore"],
    env: { ...process.env, ENVELOPE_MODE: "runner-interrupt", ENVELOPE_STATE: join(dir, "foreground"), ENVELOPE_STARTED: join(dir, "started"), TMPDIR: dir,
      PI_DROID_CAPTURE_ENVELOPE: "1", ANDROID_SERIAL: "PRIVATE_SERIAL", PI_DROID_DIAG_ROUNDS: "2", PATH: `${dir}:${process.env.PATH}` },
  });
  const closed = new Promise<number | null>(resolve => child.on("close", code => resolve(code)));
  try {
    const end = Date.now() + 12000;
    while (true) {
      try { await readFile(join(dir, "started")); break; } catch { if (Date.now() > end) throw Error("Synthetic start deadline"); }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    const partial = JSON.parse(await readFile(output, "utf8"));
    expect(partial.samples[0]).toMatchObject({ outcome: "error", traceComplete: false, activePhase: "capture" });
    child.kill("SIGTERM");
    expect(await closed).toBe(1);
    const r = JSON.parse(await readFile(output, "utf8"));
    expect(r).toMatchObject({ status: "fail", interrupted: true, imeRestored: true, termuxRestored: true });
    expect(r.samples[0]).toMatchObject({ outcome: "error", traceComplete: false, capture: { failureKind: "cancelled" }, cleanup: { outcome: "ok" } });
    expect(JSON.stringify(r)).not.toMatch(/PRIVATE|12345|private\.ime/);
  } finally { child.kill("SIGKILL"); await closed; }
}, 20000);

it("reserves new evidence before any device use", async () => {
  expect(await probe("existing")).toEqual({ rejected: true, unchanged: true });
  expect(await readFile(join(dir, "prior.json"), "utf8")).toBe("PRIVATE_PRIOR");
});
