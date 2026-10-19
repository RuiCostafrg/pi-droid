#!/usr/bin/env node
// Frozen before fusion production edits. Public APIs, fixed non-sensitive fixture.
import { access, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { takeScreenshot, screenshotBase64 } from '../src/adb/screenshot.ts';
import { diagnosticClock, pngMetadata, ordered } from './screenshot-latency-diagnostic.mjs';
import { adbShell, getForegroundPackage } from '../src/adb/exec.ts';
import { dumpUiTree } from '../src/adb/ui-tree.ts';
import { unlink } from 'node:fs/promises';
if (process.env.PI_DROID_FUSION_CHECK !== '1' || !process.env.ANDROID_SERIAL || !process.argv[2]) throw Error('Opt-in required');
try { await access(process.argv[2]); throw Error('Existing output'); } catch(e) { if(e.code!=='ENOENT') throw e; }
const sha = b => createHash('sha256').update(b).digest('hex');
const files = ['src/adb/screenshot.ts','src/adb/exec.ts','src/adb/capture-timing.ts','src/adb/ocr.ts','src/adb/annotate.ts','scripts/screenshot-latency-diagnostic.mjs'];
async function manifest() {
 const entries=await Promise.all(files.map(async p=>[p,sha(await readFile(new URL('../'+p,import.meta.url)))]));
 return Object.fromEntries(entries);
}
const report = {kind:'fusion-focused-v1',status:'fail',rounds:8,driverHash:sha(await readFile(new URL(import.meta.url))),sourceBefore:await manifest(),samples:[],
 limits:['Per-call clocks; nested spans/medians not additive. Static images do not prove frame ownership.',
 'Public wall time excludes harness validation; diagnostics enabled. Cleanup outcome events are fixed categories, not device elapsed-time spans.',
 'Before implementation ignores the optional cleanup sink, recording no events. Three-party clocks not merged.']};
await writeFile(process.argv[2],JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
const options={serial:process.env.ANDROID_SERIAL,exactSerial:true,autoReconnect:false,timeout:15000};
let originalIme;
async function sample(api,mode,round) {
 const s={api,mode,round,outcome:'error',spans:[],cleanupEvents:[],spansTruncated:false,traceComplete:false};report.samples.push(s);
 const start=performance.now();let path;
 try {
  const traced={...options,captureClock:diagnosticClock(s),onScreenshotCleanup:event=>{if(s.cleanupEvents.length<4)s.cleanupEvents.push(event);else s.spansTruncated=true;}};
  let data;
  if(api==='saved') {const r=await takeScreenshot({...traced,includeBase64:true});s.publicMs=performance.now()-start;path=r.path;data=Buffer.from(r.base64,'base64');
   s.fileMatchesBase64=(await readFile(path)).equals(data);if(!s.fileMatchesBase64||r.width!==1080||r.height!==2340)throw Error('saved');
  }else{data=Buffer.from(await screenshotBase64(traced),'base64');s.publicMs=performance.now()-start;}
  Object.assign(s,pngMetadata(data));if(s.width!==1080||s.height!==2340)throw Error('png');
  s.outcome='ok';s.traceComplete=!s.spansTruncated;
 }catch{s.publicMs??=performance.now()-start;}
 finally{if(path)await unlink(path).catch(()=>{});s.totalMs=performance.now()-start;}
}
try {
 originalIme=await adbShell('settings get secure default_input_method',options);
 if(await getForegroundPackage(options)!=='com.termux')throw Error('start');
 await adbShell('am start -W -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.termux',options);
 const tree=await dumpUiTree({...options,skipCache:true,ocrFallback:false,throwOnError:true});
 if(tree.foregroundPackage!=='com.android.settings'||!['Termux','OPEN'].every(t=>tree.elements.some(e=>e.text===t)))throw Error('fixture');
 for(let round=1;round<=8;round++) {
  for(const api of ordered(['saved','base64'],round))await sample(api,'sequential',round);
  await Promise.all(ordered(['saved','base64'],round).map(api=>sample(api,'concurrent',round)));
  await writeFile(process.argv[2],JSON.stringify(report,null,2),{mode:0o600});
 }
 report.status=report.samples.every(s=>s.outcome==='ok'&&s.traceComplete&&s.spans.every(p=>p.outcome==='ok'))?'pass':'fail';
}catch{report.status='fail';}
finally {
 try {
  if(originalIme){if(await adbShell('settings get secure default_input_method',options)!==originalIme)await adbShell(`ime set ${originalIme}`,options);
   report.imeRestored=await adbShell('settings get secure default_input_method',options)===originalIme;}
  await adbShell('am start -W -n com.termux/.app.TermuxActivity',options);report.termuxRestored=await getForegroundPackage(options)==='com.termux';
 }catch{report.restoreFailed=true;}
 report.sourceAfter=await manifest();report.sourceUnchanged=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
 if(!report.imeRestored||!report.termuxRestored||!report.sourceUnchanged)report.status='fail';
 await writeFile(process.argv[2],JSON.stringify(report,null,2),{mode:0o600});
}
console.log(JSON.stringify({status:report.status,samples:report.samples.length,imeRestored:report.imeRestored,termuxRestored:report.termuxRestored,sourceUnchanged:report.sourceUnchanged}));
process.exitCode=report.status==='pass'?0:1;
