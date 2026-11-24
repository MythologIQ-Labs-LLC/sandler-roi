import { DEFAULT_INPUTS, SCENARIOS, DEFAULT_ACTIVE, calculate, calculatePipelineBridge, MONEY, PERCENT } from "./roi.mjs";

const clone = object => JSON.parse(JSON.stringify(object));
let inputs=clone(DEFAULT_INPUTS);
let scenarios=clone(SCENARIOS);
let active=clone(DEFAULT_ACTIVE);
let selected="expected";
const $=id=>document.getElementById(id);

const inputSpecs = {
  prospect:["Prospect / client","text","Client organization"],
  consultant:["Sandler representative","text","Person presenting"],
  monthlyFee:["Monthly program fee","number","USD / month"],
  programMonths:["Evaluation period","number","Months; modeled benefits are prorated"],
  setupFee:["One-time implementation cost","number","USD"],
  participantCount:["People trained","number","For proposal context"],
  discountedRevenue:["Annual discount-affected revenue","number","USD / year"],
  priceProfitFlowPct:["Incremental price contribution","number","% flowing to profit; often high, but validate"],
  annualProposals:["Annual commercial proposals","number","Proposal count per year"],
  baselineWinRatePct:["Current win rate","number","% of proposals won"],
  avgDealValue:["Average deal revenue","number","USD per deal"],
  grossMarginPct:["Incremental gross margin","number","% contribution from added sales"],
  newAccountsAnnualValue:["One national-account annual value","number","USD / year per account"],
  newHires:["New sellers per year","number","Hires eligible for ramp acceleration"],
  rampMonths:["Current onboarding ramp","number","Months to full productivity"],
  annualSellerRevenue:["Annual sales per productive seller","number","USD / fully productive seller"],
  pipelineValue:["Qualified pipeline amount","number","Prospect-specific USD, not booked revenue"],
  pipelinePeriodWeeks:["Pipeline observation period","number","Weeks; not automatically annualized"],
  pipelineRevenueConversionPct:["Projected revenue realization","number","% of pipeline expected to close, not a case-study benchmark"],
  pipelineAttributionPct:["Scenario attribution factor","number","% allocated to this illustrative hypothesis; not proof of causality"]
};
const groups=[
  {title:"Pricing discipline", keys:["discountedRevenue","priceProfitFlowPct"]},
  {title:"Pipeline conversion", keys:["annualProposals","baselineWinRatePct","avgDealValue","grossMarginPct"]},
  {title:"National accounts", keys:["newAccountsAnnualValue"]},
  {title:"Sales onboarding", keys:["newHires","rampMonths","annualSellerRevenue"]}
];
const assumptionSpecs={
  pricePoints:["Price improvement","Percentage points held"],
  priceCapturePct:["Price attribution / realization","% of modeled improvement realized"],
  winPoints:["Win-rate improvement","Percentage points gained"],
  winCapturePct:["Win-rate attribution / realization","% realized"],
  nationalAccounts:["Additional major accounts","Accounts signed"],
  accountFirstYearPct:["Account revenue capture","% of a full year's account revenue"],
  accountCapturePct:["Account attribution / realization","% realized"],
  rampMonthsSaved:["Faster new-hire ramp","Months saved per seller"],
  rampCapturePct:["Ramp attribution / realization","% realized"],
  overlapPct:["Overlapping sales outcomes","% deduction from combined win-rate + major-account value"]
};
const leverSpecs={
  pricing:["Price retention","Fewer unnecessary discounts"],
  wins:["Better win rates","More business from existing proposals"],
  accounts:["National / major accounts","Larger multi-site customer relationships"],
  ramp:["Faster sales onboarding","Productivity gained from shorter ramp"]
};

