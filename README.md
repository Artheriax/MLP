# MLP — Machine Learning samengevat

Een donkere, modulaire studiewebsite met samenvattingen van de cursus
**Logistic Regression & SVM's met scikit-learn** — inclusief formules,
interactieve diagrammen en code-voorbeelden die je **direct in je browser
kunt uitvoeren** (via Pyodide: CPython + scikit-learn in WebAssembly).

- **Frontend**: pure HTML/CSS/JS — geen build-stap, geen framework
- **Backend (optioneel, lokaal)**: FastAPI serveert de site én een REST-API over de content
- **Hosting**: 100% GitHub Pages-ready (statische bestanden)

---

## Snel starten

### Optie A — met FastAPI (aanbevolen voor lokaal werken)

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Open **http://127.0.0.1:8000** — de site detecteert automatisch dat de API
draait en laadt de content via `/api/...`. Je kunt de API ook los bekijken op
**http://127.0.0.1:8000/docs** (interactieve Swagger-documentatie).

### Optie B — zonder Python

```bash
python -m http.server 8000
```

Open http://localhost:8000. (De site moet via een server lopen; rechtstreeks
openen als bestand (`file://`) werkt niet, omdat de content via `fetch` geladen wordt.)

---

## Deployen op GitHub Pages

1. Push de volledige map naar je repository (bijv. `github.com/<user>/<repo>`).
2. Ga in GitHub naar **Settings → Pages**.
3. Kies bij *Source* je branch (meestal `main`) en de map **/ (root)** → **Save**.
4. Na een minuut staat je site live op `https://<user>.github.io/<repo>/`.

Het bestandje `.nojekyll` in de root zorgt ervoor dat GitHub Pages de bestanden
letterlijk serveert (zonder Jekyll-verwerking). Er is géén build-stap nodig.

> Let op: op GitHub Pages draait de site puur statisch — de frontend valt dan
> automatisch terug op de JSON-bestanden in `content/`. FastAPI is dus een
> **lokale uitbreiding** (en something om te laten zien op school 😉): API,
> zoeken en endpoints zijn dan beschikbaar.

---

## Nieuwe stof toevoegen (modulair)

De site is opgezet zodat je **nooit JS-code hoeft aan te passen** om nieuwe
lesstof toe te voegen:

1. Maak een nieuw bestand `content/topics/<id>.json` (bv. `decision-trees.json`).
2. Voeg een regel toe aan de `topics`-lijst in `content/index.json`.
3. Klaar — de tabel, navigatie, zoeken en paging werken automatisch.

### Schema van een onderwerp

```jsonc
// content/topics/voorbeeld.json
{
  "id": "voorbeeld",              // zelfde id als de bestandsnaam
  "chapter": "ch1",               // verwijst naar chapters[] in index.json
  "title": "Titel van het onderwerp",
  "intro": "Korte inleiding bovenaan de pagina.",
  "level": 1,                     // 1 = Basis · 2 = Verdieping · 3 = Gevorderd
  "sections": [
    {
      "title": "Sectietitel",
      "blocks": [
        { "type": "text",    "html": "<p>Tekst met <strong>opmaak</strong> en inline wiskunde \\(x^2\\).</p>" },
        { "type": "formula", "label": "naam", "latex": "\\sigma(z) = \\frac{1}{1+e^{-z}}", "caption": "uitleg" },
        { "type": "code",    "language": "python", "caption": "bijschrift", "runnable": true,
          "source": "print('hallo')" },
        { "type": "callout", "kind": "info", "html": "<p>Let op …</p>" },   // info | tip | warning | key
        { "type": "table",   "headers": ["A", "B"], "rows": [["a1", "b1"]] },
        { "type": "plot",    "title": "Grafiek", "xrange": [-4, 4], "yrange": [0, 3],
          "curves": [{ "expr": "Math.max(0, 1-x)", "label": "hinge", "color": "magenta" }],
          "slider": { "param": "gamma", "min": 0.1, "max": 5, "step": 0.1, "value": 1, "label": "γ" } }
      ]
    }
  ]
}
```

**Tips**

- `expr` in een plot is een JS-expressie in `x` (en evt. de slider-parameter), bijv. `Math.exp(-gamma*x*x)`.
- Zet `runnable: true` alleen als de code ook echt in Pyodide draait (numpy/scipy/sklearn uit de standaarddatasets werken prima; geen plots of externe bestanden).
- Kleuren in plots/onderwerpen: `cyan`, `yellow`, `green`, `magenta`.
- Onbekende hoofdstukken? Voeg een nieuw object toe aan `chapters` in `content/index.json` en kies een accent-kleur.

---

## De FastAPI-API (lokaal)

| Endpoint | Beschrijving |
|---|---|
| `GET /api/health` | gezondheidscheck (frontend gebruikt dit voor detectie) |
| `GET /api/index` | volledige index (site, hoofdstukken, onderwerpen) |
| `GET /api/chapters` | hoofdstukken |
| `GET /api/topics` | onderwerpenlijst (`?chapter=ch1` om te filteren) |
| `GET /api/topics/{id}` | alle content van één onderwerp |
| `GET /api/search?q=kernel` | trefwoord-zoekopdracht |

De API leest dezelfde JSON-bestanden als de statische site — één bron van waarheid.

---

## Technische opbouw

```
MLP/
├── index.html            # enige HTML-pagina (SPA met hash-routering #/onderwerp/<id>)
├── css/style.css         # volledig ontwerp (#161616 · wit · pastel-accenten)
├── js/
│   ├── content.js        # datalaag: FastAPI-API of statische JSON (automatische fallback)
│   ├── blocks.js           # renderers: tekst, formules (KaTeX), code-velden, callouts, tabellen, plots
│   ├── runner.js         # Pyodide-runner: code in de browser uitvoeren (lazy geladen)
│   └── app.js            # router, homepage + tabel, zoekfilter, transitities
├── content/
│   ├── index.json        # hoofdstukken + onderwerpen-register
│   └── topics/*.json     # 12 onderwerpen over de cursus
├── main.py               # FastAPI: statische site + REST-API
├── requirements.txt      # fastapi + uvicorn
├── .nojekyll             # GitHub Pages: geen Jekyll
└── README.md             # dit bestand
```

**Externe libraries (via CDN, dus internet nodig):** Google Fonts (typografie),
KaTeX (formules), highlight.js (syntax-kleuring) en Pyodide (code-uitvoering).
Zonder internet werkt de site nog steeds — formules/code tonen dan platte tekst.

**Waarom geen framework?** De opdracht vraagt om een HTML-site die op GitHub
Pages moet draaien (statisch). Met een pure frontend is er geen build-stap,
werkt alles op elke static host, en blijft de code leesbaar/aanpasbaar. FastAPI
voegt lokaal een echte backend toe zodra je die nodig hebt.
