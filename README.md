# ⚽ Asesor Deportivo

App web que **analiza un partido de fútbol** y estima la **probabilidad de
victoria de cada equipo**, generando un informe exhaustivo: 1X2, marcadores
más probables, goles esperados, over/under, ambos marcan, forma reciente y
cara a cara.

Los datos se obtienen en vivo de [football-data.org](https://www.football-data.org)
(plan gratuito con API key) y las probabilidades se calculan con un modelo
estadístico **Poisson + corrección Dixon-Coles** con ventaja de local.

---

## 🚀 Puesta en marcha

1. **Consigue una API key gratis** en
   [football-data.org/client/register](https://www.football-data.org/client/register).

2. **Instala las dependencias:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configura la clave** (una de las dos opciones):

   ```bash
   export FOOTBALL_DATA_API_KEY="tu_clave"
   ```

   o copia `.env.example` a `.env` y rellénalo.

4. **Arranca la app:**

   ```bash
   python app.py
   ```

   Abre <http://localhost:5000>, elige liga y los dos equipos, y pulsa
   **Analizar partido**.

---

## 🧠 Cómo funciona el modelo

1. Con **una sola llamada** a la API se descargan todos los partidos de la
   temporada de la competición (para respetar el límite de 10 peticiones/min
   del plan gratuito; además se cachean en memoria).
2. Se calculan las **medias goleadoras de la liga** (local y visitante).
3. Para cada equipo se calculan sus **fuerzas de ataque y defensa**
   (rendimiento como local / como visitante), ponderando más los partidos
   recientes con un decaimiento exponencial (estado de forma).
4. Se derivan las **tasas de goles esperados** (`λ`) del enfrentamiento:

   ```
   λ_local    = media_local_liga    × ataque_local  × defensa_visitante
   λ_visitante = media_visitante_liga × ataque_visitante × defensa_local
   ```

5. Con un **modelo de Poisson bivariante** + corrección **Dixon-Coles** para
   marcadores bajos se construye la matriz de todos los marcadores, de donde
   salen todas las probabilidades (1X2, over/under, BTTS, marcador exacto…).

> ⚠️ Es una **estimación estadística** basada en datos históricos, no una
> garantía. Úsalo como apoyo al análisis y juega con responsabilidad.

---

## 📁 Estructura

```
app.py                     # App web Flask (rutas y orquestación)
sports_advisor/
  ├─ model.py              # Motor de probabilidad (Poisson + Dixon-Coles)
  ├─ analyzer.py           # Fuerzas de equipo y tasas de gol esperadas
  ├─ api_client.py         # Cliente de football-data.org
  └─ report.py             # Veredicto y export a Markdown
templates/                 # Plantillas HTML (index, resultado)
static/style.css           # Estilos
```

## 🌐 Competiciones disponibles (plan gratuito)

Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Eredivisie,
Primeira Liga, Championship, Champions League y Brasileirão.
