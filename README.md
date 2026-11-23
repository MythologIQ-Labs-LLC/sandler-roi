# Sandler ROI Workbench

An internal, browser-based sales enablement calculator for a Sandler consultant or agent. It helps translate a prospect's commercial performance baseline into **illustrative** financial improvement scenarios for a sales training and reinforcement engagement.

## Status

Early working prototype. **Not an official Sandler publication or approved financial forecast.** The tool does not assert that training causes the modeled improvements.

## Quick start

Open `index.html` in a modern browser. No server, login, API key, network request, package installation, or build step is required.

1. Enter the prospect name, training cost, and business inputs.
2. Select a scenario and adjust its improvement assumptions.
3. Review financial outputs and evidence/completeness warnings.
4. Compare scenarios, export JSON/CSV, or print a proposal-ready summary.

## Financial model

| Driver | Illustrative incremental annual gross profit |
|---|---|
| Price realization | Discount-affected revenue × improvement in **percentage points** / 100 × price contribution margin × realization factor |
| Win-rate improvement | Proposal volume × improvement in **percentage points** / 100 × average deal value × gross margin × realization factor |
| Major accounts | New account count × annual account revenue × first-year revenue capture × gross margin × realization factor |
| Faster seller ramp | New hires × saved ramp months / 12 × productive seller annual revenue × gross margin × realization factor |

**ROI** = (annual benefit − program cost) / program cost. **Break-even contribution** = program cost − known annual benefit. Simple run-rate payback = program cost / (annual benefit / 12), *not* actual cash-flow payback. All benefits are assumptions, not guarantees.

The user can reduce realization factors to account for overlap, attribution, adoption, and delivery. Each scenario has its own improvement assumptions. Input validation rejects implausible ranges, and missing required inputs are reported rather than quietly treated as zero. Aggregates based on incomplete drivers are labeled *partial*.

## Data and privacy

All computations execute locally in the browser. No prospect information is sent to a server. Exported JSON and CSV are downloaded to the user's machine. Nothing is automatically persisted between sessions. Treat exported files as confidential commercial information.

## Tests

Run `node --test tests/calculations.test.mjs` on Node.js 20+ to verify formulas, missing-input behavior, boundary cases, and scenario ordering. The same calculation module powers the browser UI.

## Sources and product context

- [Sandler sales training](https://sandler.com/sales-training/)
- [Sandler enterprise offerings](https://sandler.com/enterprise/)
- [Sandler leadership training](https://sandler.com/leadership-training/)

These links identify relevant training areas; they do **not** endorse projected ROI values.

## Scope boundaries

No CRM integration, AI agent, authentication, database, contractual proposal generation, or financial audit certification in this version. Planned future work should keep prospect-facing projections and verified realized results explicitly separate.
