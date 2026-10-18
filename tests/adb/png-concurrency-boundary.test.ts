import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "png-boundary-"));
  await writeFile(join(dir, "adb"), `#!${process.execPath}
const fs=require('node:fs'),p=require('node:path');
const root=process.env.PNG_ROOT, mode=process.env.PNG_MODE;
const args=process.argv.slice(2);if(args[0]==='-s')args.splice(0,2);
const command=args.join(' '),remote=name=>p.join(root,'remote-'+p.basename(name));
const sleep=()=>new Promise(r=>setTimeout(r,5));
async function wait(name){const end=Date.now()+4000;while(!fs.existsSync(p.join(root,name))){if(Date.now()>end)throw Error('barrier');await sleep();}}
(async()=>{
if(command.includes('screencap -p ')) {
 const name=command.split(' ').at(-1);let first=true;
 try{fs.writeFileSync(p.join(root,'first'),'1',{flag:'wx'});}catch{first=false;}
 fs.writeFileSync(remote(name),first?'FRAME_A':'FRAME_B');
 if(mode==='capture-error'){process.stderr.write('PRIVATE_CAPTURE');process.exit(7);}
 if(mode==='interleave'){
  if(first){fs.writeFileSync(p.join(root,'ready'),'1');await wait('second');}
  else fs.writeFileSync(p.join(root,'second'),'1');
 }
} else if(args[0]==='pull') {
 if(mode==='transfer-error'||mode==='transfer-cleanup-error'){fs.writeFileSync(args[2],'PARTIAL');process.stderr.write('PRIVATE_PULL');process.exit(8);}
 if(mode!=='read-error')fs.copyFileSync(remote(args[1]),args[2]);
} else if(command==='shell wm size') {
 if(mode==='dimensions-error'){process.stderr.write('PRIVATE_SIZE');process.exit(9);}
 console.log('Physical size: 1080x2340');
} else if(command.startsWith('shell rm -f ')) {
 if(mode==='cleanup-error'||mode==='transfer-cleanup-error'){process.stderr.write('PRIVATE_CLEANUP');process.exit(10);}
 fs.rmSync(remote(command.split(' ').at(-1)),{force:true});
} else process.exit(11);
})().catch(e=>{console.error(e);process.exit(12);});
`);
  await chmod(join(dir, "adb"), 0o700);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function probe(apis: string[], mode = "interleave") {
  const path = join(dir, "probe.mjs");
  await writeFile(path, `
import {takeScreenshot,screenshotBase64,setScreenshotDir} from ${JSON.stringify(resolve("src/adb/screenshot.ts"))};
import {readFile,access,readdir,unlink} from 'node:fs/promises';
import {join} from 'node:path';
const root=process.env.PNG_ROOT;
setScreenshotDir(join(root,'images'));
const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[1700000000000]));}static now(){return 1700000000000;}};
const spans=[], options=Object.freeze({serial:'PRIVATE_SERIAL',exactSerial:true,autoReconnect:false,timeout:5000,
 includeBase64:true,onCaptureSpan:s=>spans.push(s)});
const apis=${JSON.stringify(apis)};
async function call(api){
 try{if(api==='quick')return {data:Buffer.from(await screenshotBase64(options),'base64').toString()};
 const r=await takeScreenshot(options);return {data:Buffer.from(r.base64,'base64').toString(),file:await readFile(r.path,'utf8'),path:r.path,width:r.width,height:r.height};
 }catch(e){return {failureKind:e.failureKind,exitCode:e.exitCode,code:e.code};}
}
let results;
if(process.env.PNG_MODE==='interleave') {
 const first=call(apis[0]);const end=performance.now()+4500;
 while(true){try{await access(join(root,'ready'));break;}catch{if(performance.now()>end)throw Error('ready');await new Promise(r=>setTimeout(r,5));}}
 results=await Promise.all([first,call(apis[1])]);
}else results=[await call(apis[0])];
const remoteRemaining=(await readdir(root)).filter(n=>n.startsWith('remote-')).length;
const files=await readdir(join(root,'images')).catch(()=>[]);
const quickFiles=(await readdir(process.env.TMPDIR)).filter(n=>n.startsWith('pi-droid-quick-'));
console.log(JSON.stringify({results,remoteRemaining,files,quickFiles,spans}));
`);
  const { stdout } = await exec(process.execPath, ["--import", "tsx", path], {
    timeout: 12000,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, PNG_ROOT: dir, PNG_MODE: mode, TMPDIR: dir },
  });
  return JSON.parse(stdout);
}

