// ─────────────────────────────────────────────────────────────
// Definición de la oficina: dimensiones, muebles y zonas.
// Todo se mide en TILES (celdas de la rejilla). 1 tile = TILE px.
// ─────────────────────────────────────────────────────────────
export const TILE = 36;
export const COLS = 28;
export const ROWS = 18;

export const MAP_W = COLS * TILE;
export const MAP_H = ROWS * TILE;

// Muebles y decoración. `solid` indica si bloquean el paso.
// kind controla cómo se dibujan (ver render.js).
export const FURNITURE = [
  // ── Recepción / zona superior izquierda ──
  { x: 2, y: 1, w: 4, h: 1, kind: "sofa", solid: true },
  { x: 7, y: 1, w: 1, h: 1, kind: "cooler", solid: true },
  { x: 1, y: 4, w: 1, h: 1, kind: "lamp", solid: true },

  // ── Decoración de pared superior ──
  { x: 12, y: 0, w: 3, h: 1, kind: "mondrian", solid: false },
  { x: 17, y: 1, w: 2, h: 1, kind: "easel", solid: true },
  { x: 22, y: 0, w: 2, h: 1, kind: "screen", solid: false },
  { x: 23, y: 1, w: 3, h: 1, kind: "whiteboard", solid: true },

  // ── Sala de streaming (centro-izquierda) ──
  { x: 3, y: 6, w: 4, h: 1, kind: "desk", solid: true },
  { x: 4, y: 7, w: 2, h: 1, kind: "monitors", solid: true },
  { x: 4, y: 8, w: 1, h: 1, kind: "gamerchair", solid: true },

  // ── Lounge (centro-derecha) ──
  { x: 10, y: 6, w: 2, h: 2, kind: "eggchair", solid: true },
  { x: 14, y: 6, w: 2, h: 2, kind: "roundtable", solid: true },
  { x: 13, y: 6, w: 1, h: 1, kind: "stool", solid: true },
  { x: 16, y: 6, w: 1, h: 1, kind: "stool", solid: true },
  { x: 19, y: 4, w: 1, h: 1, kind: "plant", solid: true },
  { x: 19, y: 8, w: 2, h: 1, kind: "sofa", solid: true },

  // ── Decoración pared divisoria ──
  { x: 3, y: 11, w: 1, h: 1, kind: "deer", solid: false },
  { x: 9, y: 11, w: 2, h: 1, kind: "cabinet", solid: true },
  { x: 16, y: 11, w: 1, h: 1, kind: "deer", solid: false },

  // ── Equipo Técnico (zona inferior) ──
  { x: 2, y: 14, w: 3, h: 1, kind: "desk", solid: true },
  { x: 2, y: 15, w: 1, h: 1, kind: "monitors", solid: true },
  { x: 3, y: 16, w: 1, h: 1, kind: "gamerchair", solid: true },
  { x: 7, y: 14, w: 1, h: 1, kind: "tower", solid: true },
  { x: 9, y: 14, w: 3, h: 1, kind: "desk", solid: true },
  { x: 13, y: 16, w: 1, h: 1, kind: "plant", solid: true },
];

// Zonas con etiqueta (no bloquean, sólo decoran y nombran espacios).
export const ZONES = [
  { x: 1, y: 1, w: 8, h: 4, name: "Recepción" },
  { x: 2, y: 6, w: 6, h: 3, name: "Sala de Streaming" },
  { x: 9, y: 4, w: 13, h: 5, name: "Lounge" },
  { x: 1, y: 13, w: 13, h: 4, name: "Equipo Técnico" },
];

// Asientos interactivos: el jugador se sienta con la tecla E si está
// en una casilla adyacente. `dir` es la orientación al sentarse.
export const SEATS = [
  { x: 4, y: 8, dir: "up" },    // silla gamer (streaming)
  { x: 3, y: 16, dir: "up" },   // silla gamer (técnico)
  { x: 13, y: 6, dir: "down" }, // taburetes del lounge
  { x: 16, y: 6, dir: "down" },
  { x: 2, y: 1, dir: "down" },  // sofá recepción
  { x: 3, y: 1, dir: "down" },
  { x: 4, y: 1, dir: "down" },
  { x: 5, y: 1, dir: "down" },
  { x: 19, y: 8, dir: "up" },   // sofá lounge
  { x: 20, y: 8, dir: "up" },
];

// Pizarra colaborativa: zona de la pared superior. Te acercas a una
// casilla adyacente y la abres con la tecla F.
export const BOARD = { x: 23, y: 1, w: 3, h: 1 };

/** ¿Está el jugador junto a la pizarra (a una casilla)? */
export function isNearBoard(tx, ty) {
  for (let dx = 0; dx < BOARD.w; dx++) {
    if (Math.abs(BOARD.x + dx - tx) + Math.abs(BOARD.y - ty) === 1) return true;
  }
  return false;
}

// Pared divisoria horizontal con un hueco (puerta) para pasar.
const DIVIDER_ROW = 12;
const DOOR_COL = 6;

/**
 * Construye el conjunto de celdas bloqueadas ("x,y").
 * Incluye paredes exteriores, la divisoria y los muebles sólidos.
 */
export function buildBlocked() {
  const blocked = new Set();
  const block = (x, y) => blocked.add(`${x},${y}`);

  // Paredes exteriores.
  for (let x = 0; x < COLS; x++) {
    block(x, 0);
    block(x, ROWS - 1);
  }
  for (let y = 0; y < ROWS; y++) {
    block(0, y);
    block(COLS - 1, y);
  }

  // Pared divisoria con puerta.
  for (let x = 1; x < COLS - 1; x++) {
    if (x === DOOR_COL || x === DOOR_COL + 1) continue;
    block(x, DIVIDER_ROW);
  }

  // Muebles sólidos.
  for (const f of FURNITURE) {
    if (!f.solid) continue;
    for (let dx = 0; dx < f.w; dx++) {
      for (let dy = 0; dy < f.h; dy++) {
        block(f.x + dx, f.y + dy);
      }
    }
  }

  return blocked;
}

export const DIVIDER = { row: DIVIDER_ROW, door: DOOR_COL };
