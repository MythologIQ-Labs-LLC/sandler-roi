# Sandler case-study evidence mapping: Revelry GTM

**Source:** https://sandler.com/case-study/revelry-gtm/  
**Read date:** 2026-11-23  
**Publisher:** Sandler (official website)  
**Study subject:** Revelry GTM summer sales-development program using Sandler Essentials Training and AI Roleplay Coach (Yoodli).  
**Model status:** External case-study context. Not a prospect baseline, reproducible expectation, controlled experiment, or direct input to ROI.

## Publisher-reported observations

| Reported observation | Unit and scope | Modeling implication |
| --- | --- | --- |
| $6M–$8M combined pipeline | Total pipeline generated over 10 weeks | Pipeline creation KPI; **not booked revenue** |
| $3.5M pipeline generated | One participant, one premium camper-van manufacturer | Individual pipeline illustration, not team average |
| $364K closed revenue | That participant, two closed deals | Revenue outcome, **not gross profit** |
| Eight meetings and $153K pipeline | Another participant at a security services firm | Prospecting funnel and pipeline KPIs |
| 75% average AI roleplay score improvement | Average improvement in roleplay scores | Skills outcome, **not a win-rate or revenue improvement** |
| 15–20 minutes of daily AI roleplay | Training activity | Practice dosage/effort, not financial benefit |
| Ten-week program | Short internship window | Observation horizon; not an annual ROI period |

Source: Sandler, “From Classroom to Closing Deals: How Sandler Helped Revelry GTM Develop the Next Generation of Sales Talent,” https://sandler.com/case-study/revelry-gtm/.

## Why these are not ROI defaults

The article does **not** provide full training cost, incremental margin, baseline comparisons, attributable lift, a controlled trial, complete individual contribution distribution, follow-through conversion over time, or evidence of representativeness. In particular, $364K divided by $3.5M is **not automatically a general pipeline conversion rate**, because exact opportunity cohorts and time windows are not established. The 75% figure measures roleplay score improvement, not a 75-percentage-point improvement in close rate.

The study describes positive business outcomes that occurred during a program. It does **not** isolate Sandler training as the cause of every outcome, nor prove a financial return for a future buyer.

## Proposed reusable KPI taxonomy

1. **Training activity:** practice minutes per participant per day, coaching sessions, participation/adoption.
2. **Sales capability:** roleplay scores and measured skill growth, with rubric and denominator.
3. **Prospecting activity:** meetings booked, contacts reached, meetings held.
4. **Pipeline:** qualified opportunity dollars generated, period covered, qualification standards.
5. **Sales outcomes:** won revenue, deals closed, sales cycle, gross margin and time-to-value.
6. **Financial value:** incremental profit *above baseline*, program cost, confidence, and non-overlap attribution.

The independent pipeline-to-value bridge currently implements only a **sensitivity hypothesis**:

\`\`\`text
pipeline_expected_closed_revenue = pipeline_value * forecast_pipeline_revenue_conversion_percent/100
pipeline_expected_gross_profit = pipeline_expected_closed_revenue * gross_margin_percent/100
pipeline_scenario_allocated_profit = pipeline_expected_gross_profit * scenario_allocation_percent/100
\`\`\`

The bridge is deliberately **not additive** to the existing ROI result. Case-study numbers do not prepopulate its fields; a Sandler rep must use prospect-supplied values, explicitly marked assumptions, and a named time period. The displayed period is **not annualized**.

## Future modeling gates

- Before adding pipeline as an additive benefit, define exclusion/attribution rules against win-rate, pricing, major accounts and seller ramp.
- Before using roleplay score improvement to forecast money, establish a measured empirical relationship and clearly separate correlation from causal claims.
- Before claiming realized ROI, collect confirmed baseline, verified post-program results, cost, time horizon and attribution evidence.
- Always distinguish quoted outcomes from derived calculations and default assumptions.
