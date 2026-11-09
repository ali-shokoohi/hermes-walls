# Hermes Walls Lab: PWA build

An interactive, bilingual (English / فارسی) lab for the six-layer Hermes-on-Telegram hardening design. Add friends, flip walls, launch attacks, and watch what gets through.

This folder is a plain static site. No build step, no dependencies, and no external requests.

## Contents

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup and local script/stylesheet references. |
| `css/app.css` | All app styles. |
| `css/fonts.css` | `@font-face` rules for Inter, JetBrains Mono, and Vazirmatn. |
| `js/app.js` | All app logic. |
| `i18n/` | Language registry, English/Persian text catalogs, and [translation guide](i18n/README.md). |
| `fonts/` | Self-hosted font files (WOFF / WOFF2). |
| `manifest.webmanifest` | Install metadata, the "Add a friend" shortcut, and store screenshots. |
| `sw.js` | Service worker that handles offline caching. |
| `icons/` | App, maskable, Apple touch, and shortcut icons. |
| `screenshots/` | `wide.png` (1440×900) and `narrow.png` (780×1688) for the install dialog. |

## Deploy

1. Bump `VERSION` in `sw.js` (for example `walls-lab-v2` to `walls-lab-v3`).
2. Upload the whole folder as-is to any static HTTPS host (for example `walls.shokoohi.dev`).

Bumping `VERSION` matters: it names the cache, so old caches get cleared on activation. Open tabs show a "Reload" toast when a new version is waiting.

All paths are relative, so the app also works from a subpath (for example `example.com/walls/`).

## Run locally

Opening `index.html` straight from disk works, but install and offline need HTTPS or `localhost`:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Caching

- **Pages, CSS, and JS:** network first with a 4 s timeout, then the cached copy. Updates show up quickly, and the app still opens offline.
- **Fonts, icons, and manifest:** served from cache and refreshed in the background (stale-while-revalidate).
- Only same-origin `GET` requests are handled.

If you add a new asset, add it to the `SHELL` list in `sw.js` so it gets cached on install.

## Deep links and shortcuts

| Trigger | Action |
| --- | --- |
| `?lang=fa` / `#fa` | Opens in Persian (RTL); use `en` for English or any registered language code |
| `?action=add-friend` | Opens the add-friend dialog (also the installed app's shortcut) |
| `+` | Opens the add-friend dialog |
| `[` | Toggles the walls panel (wide screens) |
| `]` | Toggles the tools panel (wide screens) |
| `\` | Toggles both panels (wide screens) |

Keyboard shortcuts are ignored while you're typing in a field or holding a modifier key (Ctrl, Alt, or Cmd). `+` is also ignored while the dialog is already open.

## Translations

Edit text in `i18n/en.js` or `i18n/fa.js`, not in the app logic. The language button cycles through registered languages. Direction, digit formatting, and script typography are language metadata, rather than hard-coded Farsi checks. Missing translations fall back to English.

See [i18n/README.md](i18n/README.md) to add a language, use placeholders/plurals, or configure RTL. Catalogs are ordinary local scripts, so translations also work from disk and offline.
