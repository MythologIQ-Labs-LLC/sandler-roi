# Sandler ROI Workbench: architecture and contracts

**Status:** Proposed baseline for the unmerged MVP, not a production certification.  
**Recorded:** 2026-11-23  
**Scope:** `MythologIQ-Labs-LLC/sandler-roi`, feature branch `feat/sandler-roi-workbench-mvp` and PR #1.  
**Intended operator:** a Sandler sales representative presenting financial possibilities to a prospective client.

## 1. Product definition

The app is a **rep-led, prospect-facing value demonstration workbench**, not a Sandler training delivery system, a COIT-specific spreadsheet, a prediction service, or an autonomous closing agent. Its primary job is to make the business case inspectable in a live conversation:

1. **Discover** prospective-client financial baselines and engagement cost.
2. **Explore** plausible improvement hypotheses in editable scenarios.
3. **Explain** each modeled financial contribution, assumptions, limits and tradeoffs.
4. **Present** a legible executive summary; export a locally saved, revisable model.

The Sandler rep owns the conversation and selects assumptions. The prospect or an approved source owns real-world baseline facts. The program's outcome is **hypothetical** until observed results exist. Calculated ROI is not proof that Sandler caused improvement.

### Non-goals for MVP

No login, shared CRM, agentic autonomy, network analytics, server-side storage, automated financial verification, deal closure, actual-cash-flow payback or certification of a client's financials. Never imply Sandler brand approval beyond the fact that this is a tool for a representative.

## 2. Current runtime topology (as inspected on the feature branch)

```text
Sandler rep + prospect
       |
       v
index.html                presentation shell / responsive styles
       |
       v
src/app.mjs               input editing / scenario selection / rendering / import-export
       |
       v
src/roi.mjs               deterministic validation and financial calculations
       |
       +--> in-memory model + scenario state (no automatic persistence)
       +--> local JSON/CSV download; print presentation
       
server.mjs                Node.js loopback static server (127.0.0.1)
tests/roi.test.mjs        node:test calculation tests
.github/workflows/test.yml  targeted PR check (currently not green)
```

This is a **single static frontend with a local development server**. No network service or data repository is needed to demonstrate value. Browser application and calculation engine are separate modules. The engine must remain callable without DOM, browser globals, or remote services.

### Ownership boundaries

| Component | Responsibility | Must not do |
| --- | --- | --- |
| `src/roi.mjs` | Numeric validation, formula definitions, scenario result/status and errors | Read from DOM, issue network requests, silently coerce unknowns to zero |
| `src/app.mjs` | User interaction, scenario state, input binding, projections, presentation, import/export | Maintain a second competing financial formula implementation |
| `index.html` | Accessible presentation and layout | Add business logic or obscure assumptions |
| `server.mjs` | Local-only preview and restrictive file serving | Become production authentication/storage API by accident |
| `tests/*` | Formula, boundary, integration and UX regressions | Treat a green unit suite as proof of financial validity |
| `docs/*`, `AGENTS.md` | Human-readable decisions, constraints, model semantics | Claim governance authority that has not been established |

## 3. Model contract (current)

Inputs: annual baseline metrics, training investment `monthlyFee * programMonths + setupFee`, participation count, optional source notes.  
Scenarios: `conservative`, `expected`, `upside`, each with independent value-driver improvement and realization assumptions.  
Enabled drivers: pricing, wins, accounts, ramp.  
Evaluation period: `programMonths` (1 to 60); current implementation scales annual amounts by `programMonths/12`.

The four **current** value drivers are fixed in code, while their inputs and selected scenarios are configurable. **User-authored formula definitions, an unlimited KPI catalog, a value-driver plugin system, and actual-vs-projected reconciliation do not exist yet.** Do not present them as delivered features.

| Driver | Current contribution formula (profit-valued) | Important unit |
| --- | --- | --- |
| Pricing | discounted annual revenue × price improvement points / 100 × price profit-flow fraction × realized fraction × period years | Percentage **points**, not relative percentage |
| Proposal wins | annual proposals × improved win-rate points / 100 × average deal revenue × gross-margin fraction × realized fraction × period years | Additional deals per year |
| Major accounts | signed accounts × annual revenue/account × first-year capture fraction × gross-margin fraction × realized fraction × period years | Counts and annual dollars |
| Faster ramp | new hires × saved months / 12 × annual revenue/productive seller × gross-margin fraction × realized fraction × period years | Months of seller productivity |

Overlap: the current implementation applies a **configurable percentage reduction only to the combined win-rate and major-account contributions**. It does not fully resolve cross-driver attribution. Treat any remaining overlap as a disclosed modeling limitation.

```text
known_contributions = sum(enabled, fully valid driver contributions)
overlap_deduction    = (wins + accounts) * overlap_fraction
modeled_benefit      = max(0, known_contributions - overlap_deduction)
net_value            = modeled_benefit - program_cost
ROI_percent          = net_value / program_cost * 100, if cost > 0
multiple             = modeled_benefit / program_cost, if cost > 0
simple_payback       = program_cost / (modeled_benefit / program_months), if benefit > 0
```

