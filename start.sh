#!/usr/bin/env bash
# MLP — automatisch opstarten met virtual environment
# ---------------------------------------------------
# Wat dit script doet:
#   1. Maakt (alleen de eerste keer) een virtual environment aan in .venv/
#   2. Installeert/upgradet de dependencies uit requirements.txt
#   3. Start de FastAPI-server op http://127.0.0.1:8000
#
# Gebruik (macOS / Linux / Git Bash op Windows):
#   bash start.sh        of:  ./start.sh
#
# De map .venv/ hoef je nooit zelf aan te raken of te committen
# (staat al in .gitignore). Weghalen kan altijd met:  rm -rf .venv

set -e
cd "$(dirname "$0")"

VENV=".venv"

# --- vind Python 3 -----------------------------------------------------
if command -v python3 >/dev/null 2>&1; then
    PY="python3"
elif command -v python >/dev/null 2>&1; then
    PY="python"
else
    echo "[FOUT] Geen Python 3 gevonden."
    echo "       Installeer Python via https://www.python.org/downloads/"
    exit 1
fi

# --- venv aanmaken (alleen de eerste keer) ------------------------------
if [ ! -f "$VENV/pyvenv.cfg" ]; then
    echo "[1/3] Nieuw virtual environment aanmaken in '$VENV' ..."
    "$PY" -m venv "$VENV"
    echo "      OK"
else
    echo "[1/3] Bestaand virtual environment gevonden in '$VENV' — hergebruiken."
fi

# --- juiste python/pip binnen de venv (macOS-Linux of Windows-GitBash) --
if [ -x "$VENV/bin/python" ]; then
    VPY="$VENV/bin/python"
else
    VPY="$VENV/Scripts/python.exe"
fi

# --- dependencies installeren (is snel als alles al aanwezig is) --------
echo "[2/3] Dependencies controleren/installeren ..."
"$VPY" -m pip install --quiet --disable-pip-version-check --upgrade pip
"$VPY" -m pip install --quiet --disable-pip-version-check -r requirements.txt
echo "      OK"

# --- server starten ------------------------------------------------------
echo "[3/3] Server starten ..."
echo
echo "  Site : http://127.0.0.1:8000"
echo "  API  : http://127.0.0.1:8000/docs"
echo "  Stop : Ctrl+C"
echo
exec "$VPY" -m uvicorn main:app --reload
