(function () {
"use strict";
var D = document, R = D.documentElement;
var SVGNS = "http://www.w3.org/2000/svg";
function $(id) { return D.getElementById(id); }
function el(tag, attrs, html) { var e = D.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
function sv(tag, attrs) { var e = D.createElementNS(SVGNS, tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
var motionQuery = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
var reduced = !!(motionQuery && motionQuery.matches);
if (motionQuery) {
  var onMotionChange = function (e) { reduced = e.matches; };
  if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
}

/* ------------------------------------------------------------------ storage */
var KEY = "hermes-walls-lab-v1";
var store = (function () {
  var data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { data = {}; }
  return {
    get: function (k, d) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : d; },
    set: function (k, v) { data[k] = v; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode */ } }
  };
})();

/* ------------------------------------------------------------------ i18n */
/* Catalog references stay lazy so existing results follow language changes. */
var I18N = window.HWL_I18N, LANG = R.lang;
function LM(lang) { return I18N.langs[lang || LANG]; }
function isRTL() { return LM().dir === "rtl"; }
function Msg(key, params) { this.key = key; this.params = params || {}; }
function K(key, params) { return new Msg(key, params); }
function N(x, lang) {
  var meta = LM(lang), s = String(x);
  if (meta.digits) s = s.replace(/[0-9]/g, function (d) { return meta.digits[+d]; });
  return meta.decimal ? s.replace(/\./g, meta.decimal) : s;
}
function TL(x, lang) {
  if (typeof x === "function") return TL(x(), lang);
  if (!(x instanceof Msg)) return x;
  var dict = I18N.strings[lang] || {}, fallback = I18N.strings.en;
  var value = dict[x.key], params = x.params, category = "other";
  if (value == null) value = fallback[x.key];
  if (value == null) return x.key;
  if (typeof value === "object") {
    var n = Number(params.n);
    try { category = new Intl.PluralRules(lang).select(n); }
    catch (e) { category = n === 1 ? "one" : "other"; }
    value = value[category] != null ? value[category] : value.other;
  }
  return String(value).replace(/\{(\w+)\}/g, function (match, key) {
    if (!Object.prototype.hasOwnProperty.call(params, key)) return match;
    var v = TL(params[key], lang);
    return typeof v === "number" ? N(v, lang) : String(v);
  });
}
function T(x) { return TL(x, LANG); }
function S(key, params) { return T(K(key, params)); }
function REF(r) { return S("ref", { n: N(r) }); }
var STR = {};
Object.keys(I18N.strings.en).forEach(function (key) { STR[key] = K(key); });
var RUN = /[A-Za-z0-9_~\/\\$@#%^&*()\[\]{}<>|=+\-:;'"`!?.,]+(?:[ \t]+[A-Za-z0-9_~\/\\$@#%^&*()\[\]{}<>|=+\-:;'"`!?.,]+)*/g;
/* Escape HTML; isolate Latin runs in all RTL languages. */
function H(x) {
  var s = String(T(x));
  if (!isRTL()) return esc(s);
  var out = "", last = 0, m;
  RUN.lastIndex = 0;
  while ((m = RUN.exec(s))) {
    var run = m[0], off = m.index;
    if (!/[A-Za-z0-9]/.test(run)) continue;
    var lead = "", trail = "";
    while (run.length && /[)\]]/.test(run[0]) && run.indexOf("(") < 0) { lead += run[0]; run = run.slice(1); }
    while (run.length && /[.,;:!?(\[]/.test(run[run.length - 1])) { trail = run[run.length - 1] + trail; run = run.slice(0, -1); }
    out += esc(s.slice(last, off)) + esc(lead) + '<bdi dir="ltr">' + esc(run) + "</bdi>" + esc(trail);
    last = off + m[0].length;
  }
  return out + esc(s.slice(last));
}

/* ------------------------------------------------------------------ walls */
var LAYERS = {
  1: K("layer.1"), 2: K("layer.2"), 3: K("layer.3"),
  4: K("layer.4"), 5: K("layer.5"), 6: K("layer.6")
};
var WALLS = [
  { id: "ufw", L: 1, ref: "1.3", n: K("wall.ufw.name"), d: K("wall.ufw.desc") },
  { id: "sshkey", L: 1, ref: "1.2", n: K("wall.sshkey.name"), d: K("wall.sshkey.desc") },
  { id: "unpriv", L: 2, ref: "2.3", n: K("wall.unpriv.name"), d: K("wall.unpriv.desc") },
  { id: "limits", L: 2, ref: "2.3", n: K("wall.limits.name"), d: K("wall.limits.desc") },
  { id: "bridge", L: 3, ref: "3.1", n: K("wall.bridge.name"), d: K("wall.bridge.desc") },
  { id: "acl", L: 3, ref: "3.4", n: K("wall.acl.name"), d: K("wall.acl.desc") },
  { id: "nonat", L: 3, ref: "3.3", n: K("wall.nonat.name"), d: K("wall.nonat.desc") },
  { id: "nodns", L: 3, ref: "3.3", n: K("wall.nodns.name"), d: K("wall.nodns.desc") },
  { id: "proxyTokens", L: 4, ref: "4.5", n: K("wall.proxyTokens.name"), d: K("wall.proxyTokens.desc") },
  { id: "allowlist", L: 4, ref: "4.7", n: K("wall.allowlist.name"), d: K("wall.allowlist.desc") },
  { id: "require", L: 4, ref: "4.7", n: K("wall.require.name"), d: K("wall.require.desc") },
  { id: "denycidr", L: 4, ref: "4.7", n: K("wall.denycidr.name"), d: K("wall.denycidr.desc") },
  { id: "nameconst", L: 4, ref: "4.4", n: K("wall.nameconst.name"), d: K("wall.nameconst.desc") },
  { id: "allowUsers", L: 5, ref: "5.2", n: K("wall.allowUsers.name"), d: K("wall.allowUsers.desc") },
  { id: "minTools", L: 5, ref: "5.4", n: K("wall.minTools.name"), d: K("wall.minTools.desc") },
  { id: "roConfig", L: 5, ref: "5.6.1", n: K("wall.roConfig.name"), d: K("wall.roConfig.desc") },
  { id: "nosetuid", L: 5, ref: "5.7", n: K("wall.nosetuid.name"), d: K("wall.nosetuid.desc") },
  { id: "sandbox", L: 6, ref: "6.8", n: K("wall.sandbox.name"), d: K("wall.sandbox.desc") },
  { id: "gvisor", L: 6, ref: "6.4", n: K("wall.gvisor.name"), d: K("wall.gvisor.desc") },
  { id: "sandboxAcl", L: 6, ref: "6.7", n: K("wall.sandboxAcl.name"), d: K("wall.sandboxAcl.desc") }
];
var WBY = {}; WALLS.forEach(function (w) { WBY[w.id] = w; });
function wname(id) { var w = WBY[id]; return w ? S("layerWord") + " " + N(w.L) + " · " + T(w.n) : id; }

var PRESETS = {
  hardened: function () { return {}; },
  bare: function () { var o = {}; WALLS.forEach(function (w) { o[w.id] = false; }); return o; },
  netonly: function () { var o = {}; WALLS.forEach(function (w) { if (w.L > 3) o[w.id] = false; }); return o; },
  nosandbox: function () { return { sandbox: false, gvisor: false, sandboxAcl: false }; },
  keysinbox: function () { return { proxyTokens: false, require: false }; },
  sharedbridge: function () { return { bridge: false }; }
};
var C = {};
function applyPreset(name) { var off = PRESETS[name] ? PRESETS[name]() : {}; WALLS.forEach(function (w) { C[w.id] = off[w.id] === false ? false : true; }); }
(function () {
  var saved = store.get("cfg", null);
  applyPreset("hardened");
  if (saved && typeof saved === "object") WALLS.forEach(function (w) { if (typeof saved[w.id] === "boolean") C[w.id] = saved[w.id]; });
})();
function matchPreset() {
  for (var p in PRESETS) {
    var off = PRESETS[p](), same = true;
    WALLS.forEach(function (w) { if ((off[w.id] === false ? false : true) !== C[w.id]) same = false; });
    if (same) return p;
  }
  return "custom";
}

/* ------------------------------------------------------------------ friends + dynamic topology */
var CORE_FRIENDS = [
  { id: "reza", name: K("friend.reza"), n: 1, tg: "111111111", c: "#0d9488", core: true },
  { id: "sina", name: K("friend.sina"), n: 2, tg: "222222222", c: "#2f6fed", core: true }
];
var MAXF = 6;
var COLORS = ["#0d9488", "#2f6fed", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2"];
var RESERVED = ["host", "hostz", "infra", "tg", "llm", "evil", "thief", "stranger", "proxy", "hermes", "sandbox", "root", "admin", "agent", "acl", "br", "friend", "all", "deny"];
var FRIENDS = [], FBY = {};
function fport(f) { return 8080 + f.n; }
function fip(f, last) { return "10.91." + f.n + "." + last; }
function validHandle(h) { return /^[a-z][a-z0-9-]{1,14}$/.test(h) && !/-$/.test(h) && RESERVED.indexOf(h) < 0; }
function loadFriends() {
  FRIENDS = CORE_FRIENDS.slice();
  var used = {}, extra = store.get("friends", []);
  FRIENDS.forEach(function (f) { used[f.id] = used["n" + f.n] = used["t" + f.tg] = 1; });
  if (Array.isArray(extra)) extra.forEach(function (x) {
    if (FRIENDS.length >= MAXF || !x || typeof x.name !== "string" || !validHandle(x.id) || used[x.id]) return;
    if (!(x.n >= 1 && x.n <= 9) || used["n" + x.n] || !/^\d{5,12}$/.test(x.tg) || used["t" + x.tg]) return;
    var nm = x.name.trim().slice(0, 24); if (!nm) return;
    FRIENDS.push({ id: x.id, name: nm, n: x.n, tg: x.tg, c: /^#[0-9a-f]{6}$/i.test(x.c) ? x.c : COLORS[2], t: x.t || 0 });
    used[x.id] = used["n" + x.n] = used["t" + x.tg] = 1;
  });
}
function saveFriends() {
  store.set("friends", FRIENDS.filter(function (f) { return !f.core; }).map(function (f) { return { id: f.id, name: f.name, n: f.n, tg: f.tg, c: f.c, t: f.t }; }));
}

var NODES = {}, ZONES = {}, EDGES = [];
var HOST_WALLS = ["ufw", "sshkey"], PROXY_WALLS = ["allowlist", "require", "denycidr", "nameconst"],
    HERMES_WALLS = ["proxyTokens", "allowUsers", "minTools", "roConfig", "nosetuid", "unpriv", "limits"],
    SANDBOX_WALLS = ["sandbox", "gvisor", "sandboxAcl", "unpriv", "limits"], BRIDGE_WALLS = ["bridge", "acl", "nonat", "nodns"];
function rebuildTopology() {
  [NODES, ZONES].forEach(function (o) { Object.keys(o).forEach(function (k) { delete o[k]; }); });
  EDGES.length = 0; FBY = {};
  FRIENDS.forEach(function (f) { FBY[f.id] = f; NODES[f.id] = { t: f.name, s: K("node.friend.s"), k: "actor friend", fid: f.id }; });
  NODES.stranger = { t: K("node.stranger.t"), s: K("node.stranger.s"), k: "actor" };
  NODES.thief = { t: K("node.thief.t"), s: K("node.thief.s"), k: "actor evil" };
  NODES.tg = { t: "Telegram API", s: "api.telegram.org", k: "ext" };
  NODES.llm = { t: "OpenRouter", s: "openrouter.ai", k: "ext" };
  NODES.evil = { t: "attacker.example", s: K("node.evil.s"), k: "ext evil" };
  NODES.host = { t: K("node.host.t"), s: "sshd · UFW · Incus", k: "", walls: HOST_WALLS };
  FRIENDS.forEach(function (f) { NODES["proxy-" + f.id] = { t: "iron-proxy@" + f.id, s: "10.90.0.10:" + fport(f), k: "key", walls: PROXY_WALLS, fid: f.id }; });
  FRIENDS.forEach(function (f) {
    NODES["hermes-" + f.id] = { t: "hermes-" + f.id, s: fip(f, 10), k: "", walls: HERMES_WALLS, fid: f.id };
    NODES["sandbox-" + f.id] = { t: "sandbox-" + f.id, s: fip(f, 11) + " · gVisor", k: "", walls: SANDBOX_WALLS, fid: f.id };
  });
  ZONES.hostz = { t: K("zone.hostz.t"), k: "host" };
  ZONES.infra = { t: K("zone.infra.t"), k: "", walls: [] };
  FRIENDS.forEach(function (f) { ZONES["br-" + f.id] = { t: "br-" + f.id + " · 10.91." + f.n + ".0/24", k: "", walls: BRIDGE_WALLS, fid: f.id }; });
  FRIENDS.forEach(function (f) { EDGES.push(["hermes-" + f.id, "proxy-" + f.id]); });
  FRIENDS.forEach(function (f) { EDGES.push(["proxy-" + f.id, "tg"], ["proxy-" + f.id, "llm"]); });
  FRIENDS.forEach(function (f) { EDGES.push(["hermes-" + f.id, "sandbox-" + f.id, "ssh"]); });
}
loadFriends();
rebuildTopology();

/* Resize the zone geometry, never the contents. Wrap before cards become cramped. */
function buildLayout(name, width) {
  var F = FRIENDS.length, n = {}, z = {};
  if (name === "wide") {
    var roomy = F > 2 && width >= 1050, vbW = roomy ? 1240 : 900;
    var columns = Math.min(F, roomy ? 3 : 2), rows = Math.ceil(F / columns);
    var hostW = vbW - 132, infraW = vbW - 352;
    var proxyColumns = Math.min(F, roomy ? 3 : 2), proxyRows = Math.ceil(F / proxyColumns);
    var infraH = 120 + (proxyRows - 1) * 76, bridgeY = 138 + infraH;
    var bottom = bridgeY + rows * 384 - 20, shift = (vbW - 900) / 2;
    var step = F <= 4 ? 70 : F === 5 ? 60 : 50, sy = 200 + F * step;
    FRIENDS.forEach(function (f, i) { n[f.id] = [62, 200 + i * step]; });
    n.stranger = [62, sy]; n.thief = [62, Math.min(sy + 130, 600)];
    n.tg = [400 + shift, 44]; n.llm = [590 + shift, 44]; n.evil = [vbW - 100, 44]; n.host = [240, 168];
    FRIENDS.forEach(function (f, i) {
      var proxyRow = Math.floor(i / proxyColumns), proxyCount = Math.min(proxyColumns, F - proxyRow * proxyColumns);
      n["proxy-" + f.id] = [Math.round(342 + infraW / proxyCount * (i % proxyColumns + 0.5)), 182 + proxyRow * 76];
      var row = Math.floor(i / columns), count = Math.min(columns, F - row * columns);
      var cellW = (vbW - 144) / count, x = 138 + i % columns * cellW, y = bridgeY + row * 384;
      n["hermes-" + f.id] = [x + (cellW - 10) / 2, y + 80];
      n["sandbox-" + f.id] = [x + (cellW - 10) / 2, y + 264];
      z["br-" + f.id] = [x, y, cellW - 10, 364];
    });
    z.hostz = [124, 96, hostW, bottom - 86]; z.infra = [342, 116, infraW, infraH];
    return { vb: [0, 0, vbW, bottom + 18], w: 170, h: 58, aw: 104, ah: 42, n: n, z: z };
  }
  var cols = [54, 158, 262, 366], actors = FRIENDS.map(function (f) { return f.id; }).concat(["stranger", "thief"]);
  actors.forEach(function (id, i) { n[id] = [cols[i % 4], 34 + Math.floor(i / 4) * 52]; });
  var dy = (Math.ceil(actors.length / 4) - 1) * 52;
  n.tg = [76, 112 + dy]; n.llm = [210, 112 + dy]; n.evil = [344, 112 + dy]; n.host = [210, 222 + dy];
  var infraY = 262 + dy, infraH = 118 + (Math.ceil(F / 2) - 1) * 70;
  FRIENDS.forEach(function (f, i) {
    var lone = F % 2 === 1 && i === F - 1;
    n["proxy-" + f.id] = [lone ? 210 : (i % 2 ? 305 : 115), 330 + dy + Math.floor(i / 2) * 70];
  });
  var B0 = infraY + infraH + 20;
  FRIENDS.forEach(function (f, i) {
    var by = B0 + i * 352;
    n["hermes-" + f.id] = [210, by + 68]; n["sandbox-" + f.id] = [210, by + 228];
    z["br-" + f.id] = [18, by, 384, 316];
  });
  var hostY = 166 + dy, hostH = B0 + (F - 1) * 352 + 316 + 14 - hostY;
  z.hostz = [8, hostY, 404, hostH]; z.infra = [18, infraY, 384, infraH];
  return { vb: [0, 0, 420, hostY + hostH + 8], w: 168, h: 54, aw: 92, ah: 40, n: n, z: z };
}
function initials(s) {
  var w = String(s || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  var a = Array.from(w[0])[0] || "", b = w.length > 1 ? (Array.from(w[w.length - 1])[0] || "") : (Array.from(w[0])[1] || "");
  return (/[a-z]/i.test(a) ? a + b : a).toUpperCase();
}
function clip(s, max) { var a = Array.from(String(s)); return a.length > max ? a.slice(0, max - 1).join("") + "…" : String(s); }
var L = null, layoutName = "", builtLang = "", builtSig = "";
var svg, gEdges, gTrails, gNodes, gFx, nodeEls = {}, zoneEls = {};

/* Keep the same topology while panel tracks animate; only its viewport changes. */
function mapLayoutWidth() {
  if (isNarrow()) return $("mapHost").clientWidth;
  var main = $("main"), style = getComputedStyle(main);
  return Math.max(640, main.clientWidth - parseFloat(style.getPropertyValue("--lw-open")) - parseFloat(style.getPropertyValue("--rw-open")) - 52);
}
function renderMap(force) {
  var host = $("mapHost");
  var width = mapLayoutWidth(), name = width < 640 ? "tall" : "wide";
  $("vMap").classList.toggle("fit-default", name === "wide" && FRIENDS.length === 2);
  var sig = FRIENDS.map(function (f) { return f.id; }).join(",") + (FRIENDS.length > 2 && width >= 1050 ? ":roomy" : ":regular");
  if (!force && name === layoutName && builtLang === LANG && builtSig === sig && svg) { paintState(); return; }
  layoutName = name; builtLang = LANG; builtSig = sig; L = buildLayout(name, width);
  stopPlayback();
  host.innerHTML = "";
  svg = sv("svg", { "class": "map", viewBox: L.vb.join(" "), role: "group", direction: "ltr", "aria-label": S("mapAria"), "aria-describedby": "mapTextHint" });
  syncMapText();
  var gZones = sv("g"); gEdges = sv("g"); gTrails = sv("g"); gNodes = sv("g"); gFx = sv("g");
  svg.appendChild(gZones); svg.appendChild(gEdges); svg.appendChild(gTrails); svg.appendChild(gNodes); svg.appendChild(gFx);
  zoneEls = {}; nodeEls = {};
  ["hostz", "infra"].concat(FRIENDS.map(function (f) { return "br-" + f.id; })).forEach(function (zid) {
    var z = ZONES[zid], r = L.z[zid], fr = z.fid ? FBY[z.fid] : null;
    var g = sv("g", { "class": "zone " + z.k, "data-zone": zid });
    if (fr) g.style.setProperty("--fc", fr.c);
    g.appendChild(sv("rect", { x: r[0], y: r[1], width: r[2], height: r[3], rx: 14 }));
    var lbl = isRTL()
      ? (zid === "hostz" && layoutName === "wide"
          ? sv("text", { "class": "zl", x: r[0] + 14, y: r[1] + 21, "text-anchor": "end", direction: "rtl" })
          : sv("text", { "class": "zl", x: r[0] + r[2] - 14, y: r[1] + 21, "text-anchor": "start", direction: "rtl" }))
      : sv("text", { "class": "zl", x: r[0] + 14, y: r[1] + 21 });
    lbl.textContent = T(z.t); g.appendChild(lbl);
    if (fr) {
      var zav = sv("g", { "class": "zav", transform: "translate(" + (isRTL() ? r[0] + 22 : r[0] + r[2] - 22) + "," + (r[1] + 17) + ")" });
      zav.appendChild(sv("circle", { r: 10 }));
      var zt = sv("text", { y: 3.6, "text-anchor": "middle" }); zt.textContent = initials(T(fr.name)); zav.appendChild(zt);
      g.appendChild(zav);
    }
    if (z.walls && z.walls.length) {
      var wt = isRTL()
        ? sv("text", { "class": "zw", x: r[0] + r[2] - 14, y: r[1] + r[3] - 12, "text-anchor": "start", direction: "rtl" })
        : sv("text", { "class": "zw", x: r[0] + 14, y: r[1] + r[3] - 12 });
      g.appendChild(wt); g._wt = wt;
    }
    var hit = sv("rect", { "class": "zhit", x: r[0], y: r[1], width: r[2], height: 30, tabindex: 0, role: "button", "aria-label": S("inspect") + T(z.t) });
    hit.addEventListener("click", function (e) { e.stopPropagation(); inspect(zid); });
    hit.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspect(zid); $("inspX").focus(); } });
    g.appendChild(hit);
    gZones.appendChild(g); zoneEls[zid] = g;
  });
  EDGES.forEach(function (e) {
    var a = L.n[e[0]], b = L.n[e[1]];
    if (name === "wide" && e[0].indexOf("hermes-") === 0 && e[1].indexOf("proxy-") === 0) {
      var bridge = L.z["br-" + e[0].slice(7)], rail = bridge[0] - 5, turn = L.z.infra[1] + L.z.infra[3] + 10;
      gEdges.appendChild(sv("path", { "class": "edge", "data-e": e[0] + "|" + e[1],
        d: "M" + (a[0] - L.w / 2) + " " + a[1] + " H" + rail + " V" + turn + " H" + b[0] + " V" + (b[1] + L.h / 2) }));
      return;
    }
    gEdges.appendChild(sv("line", { "class": "edge" + (e[2] ? " " + e[2] : ""), "data-e": e[0] + "|" + e[1], x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
  });
  Object.keys(NODES).forEach(function (id) {
    var n = NODES[id], p = L.n[id], actor = n.k.indexOf("actor") >= 0, fr = n.fid ? FBY[n.fid] : null;
    var w = actor ? L.aw : L.w, h = actor ? L.ah : L.h;
    if (!actor && (id === "tg" || id === "llm" || id === "evil") && layoutName === "tall") { w = 124; h = 48; }
    var g = sv("g", { "class": "node " + n.k, "data-node": id, tabindex: 0, role: "button", "aria-label": S("inspect") + T(n.t), transform: "translate(" + p[0] + "," + p[1] + ")" });
    if (fr) g.style.setProperty("--fc", fr.c);
    var ni = sv("g", { "class": "ni" }); g.appendChild(ni);
    ni.appendChild(sv("rect", { "class": "box", x: -w / 2, y: -h / 2, width: w, height: h, rx: actor ? h / 2 : 11 }));
    var tt = T(n.t), st = T(n.s);
    if (actor && fr) tt = clip(tt, layoutName === "tall" ? 7 : 8);
    var fullTitle = sv("title"); fullTitle.textContent = T(n.t); g.appendChild(fullTitle);
    var t = sv("text", { "class": "t", x: 0, y: actor ? -1 : -4, "text-anchor": "middle" }); t.textContent = tt; ni.appendChild(t);
    var sIsFa = /[؀-ۿ]/.test(st);
    var s = sv("text", { "class": sIsFa ? "s s-fa" : "s", x: 0, y: actor ? 13 : 14, "text-anchor": "middle" }); s.textContent = st; ni.appendChild(s);
    if (sIsFa) { s.style.fontFamily = "Vazirmatn, sans-serif"; s.setAttribute("direction", "rtl"); }
    if (isRTL() || /[؀-ۿ]/.test(tt)) t.setAttribute("direction", "rtl");
    if (actor) { t.setAttribute("font-size", layoutName === "tall" ? "11.5" : "13"); s.setAttribute("font-size", sIsFa ? "10.5" : "9.5"); }
    if (actor && fr) ni.appendChild(sv("circle", { "class": "fdot", cx: -w / 2 + 11, cy: 0, r: 3.6 }));
    if (n.walls) {
      var bg = sv("g", { "class": "badge", transform: "translate(" + (w / 2 - 6) + "," + (-h / 2 + 2) + ")" });
      bg.appendChild(sv("rect", { x: -16, y: -10, width: 32, height: 18, rx: 9 }));
      var bt = sv("text", { x: 0, y: 3.5, "text-anchor": "middle" }); bg.appendChild(bt);
      ni.appendChild(bg); g._bt = bt; g._bg = bg;
    }
    g.addEventListener("click", function (e) { e.stopPropagation(); inspect(id); });
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspect(id); $("inspX").focus(); } });
    gNodes.appendChild(g); nodeEls[id] = g;
  });
  svg.addEventListener("click", function () { closeInspector(); });
  host.appendChild(svg);
  Object.keys(nodeEls).forEach(function (id) {
    var g = nodeEls[id], w = +g.querySelector(".box").getAttribute("width");
    fitMapLabel(g.querySelector("text.t"), w - (NODES[id].k.indexOf("actor") >= 0 ? 28 : 20));
  });
  Object.keys(zoneEls).forEach(function (id) {
    fitMapLabel(zoneEls[id].querySelector("text.zl"), id === "hostz" && name === "wide" ? 208 : L.z[id][2] - (ZONES[id].fid ? 58 : 28));
  });
  applyBuildMask();
  paintState();
}
function fitMapLabel(label, width) {
  var text = label.textContent;
  while (text.length > 1 && label.getComputedTextLength() > width) {
    text = text.slice(0, -1); label.textContent = text + "…";
  }
}
function pos(id) { return L.n[id]; }

var ZW = [["bridge", K("zoneWall.bridge")], ["acl", K("zoneWall.acl")], ["nonat", K("zoneWall.nonat")], ["nodns", K("zoneWall.nodns")]];
function paintState() {
  Object.keys(nodeEls).forEach(function (id) {
    var n = NODES[id], g = nodeEls[id];
    if (!n.walls) return;
    var on = n.walls.filter(function (w) { return C[w]; }).length, tot = n.walls.length;
    g._bt.textContent = on + "/" + tot;
    g._bg.setAttribute("class", "badge " + (on === tot ? "okb" : on === 0 ? "badb" : "warnb"));
    g.classList.toggle("weak", on < tot);
  });
  FRIENDS.forEach(function (f) {
    var g = zoneEls["br-" + f.id];
    if (g) {
      g._wt.innerHTML = "";
      if (isRTL()) {
        g._wt.style.fontFamily = LM().font || "";
        g._wt.textContent = ZW.map(function (p) { return (C[p[0]] ? "✓ " : "✕ ") + T(p[1]); }).join("   ");
        var allOn = C.bridge && C.acl && C.nonat && C.nodns;
        g._wt.setAttribute("fill", allOn ? "var(--ok)" : "var(--bad)");
      } else {
        g._wt.removeAttribute("fill");
        ZW.forEach(function (p, i) {
          var ts = sv("tspan", { fill: C[p[0]] ? "var(--ok)" : "var(--bad)" });
          ts.textContent = (C[p[0]] ? "✓ " : "✕ ") + T(p[1]) + (i < ZW.length - 1 ? "   " : "");
          g._wt.appendChild(ts);
        });
      }
      g.classList.toggle("weak", !(C.bridge && C.acl && C.nonat && C.nodns));
    }
    var sb = nodeEls["sandbox-" + f.id];
    if (sb) {
      sb.querySelector("text.s").textContent = fip(f, 11) + " · " + (C.gvisor ? "gVisor" : "no gVisor");
      sb.style.opacity = C.sandbox ? "" : ".35";
    }
    var hm = nodeEls["hermes-" + f.id];
    if (hm) hm.classList.toggle("key", !C.proxyTokens);
  });
}
/* Text alternative for the diagram, visible to everyone (W3C complex images). */
function syncMapText() {
  var ul = $("mapTextList"); if (!ul) return;
  function wallsLine(ws) {
    var on = ws.filter(function (w) { return C[w]; }), off = ws.filter(function (w) { return !C[w]; });
    return S("mapTextWalls", { on: on.length, total: ws.length }) + (off.length ? " " + S("mapTextOff", { walls: off.map(function (w) { return T(WBY[w].n); }).join(S("listSep")) }) : "");
  }
  var items = [];
  items.push("<b>" + H(NODES.host.t) + "</b> · " + H(wallsLine(HOST_WALLS)));
  FRIENDS.forEach(function (f) {
    var sub = [
      ["iron-proxy@" + f.id, PROXY_WALLS], ["hermes-" + f.id, HERMES_WALLS], ["sandbox-" + f.id, SANDBOX_WALLS], ["br-" + f.id, BRIDGE_WALLS]
    ].map(function (p) { return '<li><bdi dir="ltr">' + esc(p[0]) + "</bdi> · " + H(wallsLine(p[1])) + "</li>"; }).join("");
    items.push("<b>" + H(S("mapTextFriend", { name: T(f.name) })) + "</b><ul>" + sub + "</ul>");
  });
  items.push(H(S("mapTextExternal")));
  ul.innerHTML = items.map(function (x) { return x.indexOf("<li>") === 0 ? x : "<li>" + x + "</li>"; }).join("");
}

/* ------------------------------------------------------------------ simulation engine */
function Sim(cfg) { this.C = cfg; this.steps = []; this.outcome = null; this.wall = null; this.summary = ""; }
Sim.prototype.step = function (at, text, kind, wall) { this.steps.push({ at: at, text: text, kind: kind || "n", wall: wall || null }); return this; };
Sim.prototype.block = function (at, wall, text) { this.steps.push({ at: at, text: text, kind: "blk", wall: wall }); this.outcome = "blocked"; this.wall = wall; this.summary = text; return false; };
Sim.prototype.contain = function (at, wall, text) { this.steps.push({ at: at, text: text, kind: "cnt", wall: wall }); this.outcome = "contained"; this.wall = wall; this.summary = text; return false; };
Sim.prototype.breach = function (at, text) { this.steps.push({ at: at, text: text, kind: "brc" }); this.outcome = "breached"; this.wall = null; this.summary = text; return true; };

function cmdOrigin(c) { return c.sandbox ? "sandbox-reza" : "hermes-reza"; }
function sandboxNet(s) {
  if (s.C.gvisor) return s.block("sandbox-reza", "gvisor", K("sim.sandboxNet.1"));
  if (s.C.sandboxAcl) return s.block("sandbox-reza", "sandboxAcl", K("sim.sandboxNet.2"));
  s.step("sandbox-reza", K("sim.sandboxNet.3"), "bad");
  return true;
}
function directEgress(s, origin, dest, arrive) {
  if (origin === "sandbox-reza" && !sandboxNet(s)) return false;
  if (s.C.acl) return s.block(origin, "acl", K("sim.directEgress.1"));
  s.step(origin, K("sim.directEgress.2"), "bad");
  if (s.C.nonat) return s.block("host", "nonat", K("sim.directEgress.3"));
  s.step("host", K("sim.directEgress.4"), "bad");
  s.step(dest, arrive, "bad");
  return true;
}
var ALLOWED = { "api.telegram.org": "tg", "openrouter.ai": "llm" };
function viaProxy(s, origin, target, opts) {
  opts = opts || {};
  if (origin === "sandbox-reza" && !sandboxNet(s)) return false;
  s.step(origin, s.C.acl ? K("sim.viaProxy.1") : K("sim.viaProxy.2"), s.C.acl ? "ok" : "bad");
  s.step("proxy-reza", K("sim.viaProxy.3", { target: target }), "n");
  if (opts.internal) {
    if (s.C.allowlist) return s.block("proxy-reza", "allowlist", K("sim.viaProxy.4", { target: target }));
    if (s.C.denycidr) return s.block("proxy-reza", "denycidr", K("sim.viaProxy.5"));
    s.step("proxy-reza", K("sim.viaProxy.6"), "bad");
    s.step("host", K("sim.viaProxy.7"), "bad");
    return true;
  }
  var dest = ALLOWED[target] || "evil";
  if (!ALLOWED[target]) {
    if (s.C.allowlist) return s.block("proxy-reza", "allowlist", K("sim.viaProxy.8", { target: target }));
    s.step("proxy-reza", K("sim.viaProxy.9"), "bad");
  } else {
    s.step("proxy-reza", K("sim.viaProxy.10", { target: target }), "ok");
    if (!opts.token) {
      if (s.C.require) return s.block("proxy-reza", "require", K("sim.viaProxy.11"));
      s.step("proxy-reza", K("sim.viaProxy.12"), "bad");
    } else {
      s.step("proxy-reza", K("sim.viaProxy.13"), "ok");
    }
  }
  s.step(dest, opts.arrive || K("sim.viaProxy.14", { target: target }), dest === "evil" || !opts.token ? "bad" : "ok");
  return true;
}
function readEnvAndLeak(s, origin) {
  var real = !s.C.proxyTokens;
  if (real) s.step(origin, K("sim.readEnvAndLeak.1"), "bad");
  else s.step(origin, K("sim.readEnvAndLeak.2"), "ok", "proxyTokens");
  var out = directEgress(s, origin, "evil", K("sim.readEnvAndLeak.3"));
  if (real && out) return s.breach("evil", K("sim.readEnvAndLeak.4"));
  if (real && !out) {
    var w = s.wall; s.steps.pop();
    return s.contain(origin, w, K("sim.readEnvAndLeak.5", { wall: function () { return wname(w); } }));
  }
  if (!real && out) return s.contain("evil", "proxyTokens", K("sim.readEnvAndLeak.6"));
  return false;
}
function TX(x) { var v = T(x); return typeof v === "function" ? v() : v; }

var G = { pi: K("group.pi"), bug: K("group.bug"), out: K("group.out"), ins: K("group.ins") };
var ATTACKS = [
  { id: "inject-env", g: G.pi, n: K("attack.inject-env.name"),
    d: K("attack.inject-env.desc"),
    run: function (s) {
      s.step("thief", K("attack.inject-env.step1"), "n");
      s.step("tg", K("attack.inject-env.step2"), "n");
      s.step("hermes-reza", K("attack.inject-env.step3"), "bad");
      if (s.C.sandbox) { s.step("sandbox-reza", K("attack.inject-env.step4"), "ok"); return s.block("sandbox-reza", "sandbox", K("attack.inject-env.step5")); }
      s.step("hermes-reza", K("attack.inject-env.step6"), "bad");
      return readEnvAndLeak(s, "hermes-reza");
    } },
  { id: "curl-exfil", g: G.pi, n: K("attack.curl-exfil.name"),
    d: K("attack.curl-exfil.desc"),
    run: function (s) {
      s.step("thief", K("attack.curl-exfil.step1"), "n");
      s.step("tg", K("attack.curl-exfil.step2"), "n");
      var o = cmdOrigin(s.C);
      s.step("hermes-reza", s.C.sandbox ? K("attack.curl-exfil.step3") : K("attack.curl-exfil.step4"), "bad");
      if (o === "sandbox-reza") s.step("sandbox-reza", K("attack.curl-exfil.step5"), "n");
      if (directEgress(s, o, "evil", K("attack.curl-exfil.step6"))) return s.breach("evil", K("attack.curl-exfil.step7"));
      return false;
    } },
  { id: "dns-exfil", g: G.pi, n: K("attack.dns-exfil.name"),
    d: K("attack.dns-exfil.desc"),
    run: function (s) {
      s.step("thief", K("attack.dns-exfil.step1"), "n");
      s.step("tg", K("attack.dns-exfil.step2"), "n");
      var o = cmdOrigin(s.C);
      s.step("hermes-reza", K("attack.dns-exfil.step3"), "bad");
      if (o === "sandbox-reza") { s.step("sandbox-reza", K("attack.dns-exfil.step4"), "n"); if (s.C.gvisor) return s.block("sandbox-reza", "gvisor", K("attack.dns-exfil.step5")); }
      s.step(o, K("attack.dns-exfil.step6"), "bad");
      if (s.C.nodns) return s.block("host", "nodns", K("attack.dns-exfil.step7"));
      s.step("host", K("attack.dns-exfil.step8"), "bad");
      s.step("evil", K("attack.dns-exfil.step9"), "bad");
      return s.breach("evil", K("attack.dns-exfil.step10"));
    } },
  { id: "bot-exfil", g: G.bug, n: K("attack.bot-exfil.name"),
    d: K("attack.bot-exfil.desc"),
    run: function (s) {
      s.step("thief", K("attack.bot-exfil.step1"), "n");
      s.step("tg", K("attack.bot-exfil.step2"), "n");
      s.step("hermes-reza", K("attack.bot-exfil.step3"), "bad");
      if (viaProxy(s, "hermes-reza", "api.telegram.org", { token: false, arrive: K("attack.bot-exfil.step4") })) return s.breach("tg", K("attack.bot-exfil.step5"));
      return false;
    } },
  { id: "rce-env", g: G.bug, n: K("attack.rce-env.name"),
    d: K("attack.rce-env.desc"),
    run: function (s) {
      s.step("thief", K("attack.rce-env.step1"), "n");
      s.step("tg", K("attack.rce-env.step2"), "n");
      s.step("hermes-reza", K("attack.rce-env.step3"), "bad");
      return readEnvAndLeak(s, "hermes-reza");
    } },
  { id: "lateral", g: G.bug, n: K("attack.lateral.name"),
    d: K("attack.lateral.desc"),
    run: function (s) {
      s.step("thief", K("attack.lateral.step1"), "n");
      s.step("hermes-reza", K("attack.lateral.step2"), "bad");
      if (!s.C.bridge) {
        s.step("hermes-reza", K("attack.lateral.step3"), "bad");
        s.step("hermes-sina", K("attack.lateral.step4"), "bad");
        return s.breach("hermes-sina", K("attack.lateral.step5"));
      }
      if (s.C.acl) return s.block("hermes-reza", "acl", K("attack.lateral.step6"));
      s.step("host", K("attack.lateral.step7"), "bad");
      s.step("hermes-sina", K("attack.lateral.step8"), "bad");
      return s.breach("hermes-sina", K("attack.lateral.step9"));
    } },
  { id: "privesc", g: G.bug, n: K("attack.privesc.name"),
    d: K("attack.privesc.desc"),
    run: function (s) {
      s.step("thief", K("attack.privesc.step1"), "n");
      s.step("hermes-reza", K("attack.privesc.step2"), "bad");
      if (s.C.nosetuid) return s.block("hermes-reza", "nosetuid", K("attack.privesc.step3"));
      s.step("hermes-reza", K("attack.privesc.step4"), "bad");
      if (s.C.unpriv) return s.contain("host", "unpriv", K("attack.privesc.step5"));
      return s.breach("host", K("attack.privesc.step6"));
    } },
  { id: "persist", g: G.pi, n: K("attack.persist.name"),
    d: K("attack.persist.desc"),
    run: function (s) {
      s.step("thief", K("attack.persist.step1"), "n");
      s.step("tg", K("attack.persist.step2"), "n");
      s.step("hermes-reza", K("attack.persist.step3"), "bad");
      if (s.C.sandbox) { s.step("sandbox-reza", K("attack.persist.step4"), "ok"); return s.block("sandbox-reza", "sandbox", K("attack.persist.step5")); }
      if (s.C.roConfig) return s.block("hermes-reza", "roConfig", K("attack.persist.step6"));
      s.step("hermes-reza", K("attack.persist.step7"), "bad");
      return s.breach("hermes-reza", K("attack.persist.step8"));
    } },
  { id: "escape", g: G.pi, n: K("attack.escape.name"),
    d: K("attack.escape.desc"),
    run: function (s) {
      s.step("thief", K("attack.escape.step1"), "n");
      s.step("tg", K("attack.escape.step2"), "n");
      var o = cmdOrigin(s.C);
      s.step("hermes-reza", K("attack.escape.step3"), "bad");
      if (o === "sandbox-reza") s.step("sandbox-reza", K("attack.escape.step4"), "n");
      if (s.C.sandbox && s.C.gvisor) return s.block("sandbox-reza", "gvisor", K("attack.escape.step5"));
      s.step(o, K("attack.escape.step6"), "bad");
      if (s.C.unpriv) return s.contain("host", "unpriv", K("attack.escape.step7"));
      return s.breach("host", K("attack.escape.step8"));
    } },
  { id: "forkbomb", g: G.pi, n: K("attack.forkbomb.name"),
    d: K("attack.forkbomb.desc"),
    run: function (s) {
      s.step("thief", K("attack.forkbomb.step1"), "n");
      s.step("tg", K("attack.forkbomb.step2"), "n");
      var o = cmdOrigin(s.C);
      s.step("hermes-reza", K("attack.forkbomb.step3"), "bad");
      if (o === "sandbox-reza") s.step("sandbox-reza", K("attack.forkbomb.step4"), "n");
      if (s.C.limits) return s.block(o, "limits", K("attack.forkbomb.step5"));
      return s.breach("host", K("attack.forkbomb.step6"));
    } },
  { id: "ssrf", g: G.bug, n: K("attack.ssrf.name"),
    d: K("attack.ssrf.desc"),
    run: function (s) {
      s.step("thief", K("attack.ssrf.step1"), "n");
      s.step("hermes-reza", K("attack.ssrf.step2"), "bad");
      if (viaProxy(s, "hermes-reza", "10.90.0.1", { internal: true })) return s.breach("host", K("attack.ssrf.step3"));
      return false;
    } },
  { id: "web-inject", g: G.pi, n: K("attack.web-inject.name"),
    d: K("attack.web-inject.desc"),
    run: function (s) {
      s.step("reza", K("attack.web-inject.step1"), "n");
      s.step("tg", K("attack.web-inject.step2"), "n");
      s.step("hermes-reza", K("attack.web-inject.step3"), "n");
      if (s.C.minTools) return s.block("hermes-reza", "minTools", K("attack.web-inject.step4"));
      if (viaProxy(s, "hermes-reza", "attacker.example", { token: true, arrive: K("attack.web-inject.step5") })) return s.breach("hermes-reza", K("attack.web-inject.step6"));
      return false;
    } },
  { id: "stranger", g: G.out, n: K("attack.stranger.name"),
    d: K("attack.stranger.desc"),
    run: function (s) {
      s.step("stranger", K("attack.stranger.step1"), "n");
      s.step("tg", K("attack.stranger.step2"), "n");
      if (s.C.allowUsers) return s.block("hermes-reza", "allowUsers", K("attack.stranger.step3"));
      s.step("hermes-reza", K("attack.stranger.step4"), "bad");
      return s.breach("hermes-reza", K("attack.stranger.step5"));
    } },
  { id: "ssh-brute", g: G.out, n: K("attack.ssh-brute.name"),
    d: K("attack.ssh-brute.desc"),
    run: function (s) {
      s.step("thief", K("attack.ssh-brute.step1"), "n");
      s.step("host", s.C.ufw ? K("attack.ssh-brute.step2") : K("attack.ssh-brute.step3"), s.C.ufw ? "ok" : "bad", s.C.ufw ? "ufw" : null);
      if (s.C.sshkey) return s.block("host", "sshkey", K("attack.ssh-brute.step4"));
      s.step("host", K("attack.ssh-brute.step5"), "bad");
      return s.breach("host", K("attack.ssh-brute.step6"));
    } },
  { id: "ca-forge", g: G.ins, n: K("attack.ca-forge.name"),
    d: K("attack.ca-forge.desc"),
    run: function (s) {
      s.step("thief", K("attack.ca-forge.step1"), "n");
      s.step("proxy-reza", K("attack.ca-forge.step2"), "bad");
      s.step("hermes-reza", K("attack.ca-forge.step3"), "n");
      if (s.C.nameconst) return s.block("hermes-reza", "nameconst", K("attack.ca-forge.step4"));
      return s.breach("hermes-reza", K("attack.ca-forge.step5"));
    } }
];
var ABY = {}; ATTACKS.forEach(function (a) { ABY[a.id] = a; });
function simulate(id, cfg) { var s = new Sim(cfg || C); ABY[id].run(s); if (!s.outcome) s.outcome = "blocked"; return s; }

/* ------------------------------------------------------------------ walls UI */
function renderWalls() {
  var host = $("wallList"); host.innerHTML = "";
  [1, 2, 3, 4, 5, 6].forEach(function (Ln) {
    var ws = WALLS.filter(function (w) { return w.L === Ln; });
    var box = el("section", { "class": "layer", "data-layer": Ln, role: "group", "aria-labelledby": "layer-t-" + Ln });
    var h = el("div", { "class": "layer-h" });
    h.innerHTML = '<span class="ln" aria-hidden="true">' + N(Ln) + '</span><span class="lt" id="layer-t-' + Ln + '">' + H(LAYERS[Ln]) + '</span><span class="lc"></span>';
    var all = el("button", { type: "button", "class": "lall", "aria-label": S("layerToggle", { n: Ln }) }, H(STR.all));
    all.addEventListener("click", function () {
      var before = snapshotConfig(), anyOff = ws.some(function (w) { return !C[w.id]; });
      ws.forEach(function (w) { C[w.id] = anyOff; });
      changed(S(anyOff ? "layerOn" : "layerOff", { n: Ln }), before);
    });
    h.appendChild(all);
    box.appendChild(h);
    ws.forEach(function (w) {
      var row = el("label", { "class": "wall", "data-wall": w.id });
      row.innerHTML = '<span class="wn">' + H(w.n) + '</span><span class="sw"><input type="checkbox" role="switch" aria-label="' + esc(T(w.n)) + '" aria-describedby="wd-' + w.id + '"><i></i></span>' +
        '<span class="wd" id="wd-' + w.id + '">' + H(w.d) + ' <em>' + H(REF(w.ref)) + '</em></span>';
      var cb = row.querySelector("input");
      cb.addEventListener("change", function () { setWall(w.id, cb.checked); });
      row.addEventListener("mouseenter", function () { focusWall(w.id, true); });
      row.addEventListener("mouseleave", function () { focusWall(w.id, false); });
      row.addEventListener("focusin", function () { focusWall(w.id, true); });
      row.addEventListener("focusout", function () { focusWall(w.id, false); });
      box.appendChild(row);
    });
    host.appendChild(box);
  });
  syncWalls();
}
function syncWalls() {
  D.querySelectorAll(".wall").forEach(function (row) {
    var id = row.getAttribute("data-wall");
    row.querySelector("input").checked = !!C[id];
    row.classList.toggle("is-off", !C[id]);
  });
  D.querySelectorAll(".layer").forEach(function (box) {
    var Ln = +box.getAttribute("data-layer");
    var ws = WALLS.filter(function (w) { return w.L === Ln; }), on = ws.filter(function (w) { return C[w.id]; }).length;
    box.querySelector(".lc").textContent = N(on) + "/" + N(ws.length);
    box.classList.toggle("off", on === 0);
    box.classList.toggle("partial", on > 0 && on < ws.length);
  });
  var offCount = WALLS.filter(function (w) { return !C[w.id]; }).length;
  var dot = $("mWallDot"); dot.hidden = offCount === 0; dot.textContent = N(offCount);
  $("wallsReset").disabled = offCount === 0;
}
function snapshotConfig() { var copy = {}; Object.keys(C).forEach(function (id) { copy[id] = C[id]; }); return copy; }
function setConfig(cfg) { Object.keys(cfg).forEach(function (id) { C[id] = cfg[id]; }); }
function setWall(id, on) {
  var before = snapshotConfig();
  C[id] = on;
  changed((on ? S("onX") : S("offX")) + T(WBY[id].n), before);
}
$("wallsReset").addEventListener("click", function () {
  var before = snapshotConfig();
  applyPreset("hardened");
  changed(S("fullRestored"), before);
});
function focusWall(id, on) {
  Object.keys(nodeEls).forEach(function (n) { if (NODES[n].walls && NODES[n].walls.indexOf(id) >= 0) nodeEls[n].classList.toggle("focus", on); });
  Object.keys(zoneEls).forEach(function (z) { if (ZONES[z].walls && ZONES[z].walls.indexOf(id) >= 0) zoneEls[z].classList.toggle("focus", on); });
}

/* ------------------------------------------------------------------ attacks UI */
var lastScores = null;
function renderAttacks() {
  var host = $("atkList"); host.innerHTML = "";
  var order = [], groups = {};
  ATTACKS.forEach(function (a) { var k = T(a.g); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(a); });
  order.forEach(function (g) {
    host.appendChild(el("div", { "class": "grp" }, H(g)));
    groups[g].forEach(function (a) {
      var b = el("button", { type: "button", "class": "atk" + (current === a.id ? " cur" : ""), "data-atk": a.id });
      b.innerHTML = '<b>' + H(a.n) + '</b><span class="pill"></span><small>' + H(a.d) + '</small><span class="via"></span>';
      b.addEventListener("click", function () { launch(a.id); });
      host.appendChild(b);
    });
  });
  scoreAll(true);
}
function scoreAll(silent) {
  var n = { blocked: 0, contained: 0, breached: 0 };
  ATTACKS.forEach(function (a) {
    var s = simulate(a.id);
    n[s.outcome]++;
    var b = D.querySelector('.atk[data-atk="' + a.id + '"]');
    if (!b) return;
    var p = b.querySelector(".pill"); p.className = "pill " + s.outcome; p.textContent = S("kind_" + s.outcome);
    b.classList.toggle("breached-now", s.outcome === "breached");
    b.querySelector(".via").innerHTML = s.outcome === "breached" ? H(STR.getsThrough) + " <em>" + H(STR.noWall) + "</em>" : H(STR.stoppedBy) + " <em>" + H(wname(s.wall)) + "</em>";
  });
  $("nB").textContent = N(n.blocked); $("nC").textContent = N(n.contained); $("nX").textContent = N(n.breached);
  var stopped = n.blocked + n.contained, tot = ATTACKS.length;
  $("scoreTxt").textContent = N(stopped) + "/" + N(tot);
  $("ringFg").setAttribute("stroke-dashoffset", String(87.96 * (1 - stopped / tot)));
  $("ringFg").style.stroke = n.breached === 0 ? (n.contained ? "var(--warn)" : "var(--ok)") : "var(--bad)";
  var dot = $("mAtkDot"); dot.hidden = n.breached === 0; dot.textContent = N(n.breached);
  var delta = "";
  if (lastScores && n.breached > lastScores.breached) delta = S("moreThrough", { n: n.breached - lastScores.breached });
  else if (lastScores && n.breached < lastScores.breached) delta = S("restored", { n: lastScores.breached - n.breached });
  if (!silent && delta) toast(delta);
  lastScores = n;
  applyAttackFilter();
  return delta;
}
var attackFilter = "all";
function applyAttackFilter() {
  var shown = 0;
  D.querySelectorAll("#atkFilter [data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === attackFilter ? "true" : "false"); });
  $("nA").textContent = N(ATTACKS.length);
  D.querySelectorAll("#atkList .atk").forEach(function (b) {
    var show = attackFilter === "all" || b.querySelector(".pill").classList.contains(attackFilter);
    b.hidden = !show; if (show) shown++;
  });
  D.querySelectorAll("#atkList .grp").forEach(function (g) {
    var n = g.nextElementSibling, any = false;
    while (n && !n.classList.contains("grp")) { if (!n.hidden) any = true; n = n.nextElementSibling; }
    g.hidden = !any;
  });
  var label = attackFilter === "all" ? "" : S("kind_" + attackFilter);
  $("atkStatus").textContent = attackFilter === "all" || !shown ? "" : S("filterShowing", { n: shown, kind: label });
  $("atkEmpty").hidden = shown > 0;
  $("atkEmptyText").textContent = shown ? "" : S("filterEmpty", { kind: label });
}
D.querySelectorAll("#atkFilter [data-filter]").forEach(function (b) {
  b.addEventListener("click", function () { var f = b.getAttribute("data-filter"); attackFilter = attackFilter === f ? "all" : f; applyAttackFilter(); });
});
$("atkShowAll").addEventListener("click", function () { attackFilter = "all"; applyAttackFilter(); D.querySelector('#atkFilter [data-filter="all"]').focus(); });

/* ------------------------------------------------------------------ animation */
var playToken = 0;
var attackAuto = store.get("attackAuto", true) !== false, attackPlayback = null, attackWait = null;
function syncPlayback() {
  var p = attackPlayback;
  $("attackAuto").checked = attackAuto;
  $("attackAuto").setAttribute("aria-label", S("playbackAutoAria"));
  $("attackProgress").textContent = p && p.index >= 0 ? S("playbackProgress", { current: p.index + 1, total: p.steps.length }) : "";
  $("attackNext").hidden = !p || attackAuto;
  $("attackStop").hidden = !p;
  $("attackNext").disabled = !p || !p.waiting;
  $("attackNext").textContent = S(p && p.index === p.steps.length - 1 ? "playbackFinish" : "playbackNext");
  $("attackStep").hidden = !p || p.index < 0;
  $("attackStep").textContent = p && p.index >= 0 ? TX(p.steps[p.index].text) : "";
}
function releaseAttackStep() {
  if (!attackWait) return;
  var wait = attackWait; attackWait = null;
  clearTimeout(wait.timer);
  if (attackPlayback) attackPlayback.waiting = false;
  syncPlayback();
  wait.resolve();
}
function stopPlayback() {
  playToken++;
  attackPlayback = null;
  releaseAttackStep();
  syncPlayback();
}
function waitAttackStep(ms) {
  return new Promise(function (resolve) {
    attackPlayback.waiting = true;
    attackWait = { resolve: resolve, timer: null, ms: ms };
    if (attackAuto) attackWait.timer = setTimeout(releaseAttackStep, ms);
    syncPlayback();
  });
}
$("attackAuto").addEventListener("change", function () {
  attackAuto = $("attackAuto").checked;
  store.set("attackAuto", attackAuto);
  if (attackWait) {
    clearTimeout(attackWait.timer);
    if (attackAuto) attackWait.timer = setTimeout(releaseAttackStep, attackWait.ms);
  }
  syncPlayback();
});
$("attackNext").addEventListener("click", releaseAttackStep);
$("attackStop").addEventListener("click", function () { $("resX").click(); });
function clearFx() {
  stopPlayback();
  if (!svg) return;
  gTrails.innerHTML = ""; gFx.innerHTML = "";
  Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove("is-hit", "is-reach", "is-safe"); });
  Object.keys(zoneEls).forEach(function (k) { zoneEls[k].classList.remove("is-hit"); });
  svg.classList.remove("dim");
}
function tip(at, textObj, cls) {
  var text = TX(textObj), fa = isRTL();
  var p = pos(at), vb = L.vb, maxW = layoutName === "tall" ? 300 : 360;
  var g = sv("g", { "class": "tip " + (cls || "") });
  var t = sv("text", fa ? { direction: "rtl", "text-anchor": "start" } : {});
  t.style.fontFamily = LM().font || "";
  var words = String(text).split(" "), lines = [""], cw = fa ? 6.2 : 6.9;
  words.forEach(function (w) { var cur = lines[lines.length - 1]; if ((cur + " " + w).length * cw > maxW && cur) lines.push(w); else lines[lines.length - 1] = cur ? cur + " " + w : w; });
  lines = lines.slice(0, 4);
  var w = Math.min(maxW, Math.max.apply(null, lines.map(function (l) { return l.length; })) * cw) + 22, h = lines.length * (fa ? 18 : 16) + 12;
  lines.forEach(function (ln, i) { var ts = sv("tspan", { x: fa ? w - 11 : 11, dy: i ? (fa ? 18 : 16) : 0 }); ts.textContent = ln; t.appendChild(ts); });
  var x = p[0] - w / 2, y = p[1] - (layoutName === "tall" ? 38 : 40) - h;
  if (y < vb[1] + 2) y = p[1] + 34;
  x = Math.max(vb[0] + 4, Math.min(vb[0] + vb[2] - w - 4, x));
  g.setAttribute("transform", "translate(" + x + "," + y + ")");
  g.appendChild(sv("rect", { x: 0, y: 0, width: w, height: h, rx: 8 }));
  t.setAttribute("transform", "translate(0," + (fa ? 21 : 19) + ")");
  g.appendChild(t);
  gFx.appendChild(g);
  return g;
}
function burst(at, cls) { var p = pos(at); gFx.appendChild(sv("circle", { "class": "burst " + cls, cx: p[0], cy: p[1], r: 8 })); }
function movePacket(dot, from, to, ms, token) {
  return new Promise(function (res) {
    if (reduced || ms === 0) { dot.setAttribute("cx", to[0]); dot.setAttribute("cy", to[1]); return res(); }
    var t0 = performance.now();
    function f(now) {
      if (token !== playToken) return res();
      var k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      dot.setAttribute("cx", from[0] + (to[0] - from[0]) * e);
      dot.setAttribute("cy", from[1] + (to[1] - from[1]) * e);
      if (k < 1) requestAnimationFrame(f); else res();
    }
    requestAnimationFrame(f);
  });
}
var KIND_CLS = { blk: "blk", cnt: "cnt", brc: "brc" };
async function play(steps, opts) {
  opts = opts || {};
  clearFx();
  var token = ++playToken;
  if (opts.attack) { attackPlayback = { steps: steps, index: -1, waiting: false }; syncPlayback(); }
  var speed = opts.fast ? 0.45 : 1;
  var prev = steps[0].at, dot = sv("circle", { "class": "packet", r: 7, cx: pos(prev)[0], cy: pos(prev)[1] });
  gFx.appendChild(dot);
  var curTip = null;
  for (var i = 0; i < steps.length; i++) {
    if (token !== playToken) return false;
    var st = steps[i];
    if (st.at !== prev) {
      var a = pos(prev), b = pos(st.at);
      gTrails.appendChild(sv("line", { "class": "trail" + (st.kind === "bad" || st.kind === "brc" ? " bad" : ""), x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
      if (st.kind === "bad" || st.kind === "brc") dot.setAttribute("class", "packet bad");
      await movePacket(dot, a, b, 520 * speed, token);
      prev = st.at;
    }
    if (token !== playToken) return false;
    if (curTip) curTip.remove();
    curTip = tip(st.at, st.text, KIND_CLS[st.kind] || "");
    if (opts.attack) attackPlayback.index = i;
    if (opts.onStep) opts.onStep(i);
    if (st.kind === "blk") { burst(st.at, "blk"); if (nodeEls[st.at]) nodeEls[st.at].classList.add("is-safe"); }
    if (st.kind === "cnt") { burst(st.at, "cnt"); if (nodeEls[st.at]) nodeEls[st.at].classList.add("is-reach"); }
    if (st.kind === "brc") { burst(st.at, "brc"); if (nodeEls[st.at]) nodeEls[st.at].classList.add("is-hit"); }
    var delay = (st.kind === "n" || st.kind === "ok" || st.kind === "bad" ? 650 : 400) * speed * (LM().pace || 1);
    if (opts.attack) await waitAttackStep(delay);
    else await sleep(delay);
  }
  if (token !== playToken) return false;
  dot.remove();
  if (opts.attack) { attackPlayback = null; syncPlayback(); }
  return true;
}

/* ------------------------------------------------------------------ launch */
var current = null, lastSim = null;
function launch(id) {
  var a = ABY[id], s = simulate(id);
  current = id; lastSim = { id: id, s: s };
  D.querySelectorAll(".atk").forEach(function (b) { b.classList.toggle("cur", b.getAttribute("data-atk") === id); });
  closeInspector();
  if (isNarrow()) setView("map");
  renderTrace(a.n, s);
  showResult("running", S("running") + T(a.n), T(a.d), []);
  if (isNarrow()) $("vMap").scrollTop = D.querySelector(".playback").offsetTop - 17;
  play(s.steps, {
    attack: true,
    onStep: function (i) { var lis = $("trace").children; for (var k = 0; k < lis.length; k++) lis[k].style.opacity = k <= i ? "1" : ".35"; }
  }).then(function (done) {
    if (!done) return;
    finishResult(id, s);
    logEvent(s.outcome, T(a.n), resultTitle(s));
  });
}
function resultTitle(s) { return s.outcome === "blocked" ? S("blockedBy") + wname(s.wall) : s.outcome === "contained" ? S("containedBy") + wname(s.wall) : S("breached"); }
function finishResult(id, s) {
  var acts = [{ t: STR.aReplay, f: function () { launch(id); } }, { t: STR.aTrace, f: function () { setView("trace"); } }];
  if (s.outcome !== "breached" && s.wall) acts.unshift({ t: STR.aOff, primary: true, f: function () { setWall(s.wall, false); launch(id); } });
  else if (s.outcome === "breached") acts.unshift({ t: STR.aRestore, primary: true, f: function () { var before = snapshotConfig(); applyPreset("hardened"); changed(S("fullRestored"), before); launch(id); } });
  showResult(s.outcome, resultTitle(s), TX(s.summary), acts);
}
function renderTrace(title, s) {
  $("trTitle").innerHTML = H(title);
  $("trSub").innerHTML = H(S("outcome") + S("kind_" + s.outcome) + (s.wall ? " · " + wname(s.wall) : ""));
  var ol = $("trace"); ol.innerHTML = "";
  s.steps.forEach(function (st) {
    var cls = { ok: "ok", bad: "bad", blk: "blk", cnt: "cnt", brc: "brc" }[st.kind] || "";
    var nm = NODES[st.at] ? T(NODES[st.at].t) : st.at;
    ol.appendChild(el("li", { "class": cls }, "<b>" + H(nm) + "</b> · " + H(TX(st.text)) + (st.wall ? '<span class="wl">' + H(wname(st.wall)) + "</span>" : "")));
  });
}
function showResult(kind, title, sub, actions) {
  var r = $("result");
  r.className = "result on " + kind;
  $("resK").textContent = kind === "blocked" ? "✓" : kind === "contained" ? "!" : kind === "breached" ? "✕" : "…";
  $("resT").innerHTML = H(title); $("resS").innerHTML = H(sub);
  var ra = $("resA"); ra.innerHTML = "";
  (actions || []).forEach(function (a) {
    var b = el("button", { type: "button", "class": "chipbtn" + (a.primary ? " primary" : "") }, H(a.t));
    b.addEventListener("click", a.f); ra.appendChild(b);
  });
}
$("resX").addEventListener("click", function () { $("result").className = "result"; playToken++; clearFx(); });

/* ------------------------------------------------------------------ inspector */
var INFO = {
  reza: { d: K("info.reza.desc"), holds: K("info.reza.holds") },
  sina: { d: K("info.sina.desc"), holds: K("info.sina.holds") },
  stranger: { d: K("info.stranger.desc"), holds: K("info.stranger.holds") },
  thief: { d: K("info.thief.desc"), holds: K("info.thief.holds") },
  tg: { d: K("info.tg.desc"), holds: K("info.tg.holds") },
  llm: { d: K("info.llm.desc"), holds: K("info.llm.holds") },
  evil: { d: K("info.evil.desc"), holds: K("info.evil.holds") },
  host: { d: K("info.host.desc"), holds: K("info.host.holds"),
    cfg: '<span class="c"># /etc/ssh/sshd_config.d/99-hardening.conf</span>\nPermitRootLogin no\nPasswordAuthentication no\nAuthenticationMethods publickey\nAllowUsers ali\nAllowTcpForwarding no\n\n<span class="c"># ufw</span>\nufw default deny incoming\nufw limit 22/tcp' },
  "proxy-reza": { d: K("info.proxy-reza.desc"), holds: K("info.proxy-reza.holds"), bad: true,
    cfg: 'tunnel_listen: "10.90.0.10:8081"\ntransforms:\n  - name: allowlist\n    config: { domains: [api.telegram.org, openrouter.ai] }\n  - name: secrets\n    config:\n      secrets:\n        - var: TELEGRAM_BOT_TOKEN\n          match_path: true\n          require: true' },
  "proxy-sina": { d: K("info.proxy-sina.desc"), holds: K("info.proxy-sina.holds"), bad: true },
  "hermes-reza": { d: K("info.hermes-reza.desc"),
    cfg: '<span class="c"># ~/.hermes/.env</span>\nTELEGRAM_BOT_TOKEN=123456789:REZA-PROXY-TOKEN\nTELEGRAM_ALLOWED_USERS=111111111\nOPENROUTER_API_KEY=sk-proxy-reza-…\n\n<span class="c"># config.yaml</span>\nterminal:\n  backend: ssh\n  ssh_host: "10.91.1.11"\nunauthorized_dm_behavior: ignore' },
  "hermes-sina": { d: K("info.hermes-sina.desc") },
  "sandbox-reza": { d: K("info.sandbox-reza.desc"), holds: K("info.sandbox-reza.holds"),
    cfg: '#!/bin/bash\n<span class="c"># /usr/local/bin/gvisor-shell</span>\nexec runsc --rootless --network=none \\\n     --ignore-cgroups --platform=systrap \\\n     do -- /bin/bash "$@"' },
  "sandbox-sina": { d: K("info.sandbox-sina.desc"), holds: K("info.sandbox-sina.holds") },
  hostz: { d: K("info.hostz.desc") },
  infra: { d: K("info.infra.desc"), holds: K("info.infra.holds"), bad: true },
  "br-reza": { d: K("info.br-reza.desc"),
    cfg: 'incus network create br-reza \\\n  ipv4.address=10.91.1.1/24 ipv4.nat=false\nincus network set br-reza raw.dnsmasq="no-resolv"\nincus network acl rule add acl-reza egress \\\n  action=allow destination=10.90.0.10/32 \\\n  protocol=tcp destination_port=8081' },
  "br-sina": { d: K("info.br-sina.desc") }
};
function friendOf(id) { var nd = NODES[id] || ZONES[id]; return nd && nd.fid ? FBY[nd.fid] : null; }
/* inspector copy for friends added at runtime (Reza and Sina keep their hand-written INFO) */
function getInfo(id) {
  var f = friendOf(id);
  if (!f || f.core) return INFO[id] || {};
  var p = fport(f), fid = f.id;
  if (id === fid) return {
    d: K("friendInfo.friend.desc", { name: f.name, id: String(f.tg) }),
    holds: K("friendInfo.friend.holds") };
  if (id === "proxy-" + fid) return {
    d: K("friendInfo.proxy.desc", { name: f.name, port: String(p) }),
    holds: K("friendInfo.proxy.holds", { name: f.name, handle: fid }), bad: true,
    cfg: 'tunnel_listen: "10.90.0.10:' + p + '"\ntransforms:\n  - name: allowlist\n    config: { domains: [api.telegram.org, openrouter.ai] }\n  - name: secrets\n    config:\n      secrets:\n        - var: TELEGRAM_BOT_TOKEN\n          match_path: true\n          require: true' };
  if (id === "hermes-" + fid) return {
    d: K("friendInfo.hermes.desc", { name: f.name, port: String(p) }),
    cfg: '<span class="c"># ~/.hermes/.env</span>\nTELEGRAM_BOT_TOKEN=123456789:' + fid.toUpperCase() + '-PROXY-TOKEN\nTELEGRAM_ALLOWED_USERS=' + f.tg + '\nOPENROUTER_API_KEY=sk-proxy-' + fid + '-…\n\n<span class="c"># config.yaml</span>\nterminal:\n  backend: ssh\n  ssh_host: "' + fip(f, 11) + '"\nunauthorized_dm_behavior: ignore' };
  if (id === "sandbox-" + fid) return {
    d: K("friendInfo.sandbox.desc", { name: f.name }),
    holds: K("friendInfo.sandbox.holds"),
    cfg: '#!/bin/bash\n<span class="c"># /usr/local/bin/gvisor-shell</span>\nexec runsc --rootless --network=none \\\n     --ignore-cgroups --platform=systrap \\\n     do -- /bin/bash "$@"' };
  if (id === "br-" + fid) return {
    d: K("friendInfo.br.desc", { name: f.name, port: String(p) }),
    cfg: 'incus network create br-' + fid + ' \\\n  ipv4.address=10.91.' + f.n + '.1/24 ipv4.nat=false\nincus network set br-' + fid + ' raw.dnsmasq="no-resolv"\nincus network acl rule add acl-' + fid + ' egress \\\n  action=allow destination=10.90.0.10/32 \\\n  protocol=tcp destination_port=' + p };
  return {};
}
function holdsFor(id) {
  var f = friendOf(id);
  if (f && id === "hermes-" + f.id) {
    if (id === "hermes-reza" || id === "hermes-sina") {
      var who = id === "hermes-reza";
      return C.proxyTokens
        ? { t: who ? K("holds.1") : K("holds.2"), bad: false }
        : { t: who ? K("holds.3") : K("holds.4"), bad: true };
    }
    return C.proxyTokens
      ? { t: K("holds.5", { name: f.name }), bad: false }
      : { t: K("holds.6", { name: f.name }), bad: true };
  }
  var i = getInfo(id);
  return i.holds ? { t: i.holds, bad: !!i.bad } : null;
}
function blastFor(id) {
  var allProxies = FRIENDS.map(function (x) { return "proxy-" + x.id; });
  if (id === "infra") return { hit: allProxies, reach: ["tg", "llm"], t: K("blast.1") };
  if (id === "host" || id === "hostz") return { hit: Object.keys(NODES).filter(function (n) { return NODES[n].k.indexOf("actor") < 0 && NODES[n].k.indexOf("ext") < 0; }), reach: ["tg", "llm"], t: K("blast.2") };
  var f = friendOf(id);
  if (!f || id === f.id) return null;
  var fid = f.id;
  if (id === "hermes-" + fid) return {
    hit: [id],
    reach: (C.bridge ? [] : FRIENDS.filter(function (x) { return x.id !== fid; }).map(function (x) { return "hermes-" + x.id; })).concat(C.proxyTokens ? [] : ["tg", "llm"]),
    t: C.proxyTokens ? K("blast.3", { name: f.name })
                     : K("blast.4", { name: f.name }) };
  if (id === "sandbox-" + fid) return { hit: [id], reach: (!C.gvisor && !C.sandboxAcl) ? ["evil"] : [], t: C.gvisor ? K("blast.5") : K("blast.6") };
  if (id === "proxy-" + fid) return { hit: [id], reach: ["tg", "llm"], t: K("blast.7", { name: f.name }) };
  if (id === "br-" + fid) return { hit: ["hermes-" + fid], reach: C.acl ? ["proxy-" + fid] : allProxies.concat(["evil"]), t: C.acl ? K("blast.8", { name: f.name }) : K("blast.9") };
  return null;
}
var inspected = null;
function inspect(id) {
  inspected = id;
  var isZone = !!ZONES[id];
  var zt = isZone ? T(ZONES[id].t).split(" · ") : null;
  var meta = isZone ? { t: zt[0], s: zt.slice(1).join(" · "), walls: ZONES[id].walls } : { t: T(NODES[id].t), s: T(NODES[id].s), walls: NODES[id].walls };
  var info = getInfo(id);
  Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.toggle("is-sel", k === id); });
  Object.keys(zoneEls).forEach(function (k) { zoneEls[k].classList.toggle("is-sel", k === id); });
  var box = $("insp");
  var h = '<div class="insp-h"><div class="it"><b id="inspectorTitle">' + H(meta.t) + '</b><span dir="auto">' + H(meta.s || "") + '</span></div><button class="ibtn" type="button" id="inspX" aria-label="' + esc(S("closeInsp")) + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="insp-b">';
  if (info.d) h += "<p>" + H(info.d) + "</p>";
  var hold = holdsFor(id);
  if (hold) h += "<h4>" + H(STR.holds) + '</h4><div class="holds' + (hold.bad ? " bad" : "") + '">' + H(hold.t) + "</div>";
  var ws = meta.walls || [];
  if (ws.length) {
    h += "<h4>" + H(STR.wallsHere) + "</h4>";
    ws.forEach(function (w) {
      h += '<div class="iwall"><span>' + H(WBY[w].n) + '<small>' + H(S("layerWord") + " " + N(WBY[w].L) + " · " + REF(WBY[w].ref)) + '</small></span><span class="sw"><input type="checkbox" data-iw="' + w + '"' + (C[w] ? " checked" : "") + ' aria-label="' + esc(T(WBY[w].n)) + '"><i></i></span></div>';
    });
  }
  if (info.cfg) h += "<h4>" + H(STR.config) + '</h4><pre class="cfg" dir="ltr">' + info.cfg + "</pre>";
  var bl = blastFor(id);
  if (bl) h += "<h4>" + H(STR.ifComp) + '</h4><button type="button" class="chipbtn primary" id="blastBtn" style="width:100%">' + H(STR.showBlast) + "</button>";
  var fr0 = friendOf(id);
  if (fr0 && !fr0.core && !(building && building.f === fr0)) h += "<h4>" + H(STR.manage) + '</h4><button type="button" class="chipbtn danger" id="inspRm" style="width:100%">' + H(S("removeX") + T(fr0.name)) + "</button>";
  h += "</div>";
  box.innerHTML = h; box.classList.add("on"); box.scrollTop = 0;
  box.setAttribute("aria-labelledby", "inspectorTitle");
  $("inspX").addEventListener("click", closeInspector);
  box.querySelectorAll("input[data-iw]").forEach(function (cb) {
    cb.addEventListener("change", function () { setWall(cb.getAttribute("data-iw"), cb.checked); inspect(id); });
  });
  if (bl) $("blastBtn").addEventListener("click", function () {
    playToken++; clearFx(); svg.classList.add("dim");
    bl.hit.forEach(function (n) { if (nodeEls[n]) nodeEls[n].classList.add("is-hit"); });
    bl.reach.forEach(function (n) { if (nodeEls[n]) nodeEls[n].classList.add("is-reach"); });
    showResult(bl.hit.length > 3 ? "breached" : "contained", S("blastOf") + meta.t, T(bl.t), [{ t: STR.clear, f: function () { clearFx(); $("result").className = "result"; } }]);
    if (isNarrow()) closeInspector();
  });
  if ($("inspRm")) $("inspRm").addEventListener("click", function () {
    var b = $("inspRm");
    if (b.classList.contains("arm")) { removeFriend(fr0.id); return; }
    b.classList.add("arm"); b.innerHTML = H(S("sure"));
    setTimeout(function () { if (b.isConnected) { b.classList.remove("arm"); b.innerHTML = H(S("removeX") + T(fr0.name)); } }, 3200);
  });
}
function closeInspector() {
  var target = inspected && (nodeEls[inspected] || (zoneEls[inspected] && zoneEls[inspected].querySelector(".zhit")));
  var returnFocus = $("insp").contains(D.activeElement);
  inspected = null;
  $("insp").classList.remove("on");
  Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove("is-sel"); });
  Object.keys(zoneEls).forEach(function (k) { zoneEls[k].classList.remove("is-sel"); });
  if (returnFocus && target) target.focus();
}

/* ------------------------------------------------------------------ telegram chat */
var who = "reza";
var QUICK = [
  K("quick.1"),
  K("quick.2"),
  K("quick.3"),
  K("quick.4"),
  K("quick.5"),
  K("quick.6"),
  K("quick.7")
];
function addMsg(cls, html) { var m = el("div", { "class": "msg " + cls, dir: "auto" }, html); $("msgs").appendChild(m); $("msgs").scrollTop = $("msgs").scrollHeight; return m; }
function botSays(text, code) { return addMsg("bot", H(text) + (code ? '<pre dir="ltr">' + esc(code) + "</pre>" : "")); }
function sys(cls, text) { return addMsg("sys " + (cls || ""), H(text)); }
var CH = {
  fromReza: K("chat.fromReza"), fromThief: K("chat.fromThief"), fromStranger: K("chat.fromStranger"),
  dm: K("chat.dm"), delivered: K("chat.delivered"),
  ignoredStep: K("chat.ignoredStep"),
  answersStranger: K("chat.answersStranger"),
  noReply: K("chat.noReply"),
  pairing: K("chat.pairing"),
  pairingWarn: K("chat.pairingWarn"),
  msgTo: K("chat.msgTo"), tgDeliver: K("chat.tgDeliver"), gwRecv: K("chat.gwRecv"),
  modelCall: K("chat.modelCall"), orAns: K("chat.orAns"), back: K("chat.back"),
  runsGv: K("chat.runsGv"), runsSb: K("chat.runsSb"), runsLocal: K("chat.runsLocal"),
  output: K("chat.output"),
  gvProof: K("chat.gvProof"),
  hostKernel: K("chat.hostKernel"),
  tried: K("chat.tried"), contents: K("chat.contents"),
  noEnv: K("chat.noEnv"),
  proxyLeak: K("chat.proxyLeak"),
  realLeak: K("chat.realLeak"),
  noWeb: K("chat.noWeb"),
  fetchFail: K("chat.fetchFail"),
  summary: K("chat.summary"),
  poisoned: K("chat.poisoned"),
  ran: K("chat.ran"),
  dataLeft: K("chat.dataLeft"),
  blockedByX: K("chat.blockedByX"),
  cfgDone: K("chat.cfgDone"),
  cfgWarn: K("chat.cfgWarn"),
  pidsWarn: K("chat.pidsWarn"),
  cmdFail: K("chat.cmdFail"),
  pidsOk: K("chat.pidsOk"),
  hiReza: K("chat.hiReza"),
  normal: K("chat.normal"),
  thiefNote: K("chat.thiefNote"),
  logDm: K("chat.logDm"), logIgnored: K("chat.logIgnored"), logPair: K("chat.logPair"),
  logEnv: K("chat.logEnv"), logEnvSb: K("chat.logEnvSb"), logEnvTok: K("chat.logEnvTok"), logEnvReal: K("chat.logEnvReal"),
  logWeb: K("chat.logWeb"), logCurl: K("chat.logCurl"), logCfg: K("chat.logCfg"), logFork: K("chat.logFork")
};
function cmdOut() {
  if (C.sandbox && C.gvisor) return "Linux sandbox-reza 4.4.0 #1 SMP Sun Jan 10 15:06:54 PST 2016 x86_64 GNU/Linux";
  return "Linux " + cmdOrigin(C) + " 6.12.48+deb13-amd64 #1 SMP PREEMPT_DYNAMIC Debian x86_64 GNU/Linux";
}
async function chat(text) {
  text = text.trim(); if (!text) return;
  var cls = who === "reza" ? "" : who;
  var from = who === "reza" ? CH.fromReza : who === "thief" ? CH.fromThief : CH.fromStranger;
  addMsg("me " + cls, '<span class="from">' + H(from) + "</span>" + H(text));
  var src = who === "stranger" ? "stranger" : who === "thief" ? "thief" : "reza";
  if (who === "stranger") {
    if (C.allowUsers) {
      await play([{ at: "stranger", text: CH.dm, kind: "n" }, { at: "tg", text: CH.delivered, kind: "n" }, { at: "hermes-reza", text: CH.ignoredStep, kind: "blk", wall: "allowUsers" }], { fast: true });
      sys("good", CH.noReply); logEvent("blocked", T(CH.logDm), T(CH.logIgnored));
    } else {
      await play([{ at: "stranger", text: CH.dm, kind: "n" }, { at: "tg", text: CH.delivered, kind: "n" }, { at: "hermes-reza", text: CH.answersStranger, kind: "brc" }], { fast: true });
      botSays(CH.pairing); sys("bad", CH.pairingWarn); logEvent("breached", T(CH.logDm), T(CH.logPair));
    }
    return;
  }
  var t = text.toLowerCase();
  var base = [{ at: src, text: CH.msgTo, kind: "n" }, { at: "tg", text: CH.tgDeliver, kind: "n" }, { at: "hermes-reza", text: CH.gwRecv, kind: "n" }];
  var llm = [{ at: "proxy-reza", text: CH.modelCall, kind: "ok" }, { at: "llm", text: CH.orAns, kind: "ok" }, { at: "hermes-reza", text: CH.back, kind: "ok" }];
  var execStep = C.sandbox ? [{ at: "sandbox-reza", text: C.gvisor ? CH.runsGv : CH.runsSb, kind: "ok" }] : [{ at: "hermes-reza", text: CH.runsLocal, kind: "bad" }];
  var s, out;
  if (/uname/.test(t)) {
    await play(base.concat(execStep), { fast: true });
    botSays(CH.output, cmdOut());
    if (C.sandbox && C.gvisor) sys("good", CH.gvProof); else sys("bad", CH.hostKernel);
  } else if (/\.env|printenv|api key|token/.test(t)) {
    await play(base.concat(execStep), { fast: true });
    if (C.sandbox) { botSays(CH.tried, "cat: /home/hermes/.hermes/.env: No such file or directory"); sys("good", CH.noEnv); }
    else if (C.proxyTokens) { botSays(CH.contents, "TELEGRAM_BOT_TOKEN=123456789:pXq7Lm0RzA1vB8cN2dE5fG9hJ3kQ4sT6uW\nTELEGRAM_ALLOWED_USERS=111111111\nOPENROUTER_API_KEY=sk-proxy-reza-9f2c41d0a7b35e8c6f14d2a9"); sys("good", CH.proxyLeak); }
    else { botSays(CH.contents, "TELEGRAM_BOT_TOKEN=123456789:AAHf3-REAL-TOKEN-xY2kL9mQ\nOPENROUTER_API_KEY=sk-or-v1-REAL-5b1e93c0d7f2…"); sys("bad", CH.realLeak); }
    logEvent(C.sandbox || C.proxyTokens ? "blocked" : "breached", T(CH.logEnv), T(C.sandbox ? CH.logEnvSb : C.proxyTokens ? CH.logEnvTok : CH.logEnvReal));
  } else if (/https?:\/\/|summar|خلاصه|read |web|page/.test(t) && !/curl/.test(t)) {
    s = simulate("web-inject");
    await play(base.concat(s.steps.slice(3)), { fast: true });
    if (s.wall === "minTools") botSays(CH.noWeb);
    else if (s.wall === "allowlist") botSays(CH.fetchFail, "HTTP 403 Forbidden (blocked by the egress proxy allowlist)");
    else { botSays(CH.summary); sys("bad", CH.poisoned); }
    logEvent(s.outcome, T(CH.logWeb), TX(s.summary));
  } else if (/curl|attacker|exfil/.test(t)) {
    s = simulate("curl-exfil");
    await play(base.concat(s.steps.slice(3)), { fast: true });
    out = s.outcome === "breached" ? "HTTP/1.1 200 OK" : s.wall === "gvisor" ? "curl: (6) Could not resolve host: attacker.example" : "curl: (28) Connection timed out after 10001 milliseconds";
    botSays(CH.ran, out);
    if (s.outcome === "breached") sys("bad", CH.dataLeft); else sys("good", T(CH.blockedByX) + wname(s.wall) + ".");
    logEvent(s.outcome, T(CH.logCurl), TX(s.summary));
  } else if (/allowed_users|allowed users|enable all tools|config|ابزار/.test(t)) {
    s = simulate("persist");
    await play(base.concat(s.steps.slice(3)), { fast: true });
    if (s.outcome === "breached") { botSays(CH.cfgDone); sys("bad", CH.cfgWarn); }
    else if (s.wall === "sandbox") botSays(CH.tried, "sed: can't read /home/hermes/.hermes/.env: No such file or directory");
    else botSays(CH.tried, "sed: couldn't open temporary file /home/hermes/.hermes/sedX1: Read-only file system");
    logEvent(s.outcome, T(CH.logCfg), TX(s.summary));
  } else if (/:\(\)|fork|fallocate/.test(t)) {
    s = simulate("forkbomb");
    await play(base.concat(s.steps.slice(3)), { fast: true });
    if (s.outcome === "breached") sys("bad", CH.pidsWarn);
    else { botSays(CH.cmdFail, "bash: fork: retry: Resource temporarily unavailable"); sys("good", CH.pidsOk); }
    logEvent(s.outcome, T(CH.logFork), TX(s.summary));
  } else {
    await play(base.concat(llm), { fast: true });
    botSays(who === "thief" || /^(hi|hello|hey|سلام)/.test(t) ? CH.hiReza : CH.normal);
    if (who === "thief") sys("", CH.thiefNote);
  }
}
function renderQuick() {
  var q = $("quick"); q.innerHTML = "";
  QUICK.forEach(function (x) { var b = el("button", { type: "button", dir: "auto" }, H(x)); b.addEventListener("click", function () { chat(T(x)); }); q.appendChild(b); });
}
function setWho(w) {
  who = w;
  D.querySelectorAll(".who button").forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-who") === w ? "true" : "false"); });
  $("chatIn").placeholder = S(w === "stranger" ? "phStranger" : w === "thief" ? "phThief" : "phReza");
  $("chatIn").setAttribute("aria-label", $("chatIn").placeholder);
}
D.querySelectorAll(".who button").forEach(function (b) { b.addEventListener("click", function () { setWho(b.getAttribute("data-who")); }); });
$("compose").addEventListener("submit", function (e) { e.preventDefault(); var v = $("chatIn").value; $("chatIn").value = ""; chat(v); });
$("chatIn").setAttribute("dir", "auto");

/* ------------------------------------------------------------------ self-test */
function selftestLines() {
  var c = C, out = [];
  function line(ok, txt, why) { out.push({ ok: ok, t: txt, why: why }); }
  out.push({ h: "--- network layer ---" });
  line(c.acl || c.nonat, "direct internet by IP is dropped", c.acl ? "" : c.nonat ? "(passes only because NAT is off)" : "connected to 1.1.1.1:443");
  line(c.acl, "another friend's proxy is dropped", c.acl ? "" : "connection refused/opened: no ACL");
  line(c.acl, "infra ssh port is dropped", c.acl ? "" : "got a fast refusal: no wall");
  line(c.acl, "host via gateway is dropped", c.acl ? "" : "reached 10.91.1.1:22");
  line(c.acl && c.bridge, "neighbour friend is dropped", !c.bridge ? "shared bridge: ACL never sees it" : !c.acl ? "reached 10.91.2.10" : "");
  line(c.nodns, c.nodns ? "external DNS does not resolve" : "external DNS resolves", c.nodns ? "" : "example.com resolved");
  out.push({ h: "--- proxy / secrets layer ---" });
  line(c.proxyTokens || !c.require, "telegram works with own proxy token", c.proxyTokens || !c.require ? "" : "(got 403: .env holds a real token, not the proxy token)");
  line(c.require, "telegram refuses a foreign bot token", c.require ? "" : "(got 401)");
  line(c.proxyTokens || !c.require, "llm works with own proxy token", c.proxyTokens || !c.require ? "" : "(got 403)");
  line(c.require, "llm refuses a request without proxy token", c.require ? "" : "(got 401)");
  line(c.allowlist, "non-allowlisted domain is refused", c.allowlist ? "" : "(got 200)");
  line(c.allowlist || c.denycidr, "proxy refuses internal targets", c.allowlist || c.denycidr ? "" : "(got 200)");
  out.push({ h: "--- execution sandbox (section 6 checks) ---" });
  line(c.sandbox && c.gvisor, "uname shows the gVisor kernel", c.sandbox && c.gvisor ? "" : "(host kernel 6.12.48)");
  line(c.sandbox, "ls ~/.hermes fails in the sandbox", c.sandbox ? "" : "(listed config.yaml .env memories)");
  line(c.sandbox && (c.gvisor || c.sandboxAcl), "sandbox has no network", c.sandbox && (c.gvisor || c.sandboxAcl) ? "" : "(reached 10.90.0.10:8081)");
  line(c.sandboxAcl || !c.sandbox, "sandbox instance itself has no exit", c.sandboxAcl ? "" : c.sandbox ? "(connected)" : "(no sandbox instance)");
  return out;
}
var testToken = 0;
async function runTest() {
  var tk = ++testToken, term = $("term");
  term.innerHTML = '<span class="pr">host$</span> incus exec hermes-reza -- bash /root/selftest.sh\n';
  var lines = selftestLines(), failed = 0;
  for (var i = 0; i < lines.length; i++) {
    if (tk !== testToken) return;
    var l = lines[i];
    await sleep(reduced ? 0 : (l.h ? 220 : 170));
    if (l.h) { term.insertAdjacentHTML("beforeend", '\n<span class="dim">' + esc(l.h) + "</span>\n"); continue; }
    if (!l.ok) failed++;
    term.insertAdjacentHTML("beforeend", (l.ok ? '<span class="okl">OK  </span>  ' : '<span class="fl">FAIL</span>  ') + esc(l.t) + (l.why ? ' <span class="dim">' + esc(l.why) + "</span>" : "") + "\n");
    term.scrollTop = term.scrollHeight;
  }
  await sleep(reduced ? 0 : 300);
  term.insertAdjacentHTML("beforeend", "\n" + (failed ? '<span class="big-fl">SOME TESTS FAILED — do not share access yet</span>  <span class="dim">(' + failed + ' failed)</span>' : '<span class="big-ok">ALL TESTS PASSED</span>') + '\n\n<span class="pr">host$</span> <span class="cur"></span>');
  term.scrollTop = term.scrollHeight;
  logEvent(failed ? "breached" : "blocked", S("selftestLog"), failed ? S("failedN", { n: failed }) : S("passed"));
}
$("runTest").addEventListener("click", runTest);
$("clearTest").addEventListener("click", function () { testToken++; $("term").innerHTML = '<span class="pr">host$</span> <span class="cur"></span>'; });

/* ------------------------------------------------------------------ log */
function logEvent(kind, what, detail) {
  var ul = $("log"), empty = ul.querySelector(".empty"); if (empty) empty.remove();
  var d = new Date(), tm = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);
  var li = el("li", { "class": kind }, '<time dir="ltr">' + tm + '</time><span><span class="lk">' + H(STR["kind_" + kind]) + "</span> · <b>" + H(what) + "</b>" + (detail ? "<br>" + H(detail) : "") + "</span>");
  ul.insertBefore(li, ul.firstChild);
  while (ul.children.length > 120) ul.removeChild(ul.lastChild);
}

/* ------------------------------------------------------------------ change + views */
var experiment = null;
function syncExperiment() {
  var key = "learnIntro", params = {};
  if (experiment) {
    key = experiment.phase === "baseline" ? "learnBaseline" : experiment.phase === "compared" ? "learnCompared" : "learnOpen";
    params = { attack: T(ABY[experiment.id].n), wall: experiment.wall ? wname(experiment.wall) : "", outcome: S("kind_" + experiment.outcome) };
  }
  var text = S(key, params);
  if (experiment && experiment.phase === "compared" && experiment.prediction) {
    var through = experiment.outcome === "breached", guessedThrough = experiment.prediction === "through";
    text = S(through === guessedThrough ? "predictMatched" : "predictSurprise") + " " + text;
  }
  $("learnText").textContent = text;
  var predicting = !!(experiment && experiment.phase === "baseline");
  $("learnPredict").hidden = !predicting;
  $("learnRun").hidden = predicting;
  $("learnRun").textContent = S(experiment ? "learnAgain" : "learnStart");
  $("learnRestore").hidden = !experiment;
}
function commitPrediction(prediction) {
  if (!experiment || experiment.phase !== "baseline") return;
  experiment.prediction = prediction;
  C[experiment.wall] = false;
  changed(S("offX") + wname(experiment.wall));
  var compared = simulate(experiment.id);
  experiment.phase = "compared"; experiment.outcome = compared.outcome;
  syncExperiment();
  launch(experiment.id);
  $("learnRestore").focus();
}
$("predStop").addEventListener("click", function () { commitPrediction("stopped"); });
$("predThrough").addEventListener("click", function () { commitPrediction("through"); });
function restoreExperiment() {
  if (!experiment) return;
  clearFx();
  Object.keys(experiment.config).forEach(function (id) { C[id] = experiment.config[id]; });
  experiment = null;
  changed(S("learnRestored"));
  $("result").className = "result";
  syncExperiment();
  $("learnText").textContent = S("learnRestored");
}
var experimentRound = 0;
$("learnRun").addEventListener("click", function () {
  if (experiment) restoreExperiment();
  var candidates = ATTACKS.filter(function (a) { var s = simulate(a.id); return s.wall && s.outcome !== "breached"; });
  var candidate = candidates.length ? candidates[experimentRound++ % candidates.length] : ATTACKS[0];
  var baseline = simulate(candidate.id);
  experiment = { config: snapshotConfig(), id: candidate.id, wall: baseline.wall, outcome: baseline.outcome, phase: baseline.wall && baseline.outcome !== "breached" ? "baseline" : "open" };
  syncExperiment();
  launch(experiment.id);
  var first = $("learnPredict").hidden ? $("learnRestore") : $("predStop");
  first.focus();
});
$("learnRestore").addEventListener("click", function () { restoreExperiment(); $("learnRun").focus(); });
/* `before` makes the change undoable from the confirmation toast. */
function changed(msg, before) {
  store.set("cfg", C);
  $("preset").value = matchPreset();
  syncWalls(); paintState(); syncFriends(); syncMapText();
  var delta = scoreAll(!!before);
  if (msg) logEvent("info", msg, "");
  if (inspected) inspect(inspected);
  if (before) {
    toast(msg + (delta ? " · " + delta : ""), { t: S("undo"), f: function () {
      setConfig(before);
      changed(S("undone"));
    } });
  }
}
$("preset").addEventListener("change", function () {
  var v = $("preset").value, before = snapshotConfig(); applyPreset(v);
  changed(S("scenarioX") + $("preset").selectedOptions[0].textContent, before);
  if (isNarrow()) setView("attacks");
});
$("score").addEventListener("click", function () { setView("attacks"); });

function isNarrow() { return window.matchMedia("(max-width: 1080px)").matches; }
var SIDE_TABS = ["attacks", "friends", "chat", "test", "trace", "log"];
var activeTab = "attacks";
function selectTab(name) {
  activeTab = name;
  D.querySelectorAll(".tab").forEach(function (t) {
    var n = t.getAttribute("data-tab"), selected = n === name;
    if (!t.id) t.id = "tab-" + n;
    t.setAttribute("aria-controls", "tp-" + n);
    t.setAttribute("aria-selected", selected ? "true" : "false"); t.tabIndex = selected ? 0 : -1;
    $("tp-" + n).setAttribute("aria-labelledby", t.id);
  });
  SIDE_TABS.forEach(function (n) {
    var p = $("tp-" + n), selected = n === name;
    p.classList.toggle("on", selected); p.toggleAttribute("inert", !selected); p.tabIndex = 0;
  });
  D.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-tool") === name ? "true" : "false"); });
  if (name === "friends") renderFriends(null, true);
}
function setView(v) {
  if (v === "tools") v = activeTab === "attacks" ? "friends" : activeTab;
  appEl.setAttribute("data-view", v);
  if (SIDE_TABS.indexOf(v) >= 0) { selectTab(v); if (!isNarrow() && !panelOpen("r")) setPanel("r", true, true); }
  if (!isNarrow()) { syncInert(); return; }
  if (v !== "map") closeInspector();
  $("vMap").classList.toggle("on", v === "map");
  $("vWalls").classList.toggle("on", v === "walls");
  $("vSide").classList.toggle("on", SIDE_TABS.indexOf(v) >= 0);
  D.querySelectorAll("#mtabs button").forEach(function (b) {
    var name = b.getAttribute("data-view"), selected = name === v || (name === "tools" && SIDE_TABS.indexOf(v) > 0);
    b.removeAttribute("aria-selected");
    if (selected) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  syncInert();
  if (v === "map") setTimeout(function () { renderMap(); }, 0);
}
D.querySelectorAll(".tab").forEach(function (t) {
  t.addEventListener("click", function () { setView(t.getAttribute("data-tab")); });
  t.addEventListener("keydown", function (e) {
    var tabs = Array.prototype.slice.call(D.querySelectorAll(".tab")), index = tabs.indexOf(t), next;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else if (e.key === "ArrowRight") next = (index + (isRTL() ? -1 : 1) + tabs.length) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index + (isRTL() ? 1 : -1) + tabs.length) % tabs.length;
    else return;
    e.preventDefault(); setView(tabs[next].getAttribute("data-tab")); tabs[next].focus();
  });
});
D.querySelectorAll("#mtabs button").forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
D.querySelectorAll("[data-tool]").forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-tool")); }); });
D.querySelector(".skip-link").addEventListener("click", function () { setView("map"); $("vMap").focus(); });

/* ------------------------------------------------------------------ theme + toast */
function applyTheme(t) { if (t) R.setAttribute("data-theme", t); else R.removeAttribute("data-theme"); syncThemeColor(); }
applyTheme(store.get("theme", ""));
$("themeBtn").addEventListener("click", function () {
  var dark = R.getAttribute("data-theme") ? R.getAttribute("data-theme") === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  var next = dark ? "light" : "dark"; applyTheme(next); store.set("theme", next);
});
function toast(msg, act) {
  var t = $("toast"); t.innerHTML = H(msg); t.classList.toggle("act", !!act);
  if (act) { var b = el("button", { type: "button" }, H(act.t)); b.addEventListener("click", function () { t.classList.remove("on"); act.f(); }); t.appendChild(b); }
  t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, act ? 9000 : 2300);
}
D.addEventListener("keydown", function (e) { if (e.key === "Escape") closeInspector(); });

/* ------------------------------------------------------------------ collapsible side panels */
var mainEl = $("main");
function panelOpen(side) { return !mainEl.classList.contains(side === "l" ? "hide-l" : "hide-r"); }
function syncPanelButtons(side) {
  var open = panelOpen(side), label = S(side === "l" ? (open ? "hideWalls" : "showWalls") : (open ? "hideTools" : "showTools"));
  var btn = side === "l" ? $("togL") : $("togR"), edge = side === "l" ? $("edgeL") : $("edgeR");
  btn.setAttribute("aria-pressed", open ? "true" : "false");
  [btn, edge].forEach(function (b) { b.title = label; b.setAttribute("aria-label", label); b.setAttribute("aria-expanded", open ? "true" : "false"); });
}
function setPanel(side, open, quiet) {
  var cls = side === "l" ? "hide-l" : "hide-r", pane = side === "l" ? $("vWalls") : $("vSide");
  mainEl.classList.toggle(cls, !open);
  syncPanelButtons(side);
  if (!isNarrow()) { if (open) pane.removeAttribute("inert"); else pane.setAttribute("inert", ""); }
  var st = store.get("panels", { l: true, r: true }); st[side] = open; store.set("panels", st);
  if (!quiet) toast(S(open ? (side === "l" ? "wallsShown" : "toolsShown") : (side === "l" ? "wallsHidden" : "toolsHidden")));
}
$("togL").addEventListener("click", function () { setPanel("l", !panelOpen("l")); });
$("togR").addEventListener("click", function () { setPanel("r", !panelOpen("r")); });
$("edgeL").addEventListener("click", function () { setPanel("l", !panelOpen("l"), true); });
$("edgeR").addEventListener("click", function () { setPanel("r", !panelOpen("r"), true); });
D.addEventListener("keydown", function (e) {
  var tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable || isNarrow() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "[") { e.preventDefault(); setPanel("l", !panelOpen("l"), true); }
  if (e.key === "]") { e.preventDefault(); setPanel("r", !panelOpen("r"), true); }
  if (e.key === "\\") { e.preventDefault(); var both = panelOpen("l") || panelOpen("r"); setPanel("l", !both, true); setPanel("r", !both, true); }
});
var mqNarrow = window.matchMedia("(max-width: 1080px)");
function syncInert() {
  ["vMap", "vWalls", "vSide"].forEach(function (id) {
    var pane = $(id), visible = isNarrow() ? pane.classList.contains("on") : id === "vMap" || panelOpen(id === "vWalls" ? "l" : "r");
    pane.toggleAttribute("inert", !visible);
  });
  $("fab").toggleAttribute("inert", isNarrow() && appEl.getAttribute("data-view") !== "map");
}
if (mqNarrow.addEventListener) mqNarrow.addEventListener("change", function () { setView(appEl.getAttribute("data-view") || "map"); });

/* ------------------------------------------------------------------ language */
function syncLanguageSelect() {
  var select = $("langSelect"), codes = Object.keys(I18N.langs);
  /* Build once per registry change; keep the focused native control and its options. */
  if (select.options.length !== codes.length || codes.some(function (code, i) { return select.options[i].value !== code; })) {
    select.textContent = "";
    codes.forEach(function (code) {
      var meta = LM(code), option = el("option", { value: code, lang: code, dir: meta.dir, "data-script": meta.script || "" });
      option.textContent = meta.name;
      select.appendChild(option);
    });
  }
  select.value = LANG;
  select.setAttribute("aria-label", S("languageLabel"));
  select.title = S("languageLabel");
}
function applyStatic() {
  D.querySelectorAll("[data-i18n]").forEach(function (n) { n.innerHTML = H(STR[n.getAttribute("data-i18n")]); });
  D.querySelectorAll("[data-i18n-html]").forEach(function (n) { n.innerHTML = T(STR[n.getAttribute("data-i18n-html")]); });
  D.querySelectorAll("#preset option").forEach(function (o) { o.textContent = S(o.getAttribute("data-i18n")); });
  syncLanguageSelect();
  $("themeBtn").setAttribute("aria-label", S("themeAria")); $("themeBtn").title = S("themeAria");
  $("score").title = S("scoreTitle");
  $("resX").setAttribute("aria-label", S("dismiss"));
  $("sendBtn").setAttribute("aria-label", S("sendAria"));
  $("mtabs").setAttribute("aria-label", S("labNavigation"));
  $("toolNav").setAttribute("aria-label", S("toolNavigation"));
  $("atkFilter").setAttribute("aria-label", S("filterAria"));
  D.querySelector(".tabs").setAttribute("aria-label", S("toolsHeading"));
  ["l", "r"].forEach(syncPanelButtons);
  D.title = S("docTitle");
  setWho(who);
  friendsStatic();
  syncPlayback();
  syncExperiment();
}
function resetChat() { $("msgs").innerHTML = ""; sys("", STR.chatWelcome); renderQuick(); }
function setLang(lang, animate) {
  if (!Object.prototype.hasOwnProperty.call(I18N.langs, lang)) return;
  LANG = lang;
  R.lang = lang; R.dir = LM().dir;
  R.setAttribute("data-script", LM().script || "");
  store.set("lang", lang);
  applyStatic();
  renderWalls();
  renderAttacks();
  stopPlayback();
  renderMap(true);
  resetChat();
  if (lastSim) renderTrace(ABY[lastSim.id].n, lastSim.s);
  var r = $("result");
  if (r.classList.contains("on") && lastSim && !r.classList.contains("running")) finishResult(lastSim.id, lastSim.s);
  else r.className = "result";
  if (inspected) inspect(inspected);
  renderFriends();
  syncInstall();
  if (dlg.open) { renderSwatches(); dPreview(true); }
  if (animate && !reduced) { var app = D.querySelector(".app"); app.classList.remove("swap"); void app.offsetWidth; app.classList.add("swap"); }
}
$("langSelect").addEventListener("change", function () { if (this.value !== LANG) setLang(this.value, true); });

/* ------------------------------------------------------------------ friends: roster, add dialog, live provisioning */
var ICON = {
  bridge: '<svg viewBox="0 0 24 24"><path d="M3 18h18M5 18v-7M19 18v-7M3 11c3.2 0 5.6-4 9-4s5.8 4 9 4M9.5 18v-5.5M14.5 18v-5.5"/></svg>',
  proxy: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12h6M13 9.5l2.5 2.5-2.5 2.5"/></svg>',
  box: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7.5 10l2.5 2-2.5 2M12.5 14.5h4"/></svg>',
  sand: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
var appEl = D.querySelector(".app");
function bump(e, cls) { cls = cls || "bump"; e.classList.remove(cls); void e.getBoundingClientRect(); e.classList.add(cls); }
function scrollToEl(e) { if (!e || !e.scrollIntoView) return; try { e.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center", inline: "center" }); } catch (x) { /* old engines */ } }
function nextN() { for (var i = 1; i <= 9; i++) if (!FRIENDS.some(function (f) { return f.n === i; })) return i; return 0; }
function asciiDigits(s) { return String(s).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }); }
var FA2L = { "ا": "a", "آ": "a", "أ": "a", "إ": "e", "ب": "b", "پ": "p", "ت": "t", "ث": "s", "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ذ": "z", "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s", "ض": "z", "ط": "t", "ظ": "z", "ع": "", "غ": "gh", "ف": "f", "ق": "gh", "ک": "k", "ك": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n", "و": "v", "ه": "h", "ة": "h", "ی": "i", "ي": "i", "ئ": "", "ء": "", "ؤ": "o" };
function slugify(s) {
  s = String(s).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = Array.from(s).map(function (ch) { return FA2L[ch] != null ? FA2L[ch] : ch; }).join("");
  return s.replace(/[\s_.]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^[-0-9]+/, "").slice(0, 15).replace(/-+$/, "");
}

/* ---- map build masking: parts of a friend being provisioned stay hidden until their step runs */
var building = null, provSpeed = 1;
var PARTS = ["zone", "zw", "hermes", "sandbox", "ehs", "proxy", "ehp", "eptg", "epllm", "actor"];
function partSel(fid, k) {
  return {
    zone: '[data-zone="br-' + fid + '"]', zw: '[data-zone="br-' + fid + '"] .zw',
    hermes: '[data-node="hermes-' + fid + '"]', sandbox: '[data-node="sandbox-' + fid + '"]', proxy: '[data-node="proxy-' + fid + '"]', actor: '[data-node="' + fid + '"]',
    ehs: '[data-e="hermes-' + fid + '|sandbox-' + fid + '"]', ehp: '[data-e="hermes-' + fid + '|proxy-' + fid + '"]',
    eptg: '[data-e="proxy-' + fid + '|tg"]', epllm: '[data-e="proxy-' + fid + '|llm"]'
  }[k];
}
function partEls(fid, k) { return svg ? Array.prototype.slice.call(svg.querySelectorAll(partSel(fid, k))) : []; }
function applyBuildMask() {
  if (!building) return;
  PARTS.forEach(function (k) { if (!building.shown[k]) partEls(building.f.id, k).forEach(function (e) { e.classList.add("bh"); }); });
}
function reveal(k) {
  if (!building) return;
  building.shown[k] = true;
  partEls(building.f.id, k).forEach(function (e) {
    e.classList.remove("bh");
    if (reduced) return;
    var isZone = e.classList.contains("zone"), isEdge = e.classList.contains("edge");
    var cls = e.classList.contains("node") ? "pop" : (isZone || isEdge) ? "draw" : "fade";
    var tgt = isZone ? e.firstChild : e;
    if (cls === "draw") tgt.setAttribute("pathLength", "1");
    e.classList.add(cls);
    setTimeout(function () { e.classList.remove(cls); if (cls === "draw") tgt.removeAttribute("pathLength"); }, 1500);
  });
}
function focusFriend(id, on) { ["zone", "hermes", "sandbox", "proxy", "actor"].forEach(function (k) { partEls(id, k).forEach(function (e) { e.classList.toggle("focus", on); }); }); }
function flashZone(id) {
  var z = zoneEls["br-" + id]; if (!z) return;
  bump(z, "fresh"); clearTimeout(z._ft); z._ft = setTimeout(function () { z.classList.remove("fresh"); }, 4400);
}
function showFriend(id) {
  if (!FBY[id]) return;
  if (isNarrow()) setView("map");
  setTimeout(function () { scrollToEl(zoneEls["br-" + id]); flashZone(id); inspect("hermes-" + id); }, 60);
}

/* ---- roster */
function friendStatus() {
  var on = [1, 2, 3, 4, 5, 6].filter(function (Ln) { return WALLS.filter(function (w) { return w.L === Ln; }).every(function (w) { return C[w.id]; }); }).length;
  return { cls: on === 6 ? "blocked" : on >= 4 ? "contained" : "breached", txt: on === 6 ? S("isolated") : N(on) + "/" + N(6) + " " + S("layersW") };
}
function renderFriends(freshId, animateAll) {
  var list = $("frList"); if (!list) return;
  list.innerHTML = "";
  var st = friendStatus();
  FRIENDS.forEach(function (f, i) {
    var busy = building && building.f.id === f.id, enter = animateAll || f.id === freshId;
    var c = el("div", { "class": "fcard" + (enter ? " enter" : "") + (f.id === freshId ? " fresh" : "") + (busy ? " busy" : ""), "data-f": f.id, tabindex: "0", style: "--fc:" + f.c + ";--i:" + i });
    c.innerHTML = '<span class="fav">' + esc(initials(T(f.name))) + '</span>' +
      '<span class="fn"><b>' + H(f.name) + '</b><span><bdi dir="ltr">@' + esc(f.id) + " · " + esc(f.tg) + "</bdi></span></span>" +
      '<span class="fside">' + (f.core ? '<span class="demo">' + H(STR.demo) + "</span>" : "") +
      '<span class="pill ' + (busy ? "busy" : st.cls) + '">' + H(busy ? S("building") : st.txt) + "</span>" +
      (f.core || busy ? "" : '<button type="button" class="frm" aria-label="' + esc(S("removeAria")) + '">' + ICON.trash + "<span></span></button>") + "</span>" +
      '<span class="ftags"><span class="tagc">br-' + esc(f.id) + '</span><span class="tagc">10.91.' + f.n + '.0/24</span><span class="tagc">:' + fport(f) + '</span><span class="tagc">gVisor</span></span>';
    c.addEventListener("click", function () { if (!busy) showFriend(f.id); });
    c.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); if (!busy) showFriend(f.id); } });
    c.addEventListener("mouseenter", function () { focusFriend(f.id, true); });
    c.addEventListener("mouseleave", function () { focusFriend(f.id, false); });
    var rm = c.querySelector(".frm");
    if (rm) rm.addEventListener("click", function (e) {
      e.stopPropagation();
      if (rm.classList.contains("arm")) { removeFriend(f.id); return; }
      rm.classList.add("arm"); rm.querySelector("span").textContent = S("sure");
      clearTimeout(rm._t); rm._t = setTimeout(function () { rm.classList.remove("arm"); rm.querySelector("span").textContent = ""; }, 3200);
    });
    list.appendChild(c);
  });
  var left = MAXF - FRIENDS.length;
  if (left > 0) {
    var slot = el("button", { type: "button", "class": "slot" + (animateAll ? " enter" : ""), style: "--i:" + FRIENDS.length }, ICON.plus + "<span>" + H(S("slotsLeft", { n: left })) + "</span>");
    slot.addEventListener("click", openAdd);
    list.appendChild(slot);
  }
  var segs = $("capSegs"); segs.innerHTML = "";
  for (var k = 0; k < MAXF; k++) {
    var s = el("i", FRIENDS[k] ? { "class": "on" + (FRIENDS[k].id === freshId ? " pulse" : ""), style: "--sc:" + FRIENDS[k].c } : null);
    segs.appendChild(s);
  }
  $("capTxt").textContent = N(FRIENDS.length) + " / " + N(MAXF);
  $("frCnt").textContent = N(FRIENDS.length);
  ["addBtn", "addBtn2", "fab"].forEach(function (id) { $(id).classList.toggle("full", left <= 0); });
}
function syncFriends() {
  var st = friendStatus();
  D.querySelectorAll(".fcard:not(.busy) .pill").forEach(function (p) { p.className = "pill " + st.cls; p.innerHTML = H(st.txt); });
}
function removeFriend(id) {
  var f = FBY[id];
  if (!f || f.core || (building && building.f.id === id)) return;
  var nm = T(f.name), card = D.querySelector('.fcard[data-f="' + id + '"]');
  if (inspected && friendOf(inspected) === f) closeInspector();
  playToken++; clearFx(); $("result").className = "result";
  PARTS.forEach(function (k) { partEls(id, k).forEach(function (e) { e.classList.add("bye"); }); });
  if (card && !reduced) {
    card.style.height = card.offsetHeight + "px";
    card.classList.add("leaving");
    requestAnimationFrame(function () { card.style.height = "0px"; });
  }
  setTimeout(function () {
    FRIENDS = FRIENDS.filter(function (x) { return x.id !== id; });
    saveFriends(); rebuildTopology(); renderMap(true); renderFriends();
    logEvent("info", S("logRemoved"), nm + " · br-" + id);
    toast(S("removed", { name: nm }));
  }, reduced ? 0 : 480);
}

