"""
app.py
======
Aplicación web (Flask) del asesor deportivo de fútbol.

Flujo:
    1. El usuario elige competición y dos equipos (local y visitante).
    2. Se hace UNA llamada a la API con todos los partidos de la temporada.
    3. Se calcula el análisis y se muestra un informe exhaustivo.
    4. El informe puede descargarse en Markdown.

Arranque:
    export FOOTBALL_DATA_API_KEY="tu_clave"
    python app.py
    # abre http://localhost:5000
"""

from __future__ import annotations

import os

from flask import Flask, Response, render_template, request

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # python-dotenv es opcional
    pass

from sports_advisor import analyzer, report
from sports_advisor.api_client import (
    FREE_TIER_COMPETITIONS,
    FootballDataClient,
    FootballDataError,
)

app = Flask(__name__)

# Cache simple en memoria de los partidos por competición, para no gastar
# el límite de peticiones del plan gratuito en cada análisis.
_MATCH_CACHE: dict[str, list[dict]] = {}


def _get_matches(client: FootballDataClient, competition: str) -> list[dict]:
    if competition not in _MATCH_CACHE:
        _MATCH_CACHE[competition] = client.get_competition_matches(competition)
    return _MATCH_CACHE[competition]


@app.route("/")
def index():
    return render_template(
        "index.html",
        competitions=FREE_TIER_COMPETITIONS,
        has_key=bool(os.environ.get("FOOTBALL_DATA_API_KEY", "").strip()),
    )


@app.route("/teams")
def teams():
    """Endpoint auxiliar (JSON) para autocompletar equipos de una liga."""
    competition = request.args.get("competition", "").strip()
    if competition not in FREE_TIER_COMPETITIONS:
        return {"error": "Competición no válida"}, 400
    try:
        client = FootballDataClient.from_env()
        matches = _get_matches(client, competition)
    except FootballDataError as exc:
        return {"error": str(exc)}, 502
    return {"teams": analyzer.list_team_names(matches)}


@app.route("/analyze", methods=["POST"])
def analyze():
    competition = request.form.get("competition", "").strip()
    home_query = request.form.get("home_team", "").strip()
    away_query = request.form.get("away_team", "").strip()

    error = None
    if competition not in FREE_TIER_COMPETITIONS:
        error = "Selecciona una competición válida."
    elif not home_query or not away_query:
        error = "Indica el equipo local y el visitante."
    elif analyzer._normalize(home_query) == analyzer._normalize(away_query):
        error = "El local y el visitante no pueden ser el mismo equipo."

    if error:
        return render_template(
            "index.html",
            competitions=FREE_TIER_COMPETITIONS,
            error=error,
            has_key=bool(os.environ.get("FOOTBALL_DATA_API_KEY", "").strip()),
        )

    try:
        client = FootballDataClient.from_env()
        matches = _get_matches(client, competition)
    except FootballDataError as exc:
        return render_template(
            "index.html",
            competitions=FREE_TIER_COMPETITIONS,
            error=str(exc),
            has_key=bool(os.environ.get("FOOTBALL_DATA_API_KEY", "").strip()),
        )

    home_name = analyzer.resolve_team_name(home_query, matches)
    away_name = analyzer.resolve_team_name(away_query, matches)

    missing = []
    if not home_name:
        missing.append(home_query)
    if not away_name:
        missing.append(away_query)
    if missing:
        return render_template(
            "index.html",
            competitions=FREE_TIER_COMPETITIONS,
            error=(
                f"No encontré estos equipos en {FREE_TIER_COMPETITIONS[competition]}: "
                f"{', '.join(missing)}. Equipos disponibles: "
                + ", ".join(analyzer.list_team_names(matches))
            ),
            has_key=True,
        )

    analysis = analyzer.analyse_fixture(
        FREE_TIER_COMPETITIONS[competition], home_name, away_name, matches
    )
    v = report.verdict(analysis)

    return render_template(
        "result.html",
        a=analysis,
        p=analysis.probabilities,
        verdict=v,
        pct=report.pct,
        odds=analysis.probabilities.fair_odds(),
        competition_code=competition,
    )


@app.route("/download", methods=["POST"])
def download():
    """Reconstruye y descarga el informe en Markdown."""
    competition = request.form.get("competition", "").strip()
    home_name = request.form.get("home_team", "").strip()
    away_name = request.form.get("away_team", "").strip()
    try:
        client = FootballDataClient.from_env()
        matches = _get_matches(client, competition)
    except FootballDataError as exc:
        return Response(str(exc), status=502, mimetype="text/plain")

    analysis = analyzer.analyse_fixture(
        FREE_TIER_COMPETITIONS.get(competition, competition), home_name, away_name, matches
    )
    md = report.to_markdown(analysis)
    filename = f"informe_{home_name}_vs_{away_name}.md".replace(" ", "_")
    return Response(
        md,
        mimetype="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
