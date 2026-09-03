/* ============================================================
   MLP — i18n.js
   Tweilingige interface (NL standaard · EN secundair).
   - t(key) geeft de string in de actieve taal
   - setLang(lang) wisselt van taal en vuurt "mlp:langchange"
   - keuze wordt onthouden in localStorage ("mlp-lang");
     zonder opgeslagen voorkeur is Nederlands de default
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  var STORAGE_KEY = "mlp-lang";
  var SUPPORTED = ["nl", "en"];

  var STRINGS = {
    nl: {
      /* document */
      doc_title: "MLP — Machine Learning samengevat",
      doc_description:
        "Machine Learning stof helder samengevat: van de basis tot scikit-learn, loss functions, logistic regression en SVM's — met formules, voorbeelden en uitvoerbare code.",
      /* navigatie */
      nav_home: "Startpagina",
      brand_sub: "machine\u00a0learning\u00a0Practice",
      lang_switch_to: "Schakel over naar het Engels",
      lang_current: "Nederlands",
      /* startpagina */
      home_title: "Machine Learning, helder samengevat",
      home_lede_fallback:
        "Van de eerste basisbegrippen tot logistic regression en support vector machines met scikit-learn: " +
        "de theorie in begrijpelijke stukjes, met formules, voorbeelden en code die je direct in je browser kunt draaien.",
      home_meta: "{ch} hoofdstukken \u00b7 {n} onderwerpen \u00b7 formules & uitvoerbare code",
      sidebar_search_placeholder: "Zoek in inhoud\u2026",
      sidebar_search_aria: "Zoek in onderwerpen en hun inhoud",
      menu_aria: "Zijbalk openen of sluiten",
      empty_row: "Geen onderwerpen gevonden \u2014 probeer een ander zoekwoord.",
      search_results: "{n} resultaten",
      search_indexing: "Inhoud doorzoeken\u2026",
      theme_to_light: "Schakel naar licht thema",
      theme_to_dark: "Schakel naar donker thema",
      /* niveaus */
      level_1: "Basis",
      level_2: "Verdieping",
      level_3: "Gevorderd",
      /* topic-pagina */
      crumb_all: "Alle onderwerpen",
      meta_level_fallback: "Basis",
      meta_minutes: "\u00b1 {n} min lezen",
      meta_sections: "{n} secties",
      pager_aria: "Navigatie tussen onderwerpen",
      pager_prev: "\u2039 vorige",
      pager_next: "volgende \u203a",
      /* code-blokken */
      btn_run: "Uitvoeren",
      btn_run_title: "Draai deze code in je browser (Pyodide/WebAssembly)",
      btn_run_aria: "Code uitvoeren",
      btn_copy: "Kopi\u00ebren",
      btn_copy_title: "Kopieer de code naar je klembord",
      btn_copy_aria: "Code kopi\u00ebren",
      btn_copied: "Gekopieerd!",
      btn_selected: "Geselecteerd \u2014 Ctrl+C",
      btn_failed: "Mislukt",
      output_label: "Uitvoer",
      output_hint:
        "De code draait volledig in je browser via Pyodide (Python + scikit-learn in WebAssembly). " +
        "De eerste keer laden duurt \u00b110\u201330 s; daarna gaat het snel.",
      formula_fallback: "formule",
      plot_fallback: "grafiek",
      xlabel_fallback: "x",
      plot_metrics_aria: "live metrics die meebewegen met de sliders",
      /* callouts */
      callout_info: "info",
      callout_tip: "tip",
      callout_warning: "pas op",
      callout_key: "kern",
      /* runner */
      run_loading_py: "Python-omgeving laden (eenmalig, \u00b110\u201330 s)\u2026",
      run_loading_skl: "scikit-learn + numpy laden\u2026",
      run_running: "Uitvoeren\u2026",
      run_no_output: "(geen uitvoer \u2014 code draaide zonder print)",
      run_error_prefix: "Fout bij laden of uitvoeren:",
      run_error_tip:
        "\n\nTip: check je internetverbinding (Pyodide komt van een CDN) of herlaad de pagina.",
      run_failed_before: "Pyodide is eerder mislukt \u2014 herlaad de pagina om het opnieuw te proberen.",
      script_load_fail: "Kon script niet laden: ",
      /* foutkaart */
      error_title: "Content kon niet geladen worden",
      error_body_file:
        "De onderwerpen staan in JSON-bestanden en worden geladen via HTTP. " +
        "Je hebt de site rechtstreeks als bestand geopend \u2014 start een server, bijvoorbeeld met " +
        "<code>uvicorn main:app</code> (FastAPI) of <code>python -m http.server</code>.",
      error_body_server:
        "Controleer of de map <code>content/</code> compleet is en of de server draait. Foutmelding: <code>{err}</code>",
      error_footer: "Zie <code>README.md</code> voor de snelle start.",
      noscript_title: "JavaScript staat uit",
      noscript_body: "Deze site rendert haar inhoud met JavaScript. Zet JavaScript aan om de samenvattingen te lezen.",
    },

    en: {
      /* document */
      doc_title: "MLP — Machine Learning, clearly summarised",
      doc_description:
        "Machine Learning material, clearly summarised: from the basics to scikit-learn, loss functions, logistic regression and SVMs — " +
        "with formulas, examples and runnable code.",
      /* navigatie */
      nav_home: "Home",
      brand_sub: "machine\u00a0learning\u00a0Practice",
      lang_switch_to: "Switch to Dutch",
      lang_current: "English",
      /* home */
      home_title: "Machine Learning, clearly summarised",
      home_lede_fallback:
        "From the first basic concepts to logistic regression and support vector machines with scikit-learn: " +
        "the theory in understandable chunks, with formulas, examples and code you can run right in your browser.",
      home_meta: "{ch} chapters \u00b7 {n} topics \u00b7 formulas & runnable code",
      sidebar_search_placeholder: "Search content\u2026",
      sidebar_search_aria: "Search topics and their content",
      menu_aria: "Open or close sidebar",
      empty_row: "No topics found \u2014 try another search term.",
      search_results: "{n} results",
      search_indexing: "Indexing content\u2026",
      theme_to_light: "Switch to light theme",
      theme_to_dark: "Switch to dark theme",
      /* niveaus */
      level_1: "Basic",
      level_2: "Intermediate",
      level_3: "Advanced",
      /* topic-pagina */
      crumb_all: "All topics",
      meta_level_fallback: "Basic",
      meta_minutes: "\u00b1 {n} min read",
      meta_sections: "{n} sections",
      pager_aria: "Topic navigation",
      pager_prev: "\u2039 previous",
      pager_next: "next \u203a",
      /* code-blokken */
      btn_run: "Run",
      btn_run_title: "Run this code in your browser (Pyodide/WebAssembly)",
      btn_run_aria: "Run code",
      btn_copy: "Copy",
      btn_copy_title: "Copy the code to your clipboard",
      btn_copy_aria: "Copy code",
      btn_copied: "Copied!",
      btn_selected: "Selected \u2014 Ctrl+C",
      btn_failed: "Failed",
      output_label: "Output",
      output_hint:
        "The code runs entirely in your browser via Pyodide (Python + scikit-learn in WebAssembly). " +
        "The first load takes \u00b110\u201330 s; after that it is fast.",
      formula_fallback: "formula",
      plot_fallback: "chart",
      xlabel_fallback: "x",
      plot_metrics_aria: "live metrics that update as you drag the sliders",
      /* callouts */
      callout_info: "info",
      callout_tip: "tip",
      callout_warning: "watch out",
      callout_key: "key",
      /* runner */
      run_loading_py: "Loading Python runtime (one-off, \u00b110\u201330 s)\u2026",
      run_loading_skl: "Loading scikit-learn + numpy\u2026",
      run_running: "Running\u2026",
      run_no_output: "(no output \u2014 the code ran without printing)",
      run_error_prefix: "Error while loading or running:",
      run_error_tip:
        "\n\nTip: check your internet connection (Pyodide comes from a CDN) or reload the page.",
      run_failed_before: "Pyodide failed earlier \u2014 reload the page to try again.",
      script_load_fail: "Could not load script: ",
      /* foutkaart */
      error_title: "Content could not be loaded",
      error_body_file:
        "The topics live in JSON files and are loaded over HTTP. " +
        "You opened the site directly as a file \u2014 start a server, for example with " +
        "<code>uvicorn main:app</code> (FastAPI) or <code>python -m http.server</code>.",
      error_body_server:
        "Check that the <code>content/</code> folder is complete and the server is running. Error: <code>{err}</code>",
      error_footer: "See <code>README.md</code> for the quick start.",
      noscript_title: "JavaScript is disabled",
      noscript_body: "This site renders its content with JavaScript. Enable JavaScript to read the summaries.",
    },
  };

  /* Niveaulabels ( gebruikt in app.js via MLP.LEVELS) */
  var LEVELS = {
    nl: { 1: STRINGS.nl.level_1, 2: STRINGS.nl.level_2, 3: STRINGS.nl.level_3 },
    en: { 1: STRINGS.en.level_1, 2: STRINGS.en.level_2, 3: STRINGS.en.level_3 },
  };

  /* NL is de default: alleen een expliciet opgeslagen voorkeur
     of de taal-schakelaar wijzigt dat (de browser-taal telt niet). */
  function detectLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {
      /* localStorage kan geblokkeerd zijn */
    }
    return "nl";
  }

  var lang = detectLang();

  function t(key) {
    var table = STRINGS[lang] || STRINGS.nl;
    var s = table[key] !== undefined ? table[key] : STRINGS.nl[key];
    if (s === undefined) return key;
    return s;
  }

  /* {naam}-velden vervangen */
  function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (m, name) {
      return vars && vars[name] !== undefined ? String(vars[name]) : m;
    });
  }

  function tf(key, vars) {
    return fill(t(key), vars);
  }

  function setLang(newLang) {
    if (SUPPORTED.indexOf(newLang) === -1 || newLang === lang) return;
    lang = newLang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* voorkeur onthouden is optioneel */
    }
    applyToDocument();
    window.dispatchEvent(new CustomEvent("mlp:langchange", { detail: { lang: lang } }));
  }

  function applyToDocument() {
    document.documentElement.setAttribute("lang", lang);
    document.title = t("doc_title");
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t("doc_description"));
    var sub = document.querySelector(".brand-sub");
    if (sub) sub.textContent = t("brand_sub");
    var search = document.getElementById("sidebarSearch");
    if (search) {
      search.placeholder = t("sidebar_search_placeholder");
      search.setAttribute("aria-label", t("sidebar_search_aria"));
    }
    var menu = document.getElementById("menuToggle");
    if (menu) menu.setAttribute("aria-label", t("menu_aria"));
  }

  MLP.i18n = {
    lang: function () {
      return lang;
    },
    t: t,
    tf: tf,
    fill: fill,
    setLang: setLang,
    LEVELS: LEVELS,
    applyToDocument: applyToDocument,
  };
})(window.MLP);
