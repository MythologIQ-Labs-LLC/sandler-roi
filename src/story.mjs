/* Pure behavioral baselines versus hypothetical operating changes.
 * Never treat a projection as achieved or as evidence of training causation.
 */
import {parseValue} from "./roi.mjs";

function value(source,key){
  const result=parseValue(source[key],key);
  return result.error?null:result.value;
}
function format(number,unit){
  return number===null||!Number.isFinite(number)?"Needs input":number.toFixed(1)+unit;
}
export function behaviorJourney(inputs,scenario,active){
  const rows=[];
  if(active.wins!==false){
    const baseline=value(inputs,"baselineWinRatePct");
    const uplift=value(scenario,"winPoints"),capture=value(scenario,"winCapturePct");
    const complete=baseline!==null&&uplift!==null&&capture!==null&&baseline+uplift<=100;
    const delta=complete?uplift*capture/100:null;
    rows.push({
      key:"wins",label:"Proposal win rate",current:format(baseline,"%"),
      possible:format(complete?baseline+delta:null,"%"),
      change:complete?"+"+delta.toFixed(1)+" percentage points":"Review win-rate inputs",
      complete
    });
  }
  if(active.ramp!==false){
    const baseline=value(inputs,"rampMonths");
    const saved=value(scenario,"rampMonthsSaved"),capture=value(scenario,"rampCapturePct");
    const complete=baseline!==null&&saved!==null&&capture!==null&&saved<=baseline;
    const delta=complete?saved*capture/100:null;
    rows.push({
      key:"ramp",label:"Seller ramp to productivity",current:format(baseline," months"),
      possible:format(complete?baseline-delta:null," months"),
      change:complete?delta.toFixed(1)+" months faster":"Review ramp assumptions",
      complete
    });
  }
  return rows;
}
