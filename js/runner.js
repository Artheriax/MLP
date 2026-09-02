/* ============================================================
   MLP — runner.js
   Voert Python-code uit in de browser via Pyodide
   (CPython in WebAssembly) + scikit-learn.
   Wordt lazy geladen: pas bij de eerste klik op "Uitvoeren".
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  const PYODIDE_VERSION = "0.26.4";
  const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-src="' + src + '"]');
      if (existing && existing.dataset.loaded === "1") return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.dataset.src = src;
      s.onload = () => {
        s.dataset.loaded = "1";
        resolve();
      };
      s.onerror = () => reject(new Error("Kon script niet laden: " + src));
      document.head.appendChild(s);
    });
  }

  const state = {
    pyodide: null,
    loadingPromise: null,
    failed: false,
  };

  async function ensurePyodide(onStatus) {
    if (state.pyodide) return state.pyodide;
    if (state.failed) throw new Error("Pyodide is eerder mislukt — herlaad de pagina om het opnieuw te proberen.");
    if (!state.loadingPromise) {
      state.loadingPromise = (async () => {
        onStatus("Python-omgeving laden (eenmalig, ±10–30 s)…");
        await loadScriptOnce(PYODIDE_URL + "pyodide.js");
        if (typeof loadPyodide === "undefined") {
          throw new Error("Pyodide-script geladen, maar loadPyodide ontbreekt (CDN gewijzigd?)");
        }
        const py = await loadPyodide({ indexURL: PYODIDE_URL });
        onStatus("scikit-learn + numpy laden…");
        await py.loadPackage(["scikit-learn"]);
        state.pyodide = py;
        onStatus(null);
        return py;
      })().catch((err) => {
        state.failed = true;
        state.loadingPromise = null;
        throw err;
      });
    }
    return state.loadingPromise;
  }

  /* Voer code uit binnen één code-veld (knop + uitvoerpaneel uit blocks.js) */
  async function runInField(button, outputEl, source) {
    if (button.disabled) return;
    button.disabled = true;
    const label = outputEl.querySelector(".output-label .txt");
    const spinner = outputEl.querySelector(".output-label .spinner");
    const outPre = outputEl.querySelector("pre");
    const hint = outputEl.querySelector(".output-hint");

    outputEl.classList.add("open", "loading");
    outPre.classList.remove("is-error");
    outPre.textContent = "";

    const say = (msg) => {
      if (label) label.textContent = msg || "Uitvoer";
      if (hint) hint.style.display = msg ? "none" : "";
    };

    const write = (text, isError) => {
      outPre.textContent += text;
      if (text && !text.endsWith("\n")) outPre.textContent += "\n";
      outPre.classList.toggle("is-error", !!isError);
      outPre.scrollTop = outPre.scrollHeight;
    };

    try {
      const py = await ensurePyodide(say);
      say("Uitvoeren…");
      py.setStdout({ batched: (s) => write(s, false) });
      py.setStderr({ batched: (s) => write(s, true) });
      await py.runPythonAsync(source);
      if (!outPre.textContent) {
        outPre.textContent = "(geen uitvoer — code draaide zonder print)";
        outPre.style.color = "var(--text-faint)";
        setTimeout(() => (outPre.style.color = ""), 1500);
      }
    } catch (err) {
      const msg = String((err && err.message) || err);
      outPre.classList.add("is-error");
      outPre.textContent =
        "Fout bij laden of uitvoeren:\n" +
        msg +
        (state.failed
          ? "\n\nTip: check je internetverbinding (Pyodide komt van een CDN) of herlaad de pagina."
          : "");
      if (hint) hint.style.display = "none";
    } finally {
      outputEl.classList.remove("loading");
      say(null);
      if (label) label.textContent = "Uitvoer";
      button.disabled = false;
    }
  }

  MLP.runner = { ensurePyodide, runInField };
})(window.MLP);