**Semantics:** The reported benefits are *modeled incremental gross-profit/contribution*, not gross sales, revenue booked, or realized cash. Payback is a simplified uniform-run-rate estimate, not a monthly cumulative cash-flow crossing.

### Input and calculation rules

- `missing`, `invalid`, `excluded`, `ready` must remain distinct states. Never silently replace a missing included input with numeric zero.
- An included invalid lever makes **total** ROI incomplete; excluded levers contribute zero by explicit user choice.
- Percentages must have explicit ranges and units. Never confuse 0.5% relative growth with a 0.5 percentage-point improvement.
- Do not mix annual revenue with period revenue without explicit time normalization.
- Refuse impossible assumptions (e.g., win rate above 100%; ramp months saved above current ramp).
- Training investment and costs must be scoped to the same period as modeled benefit.
- A price-affected revenue base is not itself a dollar discount amount.
- “Realization/attribution” rates are user-entered sensitivity factors, **not evidence of causality**.
- Annualizing or extending first-year/account values beyond a single year requires an explicit documented model decision.

### Known math and modeling limitations to resolve before production use

1. **Major-account period semantics:** `accountFirstYearPct` and `programMonths/12` both affect modeled revenue. For periods over 12 months, or signed accounts arriving late in the period, the meaning must be clarified and tested.
2. **Ramp cohorts:** `newHires` is treated as a period-wide count despite the annual cadence. Hiring dates and ramp curves are not modeled.
3. **Overlap accounting:** a single win/account deduction cannot fully account for pricing, pipeline, hiring and account overlap; richer attribution requires independent validation.
4. **Time-to-value:** the current simple payback ignores month-by-month training costs, adoption delays, sales-cycle lag and staged account wins.
5. **Display semantics:** label forecast, incremental profit contribution and actual revenue distinctly.
6. **Evidence scope:** source notes are free text, not a verified provenance ledger. Financial completeness is different from evidentiary confidence.

## 4. Desired stable model layers (future, not yet implemented)

```text
[Prospect profile / engagement]
             |
[Metric registry]            units, baseline, source, provenance, timestamp, trust state
             |
[Value-driver definitions]  formula id, version, dependencies, bounds, overlap group
             |
[Scenario engine]           named assumptions, timelines, sensitivity, conflict checking
             |
[Financial aggregation]     contribution, costs, net value, ROI, break-even, payback
             |
[Presentation / export]     interactive charts, explainability, prospect-ready summary
             |
[Realization ledger]        OPTIONAL LATER: verified measured actuals vs forecast
```

The calculation engine is the authority for arithmetic. Templates are configuration, not copies of business logic. Never create a new formula in the UI layer to avoid changing the engine. A future model schema should support explicit versioning, import migration, typed units, evidence status and deterministic formula dependency ordering.

## 5. Safety, privacy, and claims

- Prospect-reported pricing, revenue, win rates and hiring costs can be commercially sensitive.
- As implemented, the app is client-only. Local JSON and CSV exports remain on the rep's device, subject to that device's data handling. Do not add remote persistence or telemetry without a reviewed authorization and privacy model.
- Avoid arbitrary imported expressions or remote code evaluation. Formula extensions must use a constrained, reviewed registry; **no `eval`**.
- Never generate statements such as “Sandler will deliver X% ROI” from modeled scenarios. Use “If these inputs and improvements hold, the model estimates…”
- Disclose fictional starting data, missing baselines, unknown attribution, time assumptions, and any driver exclusions visibly in customer-facing summaries.
- No official Sandler logo, endorsement claim, external credential, or prospect account integration should be assumed without separate approval.

## 6. Verification and release boundaries

**Current state:** PR #1 is open. The GitHub validation workflow has reported failures; the previous session could not obtain job steps or logs. Local smoke assertions reported previously do not substitute for completed CI or a browser UX acceptance run.

Minimum implementation gates:

1. Independent engine tests for each formula, units, missing/invalid/excluded fields, zero-cost case, negative bounds, scenario separation and overlap.
2. Integration checks: changing any input updates all dependent outputs; exports re-import consistently; present/print do not hide essential disclosures.
3. Property/invariant tests: no negative contribution from allowed inputs; no NaN/Infinity displayed; benefits and costs use consistent periods.
4. Human review of financial semantics and prospect-facing language. The sales rep must be able to explain the math without asserting causality.
5. Explicit owner approval and passing available repository checks before merging or deploying. **Failed or unavailable CI is not a pass.**

## 7. Decisions and open questions

**Decided for the first iteration:** rep-led interface, independent deterministic calculation module, no backend, local exports, three scenarios, explicit model limitations, no production/official Sandler claims.

**Not decided:** named Sandler operator authorization, official brand usage, persistence platform, CRM integration, general formula DSL, whether to model monthly cash flow, formal audit of scenario assumptions, hosting and authentication.

**Next architecture decision:** settle a versioned metric/driver contract and modeling horizon semantics before adding more financial formulas. A generic workbench must be extensible without making its ROI math impossible to audit.

## 8. Qortara Logic orientation record

