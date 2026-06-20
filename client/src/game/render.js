// ─────────────────────────────────────────────────────────────
// Dibujo de la oficina sobre canvas (estilo top-down pixel-art
// simplificado). Todo se dibuja relativo a la cámara `cam` (px).
// ─────────────────────────────────────────────────────────────
import { TILE, COLS, ROWS, FURNITURE, ZONES, DIVIDER, zoneOf } from "./mapData.js";

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ── Suelo y paredes (estilo GBA: dithering en bloques de píxel) ──
const PX = 3; // tamaño del "píxel de arte" para el dithering

// Patrón de puntos determinista por celda (textura tipo 16-bit).
function dither(ctx, px, py, x, y, color, density) {
  ctx.fillStyle = color;
  let seed = (x * 374761393 + y * 668265263) >>> 0;
  const n = Math.floor(TILE / PX);
  for (let i = 0; i < density; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const cxp = (seed >>> 16) % n;
    seed = (seed * 1103515245 + 12345) >>> 0;
    const cyp = (seed >>> 16) % n;
    ctx.fillRect(px + cxp * PX, py + cyp * PX, PX, PX);
  }
}

// Suelos por sala (cada zona tiene su propia textura con dithering).
function tanTile(ctx, px, py, x, y) {
  const a = (x + y) % 2 === 0;
  ctx.fillStyle = a ? "#dac9a6" : "#d3c19c";
  ctx.fillRect(px, py, TILE, TILE);
  dither(ctx, px, py, x, y, a ? "#e7dabd" : "#e0d3b4", 6);
  dither(ctx, px, py, x + 5, y + 9, "#c6b48c", 4);
  ctx.fillStyle = "rgba(150,130,95,0.18)";
  ctx.fillRect(px, py, TILE, 1);
  ctx.fillRect(px, py, 1, TILE);
}

// Moqueta: textura "afelpada" (dithering denso).
function carpetTile(ctx, px, py, x, y, base, alt, light, dark) {
  ctx.fillStyle = (x + y) % 2 === 0 ? base : alt;
  ctx.fillRect(px, py, TILE, TILE);
  dither(ctx, px, py, x, y, light, 11);
  dither(ctx, px, py, x + 4, y + 6, dark, 9);
}

// Baldosa: junta marcada en rejilla (recepción).
function tileFloor(ctx, px, py, x, y, base, alt, seam) {
  ctx.fillStyle = (x + y) % 2 === 0 ? base : alt;
  ctx.fillRect(px, py, TILE, TILE);
  dither(ctx, px, py, x, y, "#f3ecdd", 3);
  ctx.fillStyle = seam;
  ctx.fillRect(px, py, TILE, 2);
  ctx.fillRect(px, py, 2, TILE);
}

// Suelo técnico: paneles con tornillos en las esquinas.
function techFloor(ctx, px, py, x, y) {
  ctx.fillStyle = (x + y) % 2 === 0 ? "#8a909b" : "#838995";
  ctx.fillRect(px, py, TILE, TILE);
  dither(ctx, px, py, x, y, "#9aa0aa", 5);
  ctx.fillStyle = "rgba(40,48,60,0.45)"; // juntas de panel
  ctx.fillRect(px, py, TILE, 2);
  ctx.fillRect(px, py, 2, TILE);
  ctx.fillStyle = "#5e6470"; // tornillos
  ctx.fillRect(px + 3, py + 3, 2, 2);
  ctx.fillRect(px + TILE - 5, py + 3, 2, 2);
  ctx.fillRect(px + 3, py + TILE - 5, 2, 2);
  ctx.fillRect(px + TILE - 5, py + TILE - 5, 2, 2);
}

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return h >>> 0;
}

