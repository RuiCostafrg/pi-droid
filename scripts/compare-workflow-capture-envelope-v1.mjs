#!/usr/bin/env node
// Capture-envelope diagnostic validation only: fresh unchanged-source workflow pair.
// Not a v2/v3 speed comparison and never rewrites evidence.
import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [beforePath, afterPath, output, markdown] = process.argv.slice(2);
assert(markdown, 'Usage: compare-workflow-capture-envelope-v1.mjs before.json after.json NEW.json NEW.md');
for (const p of [output, markdown]) {
  try { await access(p); throw Error('Existing output'); } catch(e) { if(e.code !== 'ENOENT') throw e; }
}
assert.notEqual(output, markdown);
const [before, after] = await Promise.all([beforePath, afterPath].map(async p => JSON.parse(await readFile(p, 'utf8'))));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const finite = n => Number.isFinite(n) && n >= 0;
const hash = h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h);
const files = ['exec.ts','capture-timing.ts','ui-tree.ts','cache.ts','input.ts','read-select-tap.ts','app.ts','ocr.ts','screenshot.ts','annotate.ts'];
async function provenance(reference) {
  const h = createHash('sha256'), sourceHashes = {};
  for (const file of files) {
    const path = `src/adb/${file}`;
    const bytes = reference ? execFileSync('git',['show',`21b30855ae70a262ea22fc9559d741484798c1ce:${path}`]) : await readFile(path);
    h.update(file).update(bytes); sourceHashes[file] = sha(bytes);
  }
  return { engineHash: h.digest('hex'), sourceHashes };
}
const expected = [await provenance(true), await provenance(false)];
const driverHash = sha(await readFile('scripts/workflow-v3.2.mjs'));
const consumerHash = sha(await readFile('scripts/workflow-field-action.mjs'));
const stages = new Set(['shell','screen_size','ui_dump','tap','settle','type','key','app','swipe','field_scroll','product_scroll','select_tap','ocr','restore_ime','restore_termux']);
const high = ['device_dump','xml_transfer','xml_read','xml_parse','foreground'];
const spanStages = new Set([...high,'adb_attempt']);
const count = (r, stage) => r.operations.filter(o=>o.stage===stage).length;
const checks = ['fixture_screen_1080x2340','amazon_search_field','amazon_search_focused','amazon_query_readback','three_fixed_comparable_offers','chosen_product_visible','amazon_product_open','forge_popup_parent_activity','forge_six_template_options','new_lower_draft','draft_card_visible','draft_title_reopened','original_ime_restored','termux_restored'];
for(let n=1;n<=5;n++) checks.push(`exercise_${n}_six_fields`,`exercise_${n}_readback`,`exercise_${n}_persisted`);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function validate(r) {
  assert(r.kind==='source-workflow-e2e-v3' && r.schemaVersion===3 && r.protocolRevision==='3.2' && finite(r.durationMs));
  assert(['pass','fail'].includes(r.status));
  assert(Array.isArray(r.operations) && Array.isArray(r.checks) && Array.isArray(r.captureSpans));
  for(const o of r.operations) assert(stages.has(o.stage) && finite(o.startMs) && finite(o.durationMs) && o.startMs+o.durationMs<=r.durationMs && ['ok','error'].includes(o.outcome));
  for(const s of r.captureSpans) {
    assert(spanStages.has(s.stage) && finite(s.startMs) && finite(s.durationMs) && ['ok','error'].includes(s.outcome));
    assert(Object.keys(s).every(k=>['stage','startMs','durationMs','outcome','failureKind'].includes(k)));
  }
}
validate(before); validate(after);
function correct(r) {
  return r.checks.length===34 && new Set(r.checks.map(c=>c.name)).size===34 &&
    checks.every(name=>r.checks.some(c=>c.name===name && c.ok===true)) &&
    [1,2,3,4,5].every(n=>r.checks.some(c=>c.name===`exercise_${n}_persisted_field_count` && c.count===6));
}
function values(r) {
  return Array.isArray(r.numericWrites) && r.numericWrites.length===30 &&
    r.numericWrites.every((w,i)=>w.exercise===1+Math.floor(i/6) && w.field===i%6 && ['20','8'].includes(w.value)) &&
    Array.isArray(r.persistedValues) && r.persistedValues.length===5 &&
    r.persistedValues.every((g,i)=>g.exercise===i+1 && Array.isArray(g.values) && g.values.length===6 &&
      g.values.every((v,j)=>v===r.numericWrites[i*6+j].value) && g.values.filter(v=>v==='20').length===3 && g.values.filter(v=>v==='8').length===3);
}
function accounting(r) {
  const n = count(r,'ui_dump')+count(r,'select_tap');
  if (r.captureSpansTruncated!==false || r.captureSpans.some(s=>s.outcome!=='ok') ||
      r.captureCounts?.completedDeviceDumps!==n || r.captureCounts?.captureStageErrors!==0 || r.captureCounts?.explicitOcrCalls!==count(r,'ocr') ||
      !Array.isArray(r.captureContexts) || r.captureContexts.length!==n) return false;
  for(const [i,c] of r.captureContexts.entries()) {
    if(c.id!==i || !['ui_dump','select_tap'].includes(c.kind) || c.traceComplete!==true || c.spansTruncated!==false || !finite(c.durationMs) ||
      !Array.isArray(c.spans) || c.spans.length>128 || c.spans.some(s=>!finite(s.startMs) || !finite(s.durationMs) || s.startMs+s.durationMs>c.durationMs)) return false;
    for(const stage of high) if(c.spans.filter(s=>s.stage===stage).length!==1) return false;
    if(c.spans.filter(s=>s.stage==='adb_attempt').length!==(c.kind==='select_tap'?5:3)) return false;
  }
  return same(r.captureContexts.flatMap(c=>c.spans),r.captureSpans) &&
    r.captureContexts.filter(c=>c.kind==='select_tap').length===count(r,'select_tap') &&
    r.captureSpans.filter(s=>s.stage==='adb_attempt').length===n*3+2*count(r,'select_tap');
}
function normalize(r) {
  const sequence=[], alignment={product_scroll:{cycles:0,ms:0},field_scroll:{cycles:0,ms:0}};
  for(let i=0;i<r.operations.length;i++) {
    const stage=r.operations[i].stage;
    if(stage in alignment) {
      assert(r.operations[i+1]?.stage==='settle' && r.operations[i+2]?.stage==='ui_dump','Malformed alignment cycle');
      alignment[stage].cycles++;
      alignment[stage].ms+=r.operations.slice(i,i+3).reduce((n,o)=>n+o.durationMs,0); i+=2;
    } else sequence.push(stage);
  }
  return {sequence,alignment};
}
function shopping(r) {
  if(!Array.isArray(r.publicOffers) || r.publicOffers.length!==3 || !r.publicOffers.every(p=>finite(p.total)&&p.total>0&&finite(p.perLitre)&&p.perLitre>0) ||
    !hash(r.chosenProduct?.identityHash) || !same(r.protocol,{maxProductScrolls:8,visibleMinY:200,visibleMaxY:1900,productStepPx:350,gestureMs:600})) return false;
  const cheapest=r.publicOffers.reduce((a,p,i)=>p.perLitre<r.publicOffers[a].perLitre?i:a,0);
  const n=count(r,'product_scroll'), rows=r.productAlignment;
  if(r.chosenProduct.offerIndex!==cheapest || n>8 || !Array.isArray(rows) || rows.length!==n+2) return false;
  return rows.every((x,i)=>x.phase===(i===rows.length-1?'confirm':'observe') && x.attempt===(i===rows.length-1?n:i) &&
    Number.isInteger(x.distinctTargets) && x.distinctTargets>=0 && x.distinctTargets<=1 &&
    (x.centerY===null || finite(x.centerY)) && typeof x.visible==='boolean' &&
    (!x.visible || (x.distinctTargets===1 && x.centerY>200 && x.centerY<1900))) && rows.at(-1).visible && rows.at(-2).visible;
}
const norms=[normalize(before),normalize(after)];
const gates={
  bothPassed:before.status==='pass'&&after.status==='pass',
  correctPhases:before.phase==='before'&&after.phase==='after',
  sameFrozenDriver:[before,after].every(r=>r.harnessHash===driverHash),
  sameBoundedConsumer:[before,after].every(r=>r.consumerHash===consumerHash&&r.selectionStrategy==='bounded-read-select-tap'),
  independentlyVerifiedSource:[before,after].every((r,i)=>r.engineHash===expected[i].engineHash&&same(r.sourceHashes,expected[i].sourceHashes)),
  unchangedProductionSource:files.every(f=>expected[0].sourceHashes[f]===expected[1].sourceHashes[f]),
  allRequiredChecks:[before,after].every(correct), identicalChecks:same(before.checks,after.checks),
  thirtyWritesAndPersistedValues:[before,after].every(values),
  sameOffersAndChosenProduct:shopping(before)&&shopping(after)&&same(before.publicOffers,after.publicOffers)&&same(before.chosenProduct,after.chosenProduct),
  completeScopedAccounting:[before,after].every(accounting),
  allOperationsOk:[before,after].every(r=>r.operations.every(o=>o.outcome==='ok')),
  all30SelectionsAnd32Types:[before,after].every(r=>count(r,'select_tap')===30&&count(r,'type')===32),
  oneOcrEach:[before,after].every(r=>count(r,'ocr')===1),
  retainedOtherWork:same(norms[0].sequence,norms[1].sequence),
};
const passed=Object.values(gates).every(Boolean);
function summary(r,i) {
  const groups={};
  for(const o of r.operations) (groups[o.stage]??=[]).push(o.durationMs);
  return {status:r.status,elapsedMs:r.durationMs,operations:r.operations.length,
    captures:r.captureCounts.completedDeviceDumps,scopedCommandAttempts:r.captureSpans.filter(s=>s.stage==='adb_attempt').length,
    alignment:norms[i].alignment,
    stageMetrics:Object.fromEntries(Object.entries(groups).map(([stage,values])=>{
      values.sort((a,b)=>a-b); const n=values.length;
      return [stage,{count:n,totalMs:values.reduce((a,b)=>a+b,0),medianMs:n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2,p95Ms:values[Math.ceil(n*.95)-1],maxMs:values[n-1]}];
    }))};
}
const result={kind:'capture-envelope-workflow-v1-comparison',passed,gates,fullWorkflowAcceptance:passed?'pass':'open',
  referenceChronology:'Fresh chronological current-source baseline before new diagnostic implementation; production source unchanged.',
  before:summary(before,0),after:summary(after,1),
  workflowDelta:passed?{ms:after.durationMs-before.durationMs,pct:100*(after.durationMs/before.durationMs-1)}:null,
  limits:['Same-v3.2 unchanged-source workflow only; no optimization or isolated instrumentation-overhead claim.',
    'One pair is descriptive, not causal/population/non-inferiority evidence.',
    'Alignment cycles are reported, never subtracted from elapsed time; only complete cycles normalized for retained-work gate.',
    'Per-capture source clocks, operation clocks and loaded-tool clocks are separate. Nested spans are not additive wall time.',
    'Scoped commands not whole-workflow counts. Source workflow does not exercise annotation; focused/loaded checks required separately.']};
