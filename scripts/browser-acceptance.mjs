import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'browser-evidence');
await mkdir(output,{recursive:true});
const candidates=[process.env.CHROME_BIN,'google-chrome','google-chrome-stable','chromium','chromium-browser'].filter(Boolean);
const chrome=candidates.find(name=>spawnSync(name,['--version'],{encoding:'utf8',timeout:3000}).status===0);
assert.ok(chrome,'Chrome or Chromium is required for real-browser acceptance');
const profile=await mkdtemp(join(tmpdir(),'sandler-browser-'));
const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'4174'},stdio:'ignore'});
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
 '--disable-gpu','--no-first-run','--no-default-browser-check',
 '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let ws;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,description,attempts=120){
 let last;
 for(let i=0;i<attempts;i++){
  try{const value=await fn();if(value)return value} catch(e){last=e}
  await sleep(100);
 }
 throw new Error('Timed out: '+description+(last?' ('+last.message+')':''));
}
try{
 await until(async()=>{const r=await fetch('http://127.0.0.1:4174/');return r.status===200},'preview server startup');
 const port=await until(async()=>{
  const d=await readFile(join(profile,'DevToolsActivePort'),'utf8');
  const p=Number(d.split('\n')[0]);return Number.isInteger(p)&&p>0?p:null;
 },'Chrome remote debugging startup');
 const page=await until(async()=>{
  const r=await fetch('http://127.0.0.1:'+port+'/json/list');
  const data=await r.json();return data.find(item=>item.type==='page'&&item.webSocketDebuggerUrl);
 },'Chrome page CDP endpoint');
 ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
 });
 let seq=0;
 const pending=new Map(),exceptions=[];
 ws.addEventListener('message',event=>{
  const data=JSON.parse(String(event.data));
  if(data.method==='Runtime.exceptionThrown')exceptions.push(data.params?.exceptionDetails?.text||'Runtime exception');
  if(!data.id)return;
  const p=pending.get(data.id);if(!p)return;pending.delete(data.id);
  if(data.error)p.reject(new Error(data.error.message));else p.resolve(data.result);
 });
 function command(method,params={}){
  return new Promise((resolve,reject)=>{
   const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
  });
 }
 async function evaluate(expression){
  const data=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(data.exceptionDetails)throw new Error(data.exceptionDetails.text||'Evaluation failed');
  return data.result?.value;
 }
 const sample=()=>evaluate('(()=>{'+
  'const panels=[...document.querySelectorAll("[data-discover-panel]")];'+
  'const visible=panels.filter(p=>!p.hidden&&getComputedStyle(p).display!=="none"&&p.getBoundingClientRect().height>0);'+
  'const nav=document.querySelector(".discover-switcher");'+
  'const shell=document.querySelector(".shell");'+
  'return {ready:document.readyState,stage:document.body.dataset.stage,'+
  'visiblePanels:visible.map(x=>x.dataset.discoverPanel),'+
  'hiddenPanels:panels.filter(x=>x.hidden).length,'+
  'activeTab:document.querySelector("[role=tab][aria-selected=true]")?.dataset.discoverTab,'+
  'tabColumns:getComputedStyle(nav).gridTemplateColumns.split(" ").filter(Boolean).length,'+
  'viewport:innerHeight,width:innerWidth,docHeight:document.documentElement.scrollHeight,'+
  'docWidth:document.documentElement.scrollWidth,'+
  'shellHeight:Math.round(shell.getBoundingClientRect().height),'+
  'panelHeight:Math.round(document.querySelector(".side").getBoundingClientRect().height),'+
  'mainCards:[...document.querySelector(".main").children].map(el=>({stage:el.dataset.workbenchStep||"",h:Math.round(el.getBoundingClientRect().height),display:getComputedStyle(el).display})),'+
  'header:Math.round(document.querySelector(".top").getBoundingClientRect().height),'+
  'journeyHeight:Math.round(document.querySelector(".journey").getBoundingClientRect().height),'+
  'introHeight:Math.round(document.querySelector(".stage-intro").getBoundingClientRect().height),'+
  'tabbarHeight:Math.round(document.querySelector(".discover-tabbar").getBoundingClientRect().height),'+
  'navVisible:getComputedStyle(document.querySelector(".journey")).display!=="none"};})()');
 await command('Page.enable');await command('Runtime.enable');
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:'http://127.0.0.1:4174/'});
 await until(async()=>await evaluate('document.body.dataset.stage==="discover"&&document.getElementById("cost")?.textContent==="$79,200"')===true,
  'ROI Workbench app initialization');
 let measurements=await sample();
 console.log('Desktop Discover initial:',JSON.stringify(measurements));
 const initialShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'discover-desktop.png'),Buffer.from(initialShot.data,'base64'));
 assert.deepEqual(measurements.visiblePanels,['engagement'],'Only Engagement may occupy layout space');
 assert.equal(measurements.hiddenPanels,3,'Three tabs must be hidden in DOM');
 assert.equal(measurements.tabColumns,4,'Four Discover tabs must form a single row');
 assert.ok(measurements.docHeight<=measurements.viewport+180,
  'Desktop Discover is still a long document: '+JSON.stringify(measurements));
 const desktopHeight=measurements.docHeight;
 for(const tab of ['performance','pipeline','evidence','engagement']){
  await evaluate('document.querySelector('+JSON.stringify('[data-discover-tab="'+tab+'"]')+').click()');
  measurements=await sample();
  console.log('Desktop Discover '+tab+':',JSON.stringify(measurements));
  assert.deepEqual(measurements.visiblePanels,[tab]);
  assert.equal(measurements.activeTab,tab);
  assert.ok(measurements.docHeight<=desktopHeight+45,'Tab changes stretch page: '+tab);
 }
 const desktop=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'discover-desktop.png'),Buffer.from(desktop.data,'base64'));
 await evaluate('document.querySelector("[data-workbench-nav=present]").click()');
 const present=await sample();assert.equal(present.stage,'present');
 assert.equal(present.navVisible,true,'Timeline must remain visible in Present');
 await evaluate('document.querySelector("[data-workbench-nav=discover]").click()');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await sleep(150);
 const mobile=await sample();console.log('Mobile Discover:',JSON.stringify(mobile));
 assert.deepEqual(mobile.visiblePanels,['engagement']);
 assert.equal(mobile.tabColumns,2,'Mobile tabs need two readable columns');
 assert.ok(mobile.docWidth<=mobile.width+2,'Mobile horizontal overflow: '+JSON.stringify(mobile));
 const mobileShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'discover-mobile.png'),Buffer.from(mobileShot.data,'base64'));
 assert.deepEqual(exceptions,[],'Unexpected browser JavaScript exceptions');
 console.log('REAL BROWSER ACCEPTANCE PASS: Chromium rendered geometry, 4 tabs, desktop scroll budget, mobile overflow, Present nav.');
}finally{
 if(ws&&ws.readyState===WebSocket.OPEN)ws.close();
 server.kill('SIGTERM');
 browser.kill('SIGTERM');
 // Chrome still writes its user profile while closing; await termination
 // before removal, with bounded retries for asynchronous filesystem cleanup.
 if(browser.exitCode===null&&browser.signalCode===null){
  await Promise.race([
   new Promise(resolve=>browser.once('exit',resolve)),
   sleep(2000)
  ]);
 }
 await rm(profile,{recursive:true,force:true,maxRetries:12,retryDelay:100});
}
