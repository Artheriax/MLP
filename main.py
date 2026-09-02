r"""
MLP — Machine Learning Practice · FastAPI-backend
===============================================

Serveert de statische site én een kleine REST-API over de content.

Lokaal draaien (eenvoudig — maakt automatisch een venv aan):
    bash start.sh        # Mac / Linux / Git Bash
    start.bat            # Windows
    → http://127.0.0.1:8000

Of handmatig:
    python -m venv .venv
    source .venv/bin/activate        # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn main:app --reload

Op GitHub Pages draait de site gewoon als statische site (zonder deze
backend); de frontend detecteert zelf of de API beschikbaar is en valt
anders terug op de JSON-bestanden in content/.
"""

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
CONTENT_DIR = BASE_DIR / "content"
TOPICS_DIR = CONTENT_DIR / "topics"

app = FastAPI(
    title="MLP — Machine Learning Practice API",
    description="REST-API over de ML-samenvattingen (hoofdstukken en onderwerpen).",
    version="1.0.0",
)

# Handig als je de API ook vanaf een andere poort/host wilt aanspreken.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ helpers

def read_json(path: Path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Bestand niet gevonden: {path.name}")
    except json.JSONDecodeError as err:
        raise HTTPException(status_code=500, detail=f"Ongeldige JSON in {path.name}: {err}")


def get_index() -> dict:
    return read_json(CONTENT_DIR / "index.json")


def find_topic(topic_id: str) -> dict:
    """Valideer het id tegen de index en geef het inhoudsbestand terug."""
    index = get_index()
    for topic in index.get("topics", []):
        if topic["id"] == topic_id:
            return read_json(CONTENT_DIR / topic["file"])
    raise HTTPException(status_code=404, detail=f"Onbekend onderwerp: {topic_id}")


# ------------------------------------------------------------------- routes

@app.get("/api/health")
def health():
    """Gezondheidscheck — de frontend gebruikt dit om de API te detecteren."""
    return {"status": "ok", "service": "mlp-api", "version": "1.0.0"}


@app.get("/api/index")
def api_index():
    """Volledige index: site-info, hoofdstukken en de onderwerpenlijst."""
    return get_index()


@app.get("/api/chapters")
def api_chapters():
    """Alleen de hoofdstukken."""
    return {"chapters": get_index().get("chapters", [])}


@app.get("/api/topics")
def api_topics(chapter: str | None = None):
    """De onderwerpenlijst (optioneel gefilterd op hoofdstuk-id)."""
    topics = get_index().get("topics", [])
    if chapter:
        topics = [t for t in topics if t.get("chapter") == chapter]
    return {"count": len(topics), "topics": topics}


@app.get("/api/topics/{topic_id}")
def api_topic(topic_id: str):
    """Alle content van één onderwerp."""
    return find_topic(topic_id)


@app.get("/api/search")
def api_search(q: str, max_results: int = 25):
    """Eenvoudige trefwoord-zoekging door titels, samenvattingen en keywords."""
    needle = q.strip().lower()
    if not needle:
        return {"query": q, "count": 0, "results": []}

    results = []
    for topic in get_index().get("topics", []):
        haystack = " ".join(
            [topic.get("title", ""), topic.get("summary", ""), topic.get("keywords", "")]
        ).lower()
        if needle in haystack:
            results.append(topic)
            if len(results) >= max_results:
                break
    return {"query": q, "count": len(results), "results": results}


# ------------------------------------------------- statische site (laatste)

@app.get("/")
def serve_root():
    return FileResponse(BASE_DIR / "index.html")


# Mount alles wat geen API-route is als statische bestanden.
# Belangrijk: díta regel staat ná de API-routes hierboven.
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")
