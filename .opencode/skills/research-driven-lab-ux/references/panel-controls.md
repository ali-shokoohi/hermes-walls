# Collapsible panel controls: implementation and verification

Use this reference for desktop workbenches with persistent side panes. It captures Hermes implementation lessons; it does not prescribe the same visual treatment for every product.

## Interaction contract

| Pane state | Visible handle | Position | Accessible state and action |
| --- | --- | --- | --- |
| Expanded | Arrow only; no visible panel name | Pane's inner boundary | `aria-expanded="true"`; localized Hide/Collapse action |
| Collapsed | Arrow plus panel name | Workbench's outer edge | `aria-expanded="false"`; localized Show/Expand action |

The asymmetric text treatment was explicitly requested by the user. Keep the accessible label in both states; a tooltip is supplementary, not a replacement for it. Use a native button with `aria-controls` referencing the pane. The [APG disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) (retrieved 10 November 2026 during documentation follow-up) supports Enter/Space activation and `aria-expanded`, with an optional `aria-controls` reference. Its typical right/down disclosure arrows are not a mandate for this lateral workbench movement or its visible label policy.

Arrows point toward the movement that activation will cause. In LTR, the left pane collapses left and reopens right; the right pane does the reverse. Mirror physical edges and arrows in RTL without changing which semantic pane a control operates.

## Implementation rules

1. Place handles in a positioned workbench ancestor, outside the panes made inert or hidden. Preserve their hit area and stacking order above nearby content.
2. Route header toggles, edge buttons, and shortcuts through one setter. Synchronize CSS state, expansion attributes, next-action labels, persistence, and pane interactivity. Refresh labels from the same helper when language changes.
3. Derive handle positions from the same pane-width variables used by layout; collapsed width should resolve to zero. Do not duplicate magic widths in separate selectors.
4. Inspect `writing-mode` before choosing offsets. With `vertical-rl`, logical inline offsets do not necessarily mean horizontal page edges. Prefer logical properties where appropriate; document intentional physical `left`/`right` offsets and supply explicit RTL counterparts.
5. Keep the collapse target at least 44×44 CSS pixels as a project design aim. Do not describe that aim as the universal WCAG AA threshold.
6. Preserve the existing narrow-screen navigation rather than adding overlapping desktop handles to mobile. Coordinate breakpoint changes with inert/visible state.
7. Respect reduced motion, and inspect the animated path separately from the static endpoints.

## Verification checklist

For each language/direction and each pane, exercise **open → closed → open**:

- Assert `aria-controls` targets the correct pane and `aria-expanded` matches state.
- Assert visible panel text is hidden only in the expanded state, while the localized accessible next-action label exists in both states.
- Assert collapsed pane content is inert and reopened content is interactive.
- Read `getBoundingClientRect()` for target width, height, position, and viewport bounds. Check `document.elementFromPoint()` at the intended click point; dispatch real browser pointer input there.
- Test native Enter/Space activation and visible focus independently of pointer tests. If focus starts within a pane collapsed by a shortcut, ensure it is not stranded in inert content.
- Change language while a pane is closed, reload saved state, toggle through the header and shortcuts, and resize across the desktop/mobile breakpoint.
- Review both themes and desktop width variants, including both panes closed. Inspect arrows and nearby content for overlap; a center-point hit does not prove the whole target is unobscured.

Keep observed results separate from this desired matrix. Hermes currently automates the two-language, two-pane state cycle at 1440px with reduced motion, computed text visibility, inert state, localized action labels, a minimum width assertion, center-point hit testing, and CDP mouse events. It does not thereby prove all of the keyboard, persistence, motion, height, boundary, or breakpoint checks above.

## Documentation handoff

- README: explain where handles live, which text appears in each state, and which alternate controls remain available.
- Research/decision log: distinguish the user's preference from source-derived guidance; record failures and fixes without inventing new evidence.
- Contributor guidance: identify the shared setter/label helper and the intentional writing-mode exception.
- Regression record: name exact assertions and untested paths. Screenshots and programmatic clicks alone are insufficient.
- Runtime release: bump the service-worker cache for deployed UI changes. Documentation/skill-only edits need no runtime cache bump unless those files are actually cached or served as application content.
