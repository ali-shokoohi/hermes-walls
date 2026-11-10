# Translating Hermes Walls Lab

- `en.js`: English source text (all keys).
- `fa.js`: Persian translations with the same keys.
- `languages.js`: available languages, display names, direction, and number/script settings. It also selects the initial language before first paint.

These are classic JavaScript files, not fetched JSON or modules. Keep them local so the app works from `file://`, subpaths, and offline without a build step.

## Edit text

Change a value, not its key. Catalogs contain navigation, accessible labels, wall/attack descriptions, simulation steps, inspector content, chat replies, and friend-dialog text. Brand names, command/config examples, domain names, and user-entered names remain unchanged.

Placeholders such as `{name}`, `{port}`, and `{n}` must keep their names, but can move anywhere in a sentence. Do not translate placeholder names. A template can repeat a placeholder. Numeric parameters are automatically localized; ports, IDs, and other literal technical values are passed as strings to preserve ASCII.

Plural messages can be objects with `zero`, `one`, `two`, `few`, `many`, and `other` forms. Always include `other`. The app chooses a form using `Intl.PluralRules` and the numeric `{n}` parameter. A plain string is fine when every number uses the same sentence.

```js
"failedN": { "one": "{n} test failed", "other": "{n} tests failed" }
```

Most messages are escaped as text. Keys used by `data-i18n-html` intentionally contain trusted HTML: preserve tags and attributes, and only translate their text. Do not add untrusted HTML.

The simulated chat recognizes command/URL keywords. Keep commands and URLs in `quick.*` messages intact; translating a greeting or other natural-language quick action may also require adding its keywords to `chat()` in `js/app.js`.

### Stateful panel labels

`edgeL` and `edgeR` name the panels on their collapsed reopen handles. Their visible spans are intentionally hidden while the panels are open; do not remove the translations or replace accessible names with empty strings. `hideWalls` / `showWalls` and `hideTools` / `showTools` describe the next action for both header and edge controls. `syncPanelButtons(side)` refreshes those labels and tooltips when state or language changes.

Check both open and closed states after switching languages, including while a panel is already collapsed. In RTL, Walls and Tools swap physical edges, but their identity and action wording stay the same; translate meaning rather than embedding left/right instructions. Verify Persian arrows, visible panel names, and accessible labels together.

## Add a language

1. Copy `en.js` to a new file, for example `ar.js`. Change its assignment to `window.HWL_I18N.strings.ar = { ... }` and translate values. Keep keys/placeholders. Missing keys fall back to English (including plural forms).
2. Add metadata to `langs` in `languages.js`, for example:

   ```js
   ar: {
     name: "العربية", short: "عر", dir: "rtl", script: "arab",
     font: "Vazirmatn, sans-serif", digits: "٠١٢٣٤٥٦٧٨٩", decimal: "٫",
     switchLabel: "النسخة العربية"
   }
   ```

   Use `dir: "ltr"` for left-to-right languages. `script: "arab"` opts into the bundled Arabic-script typography; RTL does not require this script (for example, Hebrew needs its own font choices). `digits`, `decimal`, `font`, and animation `pace` are optional. Leave digits/decimal unset for ASCII numbers. Add any new fonts locally and precache them; don't use a CDN.
3. Add `<script src="i18n/ar.js"></script>` in `index.html` after `en.js` and before `js/app.js`.
4. Add `./i18n/ar.js` to `SHELL` and bump `VERSION` in `sw.js`.
5. Test `?lang=ar`, switching languages, narrow/wide layouts, keyboard navigation, and offline loading. The language button cycles through registry order automatically.

The initial language uses a supported URL code (`?lang=fa` or `#fa`), then the saved preference, browser languages, and finally English. Regional browser tags fall back to their base language when needed. Unsupported codes are ignored. The page's `lang`, `dir`, and `data-script` update together; RTL layout, arrows, and mixed Latin-text isolation follow direction, not the language code.

## Using messages in code

Use `S("failedN", { n: count })` for an immediate string. Use `K("wall.ufw.desc")` for content that must be resolved again after switching languages. Nested lazy values, such as `K("isoOk", { name: friend.name })`, follow the current language too. User-created names are plain strings and stay unchanged.

Keep the installed-app manifest's default English metadata separate: `manifest.webmanifest` is static and is not translated by these catalogs.
