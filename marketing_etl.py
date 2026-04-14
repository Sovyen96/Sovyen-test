"""
marketing_etl.py
================
Script profesional para extracción de datos de marketing
(Meta Ads, Instagram Reels, Google Ads) → PostgreSQL (Base44).

Autor  : Tu Nombre
Versión: 1.0.0
"""

from __future__ import annotations

import logging
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

import psycopg2
import psycopg2.extras
import requests
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

# ──────────────────────────────────────────────────────────────────────────────
# LOGGING
# ──────────────────────────────────────────────────────────────────────────────

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("marketing_etl.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("marketing_etl")


# ──────────────────────────────────────────────────────────────────────────────
# MODELOS DE CONFIGURACIÓN
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class MetaConfig:
    """Credenciales para Meta (Facebook) Marketing API."""
    ad_account_id: str          # Ej: "act_123456789"
    access_token: str           # Long-lived user token o System User token
    app_id: str
    app_secret: str
    ig_user_id: str             # ID numérico del usuario de Instagram
    api_version: str = "v21.0"

    # Para refresh automático (solo aplica a user tokens, no system-user tokens)
    refresh_token: str | None = None


@dataclass
class GoogleAdsConfig:
    """Credenciales para Google Ads API."""
    developer_token: str
    client_id: str
    client_secret: str
    refresh_token: str          # OAuth2 refresh token
    customer_id: str            # Sin guiones, ej: "1234567890"
    login_customer_id: str | None = None  # MCC account si aplica


@dataclass
class DBConfig:
    """Conexión PostgreSQL (Base44 o cualquier Postgres)."""
    host: str
    port: int
    dbname: str
    user: str
    password: str
    sslmode: str = "require"


@dataclass
class ClientConfig:
    """Configuración completa de un cliente."""
    client_name: str
    meta: MetaConfig
    google: GoogleAdsConfig
    db: DBConfig
    # Campos opcionales leídos desde config_clientes en DB
    client_id: int | None = None
    extra: dict = field(default_factory=dict)


# ──────────────────────────────────────────────────────────────────────────────
# CARGA DE CONFIGURACIÓN SEGURA (desde variables de entorno o DB)
# ──────────────────────────────────────────────────────────────────────────────

def load_config_from_env() -> ClientConfig:
    """
    Carga la configuración desde variables de entorno.
    Recomendado para entornos de producción / CI-CD.

    Variables requeridas (ver .env.example):
        META_AD_ACCOUNT_ID, META_ACCESS_TOKEN, META_APP_ID,
        META_APP_SECRET, META_IG_USER_ID,
        GOOGLE_DEVELOPER_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
        GOOGLE_REFRESH_TOKEN, GOOGLE_CUSTOMER_ID,
        DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    """
    def require(key: str) -> str:
        val = os.environ.get(key)
        if not val:
            raise EnvironmentError(f"Variable de entorno requerida no definida: {key}")
        return val

    meta = MetaConfig(
        ad_account_id=require("META_AD_ACCOUNT_ID"),
        access_token=require("META_ACCESS_TOKEN"),
        app_id=require("META_APP_ID"),
        app_secret=require("META_APP_SECRET"),
        ig_user_id=require("META_IG_USER_ID"),
        refresh_token=os.environ.get("META_REFRESH_TOKEN"),
    )

    google = GoogleAdsConfig(
        developer_token=require("GOOGLE_DEVELOPER_TOKEN"),
        client_id=require("GOOGLE_CLIENT_ID"),
        client_secret=require("GOOGLE_CLIENT_SECRET"),
        refresh_token=require("GOOGLE_REFRESH_TOKEN"),
        customer_id=require("GOOGLE_CUSTOMER_ID"),
        login_customer_id=os.environ.get("GOOGLE_LOGIN_CUSTOMER_ID"),
    )

    db = DBConfig(
        host=require("DB_HOST"),
        port=int(os.environ.get("DB_PORT", "5432")),
        dbname=require("DB_NAME"),
        user=require("DB_USER"),
        password=require("DB_PASSWORD"),
        sslmode=os.environ.get("DB_SSLMODE", "require"),
    )

    return ClientConfig(
        client_name=os.environ.get("CLIENT_NAME", "default"),
        meta=meta,
        google=google,
        db=db,
    )


def load_config_from_db(db_cfg: DBConfig, client_name: str) -> ClientConfig:
    """
    Alternativa: carga tokens desde la tabla config_clientes en la base de datos.
    Los tokens están encriptados en DB y se desencriptan en memoria.
    """
    conn = psycopg2.connect(
        host=db_cfg.host, port=db_cfg.port, dbname=db_cfg.dbname,
        user=db_cfg.user, password=db_cfg.password, sslmode=db_cfg.sslmode,
    )
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                "SELECT * FROM config_clientes WHERE nombre_cliente = %s AND activo = TRUE",
                (client_name,),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Cliente '{client_name}' no encontrado en config_clientes")

            meta = MetaConfig(
                ad_account_id=row["meta_ad_account_id"],
                access_token=row["meta_access_token"],
                app_id=row["meta_app_id"],
                app_secret=row["meta_app_secret"],
                ig_user_id=row["meta_ig_user_id"],
                refresh_token=row.get("meta_refresh_token"),
            )
            google = GoogleAdsConfig(
                developer_token=row["google_developer_token"],
                client_id=row["google_client_id"],
                client_secret=row["google_client_secret"],
                refresh_token=row["google_refresh_token"],
                customer_id=row["google_customer_id"],
                login_customer_id=row.get("google_login_customer_id"),
            )
            return ClientConfig(
                client_name=client_name,
                client_id=row["id"],
                meta=meta,
                google=google,
                db=db_cfg,
            )
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────────────────────
# BASE DE DATOS — UPSERT HELPERS
# ──────────────────────────────────────────────────────────────────────────────

class Database:
    def __init__(self, cfg: DBConfig):
        self.cfg = cfg
        self._conn: psycopg2.extensions.connection | None = None

    @property
    def conn(self):
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(
                host=self.cfg.host, port=self.cfg.port, dbname=self.cfg.dbname,
                user=self.cfg.user, password=self.cfg.password, sslmode=self.cfg.sslmode,
            )
        return self._conn

    def upsert_daily_spend(self, rows: list[dict]) -> int:
        """
        UPSERT en daily_spend.
        Clave de unicidad: (fecha, fuente)
        """
        sql = """
            INSERT INTO daily_spend (fecha, fuente, monto, moneda)
            VALUES (%(fecha)s, %(fuente)s, %(monto)s, %(moneda)s)
            ON CONFLICT (fecha, fuente)
            DO UPDATE SET
                monto    = EXCLUDED.monto,
                moneda   = EXCLUDED.moneda,
                updated_at = NOW();
        """
        return self._execute_many(sql, rows)

    def upsert_reels_analytics(self, rows: list[dict]) -> int:
        """
        UPSERT en reels_analytics.
        Clave de unicidad: ig_media_id
        """
        sql = """
            INSERT INTO reels_analytics (
                ig_media_id, fecha_pub, thumbnail_url,
                reproducciones, alcance, guardados, compartidos,
                avg_watch_time_seconds, duration_seconds
            )
            VALUES (
                %(ig_media_id)s, %(fecha_pub)s, %(thumbnail_url)s,
                %(reproducciones)s, %(alcance)s, %(guardados)s, %(compartidos)s,
                %(avg_watch_time_seconds)s, %(duration_seconds)s
            )
            ON CONFLICT (ig_media_id)
            DO UPDATE SET
                thumbnail_url          = EXCLUDED.thumbnail_url,
                reproducciones         = EXCLUDED.reproducciones,
                alcance                = EXCLUDED.alcance,
                guardados              = EXCLUDED.guardados,
                compartidos            = EXCLUDED.compartidos,
                avg_watch_time_seconds = EXCLUDED.avg_watch_time_seconds,
                duration_seconds       = EXCLUDED.duration_seconds,
                updated_at             = NOW();
        """
        return self._execute_many(sql, rows)

    def _execute_many(self, sql: str, rows: list[dict]) -> int:
        if not rows:
            return 0
        with self.conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, rows, page_size=100)
        self.conn.commit()
        return len(rows)

    def close(self):
        if self._conn and not self._conn.closed:
            self._conn.close()


