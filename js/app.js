/* ============================================================
   MLP — app.js
   Hash-router + views: home (hero + onderwerpen-tabel) en
   onderwerppagina. Koppelt alles aan elkaar.
   Alle zichtbare teksten komen uit js/i18n.js (NL/EN).
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  const { $, $$, el, escapeHtml, COLORS } = MLP.util;
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
    if (parts[0] === "onderwerp" && parts[1]) {
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

    if (r.name === "topic") {
      await renderTopic(r.id);
    } else {
      await renderHome();
    }
    updateNav(r);
    observeReveals();
  }

  function updateNav(r) {
    $$("[data-nav]").forEach((a) => a.classList.toggle("active", r.name === "home"));
    $$("[data-nav]").forEach((a) => (a.textContent = t("nav_topics")));
  }

  /* ============================================================
     Home — hero + onderwerpen-tabel
     ============================================================ */

  let homeBuilt = false;
  /* Cache als ÉCHT element, niet als DocumentFragment: een fragment
     raakt leeg zodra het ge-append wordt (de kinderen verhuizen), waardoor
     de homepage bij terugkeer leeg bleek. Een element houdt zijn kinderen
     én event-listeners (zoeken, chips, rij-kliks) gewoon vast. */
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

    /* ---------- Hero ---------- */
    const hero = el("section", "hero");
    hero.innerHTML =
      '<p class="hero-eyebrow">' + escapeHtml(t("hero_eyebrow")) + "</p>" +
      "<h1>" + t("hero_title") + "</h1>" +
      '<p class="hero-lede">' +
      escapeHtml(site.description || t("hero_lede_fallback")) +
      "</p>" +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary" href="#onderwerpen">' + escapeHtml(t("hero_cta")) +
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 2v11M3.5 8.5L8 13l4.5-4.5"/></svg></a>' +
      '<span class="hero-hint">' +
      tf("hero_hint", { ch: (index.chapters || []).length, n: (index.topics || []).length }) +
      "</span>" +
      "</div>";

    /* stats */
    const nTopics = (index.topics || []).length;
    const nChapters = (index.chapters || []).length;
    const stats = el("div", "hero-stats");
    const statDefs = [
      { v: String(nChapters), l: t("stat_chapters"), c: "c-cyan" },
      { v: String(nTopics), l: t("stat_topics"), c: "c-green" },
      { v: site.statFormulas || "±39", l: t("stat_formulas"), c: "c-yellow" },
      { v: site.statCode || "28", l: t("stat_code"), c: "c-magenta" },
    ];
    statDefs.forEach((s) => {
      stats.appendChild(el("div", "stat", '<span class="stat-value ' + s.c + '">' + s.v + '</span><span class="stat-label">' + escapeHtml(s.l) + "</span>"));
    });
    hero.appendChild(stats);
    frag.appendChild(hero);

    /* ---------- Onderwerpen-sectie ---------- */
    const section = el("section");
    section.id = "onderwerpen";
    section.appendChild(
      el(
        "div",
        "section-head",
        '<h2><span class="kicker">' + escapeHtml(t("section_kicker")) + "</span> " + escapeHtml(t("section_title")) + "</h2>" +
          "<p>" + escapeHtml(t("section_lede")) + "</p>"
      )
    );

    /* filters */
    const filterBar = el("div", "filter-bar");
    const searchWrap = el(
      "div",
      "search-wrap",
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'
    );
    const search = document.createElement("input");
    search.type = "search";
    search.id = "searchInput";
    search.placeholder = t("search_placeholder");
    search.setAttribute("aria-label", t("search_aria"));
    searchWrap.appendChild(search);
    filterBar.appendChild(searchWrap);

    const chipRow = el("div", "chip-row");
    chipRow.setAttribute("role", "group");
    chipRow.setAttribute("aria-label", t("chips_aria"));
    const chapters = index.chapters || [];
    const chips = [];
    const mkChip = (label, dot, chapterId) => {
      const chip = el("button", "chip", '<span class="dot" style="--dot:' + dot + '"></span>' + label);
      chip.type = "button";
      chip.setAttribute("aria-pressed", "false");
      if (chapterId) chip.dataset.chapter = chapterId;
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
        applyFilter();
      });
      chips.push(chip);
      chipRow.appendChild(chip);
      return chip;
    };
    mkChip(escapeHtml(t("chip_all")), "rgba(255,255,255,0.85)", null);
    chapters.forEach((ch) => mkChip(escapeHtml(ch.name), "var(--" + ch.accent + ")", ch.id));

    filterBar.appendChild(chipRow);
    section.appendChild(filterBar);

    /* ---------- Tabel ---------- */
    const shell = el("div", "table-shell");
    const table = el("table", "topic-table");
    const thead = el(
      "thead",
      null,
      "<tr><th>" + escapeHtml(t("th_chapter")) + "</th><th>" + escapeHtml(t("th_topic")) + "</th><th>" +
        escapeHtml(t("th_learn")) + "</th><th>" + escapeHtml(t("th_level")) + "</th></tr>"
    );
    table.appendChild(thead);
    const tbody = el("tbody");
    const chapterById = {};
    chapters.forEach((ch) => (chapterById[ch.id] = ch));

    let i = 0;
    let currentChapter = null;
    (index.topics || []).forEach((tp) => {
      const ch = chapterById[tp.chapter] || { name: "Overig", accent: "cyan", id: "x" };
      if (ch.id !== currentChapter) {
        currentChapter = ch.id;
        const groupRow = el("tr", "chapter-row");
        const td = el(
          "td",
          null,
          '<span class="chapter-chip" style="--accent: var(--' + ch.accent + ')"><span class="dot"></span>' +
            escapeHtml(ch.name) +
            (ch.description ? '<span class="chapter-desc">' + escapeHtml(ch.description) + "</span>" : "") +
            "</span>"
        );
        td.colSpan = 4;
        groupRow.appendChild(td);
        tbody.appendChild(groupRow);
      }

      const row = el("tr", "topic-row");
      row.tabIndex = 0;
      row.setAttribute("role", "link");
      row.dataset.topic = tp.id;
      row.dataset.chapter = tp.chapter;
      row.dataset.search = (tp.title + " " + (tp.summary || "") + " " + (tp.keywords || "") + " " + (ch.name || "")).toLowerCase();
      row.setAttribute("aria-label", tf("row_aria", { title: tp.title }));
      row.style.setProperty("--accent", "var(--" + ch.accent + ")");
      row.style.setProperty("--i", i);

      const level = tp.level || 1;
      const dots =
        '<span class="level-dots">' +
        [1, 2, 3].map((n) => '<i class="' + (n <= level ? "on" : "") + '"></i>').join("") +
        '</span><span class="level-label">' + (LEVELS()[level] || "") + "</span>";

      row.innerHTML =
        "<td></td>" +
        '<td class="td-main"><span class="td-title">' +
        escapeHtml(tp.title) +
        '<span class="arrow" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 8h11M9 3.5L13.5 8 9 12.5"/></svg></span></span></td>' +
        '<td class="td-summary">' +
        escapeHtml(tp.summary || "") +
        "</td>" +
        '<td class="td-level">' +
        dots +
        "</td>";

      const go = () => {
        location.hash = "#/onderwerp/" + encodeURIComponent(tp.id);
      };
      row.addEventListener("click", go);
      row.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          go();
        }
      });
      tbody.appendChild(row);
      i++;
    });

    table.appendChild(tbody);
    shell.appendChild(table);
    section.appendChild(shell);
    frag.appendChild(section);

    /* ---------- Zoeken / filteren ---------- */
    function applyFilter() {
      const q = (search.value || "").trim().toLowerCase();
      const activeChip = chips.find((c) => c.getAttribute("aria-pressed") === "true");
      const activeChapter = activeChip && activeChip.dataset.chapter;
      let visible = 0;
      $$(".topic-row", tbody).forEach((row) => {
        const okQ = !q || (row.dataset.search || "").indexOf(q) !== -1;
        const okC = !activeChapter || row.dataset.chapter === activeChapter;
        const show = okQ && okC;
        row.style.display = show ? "" : "none";
        if (show) visible++;
      });
      /* hoofdstukgroepen verbergen als al hun rijen weg zijn */
      $$(".chapter-row", tbody).forEach((groupRow) => {
        let any = false;
        let next = groupRow.nextElementSibling;
        while (next && next.classList.contains("topic-row")) {
          if (next.style.display !== "none") any = true;
          next = next.nextElementSibling;
        }
        groupRow.style.display = any ? "" : "none";
      });
      let emptyRow = $(".empty-row", tbody);
      if (visible === 0) {
        if (!emptyRow) {
          emptyRow = el("tr", "empty-row");
          emptyRow.appendChild(el("td", null, escapeHtml(t("empty_row"))));
          emptyRow.firstChild.colSpan = 4;
          tbody.appendChild(emptyRow);
        }
        emptyRow.style.display = "";
      } else if (emptyRow) {
        emptyRow.style.display = "none";
      }
    }

    search.addEventListener("input", applyFilter);

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
      '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 2.5L4.5 8l5.5 5.5"/></svg> ' +
        escapeHtml(t("crumb_all")) +
        ' <span class="sep">/</span> ' +
        escapeHtml(chapter.name)
    );
    crumb.href = "#/";
    head.appendChild(crumb);
    head.appendChild(el("div", "topic-chapter", '<span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block"></span> ' + escapeHtml(chapter.name)));
    head.appendChild(el("h1", "topic-title", escapeHtml(topic.title)));

    const words = countWords(topic);
    const minutes = Math.max(1, Math.round(words / 190));
    const meta = el("div", "topic-meta");
    meta.innerHTML =
      '<span class="m">' + (LEVELS()[topic.level || 1] || t("meta_level_fallback")) + "</span>" +
      '<span class="m">' + escapeHtml(tf("meta_minutes", { n: minutes })) + "</span>" +
      '<span class="m">' + escapeHtml(tf("meta_sections", { n: (topic.sections || []).length })) + "</span>";
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
        pager.appendChild(el("span"));
      }
      if (next) {
        const a = el("a", "next", '<span class="dir">' + escapeHtml(t("pager_next")) + '</span><span class="pg-title">' + escapeHtml(next.title) + "</span>");
        a.href = "#/onderwerp/" + encodeURIComponent(next.id);
        pager.appendChild(a);
      }
      frag.appendChild(pager);
    }

    /* weergave met zachte transitie */
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
     Reveals & voortgangsbalk
     ============================================================ */

  let observer = null;

  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach((n) => n.classList.add("visible"));
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
      );
    }
    $$(".reveal:not(.visible)").forEach((n) => observer.observe(n));
  }

  function initProgress() {
    const bar = document.getElementById("progressBar");
    if (!bar) return;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      bar.style.width = pct + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
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
    initProgress();
    initLangToggle();
    route();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.MLP);
