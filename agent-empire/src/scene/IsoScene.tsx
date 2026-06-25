import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { findKind } from "../agents/catalog";
import { Cam, GRID, drawCharacter, drawFloor, drawPing, drawProps, toScreen, toWorld } from "./iso";

// The isometric "battlefield": a single canvas with a requestAnimationFrame
// loop. Agent positions are animated in-place (mutating the store objects) so
// the render loop stays independent of React re-renders.
export function IsoScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Cam>({ ox: 0, oy: 0, zoom: 1 });
  // User camera controls layered on top of the auto-centered base camera.
  const panRef = useRef({ x: 0, y: 0 });
  const userZoomRef = useRef(1);
  const baseRef = useRef({ ox: 0, oy: 0, zoom: 1 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const base = baseRef.current;
      base.zoom = Math.min(1.4, Math.max(0.7, Math.min(w, h) / 720));
      base.ox = w / 2;
      base.oy = h / 2 - (GRID * 32 * base.zoom) / 2;
    }
    resize();
    window.addEventListener("resize", resize);

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      // Compose final camera from base + user pan/zoom each frame.
      const cam = camRef.current;
      const base = baseRef.current;
      cam.zoom = base.zoom * userZoomRef.current;
      cam.ox = base.ox + panRef.current.x;
      cam.oy = base.oy + panRef.current.y;
      const { agents, selectedId } = useStore.getState();
      const list = Object.values(agents);

      // ── Update wander/animation state ──
      for (const a of list) {
        const working = a.status === "working";
        a.bob += dt * (working ? 7 : 2.2);
        const dx = a.tx - a.x;
        const dy = a.ty - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08) {
          a.ordered = false;
          // Idle agents pick a new wander target occasionally.
          if (!working && Math.random() < 0.004) {
            a.tx = 1.2 + Math.random() * (GRID - 2.4);
            a.ty = 1.2 + Math.random() * (GRID - 2.4);
          }
        }
        // A user move order takes priority and moves quicker.
        const speed = a.ordered ? 2.2 : working ? 0.6 : 1.1;
        if (dist > 0.02) {
          a.x += (dx / dist) * speed * dt;
          a.y += (dy / dist) * speed * dt;
          a.facing = dx >= 0 ? 1 : -1;
        }
      }

      // ── Draw ──
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      drawFloor(ctx, cam, useStore.getState().projectName, t);
      drawProps(ctx, cam, t);

      // Move-order ping.
      const ping = useStore.getState().pingMarker;
      if (ping) {
        const age = (Date.now() - ping.t) / 1000;
        if (age < 0.6) drawPing(ctx, cam, ping.x, ping.y, age);
      }

      // Painter's order: sort by (gx+gy) so nearer characters draw on top.
      list.sort((p, q) => p.x + p.y - (q.x + q.y));
      for (const a of list) {
        const kind = findKind(a.kind);
        drawCharacter(
          ctx,
          cam,
          a.x,
          a.y,
          {
            color: kind?.color ?? "#888",
            shade: kind?.shade ?? "#555",
            glyph: kind?.glyph ?? "🤖",
            silhouette: kind?.silhouette ?? "robot",
          },
          {
            name: a.name,
            status: a.status,
            selected: a.id === selectedId,
            bob: a.bob,
            t,
          }
        );
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // ── Click to select the nearest agent ──
    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { agents } = useStore.getState();
      let best: string | null = null;
      let bestD = 0.9; // selection radius in tile units
      for (const a of Object.values(agents)) {
        const s = toScreen(a.x, a.y, camRef.current);
        const dpx = Math.hypot(s.x - px, s.y - (py + 18));
        const w = toWorld(px, py, camRef.current);
        const dTile = Math.hypot(a.x - w.gx, a.y - w.gy);
        // Accept either a close pixel hit on the body or a close tile hit.
        if (dpx < 34 || dTile < bestD) {
          if (dTile < bestD) {
            bestD = dTile;
            best = a.id;
          } else if (best === null) {
            best = a.id;
          }
        }
      }
      const store = useStore.getState();
      store.select(best);
    }
    function onDouble() {
      const { selectedId, openTerminal } = useStore.getState();
      if (selectedId) openTerminal(selectedId);
    }
    // Right-click the floor to issue an AoE-style move order to the selection.
    function onContext(e: MouseEvent) {
      e.preventDefault();
      const { selectedId, issueMove } = useStore.getState();
      if (!selectedId) return;
      const rect = canvas.getBoundingClientRect();
      const w = toWorld(e.clientX - rect.left, e.clientY - rect.top, camRef.current);
      const gx = Math.max(0.6, Math.min(GRID - 0.6, w.gx));
      const gy = Math.max(0.6, Math.min(GRID - 0.6, w.gy));
      issueMove(selectedId, gx, gy);
    }
    // Wheel to zoom (RTS-style).
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      userZoomRef.current = Math.min(2.6, Math.max(0.5, userZoomRef.current * factor));
    }
    // Middle-mouse or Shift+left drag to pan the camera.
    let panning = false;
    let panStart = { x: 0, y: 0, px: 0, py: 0 };
    function onPointerDown(e: PointerEvent) {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        panning = true;
        panStart = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    }
    function onPointerMove(e: PointerEvent) {
      if (!panning) return;
      panRef.current.x = panStart.px + (e.clientX - panStart.x);
      panRef.current.y = panStart.py + (e.clientY - panStart.y);
    }
    function onPointerUp() {
      panning = false;
    }
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDouble);
    canvas.addEventListener("contextmenu", onContext);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDouble);
      canvas.removeEventListener("contextmenu", onContext);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="scene-canvas" />;
}
