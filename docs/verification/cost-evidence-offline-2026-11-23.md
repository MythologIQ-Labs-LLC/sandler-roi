# ROI cost and evidence hardening: offline verification receipt

**Bound source revision:** \`2ce53ce90cf882d832b2c0b92025ae33099ee42b\`  
**Branch:** \`feat/roi-evidence-cost-hardening\` (no PR)  
**Base:** MVP PR #1 head \`73664f7a36b8049be6b4b2447f1a2b073e972243\`  
**Recorded:** 2026-11-23  
**Status:** Source-level and isolated runtime verification passed; native Node/browser acceptance **NOT_RUN**.

## Scope of completed work

- \`src/roi.mjs\` now includes \`calculateCost\` with **fees** versus **expanded** cost scope.
- \`src/evidence.mjs\` provides a bounded per-input declared-source register and assessment separate from arithmetic.
- \`src/app.mjs\` and \`index.html\` expose cost scope, additional cost fields, compact evidence editor, cost basis and disclosure.
- \`server.mjs\` serves the new static evidence module over local loopback.
- JSON model schema now \`sandler-roi/2\`; legacy \`sandler-roi/1\` imports remain supported as fee-only.
- CSV export includes the source/assumption register and mitigates spreadsheet-formula injection in user-supplied strings.
- \`tests/roi.test.mjs\`, \`tests/evidence.test.mjs\`, and \`tests/app.test.mjs\` preserve numeric and UI smoke regressions.
- No code, CI rules, or release status changed in MVP PR #1 or \`main\`.

## Actually performed verification

The AI host fetched exact GitHub file contents by revision, evaluated the pure engine and evidence code in an isolated V8 environment, and ran existing numeric \`node:test\` test callbacks through a compatibility harness reproducing their assertion semantics. **32 of 32** test callbacks passed. This is not the same as running \`npm test\` in native Node.js.

A lightweight synthetic DOM harness executed the committed \`src/app.mjs\` logic against the committed markup. **Nine of nine** workflow smoke assertions passed: original fee-only cost, edit/recalculate and source demotion, scenario switch, expanded incompleteness gate, explicit expanded cost calculation, self-declared evidence warning, JSON v2 export, CSV formula injection escape, and legacy v1 reimport ignoring stored ROI.

Static checks showed that every referenced UI ID appeared in the HTML and the new evidence module is in the local server allowlist. \`tests/app.test.mjs\` was committed so a future developer can run equivalent tests using the native Node test runner.

**Remaining unexecuted checks:**
- Native \`npm test\` across all three test files, including the new DOM harness.
- Actual Chromium first-use flow, keyboard/accessibility, JSON/CSV download/import, and print/PDF rendering.
- Independent financial review of cost scope and prospect-facing disclaimers.
- Required GitHub status checks; organization Actions budget is exhausted.

## Architectural safeguards

- **Unknown costs stay unknown:** expanded mode starts with blank optional cost categories and cannot calculate complete ROI until entered, including explicit zero if warranted.
- **Legacy retained transparently:** fee-only estimates preserve prior arithmetic but are labeled as excluding additional investment.
- **Truth separation:** \`finance-reviewed\` is a **user-declared status**; it does not authenticate documentary evidence or financially realize a scenario.
- **Imported data is untrusted:** v2 evidence is a source declaration, not an approval; stored computed ROI values are ignored.
- **No silent CI bypass:** changes were committed only to a fresh non-PR branch. A query for workflow runs on the latest head returned \`[]\`; a PR search on the branch returned \`[]\`. PR #1 remained open at its earlier head.

## Reproducible local acceptance

On a machine with repository access and Node.js 20+:

\`\`\`bash
git fetch origin feat/roi-evidence-cost-hardening
git switch feat/roi-evidence-cost-hardening
npm test
npm start
\`\`\`

Open \`http://127.0.0.1:4173\` and inspect the expanded cost and evidence panels. Record the exact commit and native test output. Do not create a PR or trigger an Actions workflow merely to reproduce the tests.

**Gate:** Development complete for this bounded slice; repository merge and browser/finance acceptance remain **HOLD**.
