# Hermes Walls Lab — UI/UX research and redesign

Research date: 10 November 2026. Scope: the complete English/Persian, offline-first security-learning PWA, not a promotional landing page.

## 1. Recommendation

Design around one learning loop: **change a defense → run an attack → explain the outcome → compare**. Keep the working architecture, defenses, and attacks visible together on wide screens. On phones, give the three primary activities stable navigation and put secondary tools one clearly labeled level away. Offer an optional, reversible experiment rather than forcing everyone through onboarding.

This is an evidence-informed design proposal, not proof of improved learning. No interviews, controlled study, or screen-reader user study were performed. Primary-source pages were retrieved directly; the fallback proxy was not needed. Sources accessed on the research date are linked below. Research references are not runtime dependencies.

## 2. Related products and research

### Interactive simulation: PhET

[PhET's research overview](https://phet.colorado.edu/en/research) describes research-informed simulation design, think-aloud interviews (typically four to six per simulation), dynamic feedback, exploration, and implicit scaffolding. It links work including *A Study of Educational Simulations Part II—Interface Design* (Adams et al., 2008) and *Factors promoting engaged exploration with computer simulations* (Podolefsky et al., 2010). This review used the overview, not a full independent review of those papers.

**Transfer:** retain the manipulable map and immediate feedback. Introduce a compact experiment that tests the existing configuration, disables the wall that stopped that attack, reruns it, and restores the learner's original configuration. Show explanatory outcomes, not decorative rewards. **Limit:** physics-simulation findings do not establish security-learning effectiveness; validate with this audience.

### Security practice: OWASP WebGoat

[WebGoat](https://owasp.org/www-project-webgoat/) pairs vulnerability explanation and practice with mitigation (“Learn the hack – Stop the attack”) and emphasizes authorized, safe learning.

**Transfer:** link every attack outcome to the responsible wall and keep replay, trace, and mitigation actions nearby. State the model's limits prominently. **Important difference:** WebGoat is an intentionally vulnerable application; Hermes is a local simulation. Do not imply that Hermes opens a vulnerable server, deploys infrastructure, or certifies a real system's security.

### Structured practice: PortSwigger Web Security Academy

[Learning paths](https://portswigger.net/web-security/learning-paths) provide curated, structured, self-paced study. The fetched page describes that approach; detailed pathway content is dynamically rendered and was not independently audited here.

**Transfer:** an optional first experiment can supply a starting point without removing open exploration. Do not invent completion certificates, mastery percentages, or learning progress based only on clicks.

### Progressive disclosure

[Nielsen Norman Group, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) (Jakob Nielsen, 2006) recommends keeping important, frequent options visible and deferring less-used complexity behind clear labels. It distinguishes disclosure from staged workflows and cautions against splitting interdependent choices into rigid steps.

**Transfer:** preserve the three-pane desktop workbench. On mobile, use Map, Walls, Attacks, and Tools; Tools exposes Friends, Telegram, Self-test, Trace, and Log. Do not bury the attack/defense loop in a wizard. The extra tap for secondary tools is an explicit tradeoff for legibility and adequate touch targets.

## 3. Standards that constrain the design

| Source | Verified guidance | Application |
| --- | --- | --- |
| [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Tab/tabpanel associations, selected state, roving tab stop, arrows, Home/End; automatic activation is appropriate when panels appear immediately. | Proper desktop tabs, direction-aware arrows, labeled panels, focusable panel content. Mobile destination navigation is navigation, not an invalid shared-panel tablist. |
| [WCAG 2.2 target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | AA minimum is 24×24 CSS pixels, with specified exceptions. 44×44 is the enhanced criterion, not the AA requirement. | Aim for 44-pixel primary controls and comfortable row targets. Check compact controls rather than claiming universal compliance. |
| [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | Color cannot be the only way to communicate information. | Keep visible blocked/contained/breached text, counts, checks, switch state, and explanatory traces alongside semantic colors. |
| [W3C HTML direction guidance](https://www.w3.org/International/questions/qa-html-dir) | Set base direction with HTML `dir`; isolate mixed-direction text and use `dir="auto"` where appropriate. | Retain pre-paint language selection, logical layout, Persian typography, LTR code, isolated identifiers, and direction-aware keyboard behavior. |
| [web.dev PWA offline data](https://web.dev/learn/pwa/offline-data) | Cache Storage stores URL-addressable resources; localStorage is synchronous and suited to small values, not bulk data. | Keep the dependency-free cached shell and small saved preferences. Do not add a database or network service to solve a visual-design problem. |

The Apple-style local design skill supplies visual conventions (neutral surfaces, blue actions, restrained typography and spacing). These are aesthetic/product constraints, not empirical evidence that an Apple-like interface teaches security better. Apple's JavaScript-rendered HIG layout page did not expose substantive content through the retrieval tool and is not used as a research finding.

## 4. Audit of the existing app

### Strengths to preserve

- Fifteen attacks and six defense layers already support cause-and-effect learning.
- Architecture inspection, blast radius, attack traces, chat identities, self-tests, and friend provisioning offer useful complementary representations.
- Automatic/manual playback, local preferences, self-hosted fonts, classic scripts, bilingual catalogs, and offline caching are strong foundations.
- Outcome labels already accompany semantic colors. No external runtime dependencies are necessary.

### Friction to address

1. **No clear starting action.** A first-time learner faces a dense map, many switches, and an attack catalog without an experiment to try.
2. **Crowded phone navigation.** Seven destinations compete for space; the activity log is not reachable from the mobile bar. Header controls compete with the scenario picker.
3. **Weak hierarchy.** Many small labels, tightly packed controls, teal/blue accents, dotted backgrounds, gradients, shadows, and celebratory effects compete with the learning task.
4. **Misleading confidence risk.** “15/15 attacks stopped” can be mistaken for a real security rating; self-test language can sound like actual command execution.
5. **Incomplete interaction semantics.** Desktop tabs lack a full roving keyboard pattern and explicit relationships. Mobile buttons use tab selection without valid panel relationships. Hidden mobile panels need consistent inert handling after navigation and resizing.
6. **Form feedback is primarily visual.** Errors need input-level invalid state and programmatic links to their help text.

These are source/heuristic findings, not measured user failure rates.

## 5. Implementation decisions

| Priority | Change | Files | Acceptance |
| --- | --- | --- | --- |
| P0 | Add a visible local-simulation disclaimer and explicit modeled score wording | `index.html`, catalogs | No implication of real execution or certification in the main learning workflow. |
| P0 | Optional compare experiment with reversible configuration changes | `js/app.js`, markup, catalogs | Test current setup, disable the stopping wall and rerun, restore original setup; retain free attack selection. |
| P0 | Four-destination mobile navigation and complete Tools access | markup, JS, CSS, catalogs | Every existing tool, including Log, reachable in English and Persian without a squeezed seven-item bar. |
| P0 | Correct tabs, keyboard focus, hidden panels, and form errors | markup, JS | Tab associations, roving focus, RTL arrows, hidden content inert, invalid/help associations. |
| P1 | Neutral visual system across the shell, map, attacks, inspector, chat, friends, and dialog | `css/app.css` | Consistent blue actions, no decorative gradients/shadows, readable labels, generous controls, semantic outcome colors preserved. |
| P1 | Preserve file/offline behavior and update cache release | `sw.js`, manifest, README | Relative local assets, bumped cache name, no new third-party requests, existing shortcuts documented. |

### Visual system

- Light: white surfaces, `#f5f5f7` canvas, `#1d1d1f` text; dark: neutral charcoal surfaces rather than saturated navy.
- Action blue `#0066cc`; dark links `#2997ff`; focus blue `#0071e3`. Green, amber, and red communicate security outcomes, not additional brand accents. Friend colors identify simulated people.
- Local Inter/system typography; local Vazirmatn for Arabic script. Body text 17px, utility text generally 14px. Map labels retain scale-appropriate SVG typography.
- Spacing built around 8, 12, 17, 24, and 32px. Utility corners 8px, cards 18px, pill-shaped main actions. Borders and spacing replace decorative shadows.
- Avoid a marketing hero: viewport space belongs to the model, controls, and explanations. Map remains inspectable and scrollable when vertical space is constrained.

### Content and interaction

- Explain the score as **modeled attacks stopped**, not safety or mastery.
- Label the optional experiment; never silently reset the learner's setup at entry.
- Snapshot the current configuration before the experiment changes it; make restoration explicit and available until restored. Do not persist an experiment-in-progress across reloads.
- Reuse the existing simulator and attack pipeline; do not implement a second, contradictory security model.
- Keep automatic playback and manual stepping; respect reduced motion and preserve saved preference.
- Use polite status feedback, not forced focus jumps for every animation step.
- Preserve all six desktop tabs, all scenarios, friend isolation, chat identities, self-tests, trace, log, install, and language/theme controls.

## 6. Verification plan

Check Chromium at 320, 390, 768, 1280, and 1440px, English/LTR and Persian/RTL, light/dark, and reduced motion. Check document/header overflow, primary targets, mobile destination/tool access, tab keyboard navigation, restored configuration, form errors, all fifteen modeled attacks, manual playback/stop, friend addition, and language switching. Exercise cached reload with network disabled and direct `file://` startup. Use local browser automation without adding runtime dependencies; record actual results separately rather than treating this plan as evidence of a pass.

Manual follow-up: keyboard-only task completion, real touch devices, browser zoom/text enlargement, forced colors, VoiceOver/NVDA with Persian content, and a small think-aloud study. Suggested tasks: predict an outcome, weaken one defense, explain the changed result, restore it, inspect a friend's isolation, and find the log on a phone. Observe time to first meaningful attack, correct causal explanation, recovery success, and discoverability. Do not collect analytics or send learner data without an explicit privacy decision.

## 7. Limits and deferred work

- No claim of complete WCAG conformance follows from source inspection or automated browser checks.
- No real deployment, container execution, or adversarial test occurs. Simulation coverage is deliberately bounded.
- No new backend, framework, tracking, CDN, dependency manager, or mandatory account is justified.
- Full diagram accessibility remains a specialized challenge: retain keyboard inspection and textual traces, and validate the reading order with assistive-technology users.
- Long-term preference persistence depends on browser storage; offline availability depends on successful initial caching. Neither is a backup guarantee.

## 8. Implementation verification record

Executed on 10 November 2026 using headless Chromium and Node's built-in CDP/WebSocket client (`tools/check-ui.mjs`), with reduced motion enabled. The static site was served over localhost; direct-file startup was checked separately. No dependency or build step was added to the app.

| Check | Observed result |
| --- | --- |
| English/Persian × 320/390/768/1280/1440px × light/dark | All 20 combinations passed document, header, and selected attack/wall panel overflow assertions. Primary phone navigation targets were at least 44px high. |
| Guided experiment | Baseline preserved the configuration; comparison removed a defense; restoration returned the exact snapshot. The already-unprotected setup showed the alternative explanation. |
| Existing security model | All 15 hardened outcomes remained stopped. Every attack completed through the actual automatic playback UI with a populated trace. All six selectable scenarios produced valid modeled outcomes. |
| Keyboard and accessibility plumbing | LTR/RTL arrows, Home/End, one desktop tab stop, tab/panel associations, hidden-panel inert state, inspector entry/Escape focus return, and input invalid/help links passed. |
| Mobile navigation | All five secondary tools, including Log, were reachable at narrow widths. Manual playback controls were in view at 320×700 in Persian. |
| Preserved lab tools | Three chat identities, self-test completion, invalid form feedback, and successful friend provisioning passed. |
| Playback | Manual pause, next step, and stop passed. |
| Offline and disk | Cached offline navigation/reload and manual playback passed; direct `file://` startup exposed all 15 attacks. |
| Catalogs and syntax | English/Persian key parity (527 keys each), classic-script syntax, and manifest JSON passed. No browser runtime exceptions were observed in the UI suite. |
| Visual review | Wide workbench and phone dialog screenshots reviewed and refreshed for the install manifest. Screenshot review led to fixing internal horizontal overflow and moving the simulation notice above the experiment. |

These are bounded automated/screenshot checks, not a claim of comprehensive accessibility, perceptual contrast auditing, cross-browser conformance, or demonstrated learning gains. Real devices, non-reduced-motion usability, assistive technology, zoom/forced-colors behavior, and think-aloud studies still need the manual validation described above.
