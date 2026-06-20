import { useEffect, useRef } from "react";
import { socket } from "../socket.js";
import {
  TILE, COLS, ROWS, MAP_W, MAP_H, buildBlocked, SEATS, isNearBoard,
} from "./mapData.js";
import {
  drawFloor, drawRugs, drawZoneLabels, drawFurniture,
  drawCharacterSprite, drawCharacterLabel,
} from "./render.js";
import { EMOTES } from "./appearance.js";
import { gameState } from "./gameState.js";

const SPEED = 5.5 * TILE; // píxeles por segundo
const PIXEL = 3;          // factor de pixelado (estética GBA)
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
export default function OfficeCanvas({ me, onPrompt, onOpenBoard }) {
  const canvasRef = useRef(null);
  const blockedRef = useRef(buildBlocked());
  const playersRef = useRef(new Map());
  const keysRef = useRef(new Set());
  const meIdRef = useRef(null);
  const actionRef = useRef(false);      // tecla E pendiente de procesar
  const boardRef = useRef(false);       // tecla F pendiente de procesar
  const openBoardRef = useRef(onOpenBoard);
  openBoardRef.current = onOpenBoard;
  const bufFullRef = useRef(null);  // mundo a resolución completa
  const bufSmallRef = useRef(null); // mundo reducido (para pixelar)

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let last = performance.now();

    const isBlocked = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
      return blockedRef.current.has(`${tx},${ty}`);
    };

    // Asiento adyacente (a una casilla) a la posición dada.
    const findSeat = (tx, ty) =>
      SEATS.find((s) => Math.abs(s.x - tx) + Math.abs(s.y - ty) === 1);

    // Aviso contextual ("Pulsa E…"); evita re-render salvo que cambie.
    let lastPrompt = "";
    const setPrompt = (text) => {
      if (text !== lastPrompt) {
        lastPrompt = text;
        onPrompt?.(text);
      }
    };

    const addPlayer = (p) => {
      playersRef.current.set(p.id, {
        ...p,
        px: p.tx * TILE,
        py: p.ty * TILE,
        moving: false,
        sitting: !!p.sitting,
        animT: 0,
        bubble: null,
        emote: null,
      });
    };

    // ── Eventos de socket ──────────────────────────────────────
    const onInit = ({ id, players }) => {
      meIdRef.current = id;
      gameState.myId = id;
      gameState.players = playersRef.current;
      playersRef.current.clear();
      players.forEach(addPlayer);
    };
    const onJoined = (p) => addPlayer(p);
    const onMoved = ({ id, tx, ty, dir, sitting }) => {
      const p = playersRef.current.get(id);
      if (!p || id === meIdRef.current) return;
      p.tx = tx; p.ty = ty; p.dir = dir; p.moving = true;
      if (typeof sitting === "boolean") p.sitting = sitting;
    };
    const onLeft = ({ id }) => playersRef.current.delete(id);
    const onChat = ({ id, text }) => {
      const p = playersRef.current.get(id);
      if (p) p.bubble = { text, until: performance.now() + 5000 };
    };
    const onEmote = ({ id, emoji }) => {
      const p = playersRef.current.get(id);
      if (p) p.emote = { emoji, start: performance.now(), until: performance.now() + 2500 };
    };
    const onFull = ({ max }) => {
      window.alert(`La oficina está completa (máximo ${max} personas). Inténtalo en un rato.`);
    };
    const onSpeaking = ({ id, on }) => {
      const p = playersRef.current.get(id);
      if (p) p.speaking = on;
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
    socket.on("emote", onEmote);
    socket.on("full", onFull);
    socket.on("speaking", onSpeaking);
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
      } else if (e.code === "KeyE") {
        actionRef.current = true;
        e.preventDefault();
      } else if (e.code === "KeyF") {
        boardRef.current = true;
        e.preventDefault();
      } else if (/^Digit[1-6]$/.test(e.code)) {
        const emoji = EMOTES[Number(e.code.slice(5)) - 1];
        if (emoji) socket.emit("emote", { emoji });
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

        // Abrir la pizarra con F si estamos junto a ella.
        if (boardRef.current) {
          if (isNearBoard(meP.tx, meP.ty)) openBoardRef.current?.();
          boardRef.current = false;
        }

        if (meP.px !== targetX || meP.py !== targetY) {
          // En tránsito hacia la casilla objetivo.
          meP.moving = true;
          meP.animT += dt;
          const move = SPEED * dt;
          meP.px += Math.sign(targetX - meP.px) * Math.min(move, Math.abs(targetX - meP.px));
          meP.py += Math.sign(targetY - meP.py) * Math.min(move, Math.abs(targetY - meP.py));
          setPrompt("");
        } else if (meP.sitting) {
          // Sentado: con E (o caminando tras un instante) se levanta.
          meP.moving = false;
          const dir = [...keysRef.current].pop();
          if (actionRef.current || (dir && performance.now() - meP.sitT > 300)) {
            meP.sitting = false;
            meP.tx = meP.standTile.x;
            meP.ty = meP.standTile.y;
            socket.emit("move", { tx: meP.tx, ty: meP.ty, dir: meP.dir, sitting: false });
          }
          actionRef.current = false;
          setPrompt(meP.sitting ? "Pulsa E o muévete para levantarte" : "");
        } else {
          meP.moving = false;
          const seat = findSeat(meP.tx, meP.ty);

          if (actionRef.current && seat) {
            // Sentarse en el asiento adyacente.
            meP.standTile = { x: meP.tx, y: meP.ty };
            meP.tx = seat.x; meP.ty = seat.y; meP.dir = seat.dir;
            meP.sitting = true; meP.sitT = performance.now();
            socket.emit("move", { tx: seat.x, ty: seat.y, dir: seat.dir, sitting: true });
          } else {
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
          actionRef.current = false;

          // Aviso contextual con las acciones disponibles alrededor.
          const parts = [];
          if (!meP.sitting && seat) parts.push("E para sentarte");
          if (isNearBoard(meP.tx, meP.ty)) parts.push("F para la pizarra");
          setPrompt(parts.join("   ·   "));
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

      const ordered = [...playersRef.current.values()].sort((a, b) => a.py - b.py);

      // ── Capa "mundo" a resolución completa (se pixelará) ──
      if (!bufFullRef.current) bufFullRef.current = document.createElement("canvas");
      if (!bufSmallRef.current) bufSmallRef.current = document.createElement("canvas");
      const bufFull = bufFullRef.current;
      const bufSmall = bufSmallRef.current;
      const sw = Math.max(1, Math.ceil(viewW / PIXEL));
      const sh = Math.max(1, Math.ceil(viewH / PIXEL));
      if (bufFull.width !== viewW || bufFull.height !== viewH) {
        bufFull.width = viewW; bufFull.height = viewH;
      }
      if (bufSmall.width !== sw || bufSmall.height !== sh) {
        bufSmall.width = sw; bufSmall.height = sh;
      }
      const fctx = bufFull.getContext("2d");
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.fillStyle = "#cdbfa6";
      fctx.fillRect(0, 0, viewW, viewH);
      drawFloor(fctx, cam);
      drawRugs(fctx, cam);
      drawFurniture(fctx, cam);

      // Reducir y ampliar sin interpolar → píxeles gordos GBA (sólo el fondo).
      const sctx = bufSmall.getContext("2d");
      sctx.imageSmoothingEnabled = false; // nearest → píxeles nítidos (GBA)
      sctx.clearRect(0, 0, sw, sh);
      sctx.drawImage(bufFull, 0, 0, viewW, viewH, 0, 0, sw, sh);

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, viewW, viewH);
      ctx.drawImage(bufSmall, 0, 0, sw, sh, 0, 0, sw * PIXEL, sh * PIXEL);

      // ── Personajes: sprites pixel-art nítidos sobre el fondo ──
      for (const p of ordered) drawCharacterSprite(ctx, p, cam, PIXEL);

      // ── Iluminación cálida (viñeta sutil) ──
      const lg = ctx.createRadialGradient(
        viewW / 2, viewH * 0.42, Math.min(viewW, viewH) * 0.25,
        viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.72,
      );
      lg.addColorStop(0, "rgba(255,238,205,0.05)");
      lg.addColorStop(1, "rgba(35,25,15,0.22)");
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, viewW, viewH);

      // ── Capa de texto nítida por encima ──
      ctx.imageSmoothingEnabled = true;
      drawZoneLabels(ctx, cam);
      for (const p of ordered) {
        drawCharacterLabel(ctx, p, cam, { isLocal: p.id === meIdRef.current });
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // ── Conexión ───────────────────────────────────────────────
    // Se (re)envía en cada 'connect', así si se cae la red y Socket.IO
    // reconecta, el jugador vuelve a entrar solo (sin recargar).
    const doJoin = () =>
      socket.emit("join", {
        name: me.name,
        appearance: {
          color: me.color,
          skin: me.skin,
          hair: me.hair,
          hairColor: me.hairColor,
          glasses: me.glasses,
          accessory: me.accessory,
          outfit: me.outfit,
          beard: me.beard,
        },
      });
    socket.on("connect", doJoin);
    if (socket.connected) doJoin();
    else socket.connect();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
      socket.off("connect", doJoin);
      socket.off("init", onInit);
      socket.off("player-joined", onJoined);
      socket.off("player-moved", onMoved);
      socket.off("player-left", onLeft);
      socket.off("chat", onChat);
      socket.off("emote", onEmote);
      socket.off("full", onFull);
      socket.off("speaking", onSpeaking);
      socket.off("player-updated", onUpdated);
    };
  }, []);

  return <canvas ref={canvasRef} className="office-canvas" />;
}
