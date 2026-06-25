import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { findKind } from "../agents/catalog";
import { Cam, GRID, drawCharacter, drawFloor, toScreen, toWorld } from "./iso";

// The isometric "battlefield": a single canvas with a requestAnimationFrame
// loop. Agent positions are animated in-place (mutating the store objects) so
// the render loop stays independent of React re-renders.
export function IsoScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Cam>({ ox: 0, oy: 0, zoom: 1 });

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
      const cam = camRef.current;
      cam.zoom = Math.min(1.4, Math.max(0.7, Math.min(w, h) / 720));
      // Center the diamond.
      cam.ox = w / 2;
      cam.oy = h / 2 - (GRID * 32 * cam.zoom) / 2;
    }
    resize();
    window.addEventListener("resize", resize);

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const cam = camRef.current;
      const { agents, selectedId } = useStore.getState();
      const list = Object.values(agents);

      // ── Update wander/animation state ──
      for (const a of list) {
        const working = a.status === "working";
        a.bob += dt * (working ? 7 : 2.2);
        // Pick a new idle wander target occasionally.
        const dx = a.tx - a.x;
        const dy = a.ty - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08 || (!working && Math.random() < 0.004)) {
          a.tx = 1.2 + Math.random() * (GRID - 2.4);
          a.ty = 1.2 + Math.random() * (GRID - 2.4);
        }
        const speed = working ? 0.6 : 1.1;
        if (dist > 0.02) {
          a.x += (dx / dist) * speed * dt;
          a.y += (dy / dist) * speed * dt;
          a.facing = dx >= 0 ? 1 : -1;
        }
      }

      // ── Draw ──
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      drawFloor(ctx, cam, useStore.getState().projectName, t);

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
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDouble);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDouble);
    };
  }, []);

  return <canvas ref={canvasRef} className="scene-canvas" />;
}
