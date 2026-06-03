// ─────────────────────────────────────────────────────────────
// Dibujo de la oficina sobre canvas (estilo top-down pixel-art
// simplificado). Todo se dibuja relativo a la cámara `cam` (px).
// ─────────────────────────────────────────────────────────────
import { TILE, COLS, ROWS, FURNITURE, ZONES, DIVIDER } from "./mapData.js";

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

// ── Suelo y paredes ────────────────────────────────────────────
export function drawFloor(ctx, cam) {
  // Suelo con patrón sutil de baldosas.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE - cam.x;
      const py = y * TILE - cam.y;
      const wall = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
      if (wall) {
        ctx.fillStyle = "#b9a98f";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#a8987d";
        ctx.fillRect(px, py, TILE, 4);
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#f3efe7" : "#ece7dc";
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }

  // Rejilla sutil de juntas del suelo.
  ctx.strokeStyle = "rgba(120,110,90,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    const px = x * TILE - cam.x;
    ctx.moveTo(px, TILE - cam.y);
    ctx.lineTo(px, (ROWS - 1) * TILE - cam.y);
  }
  for (let y = 1; y < ROWS; y++) {
    const py = y * TILE - cam.y;
    ctx.moveTo(TILE - cam.x, py);
    ctx.lineTo((COLS - 1) * TILE - cam.x, py);
  }
  ctx.stroke();

  // Rodapié: borde interior suave junto a las paredes.
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    TILE - cam.x + 1.5,
    TILE - cam.y + 1.5,
    (COLS - 2) * TILE - 3,
    (ROWS - 2) * TILE - 3,
  );

  // Pared divisoria con puerta.
  ctx.fillStyle = "#b9a98f";
  for (let x = 1; x < COLS - 1; x++) {
    if (x === DIVIDER.door || x === DIVIDER.door + 1) continue;
    const px = x * TILE - cam.x;
    const py = DIVIDER.row * TILE - cam.y;
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#a8987d";
    ctx.fillRect(px, py, TILE, 4);
    ctx.fillStyle = "#b9a98f";
  }
}

// ── Alfombras de las salas de reunión ──────────────────────────
// Refuerzan visualmente cada sala (donde el audio es de grupo).
const RUGS = ["#caa37a", "#5a86b0", "#5aa982", "#8a6fb0"];

export function drawRugs(ctx, cam) {
  ZONES.forEach((z, i) => {
    const px = (z.x + 0.5) * TILE - cam.x;
    const py = (z.y + 0.5) * TILE - cam.y;
    const w = (z.w - 1) * TILE;
    const h = (z.h - 1) * TILE;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = RUGS[i % RUGS.length];
    roundRect(ctx, px, py, w, h, 14);
    ctx.fill();
    // Borde interior de la alfombra.
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, px + 6, py + 6, w - 12, h - 12, 10);
    ctx.stroke();
    ctx.restore();
  });
}