let md='# Capture-envelope diagnostic workflow comparison\n\n'+`Acceptance: **${result.fullWorkflowAcceptance}**.\n\n${result.referenceChronology}\n\n| Gate | Pass |\n| --- | --- |\n`;
for(const [k,v] of Object.entries(gates)) md+=`| ${k} | ${v} |\n`;
md+='\n| Metric | Reference | Current |\n| --- | ---: | ---: |\n';
for(const key of ['elapsedMs','operations','captures','scopedCommandAttempts']) md+=`| ${key} | ${result.before[key]} | ${result.after[key]} |\n`;
for(const stage of ['product_scroll','field_scroll']) md+=`| ${stage} cycles / total ms | ${result.before.alignment[stage].cycles} / ${result.before.alignment[stage].ms.toFixed(2)} | ${result.after.alignment[stage].cycles} / ${result.after.alignment[stage].ms.toFixed(2)} |\n`;
md+=`\nCurrent minus reference: ${passed?`${result.workflowDelta.ms.toFixed(2)}ms (${result.workflowDelta.pct.toFixed(2)}%)`:'no valid passing-pair delta'}.\n\n## Limits\n\n`+result.limits.map(s=>'- '+s).join('\n')+'\n';
await writeFile(output,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});
await writeFile(markdown,md,{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed,gates,workflowDelta:result.workflowDelta}));
process.exitCode=passed?0:1;
