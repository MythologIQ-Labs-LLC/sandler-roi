/* CSV import for representative-provided customer baselines.
 * A CSV is NOT a Sandler-certified integration or trusted source.
 * All imports are local-only and require an explicit mapping/confirmation.
 */
import {DEFAULT_INPUTS,parseValue} from "./roi.mjs";
import {BASELINE_FIELDS} from "./evidence.mjs";

export const CSV_FIELDS=Object.freeze(["prospect","consultant",...Object.keys(BASELINE_FIELDS)]);
const LABELS=Object.freeze({
  prospect:"Customer name or organization",consultant:"Sandler representative",...BASELINE_FIELDS
});
export const CSV_LABELS=LABELS;
const ALIASES={
  prospect:["company","company name","organization","customer","customer name","client","client name","account name","prospect name"],
  consultant:["rep","rep name","representative","sales rep","sandler rep","owner"],
  monthlyFee:["monthly fee","monthly program cost","training fee monthly","monthly investment"],
  programMonths:["duration months","term months","months","program duration","evaluation months"],
  setupFee:["implementation fee","onboarding fee","initial fee","one time fee"],
  participantCount:["headcount","participants","people trained","trainees"],
  discountedRevenue:["discounted revenue","discount affected revenue","annual discounted revenue"],
  priceProfitFlowPct:["price contribution margin","price contribution","incremental price contribution"],
  annualProposals:["proposals","annual proposals","proposal volume","number of proposals"],
  baselineWinRatePct:["close rate","win rate","baseline win rate","proposal win rate"],
  avgDealValue:["average deal size","average sale","average deal","deal size","deal revenue"],
  grossMarginPct:["gross margin","gross profit margin","margin percent","contribution margin"],
  newAccountsAnnualValue:["major account value","account annual value","national account value"],
  newHires:["new hires","annual hires","number of new hires"],
  rampMonths:["ramp months","onboarding months","time to productivity"],
  annualSellerRevenue:["seller annual revenue","revenue per rep","annual rep revenue"],
  pipelineValue:["qualified pipeline","pipeline","pipeline amount"],
  pipelinePeriodWeeks:["pipeline weeks","weeks observed","pipeline observation weeks"],
  pipelineRevenueConversionPct:["pipeline conversion","pipeline close rate"],
  pipelineAttributionPct:["pipeline attribution","pipeline sensitivity"],
  trainingHoursPerPerson:["training hours","hours per participant"],
  participantHourlyCost:["loaded hourly cost","hourly employee cost","participant rate"],
  additionalMonthlyCost:["monthly support cost","monthly implementation expense"],
  travelCost:["travel","travel expense"],
  technologyCost:["technology","licenses","software cost"],
  adminCost:["administration","coaching cost","admin expense"],
  otherCost:["other expenses","other investment"]
};
export function normalizeHeader(value){
  return String(value??"").normalize("NFKC").trim().toLowerCase()
    .replace(/([a-z])([A-Z])/g,"$1 $2")
    .replace(/([a-z0-9])([A-Z])/g,"$1 $2")
    .replace(/[^a-z0-9]/g,"");
}
export function parseCSV(text){
  if(typeof text!=="string")throw Error("CSV input must be text");
  if(text.length>2_000_000)throw Error("CSV exceeds 2 MB");
  text=text.replace(/^\uFEFF/,"");
  const rows=[];let row=[],cell="",inQuotes=false,endedQuote=false;
  const saveCell=()=>{if(cell.length>8000)throw Error("CSV cell is too long");row.push(cell);cell="";endedQuote=false;if(row.length>100)throw Error("CSV has too many columns")};
  const saveRow=()=>{saveCell();if(rows.length>=501)throw Error("CSV has too many rows");rows.push(row);row=[]};
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQuotes){
      if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}
      else if(ch==='"'){inQuotes=false;endedQuote=true}
      else cell+=ch;
    }else if(endedQuote){
      if(ch===",")saveCell();
      else if(ch==="\n"||ch==="\r"){saveRow();if(ch==="\r"&&text[i+1]==="\n")i++}
      else if(ch===" "||ch==="\t"){} // tolerate whitespace after a quoted field
      else throw Error("Unexpected character following a quoted CSV field");
    }else if(ch==='"'){
      if(cell.trim()!=="")throw Error("Unexpected quotation mark inside CSV field");
      cell="";inQuotes=true;
    }else if(ch===",")saveCell();
    else if(ch==="\n"||ch==="\r"){saveRow();if(ch==="\r"&&text[i+1]==="\n")i++}
    else cell+=ch;
  }
  if(inQuotes)throw Error("Unclosed CSV quotation mark");
  if(cell!==""||row.length||endedQuote)saveRow();
  if(!rows.length)throw Error("CSV is empty");
  const width=rows[0].length;
  if(width<2)throw Error("CSV needs at least two columns");
  if(rows.some(row=>row.length!==width))throw Error("CSV rows have inconsistent column counts");
  return rows;
}