/* ---- add dialog */
var dlg = $("addDlg"), form = $("addForm"), dstate = null;
function renderSwatches() {
  var box = $("swatches"); box.innerHTML = "";
  COLORS.forEach(function (c, i) {
    var on = c === dstate.c;
    var b = el("button", { type: "button", "class": "swatch", role: "radio", "aria-checked": on ? "true" : "false", tabindex: on ? "0" : "-1", "aria-label": S("fColor") + " " + N(i + 1), style: "--c:" + c }, ICON.check);
    b.addEventListener("click", function () { pickColor(c, false); });
    b.addEventListener("keydown", function (e) {
      var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      if (isRTL() && (e.key === "ArrowRight" || e.key === "ArrowLeft")) d = -d;
      pickColor(COLORS[(i + d + COLORS.length) % COLORS.length], true);
    });
    box.appendChild(b);
  });
}
function pickColor(c, focus) {
  dstate.c = c;
  Array.prototype.forEach.call($("swatches").children, function (b, i) {
    var on = COLORS[i] === c; b.setAttribute("aria-checked", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  dPreview();
  bump($("dAv"));
}
function planTiles() {
  var h = $("inHandle").value || "friend", n = dstate.n;
  return [
    ["pBridge", "br-" + h, "10.91." + n + ".0/24", ICON.bridge],
    ["pProxy", "iron-proxy@" + h, "10.90.0.10:" + (8080 + n), ICON.proxy],
    ["pHermes", "hermes-" + h, "10.91." + n + ".10", ICON.box],
    ["pSandbox", "sandbox-" + h, "10.91." + n + ".11 · gVisor", ICON.sand]
  ];
}
function dPreview(rebuild) {
  if (!dstate) return;
  form.style.setProperty("--fc", dstate.c);
  var av = $("dAv"), ini = initials($("inName").value);
  if (av.textContent !== ini) { av.textContent = ini; bump(av); }
  var plan = $("plan"), tiles = planTiles();
  if (rebuild || plan.children.length !== tiles.length) {
    plan.innerHTML = tiles.map(function (t, i) {
      return '<div class="pt" style="--i:' + i + '"><span class="pi">' + t[3] + "</span><small>" + H(STR[t[0]]) + '</small><b dir="ltr">' + esc(t[1]) + '</b><em dir="ltr">' + esc(t[2]) + "</em></div>";
    }).join("");
  } else tiles.forEach(function (t, i) {
    var b = plan.children[i].querySelector("b");
    if (b.textContent !== t[1]) { b.textContent = t[1]; bump(b, "tick"); }
  });
  validate();
}
function validate() {
  var nm = $("inName").value.trim(), h = $("inHandle").value, tg = $("inTg").value, e = {};
  if (!nm) e.fName = S("eName");
  else if (FRIENDS.some(function (f) { return Object.keys(I18N.langs).some(function (lang) { return String(TL(f.name, lang)).toLowerCase() === nm.toLowerCase(); }); })) e.fName = S("eNameDup");
  if (!/^[a-z][a-z0-9-]{1,14}$/.test(h) || /-$/.test(h)) e.fHandle = S("eHandle");
  else if (!validHandle(h) || FBY[h]) e.fHandle = S("eHandleDup");
  if (!/^\d{5,12}$/.test(tg)) e.fTg = S("eTg");
  else if (FRIENDS.some(function (f) { return f.tg === tg; })) e.fTg = S("eTgDup");
  setField("fName", e.fName, S("fNameHint"), nm);
  setField("fHandle", e.fHandle, S("fHandleHint", { handle: h || "…" }), h);
  setField("fTg", e.fTg, S("fTgHint"), tg);
  return e;
}
function setField(id, err, hint, val) {
  var f = $(id), show = !!(err && (dstate.tried || (dstate.touched[id] && val)));
  f.classList.toggle("err", show);
  f.classList.toggle("ok", !err);
  var help = f.querySelector(".hint"), input = f.querySelector("input");
  help.id = id + "-help"; help.innerHTML = H(show ? err : hint);
  input.setAttribute("aria-describedby", help.id);
  input.setAttribute("aria-invalid", show ? "true" : "false");
}
function nope(b) { if (b) bump(b, "nope"); }
function openAdd() {
  if (building) { toast(S("busy")); return; }
  if (FRIENDS.length >= MAXF) { toast(S("eFull", { n: MAXF })); nope(D.activeElement && D.activeElement.closest ? D.activeElement.closest(".addbtn,.fab,.slot") : null); return; }
  if (dlg.open) return;
  var used = FRIENDS.map(function (f) { return f.c; });
  dstate = { n: nextN(), c: COLORS.filter(function (c) { return used.indexOf(c) < 0; })[0] || COLORS[2], handleTouched: false, tried: false, touched: {} };
  $("inName").value = ""; $("inHandle").value = ""; $("inTg").value = "";
  ["fName", "fHandle", "fTg"].forEach(function (k) { $(k).classList.remove("err", "ok"); });
  form.classList.remove("settled", "shake");
  form.style.transform = ""; form.style.transition = "";
  renderSwatches(); dPreview(true);
  dlg.classList.remove("closing");
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  setTimeout(function () { if (!coarse) $("inName").focus(); }, reduced ? 0 : 280);
}
function closeAdd(instant) {
  if (!dlg.open) return;
  if (instant || reduced) { dlg.classList.remove("closing"); dlg.close(); return; }
  dlg.classList.add("closing");
  setTimeout(function () { dlg.classList.remove("closing"); if (dlg.open) dlg.close(); }, 270);
}
form.addEventListener("animationend", function (e) { if (e.target === form && /^(dIn|sUp)$/.test(e.animationName)) form.classList.add("settled"); });
dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeAdd(); });
$("dWrap").addEventListener("click", function (e) { if (e.target === $("dWrap")) closeAdd(); });
$("dX").addEventListener("click", function () { closeAdd(); });
$("dCancel").addEventListener("click", function () { closeAdd(); });
$("inName").addEventListener("input", function () {
  if (!dstate.handleTouched) $("inHandle").value = slugify($("inName").value);
  dPreview();
});
$("inHandle").addEventListener("input", function () {
  var i = $("inHandle"), v = i.value.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (v !== i.value) i.value = v;
  dstate.handleTouched = v !== "";
  dPreview();
});
$("inTg").addEventListener("input", function () {
  var i = $("inTg"), v = asciiDigits(i.value).replace(/\D/g, "").slice(0, 12);
  if (v !== i.value) i.value = v;
  validate();
});
["inName", "inHandle", "inTg"].forEach(function (id) {
  $(id).addEventListener("blur", function () { if (!dstate) return; dstate.touched[$(id).parentNode.id] = true; validate(); });
});
$("dice").addEventListener("click", function () {
  $("inTg").value = String(100000000 + Math.floor(Math.random() * 899999999));
  bump($("dice"), "roll"); dstate.touched.fTg = true; validate();
});
/* drag the bottom sheet down to dismiss (phones) */
(function () {
  var y0 = null, dy = 0, t0 = 0;
  function down(e) {
    if (!window.matchMedia("(max-width: 640px)").matches || e.target.closest("button,input")) return;
    y0 = e.clientY; dy = 0; t0 = performance.now(); form.style.transition = "none";
  }
  function move(e) { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); form.style.transform = "translateY(" + dy + "px)"; }
  function up() {
    if (y0 == null) return;
    var v = dy / Math.max(1, performance.now() - t0); y0 = null;
    if (dy > 110 || (v > 0.55 && dy > 30)) { form.style.transition = ""; closeAdd(); }
    else { form.style.transition = "transform .45s var(--spring)"; form.style.transform = ""; }
  }
  $("dHero").addEventListener("pointerdown", down);
  form.querySelector(".grab").addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
})();
form.addEventListener("submit", function (e) {
  e.preventDefault();
  dstate.tried = true;
  var errs = validate(), bad = Object.keys(errs);
  if (bad.length) {
    bump(form, "shake");
    $(bad[0]).querySelector("input").focus();
    return;
  }
  var nm = $("inName").value.trim();
  var f = { id: $("inHandle").value, name: nm, n: dstate.n, tg: $("inTg").value, c: dstate.c, t: Date.now() };
  var rect = form.getBoundingClientRect();
  closeAdd(true);
  fadeBackdrop();
  addFriend(f, rect);
});
function fadeBackdrop() {
  if (reduced) return;
  var b = el("div", { "class": "fakebd" });
  D.body.appendChild(b);
  b.addEventListener("animationend", function () { b.remove(); });
}

