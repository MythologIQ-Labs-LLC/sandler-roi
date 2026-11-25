import {INTAKE_SECTIONS,FIELD_BY_KEY,emptyIntake,validateIntake,normalizeAnswer} from "../src/intake-contract.mjs";
import {stageIntakeHandoff} from "../src/intake-handoff.mjs";

const $=id=>document.getElementById(id);
let intake=emptyIntake(),step=0,dirty=false;
const CORE_FIELDS=Object.freeze({
 basics:["customerName","salespeople","averageDealValue","grossMarginPct"],
 prospecting:["meetingsPerRepWeek","targetMeetingsPerRepWeek"],
 closing:["meetingCloseRatePct","targetMeetingCloseRatePct"],
 discounting:["averageDiscountPct","totalDealsAnnual"],
 "deal-size":["targetAverageDealValue"],
 turnover:["salesRepsLostAnnual","replacementCostPerRep","rampMonths"]
});
const filename=str=>"sales-growth-intake-"+String(str||"customer").trim().toLowerCase()
  .replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"").slice(0,55)+".json";
function status(message=""){$("survey-status").textContent=message;}
function fieldElement(type,key,value,attribute={}){
 const input=document.createElement("input");input.id="intake-"+key;input.type=type;
 if(type==="number"){input.min="0";input.step=attribute.integer?"1":"any";
  if(attribute.max!==undefined)input.max=String(attribute.max);}
 input.value=value??"";
 return input;
}
function editAnswer(key,patch){
 const answer=intake.responses[key];
 intake.responses[key]={...answer,...patch};
 dirty=true;
}
function questionNode(field){
 const answer=intake.responses[field.key];
 const wrapper=document.createElement("div");wrapper.className="field";
 const label=document.createElement("label");label.htmlFor="intake-"+field.key;label.textContent=field.label;
 const controls=document.createElement("div");controls.className="controls";
 const input=fieldElement(field.kind==="text"?"text":"number",field.key,answer.value,{
   integer:field.kind==="integer",max:field.kind==="percent"?100:undefined
 });
 if(field.kind==="text")input.maxLength=180;
 const select=document.createElement("select");select.setAttribute("aria-label","Answer source for "+field.label);
 for(const [value,title] of [["unknown","I don't know"],["provided","Customer-reported"],["reference","Published reference"]]){
  const option=document.createElement("option");option.value=value;option.textContent=title;select.append(option);
 }
 select.value=answer.status;
 const reference=document.createElement("div");reference.className="reference-detail";
 const sourceFields=[["title","Publication or source title"],["url","Source URL (HTTPS)"],["date","Publication date"],["population","Applicable population and definitions"],["notes","Applicability notes"]];
 const sourceInputs={};
 for(const [key,title] of sourceFields){
  const sub=document.createElement("label");sub.textContent=title;
  const fieldInput=fieldElement("text",field.key+"-"+key,answer.source[key]||"");
  fieldInput.placeholder=title;
  fieldInput.maxLength=key==="notes"?500:250;
  fieldInput.addEventListener("input",()=>{
   editAnswer(field.key,{source:{...intake.responses[field.key].source,[key]:fieldInput.value}});
  });
  sourceInputs[key]=fieldInput;reference.append(sub,fieldInput);
 }
 function refreshVisibility(){
  input.disabled=select.value==="unknown";
  reference.hidden=select.value!=="reference";
  if(select.value==="unknown"){
   editAnswer(field.key,{value:null,status:"unknown"});
   input.value="";
  } else editAnswer(field.key,{status:select.value});
 }
 select.addEventListener("change",refreshVisibility);
 input.addEventListener("input",()=>{
  let value=null;
  if(input.value.trim()!=="")value=field.kind==="text"?input.value:Number(input.value);
  editAnswer(field.key,{value});
 });
 controls.append(input,select);
 const hint=document.createElement("p");hint.className="hint";
 hint.textContent=field.unit+" · Unavailable data can remain unknown; no number is invented.";
 wrapper.append(label,controls,hint,reference);
 // Initial render should not mark the survey edited.
 input.disabled=answer.status==="unknown";reference.hidden=answer.status!=="reference";
 return wrapper;
}
function reviewNode(){
 const wrapper=$("review-contents");wrapper.replaceChildren();
 for(const section of INTAKE_SECTIONS){
  const card=document.createElement("div");card.className="review-section";
  const title=document.createElement("strong");title.textContent=section.title;card.append(title);
  for(const [key,label] of section.questions){
   const answer=intake.responses[key];
   const p=document.createElement("p"),b=document.createElement("b");b.textContent=label+": ";
   const value=document.createElement("span");
   value.textContent=answer.status==="unknown"?"Unknown":
    (FIELD_BY_KEY[key].kind==="text"?String(answer.value):String(answer.value)+" "+FIELD_BY_KEY[key].unit)+
      (answer.status==="reference"?" (published reference, not a customer fact)":" (customer-reported)");
   p.append(b,value);card.append(p);
   if(answer.status==="reference"){
    const cite=document.createElement("p");cite.className="hint";
    cite.textContent="Source: "+answer.source.title+" · "+answer.source.url+" · Applies to: "+answer.source.population;
    card.append(cite);
   }
  }
  wrapper.append(card);
 }
 $("survey-notes").value=intake.notes;
}
function render(){
 const section=INTAKE_SECTIONS[step],review=step===INTAKE_SECTIONS.length;
 $("step-indicator").textContent="Step "+(step+1)+" of "+(INTAKE_SECTIONS.length+1);
 $("step-count").textContent=(step+1)+" of "+(INTAKE_SECTIONS.length+1);
 $("progress-fill").style.width=((step+1)/(INTAKE_SECTIONS.length+1)*100).toFixed(2)+"%";
 $("step-title").textContent=review?"Review your discovery":section.title;
 $("step-description").textContent=review?"Save the responses in a portable file for later use in the ROI Workbench.":section.description;
 $("question-list").hidden=review;
 $("survey-review").hidden=!review;
 const list=$("question-list");list.replaceChildren();
 if(review)reviewNode();
 else{
  const core=new Set(CORE_FIELDS[section.id]||[]);
  for(const [key] of section.questions)if(core.has(key))list.append(questionNode(FIELD_BY_KEY[key]));
  const more=section.questions.map(q=>q[0]).filter(key=>!core.has(key));
  if(more.length){
   const details=document.createElement("details");details.className="optional-questions";
   const heading=document.createElement("summary");heading.textContent="Additional details (optional)";
   details.append(heading);
   for(const key of more)details.append(questionNode(FIELD_BY_KEY[key]));
   details.open=more.some(key=>intake.responses[key].status!=="unknown");
   list.append(details);
  }
 }
 $("back").disabled=step===0;
 $("next").hidden=review;
 status();
}
function validateSection(){
 if(step>=INTAKE_SECTIONS.length)return;
 const section=INTAKE_SECTIONS[step];
 for(const [key] of section.questions){
  const field=FIELD_BY_KEY[key],answer=intake.responses[key];
  if(answer.status!=="unknown"){
   // Do not silently convert a stated but blank value into a benchmark or customer fact.
   const v=answer.value;
   if((v===null||v===undefined||v==="")&&answer.status!=="unknown")
     throw Error(field.label+": enter a value or choose I don't know");
  }
 }
 // Validate only the visible step. Later incomplete answers must not trap Back/Continue navigation.
 for(const [key] of section.questions)normalizeAnswer(FIELD_BY_KEY[key],intake.responses[key]);
}
$("back").addEventListener("click",()=>{step=Math.max(0,step-1);render();});
$("next").addEventListener("click",()=>{
 try{validateSection();step=Math.min(step+1,INTAKE_SECTIONS.length);render();}
 catch(err){status(err.message);}
});
$("survey-notes").addEventListener("input",e=>{intake.notes=e.target.value;dirty=true;});
$("open-in-workbench").addEventListener("click",()=>{
 try{
  const checked=validateIntake(intake);
  stageIntakeHandoff(window.sessionStorage,checked);
  // Same-tab navigation preserves this origin's sessionStorage. The workbench
  // consumes it once and shows the normal import review before any replacement.
  dirty=false;
  window.location.assign("../?intakeHandoff=1");
 }catch(err){
  status("Unable to open Workbench directly: "+err.message+" You can download the intake JSON instead.");
 }
});
$("download-intake").addEventListener("click",()=>{
 try{
  const checked=validateIntake(intake);
  const data=JSON.stringify({...checked,reviewed:false},null,2);
  const blob=new Blob([data],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename(checked.responses.customerName.value);
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  dirty=false;status("Discovery file download requested. Check your browser downloads.");
 }catch(err){status("Could not export: "+err.message);}
});
$("open-existing").addEventListener("click",()=>{$("intake-file").click();});
$("intake-file").addEventListener("change",async e=>{
 const file=e.target.files?.[0];e.target.value="";if(!file)return;
 if(file.size>500_000){status("Discovery file exceeds 500 KB.");return;}
 if(dirty&&!window.confirm("Replace this unsaved survey with the file you selected?"))return;
 try{intake=validateIntake(JSON.parse(await file.text()));dirty=false;step=0;render();
   status("Discovery file opened. Review the answers before exporting.");}
 catch(err){status("File could not be opened: "+err.message);}
});
window.addEventListener("beforeunload",event=>{
 if(dirty){event.preventDefault();event.returnValue="";}
});
render();
