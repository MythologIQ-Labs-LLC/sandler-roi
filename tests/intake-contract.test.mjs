import test from "node:test";
import assert from "node:assert/strict";
import {emptyIntake,validateIntake,previewWorkbenchImport,INTAKE_SCHEMA,INTAKE_SECTIONS} from "../src/intake-contract.mjs";
import {buildWorkbenchFromIntake} from "../src/intake-bridge.mjs";
import {calculate,SCENARIOS} from "../src/roi.mjs";
import {normalizeEvidence,MAX_EVIDENCE_SOURCE_LENGTH} from "../src/evidence.mjs";

function provided(intake,key,value){
 intake.responses[key]={...intake.responses[key],status:"provided",value};
}
test("survey is a separate, six-section product contract with unknown answers, not demo data",()=>{
 const intake=emptyIntake();
 assert.equal(intake.schema,INTAKE_SCHEMA);
 assert.equal(INTAKE_SECTIONS.length,6);
 assert.ok(Object.values(intake.responses).every(x=>x.status==="unknown"&&x.value===null));
 const result=buildWorkbenchFromIntake(intake);
 assert.equal(result.inputs.avgDealValue,"");
 assert.equal(result.inputs.annualProposals,"");
 assert.equal(result.inputs.monthlyFee,"");
 assert.equal(result.inputs.discountedRevenue,"");
 assert.equal(result.inputs.prospect,"");
 assert.equal(calculate(result.inputs,SCENARIOS.expected).complete,false);
});

test("survey map preserves distinct proposal and meeting denominators",()=>{
 const intake=emptyIntake();
 provided(intake,"customerName","Example manufacturer");
 provided(intake,"averageDealValue",20000);
 provided(intake,"grossMarginPct",35);
 provided(intake,"meetingCloseRatePct",28);
 provided(intake,"proposalWinRatePct",32);
 provided(intake,"annualProposals",450);
 provided(intake,"salespeople",7);
 const preview=previewWorkbenchImport(intake);
 const result=buildWorkbenchFromIntake(intake);
 assert.equal(result.inputs.prospect,"Example manufacturer");
 assert.equal(result.inputs.avgDealValue,20000);
 assert.equal(result.inputs.baselineWinRatePct,32,"proposal denominator must map");
 assert.equal(result.inputs.annualProposals,450);
 assert.ok(preview.unmapped.some(x=>x.key==="meetingCloseRatePct"),"meeting conversion is not proposal win rate");
 assert.ok(preview.unmapped.some(x=>x.key==="salespeople"),"sales headcount is captured but not silently modeled");
 assert.equal(result.evidence.baselineWinRatePct.status,"prospect-reported");
 assert.equal(result.evidence.baselineWinRatePct.source.includes("not independently verified"),true);
 assert.equal(result.inputs.monthlyFee,"","no fictional sample investment survives import");
});

test("published references are explicit and remain attributed, not certified customer values",()=>{
 const intake=emptyIntake();
 intake.responses.proposalWinRatePct={
  status:"reference",value:21,unit:"percent",
  source:{title:"A sample industry survey",url:"https://example.org/research",date:"2024",
    population:"Comparable proposal-stage opportunities in a matching market",notes:"Verify comparability"}
 };
 const result=buildWorkbenchFromIntake(intake);
 assert.equal(result.inputs.baselineWinRatePct,21);
 assert.equal(result.evidence.baselineWinRatePct.status,"external-reference");
 assert.match(result.evidence.baselineWinRatePct.source,/example.org/);
 assert.match(result.evidence.baselineWinRatePct.source,/Population/);
});
test("incomplete references are rejected instead of laundered into verified baselines",()=>{
 const intake=emptyIntake();
 intake.responses.proposalWinRatePct={status:"reference",value:21,unit:"percent",source:{title:"Uncited"}};
 assert.throws(()=>buildWorkbenchFromIntake(intake),/requires title, HTTPS URL and applicable population/);
});

test("validate rejects wrong units, unsupported contracts, invalid values and accepts real zero",()=>{
 let x=emptyIntake();x.responses.averageDealValue.unit="percent";
 assert.throws(()=>validateIntake(x),/incompatible unit/);
 x=emptyIntake();x.schema="sandler-roi/2";
 assert.throws(()=>validateIntake(x),/Unsupported/);
 x=emptyIntake();provided(x,"grossMarginPct",101);
 assert.throws(()=>validateIntake(x),/outside allowed range/);
 x=emptyIntake();provided(x,"annualProposals",3.1);
 assert.throws(()=>validateIntake(x),/outside allowed range/);
 x=emptyIntake();provided(x,"annualProposals",0);
 assert.equal(buildWorkbenchFromIntake(x).inputs.annualProposals,0);
});

test("unmapped survey inputs remain in the canonical record for future independent modules",()=>{
 const intake=emptyIntake();provided(intake,"salesRepsLostAnnual",4);
 provided(intake,"replacementCostPerRep",80000);
 provided(intake,"targetAverageDealValue",55000);
 const result=buildWorkbenchFromIntake(intake);
 assert.equal(result.intake.responses.salesRepsLostAnnual.value,4);
 assert.equal(result.intake.responses.replacementCostPerRep.value,80000);
 assert.equal(result.intake.responses.targetAverageDealValue.value,55000);
 assert.ok(result.unmapped.some(x=>x.key==="salesRepsLostAnnual"));
 assert.ok(result.unmapped.some(x=>x.key==="targetAverageDealValue"));
 assert.equal(result.inputs.rampMonths,"","missing ramp remains unknown");
});

test("long published citation preserves full URL, population and limitations through evidence normalization",()=>{
 const input=emptyIntake();
 const endpoint="https://example.org/research/"+("u".repeat(360));
 const population="North America B2B qualified proposals, not meetings. "+("p".repeat(185));
 const limitation="Only firms with mature CRM data; not a franchisee hiring benchmark. "+("n".repeat(410));
 input.responses.proposalWinRatePct={
   status:"reference",value:24,unit:"percent",
   source:{title:"Annual outcome benchmark "+("t".repeat(175)),url:endpoint,
     date:"2026-06-01",population,notes:limitation}
 };
 const model=buildWorkbenchFromIntake(input);
 const citation=model.evidence.baselineWinRatePct.source;
 assert.ok(citation.length>500,"test fixture must exceed the old truncation boundary");
 assert.ok(citation.length<=MAX_EVIDENCE_SOURCE_LENGTH);
 assert.ok(citation.includes(endpoint),"complete citation URL must remain");
 assert.ok(citation.includes(population),"population/denominator caveat must remain");
 assert.ok(citation.includes(limitation),"last applicability note must remain");
 assert.equal(normalizeEvidence(model.evidence,model.inputs).baselineWinRatePct.source,citation);
 assert.equal(model.intake.responses.proposalWinRatePct.source.notes,limitation);
});
