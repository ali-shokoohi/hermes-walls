// Optional development check: Node 22+, a local server, and Chromium's CDP port.
// No package installation. See README.md for invocation.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const origin = process.env.LAB_URL || "http://localhost:8000";
const pages = await (await fetch(process.env.CDP_URL || "http://localhost:9223/json")).json();
const page = pages.find(p => p.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
let id = 0;
const pending = new Map(), errors = [];
ws.addEventListener("message", e => {
  const msg = JSON.parse(e.data);
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text);
  if (msg.id) {
    const p = pending.get(msg.id); pending.delete(msg.id);
    if (msg.error) p.reject(msg.error); else p.resolve(msg.result);
  }
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
}
async function run(expression) {
  const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let i = 0; i < 200; i++) { if (await run(expression)) return; await pause(50); }
  throw new Error("Timed out: " + expression);
}
async function navigate(url) {
  await cdp("Page.navigate", { url });
  await until("!!window.__lab && !!document.querySelector('.atk')");
  await pause(300);
}
const click = selector => run(`document.querySelector(${JSON.stringify(selector)}).click()`);
const selectLanguage = lang => run(`(() => { const s=document.getElementById('langSelect'); s.value=${JSON.stringify(lang)}; s.dispatchEvent(new Event('change', { bubbles:true })); })()`);
const viewport = (width, height = 900, deviceScaleFactor = 1) => cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile: false });
async function key(key) { await cdp("Input.dispatchKeyEvent", { type: "keyDown", key }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key }); }
async function screenshot(path) { const shot = await cdp("Page.captureScreenshot", { format: "png" }); await writeFile(path, Buffer.from(shot.data, "base64")); }
try {
  await cdp("Runtime.enable"); await cdp("Page.enable"); await cdp("Network.enable");
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await viewport(1440);
  await navigate(origin + "/?lang=en");
  await run("localStorage.clear()");
  await navigate(origin + "/?lang=en");
  // Exercise the native selector rather than only the exposed setLang helper.
  assert.deepEqual(await run("Array.from(document.getElementById('langSelect').options, o => [o.value,o.textContent,o.lang,o.dir])"), await run("Object.entries(HWL_I18N.langs).map(([code,m]) => [code,m.name,code,m.dir])"));
  await click('.wall[data-wall="gvisor"] input');
  const beforeLanguage = await run("JSON.stringify({ walls:__lab.C, friends:__lab.friends() })");
  await run("document.getElementById('langSelect').focus()");
  await key("ArrowDown"); await key("Enter");
  await until("document.documentElement.lang === 'fa'");
  assert.equal(await run("document.activeElement.id"), "langSelect", "keyboard switch retains focus");
  assert.equal(await run("document.getElementById('langSelect').getAttribute('aria-label')"), "زبان");
  assert.equal(await run("JSON.stringify({ walls:__lab.C, friends:__lab.friends() })"), beforeLanguage, "language preserves walls and friends");
  assert.equal(await run("JSON.parse(localStorage.getItem('hermes-walls-lab-v1')).lang"), "fa");
  await navigate(origin + "/");
  assert.equal(await run("document.getElementById('langSelect').value"), "fa", "saved preference on bare URL");
  assert.equal(await run("document.documentElement.dir"), "rtl");
  await navigate(origin + "/?lang=en");
  assert.equal(await run("document.getElementById('langSelect').value"), "en", "URL overrides saved preference");
  // A synthetic third catalog verifies registry-driven growth without shipping a fake language.
  const registeredCodes = await run("Object.keys(HWL_I18N.langs)");
  const testCode = await run("Array.from({length:26}, (_,i) => 'qa'+String.fromCharCode(97+i)).find(code => !Object.hasOwn(HWL_I18N.langs,code))");
  assert.ok(testCode, "unused private-use language code for fixture");
  await run(`HWL_I18N.langs[${JSON.stringify(testCode)}]={name:'Deutsch',dir:'ltr'}; HWL_I18N.strings[${JSON.stringify(testCode)}]={...HWL_I18N.strings.en,languageLabel:'Sprache'}; __lab.setLang('en')`);
  assert.deepEqual(await run("Array.from(document.getElementById('langSelect').options, o => o.value)"), [...registeredCodes, testCode]);
  await selectLanguage(testCode);
  assert.equal(await run("document.documentElement.lang"), testCode);
  assert.equal(await run("document.getElementById('langSelect').getAttribute('aria-label')"), "Sprache");
  await selectLanguage("fa");
  await run("document.getElementById('langSelect').focus()");
  await key("ArrowUp"); await key("Enter");
  assert.equal(await run("document.documentElement.lang"), "en", "RTL keyboard return selection");
  assert.equal(await run("document.activeElement.id"), "langSelect");
  await run(`delete HWL_I18N.langs[${JSON.stringify(testCode)}]; delete HWL_I18N.strings[${JSON.stringify(testCode)}]; __lab.setLang('en')`);
  await click('.wall[data-wall="gvisor"] input');
  console.log("PASS native language keyboard/change selection, focus, state, preference/URL precedence, third-language registry growth");
  // Edge handles stay reachable for both collapse and reopen, in either direction.
  for (const lang of ["en", "fa"]) {
    await run(`__lab.setLang(${JSON.stringify(lang)})`);
    for (const side of ["L", "R"]) {
      const handle = "edge" + side, pane = side === "L" ? "vWalls" : "vSide";
      for (let step = 0; step < 3; step++) {
        const expanded = step !== 1;
        assert.equal(await run(`document.getElementById('${handle}').getAttribute('aria-expanded')`), String(expanded));
        assert.equal(await run(`getComputedStyle(document.querySelector('#${handle} span')).display === 'none'`), expanded, "panel name only shown for reopen");
        assert.equal(await run(`document.getElementById('${pane}').hasAttribute('inert')`), !expanded);
        const point = await run(`(() => { const b=document.getElementById('${handle}'), r=b.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2, width:r.width, hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)) }; })()`);
        assert.ok(point.width >= 44 && point.hit, `edge handle is visible and pointer-reachable: ${lang}/${handle}/${step} ${JSON.stringify(point)}`);
        const action = lang === "en" ? (expanded ? "Hide" : "Show") : (expanded ? "پنهان" : "نمایش");
        assert.ok(await run(`document.getElementById('${handle}').getAttribute('aria-label').includes(${JSON.stringify(action)})`), "localized next action");
        if (step === 2) break;
        await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
        await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
        await pause(100);
      }
    }
  }
  await run("__lab.setLang('en')");
  console.log("PASS bilingual edge handles collapse/reopen with pointer hit testing and panel state");
  const original = await run("JSON.stringify(__lab.C)");
  await click("#learnRun");
  await until("document.querySelector('#result.blocked, #result.contained') !== null");
  assert.equal(await run("JSON.stringify(__lab.C)"), original, "baseline preserves settings");
  assert.equal(await run("document.getElementById('learnPredict').hidden"), false, "prediction is requested");
  assert.equal(await run("document.getElementById('learnRun').hidden"), true, "no rerun before a prediction");
  await click("#predThrough");
  assert.notEqual(await run("JSON.stringify(__lab.C)"), original, "comparison removes a wall");
  assert.match(await run("document.getElementById('learnText').textContent"), /prediction|predicted/, "prediction feedback");
  await selectLanguage("fa"); await selectLanguage("en");
  await click("#learnRestore");
  assert.equal(await run("JSON.stringify(__lab.C)"), original, "restore returns exact configuration");
  assert.equal(await run("document.getElementById('learnRestore').hidden"), true);
  await run("__lab.applyPreset('bare'); __lab.changed()");
  await click("#learnRun");
  assert.match(await run("document.getElementById('learnText').textContent"), /already gets through/);
  await click("#learnRestore");
  await run("__lab.applyPreset('hardened'); __lab.changed()");
  // Undo restores a single wall change; reset turns every wall back on.
  await click('.wall[data-wall="gvisor"] input');
  assert.equal(await run("__lab.C.gvisor"), false);
  assert.match(await run("document.getElementById('mapTextList').textContent"), /Off:/, "map text reflects disabled defenses");
  assert.equal(await run("document.querySelector('#toast.on button') !== null"), true, "undo offered");
  await click("#toast button");
  assert.equal(await run("JSON.stringify(__lab.C)"), original, "undo restores configuration");
  await run("__lab.applyPreset('bare'); __lab.changed()");
  await click("#wallsReset");
  assert.equal(await run("JSON.stringify(__lab.C)"), original, "reset turns all walls on");
  assert.equal(await run("document.getElementById('wallsReset').disabled"), true, "reset disabled when all walls are on");
  await click("#toast button");
  assert.ok(await run("Object.values(__lab.C).every(v => !v)"), "reset can be undone");
  await run("__lab.applyPreset('hardened'); __lab.changed()");
  // Outcome filter with empty state.
  await click('#atkFilter [data-filter="breached"]');
  assert.equal(await run("document.getElementById('atkEmpty').hidden"), false, "empty filter explains itself");
  await click("#atkShowAll");
  assert.equal(await run("document.querySelectorAll('#atkList .atk:not([hidden])').length"), 15);
  assert.ok(await run("document.getElementById('mapTextList').children.length >= 3"), "map text alternative");
  assert.equal(await run("document.querySelector('svg.map').getAttribute('aria-describedby')"), "mapTextHint");
  assert.equal(await run("document.querySelector('.wall input').getAttribute('role')"), "switch");
  assert.ok(await run("document.getElementById(document.querySelector('.wall input').getAttribute('aria-describedby')) !== null"), "switch description exists");
  const outcomes = await run("__lab.ATTACKS.map(a => __lab.simulate(a.id).outcome)");
  assert.equal(outcomes.length, 15); assert.ok(outcomes.every(o => o === "blocked" || o === "contained"));
  await run("document.querySelector('.tab[data-tab=attacks]').focus()");
  await key("End");
  assert.equal(await run("document.activeElement.dataset.tab"), "log");
  assert.equal(await run("document.querySelectorAll('.tab[tabindex=\"0\"]').length"), 1);
  await key("Home"); await key("ArrowRight");
  assert.equal(await run("document.activeElement.dataset.tab"), "friends");
  assert.equal(await run("document.getElementById('tp-friends').hasAttribute('inert')"), false);
  await run("__lab.setLang('fa'); document.querySelector('.tab[data-tab=attacks]').focus()");
  await key("ArrowLeft");
  assert.equal(await run("document.activeElement.dataset.tab"), "friends", "RTL arrow order");
  console.log("PASS experiment predict/compare/restore, no-wall path, undo, reset, filters, map text, 15 hardened outcomes, LTR/RTL tabs");

  for (const lang of ["en", "fa"]) {
    await run(`__lab.setLang(${JSON.stringify(lang)})`);
    for (const width of [320, 390, 768, 1280, 1440]) {
      await viewport(width, 900); await pause(250);
      if (width > 1080) await click('.tab[data-tab="attacks"]');
      for (const theme of ["light", "dark"]) {
        await run(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
        const metrics = await run(`(() => {
          const top = document.querySelector('.top');
          return { page: document.documentElement.scrollWidth, viewport: innerWidth, header: top.scrollWidth, headerWidth: top.clientWidth,
            tabs: Array.from(document.querySelectorAll('.tab')).every(t => document.getElementById(t.getAttribute('aria-controls'))),
            primary: Array.from(document.querySelectorAll('#mtabs button')).every(b => b.getBoundingClientRect().height >= 44),
            panes: ['vWalls','tp-attacks'].every(id => { const p = document.getElementById(id); return !p.clientWidth || p.scrollWidth <= p.clientWidth + 1; }),
            language: (() => { const s=document.getElementById('langSelect'), r=s.getBoundingClientRect(); return r.height>=44 && r.width>=44 && r.left>=0 && r.right<=innerWidth && document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===s && s.value===document.documentElement.lang; })() };
        })()`);
        assert.ok(metrics.page <= width + 1, `${lang}/${width}/${theme} document overflow: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.header <= metrics.headerWidth + 1, `${lang}/${width}/${theme} header overflow: ${JSON.stringify(metrics)}`);
        assert.equal(metrics.tabs, true);
        assert.equal(metrics.language, true, `${lang}/${width}/${theme} language target/value`);
        assert.equal(metrics.panes, true, `${lang}/${width}/${theme} pane overflow`);
        if (width <= 1080) {
          assert.equal(metrics.primary, true);
          await click('#mtabs [data-view="tools"]');
          for (const tool of ["friends", "chat", "test", "trace", "log"]) {
            await click(`[data-tool="${tool}"]`);
            assert.equal(await run(`document.getElementById('tp-${tool}').classList.contains('on')`), true);
            assert.equal(await run("document.getElementById('vMap').hasAttribute('inert')"), true);
          }
          await click('#mtabs [data-view="walls"]');
          assert.equal(await run("document.getElementById('vSide').hasAttribute('inert')"), true);
          await click('#mtabs [data-view="map"]');
          assert.equal(await run("document.getElementById('vMap').hasAttribute('inert')"), false);
        }
      }
    }
  }
  console.log("PASS 20 language/viewport/theme combinations; all mobile tools, targets, and hidden panels");

  await viewport(1440); await run("__lab.setLang('en'); document.documentElement.dataset.theme='light'");
  await click('.tab[data-tab="attacks"]');
  if (await run("document.getElementById('attackAuto').checked")) await click("#attackAuto");
  await click(".atk"); await until("!document.getElementById('attackNext').disabled");
  const first = await run("document.getElementById('attackProgress').textContent");
  await pause(1000); assert.equal(await run("document.getElementById('attackProgress').textContent"), first);
  await click("#attackNext"); await until("document.getElementById('attackProgress').textContent.includes('Step 2')");
  await click("#attackStop"); assert.equal(await run("document.getElementById('result').className"), "result");
  // Complete every modeled attack through the actual playback UI.
  await click("#attackAuto");
  const attackIds = await run("__lab.ATTACKS.map(a => a.id)");
  for (const attack of attackIds) {
    await click(`.atk[data-atk="${attack}"]`);
    await until("document.getElementById('result').classList.contains('on') && !document.getElementById('result').classList.contains('running')");
    assert.ok(await run("document.getElementById('trace').children.length > 0"));
  }
  await click("#attackAuto");
  console.log("PASS all 15 attack playbacks and traces");
  for (const preset of ["bare", "netonly", "nosandbox", "keysinbox", "sharedbridge", "hardened"]) {
    await run(`document.getElementById('preset').value=${JSON.stringify(preset)}; document.getElementById('preset').dispatchEvent(new Event('change'))`);
    assert.ok(await run("__lab.ATTACKS.every(a => ['blocked','contained','breached'].includes(__lab.simulate(a.id).outcome))"));
  }
  await click('.tab[data-tab="chat"]');
  for (const who of ["reza", "thief", "stranger"]) {
    await click(`[data-who="${who}"]`);
    await run("document.getElementById('chatIn').value='hello'; document.getElementById('compose').requestSubmit()");
    assert.ok(await run("document.getElementById('msgs').children.length > 0 && document.getElementById('chatIn').getAttribute('aria-label').length > 0"));
  }
  await click('.tab[data-tab="test"]'); await click("#runTest");
  await until("document.getElementById('term').textContent.includes('ALL TESTS PASSED')");
  await run("document.querySelector('.node').focus()"); await key("Enter");
  assert.equal(await run("document.activeElement.id"), "inspX");
  await key("Escape");
  assert.equal(await run("document.activeElement.classList.contains('node')"), true);
  await viewport(320, 700); await run("__lab.setLang('fa')");
  await click('#mtabs [data-view="attacks"]');
  await click(".atk"); await until("!document.getElementById('attackNext').disabled");
  assert.ok(await run("(() => { const r=document.getElementById('attackNext').getBoundingClientRect(); return r.top >= 112 && r.bottom <= innerHeight-64; })()"), "phone playback controls in view");
  await click("#attackStop");
  await viewport(1440); await run("__lab.setLang('en')");
  console.log("PASS six scenarios, three chat identities, self-test, inspector keyboard/focus, phone playback visibility");
  await click("#addBtn"); await click("#dGo");
  assert.equal(await run("document.getElementById('inName').getAttribute('aria-invalid')"), "true");
  assert.equal(await run("document.getElementById('inName').getAttribute('aria-describedby')"), "fName-help");
  await run("document.getElementById('inName').value='Mina'; document.getElementById('inName').dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('inHandle').value='mina'; document.getElementById('inHandle').dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('inTg').value='987654321'; document.getElementById('inTg').dispatchEvent(new Event('input',{bubbles:true})); __lab.skip()");
  const count = await run("__lab.friends().length");
  await click("#dGo"); await until(`__lab.friends().length === ${count + 1}`);
  await until("!document.getElementById('addDlg').open");
  console.log("PASS manual playback pause/next/stop, accessible validation, friend provisioning");

  await until("!!navigator.serviceWorker.controller");
  await run("navigator.serviceWorker.ready");
  await cdp("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await navigate(origin + "/?lang=fa");
  assert.equal(await run("document.documentElement.dir"), "rtl");
  await selectLanguage("en");
  assert.equal(await run("document.documentElement.dir"), "ltr", "offline language switch");
  await selectLanguage("fa");
  await click(".atk"); await until("!document.getElementById('attackNext').disabled"); await click("#attackStop");
  await cdp("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  console.log("PASS offline cached navigation and manual playback");

  // Refresh install screenshots only when explicitly requested.
  if (process.env.UPDATE_SCREENSHOTS === "1") {
    await navigate(origin + "/?lang=en");
    await run("localStorage.clear()"); await navigate(origin + "/?lang=en");
    await viewport(1440); await run("document.getElementById('toast').classList.remove('on')"); await pause(500); await screenshot("screenshots/wide.png");
    await viewport(390, 844, 2); await run("__lab.openAdd()"); await pause(400);
    await screenshot("screenshots/narrow.png");
  }
  if (process.env.LAB_FILE) {
    await navigate(process.env.LAB_FILE);
    assert.equal(await run("__lab.ATTACKS.length"), 15);
    await selectLanguage("fa");
    assert.equal(await run("document.documentElement.dir"), "rtl");
    await selectLanguage("en");
    assert.equal(await run("document.documentElement.dir"), "ltr");
    console.log("PASS direct file startup");
  }
  assert.deepEqual(errors, [], "browser runtime exceptions");
  console.log("All UI checks passed.");
} finally { ws.close(); }
