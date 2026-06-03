// ─────────────────────────────────────────────────────────────
// Catálogo de opciones de personalización del avatar.
// Lo comparten el editor (JoinScreen / panel in-game) y el render.
// ─────────────────────────────────────────────────────────────
export const SKIN_TONES = [
  "#ffe0bd", "#f1c9a5", "#e0ac69", "#c68642", "#8d5524", "#5c3a21",
];

export const HAIR_COLORS = [
  "#2b2b2b", "#4a3526", "#8a5a2b", "#c9a227",
  "#d94f4f", "#9b59b6", "#dddddd", "#e91e63",
];

export const SHIRT_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#9b59b6",
  "#f39c12", "#1abc9c", "#e84393", "#34495e",
];

export const HAIR_STYLES = [
  { id: "short", label: "Corto" },
  { id: "long", label: "Largo" },
  { id: "bun", label: "Moño" },
  { id: "spiky", label: "Pincho" },
  { id: "cap", label: "Gorra" },
  { id: "bald", label: "Rapado" },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Genera una apariencia aleatoria (para prerellenar el editor). */
export function randomAppearance() {
  return {
    color: pick(SHIRT_COLORS),
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS),
    glasses: Math.random() < 0.3,
  };
}

/** Rellena cualquier campo ausente con valores por defecto válidos. */
export function normalizeAppearance(a = {}) {
  return {
    color: a.color || SHIRT_COLORS[1],
    skin: a.skin || SKIN_TONES[1],
    hair: a.hair || "short",
    hairColor: a.hairColor || HAIR_COLORS[1],
    glasses: !!a.glasses,
  };
}
