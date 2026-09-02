@echo off
REM MLP - automatisch opstarten met virtual environment
REM ----------------------------------------------------
REM Wat dit script doet:
REM   1. Maakt (alleen de eerste keer) een virtual environment aan in .venv\
REM   2. Installeert/upgradet de dependencies uit requirements.txt
REM   3. Start de FastAPI-server op http://127.0.0.1:8000
REM
REM Gebruik (Windows): dubbelklik op start.bat  of  voer uit in de cmd.
REM De map .venv\ hoef je nooit zelf aan te raken of te committen
REM (staat al in .gitignore). Weghalen kan altijd door de map te verwijderen.

chcp 65001 >nul
cd /d "%~dp0"

set VENV=.venv

REM --- venv aanmaken (alleen de eerste keer) -----------------------------
if not exist "%VENV%\Scripts\python.exe" (
    echo [1/3] Nieuw virtual environment aanmaken in '%VENV%' ...
    python -m venv %VENV%
    if errorlevel 1 (
        echo [FOUT] Geen Python gevonden of venv mislukt.
        echo        Installeer Python via https://www.python.org/downloads/
        echo        en vink "Add Python to PATH" aan tijdens de installatie.
        pause
        exit /b 1
    )
    echo        OK
) else (
    echo [1/3] Bestaand virtual environment gevonden in '%VENV%' - hergebruiken.
)

REM --- dependencies installeren (is snel als alles al aanwezig is) -------
echo [2/3] Dependencies controleren/installeren ...
"%VENV%\Scripts\python.exe" -m pip install --quiet --disable-pip-version-check --upgrade pip
"%VENV%\Scripts\python.exe" -m pip install --quiet --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
    echo [FOUT] Installeren van dependencies mislukt - internetverbinding controleren.
    pause
    exit /b 1
)
echo        OK

REM --- server starten -----------------------------------------------------
echo [3/3] Server starten ...
echo.
echo   Site : http://127.0.0.1:8000
echo   API  : http://127.0.0.1:8000/docs
echo   Stop : Ctrl+C
echo.
"%VENV%\Scripts\python.exe" -m uvicorn main:app --reload
pause
