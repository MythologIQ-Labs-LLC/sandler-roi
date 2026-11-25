/* One-time, same-origin survey -> workbench handoff.
 * No network transfer or customer values in the URL.
 * The receiving workbench must still show its import-review dialog.
 */
import {validateIntake} from "./intake-contract.mjs";

export const HANDOFF_KEY="sandler-discovery-handoff/1";
export const HANDOFF_SCHEMA="sandler-discovery-transfer/1";
export const HANDOFF_TTL_MS=15*60*1000;
const MAX_HANDOFF_BYTES=200_000;

export function stageIntakeHandoff(storage,candidate,now=Date.now()){
  if(!storage?.setItem)throw Error("Browser session storage unavailable. Download the intake JSON instead.");
  const intake=validateIntake(candidate);
  const text=JSON.stringify({schema:HANDOFF_SCHEMA,createdAt:now,intake});
  if(new TextEncoder().encode(text).length>MAX_HANDOFF_BYTES)
    throw Error("Intake handoff too large. Download the intake JSON instead.");
  try{storage.setItem(HANDOFF_KEY,text);}
  catch{throw Error("Browser session storage blocked. Download the intake JSON instead.");}
  return {createdAt:now,bytes:new TextEncoder().encode(text).length};
}
export function consumeIntakeHandoff(storage,now=Date.now()){
  if(!storage?.getItem||!storage?.removeItem)
    throw Error("Browser session storage unavailable. Open the saved intake JSON manually.");
  let text;
  try{
    text=storage.getItem(HANDOFF_KEY);
    storage.removeItem(HANDOFF_KEY);
  }catch{throw Error("Browser session storage blocked. Open the saved intake JSON manually.");}
  if(!text)throw Error("No survey handoff found. Complete the survey or open a saved intake JSON.");
  if(new TextEncoder().encode(text).length>MAX_HANDOFF_BYTES)
    throw Error("Survey handoff exceeds the allowed size. Import a JSON file instead.");
  let transfer;
  try{transfer=JSON.parse(text);}catch{throw Error("Survey handoff is damaged. Import a JSON file instead.");}
  if(transfer?.schema!==HANDOFF_SCHEMA||!Number.isFinite(transfer.createdAt)||
    transfer.createdAt>now+60_000||now-transfer.createdAt>HANDOFF_TTL_MS)
    throw Error("Survey handoff is expired or invalid. Open a saved intake JSON.");
  return validateIntake(transfer.intake);
}