# ──────────────────────────────────────────────────────────────────────────────
# MÓDULO META ADS
# ──────────────────────────────────────────────────────────────────────────────

class MetaAdsModule:
    """
    Extrae gasto diario desde la Meta Marketing API.

    Gestión de tokens:
    - Meta no tiene un refresh_token estándar de OAuth2.
    - Lo correcto es usar un System User Token (no expira) generado desde
      Business Manager > Configuración > Sistema de Usuarios.
    - Si usas un User Token de corta duración, puedes extenderlo a 60 días con:
        GET /oauth/access_token?grant_type=fb_exchange_token&...
      pero deberás renovarlo manualmente antes de que caduque.
    - Recomendación: usa SIEMPRE System User Tokens en producción.
    """

    BASE_URL = "https://graph.facebook.com"

    def __init__(self, cfg: MetaConfig):
        self.cfg = cfg
        self.session = requests.Session()
        self.session.params = {"access_token": cfg.access_token}  # type: ignore[assignment]

    # ── Token management ──────────────────────────────────────────────────────

    def extend_user_token(self) -> str:
        """
        Intercambia un short-lived token por uno de 60 días.
        Solo útil para user tokens, NO para system-user tokens.
        """
        url = f"{self.BASE_URL}/oauth/access_token"
        resp = self.session.get(url, params={
            "grant_type": "fb_exchange_token",
            "client_id": self.cfg.app_id,
            "client_secret": self.cfg.app_secret,
            "fb_exchange_token": self.cfg.access_token,
        })
        self._check_response(resp, "extend_user_token")
        new_token = resp.json()["access_token"]
        logger.info("Meta token extendido correctamente (60 días).")
        return new_token

    def validate_token(self) -> bool:
        """Verifica si el token actual sigue siendo válido."""
        url = f"{self.BASE_URL}/debug_token"
        resp = self.session.get(url, params={
            "input_token": self.cfg.access_token,
            "access_token": f"{self.cfg.app_id}|{self.cfg.app_secret}",
        })
        data = resp.json().get("data", {})
        if not data.get("is_valid", False):
            expires_at = data.get("expires_at", 0)
            logger.error(
                "Meta token INVÁLIDO o expirado. expires_at=%s error=%s",
                datetime.fromtimestamp(expires_at, tz=timezone.utc) if expires_at else "N/A",
                data.get("error", {}).get("message", ""),
            )
            return False
        scopes = data.get("scopes", [])
        required = {"ads_read", "read_insights"}
        missing = required - set(scopes)
        if missing:
            logger.warning("Meta token: faltan permisos %s", missing)
        return True

    # ── Spend ─────────────────────────────────────────────────────────────────

    def get_daily_spend(
        self, since: date | None = None, until: date | None = None
    ) -> list[dict]:
        """
        Obtiene el gasto diario de Meta Ads.
        Por defecto: ayer y hoy.
        """
        since = since or (date.today() - timedelta(days=1))
        until = until or date.today()

        url = f"{self.BASE_URL}/{self.cfg.api_version}/{self.cfg.ad_account_id}/insights"
        params = {
            "fields": "spend",
            "time_increment": 1,
            "time_range": f'{{"since":"{since}","until":"{until}"}}',
            "level": "account",
        }

        logger.info("Meta Ads | Consultando spend %s → %s", since, until)
        resp = self.session.get(url, params=params)
        self._check_response(resp, "get_daily_spend")

        rows = []
        for item in resp.json().get("data", []):
            rows.append({
                "fecha": item["date_start"],
                "fuente": "Meta",
                "monto": float(item.get("spend", 0)),
                "moneda": "USD",
            })
        logger.info("Meta Ads | %d registros de spend obtenidos.", len(rows))
        return rows

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _check_response(self, resp: requests.Response, context: str):
        try:
            resp.raise_for_status()
        except requests.HTTPError:
            err = resp.json().get("error", {})
            code = err.get("code", resp.status_code)
            msg = err.get("message", resp.text)
            if code in (190, 102):      # Token inválido / expirado
                logger.error("[META] TOKEN EXPIRADO en %s: %s", context, msg)
                raise TokenExpiredError(f"Meta token expirado: {msg}")
            logger.error("[META] Error HTTP %s en %s: %s", resp.status_code, context, msg)
            raise APIError(f"Meta API error ({context}): {msg}")


