import test from "node:test";
import assert from "node:assert/strict";
import {calculate, calculateCost, calculatePipelineBridge, parseValue, DEFAULT_INPUTS, SCENARIOS} from "../src/roi.mjs";

const baseline=()=>structuredClone(DEFAULT_INPUTS);
const expected=()=>structuredClone(SCENARIOS.expected);
const only=name=>({pricing:false,wins:false,accounts:false,ramp:false,[name]:true});
const near=(actual,want,epsilon=1e-8)=>assert.ok(Math.abs(actual-want)<epsilon, "expected "+want+", got "+actual);

test("program cost: monthly rate times months plus one-time fees",()=>{
  const a=calculate({...baseline(),monthlyFee:6600,programMonths:12,setupFee:1000},expected(),{});
  assert.equal(a.cost,80200);
});
test("pricing uses percentage points and contribution/realization rates",()=>{
  const a=calculate({...baseline(),discountedRevenue:21000000,priceProfitFlowPct:100}, {...expected(),pricePoints:0.5,priceCapturePct:100},only("pricing"));
  assert.equal(a.complete,true);
  near(a.parts.pricing.value,105000);
  near(a.roi,(105000-79200)/79200*100);
});
test("conservative 0.25 price points realizes $52,500 at full capture",()=>{
  const a=calculate({...baseline(),discountedRevenue:21000000}, {...expected(),pricePoints:0.25,priceCapturePct:100},only("pricing"));
  near(a.benefit,52500);
  near(a.net,-26700);
});
test("win-rate contribution uses proposals times percentage-point change",()=>{
  const a=calculate({...baseline(),annualProposals:100,baselineWinRatePct:20,avgDealValue:20000,grossMarginPct:40}, {...expected(),winPoints:2,winCapturePct:100,overlapPct:0},only("wins"));
  near(a.benefit,16000);
});
test("major accounts use year-one captured revenue and margin",()=>{
  const a=calculate({...baseline(),newAccountsAnnualValue:300000,grossMarginPct:40}, {...expected(),nationalAccounts:2,accountFirstYearPct:50,accountCapturePct:100,overlapPct:0},only("accounts"));
  near(a.benefit,120000);
});
test("ramp impact uses fractional year of recovered productive selling",()=>{
  const a=calculate({...baseline(),newHires:4,rampMonths:6,annualSellerRevenue:600000,grossMarginPct:50}, {...expected(),rampMonthsSaved:2,rampCapturePct:100},only("ramp"));
  near(a.benefit,200000);
});
test("overlap removes joint win-rate and national-account benefit, not price or ramp",()=>{
  const i={...baseline(),discountedRevenue:10000000,annualProposals:100,avgDealValue:20000,grossMarginPct:50,newAccountsAnnualValue:100000};
  const s={...expected(),pricePoints:1,priceCapturePct:100,winPoints:2,winCapturePct:100,nationalAccounts:1,accountFirstYearPct:100,accountCapturePct:100,rampMonthsSaved:0,overlapPct:50};
  const a=calculate(i,s);
  near(a.parts.pricing.value,100000);
  near(a.parts.wins.value,20000);
  near(a.parts.accounts.value,50000);
  near(a.deduction,35000);
  near(a.benefit,100000+20000+50000-35000);
});
test("blank needed input produces incomplete result, not fabricated zero ROI",()=>{
  const a=calculate({...baseline(),discountedRevenue:""},expected(),only("pricing"));
  assert.equal(a.complete,false);
  assert.equal(a.parts.pricing.status,"needs-input");
  assert.equal(a.benefit,null);
  assert.equal(a.roi,null);
  assert.ok(a.problems.some(p=>p.field==="discountedRevenue"));
});
test("disabled driver never requires its baseline inputs",()=>{
  const a=calculate({...baseline(),discountedRevenue:""},expected(),only("wins"));
  assert.equal(a.complete,true);
  assert.equal(a.parts.pricing.status,"excluded");
});
test("win rate above 100 percent is invalid",()=>{
  const a=calculate({...baseline(),baselineWinRatePct:99},{...expected(),winPoints:2},only("wins"));
  assert.equal(a.complete,false);
  assert.ok(a.problems.some(p=>p.field==="winPoints"));
});
test("ramp acceleration cannot exceed current onboarding time",()=>{
  const a=calculate({...baseline(),rampMonths:1},{...expected(),rampMonthsSaved:2},only("ramp"));
  assert.equal(a.complete,false);
  assert.ok(a.problems.some(p=>p.field==="rampMonthsSaved"));
});
test("strictly reject negative, nonfinite and nonsensical inputs",()=>{
  assert.notEqual(parseValue(-1,"monthlyFee").error,null);
  assert.notEqual(parseValue(Infinity,"avgDealValue").error,null);
  assert.notEqual(parseValue("banana","annualProposals").error,null);
  assert.notEqual(parseValue(0.5,"annualProposals").error,null);
  assert.notEqual(parseValue(101,"grossMarginPct").error,null);
});
test("zero program cost does not produce infinite ROI or payback",()=>{
  const a=calculate({...baseline(),monthlyFee:0,setupFee:0},expected());
  assert.equal(a.cost,0);
  assert.equal(a.roi,null);
  assert.equal(a.multiple,null);
  assert.equal(a.simplePaybackMonths,0);
});
test("single-driver break-even is the cost divided by eligible revenue and capture",()=>{
  const a=calculate({...baseline(),discountedRevenue:21000000,priceProfitFlowPct:100}, {...expected(),priceCapturePct:100},only("pricing"));
  near(a.breakEvenPricePoints,79200/21000000*100);
});
test("baseline example produces increasing conservative, expected and upside benefits",()=>{
  const b=baseline();
  const a=calculate(b,SCENARIOS.conservative);
  const c=calculate(b,SCENARIOS.expected);
  const d=calculate(b,SCENARIOS.upside);
  assert.ok(a.complete&&c.complete&&d.complete);
  assert.ok(a.benefit<c.benefit && c.benefit<d.benefit);
});
test("evaluation term scales revenue benefit and recurring program cost",()=>{
  const i=baseline(),s={...expected(),pricePoints:1,priceCapturePct:100};
  const year=calculate({...i,programMonths:12},s,only("pricing"));
  const half=calculate({...i,programMonths:6},s,only("pricing"));
  near(half.benefit,year.benefit/2);
  near(half.cost,year.cost/2);
});

