# Sales Growth Discovery: standalone intake product boundary

**Status:** Implemented first independent-entrypoint prototype; product acceptance pending.
**Decision:** Treat the survey as a separate customer-facing product, not a tab inside the ROI Workbench.
**Source:** "Dollarizing Pain: Sales Rep Script for Dollarizing Pain" supplied by the owner, specifically the six sequential question groups from pp. 1–5. The source contains example formulas and illustrative dollar totals, not verified industry-average customer outcomes.

## Product division

| | Sales Growth Discovery | ROI Workbench |
| --- | --- | --- |
| Primary person | Customer with or without the rep | John / Sandler representative |
| Job | Capture factual answers, unknowns, sources and notes | Validate assumptions, edit financial baselines, model and compare outcomes |
| Workflow | Six steps and review | Discover, Model, Compare, Present |
| Output | Versioned \`sandler-discovery-intake/1\` JSON | Versioned \`sandler-roi/3\` model, optional nested canonical intake |
| Math | No ROI, training-return promises or summed cost of inaction | Single authoritative \`src/roi.mjs\` engine |
| Data sharing | Explicit local file handoff | Explicit local import and review, JSON/CSV exports |
| Persistence | In-memory; downloadable JSON and reopen | In-memory; explicit local customer folder / backup |
| Runtime | \`/survey/\` independently navigable Pages entrypoint | \`/\` original workbench entrypoint |

The survey imports only \`src/intake-contract.mjs\`, which has no dependency on ROI math, browser objects or user interfaces. For now they share one hosting repository and one pure schema module; they can split repositories once distribution/branding requirements warrant it. Do not claim these are separate deployed services or private sites.

## Six steps
1. Business basics: team size, deals per rep, average deal value, annual client value, incremental gross margin.
2. Prospecting: first meetings today and a realistic target.
3. Closing: meetings-to-sale rates *distinct from* proposal-to-win rates; optional annual proposal volume.
4. Discounting: discount level, list price, deal count, discount-affected annual revenue.
5. Deal size: target deal value.
6. Sales turnover: annual departures, replacement cost, ramp months, annual hires and productive seller revenue.

Each answer has **status** \`provided\`, \`reference\` or \`unknown\`, a typed value, explicit unit and source metadata. Unknowns do not block survey progression. \`reference\` requires publication title, HTTPS URL and applicable population; the presence of those fields is a declaration, not independent verification.

## Workbench mapping and integrity
- **Maps:** name, deal size, gross margin, proposal count, proposal-stage win rate, annual discount-exposed revenue, ramp months, annual hires, annual revenue/productive seller.
- **Does not map by implication:** meetings close rate to proposal win rate; discount rate to price uplift; target deal size to a new incremental driver; turnover costs to an existing seller ramp contribution. These remain in the nested intake for future modules.
- An import **replaces** a customer model only after a preview and confirmation. It starts numeric inputs blank, then fills only approved exact equivalents. The current synthetic sample fee is **never inherited**.
- Provenance: customer-provided numbers are \`prospect-reported\`; user-provided published references are \`external-reference\`; edits in the workbench demote the affected status to unconfirmed. A claimed published reference never becomes a verified customer fact.
- Workbench JSON is schema v3 and preserves the entire canonical intake and the editable current financial model. v1/v2 import stays supported. Scenario assumptions remain visibly hypothetical.
- The workbench's baseline cards have buttons that focus the existing editable fields, not separate competing values.

## Industry benchmark policy / initial research
Do **not** fill every unanswered field with a national average. Inference is a factual risk, not an accessibility improvement. Published figures must be comparable by population, period, unit, sales funnel denominator, and publication date.

**Candidate under research (not a shipped fallback):** HubSpot's 2024 Sales Trends Report reports a 21% average **sales win rate**. Its general deal/opportunity measure is not automatically a proposal-to-win or meetings-to-win metric for a specific Sandler customer. It may eventually be relevant for a narrowly defined segment only with a supporting methodology and John/owner approval.
Source: https://www.hubspot.com/hubfs/HubSpots%202024%20Sales%20Trends%20Report.pdf

**Not appropriate as generic turnover defaults:** BLS JOLTS totals are by industry rather than occupation. Sales-rep attrition cannot be inferred directly from whole-industry separations.
Source: https://www.bls.gov/jlt/jltfaq.htm

**Explicitly excluded:** The stakeholder-quoted \$800,000 bad-hire lifetime cost and \$29 back for \$1 of training remain unverified research prompts; see #13. No benchmark is loaded into the product by default in this initial version. The survey can accept a manually reviewed, properly attributed published reference and display its provenance, but its values are still not finance-verified. Once benchmark research is complete, add a versioned opt-in catalog with scope restrictions, freshness checks, owner acceptance and replacement rules.

**Future experience:** For each unknown field, automatically offer a vetted, matching reference only where one exists. Where no defensible match exists, preserve unknown without impeding survey completion. A franchisee training demonstration can use a clearly marked illustrative scenario rather than presenting average data as the franchisee's facts.

## Next capability gates
- Research and approve segmented benchmark candidates; no unsourced auto-defaults.
- New prospecting, deal-size and turnover analytics need independent formulas, unit/overlap analysis and tests. They must not be silently summed with current ROI.
- Improve Compare with the document's questioning/alternative assumptions framework, but preserve delayed full financial reveal until Present.
- Decide whether separate repository, domain, survey distribution, customer submission/authentication and at-rest encryption are needed after product validation.
- Review whether intake should allow revising un-mapped fields directly inside the workbench or use its separate editable survey entry point plus re-import.
- Consumer-grade simplified franchisee product remains its own discovery issue (#12); broader Compare and hiring expansion remain #13.

## Privacy and limitations
Both sites are public static Pages routes without authentication. No data is automatically transmitted by the application. JSON downloads are plaintext and may include confidential customer information; use approved storage and devices. There is no server inbox, automatic CRM saving, automatic benchmark refresh or data recovery after a tab crash.
