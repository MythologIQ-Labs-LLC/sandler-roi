# Sandler workbench visual development: offline verification

**Bound implementation revision (before this receipt commit):** \`2b3150b4ee0b4a92b5a28bc7e106128b47addccd\`  
**Development branch:** \`feat/roi-evidence-cost-hardening\`  
**Date:** 2026-11-23  
**Status:** Implemented and isolated-source/DOM verified; native Node tests, rendered browser and brand-mark signoff **not completed**.

## Functional and visual changes

1. Added a guided, non-linear **Discover → Model → Compare → Present** workflow with persistent in-memory inputs across stages.
2. Discover displays engagement cost and financial baselines with a live, scope-labeled financial summary.
3. Model groups numeric assumptions by financial driver (five fieldsets), retains explicit driver toggles, and recalculates results when the prospect changes inputs.
4. Compare shows all three scenarios in a bar visualization **and** a five-column accessible data table; the non-additive pipeline opportunity bridge remains separate.
5. Present uses a focused client-facing view showing modeled ROI, net value, investment, driver contributions, a written business-case summary and explicit evidence caveats. Print changes to this view first.
6. The top bar keeps **Present** visible and secondary JSON/CSV/import/print commands in a small Files & export menu. A skip link, active-step markers, responsive layout and print CSS are implemented.
7. Sandler's published **Stable navy \`#21245c\`**, **Fresh cyan \`#00aded\`** and **Energetic blue \`#0045c2\`** are coded in \`src/workbench.css\`. The README's independent project banner was recolored and its SHA-256 profile record updated.
8. **No stylized Sandler corporate logo was copied or recreated**. The UI uses text "SANDLER®" while awaiting an authorized brand asset. Sandler's brand guidelines and terms are linked in [the UX/brand decision document](../design/rep-workbench-journey.md).

## Actually executed / inspected

- Original \`src/roi.mjs\` + \`src/evidence.mjs\` isolated pure-source test harness: **32/32 callbacks passed**. This is a compatibility simulation of the existing Node \`node:test\` callbacks, **not** native \`npm test\`.
- Browser-logic simulation against the committed HTML in an isolated synthetic DOM: **9/9 assertions passed** (start in Discover; navigation through all steps; 5 modeling groups; 3 scenario table rows; present driver/evidence summary; reversible Present; Print routing; live cost update; scenario highlight).
- Added **5 new nested application regression tests** to \`tests/app.test.mjs\`, in addition to previous cost/evidence smoke tests. The test source passed a JavaScript syntax check (with \`import.meta\` accounted for); native test-runner execution is **NOT_RUN**.
- Source checks at current branch: declared HTML IDs, CSS \`data-stage\` routes, local stylesheet serve allowlist, source-linked code and documents, eight README table-of-content anchors, text-only brand treatment, brand tokens and no external CSS imports. An initial candidate-source inventory omitted four valid local links; all four were then explicitly fetched and confirmed present. **No local link defect remains from that inspection.**
- GitHub brand asset quality profile contains SHA-256 \`bb7245ddafb4851db0480c6284868d327392f97a207ed920133175d589b35476\` for \`assets/roi-workbench-banner.svg\`. Brand ownership/status declarations still require independent signoff.

## Adversarial UX decisions

- **No one-screen spreadsheet clone:** Form overload is inappropriate for prospect conversations.
- **No hard wizard gate:** Unknown baseline values cannot block a discovery conversation; they do block complete ROI totals.
- **No chart-only presentation:** Exact scenario numbers are displayed in a table, and source caveats survive into the presentation.
- **No financial uplift from the new layout:** Changing a color or adding a presentation view does not validate the scenario assumptions.
- **No official Sandler logo reconstruction:** Approved logo usage is a separate rights/brand asset gate.
- **No Actions runs or PR creation:** The owner has explicitly stated that GitHub Actions budget is unavailable; development remains on a non-PR branch without altering CI policy or the MVP PR.

## Outstanding acceptance

1. Run \`npm test\` natively with Node.js 20+ on the exact branch revision.
2. Use real Chrome/Edge to verify a 4-stage rep meeting, keyboard navigation, scenario edits, responsive widths, text contrast, JSON/CSV exports, and print-to-PDF.
3. Obtain authorized Sandler logo asset/usage guidance and review exact visual identity, legal trademark notice, and claim language before deploying or sharing externally.
4. Financial owner reviews scenario/ROI semantics and the distinction between illustrative, reported and verified evidence.
5. Keep the existing PR and required CI gates **on hold**, rather than treating budget exhaustion as green CI.

**Reproduce without GitHub Actions:**

\`\`\`sh
git fetch origin feat/roi-evidence-cost-hardening
git switch feat/roi-evidence-cost-hardening
npm test
npm start
\`\`\`

Local preview address: \`http://127.0.0.1:4173\`. No GitHub Actions command is required to run these tests locally.
