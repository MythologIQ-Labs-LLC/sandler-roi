# Sandler ROI Workbench

A lightweight, **rep-led sales conversation tool** for a Sandler consultant to demonstrate the *potential* financial value of sales training and coaching services to a prospective client.

**Status:** Early working prototype. Independent illustrative financial modeling tool, **not** an official Sandler publication, assurance, performance claim, or guaranteed return.

## Run it

Requires Node.js **20+**. No packages need to be installed.

\`\`\`bash
npm start
\`\`\`

Open **http://127.0.0.1:4173**. This starts a local-only server bound to \`127.0.0.1\`; the application has no cloud services, authentication, cookies, analytics, or external network dependencies.

Run tests with:

\`\`\`bash
npm test
\`\`\`

Opening \`index.html\` with a \`file://\` URL is not supported because browser security restricts JavaScript module loading from local files; use the local server above.

## How a Sandler rep uses it

1. **Discover**: enter the prospect, training investment, team size, and confirmed commercial performance baselines.
2. **Model**: include or exclude four relevant value drivers, then adjust the conservative, expected and upside scenarios in the meeting.
3. **Explain**: compare cost versus modeled benefit, review source and assumption notes, and show contribution by each driver.
4. **Present**: use **Present / Print** for a clean meeting summary; export an editable JSON model or CSV snapshot for follow-up.

Every starting number is *fictional example data*, not an asserted COIT or Sandler benchmark. Blank an unverified field to see the missing-input warning. The calculator refuses to present a complete ROI when an enabled driver lacks required inputs.

## Transparent financial formulas

Evaluation horizon = configured program months. Annual baselines are scaled proportionally to that period, a simplifying assumption that is **not** a month-by-month cash flow model.

| Driver | Modeled gross profit in period |
|---|---|
| Price realization | Annual discount-affected revenue × percentage-point improvement / 100 × price contribution rate × realization rate × months / 12 |
| Win-rate improvement | Annual proposals × win-rate improvement in percentage points / 100 × average deal revenue × gross margin × realization rate × months / 12 |
| National / major accounts | New accounts × full-year revenue per account × first-year revenue capture rate × gross margin × realization rate × months / 12 |
| Faster onboarding | New hires × ramp months saved / 12 × annual productive seller sales × gross margin × realization rate × months / 12 |

All “rates” above are percentages expressed between 0 and 100 in the UI and divided by 100 in calculations.

A separate **overlap deduction** reduces the sum of win-rate and national-account benefits to mitigate double-counting when an account win might appear in both measures. This is a rough sensitivity control, **not** formal causal attribution. Discount-holding and seller productivity can also overlap with other improvements, so a rep must discuss the dependencies.

- **Total modeled benefit** = sum of included drivers − win/account overlap deduction.
- **Program cost** = monthly fee × evaluation months + one-time fee.
- **Net modeled value** = total modeled benefit − program cost.
- **ROI %** = net modeled value / program cost × 100.
- **Benefit/cost multiple** = total modeled benefit / program cost.
- **Simple payback** = program cost / (modeled total benefit / evaluation months). This assumes even monthly benefits; it is not actual cash-flow payback.
- **Break-even additional price points** = max(0, program cost − other modeled benefits) / (discount-affected revenue × price contribution rate × price realization rate × months / 12) × 100. Displayed only if the pricing driver is active and its denominator is positive.

ROI and multiples are intentionally unavailable when program cost is zero.

## Data safeguards

- No automatic transmission, persistence, third-party libraries, or tracking.
- JSON imports are limited to recognized model fields; no imported data is executed.
- Input ranges, percentage limits, whole-number counts, impossible ramp savings and win rates over 100% are rejected in the shared calculation engine.
- Unfilled inputs remain incomplete, never silently become zero.
- JSON and CSV exports contain prospect information; handle them as confidential files.
- Estimates are **scenario projections**, not client financial statements, achieved outcomes, or proof that Sandler training caused an improvement.

## Out of scope for this prototype

CRM integrations, AI agent chat, user accounts, remote data storage, verified realized ROI tracking, and actual monthly cash flow. These are potential later phases after the sales demonstration workflow is validated.

Sandler training context: [official Sandler site](https://sandler.com/).
