# Agent instructions: Sandler ROI Workbench

These are repository-local engineering conventions proposed for this workbench. They are **not** a signed or centrally approved Qortara governance manifest and do not supersede GitHub permissions, organization policy, owner decisions or required reviews.

## Objective

Build and maintain a transparent, configurable tool that lets a **Sandler sales representative** show a prospect how hypothetical improvements in sales performance could affect the prospect's investment case. The example data is fictional. The application must never represent estimates as achieved, guaranteed or officially endorsed Sandler outcomes.

## Start here

1. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing financial formulas, data contracts or the user journey.
2. Inspect current `main`, open PRs, CI status and the exact target branch revision before editing. Never assume that earlier test results apply to a new HEAD.
3. Use the smallest scope that achieves the objective, and preserve the independent calculation engine.
4. If governance sources or owner approvals are missing, record that absence instead of manufacturing a policy verdict.

## Component boundaries

- `src/roi.mjs`: single source of truth for arithmetic and numeric validation. No browser dependencies, network calls or hidden business rules.
- `src/app.mjs`: input bindings, scenario selection, visualization, import/export, prospect-facing disclosure.
- `index.html`: accessible presentation shell and print styles.
- `server.mjs`: minimal loopback-only development server, **not** a production API.
- `tests/roi.test.mjs`: formula and data-boundary regression coverage. Add tests with formula changes.
- `docs/ARCHITECTURE.md`: documented intent, mathematical assumptions, known limitations and open architecture decisions.

## Financial invariants

- Work in explicit units. Revenue vs incremental gross profit, percentages vs **percentage points**, annual vs evaluation-period values are not interchangeable.
- A required missing value is **unknown**; never silently turn it into zero.
- An included invalid value driver invalidates complete aggregate ROI. Exclusions are an explicit user choice.
- The engine must produce a deterministic result for a given input+scenario+enabled-levers snapshot.
- Avoid benefit double counting. Known overlap is currently only partially modeled and must remain disclosed.
- Do not claim causal attribution or payback timing without measured evidence and an appropriate time series.
- Keep projections separate from future realized-value reporting.
- Case-study figures are never copied into a prospect baseline without a disclosed user decision. The optional pipeline bridge is not an additive ROI benefit, and AI roleplay scores are not financial returns.

## Security and privacy

- Prospect commercial data stays local in the current architecture; no network calls, telemetry or server persistence without explicit reviewed authorization.
- Treat exported JSON/CSV as confidential prospect information.
- Keep imports constrained to recognized fields. Never evaluate imported formulas or executable content.
- Avoid unreviewed dependencies, credential handling and implied official Sandler branding.

## Validation and delivery

- Run `npm test` and preview with `npm start`; include exact observed results in the PR, not memory of an earlier run.
- Validate a real browser flow before asserting prospect readiness: modify inputs, change scenarios, disable a lever, enter missing/invalid input, import/export, present/print.
- Changes to formulas need tests for correctness, boundaries, units, regression and erroneous-but-plausible financial assumptions.
- A failing, blocked or logless GitHub Actions job does not constitute a green gate. Do not rerun expensive checks blindly or merge around unresolved requirements.
- Check the target branch and reviews before suggesting or performing a merge. Governance-evaluator responses are not approval or verified evidence.
- Commit documentation and code as small reviewable changes; do not generate unnecessary issues or inflate versions for tiny edits.

## Qortara-hosted evaluator limitations

The installed Qortara Logic Demo offers stateless read-only evaluators for **supplied** documents and policy inputs. It cannot initialize or read this repo, execute tests, or record gates. Use the host's GitHub tools for repository work and label unvalidated governance inputs as proposals. If an organization governance manifest becomes available, resolve actual precedence and applicability before claiming compliance.


## Follow-on cost and evidence invariants

- Do not label fee-only investment fully loaded; do not silently replace missing expanded costs with zero.
- Source status is caller-reported metadata, never independent attestation, even for “finance-reviewed.”
- Demote a source claim when the underlying numeric baseline is edited, and never trust precomputed results in imported JSON.
- Keep the follow-on development branch separate from open PR #1 while GitHub Actions budget is unavailable. Do not bypass existing required checks or trigger workflows just to prove progress.

## Rep workbench identity and journey

- Maintain the Discover → Model → Compare → Present journey without manufacturing evidence certainty.
- Use public Sandler palette tokens recorded in `docs/design/rep-workbench-journey.md`; approved logo assets require authorization, unmodified placement and accessibility review.
- Do not run GitHub Actions while the account has no budget; keep source and local/offline tests distinct from real rendered-browser acceptance.

## GitHub Pages and public release

- The public Pages URL is https://mythologiq-labs-llc.github.io/sandler-roi/, published from `main`; maintain the README's live-site link.
- Use project-relative module/style paths so GitHub Pages works under `/sandler-roi/`.
- Validate via `npm test`, `npm run check:pages` and existing PR Actions, then confirm Pages build/deploy at the merged exact commit. Do not bypass required checks or claim successful deployment before GitHub reports it.
- Pages is publicly accessible without authentication. The workbench processes inputs in the browser, but representatives must not treat the public demo as approved for sensitive financial client data or as officially Sandler-branded without authorization.

