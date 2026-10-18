import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
let dir: string;
beforeEach(async()=>{
  dir=await mkdtemp(join(tmpdir(),'workflow-v3-'));
  await writeFile(join(dir,'state.json'),JSON.stringify({ime:'com.fixture/.IME',pkg:'com.termux',results:false,scrolls:0,product:false,commands:[]}));
  await writeFile(join(dir,'adb'),`#!${process.execPath}
const fs=require('node:fs');
const args=process.argv.slice(2);
if(args[0]!=='-s'||args[1]!=='fixture-device')process.exit(9);
args.splice(0,2);const cmd=args.join(' ');
const s=JSON.parse(fs.readFileSync(process.env.V3_STATE,'utf8'));s.commands.push(cmd);
let output='';
const node=(text,y,extra='')=>'<node text="'+text+'" content-desc="" class="android.view.View" package="com.brave.browser" enabled="true" clickable="true" bounds="[500,'+(y-20)+'][900,'+(y+20)+']" '+extra+'/>';
if(cmd==='shell settings get secure default_input_method')output=s.ime;
else if(cmd.startsWith('shell ime set '))s.ime=cmd.slice('shell ime set '.length);
else if(cmd==='shell wm size')output='Physical size: 1080x2340';
else if(cmd.includes('am start'))s.pkg='com.brave.browser';
else if(cmd.includes('monkey -p com.termux'))s.pkg='com.termux';
else if(cmd.includes('monkey -p app.forge.gym')){fs.writeFileSync(process.env.V3_STATE,JSON.stringify(s));process.exit(7);}
else if(cmd.includes('mCurrentFocus'))output='mCurrentFocus=Window{abc u0 '+s.pkg+'/.MainActivity}';
else if(cmd.includes('uiautomator dump'))output='UI hierchary dumped to: /sdcard/pi-droid-ui.xml';
else if(args[0]==='pull'){
 let xml='<hierarchy>';
 if(s.product)xml+=node('/dp/fixture',300,'resource-id="com.brave.browser:id/url_bar"');
 else if(s.results){
  const y=s.scrolls?(process.env.V3_MODE==='overshoot'&&s.largeGesture?0:1000):2089;
  xml+=node('Alpro Almond Drink Without Sugar, 8 x 1 L',600)+node('€19.99 (€2.50 /l)',650);
  xml+=node('Alpro Almond Drink Original - 8 x 1 L',800)+node('€19.99 (€2.50 /l)',850);
  const title=process.env.V3_MODE==='identity-change'&&s.scrolls?'UNRELATED':'Alpro Barista Almond Plant-Based';
  const hidden=process.env.V3_MODE==='zero-area'&&s.scrolls>0&&s.scrolls<5;
  xml+=hidden?'<node text="'+title+'" class="android.view.View" package="com.brave.browser" enabled="true" clickable="true" bounds="[0,0][0,0]"/>':node(title,process.env.V3_MODE==='never-visible'?2089:y);
  xml+=node('€18.94 (€2.37 /l)',2089);
  if(process.env.V3_MODE==='ambiguous')xml+=node('Alpro Barista Almond Plant-Based',1100);
 }else xml+='<node text="Mandelmilch" content-desc="" resource-id="nav-search-keywords" class="android.widget.EditText" package="com.brave.browser" enabled="true" clickable="true" focused="true" bounds="[100,395][980,435]"/>';
 fs.writeFileSync(args[2],xml+'</hierarchy>');
}else if(cmd.includes('input swipe')){s.scrolls++;if(process.env.V3_MODE==='zero-area'&&/input swipe 80 1000 80 1350/.test(cmd))s.scrolls=0;const m=cmd.match(/input swipe [0-9]+ ([0-9]+) [0-9]+ ([0-9]+)/);s.largeGesture=Math.abs(Number(m[1])-Number(m[2]))>400;}
else if(cmd.includes('input keyevent KEYCODE_ENTER'))s.results=true;
else if(cmd==='shell input tap 700 1000'&&s.results)s.product=true;
else if(!cmd.startsWith('shell am broadcast')&&!cmd.startsWith('shell input tap'))process.exit(8);
fs.writeFileSync(process.env.V3_STATE,JSON.stringify(s));console.log(output);
`);
  await chmod(join(dir,'adb'),0o700);
});
afterEach(async()=>{await rm(dir,{recursive:true,force:true});});
async function run(mode:string){
  const output=join(dir,'report.json');
  await exec(process.execPath,['--import','tsx','scripts/workflow-v3.2.mjs','after',output],{
    cwd:resolve('.'),timeout:40000,env:{...process.env,PATH:`${dir}:${process.env.PATH}`,ANDROID_SERIAL:'fixture-device',PI_DROID_WORKFLOW_E2E:'1',PI_DROID_E2E_RUN_ID:'fixture',V3_STATE:join(dir,'state.json'),V3_MODE:mode},
  }).catch(()=>{});
  return {report:JSON.parse(await readFile(output,'utf8')),state:JSON.parse(await readFile(join(dir,'state.json'),'utf8'))};
}
it('aligns the same chosen product and confirms fresh visibility before tap; restores on later failure',async()=>{
  const {report:r,state:s}=await run('visible');
  expect(r.checks.find((c:any)=>c.name==='amazon_product_open')?.ok).toBe(true);
  expect(r.productAlignment).toEqual([
    {phase:'observe',attempt:0,distinctTargets:1,visible:false,centerY:2089},
    {phase:'observe',attempt:1,distinctTargets:1,visible:true,centerY:1000},
    {phase:'confirm',attempt:1,distinctTargets:1,visible:true,centerY:1000},
  ]);
  expect(s.commands.filter((c:string)=>c==='shell input tap 700 1000')).toHaveLength(1);
  expect(r.status).toBe('fail'); // Deliberate external Forge launch failure, not a full fake success.
  expect(r.checks.slice(-2)).toEqual([{name:'original_ime_restored',ok:true},{name:'termux_restored',ok:true}]);
  expect(r.captureContexts.every((c:any)=>c.traceComplete&&!c.spansTruncated)).toBe(true);
},40000);
it.each(['never-visible','identity-change','ambiguous'])('fails closed for %s without a product tap',async(mode)=>{
  const {report:r,state:s}=await run(mode);
  expect(r.status).toBe('fail');
  expect(s.scrolls).toBe(mode==='ambiguous'?0:8);
  expect(s.commands.filter((c:string)=>c==='shell input tap 700 1000')).toEqual([]);
  expect(r.numericWrites).toEqual([]);
  expect(r.checks.slice(-2)).toEqual([{name:'original_ime_restored',ok:true},{name:'termux_restored',ok:true}]);
},40000);

it('continues forward through zero-area offscreen nodes instead of reversing at origin',async()=>{
  const {report:r,state:s}=await run('zero-area');
  expect(r.checks.find((c:any)=>c.name==='amazon_product_open')?.ok).toBe(true);
  expect(s.scrolls).toBe(5);
  expect(s.commands.filter((c:string)=>c==='shell input tap 700 1000')).toHaveLength(1);
},40000);

it('uses bounded small gestures rather than overshooting and oscillating across clipped title positions',async()=>{
  const {report:r,state:s}=await run('overshoot');
  expect(r.checks.find((c:any)=>c.name==='amazon_product_open')?.ok).toBe(true);
  expect(s.scrolls).toBe(1);
  expect(r.productAlignment.at(-1).visible).toBe(true);
},40000);
