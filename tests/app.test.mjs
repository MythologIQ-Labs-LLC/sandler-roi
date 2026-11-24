import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("representative UI integration: cost scope, sourcing, export and legacy import", async t=>{
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
  const elements=new Map(),downloads=[],urls=new Map();
  function createNode(tag){
    const n={tag,children:[],listeners:{},attributes:{},dataset:{},style:{},value:"",
      textContent:"",className:"",checked:false,files:[]};
    const classes=new Set();
    n.classList={
      add(x){classes.add(x)},remove(x){classes.delete(x)},
      contains(x){return classes.has(x)},
      toggle(x,force){const val=typeof force==="boolean"?force:!classes.has(x);
        if(val)classes.add(x);else classes.delete(x);return val;}
    };
    n.append=(...children)=>{n.children.push(...children)};
    n.replaceChildren=(...children)=>{n.children=[...children]};
    n.addEventListener=(event,fn)=>{n.listeners[event]=fn};
    n.setAttribute=(key,value)=>{n.attributes[key]=String(value)};
    n.trigger=async(event,arg)=>n.listeners[event]?.(arg??{target:n});
    n.remove=()=>{};
    n.click=()=>{if(tag==="a")downloads.push({name:n.download,blob:urls.get(n.href)});
      else return n.trigger("click");};
    Object.defineProperty(n,"id",{set(id){n._id=id;elements.set(id,n)},get(){return n._id}});
    return n;
  }
  const buttons=["conservative","expected","upside"].map(key=>{
    const el=createNode("button");el.dataset.scenario=key;return el;
  });
  const document={
    getElementById:id=>elements.get(id),
    createElement:createNode,
    querySelectorAll:query=>query==="[data-scenario]"?buttons:[],
    body:createNode("body")
  };
  for(const match of html.matchAll(/id="([^"]+)"/g)){
    const el=createNode("div");el.id=match[1];
  }
  const originalDocument=globalThis.document;
  const originalWindow=globalThis.window;
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  globalThis.document=document;
  globalThis.window={confirm:()=>true,print:()=>{}};
  URL.createObjectURL=blob=>{const key="blob:mock-"+urls.size;urls.set(key,blob);return key};
  URL.revokeObjectURL=()=>{};
  try{
    await import("../src/app.mjs");
    await t.test("demo starts as fee-only example",()=>{
      assert.equal(elements.get("cost").textContent,"$79,200");
      assert.match(elements.get("cost-basis").textContent,/Fee-only/);
    });
    await t.test("changing fee recalculates ROI and demotes provenance",async()=>{
      const input=elements.get("field-monthlyFee");
      input.value="7000";await input.trigger("input");
      assert.equal(elements.get("cost").textContent,"$84,000");
      const item=elements.get("evidence-register").children
        .find(row=>row.children[0].textContent==="Monthly program fee");
      assert.equal(item.children[1].value,"unconfirmed");
    });
    await t.test("scenario switching updates selection",async()=>{
      await buttons[0].trigger("click");
      assert.equal(buttons[0].attributes["aria-pressed"],"true");
      assert.equal(elements.get("print-scenario").textContent,"Conservative");
    });
    await t.test("expanded cost remains incomplete until every extra is stated",async()=>{
      const select=elements.get("cost-mode-select");select.value="expanded";
      await select.trigger("change");
      assert.equal(elements.get("roi").textContent,"Incomplete");
    });
    await t.test("expanded cost entries update fee-only amount without modifying benefits",async()=>{
      const before=elements.get("benefit").textContent;
      const fields={trainingHoursPerPerson:"20",participantHourlyCost:"50",
        additionalMonthlyCost:"100",travelCost:"2000",technologyCost:"3000",
        adminCost:"4000",otherCost:"1000"};
      for(const [name,value] of Object.entries(fields)){
        const el=elements.get("field-"+name);el.value=value;await el.trigger("input");
      }
      assert.equal(elements.get("cost").textContent,"$107,200");
      assert.equal(elements.get("benefit").textContent,before);
      assert.notEqual(elements.get("roi").textContent,"Incomplete");
    });
    await t.test("self-declared finance review cannot authenticate evidence",async()=>{
      const row=elements.get("evidence-register").children
        .find(row=>row.children[0].textContent==="Monthly program fee");
      row.children[1].value="finance-reviewed";await row.children[1].trigger("change");
      row.children[2].value="Budget document";await row.children[2].trigger("input");
      assert.match(elements.get("evidence-summary").textContent,/Not independently verified/);
    });
    await t.test("JSON v2 exports cost mode and user-declared evidence",async()=>{
      await elements.get("export-json").trigger("click");
      const model=JSON.parse(await downloads.at(-1).blob.text());
      assert.equal(model.schema,"sandler-roi/2");
      assert.equal(model.inputs.costMode,"expanded");
      assert.equal(model.evidence.monthlyFee.status,"finance-reviewed");
    });
    await t.test("CSV export protects against prospect-name formula injection",async()=>{
      const prospect=elements.get("field-prospect");
      prospect.value='=HYPERLINK("https://evil.invalid","x")';
      await prospect.trigger("input");
      await elements.get("export-csv").trigger("click");
      const csv=await downloads.at(-1).blob.text();
      assert.match(csv,/"'=HYPERLINK/);
      assert.match(csv,/"Evidence independently verified","false"/);
    });
    await t.test("legacy version 1 model imports as fee-only and never trusts stored ROI",async()=>{
      const {DEFAULT_INPUTS,SCENARIOS,DEFAULT_ACTIVE}=await import("../src/roi.mjs");
      const legacy={schema:"sandler-roi/1",selected:"expected",
        inputs:DEFAULT_INPUTS,scenarios:SCENARIOS,active:DEFAULT_ACTIVE,
        calculated:{roi:9999999}};
      const file=elements.get("import-file");
      file.files=[{size:1024,text:async()=>JSON.stringify(legacy)}];
      await file.trigger("change",{target:file});
      assert.equal(elements.get("cost").textContent,"$79,200");
      assert.equal(elements.get("cost-basis").textContent,"Fee-only estimate");
      assert.doesNotMatch(elements.get("roi").textContent,/9999999/);
    });
  } finally {
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
    if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
    URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
  }
});
