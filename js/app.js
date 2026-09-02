/* ============================================================
   MLP — app.js
   Hash-router + views: home (hero + onderwerpen-tabel) en
   onderwerppagina. Koppelt alles aan elkaar.
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  const { $, $$, el, escapeHtml, COLORS } = MLP.util;

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
      '<p class="hero-eyebrow">machine learning · lineaire classifiers</p>' +
      '<h1>Machine Learning stof, <span class="grad">helder samengevat</span>.</h1>' +
      '<p class="hero-lede">' +
      (site.description ||
        "Alles over logistic regression en support vector machines met scikit-learn: " +
        "de theorie in begrijpelijke stukjes, met formules, voorbeelden en code die je direct in je browser kunt draaien.") +
      "</p>" +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary" href="#onderwerpen">Bekijk de onderwerpen' +
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 2v11M3.5 8.5L8 13l4.5-4.5"/></svg></a>' +
      '<span class="hero-hint">4 hoofdstukken · 12 onderwerpen · formules &amp; code</span>' +
      "</div>";

    /* stats */
    const nTopics = (index.topics || []).length;
    const nChapters = (index.chapters || []).length;
    const stats = el("div", "hero-stats");
    const statDefs = [
      { v: String(nChapters), l: "hoofdstukken", c: "c-cyan" },
      { v: String(nTopics), l: "onderwerpen", c: "c-green" },
      { v: "±25", l: "formules & diagrammen", c: "c-yellow" },
      { v: "13", l: "code-voorbeelden", c: "c-magenta" },
    ];
    statDefs.forEach((s) => {
      stats.appendChild(el("div", "stat", '<span class="stat-value ' + s.c + '">' + s.v + '</span><span class="stat-label">' + s.l + "</span>"));
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
        '<h2><span class="kicker">01</span> Kies een onderwerp</h2>' +
          "<p>Klik op een rij in de tabel om de samenvatting te openen. " +
          "Filter op hoofdstuk of zoek op trefwoord — elk onderwerp bevat theorie, formules, code en geheugensteuntjes.</p>"
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
    search.placeholder = "Zoek in onderwerpen… (bijv. ‘kernel’ of ‘regularisatie’)";
    search.setAttribute("aria-label", "Zoek in onderwerpen");
    searchWrap.appendChild(search);
    filterBar.appendChild(searchWrap);

    const chipRow = el("div", "chip-row");
    chipRow.setAttribute("role", "group");
    chipRow.setAttribute("aria-label", "Filter op hoofdstuk");
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
    mkChip("Alle", "rgba(255,255,255,0.85)", null);
    chapters.forEach((ch) => mkChip(escapeHtml(ch.name), "var(--" + ch.accent + ")", ch.id));

    filterBar.appendChild(chipRow);
    section.appendChild(filterBar);

    /* ---------- Tabel ---------- */
    const shell = el("div", "table-shell");
    const table = el("table", "topic-table");
    const thead = el(
      "thead",
      null,
      "<tr><th>Hoofdstuk</th><th>Onderwerp</th><th>Wat leer je</th><th>Niveau</th></tr>"
    );
    table.appendChild(thead);
    const tbody = el("tbody");
    const chapterById = {};
    chapters.forEach((ch) => (chapterById[ch.id] = ch));

    let i = 0;
    let currentChapter = null;
    (index.topics || []).forEach((t) => {
      const ch = chapterById[t.chapter] || { name: "Overig", accent: "cyan", id: "x" };
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
      row.dataset.topic = t.id;
      row.dataset.chapter = t.chapter;
      row.dataset.search = (t.title + " " + (t.summary || "") + " " + (t.keywords || "") + " " + (ch.name || "")).toLowerCase();
      row.setAttribute("aria-label", "Open onderwerp: " + t.title);
      row.style.setProperty("--accent", "var(--" + ch.accent + ")");
      row.style.setProperty("--i", i);

      const level = t.level || 1;
      const dots =
        '<span class="level-dots">' +
        [1, 2, 3].map((n) => '<i class="' + (n <= level ? "on" : "") + '"></i>').join("") +
        '</span><span class="level-label">' + (MLP.LEVELS[level] || "") + "</span>";

      row.innerHTML =
        "<td></td>" +
        '<td class="td-main"><span class="td-title">' +
        escapeHtml(t.title) +
        '<span class="arrow" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 8h11M9 3.5L13.5 8 9 12.5"/></svg></span></span></td>' +
        '<td class="td-summary">' +
        escapeHtml(t.summary || "") +
        "</td>" +
        '<td class="td-level">' +
        dots +
        "</td>";

      const go = () => {
        location.hash = "#/onderwerp/" + encodeURIComponent(t.id);
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
          emptyRow.appendChild(el("td", null, "Geen onderwerpen gevonden — probeer een andere zoekterm."));
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
    const pos = topics.findIndex((t) => t.id === id);
    const prev = pos > 0 ? topics[pos - 1] : null;
    const next = pos >= 0 && pos < topics.length - 1 ? topics[pos + 1] : null;

    const frag = document.createDocumentFragment();
    const main = el("article", "topic");
    main.style.setProperty("--accent", "var(--" + chapter.accent + ")");

    /* kop */
    const head = el("header", "topic-head");
    head.appendChild(
      el(
        "a",
        "crumb",
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 2.5L4.5 8l5.5 5.5"/></svg> Alle onderwerpen <span class="sep">/</span> ' +
          escapeHtml(chapter.name)
      )
    );
    head.firstChild.href = "#/";
    head.appendChild(el("div", "topic-chapter", '<span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block"></span> ' + escapeHtml(chapter.name)));
    head.appendChild(el("h1", "topic-title", escapeHtml(topic.title)));

    const words = countWords(topic);
    const minutes = Math.max(1, Math.round(words / 190));
    const meta = el("div", "topic-meta");
    meta.innerHTML =
      '<span class="m">' + (MLP.LEVELS[topic.level || 1] || "Basis") + "</span>" +
      '<span class="m">± ' + minutes + " min lezen</span>" +
      '<span class="m">' + (topic.sections || []).length + " secties</span>";
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
      pager.setAttribute("aria-label", "Navigatie tussen onderwerpen");
      if (prev) {
        const a = el("a", "prev", '<span class="dir">‹ vorige</span><span class="pg-title">' + escapeHtml(prev.title) + "</span>");
        a.href = "#/onderwerp/" + encodeURIComponent(prev.id);
        pager.appendChild(a);
      } else {
        pager.appendChild(el("span"));
      }
      if (next) {
        const a = el("a", "next", '<span class="dir">volgende ›</span><span class="pg-title">' + escapeHtml(next.title) + "</span>");
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
        "<h2>Content kon niet geladen worden</h2>" +
          "<p>De onderwerpen staan in JSON-bestanden en worden geladen via HTTP. " +
          (isFile
            ? "Je hebt de site rechtstreeks als bestand geopend — start een server, bijvoorbeeld met <code>uvicorn main:app</code> (FastAPI) of <code>python -m http.server</code>."
            : "Controleer of de map <code>content/</code> compleet is en of de server draait. " +
              "Foutmelding: <code>" +
              escapeHtml(String((err && err.message) || err)) +
              "</code>") +
          "</p>" +
          "<p>Zie <code>README.md</code> voor de snelle start.</p>"
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
     Opstarten
     ============================================================ */

  window.addEventListener("hashchange", route);

  window.addEventListener("DOMContentLoaded", () => {
    initProgress();
    route();
  });

  if (document.readyState !== "loading") {
    initProgress();
    route();
  }
})(window.MLP);