function field(key,parent,source,update,descriptor) {
  const spec=descriptor[key];
  const wrap=document.createElement("div");wrap.className="field";
  const label=document.createElement("label");
  const id="field-"+key;label.htmlFor=id;label.textContent=spec[0];
  const input=document.createElement("input");input.id=id;input.type=spec[1]||"number";
  input.value=source[key]??"";
  if(input.type==="number"){input.step="any";input.min="0";}
  input.addEventListener("input",()=>{update(key,input.value);render();});
  const hint=document.createElement("div");hint.className="hint";hint.textContent=spec[2]||"";
  wrap.append(label,input,hint);parent.append(wrap);
}
function renderFields(){
  $("identity-fields").replaceChildren();
  $("cost-fields").replaceChildren();
  $("baseline-fields").replaceChildren();
  for(const key of ["prospect","consultant"]) field(key,$("identity-fields"),inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
  for(const key of ["monthlyFee","programMonths","setupFee","participantCount"]) field(key,$("cost-fields"),inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
  for(const group of groups){
    const det=document.createElement("details");det.open=true;
    const summary=document.createElement("summary");summary.textContent=group.title;
    const inside=document.createElement("div");inside.className="inside";
    for(const key of group.keys) field(key,inside,inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
    det.append(summary,inside);$("baseline-fields").append(det);
  }
  $("pipeline-fields").replaceChildren();
  for(const key of ["pipelineValue","pipelinePeriodWeeks","pipelineRevenueConversionPct","pipelineAttributionPct"])
    field(key,$("pipeline-fields"),inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
  $("evidence-notes").value=inputs.notes||"";
}
function renderAssumptions(){
  const target=$("assumptions");target.replaceChildren();
  for(const key of Object.keys(assumptionSpecs)){
    const descriptor={[key]:[assumptionSpecs[key][0],"number",assumptionSpecs[key][1]]};
    field(key,target,scenarios[selected],(k,v)=>{scenarios[selected][k]=v;},descriptor);
  }
}
function item(name,value,enabled){
  const row=document.createElement("div");row.className="lever";
  const checkWrap=document.createElement("label");checkWrap.className="toggle";
  const check=document.createElement("input");check.type="checkbox";check.checked=enabled;
  check.setAttribute("aria-label","Include "+leverSpecs[name][0]);
  check.addEventListener("change",()=>{active[name]=check.checked;render();});
  checkWrap.append(check);
  const description=document.createElement("div");
  const head=document.createElement("div");head.className="lever-title";head.textContent=leverSpecs[name][0];
  const sub=document.createElement("div");sub.className="lever-sub";sub.textContent=leverSpecs[name][1];
  description.append(head,sub);
  const amount=document.createElement("div");amount.style.textAlign="right";
  const m=document.createElement("div");m.className="money";m.textContent=!enabled?"Excluded":value.status==="ready"?MONEY(value.value):"Needs input";
  const state=document.createElement("div");state.className="status";
  if(value.status==="needs-input"||value.status==="invalid")state.textContent="Check assumptions and inputs";
  amount.append(m,state);row.append(checkWrap,description,amount);return row;
}
function put(id,text){$(id).textContent=text;}
function render(){
  document.querySelectorAll("[data-scenario]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.scenario===selected)));
  const scenario=scenarios[selected], result=calculate(inputs,scenario,active);
  put("prospect-title",(inputs.prospect||"Prospect")+" | Value opportunity");
  put("print-scenario",scenario.label);
  put("roi",result.complete?(result.roi===null?"N/A":PERCENT(result.roi)):"Incomplete");
  put("net",result.complete?MONEY(result.net):"Incomplete");
  put("benefit",result.complete?MONEY(result.benefit):"Incomplete");
  put("cost",MONEY(result.cost));
  const warning=$("warnings");
  if(result.problems.length){
    warning.classList.add("visible");
    const names=[...new Set(result.problems.map(p=>{
      const label=inputSpecs[p.field]?.[0]||assumptionSpecs[p.field]?.[0]||p.field;
      return label+": "+p.message;
    }))];
    warning.textContent="Missing or invalid inputs. Results are partial until corrected: "+names.join("; ");
  } else warning.classList.remove("visible");
  const levers=$("levers");levers.replaceChildren();
  for(const name of Object.keys(leverSpecs))levers.append(item(name,result.parts[name],active[name]));
  const bars=$("scenario-bars");bars.replaceChildren();
  const variants=Object.entries(scenarios).map(([key,s])=>({key,label:s.label,result:calculate(inputs,s,active)}));
  const max=Math.max(result.cost??0,...variants.map(x=>x.result.benefit??0),1);
  for(const entry of variants){
    const row=document.createElement("div");row.className="bar-row"+(entry.key===selected?" active":"");
    const label=document.createElement("span");label.textContent=entry.label;
    const track=document.createElement("div");track.className="bar-track";
    track.setAttribute("role","img");
    track.setAttribute("aria-label",entry.label+": "+(entry.result.complete?MONEY(entry.result.benefit):"incomplete"));
    const fill=document.createElement("div");fill.className="bar-fill";
    fill.style.width=(entry.result.complete?entry.result.benefit/max*100:0)+"%";
    track.append(fill);
    const total=document.createElement("strong");total.textContent=entry.result.complete?MONEY(entry.result.benefit):"—";
    row.append(label,track,total);bars.append(row);
  }
  const ref=document.createElement("div");ref.className="bar-row";
  const label=document.createElement("span");label.textContent="Investment";
  const track=document.createElement("div");track.className="bar-track";
  const fill=document.createElement("div");fill.className="bar-fill";fill.style.width=(result.cost===null?0:result.cost/max*100)+"%";fill.style.background="#64758c";track.append(fill);
  const total=document.createElement("strong");total.textContent=MONEY(result.cost);
  ref.append(label,track,total);bars.append(ref);
  put("payback",result.simplePaybackMonths===null?"N/A":result.simplePaybackMonths.toFixed(1)+" mo");
  put("multiple",result.multiple===null?"N/A":result.multiple.toFixed(2)+"×");
  put("breakeven",result.breakEvenPricePoints===null?"N/A":result.breakEvenPricePoints.toFixed(3)+" pts");

  const pipeline=calculatePipelineBridge(inputs);
  put("pipeline-revenue",pipeline.complete?MONEY(pipeline.modeledClosedRevenue):"Needs input");
  put("pipeline-profit",pipeline.complete?MONEY(pipeline.modeledGrossProfit):"Needs input");
  put("pipeline-allocated",pipeline.complete?MONEY(pipeline.scenarioAllocatedProfit):"Needs input");
  put("pipeline-period",pipeline.complete?"Over "+pipeline.periodWeeks+" weeks; no annualization.":"Optional inputs not yet complete.");
  const pipelineWarning=$("pipeline-warning");
  if(!pipeline.complete){
    const missing=pipeline.problems.map(p=>(inputSpecs[p.field]?.[0]||p.field)+": "+p.message);
    pipelineWarning.textContent="Pipeline projection unavailable: "+missing.join("; ")+". Existing ROI is unaffected.";
  } else {
    pipelineWarning.textContent="Sensitivity analysis only. Not added to ROI: potential overlap with win-rate, pricing and major-account drivers. Scenario allocation is not verified attribution.";
  }

  const client=inputs.prospect||"the prospect";
  put("pitch-text",result.complete
    ? "For "+client+", the "+scenario.label.toLowerCase()+" scenario models "+MONEY(result.benefit)+" of financial value over "+inputs.programMonths+" months, against a "+MONEY(result.cost)+" program investment. That implies "+MONEY(result.net)+" in net modeled value and "+(result.roi===null?"an undefined ROI because cost is zero":PERCENT(result.roi)+" ROI")+". These are discussion assumptions, not historical performance."
    : "Enter the missing financial baselines and assumptions to build a complete, prospect-specific ROI comparison. No total ROI is presented while an included driver remains unverified.");
  put("pitch-caveat","Use prospect-confirmed baselines. Training outcomes depend on adoption and external conditions. Deduction for overlapping win-rate and major-account value: "+scenario.overlapPct+"%. Evidence notes: "+(inputs.notes||"Not provided."));
}
function snapshot(){
  const result=calculate(inputs,scenarios[selected],active);
  return {schema:"sandler-roi/1",savedAt:new Date().toISOString(),selected,inputs,scenarios,active,calculated:result};
}
function download(filename,content,type){
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function safeSlug(str){return String(str||"client").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").slice(0,60)||"client";}
function csvCell(value){const s=String(value??"");return '"'+s.replace(/"/g,'""')+'"';}
$("evidence-notes").addEventListener("input",event=>{inputs.notes=event.target.value;render();});
document.querySelectorAll("[data-scenario]").forEach(button=>button.addEventListener("click",()=>{
  selected=button.dataset.scenario;renderAssumptions();render();
}));
$("export-json").addEventListener("click",()=>download("sandler-roi-"+safeSlug(inputs.prospect)+".json",JSON.stringify(snapshot(),null,2),"application/json"));
$("export-csv").addEventListener("click",()=>{
  const r=calculate(inputs,scenarios[selected],active);
  const rows=[["Metric","Value"],["Prospect",inputs.prospect],["Representative",inputs.consultant],["Scenario",selected],["Complete",r.complete],["Program cost",r.cost],["Benefit",r.benefit],["Net benefit",r.net],["ROI percent",r.roi],["Simple payback months",r.simplePaybackMonths],["Break-even price points",r.breakEvenPricePoints],["Source notes",inputs.notes]];
  for(const [name,part] of Object.entries(r.parts))rows.push([name+" value",part.value], [name+" status",part.status]);
  for(const [name,value] of Object.entries(scenarios[selected]))rows.push(["Assumption "+name,value]);
  download("sandler-roi-"+safeSlug(inputs.prospect)+".csv",rows.map(r=>r.map(csvCell).join(",")).join("\r\n"),"text/csv");
});
$("present").addEventListener("click",()=>{
  const showing=document.body.classList.toggle("present-mode");
  $("present").textContent=showing?"Exit presentation":"Present";
  $("present").setAttribute("aria-pressed",String(showing));
});
$("print").addEventListener("click",()=>window.print());
$("reset").addEventListener("click",()=>{
  if(!window.confirm("Replace all current inputs and assumptions with the illustrative example?"))return;
  inputs=clone(DEFAULT_INPUTS);scenarios=clone(SCENARIOS);active=clone(DEFAULT_ACTIVE);selected="expected";
  renderFields();renderAssumptions();render();
});
$("import").addEventListener("click",()=>$("import-file").click());
$("import-file").addEventListener("change",async event=>{
  const f=event.target.files?.[0];event.target.value="";if(!f)return;
  if(f.size>2000000){window.alert("JSON file exceeds 2 MB.");return;}
  try {
    const data=JSON.parse(await f.text());
    if(data.schema!=="sandler-roi/1"||!data.inputs||!data.scenarios||!data.active)throw Error("Unsupported model format");
    const cleanInputs={...clone(DEFAULT_INPUTS)};
    for(const key of Object.keys(cleanInputs))if(Object.prototype.hasOwnProperty.call(data.inputs,key))cleanInputs[key]=data.inputs[key];
    const cleanScenarios=clone(SCENARIOS);
    for(const key of Object.keys(cleanScenarios)){
      if(!data.scenarios[key]||typeof data.scenarios[key]!=="object")continue;
      for(const field of Object.keys(cleanScenarios[key]))if(field!=="label"&&Object.prototype.hasOwnProperty.call(data.scenarios[key],field))cleanScenarios[key][field]=data.scenarios[key][field];
    }
    inputs=cleanInputs;scenarios=cleanScenarios;
    active=Object.fromEntries(Object.keys(DEFAULT_ACTIVE).map(k=>[k,data.active[k]===false?false:true]));
    selected=Object.prototype.hasOwnProperty.call(SCENARIOS,data.selected)?data.selected:"expected";
    renderFields();renderAssumptions();render();
  }catch(err){window.alert("Could not import model: "+err.message);}
});
renderFields();renderAssumptions();render();
