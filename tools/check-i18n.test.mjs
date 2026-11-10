import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCatalog, checkProject } from "./check-i18n.mjs";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const source = { greeting: "Hello {name}", count: { one: "{n} item", other: "{n} items" } };
test("translated text may reorder/repeat placeholders and use different plural categories", () => {
  const result = checkCatalog("ar", { greeting: "{name}: hello {name}", count: { zero: "{n} items", few: "{n} items", other: "{n} items" } }, source);
  assert.deepEqual(result, { errors: [], warnings: [] });
});
test("unknown keys, empty values, missing/renamed placeholders and invalid plurals fail", () => {
  for (const catalog of [
    { ...source, extra: "Unknown" }, { ...source, greeting: "" },
    { ...source, greeting: "Hello {person}" }, { ...source, greeting: "Hello" },
    { ...source, count: { one: "{n} item" } },
    { ...source, count: { manyy: "{n} items", other: "{n} items" } },
    { ...source, count: 3 }, { ...source, count: [] }, { ...source, count: { other: null } }
  ]) assert.ok(checkCatalog("xx", catalog, source).errors.length);
});
test("partial catalogs require explicit opt-in and still report fallback keys", () => {
  assert.equal(checkCatalog("xx", {}, source).errors.length, 2);
  const result = checkCatalog("xx", {}, source, { allowMissing: true });
  assert.equal(result.errors.length, 0); assert.equal(result.warnings.length, 2);
  assert.ok(checkCatalog("xx", { greeting: "Bad {wrong}" }, source, { allowMissing: true }).errors.length);
});
test("repository registry, catalogs, script registration and precache agree", async () => {
  const result = await checkProject(fileURLToPath(new URL("../", import.meta.url)));
  assert.deepEqual(result.errors, []);
});

for (const [name, path, change, expected] of [
  ["missing precache catalog", "sw.js", text => text.replace('"./i18n/fa.js",', ""), /missing .*fa\.js in SHELL/],
  ["missing catalog script", "index.html", text => text.replace(/<script src="i18n\/fa.js"><\/script>/, ""), /load i18n\/fa\.js/],
  ["asynchronous registry", "index.html", text => text.replace('src="i18n/languages.js"', 'defer src="i18n/languages.js"'), /synchronous classic scripts/],
  ["late registry", "index.html", text => text.replace('<script src="i18n/languages.js"></script>', "").replace("</head>", '<script src="i18n/languages.js"></script></head>'), /before stylesheets/],
  ["invalid metadata", "i18n/languages.js", text => text.replace('dir: "rtl"', 'dir: "sideways"'), /dir must be/],
  ["wrong catalog registration", "i18n/fa.js", text => text.replace("strings.fa", "strings.fr"), /must register strings/],
  ["catalog syntax error", "i18n/fa.js", text => text + "\n!invalid javascript!", /i18n\/fa\.js:/]
]) test(`project check rejects ${name}`, async () => {
  const root = await mkdtemp(join(tmpdir(), "walls-i18n-"));
  try {
    await mkdir(join(root, "i18n"));
    const catalogs = (await readdir(new URL("../i18n/", import.meta.url))).filter(file => file.endsWith(".js"));
    for (const file of ["index.html", "sw.js", ...catalogs.map(file => "i18n/" + file)]) {
      const text = await readFile(new URL("../" + file, import.meta.url), "utf8");
      await writeFile(join(root, file), file === path ? change(text) : text);
    }
    const result = await checkProject(root);
    assert.match(result.errors.join("\n"), expected);
  } finally { await rm(root, { recursive: true, force: true }); }
});
