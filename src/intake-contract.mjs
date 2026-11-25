/* Canonical interchange contract between standalone Sandler discovery intake
 * and ROI Workbench. No UI, network, storage or financial formulas.
 */
export const INTAKE_SCHEMA="sandler-discovery-intake/1";
export const INTAKE_SECTIONS=Object.freeze([
 {id:"basics",title:"Business basics",description:"Understand today's sales team and transaction values.",questions:[
  ["customerName","Customer or organization","text","name"],
  ["salespeople","Number of salespeople","integer","people"],
  ["dealsPerRepMonth","Average deals per salesperson each month","number","deals/rep/month"],
  ["averageDealValue","Current average deal value","number","USD/deal"],
  ["averageAnnualClientValue","Average annual client value","number","USD/client/year"],
  ["grossMarginPct","Incremental gross margin","percent","percent"]
 ]},
 {id:"prospecting",title:"Prospecting",description:"How many first meetings are happening today?",questions:[
  ["meetingsPerRepWeek","First meetings per rep per week","number","meetings/rep/week"],
  ["targetMeetingsPerRepWeek","Realistic target first meetings per rep per week","number","meetings/rep/week"]
 ]},
 {id:"closing",title:"Closing",description:"Identify exactly which stage your closing ratio measures.",questions:[
  ["meetingCloseRatePct","Current meetings-to-closed-deal rate","percent","percent"],
  ["targetMeetingCloseRatePct","Target meetings-to-closed-deal rate","percent","percent"],
  ["annualProposals","Commercial proposals per year","integer","proposals/year"],
  ["proposalWinRatePct","Current proposal-to-win rate","percent","percent"]
 ]},
 {id:"discounting",title:"Discounting",description:"Explore selling price relative to agreed terms.",questions:[
  ["averageDiscountPct","Average discount from standard list price","percent","percent"],
  ["standardListPrice","Typical list price per deal","number","USD/deal"],
  ["totalDealsAnnual","Deals closed last year","integer","deals/year"],
  ["discountAffectedAnnualRevenue","Annual revenue exposed to discounting","number","USD/year"]
 ]},
 {id:"deal-size",title:"Deal size",description:"Understand the gap between current and desirable order value.",questions:[
  ["targetAverageDealValue","Realistic target average deal value","number","USD/deal"]
 ]},
 {id:"turnover",title:"Sales turnover",description:"Understand hiring, replacement and ramp assumptions.",questions:[
  ["salesRepsLostAnnual","Salespeople who left last year","integer","people/year"],
  ["replacementCostPerRep","Cost of replacing and training one rep","number","USD/person"],
  ["rampMonths","Months until a new rep is fully productive","number","months"],
  ["newHiresAnnual","New salespeople hired each year","integer","people/year"],
  ["annualRevenuePerProductiveSeller","Annual revenue per productive salesperson","number","USD/rep/year"]
 ]}
]);
export const INTAKE_FIELDS=Object.freeze(INTAKE_SECTIONS.flatMap(section=>
 section.questions.map(([key,label,kind,unit])=>Object.freeze({key,label,kind,unit,section:section.id}))));
export const FIELD_BY_KEY=Object.freeze(Object.fromEntries(INTAKE_FIELDS.map(x=>[x.key,x])));
export const WORKBENCH_MAP=Object.freeze({
 customerName:"prospect",averageDealValue:"avgDealValue",grossMarginPct:"grossMarginPct",
 annualProposals:"annualProposals",proposalWinRatePct:"baselineWinRatePct",
 discountAffectedAnnualRevenue:"discountedRevenue",
 rampMonths:"rampMonths",newHiresAnnual:"newHires",annualRevenuePerProductiveSeller:"annualSellerRevenue"
});
const MAX_TEXT=180;
const statuses=new Set(["provided","reference","unknown"]);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const plain=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
export function normalizeAnswer(field,candidate){
 const answer=plain(candidate)?candidate:{};
 const status=statuses.has(answer.status)?answer.status:"unknown";
 let value=null;
 if(status!=="unknown"){
  if(field.kind==="text"){
   if(typeof answer.value!=="string"||!answer.value.trim()||answer.value.length>MAX_TEXT)throw Error(field.label+": enter a valid name");
   value=answer.value.trim();
  }else{
   if((typeof answer.value!=="number"&&typeof answer.value!=="string")||String(answer.value).trim()==="")throw Error(field.label+": invalid number");
   value=Number(answer.value);
   if(!Number.isFinite(value)||value<0||value>1e12||
     (field.kind==="percent"&&value>100)||
     (field.kind==="integer"&&!Number.isInteger(value)))throw Error(field.label+": outside allowed range");
  }
 }
 const source=plain(answer.source)?answer.source:{};
 const kind=status==="provided"?"customer-reported":status==="reference"?"published-reference":"unknown";
 // Source content is descriptive only; it is never executable and is not fetched.
 const sourceData={kind,
  title:typeof source.title==="string"?source.title.slice(0,250):"",
  url:typeof source.url==="string"&&/^https:\/\/[^\s]{1,500}$/.test(source.url)?source.url:"",
  date:typeof source.date==="string"?source.date.slice(0,50):"",
  population:typeof source.population==="string"?source.population.slice(0,250):"",
  notes:typeof source.notes==="string"?source.notes.slice(0,500):""
 };
 if(status==="reference"&&(!sourceData.title||!sourceData.url||!sourceData.population))
  throw Error(field.label+": published reference requires title, HTTPS URL and applicable population");
 return {value,status,unit:field.unit,source:sourceData};
}
export function emptyIntake(){
 return {schema:INTAKE_SCHEMA,createdAt:new Date().toISOString(),responses:Object.fromEntries(
   INTAKE_FIELDS.map(field=>[field.key,normalizeAnswer(field,null)])),
   notes:"",reviewed:false};
}
export function validateIntake(candidate){
 if(!plain(candidate)||candidate.schema!==INTAKE_SCHEMA||!plain(candidate.responses))
  throw Error("Unsupported discovery intake file");
 const responses={};
 for(const field of INTAKE_FIELDS){
  const ans=candidate.responses[field.key];
  if(ans?.unit!==undefined&&ans.unit!==field.unit)
   throw Error(field.label+": incompatible unit");
  responses[field.key]=normalizeAnswer(field,ans);
 }
 return {
  schema:INTAKE_SCHEMA,
  createdAt:typeof candidate.createdAt==="string"&&Number.isFinite(Date.parse(candidate.createdAt))
   ?candidate.createdAt:new Date().toISOString(),
  responses,
  notes:typeof candidate.notes==="string"?candidate.notes.slice(0,2000):"",
  reviewed:candidate.reviewed===true
 };
}
/** A reviewed, explicit bridge. Never convert a meetings-based close rate into a proposal win rate. */
export function previewWorkbenchImport(intake){
 const valid=validateIntake(intake),mapped=[],unmapped=[],unknown=[];
 for(const field of INTAKE_FIELDS){
  const ans=valid.responses[field.key],target=WORKBENCH_MAP[field.key];
  if(ans.status==="unknown"){unknown.push(field.key);continue;}
  if(target)mapped.push({key:field.key,target,value:ans.value,unit:ans.unit,status:ans.status,source:ans.source});
  else unmapped.push({key:field.key,reason:"Collected for discovery; no approved ROI mapping"});
 }
 return {valid,mapped,unmapped,unknown};
}
