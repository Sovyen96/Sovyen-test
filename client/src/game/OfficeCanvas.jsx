import { useEffect, useRef } from "react";
import { socket } from "../socket.js";
import {
  TILE, COLS, ROWS, MAP_W, MAP_H, buildBlocked,
} from "./mapData.js";
import {
  drawFloor, drawZones, drawFurniture, drawCharacter,
} from "./render.js";

const SPEED = 5.5 * TILE; // píxeles por segundo
const DIRS = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};
const DELTA = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};

/**
 * Lienzo del juego. Renderiza la oficina y gestiona el movimiento
 * del jugador local y la interpolación de los jugadores remotos.
 */
export default function OfficeCanvas({ me }) {
  const canvasRef = useRef(null);
  const blockedRef = useRef(buildBlocked());
  const playersRef = useRef(new Map());
  const keysRef = useRef(new Set());
  const meIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let last = performance.now();

    const isBlocked = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
      return blockedRef.current.has(`${tx},${ty}`);
    };

    const addPlayer = (p) => {
      playersRef.current.set(p.id, {
        ...p,
        px: p.tx * TILE,
        py: p.ty * TILE,
        moving: false,
        animT: 0,
        bubble: null,
      });
    };

    // ── Eventos de socket ──────────────────────────────────────
    const onInit = ({ id, players }) => {
      meIdRef.current = id;
      playersRef.current.clear();
      players.forEach(addPlayer);
    };
    const onJoined = (p) => addPlayer(p);
    const onMoved = ({ id, tx, ty, dir }) => {
      const p = playersRef.current.get(id);
      if (!p || id === meIdRef.current) return;
      p.tx = tx; p.ty = ty; p.dir = dir; p.moving = true;
    };
    const onLeft = ({ id }) => playersRef.current.delete(id);
    const onChat = ({ id, text }) => {
      const p = playersRef.current.get(id);
      if (p) p.bubble = { text, until: performance.now() + 5000 };
    };
    // Cambios de apariencia/nombre (también aplican al propio avatar).
    const onUpdated = ({ id, ...fields }) => {
      const p = playersRef.current.get(id);
      if (p) Object.assign(p, fields);
    };

    socket.on("init", onInit);
    socket.on("player-joined", onJoined);
    socket.on("player-moved", onMoved);
    socket.on("player-left", onLeft);
    socket.on("chat", onChat);
    socket.on("player-updated", onUpdated);

    // ── Teclado ────────────────────────────────────────────────
    const typing = () => {
      const el = document.activeElement;
      return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };
    const onKeyDown = (e) => {
      if (typing()) return;
      if (DIRS[e.code]) {
        keysRef.current.add(DIRS[e.code]);
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      if (DIRS[e.code]) keysRef.current.delete(DIRS[e.code]);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ── Redimensionado del lienzo ──────────────────────────────
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Bucle principal ────────────────────────────────────────
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const meP = playersRef.current.get(meIdRef.current);

      // Movimiento del jugador local (tile a tile, estilo Pokémon).
      if (meP) {
        const targetX = meP.tx * TILE;
        const targetY = meP.ty * TILE;
        if (meP.px !== targetX || meP.py !== targetY) {
          meP.moving = true;
          meP.animT += dt;
          const move = SPEED * dt;
          meP.px += Math.sign(targetX - meP.px) * Math.min(move, Math.abs(targetX - meP.px));
          meP.py += Math.sign(targetY - meP.py) * Math.min(move, Math.abs(targetY - meP.py));
        } else {
          meP.moving = false;
          // ¿Hay una tecla pulsada? Iniciar el siguiente paso.
          const dir = [...keysRef.current].pop();
          if (dir) {
            const [dx, dy] = DELTA[dir];
            meP.dir = dir;
            const nx = meP.tx + dx;
            const ny = meP.ty + dy;
            if (!isBlocked(nx, ny)) {
              meP.tx = nx; meP.ty = ny; meP.moving = true;
              socket.emit("move", { tx: nx, ty: ny, dir });
            } else {
              // Sólo gira sin avanzar; informa la orientación.
              socket.emit("move", { tx: meP.tx, ty: meP.ty, dir });
            }
          }
        }
      }

      // Interpolación de jugadores remotos.
      for (const [id, p] of playersRef.current) {
        if (id === meIdRef.current) continue;
        const tx = p.tx * TILE;
        const ty = p.ty * TILE;
        if (p.px !== tx || p.py !== ty) {
          p.moving = true;
          p.animT += dt;
          const move = SPEED * dt;
          p.px += Math.sign(tx - p.px) * Math.min(move, Math.abs(tx - p.px));
          p.py += Math.sign(ty - p.py) * Math.min(move, Math.abs(ty - p.py));
        } else {
          p.moving = false;
        }
      }

      // Cámara centrada en el jugador local, recortada al mapa.
      const viewW = canvas.clientWidth;
      const viewH = canvas.clientHeight;
      const cam = { x: 0, y: 0 };
      if (meP) {
        cam.x = meP.px + TILE / 2 - viewW / 2;
        cam.y = meP.py + TILE / 2 - viewH / 2;
      }
      cam.x = MAP_W <= viewW ? (MAP_W - viewW) / 2 : Math.max(0, Math.min(cam.x, MAP_W - viewW));
      cam.y = MAP_H <= viewH ? (MAP_H - viewH) / 2 : Math.max(0, Math.min(cam.y, MAP_H - viewH));

      // Render.
      ctx.fillStyle = "#cdbfa6";
      ctx.fillRect(0, 0, viewW, viewH);
      drawFloor(ctx, cam);
      drawZones(ctx, cam);
      drawFurniture(ctx, cam);

      // Dibujar avatares ordenados por Y (profundidad).
      const ordered = [...playersRef.current.values()].sort((a, b) => a.py - b.py);
      for (const p of ordered) {
        drawCharacter(ctx, p, cam, { isLocal: p.id === meIdRef.current });
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // ── Conexión ───────────────────────────────────────────────
    if (!socket.connected) socket.connect();
    socket.emit("join", {
      name: me.name,
      appearance: {
        color: me.color,
        skin: me.skin,
        hair: me.hair,
        hairColor: me.hairColor,
        glasses: me.glasses,
      },
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
      socket.off("init", onInit);
      socket.off("player-joined", onJoined);
      socket.off("player-moved", onMoved);
      socket.off("player-left", onLeft);
      socket.off("chat", onChat);
      socket.off("player-updated", onUpdated);
    };
  }, []);

  return <canvas ref={canvasRef} className="office-canvas" />;
}
