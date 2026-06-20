// ─────────────────────────────────────────────────────────────
// Sprites de personaje en pixel-art "a mano" (estilo overworld GBA).
// Cada fotograma es una rejilla de píxeles (16×21). Se dibuja píxel a
// píxel con rectángulos nítidos, así se ve como un sprite de verdad.
// Arte original; recoloreable (piel, pelo, camiseta).
//
// Códigos:
//   . transparente   O contorno
//   S piel  s piel-sombra
//   H pelo  h pelo-sombra
//   C camiseta  c camiseta-sombra
//   N pantalón  B bota   W blanco (brillo)
// ─────────────────────────────────────────────────────────────

const OUTLINE = "#23191c";

function darken(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ── Fotograma "mirando abajo" ──────────────────────────────────
const DOWN_A = [
  "......OOOO......",
  "....OOHHHHOO....",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHSSSSSSHHO..",
  "..OHSSSSSSSSHO..",
  "..OSSSSSSSSSSO..",
  "..OSSOOSSOOSSO..",
  "..OSSOWSSWOSSO..",
  "..OsSSSSSSSSsO..",
  "...OSSSSSSSSO...",
  "...OCCCCCCCCO...",
  "..OCCCCCCCCCCO..",
  "..OSCCCCCCCCSO..",
  "..OCcCCCCCCcCO..",
  "...OCCCCCCCCO...",
  "...ONNNNNNNNO...",
  "...ONNNOONNNO...",
  "...OBBBOOBBBO...",
  "....OOOOOOOO....",
];
const DOWN_B = [
  "......OOOO......",
  "....OOHHHHOO....",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHSSSSSSHHO..",
  "..OHSSSSSSSSHO..",
  "..OSSSSSSSSSSO..",
  "..OSSOOSSOOSSO..",
  "..OSSOWSSWOSSO..",
  "..OsSSSSSSSSsO..",
  "...OSSSSSSSSO...",
  "...OCCCCCCCCO...",
  "..OCCCCCCCCCCO..",
  "..OSCCCCCCCCSO..",
  "..OCcCCCCCCcCO..",
  "...OCCCCCCCCO...",
  "...ONNNNNNNNO...",
  "...ONNNNNNNNO...",
  "...OBBOOOOBBO...",
  "....OOOOOOOO....",
];

// ── Fotograma "mirando arriba" (nuca: todo pelo) ───────────────
const UP_A = [
  "......OOOO......",
  "....OOHHHHOO....",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHhHHHHHHhHO..",
  "..OhHHHHHHHHhO..",
  "...OHHHHHHHHO...",
  "...OCCCCCCCCO...",
  "..OCCCCCCCCCCO..",
  "..OCCCCCCCCCCO..",
  "..OCcCCCCCCcCO..",
  "...OCCCCCCCCO...",
  "...ONNNNNNNNO...",
  "...ONNNOONNNO...",
  "...OBBBOOBBBO...",
  "....OOOOOOOO....",
];
const UP_B = UP_A.map((r, i) =>
  i === 18 ? "...ONNNNNNNNO..." : i === 19 ? "...OBBOOOOBBO..." : r,
);

// ── Fotograma "mirando a la derecha" (perfil) ──────────────────
const SIDE_A = [
  ".....OOOO.......",
  "...OOHHHHO......",
  "..OHHHHHHHO.....",
  ".OHHHHHHHHHO....",
  ".OHHHHHHHHHO....",
  ".OHHHHHSSSSO....",
  ".OHHHSSSSSSO....",
  ".OHSSSSSSSSO....",
  ".OSSSOOSSSSO....",
  ".OSSSOWSSSSO....",
  ".OsSSSSSSSsO....",
  "..OSSSSSSSO.....",
  "..OCCCCCCO......",
  ".OCCCCCCCCO.....",
  ".OCCCCCCCCSO....",
  ".OCcCCCCCCcO....",
  "..OCCCCCCCO.....",
  "..ONNNNNNO......",
  "..ONNOONNO......",
  "..OBBOOBBO......",
  "...OOOOOO.......",
];
const SIDE_B = SIDE_A.map((r, i) =>
  i === 18 ? "..ONNNNNNO......" : i === 19 ? "..OBBOOBBO......" : r,
);

const FRAMES = {
  down: [DOWN_A, DOWN_B],
  up: [UP_A, UP_B],
  right: [SIDE_A, SIDE_B],
  left: [SIDE_A, SIDE_B], // se dibuja espejado
};

export const SPRITE_W = 16;
export const SPRITE_H = 21;

/**
 * Dibuja el sprite del personaje píxel a píxel (nítido).
 * (cx, cy) es el centro del tile; `px` el tamaño del píxel de arte.
 */
export function drawTrainer(ctx, a, dir, frame, cx, cy, px) {
  const grid = (FRAMES[dir] || FRAMES.down)[frame ? 1 : 0];
  const mirror = dir === "left";
  const skin = a.skin || "#f1c9a5";
  const hair = a.hairColor || "#4a3526";
  const shirt = a.color || "#3498db";
  const pal = {
    O: OUTLINE,
    S: skin, s: darken(skin, 0.82),
    H: hair, h: darken(hair, 0.75),
    C: shirt, c: darken(shirt, 0.78),
    N: "#3b3f56", B: "#3a2b20", W: "#ffffff",
  };

  // Origen alineado a la rejilla de píxeles (evita parpadeo al moverse).
  const ox = Math.round(cx - (SPRITE_W * px) / 2);
  const oy = Math.round(cy + 13 - SPRITE_H * px); // pies ~ cy+13

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      const color = pal[ch];
      if (!color) continue;
      const col = mirror ? SPRITE_W - 1 - c : c;
      ctx.fillStyle = color;
      ctx.fillRect(ox + col * px, oy + r * px, px, px);
    }
  }

  drawAccessoryPixels(ctx, a, dir, ox, oy, px, mirror, pal);
}