# ──────────────────────────────────────────────────────────────────────────────
# MÓDULO INSTAGRAM REELS
# ──────────────────────────────────────────────────────────────────────────────

class InstagramReelsModule:
    """
    Extrae métricas de los últimos N Reels via Instagram Graph API.

    Métricas extraídas por Reel:
      - plays              → reproducciones
      - reach              → alcance
      - saved              → guardados
      - shares             → compartidos
      - avg_watch_time_ms  → avg_watch_time_seconds  (÷ 1000)
    """

    BASE_URL = "https://graph.facebook.com"
    INSIGHT_METRICS = "plays,reach,saved,shares,avg_watch_time_ms"

    def __init__(self, cfg: MetaConfig):
        self.cfg = cfg
        self.session = requests.Session()
        self.session.params = {"access_token": cfg.access_token}  # type: ignore[assignment]

    def get_reels(self, limit: int = 10) -> list[dict]:
        """
        Obtiene los últimos `limit` Reels con sus métricas de insights.
        """
        media_ids = self._fetch_reel_ids(limit)
        logger.info("Instagram Reels | %d Reels encontrados.", len(media_ids))
        rows = []
        for media_id in media_ids:
            try:
                row = self._fetch_reel_details(media_id)
                if row:
                    rows.append(row)
                time.sleep(0.2)      # Evitar rate-limit
            except APIError as exc:
                logger.warning("Reel %s omitido por error: %s", media_id, exc)
        logger.info("Instagram Reels | %d Reels procesados con insights.", len(rows))
        return rows

    def _fetch_reel_ids(self, limit: int) -> list[str]:
        url = f"{self.BASE_URL}/{self.cfg.api_version}/{self.cfg.ig_user_id}/media"
        params = {
            "fields": "id,media_type",
            "limit": limit * 3,      # Pedimos más porque filtraremos solo REELS
        }
        resp = self.session.get(url, params=params)
        self._check_response(resp, "fetch_reel_ids")
        data = resp.json().get("data", [])
        reel_ids = [
            item["id"]
            for item in data
            if item.get("media_type") == "VIDEO"   # Los Reels son media_type=VIDEO
        ]
        return reel_ids[:limit]

    def _fetch_reel_details(self, media_id: str) -> dict | None:
        # 1) Metadatos básicos
        url_meta = f"{self.BASE_URL}/{self.cfg.api_version}/{media_id}"
        resp = self.session.get(url_meta, params={
            "fields": "id,timestamp,thumbnail_url,media_product_type,video_duration",
        })
        self._check_response(resp, f"reel_metadata_{media_id}")
        meta = resp.json()

        # Solo procesar Reels (no Stories, posts, etc.)
        if meta.get("media_product_type") != "REELS":
            return None

        # 2) Insights
        url_ins = f"{self.BASE_URL}/{self.cfg.api_version}/{media_id}/insights"
        resp_ins = self.session.get(url_ins, params={"metric": self.INSIGHT_METRICS})
        self._check_response(resp_ins, f"reel_insights_{media_id}")
        insights_raw = resp_ins.json().get("data", [])

        insights: dict[str, Any] = {}
        for item in insights_raw:
            insights[item["name"]] = item.get("values", [{}])[0].get("value", 0)

        # avg_watch_time_ms → convertir a segundos
        avg_ms = insights.get("avg_watch_time_ms", 0) or 0
        avg_seconds = round(avg_ms / 1000, 2)

        # Duración del video
        duration_sec = meta.get("video_duration")
        try:
            duration_sec = float(duration_sec) if duration_sec else None
        except (ValueError, TypeError):
            duration_sec = None

        return {
            "ig_media_id": media_id,
            "fecha_pub": meta.get("timestamp"),
            "thumbnail_url": meta.get("thumbnail_url"),
            "reproducciones": insights.get("plays", 0),
            "alcance": insights.get("reach", 0),
            "guardados": insights.get("saved", 0),
            "compartidos": insights.get("shares", 0),
            "avg_watch_time_seconds": avg_seconds,
            "duration_seconds": duration_sec,
        }

    def _check_response(self, resp: requests.Response, context: str):
        try:
            resp.raise_for_status()
        except requests.HTTPError:
            err = resp.json().get("error", {})
            code = err.get("code", resp.status_code)
            msg = err.get("message", resp.text)
            if code in (190, 102):
                logger.error("[IG] TOKEN EXPIRADO en %s: %s", context, msg)
                raise TokenExpiredError(f"Instagram token expirado: {msg}")
            logger.error("[IG] Error %s en %s: %s", resp.status_code, context, msg)
            raise APIError(f"Instagram API error ({context}): {msg}")