/* ---- provisioning: dock card + map build, step by step */
function provSteps(f) {
  var id = f.id, br = "br-" + id, p = fport(f);
  return [
    { k: STR.pS1, show: ["zone"], at: "zone", cmd: ["incus network create " + br + " ipv4.address=10.91." + f.n + ".1/24 ipv4.nat=false ipv6.address=none", "incus network set " + br + ' raw.dnsmasq="no-resolv"'], out: ["Network " + br + " created · no NAT · no upstream DNS"] },
    { k: STR.pS2, show: ["zw"], at: "zone", cmd: ["incus network acl create acl-" + id, "incus network acl rule add acl-" + id + " egress action=allow destination=10.90.0.10/32 protocol=tcp destination_port=" + p, "incus network set " + br + " security.acls=acl-" + id + " security.acls.default.egress.action=drop"], out: ["acl-" + id + ": 1 allow rule · default egress drop (logged)"] },
    { k: STR.pS3, show: ["hermes"], at: "hermes", cmd: ["incus launch images:debian/13 hermes-" + id + " --network " + br + " -c security.idmap.isolated=true -c limits.processes=512"], out: ["hermes-" + id + " · " + fip(f, 10) + " · unprivileged, own idmap"] },
    { k: STR.pS4, show: ["sandbox", "ehs"], at: "sandbox", cmd: ["incus launch images:debian/13 sandbox-" + id + " --network " + br + " -c security.idmap.isolated=true", "incus config device override sandbox-" + id + " eth0 security.acls=acl-deny-all"], out: ["sandbox-" + id + " · " + fip(f, 11) + " · runsc --network=none"] },
    { k: STR.pS5, show: ["proxy", "ehp", "eptg", "epllm"], at: "proxy", cmd: ["incus exec infra -- systemctl enable --now iron-proxy@" + id], out: ["iron-proxy@" + id + " listening on 10.90.0.10:" + p + " · 2 domains · require: true"] },
    { k: STR.pS6, show: ["actor"], at: "actor", cmd: ["incus exec hermes-" + id + " -- sed -i 's/^TELEGRAM_ALLOWED_USERS=.*/TELEGRAM_ALLOWED_USERS=" + f.tg + "/' /home/hermes/.hermes/.env"], out: ["allowlist: " + f.tg + " · unauthorized_dm_behavior: ignore"] },
    { k: STR.pS7, show: [], at: "hermes", cmd: ["incus exec hermes-" + id + " -- bash /root/selftest.sh"], out: [], test: true }
  ];
}
function provRender(f, steps) {
  var p = $("prov");
  p.style.setProperty("--fc", f.c);
  p.innerHTML = '<div class="prov-h"><span class="fav">' + esc(initials(T(f.name))) + '</span><div class="pv-t"><b>' + H(S("provH", { name: T(f.name) })) + '</b><span id="pvNow"></span></div>' +
    '<span class="pct" id="pvPct"></span><button class="prov-skip" type="button" id="pvSkip">' + H(STR.skip) + "</button></div>" +
    '<div class="pbar"><i id="pvBar"></i></div>' +
    '<ol class="psteps" id="pvSteps">' + steps.map(function (s) { return '<li><span class="si">' + ICON.check + "</span><span>" + H(s.k) + "</span></li>"; }).join("") + "</ol>" +
    '<div class="pterm" id="pvTerm" dir="ltr"></div>';
  $("pvSkip").addEventListener("click", function () { provSpeed = 0.12; this.disabled = true; });
  provPct(0);
}
function provShow(fromRect) {
  var p = $("prov");
  p.classList.remove("out"); p.classList.add("on");
  if (reduced || !fromRect || !p.animate) return;
  var to = p.getBoundingClientRect();
  p.animate([
    { transformOrigin: "0 0", transform: "translate(" + (fromRect.left - to.left) + "px," + (fromRect.top - to.top) + "px) scale(" + (fromRect.width / to.width) + "," + (fromRect.height / to.height) + ")", opacity: 0.4 },
    { transformOrigin: "0 0", transform: "none", opacity: 1 }
  ], { duration: 650, easing: "cubic-bezier(.22,1,.36,1)" });
}
function provClose() {
  var p = $("prov");
  if (!p.classList.contains("on")) return;
  if (reduced) { p.className = "prov"; p.innerHTML = ""; return; }
  p.classList.add("out");
  setTimeout(function () { p.className = "prov"; p.innerHTML = ""; }, 340);
}
function provStep(i, s) { var ol = $("pvSteps"); if (ol && ol.children[i]) ol.children[i].className = s; }
function provPct(x) { var v = Math.round(x * 100); $("pvBar").style.width = v + "%"; $("pvPct").textContent = S("pct", { n: v }); }
function termLine(html) {
  var t = $("pvTerm"), d = el("div", null, html);
  if (!t) return d;
  t.appendChild(d);
  while (t.children.length > 40) t.removeChild(t.firstChild);
  return d;
}
async function typeCmd(cmd) {
  var line = termLine('<span class="pr">host$</span> <span class="tx"></span><span class="cur"></span>'), tx = line.querySelector(".tx");
  if (reduced || provSpeed < 1) tx.textContent = cmd;
  else for (var i = 0; i < cmd.length; i += 4) {
    tx.textContent = cmd.slice(0, i + 4);
    await sleep(11);
    if (provSpeed < 1) { tx.textContent = cmd; break; }
  }
  var cur = line.querySelector(".cur"); if (cur) cur.remove();
  await sleep(110 * provSpeed);
}
async function miniTest() {
  var lines = selftestLines(), failed = 0;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    if (l.h) continue;
    if (!l.ok) failed++;
    termLine((l.ok ? '<span class="okl">OK  </span> ' : '<span class="fl">FAIL</span> ') + esc(l.t));
    await sleep(48 * provSpeed);
  }
  termLine(failed ? '<span class="fl">' + failed + " FAILED · do not share access yet</span>" : '<span class="okl">ALL TESTS PASSED</span>');
  return failed;
}
async function addFriend(f, fromRect) {
  FRIENDS.push(f); saveFriends(); rebuildTopology();
  building = { f: f, shown: {} };
  provSpeed = reduced ? 0.15 : 1;
  appEl.classList.add("building");
  playToken++; closeInspector(); $("result").className = "result";
  if (isNarrow()) setView("map");
  renderMap(true);
  renderFriends(f.id);
  logEvent("info", S("logAdded"), T(f.name) + " · br-" + f.id + " · 10.91." + f.n + ".0/24");
  var steps = provSteps(f);
  provRender(f, steps);
  provShow(fromRect);
  await sleep(reduced ? 0 : 500);
  var failed = 0;
  for (var i = 0; i < steps.length; i++) {
    var st = steps[i];
    provStep(i, "run");
    $("pvNow").innerHTML = H(st.k);
    for (var c = 0; c < st.cmd.length; c++) await typeCmd(st.cmd[c]);
    st.show.forEach(reveal);
    var focusEl = partEls(f.id, st.at)[0];
    if (focusEl && (i === 0 || st.at === "actor" || isNarrow())) scrollToEl(focusEl);
    if (st.test) {
      failed = await miniTest();
      await play([
        { at: f.id, text: STR.helloBot, kind: "n" },
        { at: "tg", text: CH.tgDeliver, kind: "n" },
        { at: "hermes-" + f.id, text: CH.gwRecv, kind: "n" },
        { at: "proxy-" + f.id, text: CH.modelCall, kind: "ok" },
        { at: "llm", text: CH.orAns, kind: "ok" },
        { at: "hermes-" + f.id, text: failed ? STR.isoWarn : K("isoOk", { name: f.name }), kind: failed ? "cnt" : "blk" }
      ], { fast: provSpeed < 1 });
    } else {
      await sleep(420 * provSpeed);
      st.out.forEach(function (o) { termLine('<span class="okl">✓</span> ' + esc(o)); });
      await sleep(260 * provSpeed);
    }
    provStep(i, st.test && failed ? "warn" : "done");
    provPct((i + 1) / steps.length);
  }
  building = null;
  appEl.classList.remove("building");
  if (svg) svg.querySelectorAll(".bh").forEach(function (e) { e.classList.remove("bh"); });
  await sleep(reduced ? 0 : 350);
  provDone(f, failed);
  renderFriends(f.id);
  flashZone(f.id);
  var tok = playToken;
  setTimeout(function () { if (tok === playToken) clearFx(); }, 3500);
}
function provDone(f, failed) {
  var p = $("prov"), nm = T(f.name), full = FRIENDS.length >= MAXF;
  p.innerHTML = '<div class="pdone' + (failed ? " warn" : "") + '"><button class="ibtn pdx" type="button" id="pvX" aria-label="' + esc(S("closeDlg")) + '">' + ICON.x + "</button>" +
    '<div class="big"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/><path d="' + (failed ? "M32 19v17M32 44.5v.5" : "M20 33.5l8 8 16-17") + '"/></svg></div>' +
    "<h3>" + H(S("doneT", { name: nm })) + "</h3><p>" + H(failed ? S("doneWarn", { n: failed }) : S("doneOk")) + "</p>" +
    '<div class="acts"><button class="chipbtn primary" type="button" id="pvMap">' + H(STR.seeMap) + "</button>" +
    (full ? "" : '<button class="chipbtn" type="button" id="pvMore">' + H(STR.addAnother) + "</button>") +
    '<button class="chipbtn" type="button" id="pvDone">' + H(STR.done) + "</button></div></div>";
  $("pvX").addEventListener("click", provClose);
  $("pvDone").addEventListener("click", provClose);
  $("pvMap").addEventListener("click", function () { provClose(); showFriend(f.id); });
  if ($("pvMore")) $("pvMore").addEventListener("click", function () { provClose(); openAdd(); });
}
function friendsStatic() {
  $("addBtn").title = S("addFriendT");
  $("frTab").title = S("tabFriends"); $("frTab").setAttribute("aria-label", S("tabFriends"));
  $("fab").setAttribute("aria-label", S("addFriend")); $("fab").title = S("addFriendT");
  $("dX").setAttribute("aria-label", S("closeDlg"));
  $("dice").setAttribute("aria-label", S("dice")); $("dice").title = S("dice");
  $("installBtn").setAttribute("aria-label", S("installT")); $("installBtn").title = S("installT");
}
["addBtn", "addBtn2", "fab"].forEach(function (id) { $(id).addEventListener("click", openAdd); });
D.addEventListener("keydown", function (e) {
  var tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey || dlg.open) return;
  if (e.key === "+") { e.preventDefault(); openAdd(); }
});

