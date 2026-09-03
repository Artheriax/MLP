/* ============================================================
   MLP — app.js
   Hash-router + views. Nieuw in deze versie:
   - zijbalk met UITKLAPBARE hoofdstukken (topics → sub-topics),
     inclusief herinnerde stand en auto-open van het actieve hoofdstuk
   - de hele zijbalk is inklapbaar (desktop + mobiele drawer)
   - de zoekbalk doorzoekt de volledige inhoud van alle sub-topics
     (tekst, formules, code, tabellen) met snippets + markeerlicht
   Alle zichtbare teksten komen uit js/i18n.js (NL/EN).
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  const { $, $$, el, escapeHtml } = MLP.util;
  const t = (k) => MLP.i18n.t(k);
  const tf = (k, v) => MLP.i18n.tf(k, v);
  const LEVELS = () => MLP.i18n.LEVELS[MLP.i18n.lang()];

  const view = () => document.getElementById("view");
  const app = () => document.getElementById("app");

  /* ============================================================
     Router
     ============================================================ */

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    /* accepteer zowel #/onderwerp/<id> (app-links) als #/topic/<id>
       (cross-verwijzingen in de content) — beide routes renderen het onderwerp */
    if ((parts[0] === "onderwerp" || parts[0] === "topic") && parts[1]) {
      return { name: "topic", id: decodeURIComponent(parts[1]) };
    }
    return { name: "home" };
  }

  let currentRoute = null;

  async function route() {
    const r = parseHash();
    if (currentRoute && currentRoute.name === r.name && currentRoute.id === r.id) return;
    currentRoute = r;

    window.scrollTo({ top: 0, behavior: "auto" });

    await ensureSidebar();

    if (r.name === "topic") {
      await renderTopic(r.id);
    } else {
      await renderHome();
    }
    updateSidebarActive(r);
  }

  /* ============================================================
     Sidebar — hoofdstukken (uitklapbaar) + onderwerpen
     ============================================================ */

  let sidebarBuilt = false;
  const NAV_KEY = "mlp-nav-open";
  const SB_KEY = "mlp-sidebar-collapsed";

  function loadNavOpen() {
    try {
      const raw = localStorage.getItem(NAV_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* corrupte waarde negeren */
    }
    return null; /* null = eerste bezoek: alleen het eerste hoofdstuk open */
  }

  function saveNavOpen(ids) {
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify(ids));
    } catch (e) {
      /* voorkeur onthouden is optioneel */
    }
  }

  function navOpenIds() {
    return $$(".nav-section")
      .filter((s) => !s.classList.contains("collapsed"))
      .map((s) => s.dataset.chapter);
  }

  function setChapterOpen(sec, open, persist) {
    sec.classList.toggle("collapsed", !open);
    const btn = $(".nav-chapter", sec);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (persist) saveNavOpen(navOpenIds());
  }

  function toggleChapter(sec) {
    setChapterOpen(sec, sec.classList.contains("collapsed"), true);
  }

  async function ensureSidebar() {
    if (sidebarBuilt) return;
    let index;
    try {
      index = await MLP.data.getIndex();
    } catch (err) {
      return; /* fout wordt getoond door de view-render */
    }
    buildSidebar(index);
    sidebarBuilt = true;
    applySidebarFilter();
    /* zoekindex (volledige inhoud) op de achtergrond bouwen */
    buildSearchIndex();
  }

  function buildSidebar(index) {
    const nav = document.getElementById("sidebarNav");
    nav.innerHTML = "";

    const home = el("a", "nav-home", escapeHtml(t("nav_home")));
    home.href = "#/";
    home.dataset.nav = "home";
    nav.appendChild(home);

    const chapters = index.chapters || [];
    (index.topics || []).forEach((tp) => {
      const ch = chapters.find((c) => c.id === tp.chapter);
      if (ch) tp._chapterName = ch.name;
    });

    const storedOpen = loadNavOpen();

    chapters.forEach((ch, ci) => {
      const topics = (index.topics || []).filter((tp) => tp.chapter === ch.id);
      if (!topics.length) return;

      const sec = el("div", "nav-section");
      sec.dataset.chapter = ch.id;

      /* hoofdstuk-knop: klapt de sub-topics open/dicht */
      const head = el("button", "nav-chapter");
      head.type = "button";
      head.setAttribute("aria-expanded", "true");
      head.setAttribute("aria-controls", "navlist-" + ch.id);
      head.innerHTML =
        '<svg class="chev" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5.5 4L10 8l-4.5 4"/></svg>' +
        '<span class="nav-chapter-name">' + escapeHtml(ch.name) + "</span>" +
        '<span class="nav-count">' + topics.length + "</span>";
      head.addEventListener("click", () => toggleChapter(sec));
      sec.appendChild(head);

      const wrap = el("div", "nav-list-wrap");
      wrap.id = "navlist-" + ch.id;
      const list = el("div", "nav-list");
      topics.forEach((tp) => {
        const a = el("a", "nav-link", escapeHtml(tp.title));
        a.href = "#/onderwerp/" + encodeURIComponent(tp.id);
        a.dataset.topic = tp.id;
        a.dataset.search = (
          tp.title + " " + (tp.summary || "") + " " + (tp.keywords || "") + " " + (ch.name || "")
        ).toLowerCase();
        list.appendChild(a);
      });
      wrap.appendChild(list);
      sec.appendChild(wrap);

      /* beginstand: opgeslagen voorkeur, anders alleen het eerste
         hoofdstuk open (nodigt uit om uit te klappen) */
      const open = storedOpen ? storedOpen.indexOf(ch.id) !== -1 : ci === 0;
      setChapterOpen(sec, open, false);

      nav.appendChild(sec);
    });
  }

  function updateSidebarActive(r) {
    $$(".nav-link, .nav-home").forEach((a) => {
      const isHome = a.dataset.nav === "home" && r.name === "home";
      const isTopic = a.dataset.topic && a.dataset.topic === r.id;
      a.classList.toggle("active", isHome || isTopic);
      /* het hoofdstuk van het actieve onderwerp klapt vanzelf open */
      if (isTopic) {
        const sec = a.closest(".nav-section");
        if (sec && sec.classList.contains("collapsed")) setChapterOpen(sec, true, true);
      }
    });
  }

  /* ============================================================
     Zijbalk inklappen — desktop (breedte 0) + mobiel (drawer)
     ============================================================ */

  function setSidebarCollapsed(collapsed) {
    document.body.classList.toggle("sb-collapsed", collapsed);
    try {
      localStorage.setItem(SB_KEY, collapsed ? "1" : "0");
    } catch (e) {
      /* voorkeur onthouden is optioneel */
    }
  }

  function initMenu() {
    const btn = document.getElementById("menuToggle");
    const sb = document.getElementById("sidebar");
    const bd = document.getElementById("sidebarBackdrop");
    if (!btn || !sb || !bd) return;

    const mq = window.matchMedia("(max-width: 920px)");
    const isMobile = () => mq.matches;

    const closeDrawer = () => {
      sb.classList.remove("open");
      bd.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    };
    const openDrawer = () => {
      sb.classList.add("open");
      bd.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
    };

    btn.addEventListener("click", () => {
      if (isMobile()) {
        if (sb.classList.contains("open")) closeDrawer();
        else openDrawer();
      } else {
        setSidebarCollapsed(!document.body.classList.contains("sb-collapsed"));
      }
    });
    bd.addEventListener("click", closeDrawer);
    sb.addEventListener("click", (ev) => {
      if (ev.target.closest("a")) closeDrawer();
    });
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && sb.classList.contains("open")) closeDrawer();
    });

    /* beginstand (desktop): eerder ingeklapt? */
    if (!isMobile()) {
      try {
        if (localStorage.getItem(SB_KEY) === "1") document.body.classList.add("sb-collapsed");
      } catch (e) {
        /* negeer */
      }
    }

    /* bij formaatwissel (desktop ↔ mobiel) de juiste modus herstellen */
    const onMq = () => {
      closeDrawer();
      if (isMobile()) {
        document.body.classList.remove("sb-collapsed");
      } else {
        try {
          document.body.classList.toggle("sb-collapsed", localStorage.getItem(SB_KEY) === "1");
        } catch (e) {
          /* negeer */
        }
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  /* ============================================================
     Zoeken — doorzoekt titels ÉN de volledige inhoud van alle
     sub-topics (tekst, formules, code, tabellen, plotlabels).
     De inhoudsindex wordt na het opstarten op de achtergrond
     gebouwd; tot die tijd zoekt de balk op titel/samenvatting.
     ============================================================ */

  let searchIndex = null; /* null = nog aan het laden */
  let searchIndexBuilding = false;
  let searchTimer = null;

  function stripHtml(html) {
    const d = document.createElement("div");
    d.innerHTML = html || "";
    return (d.textContent || "").replace(/\s+/g, " ");
  }

  /* alle doorzoekbare tekst van één onderwerp verzamelen */
  function topicSearchText(topic, tp) {
    const parts = [
      topic.title || tp.title || "",
      tp.summary || topic.summary || "",
      tp.keywords || topic.keywords || "",
      topic.intro || "",
      tp._chapterName || "",
    ];
    (topic.sections || []).forEach((sec) => {
      if (sec.title) parts.push(sec.title);
      (sec.blocks || []).forEach((b) => {
        if (b.type === "text" || b.type === "callout") parts.push(stripHtml(b.html));
        else if (b.type === "formula") parts.push(b.label || "", b.latex || "", b.caption || "");
        else if (b.type === "code") parts.push(b.caption || "", b.source || "");
        else if (b.type === "table") {
          parts.push((b.headers || []).join(" "));
          (b.rows || []).forEach((r) => parts.push((r || []).join(" ")));
        } else if (b.type === "plot") {
          parts.push(b.title || "", b.subtitle || "");
          (b.curves || []).forEach((c) => parts.push(c.label || ""));
          (b.points || []).forEach((p) => parts.push(p.label || ""));
          (b.sliders || (b.slider ? [b.slider] : [])).forEach((s) => parts.push(s.label || ""));
          (b.metrics || []).forEach((m) => parts.push(m.label || ""));
        }
      });
    });
    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function buildSearchIndex() {
    if (searchIndex || searchIndexBuilding) return;
    searchIndexBuilding = true;

    (async () => {
      const index = await MLP.data.getIndex();
      const chapters = index.chapters || [];
      const chapterName = {};
      chapters.forEach((c) => (chapterName[c.id] = c.name));

      const entries = await Promise.all(
        (index.topics || []).map(async (tp) => {
          let text =
            tp.title + " " + (tp.summary || "") + " " + (tp.keywords || "") + " " + (chapterName[tp.chapter] || "");
          try {
            const topic = await MLP.data.getTopic(tp.id);
            text = topicSearchText(topic, {
              title: tp.title,
              summary: tp.summary,
              keywords: tp.keywords,
              _chapterName: chapterName[tp.chapter] || "",
            });
          } catch (e) {
            /* onderwerp niet beschikbaar → val terug op de index-tekst */
          }
          return {
            id: tp.id,
            title: tp.title,
            chapter: chapterName[tp.chapter] || "",
            plain: text,
            lower: text.toLowerCase(),
          };
        })
      );

      searchIndex = entries;
      searchIndexBuilding = false;
      /* filter opnieuw toepassen: nu met de volledige inhoud */
      applySidebarFilter();
    })().catch(() => {
      searchIndexBuilding = false;
    });
  }

  /* snippet rond de eerste treffer, met alle zoektermen gemarkeerd */
  function snippetText(entry, terms) {
    const text = entry.plain || "";
    if (!text) return "";
    const lower = entry.lower || text.toLowerCase();

    let idx = -1;
    for (const term of terms) {
      const i = lower.indexOf(term);
      if (i !== -1) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return "";

    const PAD = 46;
    let start = Math.max(0, idx - PAD);
    if (start > 0) {
      const sp = text.indexOf(" ", start);
      if (sp !== -1 && sp < idx) start = sp + 1;
    }
    let end = Math.min(text.length, idx + 110);
    if (end < text.length) {
      const sp = text.lastIndexOf(" ", end);
      if (sp !== -1 && sp > idx) end = sp;
    }

    const snippet =
      (start > 0 ? "\u2026 " : "") + text.slice(start, end) + (end < text.length ? " \u2026" : "");

    let safe = escapeHtml(snippet);
    terms.forEach((term) => {
      if (!term) return;
      const rx = new RegExp("(" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      safe = safe.replace(rx, "<mark>$1</mark>");
    });
    return safe;
  }

  function applySidebarFilter() {
    const input = document.getElementById("sidebarSearch");
    const sidebar = document.getElementById("sidebar");
    const status = document.getElementById("searchStatus");
    const results = document.getElementById("searchResults");
    if (!input || !sidebar || !status || !results) return;

    const q = (input.value || "").trim().toLowerCase();

    if (!q) {
      sidebar.classList.remove("searching");
      status.hidden = true;
      results.innerHTML = "";
      return;
    }

    sidebar.classList.add("searching");

    const terms = q.split(/\s+/).filter(Boolean);

    /* volledige inhoud indien beschikbaar, anders titel/samenvatting */
    let entries;
    if (searchIndex) {
      entries = searchIndex.map((e) => ({ id: e.id, title: e.title, chapter: e.chapter, plain: e.plain, lower: e.lower }));
    } else {
      entries = $$(".nav-link").map((a) => ({
        id: a.dataset.topic,
        title: a.textContent,
        chapter: "",
        plain: "",
        lower: a.dataset.search || "",
      }));
    }

    const hits = entries.filter((e) => terms.every((term) => e.lower.indexOf(term) !== -1));

    status.hidden = false;
    if (!hits.length) {
      status.textContent = t("empty_row");
      results.innerHTML = "";
      return;
    }
    status.textContent = tf("search_results", { n: hits.length }) + (searchIndex ? "" : " \u00b7 " + t("search_indexing"));

    results.innerHTML = "";
    hits.slice(0, 30).forEach((h) => {
      const a = el("a", "sr-item");
      a.href = "#/onderwerp/" + encodeURIComponent(h.id);
      a.appendChild(el("span", "sr-title", escapeHtml(h.title)));
      if (h.chapter) a.appendChild(el("span", "sr-chapter", escapeHtml(h.chapter)));
      const snippet = h.plain ? snippetText(h, terms) : "";
      if (snippet) a.appendChild(el("span", "sr-snippet", snippet));
      results.appendChild(a);
    });
  }

  function initSidebarSearch() {
    const input = document.getElementById("sidebarSearch");
    if (!input) return;
    input.value = "";

    input.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applySidebarFilter, 130);
    });

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && input.value) {
        input.value = "";
        applySidebarFilter();
        input.blur();
      }
    });

    /* "/" springt naar het zoekveld (wiki-sneltoets) */
    window.addEventListener("keydown", (ev) => {
      if (ev.key !== "/" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const active = document.activeElement;
      const tag = active ? active.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (active && active.isContentEditable)) return;
      ev.preventDefault();
      /* zijbalk even tonen als die verborgen is */
      if (window.matchMedia("(max-width: 920px)").matches) {
        const sb = document.getElementById("sidebar");
        const btn = document.getElementById("menuToggle");
        if (sb && btn && !sb.classList.contains("open")) btn.click();
      } else if (document.body.classList.contains("sb-collapsed")) {
        setSidebarCollapsed(false);
      }
      input.focus();
      input.select();
    });
  }

  /* ============================================================
     Home — wiki-achtige startpagina
     ============================================================ */

  let homeBuilt = false;
  /* Cache als ÉCHT element, niet als DocumentFragment: een fragment
     raakt leeg zodra het ge-append wordt (de kinderen verhuizen), waardoor
     de homepage bij terugkeer leeg bleek. Een element houdt zijn kinderen
     gewoon vast. */
  let homeDom = null;

  async function renderHome() {
    if (homeBuilt && homeDom) {
      view().innerHTML = "";
      view().appendChild(homeDom);
      return;
    }

    let index;
    try {
      index = await MLP.data.getIndex();
    } catch (err) {
      renderLoadError(err);
      return;
    }
    homeDom = el("div", "home-cache");
    homeDom.appendChild(buildHomeDom(index));
    view().innerHTML = "";
    view().appendChild(homeDom);
    homeBuilt = true;
  }

  function buildHomeDom(index) {
    const frag = document.createDocumentFragment();
    const site = index.site || {};

    frag.appendChild(el("h1", null, escapeHtml(t("home_title"))));
    frag.appendChild(el("p", "home-lede", escapeHtml(site.description || t("home_lede_fallback"))));
    frag.appendChild(
      el(
        "p",
        "home-meta",
        escapeHtml(
          tf("home_meta", {
            ch: (index.chapters || []).length,
            n: (index.topics || []).length,
          })
        )
      )
    );

    (index.chapters || []).forEach((ch) => {
      const topics = (index.topics || []).filter((tp) => tp.chapter === ch.id);
      if (!topics.length) return;

      const section = el("section", "home-chapter");
      section.appendChild(el("h2", null, escapeHtml(ch.name)));
      if (ch.description) {
        section.appendChild(el("p", "chapter-desc", escapeHtml(ch.description)));
      }

      const ul = el("ul", "home-list");
      topics.forEach((tp) => {
        const li = el("li");
        const a = el("a", null, escapeHtml(tp.title));
        a.href = "#/onderwerp/" + encodeURIComponent(tp.id);
        li.appendChild(a);
        ul.appendChild(li);
      });
      section.appendChild(ul);
      frag.appendChild(section);
    });

    return frag;
  }

  /* ============================================================
     Onderwerppagina
     ============================================================ */

  async function renderTopic(id) {
    let topic;
    try {
      topic = await MLP.data.getTopic(id);
    } catch (err) {
      renderLoadError(err);
      return;
    }

    const index = await MLP.data.getIndex().catch(() => null);
    if (!index) {
      renderLoadError(new Error("index ontbreekt"));
      return;
    }

    const chapterById = {};
    (index.chapters || []).forEach((ch) => (chapterById[ch.id] = ch));
    const chapter = chapterById[topic.chapter] || { name: "Overig", accent: "cyan" };
    const ctx = {
      accent: chapter.accent,
      accentMap: {
        cyan: "var(--cyan)",
        yellow: "var(--yellow)",
        green: "var(--green)",
        magenta: "var(--magenta)",
      },
    };

    const topics = index.topics || [];
    const pos = topics.findIndex((tp) => tp.id === id);
    const prev = pos > 0 ? topics[pos - 1] : null;
    const next = pos >= 0 && pos < topics.length - 1 ? topics[pos + 1] : null;

    const frag = document.createDocumentFragment();
    const main = el("article", "topic");
    main.style.setProperty("--accent", "var(--" + chapter.accent + ")");

    /* kop */
    const head = el("header", "topic-head");
    const crumb = el(
      "a",
      "crumb",
      escapeHtml(t("crumb_all")) +
        ' <span class="sep">/</span> ' +
        escapeHtml(chapter.name)
    );
    crumb.href = "#/";
    head.appendChild(crumb);
    head.appendChild(el("h1", "topic-title", escapeHtml(topic.title)));

    const words = countWords(topic);
    const minutes = Math.max(1, Math.round(words / 190));
    const meta = el("div", "topic-meta");
    meta.innerHTML =
      "<span>" + (LEVELS()[topic.level || 1] || t("meta_level_fallback")) + "</span>" +
      "<span>" + escapeHtml(tf("meta_minutes", { n: minutes })) + "</span>" +
      "<span>" + escapeHtml(tf("meta_sections", { n: (topic.sections || []).length })) + "</span>";
    head.appendChild(meta);

    if (topic.intro) head.appendChild(el("p", "topic-intro", topic.intro));
    frag.appendChild(head);

    /* secties */
    const body = el("div", "topic-body");
    (topic.sections || []).forEach((sec, i) => {
      body.appendChild(MLP.blocks.renderSection(sec, i, ctx));
    });
    frag.appendChild(body);

    /* pager */
    if (prev || next) {
      const pager = el("nav", "pager");
      pager.setAttribute("aria-label", t("pager_aria"));
      if (prev) {
        const a = el("a", "prev", '<span class="dir">' + escapeHtml(t("pager_prev")) + '</span><span class="pg-title">' + escapeHtml(prev.title) + "</span>");
        a.href = "#/onderwerp/" + encodeURIComponent(prev.id);
        pager.appendChild(a);
      } else {
        pager.appendChild(el("span", "spacer"));
      }
      if (next) {
        const a = el("a", "next", '<span class="dir">' + escapeHtml(t("pager_next")) + '</span><span class="pg-title">' + escapeHtml(next.title) + "</span>");
        a.href = "#/onderwerp/" + encodeURIComponent(next.id);
        pager.appendChild(a);
      }
      frag.appendChild(pager);
    }

    const v = view();
    v.innerHTML = "";
    v.appendChild(frag);

    /* KaTeX over de hele view (inline wiskunde in teksten) */
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(v, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\(", right: "\\)", display: false },
          ],
          throwOnError: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
        });
      } catch (e) {
        /* formules zijn optioneel */
      }
    }

    app().focus({ preventScroll: true });
  }

  function countWords(topic) {
    let text = topic.intro || "";
    (topic.sections || []).forEach((sec) => {
      text += " " + (sec.title || "");
      (sec.blocks || []).forEach((b) => {
        if (b.type === "text" || b.type === "callout") text += " " + (b.html || "");
        if (b.type === "code") text += " " + (b.source || "");
      });
    });
    return text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  }

  /* ============================================================
     Foutmelding (bijv. geopend via file://)
     ============================================================ */

  function renderLoadError(err) {
    const isFile = location.protocol === "file:";
    view().innerHTML = "";
    view().appendChild(
      el(
        "div",
        "error-card",
        "<h2>" + escapeHtml(t("error_title")) + "</h2>" +
          "<p>" +
          (isFile
            ? t("error_body_file")
            : tf("error_body_server", { err: String((err && err.message) || err) })) +
          "</p>" +
          "<p>" + t("error_footer") + "</p>"
      )
    );
  }

  /* ============================================================
     Taalwissel
     ============================================================ */

  function updateLangToggle() {
    const btn = document.getElementById("langToggle");
    if (!btn) return;
    const lang = MLP.i18n.lang();
    /* toont altijd de taal waar je HEEN kunt schakelen */
    btn.textContent = lang === "nl" ? "EN" : "NL";
    btn.setAttribute("aria-label", t("lang_switch_to"));
    btn.title = t("lang_switch_to");
  }

  function initLangToggle() {
    const btn = document.getElementById("langToggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      MLP.i18n.setLang(MLP.i18n.lang() === "nl" ? "en" : "nl");
    });

    window.addEventListener("mlp:langchange", () => {
      /* caches leeg en views opnieuw renderen in de nieuwe taal */
      MLP.data.clearCache();
      homeBuilt = false;
      homeDom = null;
      sidebarBuilt = false;
      const nav = document.getElementById("sidebarNav");
      if (nav) nav.innerHTML = "";

      /* zoekindex opnieuw opbouwen in de nieuwe taal */
      searchIndex = null;
      searchIndexBuilding = false;
      const results = document.getElementById("searchResults");
      if (results) results.innerHTML = "";

      currentRoute = null;
      updateLangToggle();
      route();
    });

    updateLangToggle();
    MLP.i18n.applyToDocument();
  }

  /* ============================================================
     Opstarten
     ============================================================ */

  window.addEventListener("hashchange", route);

  let booted = false;
  function boot() {
    if (booted) return; /* bescherming tegen dubbel opstarten (defer + DOMContentLoaded) */
    booted = true;
    initMenu();
    initSidebarSearch();
    initLangToggle();
    route();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.MLP);
