#!/usr/bin/env node
// Reversible diagnostic only: compare transfer+cleanup with capture outside the measured slice.
import { readFile, writeFile, mkdtemp, unlink, rm, open } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { adb, adbShell, adbToFile, getForegroundPackage } from '../src/adb/exec.ts';
import { dumpUiTree } from '../src/adb/ui-tree.ts';
import { ordered, pngMetadata } from './screenshot-latency-diagnostic.mjs';
if(process.env.PI_DROID_FUSION_CHECK!=='1'||!process.env.ANDROID_SERIAL||!process.argv[2])throw Error('Opt-in required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={kind:'fusion-transport-probe-v1',status:'fail',driverHash:hash(await readFile(new URL(import.meta.url))),
 sourceHashes:Object.fromEntries(await Promise.all(['exec.ts','screenshot.ts'].map(async f=>[f,hash(await readFile(new URL('../src/adb/'+f,import.meta.url)))]))),samples:[],
 limits:['Capture is retained separately but excluded from transfer+cleanup interval. No production change.',
 'Eight reversed-order rounds, descriptive only; transfer wall includes footer verification/truncation when applicable, excludes PNG validation.',
 'exec-out merges stderr into stdout and loses remote exit status; footer must carry statuses. Not a production acceptance check.']};
await writeFile(process.argv[2],JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
const options={serial:process.env.ANDROID_SERIAL,exactSerial:true,autoReconnect:false,timeout:15000};
let ime,local;
try{
 ime=await adbShell('settings get secure default_input_method',options);
 if(await getForegroundPackage(options)!=='com.termux')throw Error('start');
 local=await mkdtemp(join(tmpdir(),'fusion-probe-'));
 await adbShell('am start -W -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.termux',options);
 const tree=await dumpUiTree({...options,skipCache:true,ocrFallback:false,throwOnError:true});
 if(tree.foregroundPackage!=='com.android.settings'||!['Termux','OPEN'].every(t=>tree.elements.some(e=>e.text===t)))throw Error('fixture');
 for(let round=1;round<=8;round++)for(const variant of ordered(['pull-rm','shell-fused','exec-out-fused'],round)){
  const id=randomUUID(),remote=`/sdcard/pi-droid-screen-${id}.png`,path=join(local,id+'.png');
  const sample={variant,round,outcome:'error'};report.samples.push(sample);
  try{
   const before=performance.now();await adbShell(`screencap -p ${remote}`,options);sample.captureMs=performance.now()-before;
   const start=performance.now();
   if(variant==='pull-rm'){await adb(['pull',remote,path],options);await adbShell(`rm -f ${remote}`,options);}
   else{
    const token=`pi-droid-transfer-${randomUUID()}`;
    const command=`cat ${remote}; transfer=$?; rm -f ${remote} >/dev/null 2>&1; cleanup=$?; printf '\\n${token}:%s:%s\\n' "$transfer" "$cleanup"; exit "$transfer"`;
    await adbToFile(variant==='shell-fused'?['shell','-T',command]:['exec-out',command],path,options);
    const f=await open(path,'r+');try{
     const {size}=await f.stat(),tail=Buffer.alloc(Math.min(size,128));await f.read(tail,0,tail.length,size-tail.length);
     const footer=`\n${token}:0:0\n`;if(!tail.subarray(-Buffer.byteLength(footer)).equals(Buffer.from(footer)))throw Error('ack');
     await f.truncate(size-Buffer.byteLength(footer));
    }finally{await f.close();}
   }
   sample.transferCleanupMs=performance.now()-start;
   Object.assign(sample,pngMetadata(await readFile(path)));if(sample.width!==1080||sample.height!==2340)throw Error('png');sample.outcome='ok';
  }catch{sample.outcome='error';}
  finally{await adbShell(`rm -f ${remote}`,options).catch(()=>{});await unlink(path).catch(()=>{});}
 }
 report.status=report.samples.length===24&&report.samples.every(s=>s.outcome==='ok')?'pass':'fail';
}catch{report.status='fail';}
finally{
 try{
  if(ime){if(await adbShell('settings get secure default_input_method',options)!==ime)await adbShell(`ime set ${ime}`,options);
   report.imeRestored=await adbShell('settings get secure default_input_method',options)===ime;}
  await adbShell('am start -W -n com.termux/.app.TermuxActivity',options);report.termuxRestored=await getForegroundPackage(options)==='com.termux';
 }catch{report.restoreFailed=true;}
 if(local)await rm(local,{recursive:true,force:true}).catch(()=>{});
 if(!report.imeRestored||!report.termuxRestored)report.status='fail';
 await writeFile(process.argv[2],JSON.stringify(report,null,2),{mode:0o600});
}
console.log(JSON.stringify({status:report.status,samples:report.samples.length,imeRestored:report.imeRestored,termuxRestored:report.termuxRestored}));
process.exitCode=report.status==='pass'?0:1;