Qortara Logic Demo capabilities were consulted on 2026-11-23. The hosted tool is an evaluator of **caller-supplied** policy, applicability, context and gate inputs. It cannot inspect GitHub, initialize repository files or grant authority. Host GitHub actions are separate.

An applicability request for this documentation change returned `resolved` with **zero governance sources supplied**. This means **no authoritative repository/org governance rules were established by that evaluation**, not that governance requirements are absent or fulfilled. Context selection classified the supplied paths as a proposed read set; it did not read them. No validated canonical governance manifest, route policy, gate or release approval has been established in this document.

The documents here are a proposed engineering baseline for review, not an assertion that Qortara has installed or formally approved governance.

## 9. Case-study informed pipeline analysis (2026-11-23)

**Decision:** add an independent, optional pipeline-to-value *bridge*, not a fifth additive ROI driver. See [Revelry GTM source mapping](case-studies/revelry-gtm.md).

It accepts prospect-specific qualified pipeline value, its observed time period in weeks, expected percent of pipeline dollars converting to closed revenue, existing gross margin, and a separate scenario attribution factor. It calculates projected closed revenue, projected gross profit, and scenario-allocated profit. The amount is **excluded from total modeled ROI**, even when the inputs are complete. The model does **not** annualize or extrapolate 10-week results; projection for another period requires new prospect-specific assumptions.

**Adversarial review:**
- Reusing a reported case-study outcome as default ROI input would falsely imply transferability. **Rejected.**
- Treating reported $3.5M pipeline and $364K closed sales as a general 10.4% pipeline conversion benchmark would assume matching cohorts and time windows not documented. **Rejected.**
- Automatically adding pipeline value to the win-rate and national-account levers would double count overlapping deals. **Rejected.**
- Separate prospect-defined sensitivity with clear source references, independent validity and no additive ROI contribution gives the rep a useful illustration without inflating financial results. **Accepted for the MVP.**

Pipeline is a leading indicator, not revenue. Revenue is not gross profit. Higher AI roleplay scores are a skills measure, not a direct financial benefit. The reported case study does not provide total training cost, verified attributable incremental profit or defensible ROI.


## 10. Cost-scope and source-declaration boundary

**Development status:** Implemented on \`feat/roi-evidence-cost-hardening\`, an independent feature branch based on MVP PR #1. Not merged, not production-certified.

### Investment modes

- **Fee-only** (default, backwards compatible): \`monthlyFee × programMonths + setupFee\`. The UI labels this fee-only and warns that additional costs are excluded.
- **Expanded cost estimate** (explicitly selected): fee cost plus \`participantCount × trainingHoursPerPerson × participantHourlyCost\`, \`additionalMonthlyCost × programMonths\`, and period totals for travel, technology, administration, and other costs.
- Expanded inputs start **blank**, not zero; explicit zero is allowed and missing amounts block cost, net value and ROI.
- Entered expanded costs remain **user-declared**, not independently audited. Time and one-time cost categories must be scoped by the representative to the stated evaluation period.

### Source declarations

The standalone \`src/evidence.mjs\` records a source status and optional reference per baseline input: illustrative, unconfirmed, prospect-reported, document-cited or finance-reviewed (user-declared). The last two require a source label to avoid being presented as supported citations without a reference. **No status independently verifies the source.**

Arithmetic completeness is separate from evidence validity. Editing a numeric input resets its classification to unconfirmed; importing old version-1 JSON defaults to legacy fee-only and unverified declarations; version-2 JSON carries source declarations but does not import a trusted audit status. Exported CSV includes inputs, costs, evidence statuses and an explicit hypothetical-projection label.

### Adversarial decision record

1. Defaulting unexplored indirect cost categories to zero **rejected**: gives artificially favorable return. Blanks block expanded totals.
2. Automatically treating a \`finance-reviewed\` dropdown choice as independent confirmation **rejected**: this is merely the representative's assertion.
3. Breaking existing fee-only scenarios **rejected**: retain legacy arithmetic and expose its cost limitation clearly.
4. Accepting \`calculated\` values or trust flags from imported JSON **rejected**: the engine always recalculates.
5. Starting GitHub Actions while user funding is exhausted **rejected**: commit on a fresh branch without a PR, do not modify workflow or branch requirements.

**Not yet implemented:** independent evidence signing, actual outcomes ledger, complete overlap attribution, monthly cash flow, and fully audited training cost assurance.

## 11. Independent financial-math audit and qualification (2026-11-24)

The early status statements in this document refer to the initial 2026-11-23 MVP/PR #1 and are historical. For the current implementation and review of the deployed formula contract, see [the independent math audit](verification/financial-math-audit-2026-11-24.md).

The audit confirms the arithmetic of the fixed default scenarios against separately computed reference values, and adds an independent 400-case deterministic property comparison. It hardens unsafe aggregate precision, infeasible price-break-even projections and the out-of-horizon payback/overlap presentation.

The existing annual-factor and cross-driver attribution limitations listed in §3 remain unresolved modeling decisions, not solved by passing unit tests. Mathematical correctness of hypothetical scenarios is not real-world financial validation or proof of Sandler causality.