test("pipeline bridge calculates prospective revenue, margin, allocation without adding to ROI",()=>{
  const i={...baseline(),pipelineValue:6000000,pipelinePeriodWeeks:10,pipelineRevenueConversionPct:10,pipelineAttributionPct:50,grossMarginPct:40};
  const before=calculate(i,expected());
  const p=calculatePipelineBridge(i);
  const after=calculate(i,expected());
  assert.equal(p.complete,true);
  near(p.modeledClosedRevenue,600000);
  near(p.modeledGrossProfit,240000);
  near(p.scenarioAllocatedProfit,120000);
  assert.equal(p.periodWeeks,10);
  assert.equal(p.includesInRoi,false);
  assert.equal(after.benefit,before.benefit);
});
test("blank pipeline inputs do not make the main ROI model incomplete",()=>{
  const i=baseline();
  const p=calculatePipelineBridge(i);
  assert.equal(p.complete,false);
  assert.equal(p.modeledClosedRevenue,null);
  assert.ok(p.problems.some(x=>x.field==="pipelineValue"));
  assert.equal(calculate(i,expected()).complete,true);
});
test("pipeline bridge refuses invalid weeks and over-100 percent conversion",()=>{
  const i={...baseline(),pipelineValue:100000,pipelinePeriodWeeks:0,pipelineRevenueConversionPct:120,pipelineAttributionPct:50};
  const p=calculatePipelineBridge(i);
  assert.equal(p.complete,false);
  assert.equal(p.scenarioAllocatedProfit,null);
  assert.ok(p.problems.some(x=>x.field==="pipelinePeriodWeeks"));
  assert.ok(p.problems.some(x=>x.field==="pipelineRevenueConversionPct"));
});
test("pipeline bridge retains zero as a real value distinct from missing",()=>{
  const i={...baseline(),pipelineValue:0,pipelinePeriodWeeks:10,pipelineRevenueConversionPct:10,pipelineAttributionPct:50};
  const p=calculatePipelineBridge(i);
  assert.equal(p.complete,true);
  assert.equal(p.modeledClosedRevenue,0);
});

test("expanded investment equals fees plus time, recurring and one-time costs",()=>{
 const i={...baseline(),costMode:"expanded",participantCount:12,
 trainingHoursPerPerson:20,participantHourlyCost:50,additionalMonthlyCost:100,
 travelCost:2000,technologyCost:3000,adminCost:4000,otherCost:1000};
 const c=calculateCost(i);
 assert.equal(c.feeCost,79200);
 assert.equal(c.components.participantTimeCost,12000);
 assert.equal(c.components.additionalRecurringCost,1200);
 assert.equal(c.additionalCost,23200);
 assert.equal(c.total,102400);
 const r=calculate(i,expected());
 assert.equal(r.cost,102400);
 near(r.net,r.benefit-102400);
});
test("expanded costs require explicit zero, not silent missing equals zero",()=>{
 const i={...baseline(),costMode:"expanded"};
 const c=calculateCost(i);
 assert.equal(c.total,null);
 assert.ok(c.problems.some(p=>p.field==="participantHourlyCost"));
 const r=calculate(i,expected());
 assert.equal(r.complete,false);
 assert.equal(r.cost,null);
 assert.equal(r.roi,null);
});
test("fee-only mode ignores unknown expanded fields while retaining fee result",()=>{
 const i={...baseline(),costMode:"fees"};
 const a=calculate(i,expected());
 assert.equal(a.complete,true);
 assert.equal(a.cost,79200);
 assert.equal(a.costMode,"fees");
});
test("unknown cost mode fails closed rather than reverts to fees",()=>{
 const r=calculate({...baseline(),costMode:"fake"},expected());
 assert.equal(r.complete,false);
 assert.equal(r.cost,null);
 assert.ok(r.problems.some(p=>p.field==="costMode"));
});
test("invalid expanded cost cannot produce finite-looking ROI",()=>{
 const i={...baseline(),costMode:"expanded",participantCount:1e6,
 trainingHoursPerPerson:10000,participantHourlyCost:1e6,additionalMonthlyCost:0,
 travelCost:0,technologyCost:0,adminCost:0,otherCost:0};
 const r=calculate(i,expected());
 assert.equal(r.complete,false);
 assert.equal(r.cost,null);
 assert.equal(r.roi,null);
 assert.ok(r.problems.some(p=>p.field==="cost"));
});
test("expanded 6-month investment prorates recurring but not upfront time/travel",()=>{
 const i={...baseline(),costMode:"expanded",programMonths:6,participantCount:2,
 trainingHoursPerPerson:10,participantHourlyCost:100,additionalMonthlyCost:100,
 travelCost:500,technologyCost:0,adminCost:0,otherCost:0};
 const c=calculateCost(i);
 assert.equal(c.feeCost,39600);
 assert.equal(c.additionalCost,3100);
 assert.equal(c.total,42700);
});
