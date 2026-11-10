# Evidence and pitfalls from the Hermes redesign

These references informed the November 2026 redesign. Re-fetch and verify their content when applying the skill; they are starting points, not timeless proof. The project-root `UI-UX-RESEARCH.md` contains the local decision and verification record.

## Sources by design question

| Question | Useful sources | Transfer and caution |
| --- | --- | --- |
| How should a learner explore? | [PhET research](https://phet.colorado.edu/en/research), [Explorable Explanations](https://worrydream.com/ExplorableExplanations/) | Immediate feedback, implicit scaffolding, linked representations, optional interaction. Physics simulations and design essays do not establish security-learning efficacy. |
| How can comparison require thought? | [ANU Predict–Observe–Explain](https://learningandteaching.anu.edu.au/resources/predict-observe-explain-activity/), [Simulic POE guide](https://simulic.com/en/guides/predict-observe-explain-with-simulations/) | Commit to a prediction, observe, explain the difference. These are teaching/practitioner guides; a two-choice UI with supplied explanation is only a lightweight POE adaptation. |
| Which security-learning precedents apply? | [WebGoat](https://owasp.org/www-project-webgoat/), [Juice Shop challenge tracking](https://pwning.owasp-juice.shop/companion-guide/latest/part1/challenges.html), [PortSwigger learning paths](https://portswigger.net/web-security/learning-paths), [ATT&CK Navigator](https://github.com/mitre-attack/attack-navigator) | Couple attacks to mitigations, offer filters and optional structure. A local model is not an intentionally vulnerable server, a production assessment, or proof of mastery. |
| How should confidence be framed? | [OWASP LLM01 prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | Least privilege and bounded mitigations; avoid presenting a perfect modeled score as real-world safety. |
| How much onboarding? | [NN/g contextual help](https://www.nngroup.com/articles/onboarding-tutorials/), [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Reopenable contextual guidance, not a mandatory tour or rigid wizard separating interdependent controls. |
| How should recovery and feedback work? | [Nielsen heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [visibility of system status](https://www.nngroup.com/articles/visibility-system-status/), [notifications](https://www.nngroup.com/articles/indicators-validations-notifications/), [empty states](https://www.nngroup.com/articles/empty-state-interface-design/) | Immediate state, reversible actions, inline errors, clear empty-result recovery. A fading toast is not reliable storage for essential information. |
| What does a diagram alternative require? | [WAI complex images](https://www.w3.org/WAI/tutorials/images/complex/) | Short identification plus structured, discoverable long description. A node inventory alone may omit essential relationships. |
| Which semantics should controls use? | [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/), [modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Implement the complete keyboard/state/focus pattern, not just roles. Patterns are guidance, not evidence of WCAG conformance. |
| How should panes collapse and reopen? | [Panel-control implementation lessons](panel-controls.md), [APG disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) (verified during documentation follow-up, 10 November 2026) | Native button activation, expansion state, and optional controlled-content reference. The arrow-only collapse/named reopen treatment and lateral arrows are local design choices, not requirements of this pattern. |
| What must remain visible and legible? | [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Distinguish thresholds and exceptions: 24px is the AA minimum target criterion with exceptions; 44px is a useful design aim, not the universal AA requirement. Diagram exceptions do not exempt surrounding UI from reflow. |
| How should status and motion behave? | [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [web.dev reduced motion](https://web.dev/articles/prefers-reduced-motion) | Polite updates, restrained animation, and live preference handling. Disclose that interaction-animation criterion 2.3.3 is AAA; do not conflate it with all AA obligations. |
| How should Persian content behave? | [W3C ALReq](https://www.w3.org/TR/alreq/), [HTML direction guidance](https://www.w3.org/International/questions/qa-html-dir) | Base direction, isolated technical identifiers, logical layout, ZWNJ, and script-appropriate fonts. RTL is more than mirroring flex rows. |

## Specific mistakes worth avoiding

1. **Rounded contrast passes.** The gray `#8e8e93` measured about 3.26:1 on white but only 2.99:1 on `#f5f5f7`. The redesign changed the light line token to `#86868b`. Always check actual neighboring surfaces and unrounded values.
2. **Homepage citations.** Early draft links pointed at the ANU and Simulic homepages instead of the retrieved POE articles. Preserve exact source URLs while researching.
3. **Documentation drifting from the UI.** The draft called the reset button “Reset walls” and the filter “Gets through,” while the UI said “Turn all walls on” and “breached.” Check report/README wording against catalogs after implementation.
4. **Overstating map alternatives.** A list of node names, wall counts, and disabled defenses improves access but does not describe every edge, trust boundary, secret location, or packet step. Describe what is covered and what still needs evaluation.
5. **Unconditional safety statements.** “The proxy is the only path out” can become false when the modeled network defenses are off. Qualify architecture descriptions by the active protections.
6. **Static motion preferences.** Reading `matchMedia(...).matches` once ignores subsequent OS changes. Register a change listener; separately test effects already in progress.
7. **Focus lost on hiding controls.** Prediction and restoration hide their triggering controls. Move focus to the next meaningful, visible control rather than leaving it on a hidden button.
8. **Weak tests described as strong evidence.** A check that a text-list element exists does not prove it updates, and a programmatic `.click()` does not prove touch reachability. Add state assertions and real interaction checks; retain manual follow-up.
9. **Transient Undo described as history.** A nine-second toast may be replaced by another notification. Say so, and distinguish it from experiment snapshot restoration.
10. **Research volume mistaken for certainty.** Many practitioner articles do not replace audience-specific usability testing. Use a small think-aloud study to test causal explanations, recovery, and discoverability; do not claim outcomes from a heuristic audit.
11. **Logical properties on the wrong axis.** A vertically written edge handle does not share the page's inline axis. A logical inset initially misplaced the RTL control; physical horizontal offsets with explicit RTL counterparts fixed the pointer-hit failure. Prefer logical properties where they map to the intended axis, not mechanically everywhere.
12. **Hiding the only recovery control.** A reopen handle inside an inert or clipped panel can become unusable. Keep it outside that pane and verify the rendered hit target, not just its DOM presence.
13. **Removing a name removes accessibility.** Hiding the visible panel name while expanded must not remove the localized accessible name. Synchronize state and action labels on language changes as well as clicks.

## Research report skeleton

```markdown
# Project — UI/UX research and redesign
Research date, scope, and evidence limitations.

## Recommendation
Primary learning loop and highest-priority changes.

## Baseline audit
Strengths to preserve and concrete observed friction.

## Evidence
Exact source links, supported findings, transfer, limitations.

## Decisions
Priority | change | affected areas | testable acceptance criteria.

## Verification plan
Languages, widths, themes, interaction paths, offline/disk checks.

## Verification record
Only executed checks, environment, outcomes, failures, fixes.

## Limits and follow-up
Manual accessibility, devices, learning/usability studies, deferred work.
```

Keep the skill about reusable decisions and procedure. Keep project-specific screenshots, release numbers, test results, proxy endpoints, and temporary tooling in the project's report or local environment—not as universal requirements.
