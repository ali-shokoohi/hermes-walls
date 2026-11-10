# Hermes Walls Lab — UI/UX research and redesign

Research date: 10 November 2026 (second round). Scope: the complete English/Persian, offline-first security-learning PWA, not a promotional landing page.

## 1. Recommendation

Keep the learning loop from round one (**change a defense → run an attack → explain the outcome → compare**), but make the learner **commit to a prediction before the comparison runs**, make direct wall and scenario changes **undoable**, and give the architecture diagram a **text alternative available to everyone**. Make the attack list filterable by outcome so the important result (which modeled attacks breach the setup) is one tap away. Remove remaining visual noise: all-caps labels, weak tab selection cues, and low-contrast state indicators.

This is an evidence-informed design proposal, not proof of improved learning. No interviews, controlled study, or screen-reader user study were performed. The harness search tool returned HTTP 403, so searches and most page retrievals went through the local proxy (`127.0.0.1:10808`); W3C pages were retrieved directly. One source (an MDPI review of Predict–Observe–Explain) was blocked and is not used as evidence. Research references are not runtime dependencies.

## 2. What changed since round one

Round one (commit `da3f08c`) added the guided experiment, the four-destination phone navigation, ARIA tabs, form-error associations, and a neutral visual system. The second round audited that result against a broader set of sources and found these remaining gaps:

1. **The experiment told the learner what to do but never asked them to think first.** "Remove that wall & retry" is an observe step without a predict step.
2. **Wall switches had no undo.** A mis-tap could change the score silently; restoring required remembering the previous state. Only the experiment had a restore path.
3. **No emergency exit** from a heavily modified setup other than the scenario picker.
4. **The diagram's information was visual only.** The SVG had a short label but no long description of which walls protect which node.
5. **The attack list could not be narrowed.** With 15 attacks, the breached ones (the interesting ones after weakening a wall) were scattered across groups.
6. **Tabs had one selection indicator** (color plus a thin underline). Several headings were all caps.
7. **Switch "off" tracks and map edges were below 3:1** against their background.
8. **Reduced motion was read once** at startup; changing the OS setting had no effect until reload.
9. **Focused controls could sit under the sticky phone navigation.**

These are source/heuristic findings, not measured user failure rates.

## 3. Related products and research

### Predict–Observe–Explain (POE)