it("keeps each mixed concurrent screenshot's own frame despite an intervening capture", async () => {
  const r = await probe(["saved", "quick"]);
  expect(r.results.map((v: { data: string }) => v.data)).toEqual(["FRAME_A", "FRAME_B"]);
  expect(r.results[0]).toMatchObject({ file: "FRAME_A", width: 1080, height: 2340 });
});

it("cleans only owned remote files after mixed capture success", async () => {
  const r = await probe(["saved", "quick"]);
  expect(r.remoteRemaining).toBe(0);
  expect(r.files).toHaveLength(1);
  expect(r.quickFiles).toHaveLength(0);
  expect(r.results.map((v: { data: string }) => v.data)).toEqual(["FRAME_A", "FRAME_B"]);
});

it("retains distinct saved files even when concurrent captures share a timestamp", async () => {
  const r = await probe(["saved", "saved"]);
  expect(r.results[0].path).not.toBe(r.results[1].path);
  expect(r.results.map((v: { data: string }) => v.data)).toEqual(["FRAME_A", "FRAME_B"]);
  expect(r.results.map((v: { file: string }) => v.file)).toEqual(["FRAME_A", "FRAME_B"]);
});

it("keeps two concurrent quick captures isolated and removes their temporary files", async () => {
  const r = await probe(["quick", "quick"]);
  expect(r.results.map((v: { data: string }) => v.data)).toEqual(["FRAME_A", "FRAME_B"]);
  expect(r.quickFiles).toEqual([]);
  expect(r.remoteRemaining).toBe(0);
});

it.each(["saved", "quick"])("cleans failed %s captures without replacing their primary errors", async api => {
  for (const [mode, expected] of [
    ["capture-error", { exitCode: 7, failureKind: "exit" }],
    ["transfer-error", { exitCode: 8, failureKind: "exit" }],
    ["read-error", { code: "ENOENT" }],
    ...(api === "saved" ? [["dimensions-error", { exitCode: 9, failureKind: "exit" }]] : []),
  ] as const) {
    const r = await probe([api], mode);
    expect(r.results[0]).toMatchObject(expected);
    expect(r.remoteRemaining).toBe(0);
    expect(r.files).toEqual([]);
    expect(r.quickFiles).toEqual([]);
  }
}, 20000);

it.each(["saved", "quick"])("treats remote cleanup failures as best-effort for %s", async api => {
  const success = await probe([api], "cleanup-error");
  expect(success.results[0].data).toBe("FRAME_A");
  expect(success.remoteRemaining).toBe(1);
  // Run each independent scenario in a new sandbox through the normal test lifecycle.
  expect(success.spans.at(-1)).toMatchObject({ stage: "adb_attempt", outcome: "error", failureKind: "exit" });
  expect(JSON.stringify(success.spans)).not.toContain("PRIVATE_");
});

it.each(["saved", "quick"])("preserves failed transfer when %s cleanup also fails", async api => {
  const r = await probe([api], "transfer-cleanup-error");
  expect(r.results[0]).toMatchObject({ exitCode: 8, failureKind: "exit" });
  expect(r.files).toEqual([]);
  expect(r.quickFiles).toEqual([]);
  expect(r.remoteRemaining).toBe(1);
});
