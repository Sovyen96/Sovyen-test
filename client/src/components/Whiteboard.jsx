import { useEffect, useRef, useState } from "react";
import { socket } from "../socket.js";

const COLORS = ["#2b2b2b", "#e74c3c", "#2e86de", "#27ae60", "#f1c40f", "#e84393"];
const SIZES = [3, 6, 12];

// Pizarra colaborativa en tiempo real. Los trazos se guardan con
// coordenadas normalizadas (0..1) para que se vean igual en cualquier
// pantalla. Cada trazo: { color, size, points:[{x,y}, ...] }.
export default function Whiteboard({ open, onClose }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);          // todos los trazos confirmados
  const drawingRef = useRef(null);        // trazo en curso
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);

  // Redibuja todo el lienzo desde el estado.
  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s, w, h);
    if (drawingRef.current) drawStroke(ctx, drawingRef.current, w, h);
  };

  const drawStroke = (ctx, s, w, h) => {
    if (!s.points.length) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    s.points.forEach((pt, i) => {
      const x = pt.x * w;
      const y = pt.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  // Suscripción a los eventos de la pizarra mientras está abierta.
  useEffect(() => {
    if (!open) return;

    const onState = ({ strokes }) => {
      strokesRef.current = strokes || [];
      redraw();
    };
    const onDraw = ({ stroke }) => {
      strokesRef.current.push(stroke);
      redraw();
    };
    const onClear = () => {
      strokesRef.current = [];
      redraw();
    };

    socket.on("wb-state", onState);
    socket.on("wb-draw", onDraw);
    socket.on("wb-clear", onClear);
    socket.emit("wb-request");

    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    redraw();

    return () => {
      socket.off("wb-state", onState);
      socket.off("wb-draw", onDraw);
      socket.off("wb-clear", onClear);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  if (!open) return null;

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: Math.min(1, Math.max(0, (p.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (p.clientY - r.top) / r.height)),
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = {
      color: eraser ? "#ffffff" : color,
      size: eraser ? size * 3 : size,
      points: [pos(e)],
    };
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current.points.push(pos(e));
    redraw();
  };
  const end = () => {
    const stroke = drawingRef.current;
    drawingRef.current = null;
    if (stroke && stroke.points.length) {
      strokesRef.current.push(stroke);
      socket.emit("wb-draw", { stroke });
      redraw();
    }
  };

  const clearAll = () => {
    strokesRef.current = [];
    redraw();
    socket.emit("wb-clear");
  };

  return (
    <div className="wb-backdrop">
      <div className="wb-card">
        <div className="wb-toolbar">
          <strong>🖌️ Pizarra colaborativa</strong>
          <div className="wb-tools">
            {COLORS.map((c) => (
              <button
                key={c}
                className={"wb-color" + (!eraser && c === color ? " selected" : "")}
                style={{ background: c }}
                onClick={() => { setColor(c); setEraser(false); }}
              />
            ))}
            {SIZES.map((s) => (
              <button
                key={s}
                className={"wb-size" + (s === size ? " selected" : "")}
                onClick={() => setSize(s)}
              >
                <span style={{ width: s + 2, height: s + 2 }} />
              </button>
            ))}
            <button className={"wb-btn" + (eraser ? " selected" : "")} onClick={() => setEraser((v) => !v)}>
              🧽 Borrador
            </button>
            <button className="wb-btn" onClick={clearAll}>🗑️ Limpiar</button>
            <button className="wb-btn close" onClick={onClose}>✕ Cerrar</button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="wb-canvas"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
    </div>
  );
}
