/* Import bridge for the independently operated discovery survey.
 * Maps only semantically identical metrics. No inferred formulas or demo values.
 */
import {DEFAULT_INPUTS} from "./roi.mjs";
import {BASELINE_FIELDS} from "./evidence.mjs";
import {previewWorkbenchImport} from "./intake-contract.mjs";

export function buildWorkbenchFromIntake(candidate){
 const preview=previewWorkbenchImport(candidate);
 const inputs=Object.fromEntries(Object.keys(DEFAULT_INPUTS).map(key=>[key,""]));
 inputs.costMode="fees";
 inputs.notes="Discovery intake imported. Confirm every figure and source before presenting. Unknown fields remain unknown; current scenario assumptions are illustrative.";
 const evidence=Object.fromEntries(Object.keys(BASELINE_FIELDS).map(key=>[key,{status:"unconfirmed",source:""}]));
 for(const item of preview.mapped){
  inputs[item.target]=item.value;
  if(Object.hasOwn(evidence,item.target)){
   const source=item.source;
   evidence[item.target]=item.status==="reference"?
     {status:"external-reference",source:[source.title,source.date,source.url,
       "Population: "+source.population].filter(Boolean).join(" · ").slice(0,500)}:
     {status:"prospect-reported",source:"Customer-reported through standalone intake; not independently verified"};
  }
 }
 return {intake:preview.valid,inputs,evidence,
  mapped:preview.mapped,unmapped:preview.unmapped,unknown:preview.unknown};
}