# ──────────────────────────────────────────────────────────────────────────────
# MÓDULO GOOGLE ADS
# ──────────────────────────────────────────────────────────────────────────────

class GoogleAdsModule:
    """
    Extrae gasto diario desde Google Ads API via GAQL.

    Gestión de Refresh Token (OAuth2):
    - El refresh_token NO expira a menos que el usuario revoque el acceso o
      la app lleve 6 meses sin usarse.
    - La librería google-ads-python renueva el access_token automáticamente
      antes de cada request usando el refresh_token.
    - NO necesitas gestionar la renovación manualmente.
    - Si el refresh_token se invalida, verás GoogleAdsException con código
      UNAUTHENTICATED → actualiza el refresh_token en tu config/BD.
    """

    GAQL = """
        SELECT
            segments.date,
            metrics.cost_micros
        FROM campaign
        WHERE
            segments.date BETWEEN '{since}' AND '{until}'
            AND campaign.status != 'REMOVED'
    """

    def __init__(self, cfg: GoogleAdsConfig):
        self.cfg = cfg
        self.client = self._build_client()

    def _build_client(self) -> GoogleAdsClient:
        config = {
            "developer_token": self.cfg.developer_token,
            "client_id": self.cfg.client_id,
            "client_secret": self.cfg.client_secret,
            "refresh_token": self.cfg.refresh_token,
            "use_proto_plus": True,
        }
        if self.cfg.login_customer_id:
            config["login_customer_id"] = self.cfg.login_customer_id
        return GoogleAdsClient.load_from_dict(config)

    def get_daily_spend(
        self, since: date | None = None, until: date | None = None
    ) -> list[dict]:
        """
        Retorna el spend diario en USD (cost_micros ÷ 1_000_000).
        """
        since = since or (date.today() - timedelta(days=1))
        until = until or date.today()

        gaql = self.GAQL.format(
            since=since.strftime("%Y-%m-%d"),
            until=until.strftime("%Y-%m-%d"),
        )
        logger.info("Google Ads | Consultando spend %s → %s", since, until)

        try:
            service = self.client.get_service("GoogleAdsService")
            response = service.search_stream(
                customer_id=self.cfg.customer_id,
                query=gaql,
            )

            # Agregar cost_micros por fecha (pueden venir múltiples campañas)
            spend_by_date: dict[str, float] = {}
            for batch in response:
                for row in batch.results:
                    d = row.segments.date          # "YYYY-MM-DD"
                    cost_usd = row.metrics.cost_micros / 1_000_000
                    spend_by_date[d] = spend_by_date.get(d, 0.0) + cost_usd

            rows = [
                {"fecha": d, "fuente": "Google", "monto": round(v, 4), "moneda": "USD"}
                for d, v in spend_by_date.items()
            ]
            logger.info("Google Ads | %d registros de spend obtenidos.", len(rows))
            return rows

        except GoogleAdsException as exc:
            for err in exc.failure.errors:
                code = err.error_code.WhichOneof("error_code")
                if code in ("authentication_error", "authorization_error"):
                    logger.error(
                        "[GOOGLE] TOKEN EXPIRADO/INVÁLIDO: %s — %s",
                        code, err.message,
                    )
                    raise TokenExpiredError(f"Google Ads token inválido: {err.message}")
                logger.error("[GOOGLE] API error %s: %s", code, err.message)
            raise APIError(f"Google Ads API error: {exc}") from exc