// Césped vivo con textura de briznas (base de "ruta" estilo GBA).
function grassTile(ctx, px, py, x, y) {
  const a = (x + y) % 2 === 0;
  ctx.fillStyle = a ? "#7ec850" : "#77c247";
  ctx.fillRect(px, py, TILE, TILE);
  dither(ctx, px, py, x, y, "#8ed85f", 7);
  dither(ctx, px, py, x + 3, y + 5, "#5fa838", 6);
  // Briznas (pequeñas uves oscuras).
  ctx.fillStyle = "#5aa336";
  const h = hash(x, y);
  for (let i = 0; i < 3; i++) {
    const gx = px + ((h >>> (i * 5)) % (TILE - 6)) + 2;
    const gy = py + ((h >>> (i * 5 + 3)) % (TILE - 8)) + 4;
    ctx.fillRect(gx, gy, 1, 3);
    ctx.fillRect(gx + 2, gy + 1, 1, 2);
  }
}

// Parterre de flores (rosa / naranja / azul), como en la ruta.
const FLOWER_COLS = ["#ec7fb0", "#f2a73a", "#5aa6e8"];
function flower(ctx, cx, cy, col) {
  ctx.fillStyle = col;
  ctx.fillRect(cx - 1, cy - 3, 2, 2);
  ctx.fillRect(cx - 3, cy - 1, 2, 2);
  ctx.fillRect(cx + 1, cy - 1, 2, 2);
  ctx.fillRect(cx - 1, cy + 1, 2, 2);
  ctx.fillStyle = "#ffe06a";
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}
function flowersOnGrass(ctx, px, py, x, y) {
  const h = hash(x * 7 + 1, y * 13 + 3);
  if (h % 100 < 30) {
    const col = FLOWER_COLS[h % 3];
    flower(ctx, px + 10, py + 12, col);
    flower(ctx, px + 22, py + 22, col);
    if (h % 2) flower(ctx, px + 24, py + 9, col);
  }
}

// Acantilado con relieve: borde de tierra arriba y cara rocosa rayada.
function drawCliff(ctx, px, py) {
  ctx.fillStyle = "#a06a3c";
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = "#8a5a30"; // estrías verticales
  for (let i = 4; i < TILE; i += 7) ctx.fillRect(px + i, py + 6, 2, TILE - 6);
  ctx.fillStyle = "#c69256"; // borde de tierra superior
  ctx.fillRect(px, py, TILE, 6);
  ctx.fillStyle = "#d8a968";
  ctx.fillRect(px, py, TILE, 2);
  ctx.fillStyle = "rgba(0,0,0,0.30)"; // sombra inferior
  ctx.fillRect(px, py + TILE - 3, TILE, 3);
}

