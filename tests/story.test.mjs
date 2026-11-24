import test from "node:test";
import assert from "node:assert/strict";
import {behaviorJourney} from "../src/story.mjs";
import {DEFAULT_INPUTS,SCENARIOS,DEFAULT_ACTIVE} from "../src/roi.mjs";

test("before and after reflect real entered units, not an invented zero-dollar baseline",()=>{
  const rows=behaviorJourney(DEFAULT_INPUTS,SCENARIOS.expected,DEFAULT_ACTIVE);
  assert.deepEqual(rows.map(x=>x.key),["wins","ramp"]);
  assert.deepEqual(rows.map(x=>x.current),["25.0%","6.0 months"]);
  assert.deepEqual(rows.map(x=>x.possible),["26.4%","5.0 months"]);
  assert.deepEqual(rows.map(x=>x.change),["+1.4 percentage points","1.0 months faster"]);
  assert.ok(rows.every(x=>x.complete));
});
test("missing baseline cannot fabricate a future operating result",()=>{
  const rows=behaviorJourney({...DEFAULT_INPUTS,baselineWinRatePct:""},SCENARIOS.expected,DEFAULT_ACTIVE);
  assert.equal(rows[0].current,"Needs input");
  assert.equal(rows[0].possible,"Needs input");
  assert.equal(rows[0].complete,false);
});
test("invalid win-rate uplift and ramp changes fail safely",()=>{
  const rows=behaviorJourney({...DEFAULT_INPUTS,baselineWinRatePct:99,rampMonths:1},
    {...SCENARIOS.expected,winPoints:2,rampMonthsSaved:2},DEFAULT_ACTIVE);
  assert.ok(rows.every(x=>!x.complete));
  assert.ok(rows.every(x=>x.possible==="Needs input"));
});
test("disabled operating drivers do not pretend to improve",()=>{
  assert.deepEqual(behaviorJourney(DEFAULT_INPUTS,SCENARIOS.expected,{...DEFAULT_ACTIVE,wins:false,ramp:false}),[]);
});
test("different illustrative scenarios drive distinct operating hypotheses",()=>{
  const low=behaviorJourney(DEFAULT_INPUTS,SCENARIOS.conservative,DEFAULT_ACTIVE);
  const high=behaviorJourney(DEFAULT_INPUTS,SCENARIOS.upside,DEFAULT_ACTIVE);
  assert.notEqual(low[0].possible,high[0].possible);
  assert.notEqual(low[1].possible,high[1].possible);
});
