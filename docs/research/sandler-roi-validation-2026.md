# Sandler ROI validation and verification: public-methodology research

**Researched:** 2026-11-23  
**Purpose:** Support the rep-led Sandler ROI Workbench with evidenced measurement practices and bounded financial modeling.  
**Status:** Public-source research and engineering recommendations. **Not** an internal Sandler implementation specification, endorsement, certification, or reproduction of a proprietary calculator.  
**Repository context:** Open MVP PR #1, feature HEAD at research start \`b91d2a186f479a2f2fb0912288dad56c55291e35\`.

## Executive finding

Sandler publicly describes a **measurement system** rather than a single uniform monetary ROI equation. Its July 2026 **Sales Performance Ecosystem (SPE)** framework uses **Baseline → Improve → Reassess → Reinforce → Retain → Optimize**, measures seller skill execution in AI roleplay and real buyer conversations, and links adoption patterns to business measures such as revenue per seller [S1, S2]. Sandler-affiliated consultants recommend agreeing on commercial baselines such as win rates, average deal size, sales-cycle time and discounting **before** training [S3, S4].

Sandler also publishes a buyer-led discovery principle: guide the prospect in calculating the financial consequences of its own problems, rather than asserting a standard ROI number [S5]. That directly supports a configurable, rep-operated, client-input-first workbench.

**Boundary:** I found no publicly disclosed, reproducible Sandler-wide financial ROI calculation specification, versioned formula registry, independent financial audit of SPE's revenue attribution, standard statistical control protocol, or publicly inspectable sample output from Sandler's own ROI calculator. Sandler's updated privacy notice **does mention an ROI calculator** and a third party assisting in its operation [S6]. That statement confirms the existence of a disclosed service category, **not** its implementation, formula, availability, current user interface, or relationship to this independent repository.

## 1. Publicly described Sandler measurement workflow

| Sandler lifecycle step | Publicly described method | Data category for future workbench mapping | What it does **not** prove |
| --- | --- | --- | --- |
| Baseline | Benchmark seller performance against Sandler methodology using AI roleplay and conversation intelligence | Per-seller skill rubric/score, baseline date, observed call sample, deal-stage/context metadata | Baseline skill score is not monetary ROI |
| Improve | Target development using the assessed skill gaps | Training assignment, coaching plan, curriculum, participation | Enrollment does not imply changed behavior |
| Reassess | Re-score the same benchmark scenario after training | Reassessment rubric, comparable protocol, time and participant | Roleplay improvement may not transfer to real calls |
| Reinforce | Practice and coach weaker skills using fresh signals | Coaching frequency, follow-ups, practice evidence | Coaching count is not a profit contribution |
| Retain | Monitor skill execution in real calls and AI roleplay over time | Longitudinal adoption/retention, call scoring | Adoption correlations alone cannot isolate causal impact |
| Optimize | Review ongoing performance data and adjust development | Seller-level trends, organizational results, revenue per seller | Revenue change may reflect territories, prices, market conditions |

**Sources:** Sandler's SPE product page and July 8, 2026 product announcement [S1, S2]. The published materials are vendor statements about a product offering, not a peer-reviewed validation of its performance claims.

### Behavioral pathway described by Sandler