## Discover and import invariants

- Only one Discover panel displays at a time; the data remains mounted. Preserve a visible four-stage navigator in Present (except in print).
- CSV input is staged until explicit Apply. Auto-map from known labels, allow manual mapping, and prohibit duplicate target column reuse.
- Reject malformed CSV, invalid numeric units, out-of-range values and silent filling of missing fields. Treat all imported sources as unconfirmed.
- Do not claim there is an official Sandler-wide CSV standard, or automatically import a computed ROI from spreadsheet exports.

## Project effort tracking (persistent)

- Read [docs/engagement/effort-ledger.md](docs/engagement/effort-ledger.md) before reporting time spent. JSON rows are the source of truth; run `npm run effort` to calculate the cumulative total.
- With each substantive engineering/refinement PR, append a single, nonduplicative entry in `docs/engagement/effort-ledger.json` with estimated active effort, basis, confidence and a PR/commit link. If no reliable estimate exists, state that and leave it unmeasured instead of manufacturing labor hours.
- Keep retrospective estimates unreviewed until the owner confirms them. Do not count GitHub Actions runtime, model generation, elapsed time between commits, waiting or parallel work as billable labor automatically.
- Do not place hourly rates, commercial terms or private customer information in this public repository. Estimated effort is not an invoice.
- Include the cumulative effort reading and any unresolved estimates in PR handoff notes. For documentation-only administration, explain why no new billable-effort entry was added.

## Consultative disclosure sequence

- Do not reveal three-scenario financial results or full modeled ROI on Discover, Model or Compare. Stage-based UI is not an access-control boundary; free navigation to Present always remains possible.
- Discover establishes entered commercial baselines and investment. Model tests hypothetical behavior without financial payoff amounts. Compare reviews working operational changes, cost, inputs, evidence and buyer qualification. Present reveals honest current-versus-possible operating changes, modeled incremental value, ROI, scenario alternatives and financial math.
- The "before" state is never invented as zero revenue or zero profit. Use only actual entered win-rate and seller-ramp baselines where comparable operating measures exist.
- Disabled or invalid drivers must not be shown as successful behavior change. Models remain estimates, and missing data remains missing.
- Browser acceptance must confirm hidden financial presentation before Present and a visible scenario table, change indicators and navigation during Present. Keep prospect source evidence and caveats visible.
- Update the [project effort ledger](docs/engagement/effort-ledger.json) in each substantive development phase.

## Customer-centered presentation language

- The Sandler representative operates the workbench; the external individual or organization is called the **customer** in all visible UI, CSV mapping, and reports.
- Personalize major headings and business-case copy from the entered customer name, with a readable fallback for blanks. Use `textContent` for names, never untrusted HTML.
- Keep persisted `inputs.prospect` and original JSON schemas stable. New CSV labels use Customer while legacy Prospect / Input prospect aliases still import correctly.
- The name states whose figures are being modeled. It does **not** certify the figures as verified or assert that a purchase occurred. Retain source caveats and the delayed ROI reveal.
- Test literal-name safety, live edits, name reset, blank fallback, CSV compatibility, long-name mobile layout, and Present/print.

## Independent financial math audit gate

- Read [the 2026-11-24 math audit](docs/verification/financial-math-audit-2026-11-24.md) when changing the financial engine or Present labels. Recompute sample values from an independent formula implementation; do not treat copied engine code as an independent oracle.
- Keep valid values separate from unsupported numeric-precision results; never show Infinity, NaN, unsupported break-even price points, or a precise-looking aggregate above the supported amount range.
- When nonpricing benefits cover the cost, additional price-point break-even is zero even if the eligible pricing denominator is zero. Otherwise distinguish feasible / no eligible pricing revenue / outside-supported-range, not all as N/A.
- Show the dollar overlap deduction so users can reconcile all driver contributions to the displayed total benefit.
- Flag simple payback that goes beyond the modeled program term; do not conflate constant-run-rate extrapolation with actual cash-flow recovery.
- Preserve all four formulas and the default fixture totals unless the owner approves a new, explicit multi-year cohort/attribution specification. A passed math test does not prove causal isolation, data provenance or approved production ROI.
- Add a nonduplicated effort-ledger entry and run independent test/property suite plus full native/browser checks for substantive finance changes.

## Timeline navigation pattern

- The Discover → Model → Compare → Present navigator is a **single thin connected timeline** with four small stage nodes and compact labels. Do not restore large step cards or subheadings that push customer editing below the fold.
- Keep the **entire stage cell** as a native button (adequate click/keyboard target), with current blue, earlier-position teal and later muted. 'Previous' is purely position, not attestation of a completed step.
- Maintain direct stage navigation and keyboard ArrowLeft/ArrowRight/Home/End. The timeline remains visible in Present and hidden for print. Stage transition must not alter the staged financial disclosure logic.
- Real browser acceptance must measure timeline height, actual one-line connector, stage node positions and narrow viewport overflow. Record nonduplicated estimated effort.
