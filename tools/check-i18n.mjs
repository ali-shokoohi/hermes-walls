// Development only: validate trusted local classic-script catalogs without dependencies.
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Script, createContext } from "node:vm";

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const placeholders = text => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort().join(",");
const pluralForms = ["zero", "one", "two", "few", "many", "other"];

export function checkCatalog(code, catalog, source, { allowMissing = false } = {}) {
  const errors = [], warnings = [];
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return { errors: [`${code}: catalog must be an object`], warnings };
  }
  for (const key of Object.keys(catalog)) {
    if (!own(source, key)) { errors.push(`${code}.${key}: unknown key`); continue; }
    const value = catalog[key], original = source[key];
    const expected = placeholders(typeof original === "string" ? original : Object.values(original).join(" "));
    const forms = typeof value === "string" ? { text: value } : value;
    if (!forms || typeof forms !== "object" || Array.isArray(forms)) {
      errors.push(`${code}.${key}: expected text or plural forms`); continue;
    }
    if (typeof value !== "string") {
      if (!own(forms, "other")) errors.push(`${code}.${key}: plural message needs other`);
      for (const form of Object.keys(forms)) {
        if (!pluralForms.includes(form)) errors.push(`${code}.${key}: invalid plural form ${form}`);
      }
    }
    for (const [form, text] of Object.entries(forms)) {
      if (typeof text !== "string" || !text.trim()) {
        errors.push(`${code}.${key}.${form}: expected nonempty text`);
      } else if (placeholders(text) !== expected) {
        errors.push(`${code}.${key}.${form}: placeholders must be {${expected.split(",").join("}, {")}}`);
      }
    }
  }
  for (const key of Object.keys(source)) {
    if (!own(catalog, key)) (allowMissing ? warnings : errors).push(`${code}.${key}: missing (English fallback)`);
  }
  return { errors, warnings };
}

export async function checkProject(root, options = {}) {
  const errors = [], warnings = [];
  const read = path => readFile(resolve(root, path), "utf8");
  const context = createContext({
    window: {}, document: { documentElement: { setAttribute() {} } },
    location: { search: "", hash: "" }, localStorage: { getItem() { return null; } },
    navigator: { languages: ["en"] }
  });
  try {
    new Script(await read("i18n/languages.js"), { filename: "i18n/languages.js" }).runInContext(context, { timeout: 1000 });
    const registry = context.window.HWL_I18N;
    if (!registry || !registry.langs || !own(registry.langs, "en")) throw new Error("Registry must include English (en)");
    const html = await read("index.html"), worker = await read("sw.js");
    const scripts = [...html.matchAll(/<script\b([^>]*)>\s*<\/script>/g)].map(match => {
      return { attrs: match[1], src: match[1].match(/\bsrc=["']([^"']+)["']/)?.[1]?.replace(/^\.\//, "") };
    });
    const position = path => scripts.findIndex(script => script.src === path);
    const registryPosition = position("i18n/languages.js"), appPosition = position("js/app.js");
    if (registryPosition < 0 || appPosition < 0 || registryPosition >= appPosition) errors.push("index.html: registry must load before app.js");
    const registryTag = scripts[registryPosition];
    const stylesheet = html.search(/<link\b[^>]*rel=["']stylesheet["']/);
    if (stylesheet >= 0 && html.indexOf(registryTag?.src || "i18n/languages.js") > stylesheet) errors.push("index.html: registry must load before stylesheets");
    const precacheContext = createContext({ self: { addEventListener() {} } });
    new Script(worker + "\nself.shell = SHELL;").runInContext(precacheContext, { timeout: 1000 });
    const shell = precacheContext.self.shell;
    if (!shell.includes("./i18n/languages.js")) errors.push("sw.js: missing registry in SHELL");
    for (const [code, metadata] of Object.entries(registry.langs)) {
      try {
        if (Intl.getCanonicalLocales(code)[0].toLowerCase() !== code) throw new Error();
      } catch { errors.push(`${code}: use a valid lowercase BCP 47 language tag`); }
      if (!metadata || typeof metadata.name !== "string" || !metadata.name.trim()) errors.push(`${code}: native name is required`);
      if (!metadata || !["ltr", "rtl"].includes(metadata.dir)) errors.push(`${code}: dir must be ltr or rtl`);
      if (metadata?.digits != null && (typeof metadata.digits !== "string" || metadata.digits.length !== 10 || new Set(metadata.digits).size !== 10)) errors.push(`${code}: digits must contain ten distinct characters`);
      if (metadata?.pace != null && (typeof metadata.pace !== "number" || !Number.isFinite(metadata.pace) || metadata.pace <= 0)) errors.push(`${code}: pace must be a positive number`);
      const path = `i18n/${code}.js`, at = position(path);
      if (at <= registryPosition || at >= appPosition || at < 0) errors.push(`index.html: load ${path} after registry and before app.js`);
      if (code !== "en" && at <= position("i18n/en.js")) errors.push(`index.html: load ${path} after English`);
      if (!shell.includes(`./${path}`)) errors.push(`sw.js: missing ./${path} in SHELL`);
      try { new Script(await read(path), { filename: path }).runInContext(context, { timeout: 1000 }); }
      catch (error) { errors.push(`${path}: ${error.message}`); }
      if (!own(registry.strings, code)) errors.push(`${path}: must register strings[${JSON.stringify(code)}]`);
    }
    for (const script of scripts.filter(script => script.src === "js/app.js" || script.src?.startsWith("i18n/"))) {
      if (/\b(?:async|defer)\b|\btype=["']module["']/.test(script.attrs)) errors.push(`${script.src}: keep synchronous classic scripts`);
      if (scripts.filter(item => item.src === script.src).length > 1) errors.push(`${script.src}: duplicate script reference`);
    }
    for (const code of Object.keys(registry.strings)) {
      if (!own(registry.langs, code)) errors.push(`${code}: catalog has no registry entry`);
    }
    const source = registry.strings.en;
    if (!source || typeof source !== "object" || Array.isArray(source)) errors.push("English source catalog is missing or invalid");
    else {
      for (const code of Object.keys(registry.langs)) {
        const result = checkCatalog(code, registry.strings[code], source, options);
        errors.push(...result.errors); warnings.push(...result.warnings);
      }
    }
    return { errors, warnings, languages: Object.keys(registry.langs).length, keys: source ? Object.keys(source).length : 0 };
  } catch (error) { return { errors: [...errors, error.message], warnings }; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--allow-missing")) {
    console.error("Usage: node tools/check-i18n.mjs [--allow-missing]"); process.exitCode = 1;
  } else {
    const result = await checkProject(fileURLToPath(new URL("../", import.meta.url)), { allowMissing: args.includes("--allow-missing") });
    for (const warning of result.warnings) console.warn("WARN " + warning);
    for (const error of result.errors) console.error("FAIL " + error);
    if (result.errors.length) process.exitCode = 1;
    else console.log(`PASS ${result.languages} languages, ${result.keys} source keys; catalogs, placeholders, metadata, script order, precache (${result.warnings.length} fallback warnings)`);
  }
}
