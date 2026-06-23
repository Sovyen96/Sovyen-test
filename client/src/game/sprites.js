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
// Parte superior (cabeza + torso) compartida por los 3 fotogramas.
const DOWN_TOP = [
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
];
const UP_TOP = [
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
];
const SIDE_TOP = [
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
];

// Piernas (4 filas) con 3 poses: reposo, paso A y paso B (andar).
const FRONT_LEGS = {
  idle: ["...ONNNNNNNNO...", "...ONNNOONNNO...", "...OBBBOOBBBO...", "....OOOOOOOO...."],
  a:    ["...ONNNNNNNNO...", "..ONNNOONNNO....", "..OBBBOOBBBO....", "...OOOOOOOO....."],
  b:    ["...ONNNNNNNNO...", "....ONNNOONNNO..", "....OBBBOOBBBO..", ".....OOOOOOOO..."],
};
const SIDE_LEGS = {
  idle: ["..ONNNNNNO......", "..ONNOONNO......", "..OBBOOBBO......", "...OOOOOO......."],
  a:    ["..ONNNNNNO......", ".ONNOONNO.......", ".OBBOOBBO.......", "..OOOOOO........"],
  b:    ["..ONNNNNNO......", "...ONNOONNO.....", "...OBBOOBBO.....", "....OOOOOO......"],
};

const compose = (top, legs) => [...top, ...legs];
const FRAMES = {
  down: [compose(DOWN_TOP, FRONT_LEGS.idle), compose(DOWN_TOP, FRONT_LEGS.a), compose(DOWN_TOP, FRONT_LEGS.b)],
  up: [compose(UP_TOP, FRONT_LEGS.idle), compose(UP_TOP, FRONT_LEGS.a), compose(UP_TOP, FRONT_LEGS.b)],
  right: [compose(SIDE_TOP, SIDE_LEGS.idle), compose(SIDE_TOP, SIDE_LEGS.a), compose(SIDE_TOP, SIDE_LEGS.b)],
};
FRAMES.left = FRAMES.right; // se dibuja espejado


export const SPRITE_W = 16;
export const SPRITE_H = 21;

/**
 * Dibuja el sprite del personaje píxel a píxel (nítido).
 * (cx, cy) es el centro del tile; `px` el tamaño del píxel de arte.
 */
export function drawTrainer(ctx, a, dir, frame, cx, cy, px) {
  const frames = FRAMES[dir] || FRAMES.down;
  const grid = frames[frame] || frames[0];
  const mirror = dir === "left";
  const skin = a.skin || "#f1c9a5";
  const hair = a.hairColor || "#4a3526";
  const shirt = a.color || "#3498db";
  const bald = a.hair === "bald";
  const pal = {
    O: OUTLINE,
    S: skin, s: darken(skin, 0.82),
    // "Rapado": el pelo se pinta como piel (cabeza sin pelo).
    H: bald ? skin : hair, h: bald ? darken(skin, 0.82) : darken(hair, 0.72),
    C: shirt, c: darken(shirt, 0.78),
    N: "#3b3f56", B: "#3a2b20", W: "#ffffff",
  };

  // Origen alineado a la rejilla de píxeles (evita parpadeo al moverse).
  const ox = Math.round(cx - (SPRITE_W * px) / 2);
  const oy = Math.round(cy + 13 - SPRITE_H * px); // pies ~ cy+13
  const put = (c, r, color) => {
    if (!color) return;
    const col = mirror ? SPRITE_W - 1 - c : c;
    ctx.fillStyle = color;
    ctx.fillRect(ox + col * px, oy + r * px, px, px);
  };

  // Base.
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== ".") put(c, r, pal[row[c]]);
    }
  }

  drawOutfit(put, a, dir, pal);
  if (!bald) drawHairExtra(put, a, dir, pal.H, pal.h);
  if (a.beard && a.beard !== "none" && dir !== "up") drawBeard(put, a, dir, pal);
  drawAccessoryPixels(put, a, dir, pal);
  drawBlink(put, a, dir, pal);
}

// Parpadeo: cada cierto tiempo cierra los ojos un instante.
function drawBlink(put, a, dir, pal) {
  if (dir === "up") return;
  const phase = ((a.color || "").length * 311 + (a.skin || "").length * 97) % 4000;
  if ((performance.now() + phase) % 4200 > 130) return; // ojos abiertos casi siempre
  const eyes = dir === "down" ? [[5, 6], [9, 10]] : [[5, 6]];
  for (const [a1, a2] of eyes) {
    put(a1, 8, pal.s); put(a2, 8, pal.s);   // tapa el ojo con piel
    put(a1, 9, pal.s); put(a2, 9, pal.s);
    put(a1, 8, pal.O); put(a2, 8, pal.O);   // línea de ojo cerrado
  }
}

