/* ============================================================
   MLP — blocks.js
   Renderers voor contentblokken:
   text · formula (KaTeX) · code (copy + uitvoeren) · callout ·
   table · plot (interactieve SVG-grafiek)
   ============================================================ */

window.MLP = window.MLP || {};

(function (MLP) {
  "use strict";

  const { escapeHtml, el, COLORS } = MLP.util;

  /* Accentkleur van een hoofdstuk ophalen (voor context-elementen) */
  function accentColorOf(ctx) {
    const map = ctx && ctx.accentMap ? ctx.accentMap : {};
    return map[ctx && ctx.accent] || COLORS.cyan;
  }

  MLP.blocks = { accentColorOf };

  /* ============================================================
     Code-veld (kopieren + uitvoeren)
     ============================================================ */

  function renderCodeBlock(block, ctx) {
    const field = el("div", "code-field block");
    field.style.setProperty("--accent", accentColorOf(ctx));

    const source = block.source || "";
    const lang = block.language || "python";
    const runnable = block.runnable === true;

    /* --- kopbalk --- */
    const head = el("div", "code-head");
    head.appendChild(el("span", "code-lang", escapeHtml(lang)));
    if (block.caption) head.appendChild(el("span", "code-caption", escapeHtml(block.caption)));

    const actions = el("div", "code-actions");

    if (runnable) {
      const runBtn = el(
        "button",
        "code-btn btn-run",
        '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5-9-5.5z"/></svg> Uitvoeren'
      );
      runBtn.type = "button";
      runBtn.title = "Draai deze code in je browser (Pyodide/WebAssembly)";
      runBtn.setAttribute("aria-label", "Code uitvoeren");
      actions.appendChild(runBtn);
      runBtn.addEventListener("click", () => {
        MLP.runner.runInField(runBtn, output, source);
      });
    }

    const copyBtn = el(
      "button",
      "code-btn btn-copy",
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.6"/><path d="M10.5 3.5h-7a1 1 0 0 0-1 1v7"/></svg> Kopiëren'
    );
    copyBtn.type = "button";
    copyBtn.title = "Kopieer de code naar je klembord";
    copyBtn.setAttribute("aria-label", "Code kopiëren");
    copyBtn.addEventListener("click", async () => {
      const okLabel =
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7-8"/></svg> Gekopieerd!';
      const oldLabel = copyBtn.innerHTML;
      let copied = false;
      try {
        await copyToClipboard(source);
        copied = true;
      } catch (e) {
        /* beide methoden faalden */
      }
      if (copied) {
        copyBtn.classList.add("copied");
        copyBtn.innerHTML = okLabel;
      } else {
        /* laatste redmiddel: code selecteren, zodat Ctrl+C zeker werkt */
        try {
          const range = document.createRange();
          range.selectNodeContents(code);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          copyBtn.innerHTML = "Geselecteerd — Ctrl+C";
        } catch (e) {
          copyBtn.innerHTML = "Mislukt";
        }
      }
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.innerHTML = oldLabel;
      }, 2200);
    });

    actions.appendChild(copyBtn);
    head.appendChild(actions);
    field.appendChild(head);

    /* --- code --- */
    const pre = el("pre");
    const code = el("code", null, escapeHtml(source));
    code.className = "language-" + escapeHtml(lang);
    pre.appendChild(code);
    field.appendChild(pre);

    if (window.hljs) {
      try {
        window.hljs.highlightElement(code);
      } catch (e) {
        /* highlighting is optioneel */
      }
    }

    /* --- uitvoerpaneel (alleen bij uitvoerbare code) --- */
    const output = el("div", "code-output");
    if (runnable) {
      const label = el("div", "output-label", '<span class="spinner" aria-hidden="true"></span><span class="txt">Uitvoer</span>');
      const outPre = el("pre");
      outPre.setAttribute("aria-live", "polite");
      output.appendChild(label);
      output.appendChild(outPre);
      const hint = el(
        "div",
        "output-hint",
        "De code draait volledig in je browser via Pyodide (Python + scikit-learn in WebAssembly). " +
          "De eerste keer laden duurt ±10–30 s; daarna gaat het snel."
      );
      output.appendChild(hint);
      field.appendChild(output);
    }

    return field;
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (e) {
        /* clipboard API geweigerd/niet beschikbaar → val terug op execCommand */
      }
    }
    /* fallback voor http (bv. lokaal zonder https) of geweigerde permissies */
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand("copy");
      if (!ok) throw new Error("copy mislukt");
    } finally {
      document.body.removeChild(ta);
    }
  }

  MLP.copyToClipboard = copyToClipboard;

  /* ============================================================
     Plot-blok — interactieve SVG-grafiek
     ============================================================ */

  function renderPlotBlock(block, ctx) {
    const card = el("div", "plot-card block");
    card.style.setProperty("--accent", accentColorOf(ctx));

    if (block.title) card.appendChild(el("h3", "plot-title", escapeHtml(block.title)));
    if (block.subtitle) card.appendChild(el("p", "plot-sub", escapeHtml(block.subtitle)));

    const canvas = el("div", "plot-canvas");
    card.appendChild(canvas);

    const tooltip = el("div", "plot-tooltip");
    card.appendChild(tooltip);

    const legend = el("div", "plot-legend");
    card.appendChild(legend);

    const spec = block;
    const curves = (spec.curves || []).map((c) => ({
      expr: c.expr,
      label: c.label || "f(x)",
      color: COLORS[c.color] || c.color || COLORS.cyan,
    }));

    const sliderSpec = spec.slider || null;

    const W = 620, H = 380;
    const PAD = { l: 54, r: 18, t: 18, b: 44 };
    const NS = "http://www.w3.org/2000/svg";

    function svgNode(tag, attrs) {
      const node = document.createElementNS(NS, tag);
      for (const k in attrs) node.setAttribute(k, attrs[k]);
      return node;
    }

    function build() {
      canvas.innerHTML = "";
      const xr = spec.xrange || [-4, 4];
      let yr = spec.yrange || [-1.2, 3.2];

      /* y-bereik automatisch als niet opgegeven */
      if (!spec.yrange && curves.length) {
        let ymin = Infinity, ymax = -Infinity;
        const f = compileExpr(curves[0].expr, sliderSpec ? sliderSpec.value : null);
        for (let i = 0; i <= 120; i++) {
          const x = xr[0] + ((xr[1] - xr[0]) * i) / 120;
          const y = f(x);
          if (isFinite(y)) {
            ymin = Math.min(ymin, y);
            ymax = Math.max(ymax, y);
          }
        }
        if (ymin === Infinity) { ymin = -1; ymax = 1; }
        if (ymax - ymin < 0.5) { ymax += 0.5; ymin -= 0.5; }
        const m = (ymax - ymin) * 0.08;
        yr = [ymin - m, ymax + m];
      }

      const svg = svgNode("svg", { viewBox: "0 0 " + W + " " + H, role: "img" });
      const desc = spec.title || "grafiek";
      svg.appendChild(svgNode("title", {})).textContent = desc;
      svg.setAttribute("aria-label", desc);

      const sx = (x) => PAD.l + ((x - xr[0]) / (xr[1] - xr[0])) * (W - PAD.l - PAD.r);
      const sy = (y) => H - PAD.b - ((y - yr[0]) / (yr[1] - yr[0])) * (H - PAD.t - PAD.b);

      /* raster */
      const gridG = svgNode("g", { stroke: "rgba(255,255,255,0.06)", "stroke-width": 1 });
      const niceStep = (range) => {
        const raw = range / 6;
        const pow = Math.pow(10, Math.floor(Math.log10(raw)));
        const n = raw / pow;
        return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
      };
      const xstep = niceStep(xr[1] - xr[0]);
      const ystep = niceStep(yr[1] - yr[0]);
      const fmt = (v) => {
        if (Math.abs(v) < 1e-9) return "0";
        return Math.abs(v) >= 100 || Math.abs(v) < 0.01 ? v.toExponential(0) : String(+v.toFixed(2));
      };
      for (let gx = Math.ceil(xr[0] / xstep) * xstep; gx <= xr[1] + 1e-9; gx += xstep) {
        gridG.appendChild(svgNode("line", { x1: sx(gx), y1: PAD.t, x2: sx(gx), y2: H - PAD.b }));
      }
      for (let gy = Math.ceil(yr[0] / ystep) * ystep; gy <= yr[1] + 1e-9; gy += ystep) {
        gridG.appendChild(svgNode("line", { x1: PAD.l, y1: sy(gy), x2: W - PAD.r, y2: sy(gy) }));
      }
      svg.appendChild(gridG);

      /* assen */
      const axisAttrs = { stroke: "rgba(255,255,255,0.35)", "stroke-width": 1.4 };
      if (yr[0] <= 0 && yr[1] >= 0) {
        svg.appendChild(svgNode("line", Object.assign({ x1: PAD.l, y1: sy(0), x2: W - PAD.r, y2: sy(0) }, axisAttrs)));
      }
      if (xr[0] <= 0 && xr[1] >= 0) {
        svg.appendChild(svgNode("line", Object.assign({ x1: sx(0), y1: PAD.t, x2: sx(0), y2: H - PAD.b }, axisAttrs)));
      }

      /* ticklabels */
      const tickAttrs = { fill: "rgba(255,255,255,0.45)", "font-size": 11, "font-family": "JetBrains Mono, monospace" };
      for (let gx = Math.ceil(xr[0] / xstep) * xstep; gx <= xr[1] + 1e-9; gx += xstep) {
        const t = svgNode("text", Object.assign({ x: sx(gx), y: H - PAD.b + 18, "text-anchor": "middle" }, tickAttrs));
        t.textContent = fmt(gx);
        svg.appendChild(t);
      }
      for (let gy = Math.ceil(yr[0] / ystep) * ystep; gy <= yr[1] + 1e-9; gy += ystep) {
        const t = svgNode("text", Object.assign({ x: PAD.l - 8, y: sy(gy) + 4, "text-anchor": "end" }, tickAttrs));
        t.textContent = fmt(gy);
        svg.appendChild(t);
      }

      /* asnamen */
      const xa = svgNode("text", Object.assign({ x: W - PAD.r, y: H - PAD.b + 34, "text-anchor": "end", fill: "rgba(255,255,255,0.5)", "font-size": 11, "font-family": "Inter, sans-serif" }, {}));
      xa.textContent = spec.xlabel || "raw model output";
      svg.appendChild(xa);

      /* curven */
      const paramVal = sliderSpec ? sliderSpec.value : null;
      curves.forEach((c) => {
        const f = compileExpr(c.expr, paramVal);
        const N = 240;
        let d = "";
        let pen = false;
        for (let i = 0; i <= N; i++) {
          const x = xr[0] + ((xr[1] - xr[0]) * i) / N;
          const y = f(x);
          if (!isFinite(y) || y < yr[0] - 1 || y > yr[1] + 1) {
            pen = false;
            continue;
          }
          const px = sx(x), py = sy(Math.min(Math.max(y, yr[0]), yr[1]));
          d += (pen ? "L" : "M") + px.toFixed(1) + " " + py.toFixed(1) + " ";
          pen = true;
        }
        if (d) {
          svg.appendChild(
            svgNode("path", { d: d, fill: "none", stroke: c.color, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" })
          );
        }
      });

      /* crosshair + hover */
      const cross = svgNode("line", { x1: 0, y1: PAD.t, x2: 0, y2: H - PAD.b, stroke: "rgba(255,255,255,0.25)", "stroke-dasharray": "4 4", "stroke-width": 1, opacity: 0 });
      svg.appendChild(cross);

      const overlay = svgNode("rect", { x: PAD.l, y: PAD.t, width: W - PAD.l - PAD.r, height: H - PAD.t - PAD.b, fill: "transparent" });
      svg.appendChild(overlay);

      overlay.addEventListener("mousemove", (ev) => {
        const rect = svg.getBoundingClientRect();
        const scale = W / rect.width;
        const mx = (ev.clientX - rect.left) * scale;
        if (mx < PAD.l || mx > W - PAD.r) return;
        const x = xr[0] + ((mx - PAD.l) / (W - PAD.l - PAD.r)) * (xr[1] - xr[0]);
        cross.setAttribute("x1", mx);
        cross.setAttribute("x2", mx);
        cross.setAttribute("opacity", 1);
        let rows = '<span class="tt-x">x = ' + x.toFixed(2) + "</span>";
        curves.forEach((c) => {
          const f = compileExpr(c.expr, paramVal);
          const y = f(x);
          rows +=
            '<br><span class="sw" style="background:' + c.color + '"></span>' +
            escapeHtml(c.label) + " = " + (isFinite(y) ? y.toFixed(2) : "—");
        });
        tooltip.innerHTML = rows;
        /* mx staat in viewBox-eenheden → omrekenen naar CSS-pixels */
        tooltip.style.left = mx / scale + "px";
        tooltip.style.top = PAD.t / scale + 10 + "px";
        tooltip.classList.add("show");
      });
      overlay.addEventListener("mouseleave", () => {
        cross.setAttribute("opacity", 0);
        tooltip.classList.remove("show");
      });

      canvas.appendChild(svg);
    }

    function compileExpr(expr, paramValue) {
      /* compileer "Math.log(1+Math.exp(-x))" tot f(x) — evt. met extra parameter */
      if (sliderSpec && paramValue !== null && paramValue !== undefined) {
        const f = new Function("x", sliderSpec.param, '"use strict"; return (' + expr + ");");
        return (x) => f(x, paramValue);
      }
      const f = new Function("x", '"use strict"; return (' + expr + ");");
      return f;
    }

    build();

    /* legenda */
    curves.forEach((c) => {
      legend.appendChild(
        el("span", "li", '<span class="sw" style="background:' + c.color + '"></span>' + escapeHtml(c.label))
      );
    });

    /* slider */
    let sliderLabel = null;
    if (sliderSpec) {
      const row = el("div", "plot-slider");
      const lab = el("label", null, escapeHtml(sliderSpec.label || sliderSpec.param));
      const input = document.createElement("input");
      input.type = "range";
      input.min = sliderSpec.min;
      input.max = sliderSpec.max;
      input.step = sliderSpec.step || 0.1;
      input.value = sliderSpec.value;
      input.setAttribute("aria-label", sliderSpec.label || sliderSpec.param);
      const val = el("span", "slider-val", String(+Number(sliderSpec.value).toFixed(2)));
      row.appendChild(lab);
      row.appendChild(input);
      row.appendChild(val);
      card.appendChild(row);
      sliderLabel = val;

      input.addEventListener("input", () => {
        sliderSpec.value = parseFloat(input.value);
        val.textContent = String(+sliderSpec.value.toFixed(2));
        build();
      });
    }

    return card;
  }

  /* ============================================================
     Overige blokken
     ============================================================ */

  function renderFormulaBlock(block, ctx) {
    const wrap = el("div", "formula-block block");
    wrap.style.setProperty("--accent", accentColorOf(ctx));
    const label = el("div", "formula-label", block.label || "formule");
    wrap.appendChild(label);
    const target = el("div");
    wrap.appendChild(target);
    if (window.katex) {
      try {
        window.katex.render(block.latex || "", target, {
          displayMode: true,
          throwOnError: false,
          strict: "ignore",
          trust: false,
        });
      } catch (e) {
        target.textContent = block.latex || "";
        target.style.fontFamily = "monospace";
      }
    } else {
      target.textContent = block.latex || "";
      target.style.fontFamily = "monospace";
    }
    if (block.caption) wrap.appendChild(el("div", "formula-caption", escapeHtml(block.caption)));
    return wrap;
  }

  function renderCalloutBlock(block, ctx) {
    const wrap = el("div", "callout block");
    wrap.style.setProperty("--accent", accentColorOf(ctx));
    const tagText = { info: "info", tip: "tip", warning: "pas op", key: "kern" }[block.kind] || "info";
    wrap.appendChild(el("span", "callout-tag", tagText));
    wrap.appendChild(el("div", "callout-body", block.html || ""));
    return wrap;
  }

  function renderTableBlock(block, ctx) {
    const wrap = el("div", "table-wrap block");
    wrap.style.setProperty("--accent", accentColorOf(ctx));
    const table = el("table", "data-table");
    const thead = el("thead");
    const trh = el("tr");
    (block.headers || []).forEach((h) => trh.appendChild(el("th", null, h)));
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = el("tbody");
    (block.rows || []).forEach((r) => {
      const tr = el("tr");
      (r || []).forEach((cell) => tr.appendChild(el("td", null, String(cell))));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  /* ============================================================
     Dispatch
     ============================================================ */

  function renderBlock(block, ctx) {
    switch (block && block.type) {
      case "text":
        return el("div", "block-text block", block.html || "");
      case "formula":
        return renderFormulaBlock(block, ctx);
      case "code":
        return renderCodeBlock(block, ctx);
      case "callout":
        return renderCalloutBlock(block, ctx);
      case "table":
        return renderTableBlock(block, ctx);
      case "plot":
        return renderPlotBlock(block, ctx);
      default:
        return null;
    }
  }

  function renderSection(section, index, ctx) {
    const sec = el("section", "topic-section reveal");
    const h2 = el("h2");
    h2.appendChild(el("span", "sec-num", String(index + 1).padStart(2, "0")));
    h2.appendChild(document.createTextNode(section.title || ""));
    sec.appendChild(h2);
    (section.blocks || []).forEach((block) => {
      const node = renderBlock(block, ctx);
      if (node) {
        node.classList.add("reveal");
        sec.appendChild(node);
      }
    });
    return sec;
  }

  MLP.blocks.render = renderBlock;
  MLP.blocks.renderSection = renderSection;
})(window.MLP);
