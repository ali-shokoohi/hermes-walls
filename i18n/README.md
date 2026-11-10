# Translating Hermes Walls Lab

- `en.js`: English source text (all keys).
- `fa.js`: Persian translations with the same keys.
- `languages.js`: available languages, display names, direction, and number/script settings. It also selects the initial language before first paint.

These are classic JavaScript files, not fetched JSON or modules. Keep them local so the app works from `file://`, subpaths, and offline without a build step.

## Quick start

You can contribute a typo fix or a better translation without changing app logic. For a new language, follow [Add a language](#add-a-language); for general development and pull-request expectations, see [CONTRIBUTING.md](../CONTRIBUTING.md).

1. Edit the appropriate catalog, keeping keys and placeholders unchanged.
2. Run the dependency-free checker with Node 22+:

   ```sh
   rtk proxy node tools/check-i18n.mjs
   ```

3. Open the lab in that language and review your wording in context. The checker catches structural mistakes, not translation quality or layout issues.

## Edit text

Change a value, not its key. Catalogs contain navigation, accessible labels, wall/attack descriptions, simulation steps, inspector content, chat replies, and friend-dialog text. Brand names, command/config examples, domain names, and user-entered names remain unchanged.

Placeholders such as `{name}`, `{port}`, and `{n}` must keep their names, but can move anywhere in a sentence. Do not translate placeholder names. A template can repeat a placeholder. Numeric parameters are automatically localized; ports, IDs, and other literal technical values are passed as strings to preserve ASCII.

Plural messages can be objects with `zero`, `one`, `two`, `few`, `many`, and `other` forms. Always include `other`. The app chooses a form using `Intl.PluralRules` and the numeric `{n}` parameter. A plain string is fine when every number uses the same sentence.

```js
"failedN": { "one": "{n} test failed", "other": "{n} tests failed" }
```

Most messages are escaped as text. Keys used by `data-i18n-html` intentionally contain trusted HTML: preserve tags and attributes, and only translate their text. Do not add untrusted HTML, scripts, inline event handlers, or remote assets. The checker does not sanitize or validate HTML; changes to these messages need source review.

The simulated chat recognizes command/URL keywords. Keep commands and URLs in `quick.*` messages intact; translating a greeting or other natural-language quick action may also require adding its keywords to `chat()` in `js/app.js`.

### Stateful panel labels

`edgeL` and `edgeR` name the panels on their collapsed reopen handles. Their visible spans are intentionally hidden while the panels are open; do not remove the translations or replace accessible names with empty strings. `hideWalls` / `showWalls` and `hideTools` / `showTools` describe the next action for both header and edge controls. `syncPanelButtons(side)` refreshes those labels and tooltips when state or language changes.

Check both open and closed states after switching languages, including while a panel is already collapsed. In RTL, Walls and Tools swap physical edges, but their identity and action wording stay the same; translate meaning rather than embedding left/right instructions. Verify Persian arrows, visible panel names, and accessible labels together.

## Add a language

1. Choose a lowercase BCP 47 code, such as `ar` or `pt-br`. Copy `en.js` to `<code>.js`, for example `ar.js`. Change its assignment to `window.HWL_I18N.strings.ar = { ... }` (use bracket notation for hyphenated codes: `strings["pt-br"]`). Translate values, not keys. Missing keys fall back to English. A present plural object must include `other`; missing categories use that language's `other`, not English.
2. Add metadata to `langs` in `languages.js`, for example:

   ```js
   ar: {
      name: "العربية", dir: "rtl", script: "arab",
      font: "Vazirmatn, sans-serif", digits: "٠١٢٣٤٥٦٧٨٩", decimal: "٫"
   }
   ```

   `name` is the language's native name (autonym), not its English name or a flag. The dropdown uses this name at every viewport size and follows registry insertion order. `name` and `dir` are required; selector options are generated automatically—no selector code or option markup needs editing. `short` and `switchLabel` are no longer used.

   Use `dir: "ltr"` for left-to-right languages. `script: "arab"` opts into the bundled Arabic-script typography; RTL does not require this script (for example, Hebrew needs its own font choices). `digits`, `decimal`, `font` (SVG map text), and animation `pace` are optional. Leave digits/decimal unset for ASCII numbers. The digit map must have ten distinct characters in 0–9 order; `pace` must be positive. Check the new script in body text, controls, options, and SVG: a `font` metadata entry alone does not style the entire page. Add any new fonts locally, define script-specific rules in `css/app.css` / `css/fonts.css`, and precache the files; don't use a CDN.
3. Add `<script src="i18n/ar.js"></script>` in `index.html` after `en.js` and before `js/app.js`.
4. Add `./i18n/ar.js` to `SHELL` and bump `VERSION` in `sw.js`.
5. Run `rtk proxy node tools/check-i18n.mjs`. It checks registered catalogs for key parity, nonempty strings, placeholder names, valid plural forms with `other`, essential metadata, synchronous script order, and registry/catalog precache entries. It does **not** detect duplicate object keys, untranslated English copies, unsafe HTML, font coverage, or translation quality.
6. Review the checklist below and include the language, screenshots, commands/results, and any untranslated content in your pull request. Ask a fluent speaker to review the text where possible. Update the supported-language descriptions in `README.md` / `CONTRIBUTING.md` when a language ships. If the selector/header appearance changes, intentionally refresh the manifest screenshots using the README command.

### Partial translations

Complete catalogs are preferred. To propose an explicitly partial translation, remove untranslated keys rather than leaving English copies that look complete. Run `rtk proxy node tools/check-i18n.mjs --allow-missing` to report missing keys as warnings; all other structural errors still fail. Include the fallback warnings and unfinished sections in the pull request. The default checker remains strict to catch accidental omissions in existing languages. English is the canonical complete source; do not remove source keys just to make a translation pass.

### Review checklist

- [ ] Every translated key retains its exact placeholder names; every plural branch includes the placeholders used by the English message and has an `other` fallback. A repeated placeholder is allowed. Spell technical commands, ports, IDs, domains, and config snippets exactly.
- [ ] The new catalog assigns to the matching registry code, is synchronously loaded after `en.js` and before `js/app.js`, and appears in `sw.js` `SHELL`. Keep `languages.js` before stylesheets for correct first-paint direction. Bump the cache version for any runtime edit.
- [ ] Native names display in the dropdown, including mixed scripts. Test long names at 320px; the closed selector is capped to keep the header usable, so verify the native popup also exposes the full name. Never abbreviate the option text to make it fit.
- [ ] Switching in both directions updates labels, accessible names, numbers, layout, and arrows. Focus stays on the selector, wall/friend configuration survives, and experiment restoration still works. Switching language stops playback and resets simulated chat, as before.
- [ ] Test keyboard selection, visible focus, phone and desktop widths, light/dark themes, dialogs, panel reopen labels, attack results, plural/number examples, and mixed-direction technical text. Check Persian ZWNJ and equivalent script conventions where relevant.
- [ ] Verify a bare-URL reload uses the saved selection; an explicit `?lang=…` or `#…` overrides it. Test installed/offline reload and switching after caching, a subpath deployment, and direct `file://` startup.
- [ ] State which checks were actually run and what remains unverified (especially screen readers, mobile native pickers, and font coverage). No automated check certifies accessibility or translation correctness.

The initial language uses a supported URL code (`?lang=fa` or `#fa`), then the saved preference, browser languages, and finally English. Regional browser tags fall back to their base language when needed. Unsupported codes are ignored. Selecting a language changes the page in place and saves the preference; it does not rewrite the URL. Therefore, reloading an explicit language link still uses that link's language. The page's `lang`, `dir`, and `data-script` update together; RTL layout, arrows, and mixed Latin-text isolation follow direction, not the language code.

## Using messages in code

Use `S("failedN", { n: count })` for an immediate string. Use `K("wall.ufw.desc")` for content that must be resolved again after switching languages. Nested lazy values, such as `K("isoOk", { name: friend.name })`, follow the current language too. User-created names are plain strings and stay unchanged.

Keep the installed-app manifest's default English metadata separate: `manifest.webmanifest` is static and is not translated by these catalogs.
