/**
 * Prospect input provenance declarations, kept separate from numerical validity.
 * Every classification is rep-entered (or imported), never independently proven.
 */
export const EVIDENCE_STATUSES = Object.freeze({
  illustrative: "Illustrative example",
  unconfirmed: "Unconfirmed prospect figure",
  "prospect-reported": "Prospect-reported",
  "document-cited": "Document cited (user-declared)",
  "external-reference": "Published reference (not customer data)",
  "finance-reviewed": "Finance-reviewed (user-declared)"
});

export const BASELINE_FIELDS = Object.freeze({
  monthlyFee:"Monthly program fee",programMonths:"Evaluation period",setupFee:"One-time setup fee",
  participantCount:"Participants",discountedRevenue:"Discount-affected annual revenue",
  priceProfitFlowPct:"Price contribution rate",annualProposals:"Annual proposals",
  baselineWinRatePct:"Baseline win rate",avgDealValue:"Average deal revenue",
  grossMarginPct:"Incremental gross margin",newAccountsAnnualValue:"Major account annual value",
  newHires:"Annual new hires",rampMonths:"Current ramp duration",
  annualSellerRevenue:"Annual revenue/productive seller",
  trainingHoursPerPerson:"Training hours per participant",
  participantHourlyCost:"Loaded participant hourly cost",
  additionalMonthlyCost:"Additional monthly implementation expense",
  travelCost:"Travel and logistics",technologyCost:"Software and technology",
  adminCost:"Coaching and administration",otherCost:"Other investment",
  pipelineValue:"Qualified pipeline",pipelinePeriodWeeks:"Pipeline observation weeks",
  pipelineRevenueConversionPct:"Pipeline-to-revenue expectation",
  pipelineAttributionPct:"Pipeline sensitivity factor"
});
const CORE = Object.freeze(["monthlyFee","programMonths","setupFee"]);
const DRIVER = Object.freeze({
  pricing:["discountedRevenue","priceProfitFlowPct"],
  wins:["annualProposals","baselineWinRatePct","avgDealValue","grossMarginPct"],
  accounts:["newAccountsAnnualValue","grossMarginPct"],
  ramp:["newHires","rampMonths","annualSellerRevenue","grossMarginPct"]
});
const EXPANDED = Object.freeze([
  "participantCount","trainingHoursPerPerson","participantHourlyCost","additionalMonthlyCost",
  "travelCost","technologyCost","adminCost","otherCost"
]);

export function requiredEvidenceKeys(input,enabled={pricing:true,wins:true,accounts:true,ramp:true}) {
  const set=new Set(CORE);
  for(const [driver,keys] of Object.entries(DRIVER))
    if(enabled[driver]!==false)for(const key of keys)set.add(key);
  if(input.costMode==="expanded")for(const key of EXPANDED)set.add(key);
  return [...set];
}
export function defaultEvidence(input) {
  const out={};
  for(const key of Object.keys(BASELINE_FIELDS)){
    const v=input[key];
    out[key]={status:v===null || v===undefined || (typeof v==="string"&&v.trim()==="")?
      "unconfirmed":"illustrative",source:""};
  }
  return out;
}
export function normalizeEvidence(candidate,input) {
  const out=defaultEvidence(input);
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))return out;
  for(const key of Object.keys(out)) {
    const record=candidate[key];
    if(!record||typeof record!=="object"||Array.isArray(record))continue;
    const status=typeof record.status==="string"&&Object.hasOwn(EVIDENCE_STATUSES,record.status)
      ?record.status:"unconfirmed";
    const source=typeof record.source==="string"?record.source.trim().slice(0,500):"";
    out[key]={status,source};
  }
  return out;
}
export function assessEvidence(input,evidence,enabled) {
  const normalized=normalizeEvidence(evidence,input);
  const keys=requiredEvidenceKeys(input,enabled);
  const illustrative=[],unconfirmed=[],missingSources=[],claimed=[];
  for(const key of keys){
    const record=normalized[key];
    if(record.status==="illustrative")illustrative.push(key);
    if(record.status==="unconfirmed")unconfirmed.push(key);
    if((record.status==="document-cited"||record.status==="external-reference"||record.status==="finance-reviewed")&&!record.source)
      missingSources.push(key);
    if(record.status==="prospect-reported"||record.status==="document-cited"||record.status==="external-reference"||record.status==="finance-reviewed")
      claimed.push(key);
  }
  return {
    requiredCount:keys.length,illustrative,unconfirmed,missingSources,claimed,
    declarationsComplete:!illustrative.length&&!unconfirmed.length&&!missingSources.length,
    independentlyVerified:false,
    notice:"Input statuses are rep/user declarations, not independently checked evidence; projected benefits remain hypothetical."
  };
}
