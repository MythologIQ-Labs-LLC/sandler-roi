import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
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
 const visibleStage=()=>evaluate('(()=>{'+
  'const shown=sel=>{const el=document.querySelector(sel);return !!el&&el.getClientRects().length>0};'+
  'return {baseline:shown(".baseline-stage"),modelBehavior:shown("#model-behavior"),'+
  'review:shown(".validation-stage"),presentBehavior:shown("#present-behavior"),'+
  'scenario:shown("[data-scenario]"),benefit:shown("#benefit"),roi:shown("#roi"),'+
  'comparison:shown(".compare-stage"),'+
  'modelText:document.querySelector("#model-behavior")?.textContent||"",'+
  'winReveal:document.querySelector("#present-behavior")?.textContent||"",'+
  'gross:document.querySelector("#benefit")?.textContent||"",'+
  'paybackNote:document.querySelector("#payback-horizon-note")?.textContent||"",'+
  'overlap:document.querySelector("#present-driver-summary")?.textContent||"",'+
  'paybackRows:[...document.querySelectorAll("#scenario-table tr")].map(r=>r.lastElementChild?.textContent||""),'+
  'rows:document.querySelectorAll("#scenario-table tr").length,'+
  'firstMainVisible:[...document.querySelector(".main").children].find(el=>el.getClientRects().length>0)?.className||"",'+
  'revealTop:Math.round(document.querySelector(".reveal-stage").getBoundingClientRect().top),'+
  'pipelineExpanded:document.querySelector(".optional-analysis")?.open||false};})()');
 const customerLabels=()=>evaluate('(()=>{'+
  'const text=id=>document.getElementById(id)?.textContent||"";'+
  'return {heading:text("baseline-title"),budget:text("budget-title"),'+
  'intro:text("step-title"),performance:text("performance-title"),'+
  'model:text("model-ownership-title"),review:text("review-title"),'+
  'reveal:text("reveal-heading"),pitch:text("pitch-title"),'+
  'source:text("prospect-title"),evidence:text("baseline-confidence"),'+
  'customer:document.getElementById("field-prospect")?.value||"",'+
  'visibleCopy:document.body.innerText,'+
  'scenarioName:document.getElementById("scenario-table")?.getAttribute("aria-label")};})()');
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
  'tabbarInsideEditor:document.querySelector(".side").contains(document.querySelector(".discover-tabbar")),'+
  'panelNeedsScroll:(()=>{const p=document.querySelector("[data-discover-panel]:not([hidden])");return p.scrollHeight>p.clientHeight+2})(),'+
  'editorTop:Math.round(document.getElementById("field-prospect").getBoundingClientRect().top),'+
  'sideWidth:Math.round(document.querySelector(".side").getBoundingClientRect().width),'+
  'mainWidth:Math.round(document.querySelector(".main").getBoundingClientRect().width),'+
  'mainCards:[...document.querySelector(".main").children].map(el=>({stage:el.dataset.workbenchStep||"",h:Math.round(el.getBoundingClientRect().height),display:getComputedStyle(el).display})),'+
  'header:Math.round(document.querySelector(".top").getBoundingClientRect().height),'+
  'journeyHeight:Math.round(document.querySelector(".journey").getBoundingClientRect().height),'+
  'timeline:(()=>{const root=document.getElementById("journey-timeline");'+
  'const outer=root.getBoundingClientRect();const line=getComputedStyle(root,"::before");'+
  'return {stage:root.dataset.current,connectorPx:parseFloat(line.height),'+
  'lineStart:outer.left+parseFloat(line.left),lineEnd:outer.left+parseFloat(line.left)+parseFloat(line.width),'+
  'points:[...root.querySelectorAll(".journey-step")].map(el=>{'+
  'const node=el.querySelector(".journey-node").getBoundingClientRect();const hit=el.getBoundingClientRect();'+
  'return {key:el.dataset.workbenchNav,state:el.dataset.timelineState,'+
  'center:node.left+node.width/2,y:node.top+node.height/2,'+
  'hitHeight:Math.round(hit.height),current:el.getAttribute("aria-current")};})};})(),'+
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
 const initialVisibility=await visibleStage();
 assert.equal(initialVisibility.baseline,true,'Discover must show buyer baseline');
 for(const key of ['scenario','roi','benefit','comparison','presentBehavior']){
  assert.equal(initialVisibility[key],false,'Premature financial reveal in Discover: '+key);
 }

 const initialShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'discover-desktop.png'),Buffer.from(initialShot.data,'base64'));
 assert.deepEqual(measurements.visiblePanels,['engagement'],'Only Engagement may occupy layout space');
 assert.equal(measurements.tabbarInsideEditor,true,'Discover tabs must sit inside the editable pane');
 assert.equal(measurements.panelNeedsScroll,false,'Engagement panel should not scroll on 1440x900 desktop');
 assert.ok(measurements.editorTop<=370,'Editable prospect input still pushed down the screen: '+measurements.editorTop);
 assert.ok(measurements.sideWidth>measurements.mainWidth,'Editing surface must be wider than KPI summary');
 assert.ok(measurements.header<=68,'Header is still too tall: '+measurements.header);
 assert.ok(measurements.journeyHeight<=46,'Four-point timeline is too tall: '+measurements.journeyHeight);
 assert.equal(measurements.timeline.connectorPx,2,'Timeline connector must be a thin line');
 assert.equal(measurements.timeline.points.length,4);
 assert.equal(measurements.timeline.stage,"discover");
 assert.deepEqual(measurements.timeline.points.map(p=>p.state),
   ["current","upcoming","upcoming","upcoming"]);
 assert.ok(measurements.timeline.points.every(p=>p.hitHeight>=40),
   'Small markers still require full-size interaction hit targets');
 assert.ok(measurements.timeline.points.every(p=>Math.abs(p.y-(measurements.timeline.points[0].y))<=1),
   'Four stage markers must align on one literal timeline');
 for(let i=1;i<4;i++)assert.ok(measurements.timeline.points[i].center>measurements.timeline.points[i-1].center,
   'Stage markers must progress left to right');
 assert.equal(measurements.hiddenPanels,3,'Three tabs must be hidden in DOM');
 assert.equal(measurements.tabColumns,4,'Four Discover tabs must form a single row');
 assert.ok(measurements.docHeight<=measurements.viewport+180,
  'Desktop Discover is still a long document: '+JSON.stringify(measurements));
 const desktopHeight=measurements.docHeight;
 await command('Emulation.setDeviceMetricsOverride',{width:1698,height:900,deviceScaleFactor:1,mobile:false});
 await sleep(80);
 const wide=await sample();console.log('Wide desktop Discover:',JSON.stringify(wide));
 assert.equal(wide.tabbarInsideEditor,true);
 assert.equal(wide.panelNeedsScroll,false,'Engagement should not scroll at the supplied screenshot width');
 assert.ok(wide.editorTop<=370,'Editor too low on wide desktop');
 assert.ok(wide.docHeight<=wide.viewport+10,'Wide desktop should have no full-page scroll');
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await sleep(50);
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
 let owned=await customerLabels();
 assert.equal(owned.heading,"Sample customer’s starting point");
 assert.match(owned.source,/source status shown below/);
 assert.doesNotMatch(owned.visibleCopy,/\bprospect\b/i,"Visible UI should use customer language");
 await evaluate('(()=>{const input=document.getElementById("field-prospect");'+
  'input.value="John Doe";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
 owned=await customerLabels();
 assert.equal(owned.heading,"John Doe’s starting point");
 assert.equal(owned.budget,"John Doe’s modeled program investment");
 assert.equal(owned.intro,"Start with John Doe’s numbers.");
 assert.match(owned.source,/Current baseline figures/);
 assert.doesNotMatch(owned.source,/John Doe/,"Do not repeat customer name in every supporting sentence");
 assert.match(owned.evidence,/Source status/);
 const namedImage=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'discover-john-doe.png'),Buffer.from(namedImage.data,'base64'));
 await evaluate('(()=>{const input=document.getElementById("field-prospect");'+
  'input.value="   ";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
 owned=await customerLabels();
 assert.equal(owned.heading,"The customer’s starting point");
 assert.equal(owned.intro,"Start with the customer’s numbers.");
 await evaluate('(()=>{const input=document.getElementById("field-prospect");'+
  'input.value="John Doe";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
 await evaluate('document.querySelector("[data-workbench-nav=model]").click()');
 let lineState=await sample();
 assert.equal(lineState.timeline.stage,"model");
 assert.deepEqual(lineState.timeline.points.map(p=>p.state),
   ["previous","current","upcoming","upcoming"]);
 let phase=await visibleStage();
 assert.equal(phase.modelBehavior,true,'Model must show operating hypotheses');
 owned=await customerLabels();
 assert.equal(owned.model,"What could improve for John Doe?");
 assert.match(owned.intro,/John Doe/);
 assert.doesNotMatch(owned.visibleCopy,/\bprospect\b/i);
 assert.match(phase.modelText,/Current baseline/);
 assert.match(phase.modelText,/26\.4%/);
 for(const key of ['scenario','roi','benefit','comparison']){
  assert.equal(phase[key],false,'Model disclosed financial return too early: '+key);
 }
 await evaluate('document.querySelector("[data-workbench-nav=compare]").click()');
 lineState=await sample();
 assert.deepEqual(lineState.timeline.points.map(p=>p.state),
   ["previous","previous","current","upcoming"]);
 phase=await visibleStage();
 assert.equal(phase.review,true,'Compare must show customer validation');
 owned=await customerLabels();
 assert.equal(owned.review,"Review John Doe’s figures and assumptions");
 assert.match(owned.intro,/John Doe/);
 for(const key of ['scenario','roi','benefit','comparison']){
  assert.equal(phase[key],false,'Review disclosed full scenario comparison: '+key);
 }
 const reviewImage=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'review-desktop.png'),Buffer.from(reviewImage.data,'base64'));
 await evaluate('document.querySelector("[data-workbench-nav=present]").click()');
 const present=await sample();assert.equal(present.stage,'present');
 assert.deepEqual(present.timeline.points.map(p=>p.state),
   ["previous","previous","previous","current"]);
 assert.equal(present.navVisible,true,'Timeline must remain visible in Present');
 owned=await customerLabels();
 assert.equal(owned.reveal,"Where John Doe stands. What could change.");
 assert.equal(owned.pitch,"John Doe’s potential business case");
 assert.match(owned.scenarioName,/John Doe’s illustrative financial comparison/);
 assert.doesNotMatch(owned.visibleCopy,/\bprospect\b/i);
 phase=await visibleStage();
 for(const key of ['presentBehavior','scenario','roi','benefit','comparison']){
  assert.equal(phase[key],true,'Present must reveal the completed financial business case: '+key);
 }
 assert.match(phase.winReveal,/26\.4%/);
 assert.match(phase.gross,/\$/);
 assert.equal(phase.rows,3,'Present must include all three scenario rows');
 assert.match(phase.overlap,/Less: overlap between win-rate and major-account benefits/);
 assert.match(phase.overlap,/\$12,600/,'Expected scenario must show the dollar overlap deduction');
 assert.match(phase.paybackNote,/exceeds the 12-month evaluation/);
 assert.ok(phase.paybackRows.some(x=>x.includes('†')),
   'Conservative scenario extrapolates beyond the model term; visually flag it');
 assert.match(phase.firstMainVisible,/reveal-stage/,'Reveal must be the first visible Present panel');
 assert.ok(phase.revealTop<=320,'Main business case is below the fold: '+phase.revealTop);
 assert.equal(phase.pipelineExpanded,false,'Optional sensitivity should not preempt the reveal');

 // Export remains a primary workflow in the final customer-facing stage.
 const menuState=()=>evaluate('(()=>{'+
  'const menu=document.getElementById("file-menu");'+
  'const summary=menu.querySelector("summary");'+
  'const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).display!=="none";'+
  'return {menuVisible:visible(menu),summaryVisible:visible(summary),'+
  'headerVisible:visible(document.querySelector(".top-actions")),'+
  'open:menu.open,items:[...menu.querySelectorAll("button")].map(b=>({id:b.id,visible:visible(b)})),'+
  'viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth};})()');
 let menu=await menuState();
 assert.equal(menu.menuVisible,true,'Files & export must remain visible during Present');
 assert.equal(menu.summaryVisible,true,'Present export menu trigger must be visible');
 assert.equal(menu.headerVisible,true,'Present header actions must remain visible');
 await evaluate('document.querySelector("#file-menu > summary").click()');
 menu=await menuState();
 assert.equal(menu.open,true,'Files & export should expand during Present');
 for(const id of ['export-json','export-csv','print']){
  assert.ok(menu.items.some(x=>x.id===id&&x.visible),'Final stage action inaccessible: '+id);
 }
 const openMenuShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'present-export-menu-desktop.png'),Buffer.from(openMenuShot.data,'base64'));
 const downloadDir=join(output,'present-export-downloads');
 await mkdir(downloadDir,{recursive:true});
 await command('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir});
 await evaluate('document.getElementById("export-json").click()');
 await evaluate('document.getElementById("export-csv").click()');
 const downloaded=await until(async()=>{
  const entries=await readdir(downloadDir);
  return entries.some(x=>x.endsWith('.json'))&&entries.some(x=>x.endsWith('.csv'))?entries:null;
 },'JSON and CSV exports from Present');
 const jsonName=downloaded.find(x=>x.endsWith('.json')),csvName=downloaded.find(x=>x.endsWith('.csv'));
 assert.equal(jsonName,'sandler-roi-john-doe.json');
 assert.equal(csvName,'sandler-roi-john-doe.csv');
 const jsonData=JSON.parse(await readFile(join(downloadDir,jsonName),'utf8'));
 const csvData=await readFile(join(downloadDir,csvName),'utf8');
 assert.equal(jsonData.inputs.prospect,'John Doe','Saved JSON must retain the current customer identity');
 assert.equal(jsonData.selected,'expected','Saved JSON must match the currently selected presentation scenario');
 assert.match(csvData,/"Customer","John Doe"/,'CSV must contain the customer name');
 assert.match(csvData,/"Scenario","expected"/,'CSV must contain the current scenario');
 assert.match(csvData,/"Program cost","79200"/,'CSV must contain the computed investment');
 await evaluate('document.querySelector("#file-menu > summary").click()');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await sleep(100);
 menu=await menuState();
 assert.equal(menu.menuVisible,true,'Files & export must remain accessible on narrow Present');
 assert.ok(menu.documentWidth<=menu.viewportWidth+2,
  'Present header causes horizontal overflow on mobile: '+JSON.stringify(menu));
 const mobileExportShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'present-export-mobile.png'),Buffer.from(mobileExportShot.data,'base64'));
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await sleep(60);
 const presentImage=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'present-desktop.png'),Buffer.from(presentImage.data,'base64'));
 const beforeChange=phase.gross;
 await evaluate('document.querySelector("[data-scenario=upside]").click()');
 phase=await visibleStage();
 assert.notEqual(phase.gross,beforeChange,'Scenario selection must update financial reveal');
 assert.match(phase.winReveal,/28\.4%/);
 const upsideImage=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'present-upside-desktop.png'),Buffer.from(upsideImage.data,'base64'));
 await evaluate('document.querySelector("[data-workbench-nav=discover]").click()');
 phase=await visibleStage();
 assert.equal(phase.scenario,false,'Returning to Discover must hide scenario controls');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await sleep(150);
 const mobile=await sample();console.log('Mobile Discover:',JSON.stringify(mobile));
 assert.deepEqual(mobile.visiblePanels,['engagement']);
 assert.equal(mobile.tabColumns,2,'Mobile tabs need two readable columns');
 assert.ok(mobile.docWidth<=mobile.width+2,'Mobile horizontal overflow: '+JSON.stringify(mobile));
 assert.ok(mobile.journeyHeight<=46,'Timeline grew into big cards on mobile');
 assert.equal(mobile.timeline.points.length,4);
 assert.ok(mobile.timeline.points.every(p=>p.hitHeight>=40),'Mobile timeline targets are too small');
 await evaluate('(()=>{const input=document.getElementById("field-prospect");'+
  'input.value="North Atlantic Regional Commercial Development and Training Partners International";'+
  'input.dispatchEvent(new Event("input",{bubbles:true}));})()');
 const longMobile=await sample();
 assert.ok(longMobile.docWidth<=longMobile.width+2,
  'Long customer name caused horizontal overflow: '+JSON.stringify(longMobile));
 await evaluate('(()=>{const input=document.getElementById("field-prospect");'+
  'input.value="John Doe";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
 const mobileShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(join(output,'discover-mobile.png'),Buffer.from(mobileShot.data,'base64'));
 // From a later stage, Reset returns to the beginning of the customer's journey.
 await evaluate('document.querySelector("[data-discover-tab=evidence]").click()');
 await evaluate('document.querySelector("[data-workbench-nav=compare]").click()');
 await evaluate('window.confirm=()=>true;document.getElementById("reset").click()');
 const resetState=await evaluate('(()=>({stage:document.body.dataset.stage,'+
  'customer:document.getElementById("field-prospect").value,'+
  'cost:document.getElementById("cost").textContent,'+
  'active:document.querySelector("[data-discover-tab][aria-selected=true]")?.dataset.discoverTab,'+
  'timeline:document.getElementById("journey-timeline").dataset.current,'+
  'visible:[...document.querySelectorAll("[data-discover-panel]")].filter(p=>!p.hidden).map(p=>p.dataset.discoverPanel)}))()');
 assert.equal(resetState.stage,'discover');
 assert.equal(resetState.customer,'Sample customer');
 assert.equal(resetState.cost,'$79,200');
 assert.equal(resetState.active,'engagement');
 assert.equal(resetState.timeline,'discover');
 assert.deepEqual(resetState.visible,['engagement']);
 // Customer files: explicit directory connection, save, reopen, and JSON fallback.
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await evaluate('(()=>{const disk=new Map();const handle=name=>({kind:"file",name,'+
  'getFile:async()=>new File([disk.get(name)],name,{type:"application/json"}),'+
  'createWritable:async()=>({write:async data=>{disk.set(name,String(data))},close:async()=>{},abort:async()=>{}})});'+
  'window.showDirectoryPicker=async()=>({name:"Sandler Customer Files",'+
  'entries:async function*(){for(const name of disk.keys())yield [name,handle(name)]},'+
  'getFileHandle:async(name,options={})=>{if(!disk.has(name)&&!options.create)throw new DOMException("Missing","NotFoundError");return handle(name)},'+
  'removeEntry:async name=>{disk.delete(name)}});'+
  'document.getElementById("customer-folder-connect").disabled=false;})()');
 await evaluate('document.getElementById("customer-files-open").click()');
 await evaluate('document.getElementById("customer-folder-connect").click()');
 const folderReady=await until(async()=>evaluate('document.getElementById("customer-folder-hint").textContent.includes("Sandler Customer Files")'),
  'customer folder picker connected');
 assert.equal(folderReady,true);
 await evaluate('(()=>{const e=document.getElementById("field-prospect");e.value="Demo Customer";'+
  'e.dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("customer-save").click()})()');
 const saved=await until(async()=>evaluate('document.getElementById("customer-saved-list").options.length===1'),
   'saved customer visible in selected folder');
 assert.equal(saved,true);
 await evaluate('(()=>{const e=document.getElementById("field-prospect");e.value="Changed In Browser";'+
  'e.dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("customer-open").click()})()');
 const opened=await until(async()=>evaluate('document.getElementById("field-prospect").value==="Demo Customer"'),
  'saved customer reloaded');
 assert.equal(opened,true);
 assert.equal(await evaluate('document.body.dataset.stage'),"discover");
 await evaluate('document.getElementById("customer-files-open").click()');
 await evaluate('document.getElementById("customer-download-backup").click()');
 const backedUp=await until(async()=>{
   const entries=await readdir(downloadDir);return entries.includes('sandler-roi-demo-customer.json');
 },'JSON backup downloaded');
 assert.equal(backedUp,true);
 // Opt-in feedback contains only user-entered notes plus screen/scenario context.
 await evaluate('document.getElementById("customer-files-close").click()');
 await evaluate('document.getElementById("feedback-toggle").click()');
 assert.equal(await evaluate('document.getElementById("feedback-panel").hidden'),false);
 await evaluate('document.querySelector("[data-workbench-nav=compare]").click()');
 await evaluate('(()=>{document.getElementById("feedback-text").value="Clarify how scenarios compare";'+
  'document.getElementById("feedback-category").value="improvement";'+
  'document.getElementById("feedback-add").click()})()');
 assert.equal(await evaluate('document.getElementById("feedback-count").textContent'),"1 captured");
 await evaluate('document.getElementById("feedback-export").click()');
 const archiveName=await until(async()=>{
   const entries=await readdir(downloadDir);
   return entries.find(n=>/^sandler-development-feedback-\d{4}-\d{2}-\d{2}\.zip$/.test(n));
 },'feedback ZIP downloaded');
 const archive=await readFile(join(downloadDir,archiveName));
 assert.equal(archive.readUInt32LE(0),0x04034b50,'feedback export must be ZIP');
 const firstNameLength=archive.readUInt16LE(26);
 assert.equal(archive.subarray(30,30+firstNameLength).toString(),"feedback.json");
 const manifestLength=archive.readUInt32LE(18);
 const manifest=JSON.parse(archive.subarray(30+firstNameLength,30+firstNameLength+manifestLength).toString());
 assert.equal(manifest.notes.length,1);
 assert.equal(manifest.notes[0].text,"Clarify how scenarios compare");
 assert.equal(manifest.notes[0].context.stage,"compare");
 assert.doesNotMatch(JSON.stringify(manifest),/Demo Customer|79200/,'feedback must not capture customer data');
 await evaluate('document.getElementById("feedback-exit").click()');
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
