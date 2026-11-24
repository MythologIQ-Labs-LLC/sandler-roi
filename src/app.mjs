import { DEFAULT_INPUTS, SCENARIOS, DEFAULT_ACTIVE, calculate, calculatePipelineBridge, MONEY, PERCENT } from "./roi.mjs";
import { BASELINE_FIELDS, EVIDENCE_STATUSES, defaultEvidence, normalizeEvidence, requiredEvidenceKeys, assessEvidence } from "./evidence.mjs";

const clone = object => JSON.parse(JSON.stringify(object));
let inputs=clone(DEFAULT_INPUTS);
let evidence=defaultEvidence(inputs);
let scenarios=clone(SCENARIOS);
let active=clone(DEFAULT_ACTIVE);
let selected="expected";
let currentStep="discover", priorStep="compare";
const $=id=>document.getElementById(id);
const JOURNEY={
  discover:{label:"01 / DISCOVER",title:"Start with the prospect's numbers.",
    description:"Define the challenge together. Replace fictional examples with the buyer's own baselines and confirm where the numbers came from.",
    next:"Model the opportunity"},
  model:{label:"02 / MODEL",title:"Explore what better selling could change.",
    description:"Test pricing, win rates, major accounts and onboarding. Build assumptions with the buyer, not a standard training uplift promise.",
    next:"Compare investment"},
  compare:{label:"03 / COMPARE",title:"How does the opportunity compare with the investment?",
    description:"Compare scenarios on the same horizon. Pipeline sensitivity is intentionally separate to avoid counting deals twice.",
    next:"Present the case"},
  present:{label:"04 / PRESENT",title:"Make the business case together.",
    description:"Share a concise summary of projected value, investment, and assumptions. These are estimates, never guaranteed outcomes.",
    next:"Return to modeling"}
};
function setStep(key){
  if(!Object.prototype.hasOwnProperty.call(JOURNEY,key))return;
  if(key==="present"&&currentStep!=="present")priorStep=currentStep;
  currentStep=key;
  document.body.dataset.stage=key;
  const step=JOURNEY[key];
  put("step-eyebrow",step.label);put("step-title",step.title);
  put("step-description",step.description);put("step-next",step.next);
  document.querySelectorAll("[data-workbench-nav]").forEach(button=>{
    if(button.dataset.workbenchNav===key)button.setAttribute("aria-current","step");
    else if(typeof button.removeAttribute==="function")button.removeAttribute("aria-current");
    else button.setAttribute("aria-current","false");
  });
  $("present").textContent=key==="present"?"Exit presentation":"Present case";
  $("present").setAttribute("aria-pressed",String(key==="present"));
  render();
}


const inputSpecs = {
  prospect:["Prospect / client","text","Client organization"],
  consultant:["Sandler representative","text","Person presenting"],
  monthlyFee:["Monthly program fee","number","USD / month"],
  programMonths:["Evaluation period","number","Months; modeled benefits are prorated"],
  setupFee:["One-time implementation cost","number","USD"],
  participantCount:["People trained","number","For proposal context"],
  trainingHoursPerPerson:["Hours of training per person","number","Total paid hours during the modeled period"],
  participantHourlyCost:["Hourly employee cost","number","Loaded hourly rate in USD"],
  additionalMonthlyCost:["Other recurring monthly costs","number","Additional monthly program costs in USD"],
  travelCost:["Travel and logistics","number","USD total during modeled period"],
  technologyCost:["Technology and licenses","number","USD total during modeled period"],
  adminCost:["Coaching and administration","number","USD total during modeled period"],
  otherCost:["Other implementation costs","number","USD total during modeled period"],
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
  input.addEventListener("input",()=>{
    update(key,input.value);
    if(source===inputs && Object.prototype.hasOwnProperty.call(BASELINE_FIELDS,key)){
      evidence[key]={status:"unconfirmed",source:""};
      renderEvidenceEditor();
    }
    render();
  });
  const hint=document.createElement("div");hint.className="hint";hint.textContent=spec[2]||"";
  wrap.append(label,input,hint);parent.append(wrap);
}

