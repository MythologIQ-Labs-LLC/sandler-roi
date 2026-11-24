# Sandler ROI Workbench | Project effort ledger

The source of truth is [effort-ledger.json](effort-ledger.json). To see the **current calculated total**, run:

```bash
npm run effort
npm run effort -- --json
```

The script sums recorded rows; **do not hand-edit a running total**. This ledger is kept in the public project repository. Do not put client names, personal timesheets, rates, invoice details, private communications, or sensitive contracts in it.

## Initial retrospective baseline (November 24, 2026)

- **2.00 hours**: owner's rough *“a couple of hours”* description of the initial AI-assisted product build. This is an owner ballpark, **not a confirmed exact time log**.
- **0.75 hours**: approximate additional active attention across Pages publishing, the first tab/CSV mapping pass, the later real-browser scroll repair, and the compact-layout refinement. Each subentry links to the merged PR.
- **2.75 hours total provisional tracked effort.** For ordinary conversation and planning, express this as **roughly 2.8 hours**, not a precise timesheet.
- **0 hours owner-confirmed**, because no one has yet approved the retrospective entries as actual worked or billable time. **Billable hours are undetermined**, not zero, until a billing agreement and owner review exist.

The GitHub history validates **what changed and the order it changed**, not labor duration. CI execution, unattended model output, waiting, and duration between commits are not automatically billable time. Do not multiply this number by a public hourly rate.

## How to maintain this across development

1. For each meaningful work phase or PR, append **one new ledger entry** with a unique ID, date, descriptive scope, reasonable approximate *active attention*, the estimation method, confidence, and a URL to the PR, commit or issue.
2. Prefer actual human-supplied session durations. When unavailable, use a **clearly labeled low-confidence estimate**, not the difference between commit timestamps. Be conservative about AI-accelerated work. Do not count the same task twice across PRs.
3. Keep new estimates **unreviewed** until the owner explicitly confirms them. Only an owner-confirmed row may use the `owner-confirmed` status/method. The ledger is not an authorization to invoice.
4. When a PR contains substantive build, validation or refinement work, update this ledger in the same PR. A purely formatting or administrative change can omit a new effort row but must explain why.
5. Do not rewrite historical figures silently. Add a clearly referenced correction entry or amend the affected row with an explicit explanation and owner approval. The current estimate is provisional and can be reconciled at handoff.
6. Run `npm run effort` and `npm test` after changes to this ledger. Summarize the new cumulative estimated total in the PR description.

**Counting rule:** This tracks human-directed, AI-assisted build/refinement attention, including active architecture review, validation review and user-experience iteration. It does **not** calculate conventional replacement-labor value, tokens, autonomous agent runtime, paid API consumption, or contractually invoiceable hours. Those are separate measures.