// Accesorios sobre el sprite (gafas, cascos, gorra, gorro, lazo).
function drawAccessoryPixels(ctx, a, dir, ox, oy, px, mirror, pal) {
  const put = (c, r, color) => {
    const col = mirror ? SPRITE_W - 1 - c : c;
    ctx.fillStyle = color;
    ctx.fillRect(ox + col * px, oy + r * px, px, px);
  };

  // Gafas: barra sobre los ojos (fila 8) cuando se ve la cara.
  if (a.glasses && dir !== "up") {
    const cols = dir === "down" ? [4, 5, 7, 8, 10, 11] : [3, 4, 6];
    for (const c of cols) put(c, 8, pal.O);
  }

  switch (a.accessory) {
    case "headphones":
      if (dir === "down" || dir === "up") {
        for (const r of [4, 5, 6]) { put(2, r, "#2b2f36"); put(13, r, "#2b2f36"); }
        put(2, 5, "#5fb0e5"); put(13, 5, "#5fb0e5");
      } else {
        for (const r of [4, 5, 6]) put(1, r, "#2b2f36");
        put(1, 5, "#5fb0e5");
      }
      break;
    case "cap": {
      const brim = "#c0392b";
      for (let c = 2; c <= 13; c++) put(c, 4, brim);
      for (let c = 3; c <= 11; c++) put(c, 3, brim);
      put(12, 5, brim); put(13, 5, brim); // visera
      break;
    }
    case "hat":
      for (let c = 3; c <= 12; c++) put(c, 1, "#c0392b");
      for (let c = 2; c <= 13; c++) put(c, 2, "#c0392b");
      put(7, 0, "#ecf0f1"); put(8, 0, "#ecf0f1"); // pompón
      break;
    case "bow":
      put(6, 1, "#e84393"); put(9, 1, "#e84393");
      put(7, 1, "#c2185b"); put(8, 1, "#c2185b");
      put(6, 0, "#e84393"); put(9, 0, "#e84393");
      break;
    default:
      break;
  }
}