// Copa de árbol (la línea superior del mapa es un bosque).
function treeTile(ctx, px, py, x, y) {
  ctx.fillStyle = "#2c6e34";
  ctx.beginPath();
  ctx.arc(px + TILE / 2, py + TILE / 2 + 2, TILE * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f9a45"; // luces
  const h = hash(x, y);
  for (let i = 0; i < 5; i++) {
    const gx = px + (h >>> (i * 4)) % (TILE - 6) + 2;
    const gy = py + (h >>> (i * 4 + 2)) % (TILE - 10) + 2;
    ctx.fillRect(gx, gy, 4, 4);
  }
  ctx.fillStyle = "#1c4a20"; // sombra/contorno inferior
  ctx.fillRect(px - 2, py + TILE - 2, TILE + 4, 4);
}

// Sendero de tierra (conecta el corredor central con la escalera).
function isPath(x, y) {
  const onH = y === 10;
  const onV = (x === DIVIDER.door || x === DIVIDER.door + 1) && y >= 9 && y <= 11;
  return onH || onV;
}
function pathTile(ctx, px, py, x, y) {
  const a = (x + y) % 2 === 0;
  ctx.fillStyle = a ? "#cdab74" : "#c6a26a";
  ctx.fillRect(px, py, TILE, TILE);
  dither(ctx, px, py, x, y, "#d8b97f", 6);
  dither(ctx, px, py, x + 4, y + 7, "#b58e54", 6);
  // Guijarros ocasionales.
  const h = hash(x * 3, y * 5);
  if (h % 3 === 0) {
    ctx.fillStyle = "#9c7a45";
    ctx.fillRect(px + (h % (TILE - 6)) + 2, py + ((h >>> 8) % (TILE - 6)) + 2, 3, 2);
  }
}

export function drawFloor(ctx, cam) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE - cam.x;
      const py = y * TILE - cam.y;
      const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
      if (border) {
        if (y === 0) {
          // El borde superior es una línea de árboles (bosque).
          grassTile(ctx, px, py, x, y);
          treeTile(ctx, px, py, x, y);
        } else {
          drawCliff(ctx, px, py);
        }
      } else {
        switch (zoneOf(x, y)) {
          case 0: // Recepción → baldosa clara
            tileFloor(ctx, px, py, x, y, "#e7ddc6", "#ded3b8", "rgba(150,130,95,0.30)");
            break;
          case 1: // Sala de Streaming → moqueta gris-azulada
            carpetTile(ctx, px, py, x, y, "#6f7a89", "#697585", "#7d8794", "#5d6878");
            break;
          case 2: // Lounge → moqueta verde
            carpetTile(ctx, px, py, x, y, "#6fae84", "#67a67c", "#80bf95", "#5a9670");
            break;
          case 3: // Equipo Técnico → suelo técnico de paneles
            techFloor(ctx, px, py, x, y);
            break;
          default: // Pasillos/exterior → césped con flores (o sendero)
            if (isPath(x, y)) {
              pathTile(ctx, px, py, x, y);
            } else {
              grassTile(ctx, px, py, x, y);
              flowersOnGrass(ctx, px, py, x, y);
            }
        }
      }
    }
  }

  // Muro divisorio interno como acantilado, con un hueco (escalera).
  for (let x = 1; x < COLS - 1; x++) {
    if (x === DIVIDER.door || x === DIVIDER.door + 1) continue;
    drawCliff(ctx, x * TILE - cam.x, DIVIDER.row * TILE - cam.y);
  }
  // Escalera en el hueco.
  for (let d = 0; d < 2; d++) {
    const px = (DIVIDER.door + d) * TILE - cam.x;
    const py = DIVIDER.row * TILE - cam.y;
    ctx.fillStyle = "#b9bcc2";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#8d9097";
    ctx.fillRect(px, py + 6, TILE, 3);
    ctx.fillRect(px, py + TILE - 9, TILE, 3);
    ctx.fillStyle = "#d7d9dd";
    ctx.fillRect(px, py, TILE, 3);
  }
}

// ── Umbral de las salas de reunión ─────────────────────────────
// Cada sala ya tiene su propio suelo (ver drawFloor); aquí sólo se
// remarca su borde para señalar el espacio (donde el audio es de grupo).
export function drawRugs(ctx, cam) {
  ZONES.forEach((z) => {
    const px = z.x * TILE - cam.x;
    const py = z.y * TILE - cam.y;
    const w = z.w * TILE;
    const h = z.h * TILE;
    ctx.strokeStyle = "rgba(40,30,20,0.30)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(px + 3, py + 3, w - 6, h - 6);
  });
}

// ── Etiquetas de zona (capa de texto, nítida sobre el pixelado) ─
export function drawZoneLabels(ctx, cam) {
  for (const z of ZONES) {
    const px = z.x * TILE - cam.x;
    const py = z.y * TILE - cam.y;
    const w = z.w * TILE;
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "left";
    const tw = ctx.measureText(z.name).width;
    const lx = px + w / 2 - tw / 2 - 10;
    const ly = py + 6;
    ctx.fillStyle = "rgba(40,40,55,0.85)";
    roundRect(ctx, lx, ly, tw + 20, 22, 11);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(z.name, lx + 10, ly + 12);
  }
}

