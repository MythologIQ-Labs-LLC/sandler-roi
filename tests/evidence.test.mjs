import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_INPUTS} from "../src/roi.mjs";
import {defaultEvidence,normalizeEvidence,assessEvidence,requiredEvidenceKeys} from "../src/evidence.mjs";

test("initial fictional inputs are marked illustrative and cannot be verified",()=>{
  const e=defaultEvidence(DEFAULT_INPUTS);
  const result=assessEvidence(DEFAULT_INPUTS,e);
  assert.equal(result.independentlyVerified,false);
  assert.ok(result.illustrative.includes("discountedRevenue"));
  assert.equal(result.declarationsComplete,false);
});
test("input edit status is not inferred as independently documented",()=>{
  const input={...DEFAULT_INPUTS,discountedRevenue:42000000};
  const e=defaultEvidence(input);
  e.discountedRevenue={status:"prospect-reported",source:"Client call"};
  const result=assessEvidence(input,e);
  assert.equal(result.independentlyVerified,false);
  assert.ok(result.claimed.includes("discountedRevenue"));
});
test("document or finance review claim without source is reported",()=>{
  const e=defaultEvidence(DEFAULT_INPUTS);
  e.monthlyFee={status:"finance-reviewed",source:""};
  e.setupFee={status:"document-cited",source:" "};
  const a=assessEvidence(DEFAULT_INPUTS,e);
  assert.deepEqual(a.missingSources.sort(),["monthlyFee","setupFee"]);
});
test("required evidence tracks enabled drivers and expanded costs",()=>{
  const i={...DEFAULT_INPUTS,costMode:"expanded"};
  const a=requiredEvidenceKeys(i,{pricing:false,wins:true,accounts:false,ramp:false});
  assert.ok(a.includes("trainingHoursPerPerson"));
  assert.ok(a.includes("grossMarginPct"));
  assert.ok(!a.includes("discountedRevenue"));
  assert.ok(!a.includes("newAccountsAnnualValue"));
});
test("untrusted import cannot invent evidence states or override known field keys",()=>{
 const input={...DEFAULT_INPUTS};
 const imported=normalizeEvidence({
   monthlyFee:{status:"signed-off",source:"Fake"},
   discountedRevenue:{status:"document-cited",source:"  invoice-123  "},
   injected:{status:"finance-reviewed",source:"x"},
 },input);
 assert.equal(imported.monthlyFee.status,"unconfirmed");
 assert.equal(imported.discountedRevenue.source,"invoice-123");
 assert.equal("injected" in imported,false);
});
test("explicit zero cost is valid but cannot alone authenticate client data",()=>{
  const e=defaultEvidence({...DEFAULT_INPUTS,setupFee:0});
  e.setupFee={status:"finance-reviewed",source:"Budget line 2026"};
  const a=assessEvidence(DEFAULT_INPUTS,e);
  assert.equal(a.independentlyVerified,false);
});
