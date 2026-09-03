/* ============================================================
   MLP — theme.js
   Dark/light-schakelaar.
   - Donker is de default (zoals het origineel: #161616 + pastel)
   - Keuze wordt onthouden in localStorage ("mlp-theme")
   - js/app.js kan meeluisteren via "mlp:themechange"
   De knop toont het icoon van de modus waar je NAARTOE schakelt.
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  var STORAGE_KEY = "mlp-theme";
  var THEME_COLORS = { dark: "#161616", light: "#ffffff" };

  function current() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme] || "#161616");
  }

  function set(theme) {
    if (theme !== "dark" && theme !== "light") return;
    if (theme === current()) return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* voorkeur onthouden is optioneel */
    }
    apply(theme);
    updateToggleButton();
    window.dispatchEvent(new CustomEvent("mlp:themechange", { detail: { theme: theme } }));
  }

  function toggle() {
    set(current() === "dark" ? "light" : "dark");
  }

  /* aria/titel van de knop — in de actieve taal indien i18n al geladen is */
  function updateToggleButton() {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    var key = current() === "dark" ? "theme_to_light" : "theme_to_dark";
    var label = key;
    if (MLP.i18n && MLP.i18n.t) label = MLP.i18n.t(key);
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  function initToggleButton() {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", toggle);
    updateToggleButton();

    /* labels herberekenen zodra i18n (defer) klaar is of de taal wisselt */
    window.addEventListener("mlp:langchange", updateToggleButton);
    if (MLP.i18n && MLP.i18n.applyToDocument) updateToggleButton();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initToggleButton);
  } else {
    initToggleButton();
  }

  MLP.theme = {
    current: current,
    set: set,
    toggle: toggle,
  };
})(window.MLP);
