import test from "node:test";
import assert from "node:assert/strict";
import {emptyIntake} from "../src/intake-contract.mjs";
import {stageIntakeHandoff,consumeIntakeHandoff,HANDOFF_KEY,HANDOFF_TTL_MS} from "../src/intake-handoff.mjs";
function store(){
 const values=new Map();
 return {values,
  setItem:(k,v)=>values.set(k,v),
  getItem:k=>values.get(k)??null,
  removeItem:k=>values.delete(k)
 };
}
test("one-time survey handoff preserves provided, unknown and published reference provenance",()=>{
 const storage=store(),intake=emptyIntake();
 intake.responses.customerName={...intake.responses.customerName,value:"Example company",status:"provided"};
 intake.responses.proposalWinRatePct={value:21,status:"reference",unit:"percent",
  source:{title:"Example source",url:"https://example.org/data",population:"Qualified proposals",date:"2025"}};
 const created=stageIntakeHandoff(storage,intake,5000);
 assert.ok(created.bytes>100);
 assert.equal(storage.values.has(HANDOFF_KEY),true);
 const result=consumeIntakeHandoff(storage,5100);
 assert.equal(result.responses.customerName.value,"Example company");
 assert.equal(result.responses.salespeople.status,"unknown");
 assert.equal(result.responses.proposalWinRatePct.status,"reference");
 assert.equal(result.responses.proposalWinRatePct.source.population,"Qualified proposals");
 assert.equal(storage.values.size,0,"one-time handoff must be consumed");
 assert.throws(()=>consumeIntakeHandoff(storage,5101),/No survey handoff/);
});
test("stale or future survey handoff is consumed and rejected",()=>{
 const storage=store(),intake=emptyIntake();
 stageIntakeHandoff(storage,intake,500_000);
 assert.throws(()=>consumeIntakeHandoff(storage,500_000+HANDOFF_TTL_MS+1),/expired or invalid/);
 assert.equal(storage.values.size,0);
 stageIntakeHandoff(storage,intake,600_000);
 assert.throws(()=>consumeIntakeHandoff(storage,1000),/expired or invalid/);
});
test("blocked storage, invalid records and too-large data fail closed",()=>{
 const noStorage={getItem:()=>{throw Error("blocked")},removeItem:()=>{},setItem:()=>{throw Error("blocked")}};
 assert.throws(()=>stageIntakeHandoff(noStorage,emptyIntake()),/storage blocked/);
 assert.throws(()=>consumeIntakeHandoff(noStorage),/storage blocked/);
 const storage=store();
 assert.throws(()=>stageIntakeHandoff(storage,{schema:"invalid"}),/Unsupported discovery intake/);
 storage.setItem(HANDOFF_KEY,"x".repeat(200_001));
 assert.throws(()=>consumeIntakeHandoff(storage),/exceeds the allowed size/);
 assert.equal(storage.values.size,0);
});
