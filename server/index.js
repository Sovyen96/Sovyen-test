// ─────────────────────────────────────────────────────────────
// Servidor de la oficina virtual multijugador (Socket.IO)
// Gestiona la presencia de jugadores, su movimiento y el chat.
// El servidor trabaja siempre en coordenadas de tile (tx, ty).
// ─────────────────────────────────────────────────────────────
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3001;

// Paleta de colores de camiseta para los avatares.
const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#9b59b6",
  "#f39c12", "#1abc9c", "#e84393", "#34495e",
];

// Puntos de aparición cerca de la recepción (en tiles).
const SPAWNS = [
  { tx: 5, ty: 9 }, { tx: 6, ty: 9 }, { tx: 7, ty: 9 },
  { tx: 5, ty: 10 }, { tx: 6, ty: 10 }, { tx: 7, ty: 10 },
];

const app = express();
app.use(cors());
app.get("/", (_req, res) => res.send("Office server OK"));
app.get("/health", (_req, res) => res.json({ ok: true, players: players.size }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/** @type {Map<string, {id:string,name:string,color:string,tx:number,ty:number,dir:string}>} */
const players = new Map();

let colorCursor = 0;
let spawnCursor = 0;

function nextColor() {
  const c = COLORS[colorCursor % COLORS.length];
  colorCursor++;
  return c;
}
function nextSpawn() {
  const s = SPAWNS[spawnCursor % SPAWNS.length];
  spawnCursor++;
  return s;
}

function publicList() {
  return Array.from(players.values());
}

io.on("connection", (socket) => {
  console.log(`+ conexión ${socket.id}`);

  socket.on("join", (payload = {}) => {
    const spawn = nextSpawn();
    const name = String(payload.name || "Invitado").slice(0, 16).trim() || "Invitado";
    const a = payload.appearance || {};
    const player = {
      id: socket.id,
      name,
      color: typeof a.color === "string" ? a.color : nextColor(),
      skin: typeof a.skin === "string" ? a.skin : "#f1c9a5",
      hair: typeof a.hair === "string" ? a.hair : "short",
      hairColor: typeof a.hairColor === "string" ? a.hairColor : "#4a3526",
      glasses: !!a.glasses,
      tx: spawn.tx,
      ty: spawn.ty,
      dir: "down",
    };
    players.set(socket.id, player);

    // Estado inicial sólo para quien entra.
    socket.emit("init", { id: socket.id, players: publicList() });
    // Avisar al resto.
    socket.broadcast.emit("player-joined", player);
    console.log(`  → ${name} se une (${players.size} en línea)`);
  });

  socket.on("move", ({ tx, ty, dir } = {}) => {
    const p = players.get(socket.id);
    if (!p) return;
    if (Number.isFinite(tx)) p.tx = tx;
    if (Number.isFinite(ty)) p.ty = ty;
    if (typeof dir === "string") p.dir = dir;
    socket.broadcast.emit("player-moved", { id: socket.id, tx: p.tx, ty: p.ty, dir: p.dir });
  });

  socket.on("update", (fields = {}) => {
    const p = players.get(socket.id);
    if (!p) return;
    if (typeof fields.name === "string") {
      p.name = fields.name.slice(0, 16).trim() || p.name;
    }
    for (const key of ["color", "skin", "hair", "hairColor"]) {
      if (typeof fields[key] === "string") p[key] = fields[key];
    }
    if ("glasses" in fields) p.glasses = !!fields.glasses;
    io.emit("player-updated", {
      id: socket.id,
      name: p.name,
      color: p.color,
      skin: p.skin,
      hair: p.hair,
      hairColor: p.hairColor,
      glasses: p.glasses,
    });
  });

  socket.on("chat", ({ text } = {}) => {
    const p = players.get(socket.id);
    if (!p || !text) return;
    const clean = String(text).slice(0, 140);
    io.emit("chat", { id: socket.id, name: p.name, text: clean });
  });

  socket.on("disconnect", () => {
    if (players.delete(socket.id)) {
      io.emit("player-left", { id: socket.id });
      console.log(`- ${socket.id} se va (${players.size} en línea)`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🏢 Servidor de la oficina escuchando en http://localhost:${PORT}`);
});
