# Progressive ROI reveal for a Sandler representative

## Decision

The full Conservative, Expected and Upside comparison previously appeared immediately in Discover. It disclosed the projected payoffs before the buyer had defined and inspected their current performance and investment.

The replacement journey is **current state → operating hypothesis → validation → financial reveal**.

## Stage contract

1. **Discover:** Enter and review current proposal win rate, proposal volume, average deal size, seller ramp, investment and evidence status. Never show projected ROI, net financial benefit or scenario alternatives.
2. **Model:** Explore pricing, proposal conversion, major accounts and onboarding. A live before/after *operational* preview shows valid hypothetical win-rate and ramp changes. Disabled drivers do not appear as operating improvements. No financial contribution figures appear in the lever list.
3. **Compare:** Validate the current operating measures against the proposed working assumptions, investment, source reliability and qualification context. The optional financial pipeline sensitivity is deferred to Present.
4. **Present:** Reveal current-versus-hypothetical operating measures, then potential incremental value, investment, net benefit, ROI, driver decomposition and all three alternate scenarios. The chart, table, print summary and caveats remain available.

## Controls and truthfulness

- This is narrative pacing, not a security barrier or forced sales funnel. A rep may jump to Present at any time, or go backwards to edit a baseline.
- A current 25% win rate and a modeled 26.4% win rate are comparable; a fabricated $0 current revenue figure and a modeled gross profit projection are not. Never show the latter as an actual before/after comparison.
- Operational change calculations use the existing scenario inputs: effective win-rate gain is winPoints × winCapturePct / 100; effective ramp reduction is rampMonthsSaved × rampCapturePct / 100.
- Missing or out-of-range source values invalidate their operating comparisons. Invalid or incomplete financial models do not display a complete ROI.
- The three scenarios are not standard Sandler benefit guarantees. They are editable, illustrative hypotheses.
- Sandler's published seven-step selling system includes discovery of pain, budget and decision process before fulfillment. This UI is a supporting ROI workbench, not a substitute for that process. Source: https://sandler.com/sandler-selling-system/

## Acceptance criteria

Native tests verify numeric units, disabled drivers, missing data, scenario consistency and that model levers never display financial payouts. Real Chromium tests must prove that scenario selectors, total ROI, financial benefit and the cross-scenario table occupy no visible layout in Discover, Model or Compare, then are all visible and responsive in Present. Mobile must preserve the basic journey without horizontal overflow. Print must remain client-readable.

The financial engine, cost validation, evidence statuses and original exported calculation results were intentionally not changed.
