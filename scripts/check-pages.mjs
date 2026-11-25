import {readFile,stat} from "node:fs/promises";
import assert from "node:assert/strict";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const assets=[".nojekyll","index.html","src/app.mjs","src/roi.mjs","src/evidence.mjs","src/csv-import.mjs","src/story.mjs","src/customer-copy.mjs","src/customer-files.mjs","src/feedback.mjs","src/feedback-archive.mjs","src/workbench.css","src/intake-contract.mjs","src/intake-bridge.mjs","survey/index.html","survey/survey.css","survey/survey.mjs"];
for(const name of assets){
  const info=await stat(join(root,name));
  assert.ok(info.isFile(),"Pages asset must exist: "+name);
}
const [html,app]=await Promise.all([
  readFile(join(root,"index.html"),"utf8"),
  readFile(join(root,"src/app.mjs"),"utf8")
]);
assert.match(html,/<script\s+type="module"\s+src="\.\/src\/app\.mjs"/,
  "HTML must load the project-relative app module");
assert.match(html,/<link\s+rel="stylesheet"\s+href="\.\/src\/workbench\.css"/,
  "HTML must load project-relative styles");
assert.match(html,/<meta\s+http-equiv="Content-Security-Policy"/,
  "Static Pages must declare its browser-side CSP");
assert.match(app,/from "\.\/roi\.mjs"/,"Missing relative ROI engine import");
assert.match(app,/from "\.\/evidence\.mjs"/,"Missing relative evidence import");
assert.match(app,/from "\.\/csv-import\.mjs"/,"Missing relative CSV import module");
assert.match(app,/from "\.\/story\.mjs"/,"Missing relative story module");
assert.match(app,/from "\.\/customer-copy\.mjs"/,"Missing relative customer copy module");
for(const asset of ["src/app.mjs","src/workbench.css"]){
  assert.ok(!html.includes('src="/'+asset+'"')&&!html.includes('href="/'+asset+'"'),
    "Absolute root URL would break Pages subpath: "+asset);
}
console.log("GitHub Pages static preflight: PASS (assets, relative imports, CSP, no-Jekyll)");
