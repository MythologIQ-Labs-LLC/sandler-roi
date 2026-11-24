import test from "node:test";
import assert from "node:assert/strict";
import {calculate,calculateCost,calculatePipelineBridge,DEFAULT_INPUTS,SCENARIOS} from "../src/roi.mjs";

const copy=x=>structuredClone(x);
const active={pricing:true,wins:true,accounts:true,ramp:true};
const only=key=>Object.fromEntries(Object.keys(active).map(k=>[k,k===key]));
const close=(actual,expected,description="value")=>{
  assert.ok(Number.isFinite(actual)&&Number.isFinite(expected),
    description+" must be finite, received "+actual+" / "+expected);
  const tolerance=Math.max(1e-7,Math.abs(expected)*2e-10);
  assert.ok(Math.abs(actual-expected)<=tolerance,
    description+": expected "+expected+", received "+actual);
};

// Independent dimensional model for cross-checking the production implementation.
// Keep this simple and expressed in base fractions/quantities rather than mirroring
// each chained operation in the engine.
function reference(i,s,flags=active){
  const years=i.programMonths/12;
  const margin=i.grossMarginPct*.01;
  const amounts={
    pricing:flags.pricing?(i.discountedRevenue*years)*(s.pricePoints*.01)*(i.priceProfitFlowPct*.01)*(s.priceCapturePct*.01):0,
    wins:flags.wins?(i.annualProposals*years)*(s.winPoints*.01*s.winCapturePct*.01)*i.avgDealValue*margin:0,
    accounts:flags.accounts?(s.nationalAccounts*i.newAccountsAnnualValue)*(s.accountFirstYearPct*.01)*margin*(s.accountCapturePct*.01)*years:0,
    ramp:flags.ramp?(i.newHires*years)*(s.rampMonthsSaved/12)*i.annualSellerRevenue*margin*(s.rampCapturePct*.01):0
  };
  const overlap=(amounts.wins+amounts.accounts)*s.overlapPct*.01;
  const benefit=Object.values(amounts).reduce((a,b)=>a+b,0)-overlap;
  const fees=i.monthlyFee*i.programMonths+i.setupFee;
  const additional=i.costMode==="expanded"
    ?i.participantCount*i.trainingHoursPerPerson*i.participantHourlyCost+
      i.additionalMonthlyCost*i.programMonths+
      i.travelCost+i.technologyCost+i.adminCost+i.otherCost
    :0;
  const cost=fees+additional,net=benefit-cost;
  return {
    amounts,overlap,benefit,cost,net,
    roi:cost>0?100*net/cost:null,
    multiple:cost>0?benefit/cost:null,
    payback:benefit>0?cost*i.programMonths/benefit:null
  };
}
function checkReference(i,s,flags=active,info=""){
  const expected=reference(i,s,flags),actual=calculate(i,s,flags);
  assert.equal(actual.complete,true,info+" "+JSON.stringify(actual.problems));
  for(const [k,value] of Object.entries(expected.amounts)){
    assert.equal(actual.parts[k].status,flags[k]?"ready":"excluded",info+" "+k);
    close(actual.parts[k].value,value,info+" "+k);
  }
  close(actual.deduction,expected.overlap,info+" overlap");
  close(actual.benefit,expected.benefit,info+" benefit");
  close(actual.cost,expected.cost,info+" cost");
  close(actual.net,expected.net,info+" net");
  if(expected.roi!==null)close(actual.roi,expected.roi,info+" ROI");
  if(expected.multiple!==null)close(actual.multiple,expected.multiple,info+" benefit/cost");
  if(expected.payback!==null)close(actual.simplePaybackMonths,expected.payback,info+" payback");
  return actual;
}

