"""
report.py
=========
Genera la parte "narrativa" del informe a partir de un MatchAnalysis:
el veredicto (equipo con mayor probabilidad de victoria), el nivel de
confianza y un export en Markdown para guardar/compartir.
"""

from __future__ import annotations

from .analyzer import MatchAnalysis


def pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def verdict(analysis: MatchAnalysis) -> dict:
    """
    Resume quién tiene la mayor probabilidad de victoria y con qué confianza.
    """
    p = analysis.probabilities
    options = {
        f"Victoria de {analysis.home_team}": p.home_win,
        "Empate": p.draw,
        f"Victoria de {analysis.away_team}": p.away_win,
    }
    label = max(options, key=options.get)
    prob = options[label]

    spread = max(p.home_win, p.away_win) - min(p.home_win, p.away_win)
    if prob >= 0.60:
        confidence = "Alta"
    elif prob >= 0.45:
        confidence = "Media"
    elif abs(spread) < 0.08:
        confidence = "Baja (partido muy igualado)"
    else:
        confidence = "Media-baja"

    if analysis.low_data_warning:
        confidence += " ⚠️ pocos partidos disponibles"

    return {"label": label, "probability": prob, "confidence": confidence}


def to_markdown(analysis: MatchAnalysis) -> str:
    p = analysis.probabilities
    v = verdict(analysis)
    hf, af = analysis.home_form, analysis.away_form
    odds = p.fair_odds()

    lines: list[str] = []
    lines.append(f"# Informe del partido — {analysis.competition}")
    lines.append(f"## {analysis.home_team} (local) vs {analysis.away_team} (visitante)\n")

    lines.append("### Veredicto")
    lines.append(f"- **Resultado más probable:** {v['label']} ({pct(v['probability'])})")
    lines.append(f"- **Confianza:** {v['confidence']}\n")

    lines.append("### Probabilidades 1X2")
    lines.append(f"| Mercado | Probabilidad | Cuota justa |")
    lines.append(f"|---|---|---|")
    lines.append(f"| Gana {analysis.home_team} | {pct(p.home_win)} | {odds['home']} |")
    lines.append(f"| Empate | {pct(p.draw)} | {odds['draw']} |")
    lines.append(f"| Gana {analysis.away_team} | {pct(p.away_win)} | {odds['away']} |\n")

    lines.append("### Goles esperados (modelo Poisson / Dixon-Coles)")
    lines.append(f"- {analysis.home_team}: **{p.lambda_home:.2f}** goles esperados")
    lines.append(f"- {analysis.away_team}: **{p.lambda_away:.2f}** goles esperados")
    lines.append(f"- Total esperado: **{p.expected_total_goals:.2f}** goles")
    lines.append(f"- Marcador más probable: **{p.most_likely_score[0]}-{p.most_likely_score[1]}**\n")

    lines.append("### Otros mercados")
    lines.append(f"- Over 2.5: {pct(p.over_2_5)} | Under 2.5: {pct(p.under_2_5)}")
    lines.append(f"- Over 1.5: {pct(p.over_1_5)} | Over 3.5: {pct(p.over_3_5)}")
    lines.append(f"- Ambos marcan (sí): {pct(p.btts_yes)} | (no): {pct(p.btts_no)}")
    lines.append(f"- Doble oportunidad 1X: {pct(p.home_or_draw)} | X2: {pct(p.away_or_draw)} | 12: {pct(p.home_or_away)}\n")

    lines.append("### Marcadores más probables")
    for sc, prob in p.top_scorelines:
        lines.append(f"- {sc}: {pct(prob)}")
    lines.append("")

    lines.append("### Forma reciente")
    lines.append(f"- {hf.name}: {hf.form_string} | {hf.points} pts en {hf.matches_played} ({hf.ppg:.2f} pts/partido) | GF {hf.goals_for} GC {hf.goals_against}")
    lines.append(f"- {af.name}: {af.form_string} | {af.points} pts en {af.matches_played} ({af.ppg:.2f} pts/partido) | GF {af.goals_for} GC {af.goals_against}\n")

    if analysis.head_to_head:
        lines.append("### Cara a cara (más recientes)")
        for m in analysis.head_to_head:
            lines.append(f"- {m['date']}: {m['home']} {m['home_goals']}-{m['away_goals']} {m['away']}")
        lines.append("")

    lines.append("---")
    lines.append(
        "_Informe generado por un modelo estadístico (Poisson + Dixon-Coles). "
        "Es una estimación basada en datos históricos, no una garantía. "
        "Juega de forma responsable._"
    )
    return "\n".join(lines)