// ── Muebles ────────────────────────────────────────────────────
export function drawFurniture(ctx, cam) {
  for (const f of FURNITURE) {
    const x = f.x * TILE - cam.x;
    const y = f.y * TILE - cam.y;
    const w = f.w * TILE;
    const h = f.h * TILE;
    drawItem(ctx, f.kind, x, y, w, h);
  }
}

function shadow(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  roundRect(ctx, x + 3, y + h - 6, w - 6, 8, 4);
  ctx.fill();
}

function drawItem(ctx, kind, x, y, w, h) {
  ctx.save();
  switch (kind) {
    case "sofa": {
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#3a4150";
      roundRect(ctx, x + 2, y + 4, w - 4, h - 6, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4a5263";
      for (let i = 0; i < Math.round(w / TILE); i++) {
        roundRect(ctx, x + 6 + i * TILE, y + 8, TILE - 10, h - 14, 6);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "cooler":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.fillStyle = "#dfe6ec";
      roundRect(ctx, x + 8, y + 12, w - 16, h - 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5fb0e5";
      roundRect(ctx, x + 10, y + 2, w - 20, 14, 6);
      ctx.fill();
      ctx.stroke();
      break;
    case "lamp":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = "#777";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h);
      ctx.lineTo(x + w / 2, y + 8);
      ctx.stroke();
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "mondrian":
      drawMondrian(ctx, x + 6, y + 4, w - 12, h - 8);
      break;
    case "easel":
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = "#fff";
      roundRect(ctx, x + 6, y + 2, w - 12, h - 8, 4);
      ctx.fill();
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#4caf50";
      ctx.fillRect(x + 12, y + h - 16, 6, 8);
      ctx.fillStyle = "#2196f3";
      ctx.fillRect(x + 22, y + h - 22, 6, 14);
      break;
    case "screen":
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.fillStyle = "#2c3440";
      roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4aa3df";
      ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(x + 8, y + 8, w - 16, 2);
      break;
    case "whiteboard":
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = "#6b5a44";
      roundRect(ctx, x + 2, y + 2, w - 4, h - 6, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fbfbf7";
      roundRect(ctx, x + 5, y + 4, w - 10, h - 12, 3);
      ctx.fill();
      // Garabatos de marcador.
      ctx.strokeStyle = "#2e86de";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 12); ctx.lineTo(x + 22, y + 12);
      ctx.moveTo(x + 10, y + 17); ctx.lineTo(x + w - 14, y + 17);
      ctx.stroke();
      ctx.strokeStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(x + w - 26, y + 9); ctx.lineTo(x + w - 12, y + 21);
      ctx.stroke();
      // Bandeja inferior.
      ctx.fillStyle = "#6b5a44";
      ctx.fillRect(x + 6, y + h - 8, w - 12, 3);
      break;
    case "desk":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#caa472";
      roundRect(ctx, x + 2, y + 4, w - 4, h - 8, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b8915f";
      ctx.fillRect(x + 2, y + h - 8, w - 4, 4);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 4, y + 6, w - 8, 2);
      break;
    case "monitors":
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < Math.round(w / TILE); i++) {
        ctx.fillStyle = "#222a33";
        roundRect(ctx, x + 6 + i * TILE, y + 6, TILE - 12, h - 14, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#3fa7e0";
        ctx.fillRect(x + 9 + i * TILE, y + 9, TILE - 18, h - 22);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(x + 9 + i * TILE, y + 9, TILE - 18, 2);
      }
      break;
    case "gamerchair":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#2b2f36";
      roundRect(ctx, x + 8, y + 6, w - 16, h - 10, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0392b";
      ctx.fillRect(x + w / 2 - 3, y + 10, 6, h - 18);
      break;
    case "eggchair":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#c69a6b";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f0e2cf";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 6, w / 2 - 12, h / 2 - 12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "roundtable":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#d8d2c4";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2 - 4, y + h / 2 - 4, w / 2 - 12, h / 2 - 12, 0, 0, Math.PI * 1.2);
      ctx.fill();
      break;
    case "stool":
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.fillStyle = "#8a6f4f";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "cabinet":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillStyle = "#d9a86a";
      roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#9c6f3d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 6);
      ctx.lineTo(x + w / 2, y + h - 6);
      ctx.stroke();
      break;
    case "plant":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.fillStyle = "#c97f49";
      roundRect(ctx, x + w / 2 - 8, y + h - 16, 16, 12, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#3f9d52";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2 - 4, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#54bd68";
      ctx.beginPath();
      ctx.arc(x + w / 2 - 4, y + h / 2 - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "deer":
      ctx.fillStyle = "#8a5a2b";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 4, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6b4420";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 6, y + 6);
      ctx.lineTo(x + w / 2 - 12, y - 2);
      ctx.moveTo(x + w / 2 + 6, y + 6);
      ctx.lineTo(x + w / 2 + 12, y - 2);
      ctx.stroke();
      break;
    case "tower":
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.fillStyle = "#3a3f47";
      roundRect(ctx, x + 10, y + 4, w - 20, h - 8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5ad17a";
      ctx.fillRect(x + 13, y + 8, 4, 4);
      break;
    default:
      ctx.fillStyle = "#bbb";
      roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 4);
      ctx.fill();
  }
  ctx.restore();
}

function drawMondrian(ctx, x, y, w, h) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#e53935";
  ctx.fillRect(x, y, w * 0.45, h * 0.6);
  ctx.fillStyle = "#fdd835";
  ctx.fillRect(x + w * 0.7, y + h * 0.6, w * 0.3, h * 0.4);
  ctx.fillStyle = "#1e88e5";
  ctx.fillRect(x, y + h * 0.6, w * 0.25, h * 0.4);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.45, y);
  ctx.lineTo(x + w * 0.45, y + h);
  ctx.moveTo(x, y + h * 0.6);
  ctx.lineTo(x + w, y + h * 0.6);
  ctx.stroke();
}

// ── Avatar (personaje) ─────────────────────────────────────────
// Parte "mundo" del personaje (se dibuja en la capa pixelada).
export function drawCharacterSprite(ctx, p, cam) {
  const now = performance.now();
  const cx = p.px - cam.x + TILE / 2;
  const cy = p.py - cam.y + TILE / 2;
  const sit = p.sitting ? 4 : 0;
  const bob = p.moving && !p.sitting ? Math.sin(p.animT * 12) * 1.6 : 0;

  // Sombra (más tenue al estar sentado).
  ctx.fillStyle = p.sitting ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aro verde cuando la persona está hablando (micro activo + voz).
  if (p.speaking) {
    const pulse = 1 + Math.sin(now / 180) * 0.12;
    ctx.strokeStyle = "rgba(46,204,113,0.95)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 11, 13 * pulse, 7 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const frame = p.moving && !p.sitting ? Math.floor(p.animT * 8) % 2 : 0;
  drawAvatarBody(ctx, p, p.dir, cx, cy + sit, bob, frame);
}

// Parte "texto" del personaje (nombre, chat, emote) en la capa nítida.
export function drawCharacterLabel(ctx, p, cam, opts = {}) {
  const now = performance.now();
  const cx = p.px - cam.x + TILE / 2;
  const cy = p.py - cam.y + TILE / 2;

  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textAlign = "left";
  const tw = ctx.measureText(p.name).width;
  const lx = cx - tw / 2 - 7;
  const ly = cy - 30;
  ctx.fillStyle = opts.isLocal ? "rgba(46,160,90,0.95)" : "rgba(30,30,40,0.85)";
  roundRect(ctx, lx, ly, tw + 14, 18, 9);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(p.name, lx + 7, ly + 9);

  if (p.bubble && p.bubble.until > now) {
    drawBubble(ctx, cx, ly - 6, p.bubble.text);
  }

  if (p.emote && p.emote.until > now) {
    const age = now - p.emote.start;
    const rise = Math.min(age / 900, 1) * 20;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 1600) / 900);
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(p.emote.emoji, cx, cy - 36 - rise);
    ctx.restore();
  }
}

function drawBubble(ctx, cx, bottomY, text) {
  ctx.font = "13px system-ui, sans-serif";
  const maxW = 180;
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineH = 16;
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 18;
  const h = lines.length * lineH + 12;
  const x = cx - w / 2;
  const y = bottomY - h;

  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  // Pico del bocadillo.
  ctx.beginPath();
  ctx.moveTo(cx - 5, y + h);
  ctx.lineTo(cx, y + h + 7);
  ctx.lineTo(cx + 5, y + h);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.fill();

  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => ctx.fillText(l, cx, y + 6 + lineH / 2 + i * lineH));
}

// ── Cuerpo del avatar (compartido por el juego y la vista previa) ─
// `a` aporta la apariencia: color (camiseta), skin, hair, hairColor,
// glasses, accessory. (cx, cy) es el centro del tile; `bob` el balanceo;
// `frame` (0/1) alterna las piernas al andar. Estilo RPG: contorno
// oscuro + sombreado de dos tonos, como un sprite de Pokémon.
const OUTLINE = "#241a1c";

export function drawAvatarBody(ctx, a, dir, cx, cy, bob = 0, frame = 0) {
  const skin = a.skin || "#f1c9a5";
  const shirt = a.color || "#3498db";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = OUTLINE;

  // Piernas / pies (alternan al andar).
  const footY = cy + 11 + bob * 0.3;
  const la = frame ? 2 : 0;
  const ra = frame ? 0 : 2;
  ctx.fillStyle = "#39291f";
  ctx.lineWidth = 1.5;
  roundRect(ctx, cx - 6, footY - la, 5, 6, 2); ctx.fill(); ctx.stroke();
  roundRect(ctx, cx + 1, footY - ra, 5, 6, 2); ctx.fill(); ctx.stroke();

  // Cuerpo (camiseta) con contorno y sombreado de dos tonos.
  const bodyTop = cy - 2 + bob;
  ctx.lineWidth = 2;
  roundRect(ctx, cx - 8, bodyTop, 16, 15, 5);
  ctx.fillStyle = shirt;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.20)";   // sombra inferior
  ctx.fillRect(cx - 8, bodyTop + 9, 16, 8);
  ctx.fillStyle = "rgba(255,255,255,0.16)"; // brillo superior
  ctx.fillRect(cx - 8, bodyTop, 16, 4);
  ctx.restore();
  ctx.stroke();

  // Cabeza con contorno y un toque de sombra lateral.
  const hy = cy - 9 + bob;
  ctx.beginPath();
  ctx.arc(cx, hy, 8.5, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(cx - 8.5, hy + 3, 17, 6);
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.stroke();

  drawHair(ctx, a, dir, cx, hy);
  drawAccessory(ctx, a, dir, cx, hy);

  // Cara (sólo si no mira hacia arriba).
  if (dir !== "up") drawFace(ctx, a, dir, cx, hy + 1);
}

function drawAccessory(ctx, a, dir, cx, hy) {
  switch (a.accessory) {
    case "headphones":
      // Diadema sobre la cabeza.
      ctx.strokeStyle = "#2b2f36";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, hy, 9, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      // Auriculares a los lados.
      ctx.fillStyle = "#2b2f36";
      ctx.beginPath(); ctx.arc(cx - 8.5, hy + 1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8.5, hy + 1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5fb0e5";
      ctx.beginPath(); ctx.arc(cx - 8.5, hy + 1, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8.5, hy + 1, 1.3, 0, Math.PI * 2); ctx.fill();
      break;
    case "hat":
      // Gorro de lana con pompón.
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.arc(cx, hy - 1, 8.4, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath(); ctx.rect(cx - 8.4, hy - 2, 16.8, 3.2); ctx.fillStyle = "#ecf0f1"; ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ecf0f1";
      ctx.beginPath(); ctx.arc(cx, hy - 9.5, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case "bow":
      // Lazo sobre la cabeza.
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.fillStyle = "#e84393";
      ctx.beginPath();
      ctx.moveTo(cx, hy - 7);
      ctx.lineTo(cx - 6, hy - 10);
      ctx.lineTo(cx - 6, hy - 4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, hy - 7);
      ctx.lineTo(cx + 6, hy - 10);
      ctx.lineTo(cx + 6, hy - 4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c2185b";
      ctx.beginPath(); ctx.arc(cx, hy - 7, 1.8, 0, Math.PI * 2); ctx.fill();
      break;
    default:
      break;
  }
}

function drawHair(ctx, a, dir, hx, hy) {
  const style = a.hair || "short";
  if (style === "bald") return;
  const color = a.hairColor || "#4a3526";
  ctx.fillStyle = color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;

  if (style === "cap") {
    ctx.beginPath();
    ctx.arc(hx, hy, 8.7, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Visera según orientación.
    ctx.beginPath();
    if (dir === "left") ctx.rect(hx - 13, hy - 2, 8, 3);
    else if (dir === "right") ctx.rect(hx + 5, hy - 2, 8, 3);
    else ctx.rect(hx - 8, hy - 2, 16, 3);
    ctx.fill();
    ctx.stroke();
    return;
  }

  // Casquete de pelo (círculo completo si mira hacia arriba).
  ctx.beginPath();
  if (dir === "up") ctx.arc(hx, hy, 8.7, 0, Math.PI * 2);
  else ctx.arc(hx, hy, 8.7, Math.PI * 0.92, Math.PI * 2.08);
  ctx.fill();
  ctx.stroke();
  // Brillo del pelo.
  ctx.save();
  ctx.beginPath(); ctx.arc(hx, hy, 8.7, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(hx - 7, hy - 9, 14, 3);
  ctx.restore();

  if (style === "long") {
    ctx.fillStyle = color;
    roundRect(ctx, hx - 9, hy - 1, 3.5, 14, 1.5); ctx.fill(); ctx.stroke();
    roundRect(ctx, hx + 5.5, hy - 1, 3.5, 14, 1.5); ctx.fill(); ctx.stroke();
  } else if (style === "bun") {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(hx, hy - 9, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (style === "spiky") {
    ctx.fillStyle = color;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * 5 - 3.2, hy - 4);
      ctx.lineTo(hx + i * 5, hy - 13);
      ctx.lineTo(hx + i * 5 + 3.2, hy - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawFace(ctx, a, dir, cx, ey) {
  const eyes = dir === "left" ? [-3.5] : dir === "right" ? [3.5] : [-3.2, 3.2];
  const look = dir === "left" ? -0.8 : dir === "right" ? 0.8 : 0;

  for (const dx of eyes) {
    // Blanco del ojo con contorno.
    ctx.beginPath();
    ctx.ellipse(cx + dx, ey, 2.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Pupila.
    ctx.beginPath();
    ctx.arc(cx + dx + look, ey + 0.4, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#231a1c";
    ctx.fill();
  }

  if (a.glasses) {
    ctx.strokeStyle = "#231a1c";
    ctx.lineWidth = 1.4;
    for (const dx of eyes) {
      ctx.beginPath();
      ctx.arc(cx + dx, ey, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (eyes.length === 2) {
      ctx.beginPath();
      ctx.moveTo(cx + eyes[0] + 3, ey);
      ctx.lineTo(cx + eyes[1] - 3, ey);
      ctx.stroke();
    }
  }
}
