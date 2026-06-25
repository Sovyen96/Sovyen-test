// Isometric projection + character drawing helpers.
// Pure functions over a 2D canvas context — no React here.

export const TILE_W = 64;
export const TILE_H = 32;
export const GRID = 9; // floor is GRID x GRID tiles

export type Cam = { ox: number; oy: number; zoom: number };

/** World tile coords -> screen pixels. */
export function toScreen(gx: number, gy: number, cam: Cam) {
  const x = (gx - gy) * (TILE_W / 2) * cam.zoom + cam.ox;
  const y = (gx + gy) * (TILE_H / 2) * cam.zoom + cam.oy;
  return { x, y };
}

/** Screen pixels -> nearest world tile (for click selection / move orders). */
export function toWorld(px: number, py: number, cam: Cam) {
  const x = (px - cam.ox) / cam.zoom;
  const y = (py - cam.oy) / cam.zoom;
  const gx = (x / (TILE_W / 2) + y / (TILE_H / 2)) / 2;
  const gy = (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2;
  return { gx, gy };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawFloor(ctx: CanvasRenderingContext2D, cam: Cam, projectName: string, t: number) {
  // Filled diamond base.
  const corners = [
    toScreen(0, 0, cam),
    toScreen(GRID, 0, cam),
    toScreen(GRID, GRID, cam),
    toScreen(0, GRID, cam),
  ];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  const grad = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  grad.addColorStop(0, "rgba(20,16,38,0.92)");
  grad.addColorStop(1, "rgba(8,6,20,0.92)");
  ctx.fillStyle = grad;
  ctx.fill();

  // Neon grid lines.
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(120,90,220,0.18)";
  for (let i = 0; i <= GRID; i++) {
    const a = toScreen(i, 0, cam);
    const b = toScreen(i, GRID, cam);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const c = toScreen(0, i, cam);
    const d = toScreen(GRID, i, cam);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }

  // Glowing outline.
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.strokeStyle = "rgba(225,70,120,0.55)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(225,70,120,0.6)";
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Project label along the lower-left edge.
  const lbl = toScreen(0.3, GRID + 0.6, cam);
  ctx.font = `${Math.round(20 * cam.zoom)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(160,140,210,0.55)";
  ctx.fillText(projectName, lbl.x, lbl.y);
  ctx.restore();
}

export type Silhouette = "astronaut" | "robot" | "gem" | "ninja" | "hood" | "lobster";
export type CharStyle = { color: string; shade: string; glyph: string; silhouette: Silhouette };

// Decorative props scattered on the floor (paper stacks + a desk/monitor),
// echoing the reference scene's "App Development" room dressing.
export function drawProps(ctx: CanvasRenderingContext2D, cam: Cam, t: number) {
  paperStack(ctx, cam, 1.2, GRID - 1.3);
  paperStack(ctx, cam, 1.9, GRID - 1.0);
  desk(ctx, cam, GRID - 1.1, 1.1, t);
}

function paperStack(ctx: CanvasRenderingContext2D, cam: Cam, gx: number, gy: number) {
  const { x, y } = toScreen(gx, gy, cam);
  const z = cam.zoom;
  for (let i = 0; i < 3; i++) {
    const oy = y - i * 3 * z;
    ctx.save();
    ctx.translate(x, oy);
    ctx.beginPath();
    ctx.moveTo(-14 * z, 0);
    ctx.lineTo(0, -7 * z);
    ctx.lineTo(14 * z, 0);
    ctx.lineTo(0, 7 * z);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? "rgba(150,120,230,0.32)" : "rgba(120,90,200,0.4)";
    ctx.strokeStyle = "rgba(180,150,255,0.5)";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function desk(ctx: CanvasRenderingContext2D, cam: Cam, gx: number, gy: number, t: number) {
  const { x, y } = toScreen(gx, gy, cam);
  const z = cam.zoom;
  // monitor screen
  ctx.save();
  ctx.translate(x, y - 18 * z);
  ctx.beginPath();
  ctx.moveTo(-20 * z, 0);
  ctx.lineTo(0, -11 * z);
  ctx.lineTo(20 * z, 0);
  ctx.lineTo(0, 11 * z);
  ctx.closePath();
  const g = 0.5 + 0.5 * Math.sin(t * 2);
  ctx.fillStyle = `rgba(40,30,70,0.9)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(225,70,122,${0.5 + 0.3 * g})`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(225,70,122,0.5)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Move-order ground ping, AoE-style.
export function drawPing(ctx: CanvasRenderingContext2D, cam: Cam, gx: number, gy: number, age: number) {
  const { x, y } = toScreen(gx, gy, cam);
  const z = cam.zoom;
  const k = Math.min(1, age / 0.6);
  ctx.beginPath();
  ctx.ellipse(x, y, (8 + 24 * k) * z, (4 + 12 * k) * z, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(120,230,140,${1 - k})`;
  ctx.lineWidth = 2.5 * z;
  ctx.stroke();
}

function accessory(ctx: CanvasRenderingContext2D, sil: Silhouette, x: number, by: number, hr: number, z: number, color: string, shade: string) {
  ctx.save();
  switch (sil) {
    case "astronaut": {
      // helmet ring
      ctx.beginPath();
      ctx.arc(x, by - hr * 0.3, hr + 2 * z, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(220,230,255,0.85)";
      ctx.lineWidth = 2 * z;
      ctx.stroke();
      break;
    }
    case "robot": {
      // antenna
      ctx.strokeStyle = shade;
      ctx.lineWidth = 1.6 * z;
      ctx.beginPath();
      ctx.moveTo(x, by - hr - 2 * z);
      ctx.lineTo(x, by - hr - 9 * z);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, by - hr - 10 * z, 2.2 * z, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd36b";
      ctx.fill();
      break;
    }
    case "gem": {
      // little crown/sparkle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 6 * z, by - hr - 2 * z);
      ctx.lineTo(x, by - hr - 9 * z);
      ctx.lineTo(x + 6 * z, by - hr - 2 * z);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "ninja": {
      // headband
      ctx.fillStyle = shade;
      ctx.fillRect(x - hr, by - hr * 0.55, hr * 2, 3 * z);
      break;
    }
    case "hood": {
      // hood over head
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(x, by - hr * 0.3, hr + 3 * z, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(x + hr + 3 * z, by);
      ctx.lineTo(x - hr - 3 * z, by);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "lobster": {
      // claws
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x - 13 * z, by + 6 * z, 4 * z, 0, Math.PI * 2);
      ctx.arc(x + 13 * z, by + 6 * z, 4 * z, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  gx: number,
  gy: number,
  style: CharStyle,
  opts: { name: string; status: string; selected: boolean; bob: number; t: number }
) {
  const { x, y } = toScreen(gx, gy, cam);
  const z = cam.zoom;
  const working = opts.status === "working";
  const bobY = Math.sin(opts.bob) * 2 * z;

  // Selection / status ring on the ground.
  if (opts.selected || working) {
    const pulse = 0.5 + 0.5 * Math.sin(opts.t * 4);
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * z, 22 * z, 11 * z, 0, 0, Math.PI * 2);
    ctx.strokeStyle = opts.selected
      ? `rgba(120,230,140,${0.6 + 0.3 * pulse})`
      : `rgba(120,230,140,${0.25 + 0.2 * pulse})`;
    ctx.lineWidth = 2.5 * z;
    ctx.stroke();
  }

  // Soft drop shadow.
  ctx.beginPath();
  ctx.ellipse(x, y + 3 * z, 14 * z, 6 * z, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  // Body (rounded capsule).
  const bw = 22 * z;
  const bh = 26 * z;
  const bx = x - bw / 2;
  const by = y - bh + bobY - 4 * z;
  const bodyGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
  bodyGrad.addColorStop(0, style.color);
  bodyGrad.addColorStop(1, style.shade);
  roundRect(ctx, bx, by, bw, bh, 9 * z);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  // subtle rim light
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Head.
  const hr = 9 * z;
  ctx.beginPath();
  ctx.arc(x, by - hr * 0.3, hr, 0, Math.PI * 2);
  ctx.fillStyle = "#f3e6d6";
  ctx.fill();

  // Per-agent accessory.
  accessory(ctx, style.silhouette, x, by, hr, z, style.color, style.shade);

  // Glyph badge on the chest.
  ctx.font = `${Math.round(13 * z)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.glyph, x, by + bh * 0.55);

  // Working particles: little code bits rising from the agent.
  if (working) {
    for (let i = 0; i < 3; i++) {
      const ph = (opts.t * 1.5 + i * 0.7) % 1;
      const px = x + Math.sin((opts.t + i) * 3) * 8 * z;
      const py = by - 6 * z - ph * 26 * z;
      ctx.globalAlpha = 1 - ph;
      ctx.fillStyle = "rgba(120,230,140,0.9)";
      ctx.fillRect(px, py, 2.5 * z, 2.5 * z);
      ctx.globalAlpha = 1;
    }
  }

  // Name tag.
  ctx.font = `${Math.round(11 * z)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = opts.selected ? "#fff" : "rgba(230,225,245,0.85)";
  ctx.fillText(opts.name, x, by - hr - 10 * z);

  // Status label.
  if (working) {
    ctx.font = `${Math.round(9 * z)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(120,230,140,0.95)";
    ctx.fillText("Working", x, by - hr - 22 * z);
  } else if (opts.status === "exited") {
    ctx.font = `${Math.round(9 * z)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(235,90,110,0.9)";
    ctx.fillText("Exited", x, by - hr - 22 * z);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
