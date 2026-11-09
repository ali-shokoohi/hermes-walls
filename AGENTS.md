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
| `index.html` | The entire app (~600 KB). Never read it whole; grep for line numbers, then read narrow ranges. |
| `sw.js` | Service worker. `VERSION` is the cache name; `SHELL` is the precache list. |
| `manifest.webmanifest` | Install metadata, shortcuts, screenshots. |
| `icons/`, `screenshots/` | Binary install assets referenced by the manifest and `sw.js`. |

### Inside `index.html`

- **Lines ~18–31:** an early inline script that picks the language (saved setting first, then `navigator.language`) before first paint.
- **Lines ~32–834:** `<style>`. The first lines embed the Inter fonts as base64 `data:` URLs, so those lines are very long. Cut grep output short (`| cut -c1-200`).
- **Lines ~1008–2925:** the main `<script>`, plain ES5-style JS in a single IIFE.
  - `el(tag, attrs, html)`: DOM helper. `$(id)`: `getElementById`.
  - `store.get/set`: persisted to `localStorage` under the key `hermes-walls-lab-v1`.
  - `P(en, fa)` builds a bilingual string (either may be a function of `n`). `T(x)` resolves it for the current `LANG`. `S(key)` looks it up in `STR`. `N(x)` converts digits to Persian when `LANG === "fa"`.
  - `toast(msg, act)`: notifications.

## Conventions

- Keep everything in `index.html`. Don't add external scripts, stylesheets, fonts, or CDNs; the app must work fully offline and when opened from disk.
- Match the existing style: `var`, `function` declarations, double quotes, no frameworks, no modules.
- **Every user-facing string needs both English and Persian.** Add it to `STR` via `P("…", "…")` and render it with `S("key")`. Format numbers with `N()`.
- Support RTL. Use logical CSS properties, and flip horizontal arrow-key handling when `LANG === "fa"`.
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
