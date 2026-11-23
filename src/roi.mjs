/* Sandler ROI Workbench calculation engine. No network, dependencies, or hidden business rules. */
export const DEFAULT_INPUTS = {
  prospect: "Example prospect (illustrative)", consultant: "Sandler representative",
  monthlyFee: 6600, programMonths: 12, setupFee: 0, participantCount: 12,
  discountedRevenue: 8000000, priceProfitFlowPct: 100,
  annualProposals: 250, baselineWinRatePct: 25, avgDealValue: 30000,
  grossMarginPct: 40, newAccountsAnnualValue: 300000,
  newHires: 4, rampMonths: 6, annualSellerRevenue: 750000,
  notes: "Illustrative values only. Replace all assumptions with prospect-specific data."
};
export const SCENARIOS = {
  conservative: { label: "Conservative", pricePoints: 0.25, priceCapturePct: 60, winPoints: 1, winCapturePct: 60, nationalAccounts: 0, accountFirstYearPct: 40, accountCapturePct: 60, rampMonthsSaved: 1, rampCapturePct: 30, overlapPct: 10 },
  expected: { label: "Expected", pricePoints: 0.5, priceCapturePct: 70, winPoints: 2, winCapturePct: 70, nationalAccounts: 1, accountFirstYearPct: 50, accountCapturePct: 70, rampMonthsSaved: 2, rampCapturePct: 50, overlapPct: 15 },
  upside: { label: "Upside", pricePoints: 1, priceCapturePct: 85, winPoints: 4, winCapturePct: 85, nationalAccounts: 2, accountFirstYearPct: 70, accountCapturePct: 80, rampMonthsSaved: 3, rampCapturePct: 65, overlapPct: 20 }
};
export const DEFAULT_ACTIVE = { pricing: true, wins: true, accounts: true, ramp: true };
const BOUNDS = {
  monthlyFee:[0,1e11], programMonths:[1,60], setupFee:[0,1e11], participantCount:[1,1e6],
  discountedRevenue:[0,1e14], priceProfitFlowPct:[0,100],
  annualProposals:[0,1e9], baselineWinRatePct:[0,100], avgDealValue:[0,1e12],
  grossMarginPct:[0,100], newAccountsAnnualValue:[0,1e12],
  newHires:[0,1e7], rampMonths:[0,120], annualSellerRevenue:[0,1e12],
  pricePoints:[0,100], priceCapturePct:[0,100], winPoints:[0,100], winCapturePct:[0,100],
  nationalAccounts:[0,1e7], accountFirstYearPct:[0,100], accountCapturePct:[0,100],
  rampMonthsSaved:[0,120], rampCapturePct:[0,100], overlapPct:[0,100]
};
export function parseValue(raw, key) {
  if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) return { value:null, error:"Missing input" };
  if (typeof raw !== "string" && typeof raw !== "number") return { value:null, error:"Not a number" };
  const value = Number(raw);
  const bounds = BOUNDS[key] ?? [0,Number.MAX_SAFE_INTEGER];
  if (!Number.isFinite(value) || value < bounds[0] || value > bounds[1]) return { value:null, error:"Outside allowed range" };
  if (["programMonths","participantCount","annualProposals","newHires","nationalAccounts"].includes(key) && !Number.isInteger(value)) return { value:null, error:"Must be a whole number" };
  return { value, error:null };
}
export function calculate(input, scenario, enabled=DEFAULT_ACTIVE) {
  const problems = [];
  const values = {};
  function need(field, source=input) {
    const v=parseValue(source[field], field);
    if (v.error) problems.push({field, message:v.error});
    return v.value;
  }
  const fee=need("monthlyFee"), months=need("programMonths"), setup=need("setupFee");
  const cost = fee===null || months===null || setup===null ? null : fee*months+setup;
  const scale=months===null ? null : months/12;
  const parts={};
  function lever(name, inputs, assumptions, formula) {
    if (!enabled[name]) { parts[name]={status:"excluded",value:0}; return; }
    const before=problems.length, a={}, b={};
    for(const key of inputs) a[key]=need(key);
    for(const key of assumptions) b[key]=need(key,scenario);
    if(before!==problems.length || scale===null) {parts[name]={status:"needs-input",value:null};return;}
    const output=formula(a,b);
    if(!Number.isFinite(output) || output<0) {
      problems.push({field:name,message:"Invalid financial result"});
      parts[name]={status:"invalid",value:null};
    } else parts[name]={status:"ready",value:output};
  }
  lever("pricing",["discountedRevenue","priceProfitFlowPct"],["pricePoints","priceCapturePct"],
    (a,s)=>a.discountedRevenue*s.pricePoints/100*a.priceProfitFlowPct/100*s.priceCapturePct/100*scale);
  lever("wins",["annualProposals","baselineWinRatePct","avgDealValue","grossMarginPct"],["winPoints","winCapturePct"],
    (a,s)=>{
      if(a.baselineWinRatePct+s.winPoints>100) {problems.push({field:"winPoints",message:"Baseline win rate plus improvement exceeds 100%"});return NaN;}
      return a.annualProposals*s.winPoints/100*a.avgDealValue*a.grossMarginPct/100*s.winCapturePct/100*scale;
    });
  lever("accounts",["newAccountsAnnualValue","grossMarginPct"],["nationalAccounts","accountFirstYearPct","accountCapturePct"],
    (a,s)=>a.newAccountsAnnualValue*s.nationalAccounts*s.accountFirstYearPct/100*a.grossMarginPct/100*s.accountCapturePct/100*scale);
  lever("ramp",["newHires","rampMonths","annualSellerRevenue","grossMarginPct"],["rampMonthsSaved","rampCapturePct"],
    (a,s)=>{
      if(s.rampMonthsSaved>a.rampMonths) {problems.push({field:"rampMonthsSaved",message:"Months saved cannot exceed the current ramp"});return NaN;}
      return a.newHires*s.rampMonthsSaved/12*a.annualSellerRevenue*a.grossMarginPct/100*s.rampCapturePct/100*scale;
    });
  const overlap=need("overlapPct",scenario);
  const complete=cost!==null && overlap!==null && Object.values(parts).every(v=>v.status==="ready" || v.status==="excluded");
  const known=Object.values(parts).filter(v=>v.status==="ready").reduce((sum,v)=>sum+v.value,0);
  const wins=parts.wins?.value??0, accounts=parts.accounts?.value??0;
  const deduction=overlap===null ? null : (wins+accounts)*overlap/100;
  const benefit=complete ? Math.max(0,known-deduction) : null;
  const net=benefit===null?null:benefit-cost;
  const roi=net===null||cost===0?null:net/cost*100;
  const multiple=benefit===null||cost===0?null:benefit/cost;
  const simplePaybackMonths=benefit===null||benefit<=0||months===null?null:cost/(benefit/months);
  let breakEvenPricePoints=null;
  if(complete && enabled.pricing && scale>0){
    const revenue=parseValue(input.discountedRevenue,"discountedRevenue").value;
    const flow=parseValue(input.priceProfitFlowPct,"priceProfitFlowPct").value;
    const capture=parseValue(scenario.priceCapturePct,"priceCapturePct").value;
    const denominator=revenue*flow/100*capture/100*scale;
    const others=(parts.wins.value??0)+(parts.accounts.value??0)+(parts.ramp.value??0)-deduction;
    if(denominator>0) breakEvenPricePoints=Math.max(0,(cost-others)/denominator*100);
  }
  return {cost,parts,knownBenefit:overlap===null?null:Math.max(0,known-deduction),deduction,benefit,net,roi,multiple,simplePaybackMonths,breakEvenPricePoints,complete,problems};
}
export const MONEY = value=>value===null?"Needs input":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
export const PERCENT = value=>value===null?"Needs input":value.toFixed(1)+"%";
