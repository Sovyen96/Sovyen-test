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

  // ── Recepción premium ──
  { x: 2, y: 3, w: 4, h: 1, kind: "counter", solid: true },

  // ── Ventanales con vistas (pared superior, decorativos) ──
  { x: 3, y: 0, w: 2, h: 1, kind: "window", solid: false },
  { x: 9, y: 0, w: 2, h: 1, kind: "window", solid: false },
  { x: 19, y: 0, w: 2, h: 1, kind: "window", solid: false },

  // ── Cafetería (zona derecha) ──
  { x: 23, y: 4, w: 1, h: 1, kind: "coffee", solid: true },
  { x: 24, y: 4, w: 1, h: 1, kind: "fridge", solid: true },
  { x: 23, y: 6, w: 2, h: 2, kind: "roundtable", solid: true },
  { x: 22, y: 6, w: 1, h: 1, kind: "stool", solid: true },
  { x: 25, y: 6, w: 1, h: 1, kind: "stool", solid: true },

  // ── Plantas decorativas (toque premium) ──
  { x: 1, y: 10, w: 1, h: 1, kind: "plant", solid: true },
  { x: 26, y: 2, w: 1, h: 1, kind: "plant", solid: true },
  { x: 25, y: 10, w: 1, h: 1, kind: "plant", solid: true },
  { x: 26, y: 15, w: 1, h: 1, kind: "plant", solid: true },

  // ── Equipo Técnico (zona inferior) ──
  { x: 2, y: 14, w: 3, h: 1, kind: "desk", solid: true },
  { x: 2, y: 15, w: 1, h: 1, kind: "monitors", solid: true },
  { x: 3, y: 16, w: 1, h: 1, kind: "gamerchair", solid: true },
  { x: 3, y: 14, w: 1, h: 1, kind: "mug", solid: false },
  { x: 7, y: 14, w: 1, h: 1, kind: "tower", solid: true },
  { x: 9, y: 14, w: 3, h: 1, kind: "desk", solid: true },
  { x: 10, y: 14, w: 1, h: 1, kind: "mug", solid: false },
  { x: 11, y: 16, w: 2, h: 1, kind: "bookshelf", solid: true },
  { x: 12, y: 13, w: 1, h: 1, kind: "plant", solid: true },

  // ── Detalle en escritorios (teclados y papeles) ──
  { x: 4, y: 6, w: 1, h: 1, kind: "keyboard", solid: false },
  { x: 6, y: 6, w: 1, h: 1, kind: "papers", solid: false },
  { x: 2, y: 14, w: 1, h: 1, kind: "keyboard", solid: false },
  { x: 9, y: 14, w: 1, h: 1, kind: "papers", solid: false },

  // ── Sala de Juntas (abajo a la derecha) ──
  { x: 17, y: 14, w: 6, h: 1, kind: "boardtable", solid: true },
  { x: 16, y: 14, w: 1, h: 1, kind: "gamerchair", solid: true }, // extremo izq.
  { x: 23, y: 14, w: 1, h: 1, kind: "gamerchair", solid: true }, // extremo der.
  { x: 17, y: 15, w: 1, h: 1, kind: "gamerchair", solid: true },
  { x: 19, y: 15, w: 1, h: 1, kind: "gamerchair", solid: true },
  { x: 21, y: 15, w: 1, h: 1, kind: "gamerchair", solid: true },
  { x: 24, y: 14, w: 2, h: 1, kind: "presentation", solid: true },
];

// Zonas con etiqueta (no bloquean, sólo decoran y nombran espacios).
// Funcionan además como "salas de reunión": dos personas dentro de la
// misma zona se oyen aunque se muevan, no sólo por distancia bruta.
export const ZONES = [
  { x: 1, y: 1, w: 8, h: 4, name: "Recepción" },
  { x: 2, y: 6, w: 6, h: 3, name: "Sala de Streaming" },
  { x: 9, y: 4, w: 13, h: 5, name: "Lounge" },
  { x: 22, y: 4, w: 5, h: 5, name: "Cafetería" },
  { x: 1, y: 13, w: 13, h: 4, name: "Equipo Técnico" },
  { x: 15, y: 13, w: 11, h: 4, name: "Sala de Juntas" },
];

/** Índice de la zona/sala que contiene la casilla, o -1 si ninguna. */
export function zoneOf(tx, ty) {
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i];
    if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return i;
  }
  return -1;
}

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
  { x: 22, y: 6, dir: "right" },// taburetes de la cafetería
  { x: 25, y: 6, dir: "left" },
  { x: 16, y: 14, dir: "right" }, // sillas de la sala de juntas
  { x: 23, y: 14, dir: "left" },
  { x: 17, y: 15, dir: "up" },
  { x: 19, y: 15, dir: "up" },
  { x: 21, y: 15, dir: "up" },
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

// Muro divisorio horizontal con dos puertas, y un tabique vertical que
// separa los dos despachos de abajo (Equipo Técnico / Sala de Juntas).
const DIVIDER_ROW = 12;
const DOORS = new Set([6, 7]); // columnas abiertas (puertas)
// Tabique col 14, filas 13-15; la fila 16 queda abierta (puerta interior).
const PARTITIONS = [[14, 13], [14, 14], [14, 15]];

/**
 * Construye el conjunto de celdas bloqueadas ("x,y").
 * Incluye paredes exteriores, la divisoria, los tabiques y los muebles.
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

  // Muro divisorio con puertas.
  for (let x = 1; x < COLS - 1; x++) {
    if (DOORS.has(x)) continue;
    block(x, DIVIDER_ROW);
  }

  // Tabique vertical entre despachos.
  for (const [x, y] of PARTITIONS) block(x, y);

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

export const DIVIDER = { row: DIVIDER_ROW, doors: DOORS, partitions: PARTITIONS };
