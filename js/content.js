/* ============================================================
   MLP — content.js
   Datalaag: laadt content via de FastAPI-API als die draait,
   en valt anders terug op de statische JSON-bestanden
   (zo werkt de site ook op GitHub Pages / elke static host).
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  /* ---------- Kleine helpers ---------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const escapeHtml = (str) =>
    String(str)
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

  /* pastel-kleuren (synchroniseer met css/style.css) */
  const COLORS = {
    cyan: "#7FDBDA",
    yellow: "#F9E79F",
    green: "#B9F6CA",
    magenta: "#F6A5C0",
  };

  MLP.util = { $, $$, escapeHtml, el, COLORS };

  MLP.LEVELS = {
    1: "Basis",
    2: "Verdieping",
    3: "Gevorderd",
  };

  /* ---------- Datalaag ---------- */

  const cache = { mode: null, index: null, topics: {} };

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

  MLP.data = {
    detectMode,

    /* Volledige index (hoofdstukken + onderwerpen) */
    async getIndex() {
      if (cache.index) return cache.index;
      const mode = await detectMode();
      let data = null;
      if (mode === "api") {
        try {
          data = await fetchJson("api/index");
        } catch (e) {
          cache.mode = "static";
        }
      }
      if (!data) data = await fetchJson("content/index.json");
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
          data = await fetchJson("api/topics/" + encodeURIComponent(id));
        } catch (e) {
          cache.mode = "static";
        }
      }
      if (!data) data = await fetchJson("content/topics/" + id + ".json");
      cache.topics[id] = data;
      return data;
    },
  };
})(window.MLP);