\`\`\`text
Measured initial skill
    -> targeted training/practice
    -> assessed skill improvement
    -> observed live-call adoption and retention
    -> operational leading indicators (meetings, qualification, pipeline hygiene)
    -> financial lagging indicators (win rates, deal value, cycle, revenue per seller)
    -> attributed incremental monetary contribution, if demonstrated
    -> cost-adjusted financial ROI
\`\`\`

Only the **first six** are directly described as linked measurements in Sandler's public SPE material; the final two are a **recommended independent financial validation extension**, not a claim that Sandler publishes those calculations. The 2020 Gong/Sandler partnership independently documents use of conversation analytics to observe methodology adherence, with a customer-reported performance anecdote [S7]. It does not disclose a randomized comparison or full cost-accounted ROI audit.

## 2. How Sandler says to establish the business case

- **Prospect-owned figures:** Sandler-affiliated guidance says sellers should help buyers quantify the financial cost of the problem and have buyers supply their own figures, instead of delivering a pre-packaged return [S5].
- **Define commercial baselines before intervention:** A Sandler training center explicitly recommends baseline close rate, deal value, cycle length and frequency of discounting [S3]. Another recommends problem-specific measurements, not a universal training ROI formula [S4].
- **Measure the difference between *knowing* and *doing*:** Sandler stresses observed skill use in real conversations, not just attendance, course completion, or roleplay-only scores [S1, S2, S8].
- **Measure durable behavior:** Training should include reinforcement and management coaching and reassess adoption beyond a single post-training observation [S8, S9].
- **Link leading to lagging indicators:** Sandler's published HubSpot case study describes identifying leading activities associated with lagging revenue metrics and implementing transparent CRM reporting [S10].
- **Account for confounding:** Sandler-affiliated commentary explicitly recognizes market changes, lead quality, pricing and territory assignments as alternative explanations for revenue movement [S8, S9]. A simple before/after comparison should therefore be called an observed change, not automatically a Sandler-caused improvement.

## 3. Financial ROI: independent auditable calculation standard

The following is a **recommended engineering and financial analysis protocol**, not a confirmed Sandler proprietary formula. It is compatible with the ROI Institute's public guidance on isolating program effects, converting impact to money, and using fully loaded program cost [I1].

**Definition:**

\`\`\`text
attributable_incremental_profit
  = sum(verified incremental contribution by mutually exclusive driver and time period)
  - any cross-driver double counting
  - directly incremental delivery costs not already accounted in the contribution

fully_loaded_program_cost
  = fees + setup + paid training time + travel + software/licenses
         + incremental coaching/admin + other relevant implementation costs

net_program_value = attributable_incremental_profit - fully_loaded_program_cost

ROI_percent = (net_program_value / fully_loaded_program_cost) * 100
Benefit_cost_ratio = attributable_incremental_profit / fully_loaded_program_cost
\`\`\`

Do not divide revenue growth by training fees and call that ROI. Revenues from won deals require an explicitly scoped **incremental contribution margin**; price recovery may flow through at a different margin, but price/volume response and fulfillment costs must be tested. Costs must match the modeled horizon. Revenue lost through lower deal volume can offset apparent gains from reduced discounts.

### Attribution evidence hierarchy (recommended, not Sandler's own published rating scale)

| Evidence state | Example | Valid claim |
| --- | --- | --- |
| **Scenario only** | A buyer explores 2-point win-rate improvement | Hypothetical potential, not measured or attributable |
| **Baseline measured** | CRM extract of 12-month win rate, period and denominator recorded | Historical baseline established |
| **Post-change observed** | Comparable time-period win rate and call-behavior scores | Measured association or observed shift |
| **Adjusted comparative evidence** | Matched teams/cohorts or defensible time-series control, other drivers examined | Incremental effect estimate with method/uncertainty |
| **Financially verified** | Attributed gain converted to incremental margin, net of full costs, reconciled to financial records | Qualified realized ROI with evidence trail |

The CDC's 2024 program evaluation framework distinguishes observational monitoring from causal impact designs and notes that experimental and quasi-experimental designs can better rule out alternative explanations [I2]. This is outside Sandler and is included for methodological rigor.

**Minimum data contract for a measured financial result:** metric name and definition; unit; baseline and comparison periods; cohort/segment; denominator; source system and extract timestamp; adjustment method and confounders; financial margin and cost basis; formula version; attribution/overlap proof; evidence owner; confidence/uncertainty; and validation status.

### Time and payback

Use a monthly cash-flow ledger for credible *actual* payback. Costs can begin before benefits materialize, and sales cycles, hiring cohorts and adoption produce lags. Payback is the first period when cumulative attributable incremental cash flow minus investment becomes nonnegative. When the workbench currently reports an immediate-run-rate payback, label it **simple forecast payback**, not verified cash-flow payback.

## 4. Adversarial audit of the current Sandler ROI Workbench

**Reviewed source boundary:** \`src/roi.mjs\`, \`src/app.mjs\`, \`index.html\`, \`docs/ARCHITECTURE.md\` in the PR branch at research start. These are source-code observations; browser operation and exact-head full tests are not proven by this document.

| Priority | Finding | Why it matters | Recommendation |
| --- | --- | --- | --- |
| **P0 before claiming realized ROI** | All default financial inputs are illustrative, while the UI can generate a numeric ROI without verified client baselines | A rep could show an attractive complete number as if it were measured | Distinguish **mathematically complete** from **evidence verified**; conspicuous scenario disclosure |
| **P0 before claiming realized ROI** | No causal/comparative attribution protocol, authenticated outcome sources or cross-driver ledger | Cannot prove Sandler caused the modeled gain; win rate, major accounts, pipeline and pricing may overlap | Separate a source-backed observation register from scenario assumptions; never self-certify causality |
| **P1** | Program cost includes recurring fee and setup only | Excludes paid employee practice time, travel, opportunity cost and new licenses | Offer cost subcategories and fully loaded investment mode |
| **P1** | All drivers' annual baselines are scaled linearly by program months | Deals and onboarding do not occur uniformly; multi-year major-account \`firstYearPct\` is ambiguous | Define period/horizon per driver; eventually model monthly cohorts and benefit ramp |
| **P1** | Single overlap factor reduces only win-rate and major-account profit | Pricing, seller ramp and other drivers can also affect the same deals | Driver overlap map and unique contributing deal/account IDs where evidence allows |
| **P1** | Price recovery assumes no loss of volume, unless caller adjusts sensitivity | Reduced discounts may change close rates and revenue volume | Separate contribution margin, price-response assumptions and demand sensitivity |
| **P1** | Win-rate formula uses proposal count × change in percentage points | Qualifying out weak deals can reduce proposals and alter denominators | Define stable funnel cohorts and denominator; report both conversion and volume |
| **P1** | Simple payback spreads modeled benefit evenly over the horizon | A late sale cannot pay back early | Use cash-flow crossing for time-sensitive projection or retain explicit simple-run-rate label |
| **P2** | The four monetary value drivers are fixed in code | Inhibits reuse across different Sandler selling cases | Versioned, typed driver and metric registry, no unrestricted arbitrary-code expressions |
| **P2** | Pipeline bridge is correctly non-additive but lacks period-linked cohorts | Pipeline and revenue may describe different populations and dates | Track generation cohort and eventual realized won revenue; avoid interpreting case-study ratios as portable conversion probabilities |
| **P2** | Skill adoption, call scoring, coaching, revenue/rep aren't currently modeled | Missing the link Sandler emphasizes in SPE | Make them an **optional evidence/measurement track**, not automatic additive monetary drivers |
| **P2** | JSON and CSV exports are local without authenticated evidence provenance | An editable export is not a signed financial result | Mark exports as scenarios and include formula/schema version and source status before future claims of validation |

**Critical distinction:** The engine's missing-value protection is a good mathematical safeguard but **not** validation of client evidence. A populated fictional number is mathematically valid and still not a verified fact.

## 5. Case-study evidence: useful illustrations, not default effect sizes

| Public Sandler example | Observable reported result | What the source does *not* provide |
| --- | --- | --- |
| Revelry GTM [S11] | $6M–$8M pipeline over ten weeks; one participant $364K closed revenue; 75% improvement in AI roleplay skill scores | Full costs, incremental gross margin, true counterfactual or transferable ROI |
| HubSpot [S10] | After 16 months, average selling price +12%, closing cycle 18% shorter; case-study headline references sales productivity improvement | Financial training ROI, controlled causal comparison, pricing/margin-normalized value |
| TrueCar [S12] | Reported 20% revenue increase associated with sales process and accountability changes | Fully costed net incremental profit or isolation of training from other organizational changes |
| BitSight + Gong [S7] | Reported tracked methodology adherence and strong sales quarters | A cohort-controlled monetary ROI result |

These are **publisher or customer case-study claims** and have unequal definitions, durations and baselines. They should be preserved as linked, labeled example observations, not auto-populated as expected conversion rates, win-rate lifts, or guarantees.

## 6. Privacy, compatibility, and operational boundaries

Sandler's 2026 privacy policy states that SPE can receive CRM, call recordings, and conversation analytics from enabled integrations, and that use of its own ROI calculator involves a third-party service [S6]. This **does not** authorize this repository to access SPE data, Sandler CRM accounts, customer recordings, or the underlying calculator. The current browser-only workbench should remain local-first for sensitive prospect financial inputs unless explicitly reviewed access controls, lawful basis/consent, retention and vendor agreements are established.

The existence of Sandler's official SPE suggests an **adjacent** rather than competitive role: the workbench can help a representative co-create a pre-sale business case, while Sandler's measured adoption ecosystem (where contractually available) informs follow-up validation. Do not invent an SPE API or integration permission.

## 7. Recommended implementation sequence and acceptance tests

### Phase A: Reconcile prospect-facing financial truth
- Label all numeric totals as **illustrative** until source evidence states otherwise.
- Add client-confirmation flags for each input, with date/source and status (\`example\`, \`client-reported\`, \`document-backed\`, \`verified\`).
- Add a cost-category breakdown and distinguish annual, period, and one-time inputs.
- Add a transparent formula drill-down; show assumptions and exclusions in all exports.
- **Acceptance:** Unknowns remain unknown; a demo figure cannot become a verified benchmark by merely being nonblank.

### Phase B: Govern the model
- Define a typed metric registry and versioned driver definitions with dependencies, units, bounds, periods and overlap groups.
- Test formula dimensions, determinism, missing values, overflow, scenario separation, price/demand response and consistency across 6/12/24-month periods.
- **Acceptance:** No silent double counting or unit mismatch; formula changes are reviewed and testable.

### Phase C: Add optional measurement/verification track
- Record baseline and post-program snapshots, seller skill benchmark, real-call adoption, operational activity and revenue/rep **without** automatically treating any as caused by training.
- Provide cohort comparisons where data supports them; preserve external influences and uncertainty.
- **Acceptance:** An observed skill improvement cannot by itself produce financially “realized ROI.”

### Phase D: Finance-grade realized reporting
- Reconcile sales gains against contribution margin, control assumptions, cost ledger, exact periods and finance evidence.
- Only then permit a qualified realized ROI label, with independent review/approval of data and attribution.
- **Acceptance:** Every included monetary benefit traces to its source, method and non-overlap determination; all costs are included.

## 8. What remains unknown / questions to ask Sandler

1. Does Sandler maintain an internally authorized quantitative ROI workbook, formula specification, model schema, or numeric guardrail for sales representatives? If so, can a version be shared for independent, approved implementation?
2. What is the exact data contract and scoring rubric of the SPE AI roleplay and live-call skill assessments? Are real calls scored on the same scale and comparable cohorts?
3. Which business metrics does SPE actually integrate and reconcile with revenue per rep, at what time granularity and with what attribution method?
4. Does Sandler's referenced third-party ROI calculator have an accessible approved API, or is it a separate branded marketing tool? Its formula source and terms remain unverified.
5. Which training-related costs should be included for prospect-facing ROI in the representative's service offering?
6. What financial approval or validation status may a representative legitimately show to prospects, and what brand/marketing approval is required?

None of these answers should be invented from promotional content.

## Source register

### Sandler headquarters or corporate
- **[S1]** Sandler, [Sales Performance Ecosystem](https://sandler.com/solutions/sales-performance-ecosystem/) (accessed 2026-11-23). Published six-stage operating process.
- **[S2]** Sandler, [Sales Performance Ecosystem launch announcement](https://sandler.com/news/spe-press-release/), July 8, 2026. Vendor-reported behavior measurement and revenue-per-rep connection.
- **[S6]** Sandler, [Global privacy policy](https://sandler.com/privacy-policy/), updated July 2026. Describes SPE data flows and third-party-operated ROI calculator category.
- **[S10]** Sandler, [HubSpot sales transformation case study (PDF)](https://enterprise.sandler.com/hubfs/Sandler-HubSpot-Case-Study.pdf), 2023. Published leading/lagging metric example and case-study outcomes.
- **[S11]** Sandler, [Revelry GTM case study](https://sandler.com/case-study/revelry-gtm/), 2026. See [existing evidence note](../case-studies/revelry-gtm.md).
- **[S12]** Sandler, [TrueCar case study](https://sandler.com/case-study/rebuilding-sales-confidence-and-capability-post-covid/), 2025.
- **[S13]** Sandler, [Sales Training Works. Here's Why You Can't Prove It](https://sandler.com/blog/sales-training-works-heres-why-you-cant-prove-it/), 2026. Vendor perspective on skill-execution evidence and revenue measurement.

### Sandler-affiliated trainers/centers (practice guidance, not necessarily global policy)
- **[S3]** The Ruby Group, [Sales training cost & ROI: what CEOs should expect](https://go.sandler.com/therubygroup/insights/blog/categories/marketing/how-much-does-sales-training-cost-and-what-roi-s/), August 17, 2026.
- **[S4]** Sandler Edmonton, [Is sales training worth the investment?](https://go.sandler.com/ayon/insights/blog/categories/sales-training/is-sales-training-worth-the-investment-what-edmo/), 2026.
- **[S5]** Sandler Canary Wharf, [The ROI conversation your CRM won't teach you](https://go.sandler.com/londoncanarywharf/insights/blog/categories/sales-methodology/the-roi-conversation-your-crm-won-t-teach-you/), 2026.
- **[S8]** Sandler Topline Growth, [Why sales training fails to stick and how to fix it](https://go.sandler.com/toplinegrowth/insights/blog/categories/sales-training/why-sales-training-fails-to-stick-and-how-to-fix/), October 12, 2026.
- **[S9]** Sandler Prairie Edge, [Benchmark, Train, Verify](https://go.sandler.com/prairie-edge/insights/blog/categories/sales-training/benchmark-train-verify-closing-the-loop-between-/), October 5, 2026.

### Other public sources (independent methods, not Sandler rules)
- **[S7]** Gong, [Gong and Sandler training partnership](https://www.gong.io/press/gong-and-sandler-training-partner-for-measurable-data-driven-sales-learning-programs), January 2020. Partnership press release and customer anecdote.
- **[I1]** ROI Institute, [ROI Methodology](https://roiinstitute.net/roi-methodology/). Monetary conversion, isolation and fully loaded cost principles.
- **[I2]** CDC, [Program Evaluation Framework, 2024](https://www.cdc.gov/mmwr/volumes/73/rr/rr7306a1.htm). Study design and causal-claim standards.

**Research integrity note:** Corporate marketing, franchise-center commentary and case-study anecdotes are evidence of **stated practices or claims**, not independent proof of their numerical efficacy. Links were opened or searched publicly; no authenticated internal SPE account, trainer manual, calculator implementation or live customer datasets were inspected.
