"""
api_client.py
=============
Cliente para la API de football-data.org (v4).

Se eligió football-data.org porque ofrece un plan gratuito con API key
que cubre las principales ligas europeas. Con una sola llamada
(`/competitions/{code}/matches`) obtenemos todos los partidos de la
temporada en curso, de donde derivamos:

    - medias goleadoras de la liga (local/visitante)
    - fuerzas de ataque/defensa de cada equipo
    - forma reciente
    - historial cara a cara

Esto minimiza el número de peticiones (clave por el límite de 10 req/min
del plan gratuito).

Cómo conseguir la clave (gratis):
    https://www.football-data.org/client/register
y exportarla como variable de entorno FOOTBALL_DATA_API_KEY.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import requests

BASE_URL = "https://api.football-data.org/v4"

# Competiciones disponibles en el plan gratuito (código -> nombre).
FREE_TIER_COMPETITIONS: dict[str, str] = {
    "PL": "Premier League (Inglaterra)",
    "PD": "LaLiga (España)",
    "SA": "Serie A (Italia)",
    "BL1": "Bundesliga (Alemania)",
    "FL1": "Ligue 1 (Francia)",
    "DED": "Eredivisie (Países Bajos)",
    "PPL": "Primeira Liga (Portugal)",
    "ELC": "Championship (Inglaterra)",
    "CL": "UEFA Champions League",
    "BSA": "Brasileirão Série A",
}


class FootballDataError(RuntimeError):
    """Error al comunicarse con la API de football-data.org."""


@dataclass
class FootballDataClient:
    api_key: str
    timeout: int = 15

    @classmethod
    def from_env(cls) -> "FootballDataClient":
        key = os.environ.get("FOOTBALL_DATA_API_KEY", "").strip()
        if not key:
            raise FootballDataError(
                "Falta la variable de entorno FOOTBALL_DATA_API_KEY. "
                "Regístrate gratis en https://www.football-data.org/client/register"
            )
        return cls(api_key=key)

    @property
    def _headers(self) -> dict[str, str]:
        return {"X-Auth-Token": self.api_key}

    def _get(self, path: str, params: dict | None = None) -> dict:
        url = f"{BASE_URL}{path}"
        try:
            resp = requests.get(url, headers=self._headers, params=params, timeout=self.timeout)
        except requests.RequestException as exc:
            raise FootballDataError(f"Error de red al llamar a {url}: {exc}") from exc

        if resp.status_code == 429:
            raise FootballDataError(
                "Límite de peticiones alcanzado (plan gratuito: 10/min). "
                "Espera un minuto e inténtalo de nuevo."
            )
        if resp.status_code in (401, 403):
            raise FootballDataError(
                "API key inválida o sin permisos para esta competición. "
                "Revisa FOOTBALL_DATA_API_KEY y que la liga esté en tu plan."
            )
        if resp.status_code != 200:
            raise FootballDataError(
                f"La API respondió {resp.status_code}: {resp.text[:200]}"
            )
        return resp.json()

    def get_competition_matches(self, competition_code: str) -> list[dict]:
        """
        Devuelve todos los partidos de la temporada en curso de una
        competición (terminados y programados).
        """
        data = self._get(f"/competitions/{competition_code}/matches")
        return data.get("matches", [])

    def list_free_competitions(self) -> dict[str, str]:
        return dict(FREE_TIER_COMPETITIONS)
