import test from "node:test";
import assert from "node:assert/strict";
import {CSV_TEMPLATE_HEADERS,parseCSV,prepareCSV,suggestMapping,mappedCSVPreview,buildCSVImport} from "../src/csv-import.mjs";

test("CSV parses quoted commas, double quotes, CRLF, multiline and UTF-8 BOM",()=>{
  const parsed=parseCSV('\uFEFF"Prospect","Monthly Fee"\r\n"North ""Star"", Inc","$6,600"\r\n"Second\nRow","200"\r\n');
  assert.deepEqual(parsed,[["Prospect","Monthly Fee"],['North "Star", Inc',"$6,600"],["Second\nRow","200"]]);
});
test("CSV detects a normal wide header row and multiple prospects",()=>{
  const p=prepareCSV('Company,Monthly Fee,Win Rate,Program Months\nAlpha,6600,30%,12\nBeta,8800,24%,6\n');
  assert.equal(p.kind,"table");
  assert.equal(p.rows.length,2);
  const m=suggestMapping(p.headers);
  assert.equal(m.prospect,0);
  assert.equal(m.monthlyFee,1);
  assert.equal(m.baselineWinRatePct,2);
  assert.equal(m.programMonths,3);
  const chosen=mappedCSVPreview(p,1,m,"sample.csv");
  assert.equal(chosen.entries.find(e=>e.field==="monthlyFee").value,"8800");
  assert.equal(chosen.entries.find(e=>e.field==="baselineWinRatePct").value,"24");
});
test("CSV import never copies unrelated example values into missing prospect fields",()=>{
  const p=prepareCSV("Company,Monthly Fee\nAcme,6600\n");
  const preview=mappedCSVPreview(p,0,suggestMapping(p.headers),"buyer.csv");
  const model=buildCSVImport(preview);
  assert.equal(model.inputs.monthlyFee,"6600");
  assert.equal(model.inputs.prospect,"Acme");
  assert.equal(model.inputs.annualProposals,"");
  assert.equal(model.inputs.programMonths,"");
  assert.equal(model.inputs.costMode,"fees");
  assert.equal(model.evidence.monthlyFee.status,"unconfirmed");
  assert.match(model.evidence.monthlyFee.source,/buyer.csv/);
});
test("CSV recognizes workbench exported key-value rows but ignores computed ROI",()=>{
 const p=prepareCSV('Metric,Value\n"Program cost","999999"\n"Input monthlyFee","6600"\n"Input grossMarginPct","40"\n"Input prospect","Buyer"\n"ROI percent","700"\n');
 const row=mappedCSVPreview(p,0,suggestMapping(p.headers));
 assert.equal(row.entries.length,3);
 assert.equal(row.entries.find(e=>e.field==="grossMarginPct").value,"40");
 assert.equal(buildCSVImport(row).inputs.annualSellerRevenue,"");
});
test("CSV recognizes a documented field,value layout",()=>{
 const p=prepareCSV("field,value\nmonthlyFee,6600\nprogramMonths,12\nprospect,Sample\n");
 assert.equal(p.kind,"key-value");
 assert.equal(mappedCSVPreview(p,0,suggestMapping(p.headers)).entries.length,3);
});
test("CSV blocks malformed, ambiguous or oversized input",()=>{
 assert.throws(()=>parseCSV('"a","b"\n"unterminated'),/Unclosed/);
 assert.throws(()=>parseCSV("a,b\n1,2,3"),/inconsistent/);
 assert.throws(()=>prepareCSV("Monthly Fee,monthly_fee\n100,200"),/duplicate/i);
 assert.throws(()=>parseCSV("a,b\n1,"+"x".repeat(2_000_001)),/2 MB/);
 assert.throws(()=>prepareCSV("a,b\n"),/no customer/i);
});
test("CSV refuses invalid numeric cells, negative values and duplicate mapping targets",()=>{
 const p=prepareCSV("Monthly fee,Program Months\n-1,12\n");
 assert.throws(()=>mappedCSVPreview(p,0,suggestMapping(p.headers)),/Invalid/);
 const other=prepareCSV("Monthly fee,Program Months\n6000,12\n");
 assert.throws(()=>mappedCSVPreview(other,0,{monthlyFee:0,programMonths:0}),/multiple inputs/);
 assert.throws(()=>mappedCSVPreview(other,5,suggestMapping(other.headers)),/Choose a customer record/);
});
test("CSV preserves percentage point units and rejects formula-like numerics",()=>{
 const p=prepareCSV('Win Rate,Monthly fee\n"32%","$7,100"\n');
 const result=mappedCSVPreview(p,0,suggestMapping(p.headers));
 assert.equal(result.entries.find(e=>e.field==="baselineWinRatePct").value,"32");
 assert.equal(result.entries.find(e=>e.field==="monthlyFee").value,"7100");
 const bad=prepareCSV("Win Rate,Monthly fee\n=SUM(1:2),6600\n");
 assert.throws(()=>mappedCSVPreview(bad,0,suggestMapping(bad.headers)),/Invalid number/);
});
test("CSV schema has required baseline columns and no secret fields",()=>{
 assert.ok(CSV_TEMPLATE_HEADERS.includes("customer"));
 assert.ok(!CSV_TEMPLATE_HEADERS.includes("prospect"));
 assert.ok(CSV_TEMPLATE_HEADERS.includes("monthlyFee"));
 assert.ok(CSV_TEMPLATE_HEADERS.includes("programMonths"));
 assert.ok(!CSV_TEMPLATE_HEADERS.includes("roi"));
});

test("customer-named CSV headers and legacy prospect headers map to same stable internal field",()=>{
  const current=prepareCSV("Customer,Monthly Fee\nJohn Doe,6600\n");
  const legacy=prepareCSV("Prospect,Monthly Fee\nAcme,6600\n");
  for(const record of [current,legacy]){
    const map=suggestMapping(record.headers);
    assert.equal(map.prospect,0);
    const imported=buildCSVImport(mappedCSVPreview(record,0,map));
    assert.equal(imported.inputs.prospect,record.rows[0][0]);
  }
});
test("CSV report Input customer and legacy Input prospect both round trip",()=>{
  for(const header of ["Input customer","Input prospect"]){
    const p=prepareCSV('Metric,Value\n"'+header+'","John Doe"\n"Input monthlyFee","6600"\n');
    const mapped=mappedCSVPreview(p,0,suggestMapping(p.headers));
    assert.equal(buildCSVImport(mapped).inputs.prospect,"John Doe");
  }
});