/* ------------------------------------------------------------------ PWA: install + offline + updates */
var installEvt = null;
function isStandalone() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
function syncInstall() {
  var sa = isStandalone();
  $("installBtn").hidden = !installEvt || sa;
  $("instCard").hidden = sa || !(installEvt || isIOS());
  $("instP").innerHTML = H(installEvt ? STR.installP : STR.iosHint);
  $("instBtn").hidden = !installEvt;
}
async function doInstall() {
  if (!installEvt) { toast(S("iosHint")); return; }
  var ev = installEvt; installEvt = null;
  ev.prompt();
  try { await ev.userChoice; } catch (x) { /* dismissed */ }
  syncInstall();
}
window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEvt = e; syncInstall(); });
window.addEventListener("appinstalled", function () { installEvt = null; syncInstall(); toast(S("installed")); });
$("installBtn").addEventListener("click", doInstall);
$("instBtn").addEventListener("click", doInstall);
window.addEventListener("offline", function () { toast(S("offline")); });
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  var swReload = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () { if (swReload) location.reload(); });
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      function offer(w) { if (w) toast(S("updReady"), { t: STR.reload, f: function () { swReload = true; w.postMessage("skipWaiting"); } }); }
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", function () {
        var w = reg.installing; if (!w) return;
        w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
      });
    }).catch(function () { /* opened from disk or sw.js missing: the lab still works */ });
  });
}
function syncThemeColor() {
  var forced = R.getAttribute("data-theme");
  D.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
    var dark = forced ? forced === "dark" : (m.getAttribute("media") || "").indexOf("dark") >= 0;
    m.setAttribute("content", dark ? "#1d1d1f" : "#ffffff");
  });
}

