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
