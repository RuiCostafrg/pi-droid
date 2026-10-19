import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "capture-envelope-audit-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

it("audits synthetic device/host clocks separately and rejects adversarial evidence", async () => {
  const script = join(dir, "audit.mjs");
  await writeFile(script, `
import {audit,stats,summarize} from ${JSON.stringify(resolve("scripts/audit-capture-envelope.mjs"))};
import {manifest,diagnosticLimits} from ${JSON.stringify(resolve("scripts/capture-envelope-diagnostic.mjs"))};
import {writeFile,readFile} from 'node:fs/promises';
const p={outcome:'ok',stdoutBytes:0,stderrBytes:0,spawnMs:0.1,closeMs:1};
const marked={...p,stdoutBytes:40,firstStdoutMs:0.2,beginReceivedMs:0.3,endReceivedMs:0.5,markerStatus:'valid',commandExit:0,deviceMs:200,clockQuantumMs:10};
const source=await manifest();const good={kind:'capture-envelope-diagnostic-v1',status:'pass',rounds:2,sourceBefore:source,sourceAfter:source,sourceUnchanged:true,
 limits:diagnosticLimits,fixture:{nativeLabelsMatch:true,width:1,height:1},clockSupported:true,capability:marked,imeRestored:true,termuxRestored:true,localRemoved:true,
 samples:['plain','bracketed','control','control','bracketed','plain'].map((variant,i)=>({variant,round:1+Math.floor(i/3),outcome:'ok',traceComplete:true,activePhase:'settled',localRemoved:true,totalMs:5,
 capture:variant==='plain'?p:marked,...(variant==='control'?{}:{transfer:p,cleanup:p,validationMs:0.1,bytes:68,width:1,height:1,dimensionsMatch:true})}))};
const mutations=[
 r=>r.status='fail',r=>r.interrupted=true,r=>r.samples.pop(),r=>r.samples[0].variant='control',r=>r.samples[0].round=2,
 r=>r.samples[0].traceComplete=false,r=>r.samples[0].activePhase='capture',r=>r.samples[0].capture.closeMs=Infinity,
 r=>r.samples[1].capture.deviceMs=-1,r=>r.samples[1].capture.deviceMs=201,r=>r.samples[1].capture.clockQuantumMs=100,
 r=>r.samples[1].capture.endReceivedMs=0,r=>r.samples[1].capture.markerStatus='invalid',r=>r.samples[1].capture.commandExit=7,
 r=>r.samples[0].capture.failureKind='timeout',r=>r.samples[0].width=2,r=>r.samples[0].dimensionsMatch=false,
 r=>r.samples[0].totalMs=1,r=>r.samples[0].cleanup.outcome='error',r=>r.samples[2].transfer=p,
 r=>r.samples[0].capture.raw='PRIVATE',r=>r.fixture.serial='PRIVATE',r=>r.sourceAfter['src/adb/exec.ts']='0'.repeat(64),
 r=>r.limits=['PRIVATE'],r=>r.imeRestored=false,r=>r.capability.deviceMs=0];
let rejected=0;for(const mutate of mutations){const r=structuredClone(good);mutate(r);try{await audit(r);}catch{rejected++;}}
const result=await audit(good);const a=${JSON.stringify(join(dir, "a.json"))},b=${JSON.stringify(join(dir, "b.json"))},o=${JSON.stringify(join(dir, "out.json"))},md=${JSON.stringify(join(dir, "out.md"))};
await writeFile(a,JSON.stringify(good));await writeFile(b,JSON.stringify(good));await summarize(a,b,o,md);
const prior=await readFile(o,'utf8');let exclusive=false;try{await summarize(a,b,o,md);}catch{exclusive=true;}
console.log(JSON.stringify({result,rejected,total:mutations.length,exclusive,unchanged:prior===await readFile(o,'utf8'),even:stats([4,1,2,3])}));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", script], { timeout: 10000 });
  const r = JSON.parse(stdout);
  expect(r).toMatchObject({ rejected: 26, total: 26, exclusive: true, unchanged: true, even: { medianMs: 2.5 } });
  expect(r.result.groups.bracketed.captureDeviceMs.medianMs).toBe(200);
  expect(r.result.groups.bracketed.captureHostMs.medianMs).toBe(1); // Never merge or subtract clocks.
});

async function comparisonFixture() {
  // Comparator is checkpoint-specific. Isolate pinned source/driver fixture so a
  // future production change cannot silently change the positive fixture's scope.
  const files = ["exec.ts", "capture-timing.ts", "ui-tree.ts", "cache.ts", "input.ts", "read-select-tap.ts", "app.ts", "ocr.ts", "screenshot.ts", "annotate.ts"].map(f => `src/adb/${f}`);
  files.push("scripts/workflow-v3.2.mjs", "scripts/workflow-field-action.mjs");
  for (const f of files) {
    await mkdir(dirname(join(dir, f)), { recursive: true });
    const { stdout } = await exec("git", ["show", `21b3085:${f}`], { maxBuffer: 1024 * 1024 });
    await writeFile(join(dir, f), stdout);
  }
  const before = JSON.parse(await readFile("docs/performance/reports/workflow-v3.2-capture-envelope-before-attempt3-2026-10-19.json", "utf8"));
  return { before, after: { ...structuredClone(before), phase: "after" } };
}

it("keeps unchanged-source full-workflow gates strict under adversarial reports", async () => {
  const fixture = await comparisonFixture();
  const script = resolve("scripts/compare-workflow-capture-envelope-v1.mjs");
  const mutations: Array<(r: typeof fixture.after) => void> = [
    r => { r.status = "fail"; }, r => { r.phase = "before"; }, r => { r.harnessHash = "0".repeat(64); },
    r => { r.numericWrites[0].value = "99"; }, r => { r.persistedValues[0].values[0] = "99"; },
    r => { r.captureContexts[0].traceComplete = false; }, r => { r.captureSpansTruncated = true; },
    r => { r.sourceHashes["exec.ts"] = "0".repeat(64); }, r => { r.operations.splice(r.operations.findIndex((o: { stage: string }) => o.stage === "type"), 1); },
    r => { r.publicOffers[0].perLitre += 1; }, r => { r.checks[0].ok = false; },
  ];
  for (let i = -1; i < mutations.length; i++) {
    const current = structuredClone(fixture.after);
    if (i >= 0) mutations[i](current);
    const b = join(dir, `b${i}.json`), a = join(dir, `a${i}.json`), o = join(dir, `o${i}.json`), md = join(dir, `o${i}.md`);
    await writeFile(b, JSON.stringify(fixture.before)); await writeFile(a, JSON.stringify(current));
    let code: unknown = 0;
    try { await exec(process.execPath, [script, b, a, o, md], { cwd: dir, env: { ...process.env, GIT_DIR: resolve(".git") }, timeout: 10000 }); }
    catch (e) { code = (e as { code: unknown }).code; }
    expect(code, `mutation ${i}`).toBe(i < 0 ? 0 : 1);
    const r = JSON.parse(await readFile(o, "utf8"));
    expect(r.passed).toBe(i < 0);
    expect(r.fullWorkflowAcceptance).toBe(i < 0 ? "pass" : "open");
    if (i >= 0) expect(r.workflowDelta).toBeNull();
  }
}, 20000);