// ── Zonas con etiqueta ─────────────────────────────────────────
export function drawZones(ctx, cam) {
  for (const z of ZONES) {
    const px = z.x * TILE - cam.x;
    const py = z.y * TILE - cam.y;
    const w = z.w * TILE;
    const h = z.h * TILE;
    ctx.save();
    ctx.fillStyle = "rgba(80,120,200,0.05)";
    roundRect(ctx, px + 2, py + 2, w - 4, h - 4, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(80,120,200,0.18)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Etiqueta tipo "chip".
    ctx.font = "600 13px system-ui, sans-serif";
    const tw = ctx.measureText(z.name).width;
    const lx = px + w / 2 - tw / 2 - 10;
    const ly = py + 6;
    ctx.fillStyle = "rgba(40,40,55,0.85)";
    roundRect(ctx, lx, ly, tw + 20, 22, 11);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(z.name, lx + 10, ly + 12);
    ctx.restore();
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
      ctx.fillStyle = "#3a4150";
      roundRect(ctx, x + 2, y + 4, w - 4, h - 6, 8);
      ctx.fill();
      ctx.fillStyle = "#4a5263";
      for (let i = 0; i < Math.round(w / TILE); i++) {
        roundRect(ctx, x + 6 + i * TILE, y + 8, TILE - 10, h - 14, 6);
        ctx.fill();
      }
      break;
    }
    case "cooler":
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = "#dfe6ec";
      roundRect(ctx, x + 8, y + 12, w - 16, h - 14, 4);
      ctx.fill();
      ctx.fillStyle = "#5fb0e5";
      roundRect(ctx, x + 10, y + 2, w - 20, 14, 6);
      ctx.fill();
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
      ctx.fillStyle = "#2c3440";
      roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 4);
      ctx.fill();
      ctx.fillStyle = "#4aa3df";
      ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
      break;
    case "whiteboard":
      ctx.fillStyle = "#6b5a44";
      roundRect(ctx, x + 2, y + 2, w - 4, h - 6, 4);
      ctx.fill();
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
      ctx.fillStyle = "#caa472";
      roundRect(ctx, x + 2, y + 4, w - 4, h - 8, 5);
      ctx.fill();
      ctx.fillStyle = "#b8915f";
      ctx.fillRect(x + 2, y + h - 8, w - 4, 4);
      break;
    case "monitors":
      ctx.fillStyle = "#222a33";
      for (let i = 0; i < Math.round(w / TILE); i++) {
        roundRect(ctx, x + 6 + i * TILE, y + 6, TILE - 12, h - 14, 3);
        ctx.fill();
        ctx.fillStyle = "#3fa7e0";
        ctx.fillRect(x + 9 + i * TILE, y + 9, TILE - 18, h - 22);
        ctx.fillStyle = "#222a33";
      }
      break;
    case "gamerchair":
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = "#2b2f36";
      roundRect(ctx, x + 8, y + 6, w - 16, h - 10, 8);
      ctx.fill();
      ctx.fillStyle = "#e0392b";
      ctx.fillRect(x + w / 2 - 3, y + 10, 6, h - 18);
      break;
    case "eggchair":
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = "#c69a6b";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0e2cf";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 6, w / 2 - 12, h / 2 - 12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "roundtable":
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = "#d8d2c4";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#bdb6a5";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case "stool":
      ctx.fillStyle = "#8a6f4f";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "cabinet":
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = "#d9a86a";
      roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 4);
      ctx.fill();
      ctx.strokeStyle = "#b6884e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 6);
      ctx.lineTo(x + w / 2, y + h - 6);
      ctx.stroke();
      break;
    case "plant":
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = "#c97f49";
      roundRect(ctx, x + w / 2 - 8, y + h - 16, 16, 12, 3);
      ctx.fill();
      ctx.fillStyle = "#3f9d52";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2 - 4, 12, 0, Math.PI * 2);
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
      ctx.fillStyle = "#3a3f47";
      roundRect(ctx, x + 10, y + 4, w - 20, h - 8, 3);
      ctx.fill();
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
export function drawCharacter(ctx, p, cam, opts = {}) {
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

  // Cuerpo + cabeza + rasgos (reutilizable en la vista previa).
  drawAvatarBody(ctx, p, p.dir, cx, cy + sit, bob);

  // Etiqueta de nombre.
  ctx.font = "600 12px system-ui, sans-serif";
  const tw = ctx.measureText(p.name).width;
  const lx = cx - tw / 2 - 7;
  const ly = cy - 30;
  ctx.fillStyle = opts.isLocal ? "rgba(46,160,90,0.95)" : "rgba(30,30,40,0.85)";
  roundRect(ctx, lx, ly, tw + 14, 18, 9);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(p.name, lx + 7, ly + 9);

  // Bocadillo de chat.
  if (p.bubble && p.bubble.until > now) {
    drawBubble(ctx, cx, ly - 6, p.bubble.text);
  }

  // Emote flotante.
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
// `a` aporta la apariencia: color (camiseta), skin, hair, hairColor, glasses.
// (cx, cy) es el centro del tile; `bob` el balanceo al andar.
export function drawAvatarBody(ctx, a, dir, cx, cy, bob = 0) {
  const skin = a.skin || "#f1c9a5";

  // Camiseta.
  ctx.fillStyle = a.color || "#3498db";
  roundRect(ctx, cx - 9, cy - 2 + bob, 18, 16, 6);
  ctx.fill();

  // Cabeza.
  const hy = cy - 8 + bob;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx, hy, 8, 0, Math.PI * 2);
  ctx.fill();

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
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.arc(cx, hy - 1, 8, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 8, hy - 2, 16, 3);
      ctx.fillStyle = "#ecf0f1";
      ctx.fillRect(cx - 8, hy - 1, 16, 2.5);
      ctx.beginPath(); ctx.arc(cx, hy - 9, 2.4, 0, Math.PI * 2); ctx.fill();
      break;
    case "bow":
      // Lazo sobre la cabeza.
      ctx.fillStyle = "#e84393";
      ctx.beginPath();
      ctx.moveTo(cx, hy - 7);
      ctx.lineTo(cx - 6, hy - 10);
      ctx.lineTo(cx - 6, hy - 4);
      ctx.closePath();
      ctx.moveTo(cx, hy - 7);
      ctx.lineTo(cx + 6, hy - 10);
      ctx.lineTo(cx + 6, hy - 4);
      ctx.closePath();
      ctx.fill();
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

  if (style === "cap") {
    ctx.beginPath();
    ctx.arc(hx, hy, 8.5, Math.PI, Math.PI * 2);
    ctx.fill();
    // Visera según orientación.
    if (dir === "left") ctx.fillRect(hx - 13, hy - 2, 8, 3);
    else if (dir === "right") ctx.fillRect(hx + 5, hy - 2, 8, 3);
    else ctx.fillRect(hx - 8, hy - 2, 16, 3);
    return;
  }

  // Casquete de pelo (círculo completo si mira hacia arriba).
  ctx.beginPath();
  if (dir === "up") ctx.arc(hx, hy, 8.6, 0, Math.PI * 2);
  else ctx.arc(hx, hy, 8.6, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();

  if (style === "long") {
    ctx.fillRect(hx - 8.6, hy - 1, 3, 13);
    ctx.fillRect(hx + 5.6, hy - 1, 3, 13);
  } else if (style === "bun") {
    ctx.beginPath();
    ctx.arc(hx, hy - 8.5, 3.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "spiky") {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * 5 - 3, hy - 5);
      ctx.lineTo(hx + i * 5, hy - 13);
      ctx.lineTo(hx + i * 5 + 3, hy - 5);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawFace(ctx, a, dir, cx, ey) {
  const eyes = dir === "left" ? [-4] : dir === "right" ? [4] : [-3, 3];

  ctx.fillStyle = "#2b2b2b";
  for (const dx of eyes) {
    ctx.beginPath();
    ctx.arc(cx + dx, ey, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (a.glasses) {
    ctx.strokeStyle = "#2b2b2b";
    ctx.lineWidth = 1.2;
    for (const dx of eyes) {
      ctx.beginPath();
      ctx.arc(cx + dx, ey, 2.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (eyes.length === 2) {
      ctx.beginPath();
      ctx.moveTo(cx + eyes[0] + 2.6, ey);
      ctx.lineTo(cx + eyes[1] - 2.6, ey);
      ctx.stroke();
    }
  }
}
