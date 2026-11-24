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
    n.removeAttribute=key=>{delete n.attributes[key]};
    n.focus=()=>{n.focused=true};
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
  const steps=["discover","model","compare","present"].map(key=>{
    const el=createNode("button");el.dataset.workbenchNav=key;return el;
  });
  const discovery=["engagement","performance","pipeline","evidence"];
  const tabs=discovery.map(key=>{
    const el=createNode("button");el.dataset.discoverTab=key;return el;
  });
  const panels=discovery.map(key=>{
    const el=createNode("section");el.dataset.discoverPanel=key;return el;
  });
  const document={
    getElementById:id=>elements.get(id),
    createElement:createNode,
    querySelectorAll:query=>query==="[data-scenario]"?buttons:
      query==="[data-workbench-nav]"?steps:
      query==="[data-discover-tab]"?tabs:
      query==="[data-discover-panel]"?panels:[],
    querySelector:query=>query===".side"?{scrollTop:0}:null,
    body:createNode("body")
  };
  for(const match of html.matchAll(/id="([^"]+)"/g)){
    const el=createNode("div");el.id=match[1];
  }
  let lastCompletedBenefit;
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
      lastCompletedBenefit=elements.get("benefit").textContent;
      assert.notEqual(lastCompletedBenefit,"Incomplete");
    });
    await t.test("expanded cost remains incomplete until every extra is stated",async()=>{
      const select=elements.get("cost-mode-select");select.value="expanded";
      await select.trigger("change");
      assert.equal(elements.get("roi").textContent,"Incomplete");
    });
    await t.test("expanded cost entries update fee-only amount without modifying benefits",async()=>{
      const fields={trainingHoursPerPerson:"20",participantHourlyCost:"50",
        additionalMonthlyCost:"100",travelCost:"2000",technologyCost:"3000",
        adminCost:"4000",otherCost:"1000"};
      for(const [name,value] of Object.entries(fields)){
        const el=elements.get("field-"+name);el.value=value;await el.trigger("input");
      }
      assert.equal(elements.get("cost").textContent,"$107,200");
      assert.equal(elements.get("benefit").textContent,lastCompletedBenefit);
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
    await t.test("Discover is a genuine one-active-panel tablist",async()=>{
      assert.equal(tabs.length,4);
      assert.equal(tabs[0].attributes["aria-selected"],"true");
      assert.equal(tabs[0].attributes.tabindex,"0");
      assert.equal(panels[0].hidden,false);
      assert.ok(panels.slice(1).every(panel=>panel.hidden===true));
      const baseline=elements.get("cost").textContent;
      await tabs[2].trigger("click");
      assert.equal(tabs[2].attributes["aria-selected"],"true");
      assert.equal(tabs[0].attributes["aria-selected"],"false");
      assert.equal(panels[0].hidden,true);
      assert.equal(panels[2].hidden,false);
      assert.equal(panels.filter(panel=>panel.hidden!==true).length,1);
      assert.equal(elements.get("cost").textContent,baseline);
      await tabs[0].trigger("click");
    });
    await t.test("Discover supports keyboard Left, Right, Home and End",async()=>{
      let prevented=0;
      await tabs[0].trigger("keydown",{key:"ArrowRight",preventDefault:()=>prevented++});
      assert.equal(panels[1].hidden,false);
      assert.equal(tabs[1].focused,true);
      await tabs[1].trigger("keydown",{key:"End",preventDefault:()=>prevented++});
      assert.equal(panels[3].hidden,false);
      await tabs[3].trigger("keydown",{key:"Home",preventDefault:()=>prevented++});
      assert.equal(panels[0].hidden,false);
      await tabs[0].trigger("keydown",{key:"ArrowLeft",preventDefault:()=>prevented++});
      assert.equal(panels[3].hidden,false);
      assert.equal(prevented,4);
      await tabs[0].trigger("click");
    });
    await t.test("CSV mapper previews a prospect row but does not import until Apply",async()=>{
      const original=elements.get("cost").textContent;
      const file=elements.get("import-csv-file");
      file.files=[{name:"prospect-data.csv",size:130,
        text:async()=> "Company,Monthly Fee,Program Months,Win Rate\nProspect Alpha,6000,12,25%\nProspect Beta,8000,6,30%\n"}];
      await file.trigger("change",{target:file});
      assert.match(elements.get("csv-map-preview").textContent,/mapped values/);
      assert.equal(elements.get("cost").textContent,original);
      assert.equal(elements.get("csv-record").children.length,2);
      assert.equal(elements.get("csv-apply").disabled,false);
      await elements.get("csv-close").trigger("click");
      assert.equal(elements.get("cost").textContent,original);
      // Re-opening the file is required after canceling the staged mapping.
    });
    await t.test("CSV import applies chosen row and leaves unrelated example inputs missing",async()=>{
      const file=elements.get("import-csv-file");
      file.files=[{name:"prospects.csv",size:150,
        text:async()=> "Company,Monthly Fee,Program Months,Win Rate\nAlpha,6000,12,25%\nBeta,8000,6,30%\n"}];
      await file.trigger("change",{target:file});
      elements.get("csv-record").value="1";
      await elements.get("csv-record").trigger("change");
      await elements.get("csv-apply").trigger("click");
      assert.equal(elements.get("field-prospect").value,"Beta");
      assert.equal(elements.get("field-monthlyFee").value,"8000");
      assert.equal(elements.get("field-programMonths").value,"6");
      assert.equal(elements.get("cost").textContent,"Needs input");
      assert.equal(elements.get("roi").textContent,"Incomplete");
      const row=elements.get("evidence-register").children
        .find(item=>item.children[0].textContent==="Monthly program fee");
      assert.equal(row.children[1].value,"unconfirmed");
      assert.equal(document.body.dataset.stage,"discover");
    });
    await t.test("download CSV template exposes canonical field headings",async()=>{
      await elements.get("csv-template").trigger("click");
      const content=await downloads.at(-1).blob.text();
      assert.match(content,/"prospect"/);
      assert.match(content,/"monthlyFee"/);
      assert.match(content,/"programMonths"/);
    });
    await t.test("reset after CSV import restores illustrative demo inputs",async()=>{
      await elements.get("reset").trigger("click");
      assert.equal(elements.get("cost").textContent,"$79,200");
      assert.equal(elements.get("field-prospect").value,"Example prospect (illustrative)");
    });
    await t.test("present stage keeps navigation active in the workbench DOM",async()=>{
      await steps[3].trigger("click");
      assert.equal(steps[3].attributes["aria-current"],"step");
      await steps[0].trigger("click");
      assert.equal(document.body.dataset.stage,"discover");
    });
    await t.test("meeting journey starts in Discover and advances without leaving the page",async()=>{
      assert.equal(document.body.dataset.stage,"discover");
      await elements.get("step-next").trigger("click");
      assert.equal(document.body.dataset.stage,"model");
      await elements.get("step-next").trigger("click");
      assert.equal(document.body.dataset.stage,"compare");
      await elements.get("step-next").trigger("click");
      assert.equal(document.body.dataset.stage,"present");
      assert.equal(steps[3].attributes["aria-current"],"step");
    });
    await t.test("model assumptions are organized by sales value driver",async()=>{
      await steps[1].trigger("click");
      const groups=elements.get("assumptions").children;
      assert.equal(groups.length,5);
      assert.ok(groups.every(group=>group.tag==="fieldset"));
    });
    await t.test("comparison contains three fully labeled scenario rows",async()=>{
      await steps[2].trigger("click");
      const rows=elements.get("scenario-table").children;
      assert.equal(rows.length,3);
      assert.ok(rows.every(row=>row.children.length===5));
    });
    await t.test("present view includes driver math, uncertainty and reversible navigation",async()=>{
      await steps[3].trigger("click");
      assert.equal(elements.get("present-driver-summary").children.length,4);
      assert.match(elements.get("present-evidence").textContent,/None independently verified/);
      assert.equal(elements.get("present").textContent,"Exit presentation");
      await elements.get("present").trigger("click");
      assert.equal(document.body.dataset.stage,"compare");
    });
    await t.test("print action opens the customer-facing presentation step",async()=>{
      await steps[1].trigger("click");
      await elements.get("print").trigger("click");
      assert.equal(document.body.dataset.stage,"present");
    });
  } finally {
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
    if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
    URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
  }
});
