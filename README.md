# MLP — Machine Learning Practice

Een donkere, modulaire studiewebsite met samenvattingen van de cursus
**Logistic Regression & SVM's met scikit-learn** — inclusief formules,
interactieve diagrammen, code-voorbeelden die je **direct in je browser
kunt uitvoeren** (via Pyodide: CPython + scikit-learn in WebAssembly) en
**practice-opdrachten** met bewerkbare code-velden. De site is volledig
**tweetalig: Nederlands en Engels** (schakelen met de NL/EN-knop rechtsboven).

- **Frontend**: pure HTML/CSS/JS — geen build-stap, geen framework
- **Backend (optioneel, lokaal)**: FastAPI serveert de site én een REST-API over de content (NL + EN)
- **Hosting**: 100% GitHub Pages-ready (statische bestanden)
- **Talen**: NL (standaard) en EN — alle interface-teksten én alle 14 onderwerpen zijn vertaald

---

## Snel starten

### Optie A — met FastAPI (aanbevolen voor lokaal werken)

**Mac / Linux / Git Bash:**
```bash
bash start.sh
```

**Windows:** dubbelklik op **`start.bat`** (of voer het uit in de cmd).

Het script doet alles automatisch:

1. maakt de eerste keer een **virtual environment** aan in `.venv/` (zodat niets
   globaal geïnstalleerd wordt en je systeem schoon blijft);
2. installeert `fastapi` + `uvicorn` **binnen die venv**;
3. start de server met `uvicorn main:app --reload`.

De tweede keer dat je het draait, worden stappen 1–2 overgeslagen en start de
server meteen. Wil je volledig opnieuw beginnen? Verwijder dan gewoon de map
`.venv/` — die staat sowieso in `.gitignore`, dus die wordt nooit gecommit.

Open **http://127.0.0.1:8000** — de site detecteert automatisch dat de API
draait en laadt de content via `/api/...`. Je kunt de API ook los bekijken op
**http://127.0.0.1:8000/docs** (interactieve Swagger-documentatie).

<details>
<summary>Zonder startscript — handmatig met venv</summary>

```bash
python -m venv .venv
# activeren (Mac/Linux):
source .venv/bin/activate
# activeren (Windows):
.venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload
```
</details>

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
3. (optioneel, voor de Engelse versie) maak `content/topics.en/<id>.json` aan
   en voeg de regel ook toe aan `content/index.en.json` — ontbreekt de
   EN-variant, dan valt de site automatisch terug op de NL-versie.
4. Klaar — de tabel, navigatie, zoeken en paging werken automatisch.

### Tweetaligheid (i18n)

- De taal staat in `js/i18n.js` (UI-strings) + de content-mappen:
  `content/topics/` (NL) en `content/topics.en/` (EN).
- De keuze wordt onthouden in `localStorage` (sleutel `mlp-lang`); zonder
  voorkeur kiest de site op basis van de browsertaal.
- In de API-modus vraag je de Engelse versie op met `?lang=en`.

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
        { "type": "code",    "language": "python", "caption": "opdracht", "runnable": true, "editable": true,
          "source": "# JOUW CODE HIER\nreturn # JOUW CODE HIER" },   // bewerkbaar oefen-veld (textarea)
        { "type": "callout", "kind": "info", "html": "<p>Let op …</p>" },   // info | tip | warning | key
        { "type": "table",   "headers": ["A", "B"], "rows": [["a1", "b1"]] },
        { "type": "plot",    "title": "Grafiek", "xrange": [-4, 4], "yrange": [0, 3],
          "curves": [{ "expr": "Math.max(0, 1-x)", "label": "hinge", "color": "magenta" }],
          "points": [{ "x": 1, "y": 2, "color": "green" }],
          "sliders": [
            { "param": "b0", "min": -5, "max": 10, "step": 0.1, "value": 2, "label": "b0" },
            { "param": "b1", "min": -1, "max": 3, "step": 0.05, "value": 1, "label": "b1" }
          ] }
      ]
    }
  ]
}
```

**Tips**

- `expr` in een plot is een JS-expressie in `x` (en evt. de slider-parameters), bijv. `Math.exp(-gamma*x*x)` of `b0 + b1*x`.
- Plots ondersteunen sinds v1.1 ook `points` (datapunten, met optionele kleur/label) en meerdere sliders (`sliders: [...]`); het oude enkele-`slider`-formaat werkt nog steeds.
- `editable: true` op een code-blok maakt het veld bewerkbaar (textarea): ideaal voor oefeningen — de gebruiker past de code aan en drukt op Uitvoeren. Pyodide onthoudt definities tussen code-velden (top-level functies blijven beschikbaar), dus een opdracht-blok + losse test-blok werkt net als in Jupyter.
- Zet `runnable: true` alleen als de code ook echt in Pyodide draait (numpy/scipy/sklearn uit de standaarddatasets werken prima; geen plots of externe bestanden).
- Kleuren in plots/onderwerpen: `cyan`, `yellow`, `green`, `magenta`.
- Onbekende hoofdstukken? Voeg een nieuw object toe aan `chapters` in `content/index.json` (én `index.en.json`) en kies een accent-kleur.

---

## De FastAPI-API (lokaal)

| Endpoint | Beschrijving |
|---|---|
| `GET /api/health` | gezondheidscheck (frontend gebruikt dit voor detectie) |
| `GET /api/index?lang=nl\|en` | volledige index (site, hoofdstukken, onderwerpen) |
| `GET /api/chapters?lang=nl\|en` | hoofdstukken |
| `GET /api/topics?lang=nl\|en` | onderwerpenlijst (`?chapter=ch1` om te filteren) |
| `GET /api/topics/{id}?lang=nl\|en` | alle content van één onderwerp |
| `GET /api/search?q=kernel&lang=nl\|en` | trefwoord-zoekopdracht |

De API leest dezelfde JSON-bestanden als de statische site — één bron van
waarheid. Zonder `lang`-parameter krijg je de NL-versie.

---

## Technische opbouw

```
MLP/
├── index.html            # enige HTML-pagina (SPA met hash-routering #/onderwerp/<id> + NL/EN-schakelaar)
├── css/style.css         # volledig ontwerp (#161616 · wit · pastel-accenten)
├── js/
│   ├── i18n.js           # tweetaligheid: alle UI-strings (NL/EN), taalkeuze + -opslag
│   ├── content.js        # datalaag: FastAPI-API (?lang=) of statische JSON (NL/EN + fallback)
│   ├── blocks.js         # renderers: tekst, formules (KaTeX), code-velden (vast/bewerkbaar), callouts, tabellen, plots (punten + sliders)
│   ├── runner.js         # Pyodide-runner: code in de browser uitvoeren (lazy geladen)
│   └── app.js            # router, homepage + tabel, zoekfilter, taalwissel, transitities
├── content/
│   ├── index.json        # NL: hoofdstukken + onderwerpen-register
│   ├── index.en.json     # EN: idem
│   ├── topics/*.json     # NL: 14 onderwerpen (waaronder 2 practice-opdrachten)
│   └── topics.en/*.json  # EN: idem
├── main.py               # FastAPI: statische site + REST-API (NL/EN)
├── start.sh              # Mac/Linux: venv aanmaken + deps installeren + server starten
├── start.bat             # Windows-idem (dubbelklikken kan)
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