test("independent golden scenarios: exact profit, overlap, investment, net, ROI",()=>{
  const cases=[
    ["conservative",12000,18000,0,30000,1800,58200,-21000,-26.515151515151516],
    ["expected",28000,42000,42000,100000,12600,199400,120200,151.76767676767676],
    ["upside",68000,102000,134400,195000,47280,452120,372920,470.85858585858585]
  ];
  for(const [scenario,price,wins,accounts,ramp,overlap,benefit,net,roi] of cases){
    const outcome=checkReference(copy(DEFAULT_INPUTS),copy(SCENARIOS[scenario]),active,scenario);
    for(const [key,want] of Object.entries({pricing:price,wins,accounts,ramp}))
      close(outcome.parts[key].value,want,scenario+" "+key);
    close(outcome.deduction,overlap);
    close(outcome.benefit,benefit);close(outcome.cost,79200);close(outcome.net,net);close(outcome.roi,roi);
  }
});

test("independent 400-case deterministic property audit across input horizon and toggles",()=>{
  let state=0x65adba13;
  const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const integer=(min,max)=>min+Math.floor(rand()*(max-min+1));
  for(let n=0;n<400;n++){
    const i={...copy(DEFAULT_INPUTS),
      programMonths:integer(1,60),monthlyFee:integer(0,50000),setupFee:integer(0,10000),
      discountedRevenue:integer(10000,30000000),priceProfitFlowPct:integer(0,100),
      annualProposals:integer(0,2000),baselineWinRatePct:integer(0,85),
      avgDealValue:integer(0,150000),grossMarginPct:integer(0,95),
      newAccountsAnnualValue:integer(0,250000),
      newHires:integer(0,50),rampMonths:integer(1,24),
      annualSellerRevenue:integer(0,1000000)};
    i.costMode=rand()<.4?"expanded":"fees";
    if(i.costMode==="expanded")Object.assign(i,{
      participantCount:integer(1,100),
      trainingHoursPerPerson:integer(0,80),participantHourlyCost:integer(0,200),
      additionalMonthlyCost:integer(0,1000),travelCost:integer(0,10000),
      technologyCost:integer(0,20000),adminCost:integer(0,30000),
      otherCost:integer(0,5000)
    });
    const s={...copy(SCENARIOS.expected),
      pricePoints:integer(0,500)/100,priceCapturePct:integer(0,100),
      winPoints:integer(0,100-i.baselineWinRatePct),winCapturePct:integer(0,100),
      nationalAccounts:integer(0,5),accountFirstYearPct:integer(0,100),
      accountCapturePct:integer(0,100),rampMonthsSaved:integer(0,i.rampMonths),
      rampCapturePct:integer(0,100),overlapPct:integer(0,100)};
    const enabled=Object.fromEntries(Object.keys(active).map(k=>[k,rand()>.2]));
    checkReference(i,s,enabled,"random case "+n);
  }
});

test("break-even: no price recovery is needed when other drivers already cover cost",()=>{
  const input={...copy(DEFAULT_INPUTS),discountedRevenue:0};
  const result=calculate(input,copy(SCENARIOS.expected),active);
  assert.equal(result.complete,true);
  assert.ok(result.parts.pricing.value===0);
  assert.ok(result.benefit-result.parts.pricing.value>=result.cost);
  assert.equal(result.breakEvenPricePoints,0);
  assert.equal(result.breakEvenStatus,"covered-by-other-drivers");
});

test("break-even: an impossible required price change must not be advertised as achievable",()=>{
  const input={...copy(DEFAULT_INPUTS),discountedRevenue:1};
  const result=calculate(input,copy(SCENARIOS.expected),only("pricing"));
  assert.equal(result.complete,true);
  assert.equal(result.breakEvenPricePoints,null);
  assert.equal(result.breakEvenStatus,"outside-supported-range");
  const noBase=calculate({...input,discountedRevenue:0},copy(SCENARIOS.expected),only("pricing"));
  assert.equal(noBase.breakEvenStatus,"no-eligible-pricing-revenue");
});

