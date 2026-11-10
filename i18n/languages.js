/* Register languages here; load their catalogs before js/app.js. */
(function () {
  var langs = {
    en: { name: "English", dir: "ltr" },
    fa: {
      name: "فارسی", dir: "rtl", script: "arab",
      font: "Vazirmatn, sans-serif", digits: "۰۱۲۳۴۵۶۷۸۹", decimal: "٫",
      pace: 1.15
    }
  };
  window.HWL_I18N = { langs: langs, strings: {} };
  function supported(code) {
    code = String(code || "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(langs, code)) return code;
    code = code.split("-")[0];
    return Object.prototype.hasOwnProperty.call(langs, code) ? code : "";
  }
  var requested = "", saved = "", preferred = "";
  try {
    var query = location.search.match(/[?&]lang=([^&]+)/);
    requested = supported(query ? decodeURIComponent(query[1]) : location.hash.slice(1));
  } catch (e) {}
  try { saved = supported(JSON.parse(localStorage.getItem("hermes-walls-lab-v1") || "{}").lang); } catch (e) {}
  var browser = navigator.languages || [navigator.language];
  for (var i = 0; i < browser.length && !preferred; i++) preferred = supported(browser[i]);
  var lang = requested || saved || preferred || "en", root = document.documentElement;
  root.lang = lang;
  root.dir = langs[lang].dir;
  root.setAttribute("data-script", langs[lang].script || "");
})();
