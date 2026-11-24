# Sandler ROI Workbench: independent financial mathematics audit

**Date:** November 24, 2026  
**Source revision inspected:** main at `0b6a89887e1b30b6f23746de125a90a5b65848be`.  
**Remediation branch:** `audit/financial-math-hardening-20261124`.  
**Scope:** actual `src/roi.mjs` formula units, all four drivers, cost scope, overlap, aggregate results, ROI, benefit/cost multiple, simple payback, price break-even, pipeline bridge, extreme values, and how results appear in Present.

**Finding:** The default conservative/expected/upside arithmetic agrees with an independently constructed reference calculation. It is **not** independently verified customer ROI and does **not** establish training causality. Three math/reporting edge cases needed correction, and multiple business-model assumptions still need explicit customer/finance approval before a product can support an actual realized-ROI assertion.

## 1. Independently recomputed default scenarios

All values below use the source repository's *fictional* sample input. Investment is $6,600/month × 12 months = $79,200, excluding optional extra costs.

| Driver and output | Conservative | Expected | Upside |
| --- | ---: | ---: | ---: |
| Price contribution | $12,000 | $28,000 | $68,000 |
| Additional wins contribution | $18,000 | $42,000 | $102,000 |
| Major-account contribution | $0 | $42,000 | $134,400 |
| Ramp contribution | $30,000 | $100,000 | $195,000 |
| **Less overlap** (win + account) | **−$1,800** | **−$12,600** | **−$47,280** |
| **Total modeled benefit** | **$58,200** | **$199,400** | **$452,120** |
| Program fee investment | $79,200 | $79,200 | $79,200 |
| **Net modeled value** | **−$21,000** | **$120,200** | **$372,920** |
| **ROI** | **−26.5%** | **151.8%** | **470.9%** |
| Benefit/cost multiple | 0.735× | 2.518× | 5.709× |
| Simple forecast payback | 16.3 months† | 4.8 months | 2.1 months |
| Additional price points needed to break even | 0.688 | 0 | 0 |

† The conservative forecast does **not** break even within its 12-month evaluation period. Reporting 16.3 months is merely extrapolation of the assumed steady monthly benefit **beyond** that period, not observed cash-flow payback.

### Equations and dimensional review

Let `Y = programMonths / 12`; `p = pricePoints / 100`; `w = winPoints / 100`; and other percentage fields represent fractions from 0 to 1.

- **Price contribution ($):** annual discount-affected revenue × `p` × price contribution-to-profit × realization × `Y`. This is *percentage-point* price improvement, not relative percent growth. No demand response/volume loss is modeled.
- **Additional proposal wins ($ contribution):** annual proposal count × `w` × deal revenue × incremental gross-margin fraction × realization × `Y`. A denominator/cadence mismatch can invalidate its business interpretation even when the arithmetic passes.
- **Major-account contribution ($):** new accounts × annual revenue per account × first-year capture × gross-margin fraction × realization × `Y`. The meaning of new accounts and first-year capture **over multiple years remains ambiguous**.
- **Ramp contribution ($):** new hires/year × saved ramp months / 12 × annual revenue per productive seller × margin × realization × `Y`. This assumes recovered ramp months are equivalent to full productive contribution and evenly distributed cohorts.
- **Overlap deduction ($):** `(win contribution + account contribution) × overlapPct / 100`. Price and ramp overlap is **not** resolved, so the single scalar does not prove unique benefits.
- **Total benefit:** sum of enabled, valid contributions − overlap deduction; null if any included driver or cost scope is invalid.
- **Fee-only investment:** monthly fee × evaluation months + setup fee.
- **Expanded investment:** fee-only cost + people trained × paid training hours per person × loaded hourly cost + other recurring monthly cost × evaluation months + travel + technology + administration + other one-time implementation costs. Explicit zeroes are required.
- **Net value:** modeled benefit − program investment.
- **ROI (%):** net value ÷ investment × 100, for positive investment. **Benefit/cost multiple:** benefit ÷ investment. A 151.8% net ROI corresponds to a 2.518× *gross benefit/cost* multiple; these must not be confused.
- **Simple payback (months):** investment ÷ (modeled benefit / evaluation months), for positive benefit. This assumes constant benefit run rate; it is *not* cumulative cash-flow payback.
- **Additional price break-even (percentage points):** `max(0, cost − benefit from all other drivers net of overlap) / (annual eligible discount-affected revenue × price profit-flow fraction × capture fraction × Y) × 100`, when the denominator is positive. If other drivers already cover cost, answer is **0 even when the pricing denominator is zero**. If remaining cost cannot be recovered within supported 0–100 price points or eligible pricing revenue is absent, do not present an achievable answer.
- **Optional pipeline:** pipeline dollars × projected conversion = modeled closed revenue; × margin = modeled gross profit; × attribution sensitivity = allocated profit. **Never add this amount to the four-driver ROI total.** Weeks identify the observation period and are not silently annualized.

