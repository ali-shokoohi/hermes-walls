// Development only: Node 22+ and a disposable Chromium with loopback CDP.
// Run: rtk proxy node tools/render-social-preview.mjs
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const endpoint = process.env.CDP_URL || "http://localhost:9223";
const target = await (await fetch(endpoint + "/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data), request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
try {
  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 640, deviceScaleFactor: 1, mobile: false });
  const loaded = new Promise(resolve => {
    function listener(event) {
      if (JSON.parse(event.data).method === "Page.loadEventFired") {
        ws.removeEventListener("message", listener);
        resolve();
      }
    }
    ws.addEventListener("message", listener);
  });
  await cdp("Page.navigate", { url: new URL("tools/social-preview.html", root).href });
  await loaded;
  const result = await cdp("Runtime.evaluate", {
    expression: `(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, img => img.decode()));
      return { fonts: document.fonts.check('700 64px Inter'),
        overflow: Array.from(document.querySelectorAll('main, main *')).filter(el => {
          const r = el.getBoundingClientRect();
          return r.left < 0 || r.top < 0 || r.right > 1280 || r.bottom > 640;
        }).map(el => el.outerHTML.slice(0, 120)) };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  assert.ok(result.result.value.fonts, "Local fonts must load");
  assert.deepEqual(result.result.value.overflow, [], "Artwork must fit the preview");
  const shot = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const image = Buffer.from(shot.data, "base64");
  assert.ok(image.length < 1000000, "GitHub social preview must be smaller than 1 MB");
  assert.equal(image.readUInt32BE(16), 1280);
  assert.equal(image.readUInt32BE(20), 640);
  await writeFile(new URL("screenshots/social-preview.png", root), image);
  console.log(`PASS screenshots/social-preview.png: 1280×640, ${image.length} bytes`);
} finally {
  ws.close();
  await fetch(endpoint + "/json/close/" + target.id);
}