export function prepareCSV(text){
  const rows=parseCSV(text),head=rows[0].map(x=>x.trim());
  const normalized=head.map(normalizeHeader);
  if(head.some(x=>!x))throw Error("CSV contains an empty column heading");
  if(new Set(normalized).size!==normalized.length)throw Error("CSV has duplicate column headings");
  // Long form supports a single record with "field,value" or "metric,value" columns,
  // including the workbench's own existing "Input <field>" export rows.
  if(head.length===2 && ["field","metric","key"].includes(normalized[0]) && ["value","amount"].includes(normalized[1])){
    const values=new Map();
    for(const r of rows.slice(1)){
      let key=r[0].trim();
      if(normalized[0]==="metric"){
        if(!/^Input\s+/i.test(key))continue; // ignore computed ROI and notes
        key=key.replace(/^Input\s+/i,"");
      }
      const norm=normalizeHeader(key);
      if(!norm)continue;
      if(values.has(norm))throw Error("CSV contains duplicate input key: "+key);
      values.set(norm,{key,value:r[1]});
    }
    if(!values.size)throw Error("No input fields found in key/value CSV");
    return {headers:[...values.values()].map(x=>x.key),
      rows:[[...values.values()].map(x=>x.value)],kind:"key-value"};
  }
  const data=rows.slice(1).filter(row=>row.some(value=>value.trim()!==""));
  if(data.length===0)throw Error("CSV has headings but no customer rows");
  return {headers:head,rows:data,kind:"table"};
}

export function suggestMapping(headers){
  const result={};
  const aliases=new Map();
  for(const key of CSV_FIELDS){
    for(const name of [key,LABELS[key],...(ALIASES[key]||[])]){
      const normalized=normalizeHeader(name);
      if(aliases.has(normalized)&&aliases.get(normalized)!==key)aliases.set(normalized,null);
      else if(!aliases.has(normalized))aliases.set(normalized,key);
    }
  }
  const collisions=new Set();
  headers.forEach((name,index)=>{
    const target=aliases.get(normalizeHeader(name));
    if(!target)return;
    if(Object.hasOwn(result,target)){collisions.add(target);return}
    result[target]=index;
  });
  for(const key of collisions)delete result[key]; // ambiguous match requires manual selection
  return result;
}

function cleanNumber(raw,key){
  const value=String(raw??"").trim();
  if(!value)return "";
  // Currency separators are harmless display formatting; percent values
  // remain percentage points (e.g. "40%" becomes "40", not "0.4").
  let cleaned=value.replace(/^\$/,"").replace(/^USD\s*/i,"").trim();
  cleaned=cleaned.replace(/%$/,"").trim();
  if(!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(cleaned))
    throw Error("Invalid number in "+(LABELS[key]||key)+": "+value.slice(0,50));
  cleaned=cleaned.replaceAll(",","");
  const parsed=parseValue(cleaned,key);
  if(parsed.error)throw Error("Invalid "+(LABELS[key]||key)+": "+parsed.error);
  return cleaned;
}

export function mappedCSVPreview(prepared,rowIndex,mapping,fileName="import.csv"){
  if(!prepared||!Array.isArray(prepared.rows)||!Array.isArray(prepared.headers))throw Error("Invalid CSV preview");
  if(!Number.isInteger(rowIndex)||rowIndex<0||rowIndex>=prepared.rows.length)throw Error("Choose a customer record");
  const row=prepared.rows[rowIndex],entries=[],used=new Set();
  for(const field of CSV_FIELDS){
    const col=mapping[field];
    if(col===null||col===undefined||col==="")continue;
    if(!Number.isInteger(Number(col))||Number(col)<0||Number(col)>=row.length)throw Error("Invalid CSV column mapping");
    const index=Number(col);
    if(used.has(index))throw Error("One CSV column cannot map to multiple inputs");
    used.add(index);
    let value=row[index].trim();
    if(!value)continue;
    if(field==="prospect"||field==="consultant"){
      if(value.length>180)throw Error("Client or representative name is too long");
      value=value.replace(/[\u0000-\u001f\u007f]/g," ").trim();
    }else value=cleanNumber(value,field);
    entries.push({field,value,column:prepared.headers[index]});
  }
  if(!entries.length)throw Error("Map at least one non-empty CSV value");
  const filename=String(fileName).split(/[\\/]/).pop().replace(/[\u0000-\u001f]/g,"").slice(0,120);
  return {entries,filename,kind:prepared.kind,rowNumber:rowIndex+2};
}

export function buildCSVImport(preview){
  if(!preview||!Array.isArray(preview.entries)||!preview.entries.length)throw Error("No mapped CSV values");
  const inputs={};
  for(const key of Object.keys(DEFAULT_INPUTS))inputs[key]="";
  inputs.costMode="fees"; // Never assume that omitted costs are zero.
  inputs.notes="Imported CSV data; all source declarations are unconfirmed until independently reviewed.";
  const evidence={};
  for(const entry of preview.entries){
    if(!CSV_FIELDS.includes(entry.field))throw Error("Unexpected input key");
    inputs[entry.field]=entry.value;
    if(Object.hasOwn(BASELINE_FIELDS,entry.field))evidence[entry.field]={
      status:"unconfirmed",
      source:("Imported "+preview.filename+" · "+entry.column).slice(0,500)
    };
  }
  return {inputs,evidence};
}

export const CSV_TEMPLATE_HEADERS=Object.freeze([
  "customer","consultant","monthlyFee","programMonths","setupFee",
  "participantCount","discountedRevenue","priceProfitFlowPct",
  "annualProposals","baselineWinRatePct","avgDealValue","grossMarginPct",
  "newAccountsAnnualValue","newHires","rampMonths","annualSellerRevenue"
]);
