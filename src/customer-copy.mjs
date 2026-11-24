/* Customer-facing language, separate from the stable persisted `prospect` key.
 * Only textContent is used for names: never interpolate an input into HTML.
 */
export function customerName(value){
  if(value===null||value===undefined)return "";
  return String(value).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
}
export function customerCopy(raw){
  const name=customerName(raw);
  // Existing imports may end in a possessive apostrophe; avoid appending another.
  const possessive=name
    ? /['’]$/.test(name)?name.replace(/['’]$/,"’"):name+"’s"
    : "the customer’s";
  return {
    name,
    subject:name||"the customer",
    possessive,
    leadPossessive:name?possessive:"The customer’s"
  };
}
