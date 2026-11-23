import test from "node:test";
import assert from "node:assert/strict";
import {calculate, parseValue, DEFAULT_INPUTS, SCENARIOS} from "../src/roi.mjs";

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
