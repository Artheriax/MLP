/* ============================================================
   MLP — content.js
   Datalaag: laadt de content in de actieve taal.
   - NL: content/index.json + content/topics/<id>.json
   - EN: content/index.en.json + content/topics.en/<id>.json
     (met fallback op het NL-bestand als de EN-variant ontbreekt)
   - API-modus: FastAPI-back-end met ?lang= parameter
   Bevat ook kleine DOM/HTML-utilities (el, $, $$, escapeHtml).
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const el = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  };

  /* kleuren per naam — verwijzen naar de CSS-variabelen van het
     thema (css/style.css), zodat curven, punten en accenten
     automatisch meewisselen tussen dark en light.
     Let op: deze waarden worden via inline style gezet (blokken/
     legendes) — CSS-variabelen werken daar, in SVG-attributen niet. */
  const COLORS = {
    cyan: "var(--cyan)",
    yellow: "var(--yellow)",
    green: "var(--green)",
    magenta: "var(--magenta)",
  };

  MLP.util = { $, $$, escapeHtml, el, COLORS };

  /* ---------- Datalaag ---------- */

  const cache = { mode: null, index: null, topics: {} };

  function lang() {
    return MLP.i18n && MLP.i18n.lang ? MLP.i18n.lang() : "nl";
  }

  function clearCache() {
    cache.mode = null;
    cache.index = null;
    cache.topics = {};
  }

  async function fetchJson(url, timeoutMs) {
    const opts = {};
    if (timeoutMs && typeof AbortController !== "undefined") {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      opts.signal = ctl.signal;
      try {
        const res = await fetch(url, opts);
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  /* Bepaal éénmalig of er een FastAPI-backend draait (api/health). */
  async function detectMode() {
    if (cache.mode) return cache.mode;
    try {
      const health = await fetchJson("api/health", 900);
      if (health && health.status === "ok") {
        cache.mode = "api";
        return "api";
      }
    } catch (e) {
      /* geen API — val terug op statische bestanden */
    }
    cache.mode = "static";
    return "static";
  }

  /* Pad naar het indexbestand van de actieve taal. */
  function indexFile() {
    return lang() === "en" ? "content/index.en.json" : "content/index.json";
  }

  MLP.data = {
    detectMode,
    clearCache,

    /* Volledige index (hoofdstukken + onderwerpen) */
    async getIndex() {
      if (cache.index) return cache.index;
      const mode = await detectMode();
      let data = null;
      if (mode === "api") {
        try {
          data = await fetchJson("api/index?lang=" + lang());
        } catch (e) {
          cache.mode = "static";
        }
      }
      if (!data) {
        try {
          data = await fetchJson(indexFile());
        } catch (e) {
          /* EN-bestand ontbreekt? val terug op NL */
          if (lang() === "en") data = await fetchJson("content/index.json");
          else throw e;
        }
      }
      cache.index = data;
      return data;
    },

    /* Eén onderwerp ophalen */
    async getTopic(id) {
      if (cache.topics[id]) return cache.topics[id];
      const mode = await detectMode();
      let data = null;
      if (mode === "api") {
        try {
          data = await fetchJson("api/topics/" + encodeURIComponent(id) + "?lang=" + lang());
        } catch (e) {
          cache.mode = "static";
        }
      }
      if (!data) {
        const base = lang() === "en" ? "content/topics.en/" : "content/topics/";
        try {
          data = await fetchJson(base + id + ".json");
        } catch (e) {
          /* EN-variant ontbreekt → NL-bestand */
          if (lang() === "en") data = await fetchJson("content/topics/" + id + ".json");
          else throw e;
        }
      }
      cache.topics[id] = data;
      return data;
    },
  };
})(window.MLP);
