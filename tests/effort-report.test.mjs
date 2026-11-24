import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {summarizeEffort} from "../scripts/effort-report.mjs";

const source=JSON.parse(await readFile(
  new URL("../docs/engagement/effort-ledger.json",import.meta.url),"utf8"));

test("effort ledger is valid and has a computed total rather than hand-maintained sums",()=>{
  const summary=summarizeEffort(source);
  assert.equal(summary.entryCount,5);
  assert.equal(summary.totalTrackedHours,2.75);
  assert.equal(summary.provisionalHours,2.75);
  assert.equal(summary.ownerConfirmedHours,0);
  assert.equal(summary.invoiceableHours,null);
});

test("effort ledger rejects duplicates and invented precision",()=>{
  const dup={...source,entries:[...source.entries,source.entries[0]]};
  assert.throws(()=>summarizeEffort(dup),/duplicate/);
  const bad={...source,entries:[{...source.entries[0],hours:Infinity}]};
  assert.throws(()=>summarizeEffort(bad),/finite/);
});

test("effort CLI produces a portable machine-readable report",()=>{
  const run=spawnSync(process.execPath,["scripts/effort-report.mjs","--json"],{
    cwd:new URL("..",import.meta.url),encoding:"utf8"
  });
  assert.equal(run.status,0,run.stderr);
  const output=JSON.parse(run.stdout);
  assert.equal(output.totalTrackedHours,2.75);
  assert.equal(output.invoiceableHours,null);
});