/* ------------------------------------------------------------------ boot */
applyStatic();
renderWalls();
renderMap();
renderAttacks();
selectTab("attacks");
resetChat();
$("preset").value = matchPreset();
(function () { var st = store.get("panels", { l: true, r: true }); if (!st.l) setPanel("l", false, true); if (!st.r) setPanel("r", false, true); })();
syncInert();
var rt;
function scheduleMapLayout() {
  clearTimeout(rt);
  rt = setTimeout(function () { var was = L; renderMap(); if (was !== L) clearFx(); }, 120);
}
window.addEventListener("resize", scheduleMapLayout);
if (window.ResizeObserver) {
  var mapWidth = 0;
  new ResizeObserver(function (entries) {
    var width = entries[0].contentRect.width;
    if (Math.abs(width - mapWidth) < 1) return;
    mapWidth = width; scheduleMapLayout();
  }).observe($("mapHost"));
}
if (isNarrow()) setView("map");
renderFriends(null, true);
syncInstall();
if (/[?&]action=add-friend\b/.test(location.search) || location.hash === "#add-friend") setTimeout(openAdd, reduced ? 0 : 450);
window.__lab = { C: C, simulate: simulate, ATTACKS: ATTACKS, applyPreset: applyPreset, changed: changed, setLang: setLang, H: H,
  friends: function () { return FRIENDS; }, openAdd: openAdd, removeFriend: removeFriend, buildLayout: buildLayout,
  addFriend: function (name, id, tg, c) { return addFriend({ id: id, name: name, n: nextN(), tg: tg, c: c || COLORS[2], t: Date.now() }, null); },
  skip: function () { provSpeed = 0.12; } };
})();