test("break-even: applying the computed feasible price-point increase brings net to zero",()=>{
  const input={...copy(DEFAULT_INPUTS),discountedRevenue:10000000};
  const s={...copy(SCENARIOS.expected),priceCapturePct:100};
  const estimate=calculate(input,s,only("pricing"));
  assert.equal(estimate.breakEvenStatus,"within-range");
  assert.ok(estimate.breakEvenPricePoints>0&&estimate.breakEvenPricePoints<100);
  const neutral=calculate(input,{...s,pricePoints:estimate.breakEvenPricePoints},only("pricing"));
  close(neutral.net,0,"break-even net value");
});

test("expanded costs, horizon costs and pipeline sensitivity reconcile independently",()=>{
  const input={...copy(DEFAULT_INPUTS),costMode:"expanded",programMonths:18,
    participantCount:12,trainingHoursPerPerson:15,participantHourlyCost:85,
    additionalMonthlyCost:750,travelCost:1500,technologyCost:650,
    adminCost:750,otherCost:250};
  const actual=checkReference(input,copy(SCENARIOS.expected));
  const cost=calculateCost(input);
  close(cost.components.participantTimeCost,15300);
  close(cost.components.additionalRecurringCost,13500);
  close(actual.cost,6600*18+15300+13500+1500+650+750+250);
  const pipeline=calculatePipelineBridge({...input,pipelineValue:4000000,
    pipelinePeriodWeeks:26,pipelineRevenueConversionPct:7.5,pipelineAttributionPct:25});
  close(pipeline.modeledClosedRevenue,300000);
  close(pipeline.modeledGrossProfit,120000);
  close(pipeline.scenarioAllocatedProfit,30000);
  assert.equal(pipeline.includesInRoi,false);
  close(calculate({...input,pipelineValue:0},SCENARIOS.expected).benefit,actual.benefit);
});

test("numeric precision: reject large-but-finite single and combined contributions",()=>{
  const high={...copy(DEFAULT_INPUTS),programMonths:60,annualProposals:1000000000,
    baselineWinRatePct:0,avgDealValue:1000000000000,grossMarginPct:100};
  const highScenario={...SCENARIOS.expected,winPoints:100,winCapturePct:100};
  const single=calculate(high,highScenario,only("wins"));
  assert.equal(single.complete,false);
  assert.equal(single.benefit,null);
  assert.ok(single.problems.some(p=>p.field==="wins"));
  const multiple={...copy(DEFAULT_INPUTS),programMonths:60,
    discountedRevenue:100000000000000,annualProposals:100,
    baselineWinRatePct:0,avgDealValue:1000000000000,grossMarginPct:100,
    newAccountsAnnualValue:1000000000000};
  const scenario={...SCENARIOS.expected,pricePoints:100,priceCapturePct:100,
    winPoints:100,winCapturePct:100,nationalAccounts:100,
    accountFirstYearPct:100,accountCapturePct:100,overlapPct:0};
  const result=calculate(multiple,scenario,{pricing:true,wins:true,accounts:true,ramp:false});
  assert.equal(result.complete,false);
  assert.equal(result.benefit,null);
  assert.ok(result.problems.some(p=>p.field==="benefit"));
});

test("numeric precision: derived infinite ROI is incomplete rather than displayed",()=>{
  const tiny={...copy(DEFAULT_INPUTS),monthlyFee:1e-320,setupFee:0,programMonths:1};
  const result=calculate(tiny,SCENARIOS.expected);
  assert.equal(result.complete,false);
  assert.equal(result.roi,null);
  assert.equal(result.benefit,null);
  assert.ok(result.problems.some(p=>p.field==="financialResult"));
});

test("simple payback is an extrapolation when calculated months exceed the evaluation",()=>{
  const conservative=calculate(copy(DEFAULT_INPUTS),SCENARIOS.conservative);
  assert.equal(conservative.complete,true);
  assert.ok(conservative.simplePaybackMonths>DEFAULT_INPUTS.programMonths);
  close(conservative.simplePaybackMonths,16.329896907216494);
  assert.ok(conservative.benefit<conservative.cost);
  // Reporting should never claim that the 12-month scenario pays back within 12 months.
});
