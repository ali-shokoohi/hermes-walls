# Contributing to Hermes Walls Lab

Contributions to wording, translations, accessibility, documentation, and the simulation are welcome. The app is a plain static site: **no build, package manager, runtime dependencies, or external requests**.

## Choose a starting point

- **Fix or add a translation:** use the [translation guide](i18n/README.md). English (`en`) is the source catalog; Persian (`fa`) is the current translation. New languages need a catalog, registry entry, script reference, and precache entry—not selector-specific code.
- **Improve documentation:** edit Markdown directly. Documentation-only changes do not need a cache bump or browser screenshots.
- **Fix a UI or behavior bug:** include the current/expected behavior, reproduction steps, language, viewport, browser, and whether it occurs offline. Read [AGENTS.md](AGENTS.md) for the code map and interaction constraints.
- **Change the model:** explain which attack, wall, or scenario changes and why. Outcomes describe a bounded simulation, not a real security guarantee. Discuss substantial workflow/model changes in an issue before implementing them.

## Local setup

Fork/clone the repository and work on a small focused branch. Opening `index.html` from disk works; use localhost for service-worker/offline testing:

```sh
rtk proxy python3 -m http.server 8000
```

Open `http://localhost:8000`. No installation step is needed for the app. Repository commands use the `rtk` wrapper; `rtk proxy` passes commands through unchanged. If `rtk` is unavailable on your machine, run the command after `rtk proxy` directly (for example, `python3 -m http.server 8000`).

## Development conventions

- Keep classic scripts and local relative paths. No ES modules or fetched catalogs in runtime code: they break direct-disk startup. Development tools under `tools/` may use Node modules.
- Match `js/app.js`: `var`, function declarations, double quotes, no framework. Keep styles in `css/app.css`.
- Put every new user-facing string, including ARIA labels, in both current catalogs. Use `S("key", params)` for immediate text or `K("key", params)` for text resolved after a language change. Do not concatenate translated sentence fragments.
- Use language metadata for direction, script, and digits rather than language-code branches. Use logical CSS properties and preserve keyboard/focus and hidden-panel inert behavior. Prefer native controls over custom interaction patterns.
- Do not add tracking, remote fonts, or CDN assets. Add new runtime files to `sw.js` `SHELL`, and bump `VERSION` whenever deployed files change. Don't cache development docs or tools.
- Keep README and the relevant research/verification record aligned with changed behavior. Don't claim unexecuted checks or complete accessibility conformance.

## Checks

Node 22+ is optional development tooling, not an app dependency:

```sh
rtk proxy node tools/check-i18n.mjs
rtk proxy node --test tools/check-i18n.test.mjs
rtk git diff --check
```

The translation check reports missing/unknown keys, placeholder mismatches, malformed plurals, required metadata, script order, and missing registry/catalog cache entries. It does not judge translation quality or HTML safety. Partial translations can explicitly use `--allow-missing`; include its fallback warnings in the PR.

For UI/runtime changes, follow the [browser regression instructions](README.md#optional-browser-regression-checks). They require separately running Chromium and a local server, no npm packages, and a **disposable browser profile** because the harness clears saved app data on its origin. Keep remote debugging loopback-only. `LAB_FILE` adds disk startup coverage; `UPDATE_SCREENSHOTS=1` intentionally updates the manifest screenshots.

Also review English/LTR and Persian/RTL, light/dark, 320px through desktop widths, visible keyboard focus and operation, offline reload/switching, and direct disk startup. Add representative new-language checks when translating. Report any unavailable checks; screen-reader, real-device, and cross-browser review remain valuable.

## Pull-request checklist

- [ ] Keep the change scoped and explain what users/contributors gain.
- [ ] Include reproduction steps or a concrete example; for UI changes include relevant LTR/RTL and narrow/wide screenshots.
- [ ] Include commands run, observed results, and checks not performed. Update/add regression checks when practical.
- [ ] Update both current catalogs for new strings and validate keys/placeholders.
- [ ] Bump `sw.js` `VERSION` for runtime changes and precache new assets. Update docs and intentionally refresh install screenshots when the visible UI changes.
- [ ] Leave unrelated work untouched and exclude temporary browser profiles, logs, and dependencies.

Use short, imperative commit messages. Never include real tokens, chat credentials, or personal data in examples or bug reports.
