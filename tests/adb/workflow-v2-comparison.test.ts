import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'workflow-v2-compare-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
async function compare(change?: (before: any, after: any) => void) {
  const before = JSON.parse(await readFile('docs/performance/reports/workflow-v2-before-2026-10-17-attempt3.json', 'utf8'));
  const after = JSON.parse(await readFile('docs/performance/reports/workflow-v2-after-2026-10-17.json', 'utf8'));
  change?.(before, after);
  const a=join(dir,'before.json'), b=join(dir,'after.json'), output=join(dir,'comparison.md');
  await writeFile(a,JSON.stringify(before)); await writeFile(b,JSON.stringify(after));
  let code=0;
  try { await exec(process.execPath,['scripts/compare-workflow-v2.mjs',a,b,output],{cwd:resolve('.'),timeout:10000}); }
  catch(error) { code=Number((error as {code:number}).code); }
  let md=''; try { md=await readFile(output,'utf8'); } catch {}
  return {code,md,a,b,output};
}
const invalidPairs: Array<[string, (before: any, after: any) => void]> = [
  ['failed workflow', (_b,a) => { a.status='fail'; }],
  ['different driver', (_b,a) => { a.harnessHash='e'.repeat(64); }],
  ['different engine', (_b,a) => { a.engineHash='e'.repeat(64); }],
  ['unchanged consumer', (b,a) => { a.consumerHash=b.consumerHash; }],
  ['different offers', (_b,a) => { a.publicOffers[0].total=99; }],
  ['failed readback', (_b,a) => { a.checks.find((c:any) => c.name==='exercise_1_readback').ok=false; }],
  ['wrong persisted count', (_b,a) => { a.checks.find((c:any) => c.name==='exercise_1_persisted_field_count').count=5; }],
  ['removed safety operation', (_b,a) => { a.operations.splice(a.operations.findIndex((o:any) => o.stage==='type'),1); }],
  ['inconsistent capture counter', (_b,a) => { a.captureCounts.completedDeviceDumps--; }],
  ['truncated spans', (_b,a) => { a.captureSpansTruncated=true; }],
  ['malformed alignment cycle', (_b,a) => { const n=a.operations.findIndex((o:any)=>o.stage==='field_scroll'); a.operations[n+1].stage='shell'; }],
  ['non-finite elapsed', (_b,a) => { a.durationMs=null; }],
];
it.each(invalidPairs)('refuses a passing comparison for %s', async (_name,change) => {
  const {code}=await compare(change);
  expect(code).not.toBe(0);
});

it('does not echo unexpected private payloads from otherwise valid reports', async () => {
  const {code,md}=await compare((b,a)=>{ b.privateError='PRIVATE_DEVICE_AND_PAGE'; a.privateError='PRIVATE_DEVICE_AND_PAGE'; });
  expect(code).toBe(0);
  expect(md).not.toContain('PRIVATE_DEVICE_AND_PAGE');
});

it('never overwrites an existing comparison file', async () => {
  const result=await compare();
  expect(result.code).toBe(0);
  await expect(exec(process.execPath,['scripts/compare-workflow-v2.mjs',result.a,result.b,result.output],{cwd:resolve('.')})).rejects.toThrow();
  expect(await readFile(result.output,'utf8')).toBe(result.md);
});

it('compares the real successful pair and discloses alignment variation separately', async () => {
  const {code,md}=await compare();
  expect(code).toBe(0);
  expect(md).toContain('370745.62'); expect(md).toContain('289733.50');
  expect(md).toContain('21.85%');
  expect(md).toContain('30 targeted');
  expect(md).toContain('alignment');
});
