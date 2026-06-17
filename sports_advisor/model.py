"""
model.py
========
Motor de probabilidad para partidos de fútbol.

El enfoque es el clásico modelo de Poisson bivariante con fuerzas de
ataque/defensa (Maher 1982) y la corrección de marcadores bajos de
Dixon-Coles (1997). A partir de dos tasas de goles esperados (lambda
local y lambda visitante) se construye la matriz de probabilidad de
todos los marcadores y de ahí se derivan todos los mercados:

    1X2, over/under, ambos marcan (BTTS), doble oportunidad,
    marcador más probable, marcadores top, etc.

No requiere numpy: todo se calcula con `math` puro.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

# Máximo de goles por equipo que consideramos en la matriz.
# Con 10 cubrimos >99.99% de la masa de probabilidad en fútbol.
MAX_GOALS = 10

# Parámetro rho de la corrección Dixon-Coles para marcadores bajos.
# Valor negativo típico observado empíricamente en ligas europeas.
DIXON_COLES_RHO = -0.08


def poisson_pmf(k: int, lam: float) -> float:
    """Probabilidad de exactamente k goles dada una media lambda."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * lam ** k / math.factorial(k)


def _dixon_coles_tau(i: int, j: int, lam_h: float, lam_a: float, rho: float) -> float:
    """
    Factor de corrección tau para los marcadores 0-0, 1-0, 0-1 y 1-1.

    Corrige la conocida infravaloración de empates y marcadores bajos
    que produce el modelo de Poisson independiente.
    """
    if i == 0 and j == 0:
        return 1.0 - lam_h * lam_a * rho
    if i == 0 and j == 1:
        return 1.0 + lam_h * rho
    if i == 1 and j == 0:
        return 1.0 + lam_a * rho
    if i == 1 and j == 1:
        return 1.0 - rho
    return 1.0


@dataclass
class MatchProbabilities:
    """Resultado completo del análisis probabilístico de un partido."""

    lambda_home: float
    lambda_away: float

    home_win: float
    draw: float
    away_win: float

    # Doble oportunidad
    home_or_draw: float
    away_or_draw: float
    home_or_away: float

    # Mercados de goles
    over_2_5: float
    under_2_5: float
    over_1_5: float
    over_3_5: float
    btts_yes: float
    btts_no: float

    expected_total_goals: float
    most_likely_score: tuple[int, int]
    top_scorelines: list[tuple[str, float]] = field(default_factory=list)
    score_matrix: list[list[float]] = field(default_factory=list)

    @property
    def favourite(self) -> str:
        """Devuelve 'home', 'away' o 'draw' según la mayor probabilidad."""
        trio = {"home": self.home_win, "draw": self.draw, "away": self.away_win}
        return max(trio, key=trio.get)

    def fair_odds(self) -> dict[str, float]:
        """Cuotas 'justas' (sin margen) = 1 / probabilidad."""
        def odd(p: float) -> float:
            return round(1.0 / p, 2) if p > 0 else float("inf")

        return {"home": odd(self.home_win), "draw": odd(self.draw), "away": odd(self.away_win)}


def build_score_matrix(
    lambda_home: float,
    lambda_away: float,
    max_goals: int = MAX_GOALS,
    rho: float = DIXON_COLES_RHO,
) -> list[list[float]]:
    """
    Construye la matriz (max_goals+1) x (max_goals+1) con la probabilidad
    de cada marcador, aplicando la corrección Dixon-Coles y renormalizando
    para que la suma sea exactamente 1.
    """
    home_pmf = [poisson_pmf(i, lambda_home) for i in range(max_goals + 1)]
    away_pmf = [poisson_pmf(j, lambda_away) for j in range(max_goals + 1)]

    matrix = [[0.0] * (max_goals + 1) for _ in range(max_goals + 1)]
    total = 0.0
    for i in range(max_goals + 1):
        for j in range(max_goals + 1):
            p = home_pmf[i] * away_pmf[j] * _dixon_coles_tau(i, j, lambda_home, lambda_away, rho)
            p = max(p, 0.0)  # tau podría volverse ligeramente negativo en casos extremos
            matrix[i][j] = p
            total += p

    if total > 0:
        for i in range(max_goals + 1):
            for j in range(max_goals + 1):
                matrix[i][j] /= total
    return matrix


def analyse(lambda_home: float, lambda_away: float, max_goals: int = MAX_GOALS) -> MatchProbabilities:
    """
    Calcula todas las probabilidades de mercado a partir de las tasas de
    goles esperados de local y visitante.
    """
    matrix = build_score_matrix(lambda_home, lambda_away, max_goals)

    home_win = draw = away_win = 0.0
    over_2_5 = over_1_5 = over_3_5 = 0.0
    btts_yes = 0.0
    expected_total = 0.0
    best_p = -1.0
    best_score = (0, 0)
    scorelines: list[tuple[str, float]] = []

    for i in range(max_goals + 1):
        for j in range(max_goals + 1):
            p = matrix[i][j]
            if i > j:
                home_win += p
            elif i == j:
                draw += p
            else:
                away_win += p

            total_goals = i + j
            if total_goals >= 2:
                over_1_5 += p
            if total_goals >= 3:
                over_2_5 += p
            if total_goals >= 4:
                over_3_5 += p
            if i > 0 and j > 0:
                btts_yes += p

            expected_total += total_goals * p

            if p > best_p:
                best_p = p
                best_score = (i, j)
            scorelines.append((f"{i}-{j}", p))

    scorelines.sort(key=lambda x: x[1], reverse=True)

    return MatchProbabilities(
        lambda_home=lambda_home,
        lambda_away=lambda_away,
        home_win=home_win,
        draw=draw,
        away_win=away_win,
        home_or_draw=home_win + draw,
        away_or_draw=away_win + draw,
        home_or_away=home_win + away_win,
        over_2_5=over_2_5,
        under_2_5=1.0 - over_2_5,
        over_1_5=over_1_5,
        over_3_5=over_3_5,
        btts_yes=btts_yes,
        btts_no=1.0 - btts_yes,
        expected_total_goals=expected_total,
        most_likely_score=best_score,
        top_scorelines=scorelines[:7],
        score_matrix=matrix,
    )
