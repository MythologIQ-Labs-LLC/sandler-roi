# Customer-owned copy and UX audit

Date: November 24, 2026. Implementation: PR #7.

## Intent

The representative works alongside a customer, so visible copy should refer to the customer and use the customer's entered name. This is a language decision, not a legal assertion that a purchase occurred.

## Surface review

| Surface | Result | Safeguard |
| --- | --- | --- |
| Discover and Engagement | Customer & investment; named starting point; name or organization field | Illustrative/source statements retained |
| Performance, Pipeline, Evidence | Headings attach the current figures and data sources to the customer | No implied independent validation |
| Model | What could improve for the named customer? | Modeled behavior, not early financial ROI |
| Compare | Review the customer's figures and assumptions | Source, budget, decision validation remains |
| Present and print | Named current-vs-potential presentation and potential business case | Hypotheses and warnings remain explicit |
| CSV import | Customer record, Customer template header | Legacy Prospect and Input prospect accepted |
| CSV export | Customer and Input customer | Formula-escaping unchanged; legacy import accepted |
| JSON | Internal inputs.prospect key unchanged | Schema v1 and v2 remain compatible |
| Empty customer name | The customer's starting point | No dangling apostrophe or undefined name |

## Code contract and limitations

- src/customer-copy.mjs generates possession and handles whitespace. Names are assigned through textContent, never innerHTML.
- src/roi.mjs only changes sample identity text and an illustrative note. Financial formulas and evidence classifications do not change.
- CSV now exports Input customer, but external integrations that parse the old exact Input prospect report row may need to update their mapping. The workbench importer accepts both.
- One name identifies the owner of all cards in a group. Do not repeat long names in each metric card; wrap long named headings.
- Entering a customer's name does not prove baseline values, contract status, attribution or outcome. Display evidence and illustrative disclaimers.
- Browser acceptance must test all four stages, blank fallback, long names, and mobile layout. Tests and CodeQL must pass at the exact PR head before deployment.

Evidence: https://github.com/MythologIQ-Labs-LLC/sandler-roi/pull/7