// Barba sobre la parte baja de la cara.
function drawBeard(put, a, dir, pal) {
  const B = a.hair === "bald" ? "#4a3526" : (a.hairColor || "#4a3526");
  if (dir === "down") {
    for (const c of [3, 4, 11, 12]) put(c, 10, B);     // patillas
    if (a.beard === "full") {
      for (let c = 4; c <= 11; c++) put(c, 10, B);
      for (let c = 5; c <= 10; c++) put(c, 11, B);
    } else {
      put(6, 11, B); put(7, 11, B); put(8, 11, B); put(9, 11, B); // perilla
    }
  } else { // perfil
    put(3, 10, B); put(4, 10, B);
    if (a.beard === "full") { put(3, 11, B); put(4, 11, B); put(5, 11, B); }
    else { put(4, 11, B); }
  }
}

// Atuendo: traje (chaqueta + corbata) o sudadera, sobre el torso.
function drawOutfit(put, a, dir, pal) {
  if (a.outfit === "suit") {
    const JK = "#2b2e3a", JK2 = "#232532";
    for (let r = 12; r <= 16; r++) {
      for (let c = 4; c <= 11; c++) put(c, r, r >= 15 ? JK2 : JK);
    }
    if (dir === "down") {
      put(6, 12, "#fff"); put(9, 12, "#fff");       // cuello camisa
      put(7, 12, "#eef"); put(8, 12, "#eef");
      for (let r = 13; r <= 15; r++) put(7, r, "#b03a3a"); // corbata
      put(8, 13, "#b03a3a");
    }
  } else if (a.outfit === "hoodie") {
    const HD = darken(a.color || "#3498db", 0.7);
    for (let c = 3; c <= 12; c++) put(c, 12, HD);   // capucha
    put(3, 13, HD); put(12, 13, HD);
    if (dir === "down") { put(7, 13, "#fff"); put(8, 13, "#fff"); } // cordones
  }
}

// Variaciones de peinado por encima del pelo base (corto).
function drawHairExtra(put, a, dir, H, h) {
  switch (a.hair) {
    case "spiky": // mechones de punta arriba
      for (const c of [4, 7, 10]) {
        put(c, -1, H); put(c - 1, 0, h); put(c, 0, H); put(c + 1, 0, H);
      }
      break;
    case "long": // melena por los lados hasta los hombros
      for (let r = 7; r <= 13; r++) { put(2, r, H); put(13, r, h); }
      put(3, 13, H); put(12, 13, h);
      break;
    case "bun": // moño en la coronilla
      put(7, -2, H); put(8, -2, H);
      put(6, -1, H); put(7, -1, H); put(8, -1, H); put(9, -1, H);
      put(7, 0, h); put(8, 0, h);
      break;
    case "cap": // gorra: visera al frente
      for (let c = 3; c <= 12; c++) put(c, 1, h);
      if (dir === "down") for (let c = 4; c <= 11; c++) put(c, 4, "#2b2f36");
      else if (dir !== "up") { put(13, 3, "#2b2f36"); put(14, 3, "#2b2f36"); }
      break;
    default:
      break;
  }
}

// Accesorios sobre el sprite (gafas, cascos, gorro, lazo).
function drawAccessoryPixels(put, a, dir, pal) {
  // Gafas: montura alrededor de los ojos.
  if (a.glasses && dir !== "up") {
    const G = "#23191c";
    if (dir === "down") {
      for (const c of [4, 5, 6, 9, 10, 11]) { put(c, 7, G); put(c, 9, G); }
      put(4, 8, G); put(6, 8, G); put(9, 8, G); put(11, 8, G);
      put(7, 8, G); put(8, 8, G); // puente
    } else {
      for (const c of [4, 5, 6]) { put(c, 7, G); put(c, 9, G); }
      put(4, 8, G); put(6, 8, G);
    }
  }

  switch (a.accessory) {
    case "headphones": {
      const D = "#2b2f36", B = "#5fb0e5";
      if (dir === "down" || dir === "up") {
        for (let c = 4; c <= 11; c++) put(c, -1, D);       // diadema
        put(4, 0, D); put(11, 0, D);
        for (const r of [4, 5, 6]) { put(2, r, D); put(3, r, D); put(12, r, D); put(13, r, D); }
        put(2, 5, B); put(13, 5, B);                        // almohadillas
      } else {
        for (let c = 5; c <= 9; c++) put(c, -1, D);
        for (const r of [4, 5, 6]) { put(3, r, D); put(4, r, D); }
        put(3, 5, B);
      }
      break;
    }
    case "hat": { // gorro de lana con pompón
      const W = "#c0392b";
      for (let c = 3; c <= 12; c++) put(c, 1, W);
      for (let c = 2; c <= 13; c++) put(c, 2, W);
      put(2, 3, W); put(13, 3, W);
      for (let c = 3; c <= 12; c++) put(c, 0, W);
      put(7, -2, "#ecf0f1"); put(8, -2, "#ecf0f1"); // pompón
      put(7, -1, "#fff"); put(8, -1, "#fff");
      break;
    }
    case "bow": { // lazo a un lado de la cabeza
      const P = "#e84393", D = "#c2185b";
      put(3, 0, P); put(2, -1, P); put(2, 1, P);
      put(4, 0, D);
      break;
    }
    default:
      break;
  }
}