function renderEvidenceEditor(){
  const container=$("evidence-register");container.replaceChildren();
  const keys=requiredEvidenceKeys(inputs,active);
  const pipelineKeys=["pipelineValue","pipelinePeriodWeeks","pipelineRevenueConversionPct","pipelineAttributionPct"];
  if(pipelineKeys.some(key=>inputs[key]!=="" && inputs[key]!==null))
    for(const key of pipelineKeys)keys.push(key);
  for(const key of [...new Set(keys)]){
    const record=evidence[key]||{status:"unconfirmed",source:""};
    const row=document.createElement("div");row.className="field evidence-entry";
    const label=document.createElement("label");label.textContent=BASELINE_FIELDS[key]||key;
    const select=document.createElement("select");
    select.setAttribute("aria-label","Evidence status: "+label.textContent);
    for(const [status,name] of Object.entries(EVIDENCE_STATUSES)){
      const option=document.createElement("option");option.value=status;option.textContent=name;
      select.append(option);
    }
    select.value=record.status;
    const source=document.createElement("input");
    source.type="text";source.maxLength=500;source.value=record.source||"";
    source.placeholder="Source reference, date or owner (if any)";
    source.setAttribute("aria-label","Source reference: "+label.textContent);
    select.addEventListener("change",()=>{evidence[key]={...evidence[key],status:select.value};render();});
    source.addEventListener("input",()=>{evidence[key]={...evidence[key],source:source.value};render();});
    row.append(label,select,source);container.append(row);
  }
}
function renderCostMode(){
  const area=$("cost-mode");area.replaceChildren();
  const label=document.createElement("label");label.htmlFor="cost-mode-select";label.textContent="Investment basis";
  const select=document.createElement("select");select.id="cost-mode-select";
  for(const [value,name] of [["fees","Program fees only"],["expanded","Expanded cost estimate"]]){
    const option=document.createElement("option");option.value=value;option.textContent=name;select.append(option);
  }
  select.value=inputs.costMode;
  select.addEventListener("change",()=>{inputs.costMode=select.value;renderFields();render();});
  const note=document.createElement("div");note.className="hint";
  note.textContent="Expanded mode requires a value or explicit zero for each category. This cannot certify every real-world cost.";
  area.append(label,select,note);
  const extra=$("expanded-cost-fields");extra.replaceChildren();
  extra.classList.toggle("hidden",inputs.costMode!=="expanded");
  if(inputs.costMode==="expanded"){
    for(const key of ["trainingHoursPerPerson","participantHourlyCost","additionalMonthlyCost",
      "travelCost","technologyCost","adminCost","otherCost"])
      field(key,extra,inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
  }
}

function renderFields(){
  $("identity-fields").replaceChildren();
  $("cost-fields").replaceChildren();
  $("baseline-fields").replaceChildren();
  for(const key of ["prospect","consultant"]) field(key,$("identity-fields"),inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
  for(const key of ["monthlyFee","programMonths","setupFee","participantCount"]) field(key,$("cost-fields"),inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
  renderCostMode();
  for(const group of groups){
    const det=document.createElement("details");det.open=group.title==="Pricing discipline";
    const summary=document.createElement("summary");summary.textContent=group.title;
    const inside=document.createElement("div");inside.className="inside";
    for(const key of group.keys) field(key,inside,inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
    det.append(summary,inside);$("baseline-fields").append(det);
  }
  $("pipeline-fields").replaceChildren();
  for(const key of ["pipelineValue","pipelinePeriodWeeks","pipelineRevenueConversionPct","pipelineAttributionPct"])
    field(key,$("pipeline-fields"),inputs,(k,v)=>{inputs[k]=v;},inputSpecs);
  $("evidence-notes").value=inputs.notes||"";
  renderEvidenceEditor();
}
function renderAssumptions(){
  const target=$("assumptions");target.replaceChildren();
  const sections=[
    ["Price realization",["pricePoints","priceCapturePct"]],
    ["Proposal conversion",["winPoints","winCapturePct"]],
    ["Major accounts",["nationalAccounts","accountFirstYearPct","accountCapturePct"]],
    ["Seller ramp",["rampMonthsSaved","rampCapturePct"]],
    ["Overlap adjustment",["overlapPct"]]
  ];
  for(const [name,keys] of sections){
    const group=document.createElement("fieldset");group.className="assumption-group";
    const title=document.createElement("legend");title.textContent=name;group.append(title);
    for(const key of keys){
      const descriptor={[key]:[assumptionSpecs[key][0],"number",assumptionSpecs[key][1]]};
      field(key,group,scenarios[selected],(k,v)=>{scenarios[selected][k]=v;},descriptor);
    }
    target.append(group);
  }
}
function item(name,value,enabled){
  const row=document.createElement("div");row.className="lever";
  const checkWrap=document.createElement("label");checkWrap.className="toggle";
  const check=document.createElement("input");check.type="checkbox";check.checked=enabled;
  check.setAttribute("aria-label","Include "+leverSpecs[name][0]);
  check.addEventListener("change",()=>{active[name]=check.checked;renderEvidenceEditor();render();});
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
  put("cost-basis",result.costMode==="fees"?"Fee-only estimate":"Expanded user-declared estimate");
  put("cost-extras",result.costMode==="fees"?"Other training costs are excluded.":
    "Fees: "+MONEY(result.costBreakdown.feeCost)+" + other modeled costs: "+MONEY(result.costBreakdown.additionalCost)+".");
  const proof=assessEvidence(inputs,evidence,active);
  put("evidence-summary",proof.requiredCount+" required inputs: "+proof.illustrative.length+" illustrative, "+proof.unconfirmed.length+
    " unconfirmed, "+proof.missingSources.length+" citations missing a reference. Not independently verified.");
  put("present-evidence","Input confidence: "+proof.illustrative.length+" illustrative, "+proof.unconfirmed.length+
    " unconfirmed, "+proof.missingSources.length+" citations without a source reference. None independently verified.");
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
  const presentDrivers=$("present-driver-summary");presentDrivers.replaceChildren();
  for(const [name,part] of Object.entries(result.parts)){
    if(part.status==="excluded")continue;
    const entry=document.createElement("div");entry.className="present-driver";
    const label=document.createElement("span");label.className="name";label.textContent=leverSpecs[name][0];
    const amount=document.createElement("strong");amount.className="amount";
    amount.textContent=part.status==="ready"?MONEY(part.value):"Needs input";
    entry.append(label,amount);presentDrivers.append(entry);
  }
  const bars=$("scenario-bars");bars.replaceChildren();
  const variants=Object.entries(scenarios).map(([key,s])=>({key,label:s.label,result:calculate(inputs,s,active)}));
  const max=Math.max(result.cost??0,...variants.map(x=>x.result.benefit??0),1);
  const comparison=$("scenario-table");comparison.replaceChildren();
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
    const tr=document.createElement("tr");
    if(entry.key===selected)tr.className="current";
    const cells=[
      entry.label,
      entry.result.complete?MONEY(entry.result.benefit):"Incomplete",
      entry.result.complete?MONEY(entry.result.net):"Incomplete",
      entry.result.complete?(entry.result.roi===null?"N/A":PERCENT(entry.result.roi)):"Incomplete",
      entry.result.simplePaybackMonths===null?"N/A":entry.result.simplePaybackMonths.toFixed(1)+" months"
    ];
    for(const [index,value] of cells.entries()){
      const cell=document.createElement(index===0?"th":"td");
      if(index===0)cell.setAttribute("scope","row");
      cell.textContent=value;tr.append(cell);
    }
    comparison.append(tr);
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
    ? "For "+client+", the "+scenario.label.toLowerCase()+" scenario models "+MONEY(result.benefit)+" of financial value over "+inputs.programMonths+" months, against a "+MONEY(result.cost)+" "+(result.costMode==="fees"?"program-fee-only":"expanded user-declared")+" investment. That implies "+MONEY(result.net)+" in net modeled value and "+(result.roi===null?"an undefined ROI because cost is zero":PERCENT(result.roi)+" ROI")+". These are discussion assumptions, not historical performance."
    : "Enter the missing financial baselines and assumptions to build a complete, prospect-specific ROI comparison. No total ROI is presented while an included driver remains unverified.");
  put("pitch-caveat","Use prospect-confirmed baselines. "+proof.illustrative.length+" inputs illustrative and "+proof.unconfirmed.length+
    " unconfirmed. Evidence classifications are user-declared, never independently verified. Training outcomes depend on adoption and external conditions. Deduction for overlapping win-rate and major-account value: "+scenario.overlapPct+"%. Evidence notes: "+(inputs.notes||"Not provided."));
}
function snapshot(){
  const result=calculate(inputs,scenarios[selected],active);
  return {schema:"sandler-roi/2",savedAt:new Date().toISOString(),selected,inputs,scenarios,active,evidence,calculated:result};
}
function download(filename,content,type){
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function safeSlug(str){return String(str||"client").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").slice(0,60)||"client";}
function csvCell(value){
  const raw=String(value??"");
  // Excel/Sheets interpret certain user-provided strings as spreadsheet formulas.
  const safe=typeof value==="string"&&/^[\s\u0000-\u001f]*[=+\-@]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
}
$("evidence-notes").addEventListener("input",event=>{inputs.notes=event.target.value;render();});
document.querySelectorAll("[data-scenario]").forEach(button=>button.addEventListener("click",()=>{
  selected=button.dataset.scenario;renderAssumptions();render();
}));
$("export-json").addEventListener("click",()=>download("sandler-roi-"+safeSlug(inputs.prospect)+".json",JSON.stringify(snapshot(),null,2),"application/json"));
$("export-csv").addEventListener("click",()=>{
  const r=calculate(inputs,scenarios[selected],active);
  const rows=[["Metric","Value"],["Prospect",inputs.prospect],["Representative",inputs.consultant],["Scenario",selected],["Complete",r.complete],["Cost scope",r.costMode],["Program fee cost",r.costBreakdown.feeCost],["Additional modeled costs",r.costBreakdown.additionalCost],["Program cost",r.cost],["Benefit",r.benefit],["Net benefit",r.net],["ROI percent",r.roi],["Simple payback months",r.simplePaybackMonths],["Break-even price points",r.breakEvenPricePoints],["Source notes",inputs.notes]];
  for(const [name,part] of Object.entries(r.parts))rows.push([name+" value",part.value], [name+" status",part.status]);
  for(const [name,value] of Object.entries(scenarios[selected]))rows.push(["Assumption "+name,value]);
  for(const [name,value] of Object.entries(inputs))rows.push(["Input "+name,value]);
  for(const [name,record] of Object.entries(evidence)){
    rows.push(["Evidence "+name+" status",record.status],["Evidence "+name+" source",record.source]);
  }
  rows.push(["Evidence independently verified",false],["Model type","hypothetical projection"]);
  download("sandler-roi-"+safeSlug(inputs.prospect)+".csv",rows.map(r=>r.map(csvCell).join(",")).join("\r\n"),"text/csv");
});
document.querySelectorAll("[data-workbench-nav]").forEach(button=>{
  button.addEventListener("click",()=>setStep(button.dataset.workbenchNav));
});
$("step-next").addEventListener("click",()=>{
  const steps=["discover","model","compare","present"];
  setStep(currentStep==="present"?"model":steps[Math.min(3,steps.indexOf(currentStep)+1)]);
});
$("present").addEventListener("click",()=>setStep(currentStep==="present"?priorStep:"present"));
$("print").addEventListener("click",()=>{setStep("present");window.print();});
$("reset").addEventListener("click",()=>{
  if(!window.confirm("Replace all current inputs and assumptions with the illustrative example?"))return;
  inputs=clone(DEFAULT_INPUTS);evidence=defaultEvidence(inputs);scenarios=clone(SCENARIOS);active=clone(DEFAULT_ACTIVE);selected="expected";
  renderFields();renderAssumptions();render();
});
$("import").addEventListener("click",()=>$("import-file").click());
$("import-file").addEventListener("change",async event=>{
  const f=event.target.files?.[0];event.target.value="";if(!f)return;
  if(f.size>2000000){window.alert("JSON file exceeds 2 MB.");return;}
  try {
    const data=JSON.parse(await f.text());
    if(!["sandler-roi/1","sandler-roi/2"].includes(data.schema)||!data.inputs||!data.scenarios||!data.active)throw Error("Unsupported model format");
    const cleanInputs={...clone(DEFAULT_INPUTS)};
    for(const key of Object.keys(cleanInputs))if(Object.prototype.hasOwnProperty.call(data.inputs,key))cleanInputs[key]=data.inputs[key];
    const cleanScenarios=clone(SCENARIOS);
    for(const key of Object.keys(cleanScenarios)){
      if(!data.scenarios[key]||typeof data.scenarios[key]!=="object")continue;
      for(const field of Object.keys(cleanScenarios[key]))if(field!=="label"&&Object.prototype.hasOwnProperty.call(data.scenarios[key],field))cleanScenarios[key][field]=data.scenarios[key][field];
    }
    inputs=cleanInputs;scenarios=cleanScenarios;
    if(data.schema==="sandler-roi/1")inputs.costMode="fees";
    evidence=data.schema==="sandler-roi/2"?normalizeEvidence(data.evidence,cleanInputs):defaultEvidence(cleanInputs);
    active=Object.fromEntries(Object.keys(DEFAULT_ACTIVE).map(k=>[k,data.active[k]===false?false:true]));
    selected=Object.prototype.hasOwnProperty.call(SCENARIOS,data.selected)?data.selected:"expected";
    renderFields();renderAssumptions();render();
  }catch(err){window.alert("Could not import model: "+err.message);}
});
renderFields();renderAssumptions();setStep("discover");
