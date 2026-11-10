---
name: Research-Driven Lab UX
description: Research and refactor interactive learning labs, security simulators, and bilingual offline PWAs. Use for evidence-based UI/UX audits, simulation learning workflows, accessible diagrams, reversible controls, or responsive redesigns that must preserve existing behavior.
---

# Research-Driven Lab UX

Turn research into a small set of testable interaction decisions, not a fashionable visual rewrite. Preserve the simulator's model and working tools. Never claim improved learning or accessibility conformance from screenshots alone.

Read `references/evidence-and-pitfalls.md` when choosing research sources or writing the report. Read `references/panel-controls.md` for collapsible panes, icon-only controls, RTL positioning, or pointer-reachability regressions. For Hermes-specific work, also consult the repository's `AGENTS.md`, `README.md`, `UI-UX-RESEARCH.md`, and `tools/check-ui.mjs` using targeted ranges.

## 1. Establish the baseline

- Inspect working-tree changes; do not overwrite unrelated work or commit unless requested.
- Read project instructions and any local `DESIGN.md`. Use the applicable design skill only when the project has no design specification.
- Inventory the complete workflow: configuration, model, playback, outcomes, inspection, recovery, secondary tools, persistence, language, and offline behavior.
- Review current screenshots and run available checks before redesigning. Record specific friction, not generic aesthetic complaints.
- Prefer the code graph for discovery; confirm project/path coverage before relying on it. If this repository is not indexed, use targeted source searches and disclose that limitation rather than borrowing another project's graph.

## 2. Research with traceable evidence

Use three complementary source types:

1. Related products for interaction precedents (security practice, network simulation, coverage visualization).
2. Learning and usability research for hypotheses (prediction, causal feedback, contextual help, recovery).
3. Normative standards and implementation patterns for constraints (WCAG, WAI tutorials, APG, internationalization).

For every material source, record the exact URL, title, access date, supported finding, proposed application, and limitation. Distinguish measured research from practitioner guidance, product examples, and aesthetic preferences.

Fetch substantive page content; a search snippet, HTTP 200, or a JavaScript-only shell does not verify a claim. If a source is blocked, try a permitted alternative or report it as unavailable. Use a proxy only when authorized for the current task; do not hard-code a previous session's proxy into the project or persist global network settings. Never bypass access controls.

Write the research Markdown before substantial implementation. Separate recommendation, observed friction, evidence, decisions/acceptance criteria, planned checks, actual results, and deferred validation. Keep links specific to the cited page, not a site's homepage. Recheck dates and current guidance instead of treating this skill's references as permanently current.

## 3. Design around causal learning

Use an optional loop:

**Observe baseline → predict the effect of one change → apply it → rerun the same attack → explain the result → restore.**

- Reuse the existing simulation engine; do not create a second scoring/security model for onboarding.
- Snapshot the learner's actual configuration before the experiment changes it. Never silently substitute a preset at entry.
- Ask for a prediction before the comparison, not necessarily before the initial observation. Neutral choices such as **Still stopped** / **Gets through** support a lightweight POE activity.
- Keep free exploration available. A wrong prediction is an invitation to inspect the trace, not a failure or lost score.
- Explicitly explain that a second defense may still stop the attack after the first is disabled.
- Provide exact snapshot restoration. Define what happens if the learner changes settings, switches language, starts another experiment, or reloads midway.
- Do not infer mastery from clicks, add arbitrary streaks, or describe modeled outcomes as a real security rating.

## 4. Make changes reversible and results discoverable

- Direct switches take effect immediately. Pair the changed control with clear state and an undoable confirmation.
- Snapshot before individual, layer-wide, inspector, result-action, reset, and scenario changes. Route these through shared helpers to avoid inconsistent recovery behavior.
- Report the effect accurately: a change in breach count is not necessarily a change in all stopped/contained outcomes.
- Offer an obvious recovery action such as **Turn all walls on**. Disable it when it would do nothing.
- Treat a toast's Undo as transient, one-level recovery, not durable history. Document its timeout and replacement behavior. Keep important errors inline; do not hide them in a fading toast.
- Filter attack catalogs by modeled outcome with visible counts and selected state. Hide empty group headings. An empty result must explain itself and offer **Show all attacks**.
- Keep the active filter coherent after configuration, language, and topology changes. Return focus to a visible control when an action hides its own trigger.

## 5. Provide multiple accessible representations

- Retain the topology, packet playback, textual trace, and outcome explanation as linked views of one state.
- Complex diagrams need a short identification plus a discoverable, structured text alternative. Make the latter available to everyone, not only assistive technology.
- Describe meaningful relationships, boundaries, and current state—not just node names. Wall counts and disabled defenses are useful, but are not a complete equivalent for every path or animation.
- Update text when defenses or friends change. Phrase guarantees conditionally: an isolated or proxy-only path may no longer hold after its defense is disabled.
- Use `aria-describedby` for a short pointer/description, not a long nested list whose structure would be flattened. Keep the full list navigable in the document.
- Native checkbox switches can use `role="switch"`; keep the accessible label stable, retain native checked/keyboard behavior, connect help with `aria-describedby`, and group related controls with a label.
- Preserve valid tab/panel relationships, roving tab stops, arrows/Home/End, and direction-aware behavior. Mobile destination navigation is not automatically a tablist.
- Do not force focus on every playback step. Use polite status feedback; move focus deliberately when a control disappears. Preserve dialog Escape, visible close, inert background, and focus return.

