# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Hermes Walls Lab: a self-contained, bilingual (English / فارسی) static PWA. There's no build step, no package manager, and no dependencies. See `README.md` for deploy and caching details.

## Tooling

- **Always prefix shell commands with `rtk`** (for example `rtk git status`, `rtk grep`, `rtk ls`, `rtk read`). It keeps output compact. Run `rtk --help` for the full list of subcommands.
- Serve locally with `python3 -m http.server 8000` and open `http://localhost:8000`. The service worker and install prompt need `localhost` or HTTPS.

## Layout

| Path | Notes |
| --- | --- |
| `index.html` | Markup and classic script/stylesheet references. |
| `css/app.css` | All app styles. |
| `css/fonts.css` | `@font-face` rules pointing at `fonts/`. |
| `js/app.js` | App logic. Locate symbols, then read narrow ranges. |
| `i18n/` | Language metadata (`languages.js`), text catalogs (`en.js`, `fa.js`), and translation guide. |
| `fonts/` | Self-hosted Inter, JetBrains Mono, and Vazirmatn files. |
| `sw.js` | Service worker. `VERSION` is the cache name; `SHELL` is the precache list. |
| `manifest.webmanifest` | Install metadata, shortcuts, screenshots. |
| `icons/`, `screenshots/` | Binary install assets referenced by the manifest and `sw.js`. |

### Code map

- `i18n/languages.js`: synchronously loaded in `<head>`, picks the language (URL, saved setting, browser preferences, English) and direction before first paint. Keep it before stylesheets; don't use `async` or `defer`.
- `js/app.js`: plain ES5-style JS in a single IIFE, loaded by a classic `<script>` at the end of `<body>`.
  - `el(tag, attrs, html)`: DOM helper. `$(id)`: `getElementById`.
  - `store.get/set`: persisted to `localStorage` under the key `hermes-walls-lab-v1`.
  - `K(key, params)` builds a lazy catalog reference; `T(x)` resolves it for `LANG`. `S(key, params)` resolves immediately. `STR` maps catalog keys to lazy references. `N(x)` formats digits/decimals using language metadata. `isRTL()` checks direction independently of language.
  - `toast(msg, act)`: notifications.

## Conventions

- Keep styles in `css/app.css` and logic in `js/app.js`. Don't add third-party scripts, stylesheets, fonts, or CDNs; the app must work fully offline and when opened from disk. Use classic scripts, not ES modules (modules break on `file://`).
- Match the existing style: `var`, `function` declarations, double quotes, no frameworks, no modules.
- **Every user-facing string needs both English and Persian.** Add matching keys to `i18n/en.js` and `i18n/fa.js`. Render with `S("key", params)` or use `K("key", params)` for lazy text. See `i18n/README.md` for placeholders and plurals; numeric parameters are formatted automatically.
- Support RTL. Use logical CSS properties and `isRTL()` for layout/arrow keys. Use `data-script` for script-specific fonts, not language-code checks.
- Keep it accessible: ARIA labels (localized), keyboard handlers for Enter/Space on interactive non-buttons, and `inert` on hidden panels.
- Global keyboard shortcuts must stay ignored while typing in inputs or holding modifier keys.

## Releasing changes

- **Bump `VERSION` in `sw.js` whenever a deployed file changes**, or users keep the old cached copy.
- Add any new asset to `SHELL` in `sw.js`, and reference install assets in `manifest.webmanifest`.
- Keep every path relative (`./…`) so the app works from a subpath.
- Update `README.md` when you change shortcuts, deep links, or caching behavior.

## Verifying

There are no automated tests. Check changes manually in a browser over `localhost`, in both languages, at narrow (phone) and wide widths, and once offline (DevTools → Network → Offline) after the service worker has installed.

## Git

Branch `main`. Use short, imperative commit messages.
