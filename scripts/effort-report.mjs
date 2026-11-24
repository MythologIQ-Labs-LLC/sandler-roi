import {readFile} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";

const LEDGER_URL=new URL("../docs/engagement/effort-ledger.json",import.meta.url);
const METHODS=new Set([
  "owner-ballpark","retrospective-active-attention-estimate",
  "observed-active-session","owner-confirmed"
]);
const APPROVALS=new Set(["unreviewed","owner-confirmed","excluded"]);
function round(value){return Math.round((value+Number.EPSILON)*100)/100;}

export function summarizeEffort(ledger){
  if(!ledger||ledger.schema!=="sandler-roi/effort-ledger/1"||!Array.isArray(ledger.entries))
    throw Error("Unrecognized effort ledger schema");
  const ids=new Set();
  const byMethod={},byPhase={};
  let estimated=0,confirmed=0,excluded=0;
  for(const row of ledger.entries){
    if(!row||typeof row!=="object"||!row.id||ids.has(row.id))
      throw Error("Missing or duplicate effort entry ID");
    ids.add(row.id);
    if(typeof row.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||
       Number.isNaN(Date.parse(row.date+"T00:00:00Z")))
      throw Error("Invalid date for "+row.id);
    if(typeof row.phase!=="string"||!row.phase.trim()||
       typeof row.reference!=="string"||!row.reference.startsWith("https://github.com/")||
       typeof row.notes!=="string"||!row.notes.trim())
      throw Error("Missing phase, GitHub evidence link or estimation notes for "+row.id);
    if(!Number.isFinite(row.hours)||row.hours<=0||row.hours>24)
      throw Error("Effort hours must be a positive finite number <=24: "+row.id);
    if(!METHODS.has(row.method)||!APPROVALS.has(row.approval)||
       !["low","medium","high"].includes(row.confidence))
      throw Error("Missing or invalid estimate method, owner review or confidence for "+row.id);
    estimated+=row.hours;
    if(row.approval==="owner-confirmed")confirmed+=row.hours;
    if(row.approval==="excluded")excluded+=row.hours;
    byMethod[row.method]=(byMethod[row.method]??0)+row.hours;
    byPhase[row.phase]=(byPhase[row.phase]??0)+row.hours;
  }
  const mapRound=entries=>Object.fromEntries(
    Object.entries(entries).map(([key,value])=>[key,round(value)]));
  return {
    entryCount:ledger.entries.length,
    totalTrackedHours:round(estimated),
    provisionalHours:round(estimated-confirmed-excluded),
    ownerConfirmedHours:round(confirmed),
    excludedHours:round(excluded),
    byMethod:mapRound(byMethod),
    byPhase:mapRound(byPhase),
    invoiceableHours:null,
    caveat:"Tracked effort is approximate and public. Chargeability and rates require a separate owner/client agreement; these figures are not an invoice."
  };
}

async function main(){
  const raw=JSON.parse(await readFile(LEDGER_URL,"utf8"));
  const output=summarizeEffort(raw);
  if(process.argv.includes("--json"))console.log(JSON.stringify(output,null,2));
  else {
    console.log("Sandler ROI Workbench | effort estimate (not an invoice)");
    console.log("Recorded entries: "+output.entryCount);
    console.log("Total tracked: approximately "+output.totalTrackedHours.toFixed(2)+" hours");
    console.log("Unreviewed: "+output.provisionalHours.toFixed(2)+" hours");
    console.log("Owner-confirmed: "+output.ownerConfirmedHours.toFixed(2)+" hours");
    console.log("Excluded: "+output.excludedHours.toFixed(2)+" hours");
    console.log("By estimation method:");
    for(const [kind,hours] of Object.entries(output.byMethod))
      console.log("  "+kind+": "+hours.toFixed(2)+" h");
    console.log("Note: GitHub Actions runtime and commit age are not counted as human labor.");
    console.log("No invoicing approval or billing rate is stored in this public repository.");
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main();