## 6. Refine visuals without obscuring the model

- Prioritize space for the architecture, controls, and explanations over a marketing hero or decorative effects.
- Use a coherent neutral/action palette. Preserve semantic outcome colors with visible text; never encode success or breach only by color.
- Strengthen selected tabs and filters with multiple cues (shape/background/underline/weight), not color alone. Prefer short sentence-case labels.
- Check contrast numerically against actual adjacent surfaces in both themes. A color passing on white can fail on an off-white canvas. Do not round a value below 3:1 into a pass.
- Distinguish text contrast, non-text UI contrast, and decorative borders. Checking a few tokens is not a full contrast audit.
- Choose breakpoints from the content's space requirements; platform window classes are context, not CSS rules to copy literally.
- Keep primary mobile destinations few and labeled, secondary tools one clear level away, and every existing tool reachable.
- Constrain exceptional two-dimensional scrolling to the diagram. Reserve sticky-nav space in the correct scroll containers and test focused controls, not just document width.
- Respect reduced motion in CSS and JavaScript. Listen for preference changes while the app is open; consider motion already in progress as well as newly started effects.

### Collapsible workbench panels

- Give both side panels a consistent collapse/reopen affordance. Keep the handle outside the pane it hides, so `inert`, clipping, and hidden content cannot disable recovery.
- Separate visible text from accessible naming. An open pane can use an arrow-only collapse handle; the closed pane's reopen handle can retain its name for discoverability. Both states still need a localized accessible next-action label.
- Drive edge handles, header buttons, shortcuts, persisted state, and language refresh from one state/mutation path. Keep `aria-controls`, `aria-expanded`, and hidden-pane `inert` coherent.
- Arrows describe the next movement, not just the current state. Check both directions and both panels; semantic panel identity does not change when RTL swaps physical edges.
- Prefer logical CSS, but reason about the element's own writing mode. Vertical text changes the inline axis; intentional physical horizontal offsets need explicit RTL rules, a comment, and geometry checks.
- Test computed visibility, actual hit areas, and dispatched pointer input. A successful `.click()` alone can hide off-screen or covered controls. Treat keyboard, persistence, breakpoint transitions, and animated motion as separate checks.

## 7. Preserve bilingual and offline constraints

For Hermes Walls Lab:

- Keep runtime dependencies at zero, local relative asset paths, classic scripts, and the surrounding `var`/`function` style. Do not introduce modules that break `file://` startup.
- Add every user-facing string to both English and Persian catalogs. Check key parity, placeholders, plural forms, numeric formatting, and actual Persian phrasing.
- Keep pre-paint language/direction setup synchronous. Use logical CSS, language metadata, bidi isolation for technical identifiers, and Persian ZWNJ where appropriate.
- Preserve all attacks, scenarios, friend tools, chat identities, self-tests, traces, logs, install behavior, and keyboard shortcuts.
- Bump the service-worker cache version when deployed assets change. Precache new runtime assets; development-only skill/research files do not need to become app-shell dependencies.
- Update README when workflows, shortcuts, links, or caching behavior change. Refresh manifest screenshots when the visible UI changes.
- Prefix shell invocations with `rtk` as repository instructions require; use `rtk proxy` for tools without a dedicated wrapper.

## 8. Verify behavior, then report honestly

Extend existing browser checks rather than adding runtime dependencies. Use a disposable Chromium profile and loopback-only debugging. The current development harness uses Node's built-in WebSocket/CDP client, without npm packages.

Minimum verification matrix:

- English/LTR and Persian/RTL, light/dark, phone through desktop widths (including 320px).
- Document/header/panel overflow, primary targets, visible focus, tab order, hidden-panel inert state, and all tool destinations.
- Both edge handles through open → closed → open in LTR/RTL: visible label policy, localized next-action label, expansion state, inert pane, target geometry, and pointer hit testing. Separately test keyboard activation, saved state, and breakpoint transitions.
- Baseline configuration preservation, both prediction branches, repeat experiment, exact restoration, and focus after restoration.
- Individual/bulk/scenario/reset Undo; changes with and without a breach-count delta.
- Every outcome filter, nonempty and empty results, recovery to All, and updates after changing defenses.
- Text-map state and references, not merely that its element exists.
- All modeled attacks and scenarios; automatic/manual playback, next/finish/stop; friend provisioning, validation, chat, self-test, trace, and log.
- Cached offline navigation/reload and direct `file://` startup.
- Script syntax, manifest parsing, catalog parity, whitespace errors, and runtime exceptions.
- Visual review after screenshot refresh. Automated clicking alone does not establish that a real pointer or keyboard user can operate a control.

Record only checks actually executed. Keep planned acceptance criteria separate from observed passes. Disclose remaining screen-reader, real-device, zoom, forced-colors, cross-browser, and think-aloud validation. No automated suite proves complete WCAG conformance or learning gains.
