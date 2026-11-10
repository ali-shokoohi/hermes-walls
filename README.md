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
| `UI-UX-RESEARCH.md` | Related-product research, primary sources, design decisions, and validation plan. |

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
- **Fonts, icons, screenshots, and manifest:** served from cache and refreshed in the background (stale-while-revalidate).
- Only same-origin `GET` requests are handled.

If you add a new asset, add it to the `SHELL` list in `sw.js` so it gets cached on install.

## Deep links and shortcuts

### Learning workflow

This is a **local model**, not a real deployment, command runner, messaging client, or security certification. The score counts only the fifteen modeled attacks.

The optional **cause-and-effect experiment** tests your current setup, lets you remove the wall that stopped an attack, and reruns that same attack. A second defense may still stop it. **Restore my setup** returns all wall settings to the snapshot taken at the start. Experiments do not survive reloads; ordinary wall settings still save locally. Free exploration stays available throughout. Collapse the experiment card to make more room for the map.

### Attack playback

Use the **Automatic** switch above the architecture map to choose how attacks play.
Automatic playback is on by default. Turn it off to keep each step visible until you
press **Next step** (or **Finish** on the last step). The current step and its explanation
appear above the map. You can switch modes during a run; your choice is saved on this device.

### Navigation

Wide screens keep the walls, map, and tools together. On phones/tablets, use **Map**, **Walls**, **Attacks**, and **Tools**. Tools contains Friends, Telegram, Self-test, Trace, and Log. Add friends from Tools → Friends. Desktop tabs support Left/Right (mirrored in RTL), Home, and End; Tab moves into the selected panel. A skip link goes directly to the map.

| Trigger | Action |
| --- | --- |
| `?lang=fa` / `#fa` | Opens in Persian (RTL); use `en` for English or any registered language code |
| `?action=add-friend` | Opens the add-friend dialog (also the installed app's shortcut) |
| `+` | Opens the add-friend dialog |
| `[` | Toggles the walls panel (wide screens) |
| `]` | Toggles the tools panel (wide screens) |
| `\` | Toggles both panels (wide screens) |

Keyboard shortcuts are ignored while you're typing in a field or editable content, or holding a modifier key (Ctrl, Alt, or Cmd). `+` is also ignored while the dialog is already open.

## Translations

Edit text in `i18n/en.js` or `i18n/fa.js`, not in the app logic. The language button cycles through registered languages. Direction, digit formatting, and script typography are language metadata, rather than hard-coded Farsi checks. Missing translations fall back to English.

See [i18n/README.md](i18n/README.md) to add a language, use placeholders/plurals, or configure RTL. Catalogs are ordinary local scripts, so translations also work from disk and offline.

## Optional browser regression checks

The deployed app still has no dependencies or build step. Development checks in `tools/check-ui.mjs` use Node 22+ (with built-in WebSocket) and a separately running Chromium; no npm packages are required. Use a disposable browser profile because the checks clear this app's saved data on the test origin.

```sh
# Separate terminals:
python3 -m http.server 8000
chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=9223 --user-data-dir=/tmp/opencode/walls-ui-check about:blank
node tools/check-ui.mjs
```

Use `LAB_URL` and `CDP_URL` to override the server/debugger addresses. Set `LAB_FILE` to an absolute `file:///…/index.html` URL to also check startup from disk. `UPDATE_SCREENSHOTS=1` explicitly refreshes the two manifest screenshots. Do not expose the browser debugging port to a network.

The checks cover experiment restoration, modeled attacks and playback, LTR/RTL tab keys, five viewport widths in both themes/languages, mobile tool access, form validation, friend provisioning, and offline reload. They do not replace screen-reader, real-device, zoom, or usability testing. See [UI-UX-RESEARCH.md](UI-UX-RESEARCH.md) for the rationale and remaining validation needs.
