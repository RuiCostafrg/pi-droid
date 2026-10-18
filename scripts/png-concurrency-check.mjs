#!/usr/bin/env node
// Frozen before production edits. Static fixture only: no concurrent UI dumps/navigation.
import { access, readFile, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { takeScreenshot, screenshotBase64 } from '../src/adb/screenshot.ts';
import { dumpUiTree } from '../src/adb/ui-tree.ts';
import { adbShell, getForegroundPackage } from '../src/adb/exec.ts';
if(process.env.PI_DROID_PNG_CHECK!=='1'||!process.env.ANDROID_SERIAL||!process.argv[2]) throw Error('Explicit opt-in required');
try { await access(process.argv[2]); throw Error('Existing output'); } catch(e) { if(e.code!=='ENOENT') throw e; }
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=['screenshot.ts','exec.ts','capture-timing.ts','ocr.ts','annotate.ts'];
const report={kind:'png-concurrency-fixture-v1',status:'fail',driverHash:sha(await readFile(new URL(import.meta.url))),
 sourceHashes:Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await readFile(new URL('../src/adb/'+f,import.meta.url)))]))),samples:[],
 limits:['Static Settings fixture; concurrent image success cannot prove per-call frame ownership. Controlled interleaving tests provide that evidence.',
 'Per-call clocks are independent. Nested spans are not additive wall time. Failed samples remain partial. Three rounds/mode are descriptive only.']};
const options={serial:process.env.ANDROID_SERIAL,exactSerial:true,autoReconnect:false,timeout:15000};
const originalIme=await adbShell('settings get secure default_input_method',options);
async function sample(api,round,mode) {
 const s={api,round,mode,outcome:'error',spans:[],spansTruncated:false,traceComplete:false}; report.samples.push(s);
 const start=performance.now(); let path;
 try {
  const traced={...options,onCaptureSpan:span=>{if(s.spans.length<128)s.spans.push(span);else s.spansTruncated=true;}};
  let data;
  if(api==='screenshot') {
   const r=await takeScreenshot({...traced,includeBase64:true});path=r.path;data=r.base64;
   if(r.width!==1080||r.height!==2340)throw Error('dimensions');
   s.fileMatchesBase64=(await readFile(path)).equals(Buffer.from(data,'base64'));
   if(!s.fileMatchesBase64)throw Error('file');
  } else data=await screenshotBase64(traced);
  const png=Buffer.from(data,'base64');
  s.validPng=png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  s.width=png.readUInt32BE(16);s.height=png.readUInt32BE(20);
  if(!s.validPng||s.width!==1080||s.height!==2340)throw Error('png');
  s.outcome='ok';s.traceComplete=!s.spansTruncated;
 } finally {s.ms=performance.now()-start;if(path)await unlink(path).catch(()=>{});}
}
try {
 const tree=await dumpUiTree({...options,skipCache:true,ocrFallback:false,throwOnError:true});
 if(tree.foregroundPackage!=='com.android.settings'||!['Termux','OPEN'].every(t=>tree.elements.some(e=>e.text===t)))throw Error('fixture');
 for(let round=1;round<=3;round++) {
  await sample('screenshot',round,'sequential');await sample('base64',round,'sequential');
  const results=await Promise.allSettled([sample('screenshot',round,'concurrent'),sample('base64',round,'concurrent')]);
  if(results.some(r=>r.status==='rejected'))throw Error('concurrent');
 }
 report.status='pass';
} catch {report.status='fail';}
finally {
 report.imeUnchanged=await adbShell('settings get secure default_input_method',options)===originalIme;
 await adbShell('am start -W -n com.termux/.app.TermuxActivity',options);
 report.termuxRestored=await getForegroundPackage(options)==='com.termux';
 if(!report.imeUnchanged||!report.termuxRestored)report.status='fail';
 await writeFile(process.argv[2],JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
}
console.log(JSON.stringify({status:report.status,samples:report.samples.map(({spans,...s})=>({...s,spanCount:spans.length}))}));
process.exitCode=report.status==='pass'?0:1;
