"""
analyzer.py
===========
Convierte los partidos crudos de la API en el análisis del enfrentamiento:

    1. Calcula las medias goleadoras de la liga (baseline local/visitante).
    2. Calcula las fuerzas de ataque/defensa de cada equipo, separando
       rendimiento como local y como visitante.
    3. Deriva las tasas de goles esperados (lambda) del partido concreto.
    4. Reúne forma reciente y cara a cara.
    5. Llama al motor de probabilidad (model.analyse).

Las fuerzas se calculan ponderando más los partidos recientes mediante un
decaimiento exponencial, para reflejar el estado de forma actual.
"""

from __future__ import annotations

import math
import unicodedata
from dataclasses import dataclass, field

from . import model

# Defaults razonables si la liga tiene pocos partidos jugados todavía.
DEFAULT_HOME_GOALS = 1.45
DEFAULT_AWAY_GOALS = 1.15

# Vida media (en nº de partidos) del decaimiento exponencial de la forma.
FORM_HALF_LIFE = 8.0

# Mínimo de partidos jugados para fiarnos de las fuerzas calculadas.
MIN_MATCHES_FOR_CONFIDENCE = 4


def _normalize(text: str) -> str:
    """Minúsculas sin acentos ni espacios sobrantes, para comparar nombres."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return text.lower().strip()


@dataclass
class TeamForm:
    name: str
    matches_played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0
    last_results: list[str] = field(default_factory=list)  # 'W'/'D'/'L', más reciente al final

    # medias separadas local / visitante (para las fuerzas)
    home_gf_avg: float = DEFAULT_HOME_GOALS
    home_ga_avg: float = DEFAULT_AWAY_GOALS
    away_gf_avg: float = DEFAULT_AWAY_GOALS
    away_ga_avg: float = DEFAULT_HOME_GOALS

    @property
    def points(self) -> int:
        return self.wins * 3 + self.draws

    @property
    def ppg(self) -> float:
        return self.points / self.matches_played if self.matches_played else 0.0

    @property
    def form_string(self) -> str:
        return "".join(self.last_results[-5:]) or "—"


@dataclass
class MatchAnalysis:
    competition: str
    home_team: str
    away_team: str
    home_form: TeamForm
    away_form: TeamForm
    probabilities: model.MatchProbabilities
    league_home_avg: float
    league_away_avg: float
    head_to_head: list[dict] = field(default_factory=list)
    low_data_warning: bool = False


def _finished(matches: list[dict]) -> list[dict]:
    out = []
    for m in matches:
        if m.get("status") != "FINISHED":
            continue
        score = m.get("score", {}).get("fullTime", {})
        if score.get("home") is None or score.get("away") is None:
            continue
        out.append(m)
    return out


def league_averages(finished: list[dict]) -> tuple[float, float]:
    """Goles medios por partido marcados por el local y por el visitante."""
    if not finished:
        return DEFAULT_HOME_GOALS, DEFAULT_AWAY_GOALS
    home = sum(m["score"]["fullTime"]["home"] for m in finished) / len(finished)
    away = sum(m["score"]["fullTime"]["away"] for m in finished) / len(finished)
    # Evita ceros patológicos al inicio de temporada.
    return max(home, 0.4), max(away, 0.3)


def _decay_weight(index_from_recent: int) -> float:
    """Peso exponencial: el partido más reciente pesa 1, los antiguos menos."""
    return 0.5 ** (index_from_recent / FORM_HALF_LIFE)


def build_team_form(team_name: str, finished: list[dict]) -> TeamForm:
    """
    Construye la ficha de forma de un equipo a partir de los partidos
    terminados de la competición (los que disputó ese equipo).
    """
    target = _normalize(team_name)
    own_matches = []
    for m in finished:
        if _normalize(m["homeTeam"]["name"]) == target or _normalize(m["awayTeam"]["name"]) == target:
            own_matches.append(m)

    # Orden cronológico ascendente (antiguo -> reciente).
    own_matches.sort(key=lambda m: m.get("utcDate", ""))

    form = TeamForm(name=team_name)

    home_gf_w = home_ga_w = home_w = 0.0
    away_gf_w = away_ga_w = away_w = 0.0

    n = len(own_matches)
    for pos, m in enumerate(own_matches):
        idx_from_recent = (n - 1) - pos
        w = _decay_weight(idx_from_recent)
        ft = m["score"]["fullTime"]
        is_home = _normalize(m["homeTeam"]["name"]) == target

        if is_home:
            gf, ga = ft["home"], ft["away"]
            home_gf_w += gf * w
            home_ga_w += ga * w
            home_w += w
        else:
            gf, ga = ft["away"], ft["home"]
            away_gf_w += gf * w
            away_ga_w += ga * w
            away_w += w

        form.matches_played += 1
        form.goals_for += gf
        form.goals_against += ga
        if gf > ga:
            form.wins += 1
            form.last_results.append("W")
        elif gf == ga:
            form.draws += 1
            form.last_results.append("D")
        else:
            form.losses += 1
            form.last_results.append("L")

    if home_w > 0:
        form.home_gf_avg = home_gf_w / home_w
        form.home_ga_avg = home_ga_w / home_w
    if away_w > 0:
        form.away_gf_avg = away_gf_w / away_w
        form.away_ga_avg = away_ga_w / away_w

    return form


def head_to_head(home: str, away: str, finished: list[dict], limit: int = 6) -> list[dict]:
    h, a = _normalize(home), _normalize(away)
    out = []
    for m in finished:
        hn, an = _normalize(m["homeTeam"]["name"]), _normalize(m["awayTeam"]["name"])
        if {hn, an} == {h, a}:
            ft = m["score"]["fullTime"]
            out.append(
                {
                    "date": (m.get("utcDate") or "")[:10],
                    "home": m["homeTeam"]["name"],
                    "away": m["awayTeam"]["name"],
                    "home_goals": ft["home"],
                    "away_goals": ft["away"],
                }
            )
    out.sort(key=lambda x: x["date"], reverse=True)
    return out[:limit]


def resolve_team_name(query: str, matches: list[dict]) -> str | None:
    """
    Encuentra el nombre canónico de un equipo a partir de un texto libre,
    comparando contra todos los equipos presentes en la competición.
    """
    q = _normalize(query)
    names: set[str] = set()
    for m in matches:
        names.add(m["homeTeam"]["name"])
        names.add(m["awayTeam"]["name"])

    # 1) coincidencia exacta normalizada
    for n in names:
        if _normalize(n) == q:
            return n
    # 2) contiene / es contenido
    candidates = [n for n in names if q in _normalize(n) or _normalize(n) in q]
    if len(candidates) == 1:
        return candidates[0]
    if candidates:
        # el más corto suele ser el nombre principal
        return min(candidates, key=lambda n: len(n))
    # 3) coincidencia por palabra (p. ej. "barcelona" -> "FC Barcelona")
    for n in names:
        tokens = set(_normalize(n).split())
        if q in tokens:
            return n
    return None


def list_team_names(matches: list[dict]) -> list[str]:
    names: set[str] = set()
    for m in matches:
        names.add(m["homeTeam"]["name"])
        names.add(m["awayTeam"]["name"])
    return sorted(names)


def analyse_fixture(
    competition_name: str,
    home_team: str,
    away_team: str,
    matches: list[dict],
) -> MatchAnalysis:
    """
    Orquesta todo el análisis de un enfrentamiento concreto y devuelve un
    objeto MatchAnalysis listo para renderizar en el informe.
    """
    finished = _finished(matches)
    lg_home, lg_away = league_averages(finished)

    home_form = build_team_form(home_team, finished)
    away_form = build_team_form(away_team, finished)

    # Fuerzas relativas (estilo Dixon-Coles), acotadas para evitar valores
    # extremos cuando hay pocos partidos.
    def clamp(x: float, lo: float = 0.35, hi: float = 2.6) -> float:
        return max(lo, min(hi, x))

    home_attack = clamp(home_form.home_gf_avg / lg_home)
    home_defense = clamp(home_form.home_ga_avg / lg_away)
    away_attack = clamp(away_form.away_gf_avg / lg_away)
    away_defense = clamp(away_form.away_ga_avg / lg_home)

    lambda_home = clamp(lg_home * home_attack * away_defense, 0.2, 5.5)
    lambda_away = clamp(lg_away * away_attack * home_defense, 0.2, 5.5)

    probs = model.analyse(lambda_home, lambda_away)
    h2h = head_to_head(home_team, away_team, finished)

    low_data = (
        home_form.matches_played < MIN_MATCHES_FOR_CONFIDENCE
        or away_form.matches_played < MIN_MATCHES_FOR_CONFIDENCE
    )

    return MatchAnalysis(
        competition=competition_name,
        home_team=home_team,
        away_team=away_team,
        home_form=home_form,
        away_form=away_form,
        probabilities=probs,
        league_home_avg=lg_home,
        league_away_avg=lg_away,
        head_to_head=h2h,
        low_data_warning=low_data,
    )