[Simulic's POE guide](https://simulic.com/en/guides/predict-observe-explain-with-simulations/) (October 2026) summarizes the method: "Students commit to a prediction, watch what really happens, and then explain the difference," and in their implementation "the simulation stays locked until the student commits." The [ANU POE activity guide](https://learningandteaching.anu.edu.au/resources/predict-observe-explain-activity/) asks learners to revisit their prediction against the actual result. These are practitioner teaching guides, not independent experimental evidence of efficacy for this app.

**Transfer:** after the experiment's baseline run, replace the "remove the wall" button with two prediction choices — **Still stopped** / **Gets through**. Choosing one removes the wall and reruns the same attack, then shows whether the prediction matched, with the causal explanation. **Limit:** a two-choice prediction is a light version of POE; the "explain" step is supplied by the trace rather than written by the learner.

### Explorable explanations

Bret Victor's [Explorable Explanations](http://worrydream.com/ExplorableExplanations/) (2011): "The reader is not forced to interact," and sandbox-style dumps "are not explanations." He argues for multiple linked representations.

**Transfer:** the experiment stays optional; free exploration is never locked. The map, the trace, the result card, and the new map-as-text list are linked representations of the same model state.

### Simulation design: PhET

[PhET's research overview](https://phet.colorado.edu/en/research) describes four to six think-aloud interviews per simulation, minimal on-screen text, implicit scaffolding, and a caution that simulations should be fun "but not that fun" — engagement must serve the concept.

**Transfer:** no celebratory effects; feedback is explanatory. Keep instructional text short. **Limit:** physics-simulation findings do not establish security-learning effectiveness.

### Security practice: OWASP Juice Shop, WebGoat, LLM Top 10

The [Juice Shop companion guide](https://pwning.owasp-juice.shop/companion-guide/latest/part1/challenges.html) uses difficulty and category filters, progress tracking, and hints; notifications persist until dismissed. [WebGoat](https://owasp.org/www-project-webgoat/) pairs each hack with its mitigation. The [OWASP GenAI LLM01:2025 prompt-injection entry](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) states that it is "unclear if there are fool-proof methods of prevention" and recommends least privilege, human approval, and segregating external content.

**Transfer:** filter attacks by outcome (All / Breached / Contained / Blocked) with counts. Keep "a local model, not a certification" wording prominent — the OWASP statement supports not presenting 15/15 as "safe". **Difference:** Hermes does not award progress or difficulty points; clicks are not mastery.

### Coverage visualization: MITRE ATT&CK Navigator

[ATT&CK Navigator](https://github.com/mitre-attack/attack-navigator) overlays coverage layers on a technique matrix and runs entirely client-side.

**Transfer:** the outcome filter is a lightweight "coverage layer" over the attack catalog. The client-only design matches this app's offline constraint.

### Network simulation: Cisco Packet Tracer

[Packet Tracer](https://en.wikipedia.org/wiki/Packet_Tracer) teaches abstract networking with animated packets over a topology, positioned as a learning aid rather than real equipment.

**Transfer:** retain the packet animation and manual stepping; keep the "simulation only" framing.

## 4. Interaction and accessibility guidance

| Source | Verified guidance | Application |
| --- | --- | --- |
| [Nielsen, 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Users need a "clearly marked 'emergency exit'"; "Support Undo and Redo"; help in context; minimalist design. | Undo toast after direct wall/scenario changes; **Turn all walls on** in the Walls header; contextual experiment card rather than a tour. |
| [NN/g, Onboarding tutorials vs. contextual help](https://www.nngroup.com/articles/onboarding-tutorials/) (2023) | "Tutorials interrupt users, don't necessarily improve task performance, and are quickly forgotten"; "Make it easy to dismiss (and recall) the help content." | No forced tour. The experiment is a collapsible card that can be reopened. |
| [NN/g, Visibility of system status](https://www.nngroup.com/articles/visibility-system-status/) (2018) | Immediate feedback; "Communicating the current state allows users to feel in control." | Undo toast reports the modeled score change ("2 more attacks now get through"); filter counts are always visible. |
| [NN/g, Microinteractions](https://www.nngroup.com/articles/microinteractions/) (2018) | Feedback near the trigger; offer undo. | Switch state changes in place; the toast adds the undo option. |
| [NN/g, Indicators, validations, notifications](https://www.nngroup.com/articles/indicators-validations-notifications/) (2024) | Indicators belong near the element; toasts are poor for errors and can be missed. | Toasts are only for reversible, non-critical feedback with a longer timeout when they carry an action. Form errors stay inline. |
| [NN/g, Empty states](https://www.nngroup.com/articles/empty-state-interface-design/) (2021) | "Do not default to totally empty states"; "Provide direct pathways." | An empty filter explains why ("No attacks get through") and offers **Show all attacks**. |
| [NN/g, Data tables](https://www.nngroup.com/articles/data-tables/) (2022) | Support find/compare/view/act; clearly indicate active filters. | Filter buttons use `aria-pressed` and a filled state; a status line reports how many are shown. |
| [NN/g, Tabs used right](https://www.nngroup.com/articles/tabs-used-right/) (2024) | Use "at least two selection indicators"; avoid thin 1px strokes; short labels; no ALL CAPS. | Selected tab: bold accent text, 3px underline, and a tinted background. All-caps labels removed throughout. |
| [NN/g, Toggle-switch guidelines](https://www.nngroup.com/articles/toggle-switch-guidelines/) (2018) | Immediate effect; high-contrast state; label describes the on state. | Wall switches apply immediately and are labeled with the defense they enable. |
| [NN/g, Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) (2006) | At most two levels; don't stage interdependent steps. | Unchanged from round one: three-pane workbench; phone Tools one level away. |
| [NN/g, Mobile navigation patterns](https://www.nngroup.com/articles/mobile-navigation-patterns/) (2015) | More than five items is hard to fit; labeled icons; hidden menus are least discoverable. | Keep four labeled phone destinations. |
| [NN/g, Bottom sheets](https://www.nngroup.com/articles/bottom-sheet/) and [modal vs. nonmodal dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) | Visible Close, Back dismisses, short tasks only, no stacking; errors inline. | The add-friend sheet keeps its close button, Escape handling, and inline validation. |
| [W3C WAI, Complex images](https://www.w3.org/WAI/tutorials/images/complex/) (updated April 2026) | Diagrams need a short description plus a long description; "Make long descriptions available to everyone." | A visible **Map as text** disclosure under the map lists each node and zone with its walls on/off; the SVG references it via `aria-describedby`. |
| [APG switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) | Constant label; Space toggles; group related switches; `aria-describedby` for help. | Wall checkboxes have `role="switch"` and reference their description; each layer is a labeled group. |
| [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Inert background, Escape, focus return, visible close, `aria-labelledby`. | Preserved for the add-friend dialog. |
| [WCAG 2.2 — 1.4.11 Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 3:1 for state indicators and UI components. | Switch "off" track and zone/edge lines darkened (`#86868b` light, `#7c7c80` dark). Numeric checks cover the principal adjacent surfaces, not every diagram state. |
| [WCAG 2.2 — 1.4.3 Contrast (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 4.5:1 for text, 3:1 for large text. | Text colors unchanged from the neutral palette. |
| [WCAG 2.2 — 2.4.11 Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Sticky footers can hide focus; scroll padding is a fix. | `scroll-padding-bottom` reserves the phone navigation height plus safe area. |
| [WCAG 2.2 — 4.1.3 Status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Use `role="status"`; avoid assertive announcements for non-urgent updates. | Filter status, experiment text, and toasts are polite. |
| [WCAG 2.2 — 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | 320px without two-dimensional scrolling; diagrams are exempt only for that section. | Only the map scrolls in two dimensions; everything else reflows. |
| [WCAG 2.2 — 2.3.3 Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [web.dev, prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) | Motion triggered by interaction should be disableable; JavaScript should listen for preference changes. | A `change` listener updates the reduced-motion flag live. |
| [Android window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes) | Compact < 600, medium 600–839, expanded ≥ 840; no two-pane in compact height. | Unchanged: the three-pane workbench needs more than the 840px "expanded" minimum, so it switches to single-pane navigation at 1080px and below. |
| [W3C Arabic & Persian layout requirements (ALReq)](https://www.w3.org/TR/alreq/) | Base direction, bidi isolation of neutrals, ZWNJ in Persian, legible small-screen sizes. | Persian catalog already uses ZWNJ; identifiers remain isolated LTR. No change needed. |

## 5. Implementation decisions

| Priority | Change | Files | Acceptance |
| --- | --- | --- | --- |
| P0 | Prediction step in the experiment | `js/app.js`, `index.html`, catalogs, CSS | After the baseline, two prediction buttons replace the "remove" action; choosing one removes the wall, reruns, and reports matched/surprise. **Restore my setup** still returns the exact snapshot. |
| P0 | Undo for every configuration change | `js/app.js`, catalogs | Wall switches, layer "all", inspector toggles, result actions, and scenario changes show an Undo toast with the score change; Undo restores the previous configuration and logs it. |
| P0 | Emergency exit | `index.html`, `js/app.js`, catalogs | **Turn all walls on** in the Walls header restores the full design (undoable); disabled when every wall is already on. |
| P0 | Map as text | `index.html`, `js/app.js`, catalogs, CSS | Visible disclosure listing host, each friend's proxy/Hermes box/sandbox/bridge with walls on/off, and external services; updated on every change; referenced by the SVG. |
| P1 | Attack outcome filter and empty state | `index.html`, `js/app.js`, catalogs, CSS | All/Breached/Contained/Blocked with counts and `aria-pressed`; polite status; empty state with **Show all attacks**. |
| P1 | Switch semantics, tab indicators, sentence case, contrast | `js/app.js`, CSS | `role="switch"` with descriptions; labeled layer groups; two tab selection indicators; no all-caps labels; ≥3:1 state indicators. |
| P1 | Live reduced-motion, focus not obscured | `js/app.js`, CSS | Preference changes apply without reload; focused controls stay above the phone navigation. |
| P1 | Matching panel collapse/reopen handles (user-requested follow-up) | `index.html`, `css/app.css`, `js/app.js`, browser checks | Both desktop panels retain an operable edge handle in each state; open handles are arrow-only, closed handles show the panel name; localized action/expansion state and RTL positioning stay synchronized. |
| P1 | Release | `sw.js`, README | Cache name bumped; no new assets or third-party requests; README documents the new workflow. |

### Content rules

- Prediction wording is neutral ("Still stopped" / "Gets through"); a wrong prediction says "Not what you predicted. Check the trace to see why," not that the learner failed.
- Undo toasts state what changed and the effect on the modeled score, for example "Off: Firewall: only SSH in · 1 more attack now gets through".
- The score remains "modeled attacks stopped", never "secure".
- No points, streaks, or completion percentages.

### Follow-up: desktop panel handles

The user requested matching collapse/reopen controls for both side panes, then clarified that the panel name should not appear when closing an open pane. This is a direct product preference, not a new research finding or evidence that icon-only controls are universally better.

The [APG Disclosure (Show/Hide) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) was retrieved during the documentation follow-up on 10 November 2026. It supports button activation with Enter/Space, `aria-expanded` reflecting visibility, and an optional `aria-controls` reference. It does not prescribe the arrow-only/named state treatment or the lateral arrows used here; those remain local design choices. This source check does not establish that keyboard interaction was tested in the browser.

- Above 1080 CSS pixels, each expanded pane has an arrow-only handle at its inner boundary. When collapsed, the handle remains at the workbench's outer edge with the panel name. Both states retain a localized accessible label describing the next action; arrows mirror appropriately in RTL. Existing header toggles, shortcuts, and saved panel visibility remain available.
- Handles live inside the positioned `#main` workbench but outside the panes made inert. This keeps reopening possible without depending on hidden content. `setPanel` and `syncPanelButtons` share state/label updates across edge controls, header controls, shortcuts, and language refresh.
- Handle offsets reuse pane-width variables. An initial logical-inset implementation failed the RTL pointer hit test because the handle uses vertical writing mode; physical horizontal offsets with explicit RTL counterparts corrected that geometry. This is a documented axis-specific exception, not a reason to abandon logical CSS elsewhere.
- The open handle has a 44×44 CSS-pixel design target. At 1080px and below, desktop handles remain hidden and the existing mobile navigation is unchanged. The deployed UI changes advanced the cache to `walls-lab-v16`; the subsequent documentation/skill updates do not change the runtime shell.

### Follow-up: scalable language selection and translation contributions

Requested on 10 November 2026: replace language cycling with a dropdown and make future contributions easier. Source inspection found that the existing button chooses the next registry entry, not a named destination. That becomes harder to predict with three or more languages; this is a design rationale, not an observed usability-study result. The repository is not indexed by the available code graph, so this follow-up uses targeted source inspection.

Sources retrieved on 10 November 2026:

- [MDN: The HTML select element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select): native options, selected value, labeling, and browser-provided interaction. Use an ordinary single-select with a localized accessible name rather than a custom ARIA popup. Browser/OS styling and interaction vary; native markup does not establish accessibility conformance.
- [W3C Internationalization: Using select to link to localized content](https://www.w3.org/International/questions/qa-navigation-select): use native language names, keep the selector near the top, and account for script/font support. It also notes that direct links can be better for a handful of languages. We choose a compact selector for the constrained lab header and requested future growth, not because dropdowns are universally superior. This app changes language in place rather than navigating to another site.

Acceptance criteria and planned verification:

- Display the current language and a native dropdown indicator; list full native names in stable registry order without flags. Generate choices from metadata, including per-option language/direction/script; never require a new language-specific branch in selector logic.
- Keep focus on the same select after switching, reuse `setLang`, preserve wall/friend configuration and experiment restoration, and retain saved preference, URL precedence, RTL, offline, and direct-disk behavior. Existing language switching still stops playback and resets simulated chat.
- Keep the control at least 44px high, with visible keyboard focus and no header overflow at 320px. Retain full language names on phones, allowing the scenario control to shrink instead.
- Add a contributor entry point and a translation checklist covering metadata, catalog registration, placeholders/plurals, script/font support, HTML trust, cache assets, and browser review. Add a dependency-free checker for catalog/registry consistency, placeholders/plurals, load order, and precache registration; test its failure paths as well as current catalogs.
- Extend browser regression checks for the real change handler, native keyboard selection/focus, registry-generated options (including a temporary third language), state preservation, preference reload/URL override, layout, offline switching, and disk switching. Refresh install screenshots intentionally. Record executed results separately below; screen readers, real mobile pickers, and cross-browser behavior remain manual follow-up.

## 6. Verification record

Executed on 10 November 2026 with headless Chromium and Node's built-in CDP/WebSocket client (`tools/check-ui.mjs`), reduced motion enabled, served over `localhost`, plus a direct `file://` startup check. No dependency or build step was added to the app.

| Check | Observed result |
| --- | --- |
| English/Persian × 320/390/768/1280/1440px × light/dark | No document, header, or panel overflow in all 20 combinations; phone navigation targets at least 44px high. |
| Desktop panel handles | At 1440px in English and Persian, both handles passed open → closed → open using CDP mouse input. Assertions covered expansion/inert state, hidden name only while expanded, localized next-action labels, width ≥44px, and center-point `elementFromPoint` reachability. The failing RTL positioning attempt was corrected before the full rerun passed. |
| Prediction experiment | Baseline kept the configuration; choosing **Gets through** removed the wall and reran; **Restore my setup** returned the exact snapshot; the unprotected scenario showed the alternative explanation. |
| Undo and reset | Turning a wall off showed an Undo toast; Undo restored the configuration; **Turn all walls on** restored the full design and was disabled afterward. |
| Attack filter | Filtering hardened setup to "breached" showed the empty state; **Show all attacks** returned all 15. |
| Map as text | List present and updated after configuration changes; SVG references the description. |
| Switch semantics | Wall inputs expose `role="switch"` and a description reference. |
| Existing security model | All 15 hardened outcomes stopped; every attack completed through automatic playback with a trace; all six scenarios produced valid outcomes. |
| Keyboard plumbing | LTR/RTL arrows, Home/End, single tab stop, tab/panel association, hidden-panel inert, inspector Escape focus return, input invalid/help links. |
| Preserved tools | Chat identities, self-test, form validation, friend provisioning, manual playback (pause/next/stop), mobile tool access including Log. |
| Offline and disk | Cached offline reload and playback passed; `file://` startup exposed all 15 attacks. |
| Catalogs and syntax | English/Persian key parity (546 keys each); classic-script syntax; manifest JSON. |
| Visual review | Wide English experiment card with prediction buttons and phone Persian filter/empty state reviewed; a redundant "showing 0" status was removed as a result. |

These are bounded automated and screenshot checks, not a claim of WCAG conformance, perceptual contrast auditing, cross-browser coverage, or demonstrated learning gains.

### Language-selector follow-up verification (10 November 2026)

- The unchanged browser regression suite passed before implementation. After the change, the extended `tools/check-ui.mjs` passed with `LAB_FILE` enabled: native ArrowDown/Enter selection into Persian and ArrowUp/Enter back to English retained select focus; the actual change handler selected a temporary third registry language; options matched registry names/language/direction; wall/friend configuration and experiment restoration survived switching; saved preference and explicit URL override worked.
- English/Persian × five widths (320, 390, 768, 1280, 1440px) × light/dark passed document/header/panel overflow checks. The selector's current value, ≥44px target dimensions, viewport bounds, and center-point hit test passed in all 20 combinations. The existing panel, model/playback, tools, dialogs, and offline regressions also passed. Cached offline and direct `file://` language switching passed.
- `tools/check-i18n.mjs` passed two registered languages / 547 source keys with no fallback warnings. Eleven Node tests passed, covering accepted translations, malformed messages, opt-in partial catalogs, actual repository registration, and fixture failures for cache/script omission, deferred/late registry, invalid direction, wrong catalog registration, and syntax errors. Classic app syntax and `git diff --check` passed.
- Refreshed and visually reviewed the 1440×900 wide and 780×1688 narrow manifest screenshots. Separately reviewed the Persian dark UI at 320px: full native name, native arrow, and blue focus outline were visible. A targeted CDP Tab/Shift+Tab check found selector focus, `:focus-visible`, a 3px outline, and the same option node retained across language switches.
- Runtime cache advanced to `walls-lab-v17`. Development guides/checks remain outside the offline shell. No runtime dependencies or network services were added.
- Limits: Chromium/Linux only; no screen-reader, real-device/mobile picker, other-browser, zoom/forced-colors, new-script font coverage, or subpath-deployment test was executed for this follow-up. The synthetic third language tests registration/selection, not a real translation's quality or layout. The checker does not detect duplicate JavaScript object keys, untranslated source copies, unsafe HTML, or all possible metadata mistakes. Research references guide the interaction choice; no usability or learning-effectiveness claim follows from these checks.

### Shared-link preview follow-up (10 November 2026)

- Added static Open Graph and Twitter large-image metadata for the public GitHub Pages URL, plus a bilingual 1280×640 PNG using the existing product screenshot and self-hosted fonts. Crawlers can discover it without running the app. Absolute sharing URLs are intentional exceptions to relative runtime asset paths.
- Source: [GitHub Docs — Customizing your repository's social media preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview), retrieved 10 November 2026. GitHub recommends 1280×640 and an image under 1 MB; repository-card images require a separate Settings upload, not website metadata. This is platform guidance, not evidence that every sharing service will display a card.
- Executed: development renderer verified local fonts/image decoding, artwork element bounds, PNG dimensions, and size (165,127 bytes); visually reviewed the resulting English/Persian artwork. Static HTML checks verified matching Open Graph/Twitter image URLs, titles, descriptions, alt text, MIME type and dimensions. Local HTTP returned the image as `image/png`; all precache paths exist. Catalog validation and all 11 validator tests passed, as did runtime syntax, manifest parsing, and whitespace checks. The complete existing browser suite passed, including 20 language/viewport/theme combinations, modeled workflows, cached offline navigation, and direct-file startup.
- Limits: no actual Telegram, WhatsApp, Facebook, X, or other service card rendering/cache refresh was tested. The preview is shared across language/deep links; it is not dynamically personalized. GitHub's separate repository social image was not uploaded by this change.

## 7. Manual follow-up and limits

- Run a small think-aloud study (four to six learners, as PhET does). Tasks: predict an outcome, weaken a defense, explain the change, undo a mistaken toggle, reset, filter to breached attacks, find the log on a phone. Observe prediction accuracy over time, causal explanations, recovery, and discoverability. Collect no analytics without an explicit privacy decision.
- Test with VoiceOver/NVDA in both languages, especially the map-as-text reading order and toast announcements; test zoom, forced colors, and real touch devices.
- Manually review panel Enter/Space activation and focus (including collapsing while focus is inside a pane), header/shortcut synchronization, reload of saved visibility, language changes while collapsed, both panes closed, and transitions across 1080px. The handle cycle uses reduced motion at 1440px; it does not verify animated travel, every desktop width/theme combination, full target bounds/height, or real touch operation.
- Undo is a transient, one-level toast action (nine seconds), not durable history; a later notification can replace it. The experiment has a separate **Restore my setup** recovery path. Neither recovery snapshot survives reloads beyond the normal saved configuration.
- No real deployment, command execution, or adversarial test occurs; the model is deliberately bounded and is not a security rating.
- No new backend, framework, tracking, CDN, or dependency manager is justified by these findings.