# ──────────────────────────────────────────────────────────────────────────────
# ERRORES PERSONALIZADOS
# ──────────────────────────────────────────────────────────────────────────────

class TokenExpiredError(Exception):
    """Lanzado cuando un token de API ha expirado o es inválido."""


class APIError(Exception):
    """Error genérico de llamada a API."""


# ──────────────────────────────────────────────────────────────────────────────
# ORQUESTADOR PRINCIPAL
# ──────────────────────────────────────────────────────────────────────────────

class MarketingETL:
    """Orquesta la extracción, transformación y carga de datos de marketing."""

    def __init__(self, cfg: ClientConfig):
        self.cfg = cfg
        self.db = Database(cfg.db)
        self.meta_ads = MetaAdsModule(cfg.meta)
        self.ig_reels = InstagramReelsModule(cfg.meta)
        self.google_ads = GoogleAdsModule(cfg.google)

    def run(
        self,
        since: date | None = None,
        until: date | None = None,
        skip_meta: bool = False,
        skip_reels: bool = False,
        skip_google: bool = False,
    ) -> dict[str, int]:
        """
        Ejecuta el pipeline completo.
        Retorna un dict con el número de filas procesadas por módulo.
        """
        logger.info("═" * 60)
        logger.info("Iniciando ETL para cliente: %s", self.cfg.client_name)
        logger.info("Rango de fechas: %s → %s", since or "ayer", until or "hoy")
        logger.info("═" * 60)

        results: dict[str, int] = {}

        # ── Meta Ads ──────────────────────────────────────────────────────────
        if not skip_meta:
            try:
                if not self.meta_ads.validate_token():
                    logger.error("Meta: token inválido, omitiendo módulo.")
                else:
                    rows = self.meta_ads.get_daily_spend(since, until)
                    n = self.db.upsert_daily_spend(rows)
                    results["meta_spend"] = n
                    logger.info("Meta Ads ✓ | %d filas en daily_spend.", n)
            except TokenExpiredError as e:
                logger.error("Meta Ads ✗ TOKEN EXPIRADO: %s", e)
                results["meta_spend"] = -1
            except Exception as e:
                logger.error("Meta Ads ✗ Error inesperado: %s", e, exc_info=True)
                results["meta_spend"] = -1

        # ── Instagram Reels ───────────────────────────────────────────────────
        if not skip_reels:
            try:
                rows = self.ig_reels.get_reels(limit=10)
                n = self.db.upsert_reels_analytics(rows)
                results["ig_reels"] = n
                logger.info("Instagram Reels ✓ | %d filas en reels_analytics.", n)
            except TokenExpiredError as e:
                logger.error("Instagram Reels ✗ TOKEN EXPIRADO: %s", e)
                results["ig_reels"] = -1
            except Exception as e:
                logger.error("Instagram Reels ✗ Error inesperado: %s", e, exc_info=True)
                results["ig_reels"] = -1

        # ── Google Ads ────────────────────────────────────────────────────────
        if not skip_google:
            try:
                rows = self.google_ads.get_daily_spend(since, until)
                n = self.db.upsert_daily_spend(rows)
                results["google_spend"] = n
                logger.info("Google Ads ✓ | %d filas en daily_spend.", n)
            except TokenExpiredError as e:
                logger.error("Google Ads ✗ TOKEN EXPIRADO: %s", e)
                results["google_spend"] = -1
            except Exception as e:
                logger.error("Google Ads ✗ Error inesperado: %s", e, exc_info=True)
                results["google_spend"] = -1

        self.db.close()
        logger.info("ETL completado. Resultados: %s", results)
        return results


# ──────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Marketing ETL — Meta + Google Ads")
    parser.add_argument("--since", type=date.fromisoformat, default=None)
    parser.add_argument("--until", type=date.fromisoformat, default=None)
    parser.add_argument("--skip-meta",   action="store_true")
    parser.add_argument("--skip-reels",  action="store_true")
    parser.add_argument("--skip-google", action="store_true")
    parser.add_argument(
        "--config-source",
        choices=["env", "db"],
        default="env",
        help="Fuente de configuración: 'env' (variables de entorno) o 'db' (tabla config_clientes)",
    )
    parser.add_argument("--client-name", default=None)
    args = parser.parse_args()

    if args.config_source == "env":
        config = load_config_from_env()
    else:
        # Para cargar desde DB necesitas al menos las credenciales de DB en env
        db_cfg = DBConfig(
            host=os.environ["DB_HOST"],
            port=int(os.environ.get("DB_PORT", "5432")),
            dbname=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
        )
        config = load_config_from_db(db_cfg, args.client_name or "default")

    etl = MarketingETL(config)
    etl.run(
        since=args.since,
        until=args.until,
        skip_meta=args.skip_meta,
        skip_reels=args.skip_reels,
        skip_google=args.skip_google,
    )