## 2. Confirmed calculation / presentation defects addressed

| Severity | Defect in prior main | Correction | Regression |
| --- | --- | --- | --- |
| High | Break-even calculation returned N/A for zero eligible revenue even when non-pricing benefits already fully paid the program cost | Calculate remaining cost first; return zero additional price points when no price gain is needed | Explicit zero-denominator-but-covered fixture |
| High | Break-even calculation could display millions of additional price points, even though the input supports only 0–100 | Return an explicit outside-supported-range status and show an honest non-achievable label | Tiny pricing base, zero pricing base, and feasible net-zero fixture |
| High | Large *finite* benefits and combined totals could exceed reliable dollar-precision limits; near-zero cost could yield infinite ROI | Refuse unsafe contributions/aggregate results and non-finite derived values, leaving ROI incomplete | Single/aggregate large-value and tiny-cost fixtures |
| Medium | Default conservative scenario displayed 16.3-month payback on a 12-month model without clearly flagging the extrapolation | Add † and an explicit continuation caveat; preserve original simple-payback arithmetic | Real Chromium UI assertion |
| Medium | Listed driver contributions did not visibly reconcile to the smaller total benefit because the overlap deduction was missing from the driver list | Show the dollar overlap subtraction as its own Present line item | Real Chromium reconciliation assertion |

**Scope:** This hardening does not change normal scenario profit/ROI formulas, the three default results, or cost-source validation. It does add a break-even status field and refuse unsupported precision/extreme ratios. The engine remains the sole arithmetic authority.

## 3. Independent test method and evidence requirements

1. Recompute the three default scenarios using separate decimal arithmetic; verify each driver and aggregate result.
2. Run the checked-in `tests/financial-math-audit.test.mjs`, including a **separately written reference model** and 400 deterministic, seeded parameter combinations that vary months, price, proposals, accounts, hires, margin, investment, enabled drivers and overlap.
3. Check standalone expanded-cost math, percentage-point feasibility, zero-cost cases, missing data, output precision, non-finite ratio guards, break-even, and pipeline non-additivity.
4. Run native `npm test` at the exact PR head, real Chromium acceptance (including overlap and beyond-horizon labels), `npm run check:pages`, HTTP smoke and CodeQL.
5. Do not mark accepted until those gates pass and the deployed Pages SHA matches the merged revision. Passing computational tests cannot validate the real customer's source figures.

## 4. Remaining business-model risks (not silently "fixed")

These are **not** arithmetic mistakes that a code edit can solve without a modeling specification or customer evidence:

- **P1 / Horizon and cohort timing:** The same annual-scale factor multiplies first-year major-account capture and new-hire ramp results for terms up to 60 months. Without signed-account dates, renewal/cohort assumptions, and separate benefit duration, outputs beyond 12 months can materially misrepresent the business case. Confirm with the representative and finance before treating multi-year outputs as precise forecasts.
- **P1 / Attribution and double counting:** The existing deduction covers win-rate and national-account contributions only. Pricing can affect conversion, account size and ramp-related revenue. A single overlap percentage is not a causal isolation protocol. Avoid claiming realized attributable return.
- **P1 / Cost completeness and margin:** Fee-only mode intentionally omits paid participant time and other deployment costs. Real ROI needs a fully scoped cost and incremental margin basis. Price retention may change demand, which this model does not simulate.
- **P1 / Payback timing:** A uniform average monthly benefit cannot show the time at which cash recovers the investment. Costs may precede benefits; adoption can lag; benefits may stop at the evaluation end. A monthly cash-flow ledger would be needed for a real forecasted payback date.
- **P2 / Denominators and source quality:** Proposal count, won deals, price-affected revenue and account numbers may cover different periods/cohorts. User-entered statuses are not independent verification.
- **P2 / Credible price improvement:** There is no current baseline discount-rate or demand-elasticity input; the mathematically supported 0–100 point interval is not a claim that a given price increase is economically feasible.

The [ROI Institute](https://roiinstitute.net/roi-methodology/) defines ROI by net monetary program benefits relative to *fully loaded program costs* and requires isolation of program effects. The [OpenStax payback method](https://openstax.org/books/principles-finance/pages/16-1-payback-period-method) works from actual forecast cash-flow timing, which the simple uniform formula here does not provide.

**Decision boundary:** The current model is suitable for collaborative *illustrative scenario conversations* when its caveats are displayed. It is **not** a validated Sandler ROI methodology, a certified achieved ROI number, or a finance-approved proof of training causality. A model-semantic redesign needs an explicit requirement and testable definition, not an improvised formula replacement.
