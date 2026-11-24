# Rep-led workbench: user journey and Sandler visual direction

**Implementation branch:** \`feat/roi-evidence-cost-hardening\`  
**Status:** Implemented first visual development iteration. Live browser / customer acceptance not yet run.  
**Product owner and operator:** A Sandler representative facilitating an interactive business case with a prospective client.

## Experience strategy

This is a **guided workbench**, not a marketing landing page, a spreadsheet replica, a static PDF proposal, or an automated financial claim generator.

The representative should know:
- **What to ask next** without scrolling through every field in the product.
- **Where the numbers come from**, and which are examples versus reported or source-cited facts.
- **What changed** when they adjust a driver, while staying in control of the sales conversation.
- **What the client will see** before printing or exporting a business case.

The prospect should see a concise value argument with uncertainty and scope clearly stated. No click should accidentally upgrade an illustrative number into verified evidence.

## Four-stage journey

| Stage | Question answered | Visible content | Primary user action | Acceptance |
| --- | --- | --- | --- | --- |
| **01 Discover** | What is happening in your business now? | Engagement terms, financial baselines, optional pipeline figures, source register, live preview | Replace demo baselines; identify which metrics are known | No false verification claims; incomplete model stays incomplete |
| **02 Model** | What might change if we improve sales execution? | Individual financial drivers, grouped scenario controls, live impact cards | Toggle one relevant driver, adjust improvement rates | Values update immediately; selected scenario is clear |
| **03 Compare** | Does the possible upside justify the investment? | Conservative/Expected/Upside comparison, cost bar, scenario table, non-additive pipeline bridge | Compare cost, benefit, net value, ROI and simple payback | All scenarios use same financial period and inputs; missing values visible |
| **04 Present** | How do we explain this to the decision maker? | Customer-facing projection, modeled drivers, evidence caveat, summary | Present, print, or return to modeling | Visible caveats survive print and no dollar amount is asserted as guaranteed |

The meeting stages are **navigation**, not approval gates. Reps can move between them freely even when required values are unknown. Missing facts remain visible and block a complete ROI total.

### Information hierarchy

1. **Brand and action bar:** distinguish the product and the representative's active controls. File operations are secondary to the conversation.
2. **Journey navigation:** a clear four-step sequence with the selected stage emphasized.
3. **Stage instruction:** one plain-language purpose and a relevant next action.
4. **Live financial perspective:** always visible, explicitly illustrative.
5. **Stage task area:** input editing, levers, comparison, or client presentation, not all four simultaneously.
6. **Evidence and modeling limitations:** appear near outputs, not hidden in technical documentation.

In Discover, the baseline categories are progressively disclosed to avoid overwhelming the rep. In Model, scenario assumptions are grouped by price realization, pipeline conversion, major accounts, onboarding, and cross-driver overlap. In Compare, a table supplements the chart for exact numeric comparisons. Present removes editing surfaces and shows only the summary and assumption evidence.

## Brand source and implementation

Sandler's **Brand Guidelines v2.0.0** and published digital color card identify these design tokens:

| Token | Sandler name | Official hex | Current use |
| --- | --- | --- | --- |
| \`--stable\` | Stable | \`#21245c\` | Main header, primary headings, ROI summary |
| \`--fresh\` | Fresh | \`#00aded\` | Primary actions, active step, positive attention |
| \`--energetic\` | Energetic | \`#0045c2\` | Secondary emphasis |
| Background | White / Gray | \`#ffffff\`, \`#ededed\` | Neutrals and contrast reference |

Sources: https://sandler.com/branding/ ; https://sandler.com/wp-content/uploads/2023/03/One-Sandler-Brand-Guidelines-2.0.0.pdf ; https://sandler.com/wp-content/uploads/2023/03/Sandler-Digital-Color-Card.pdf.

**Brand-rights boundary:** The current app header uses **text "SANDLER®"** and branded colors, **not the stylized corporate logo**. Sandler's published brand guidelines require that the official logo remain unaltered, preserve clear space and display the registered mark notice; the website's published terms reserve trademark use. The user has requested a Sandler-branded workbench, but no approved logo file or proof of logo-use permission is present in this repository. **Do not scrape, alter, redraw or ship corporate logo assets by approximation.** Replace the text identity with the supplied, approved two-color or white logo asset after asset ownership/usage approval and a real visual review.

The typography and navigation design are original implementation, not a copy of Sandler's website CSS or logo geometry. This is still a **prototype** until corporate branding and prospect-facing claims are reviewed.

## Accessibility and usability constraints

- Use headings, labels, form inputs, and native buttons; keyboard navigation must allow all four steps and menu actions.
- Keep scenario selection marked with \`aria-pressed\`, current workbench step with \`aria-current=step\`, and a skip-to-workbench link.
- Never rely on color alone for financial completeness or scenario selection; textual labels persist.
- The muted interface must preserve readable contrast, including the active cyan button's dark text.
- Editable fields remain grouped semantically by lever; the comparison includes a readable table as well as bars.
- On narrow viewports, input cards and results collapse to one column and table horizontally scrolls.
- The print view should show the selected scenario, program cost scope, modeled benefit, contributing drivers and the case-study/evidence disclaimers; no hidden data source creates a misleading PDF.
- Prospect-sensitive financial data remains local. Do not add browser persistence or analytics as a side effect of UX work.

## Adversarial design review

| Proposed design | Risk | Decision |
| --- | --- | --- |
| Put all data fields, charts and presentation into a single dashboard | Cognitive overload; users lose conversational context | **Reject**; stage-specific workspace |
| Auto-complete a wizard only after all required values are entered | Prevents reps from exploring unknowns with a prospect | **Reject**; permit navigation with visible incomplete state |
| Make scenario edits only through a forecast form | Encourages black-box numbers | **Reject**; make each financial lever and sensitivity editable |
| Treat numeric chart as more authoritative because it looks polished | Strong design masks weak evidence | **Mitigate**; always label source and projection caveats |
| Insert the corporate logo by tracing the image | Trademark/brand fidelity problem | **Reject**; approved logo asset is an explicit follow-on dependency |
| Auto-create or rerun Actions to get visual confidence | CI budget unavailable and tests may fail before execution | **Reject**; source and local/offline tests; preserve required future gates |
| Mix potential pipeline value into ROI cards | Double counting and inflated financial claims | **Reject**; retain non-additive pipeline analysis |

## Verification scope and next acceptance

**Source-level observed:** four stage buttons, CSS stage rules, Sandler palette hex values, local stylesheet served by \`server.mjs\`, scenario table, grouped assumptions, and present driver summary.

**Simulated behavior observed:** stage navigation, model grouping, three-row comparison table, reversible presentation, print routing, and recalculation after a financial edit passed isolated JavaScript/DOM smoke tests. These are not real user studies or actual browser rendering.

**Pending:** real Chrome/Edge visual/keyboard and narrow viewport review, print-to-PDF screenshot, native \`npm test\` on developer machine, approved logo asset usage, and independent representative review of the meeting narrative and financial assertions.

These are named acceptance gates, not reasons to stop source development.


## Iteration: reduce scrolling and restore navigation (November 24, 2026)

**Owner UX observation:** Discover was a stacked engagement/performance/pipeline/evidence form; the resulting left column extended far below the financial workspace. Present hid the entire journey navigator and forced a roundabout "Return to modeling" flow.

**Implemented remedy:** Four mutually exclusive tabs control the Discover panels; each panel remains mounted and editable but only one is displayed. Sidebar height is bounded on desktop, with responsive natural flow on phones. Model/Compare/Present remain as they were, except the navigation timeline is now visible and sticky in Present. Switching a tab or step preserves in-session model state.

**CSV:** No official universal Sandler baseline CSV format was located. A canonical workbench template plus a visible column mapper supports prospect spreadsheets without guessing unapproved metrics. Import is a staged local-only operation, not automatic reconciliation. Invalid financial values or conflicting columns block Apply; missing values remain missing, and imported provenance is declared unconfirmed.

**Brand:** The rep owner has confirmed authorized Sandler identity use. Sandler's public [logo kit](https://sandler.com/wp-content/uploads/2023/03/Sandler-Logo-Kit-1.zip) was identified. Its ZIP bytes could not be transferred through the available environment, so an original, verified Sandler-affiliated wordmark is **linked externally** from \`https://go.nextlevel.sandler.com/hs-fs/hubfs/SANDLER-LOGO-R-1C.webp?height=38&name=SANDLER-LOGO-R-1C.webp&width=300\`. The image itself is unchanged; CSS only scales proportionally. The source should be moved into a first-party retained image file once the original logo kit is available. The interface's four inline SVG discovery icons are original and use Sandler's published Style #1 circular-white-line approach, not copied trademark imagery.

**Privacy change:** The logo is fetched from a third-party Sandler-affiliated CDN. The form does not send entered prospect data to that domain and the image uses \`referrerpolicy="no-referrer"\`. A blocked image may not display; the UI's text description remains accessible.
