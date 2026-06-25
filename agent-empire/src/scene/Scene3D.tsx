import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { findKind, type Silhouette } from "../agents/catalog";

// 3D isometric battlefield built with three.js. An orthographic camera at a
// fixed iso angle keeps the Age-of-Empires look while giving real depth,
// lighting and shadows. Agent movement state still lives on the store objects
// (x/y/tx/ty/ordered) so the rest of the app is unchanged.

const N = 9; // world is N x N tiles, agents use store coords in [0, N]
const CENTER = N / 2;

type Built = {
  group: THREE.Group;
  body: THREE.Mesh;
  ring: THREE.Mesh;
  label: { spr: THREE.Sprite; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; last: string };
  particles: THREE.Mesh[];
};

function makeLabel(): Built["label"] {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(2.6, 1.3, 1);
  spr.position.y = 1.7;
  spr.renderOrder = 10;
  return { spr, canvas, tex, last: "" };
}

function drawLabel(l: Built["label"], name: string, status: string, selected: boolean) {
  const key = `${name}|${status}|${selected}`;
  if (l.last === key) return;
  l.last = key;
  const ctx = l.canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 128);
  ctx.textAlign = "center";
  ctx.font = "bold 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = selected ? "#ffffff" : "#e7e3f5";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 6;
  ctx.fillText(name, 128, 42);
  if (status === "working") {
    ctx.font = "22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#78e68c";
    ctx.fillText("Working", 128, 76);
  } else if (status === "exited") {
    ctx.font = "22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#eb5a6e";
    ctx.fillText("Exited", 128, 76);
  }
  l.tex.needsUpdate = true;
}

function addAccessory(group: THREE.Group, sil: Silhouette, color: number, shade: number, headY: number) {
  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  };
  const std = (c: number, emissive = 0) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.2, emissive, emissiveIntensity: 0.4 });
  switch (sil) {
    case "astronaut": {
      const ring = mk(new THREE.TorusGeometry(0.34, 0.05, 8, 24), std(0xdfe7ff));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = headY;
      group.add(ring);
      break;
    }
    case "robot": {
      const stalk = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.3), std(shade));
      stalk.position.y = headY + 0.32;
      const bulb = mk(new THREE.SphereGeometry(0.07), std(0xffd36b, 0xffb020));
      bulb.position.y = headY + 0.5;
      group.add(stalk, bulb);
      break;
    }
    case "gem": {
      const crown = mk(new THREE.ConeGeometry(0.18, 0.3, 4), std(color, color));
      crown.position.y = headY + 0.34;
      crown.rotation.y = Math.PI / 4;
      group.add(crown);
      break;
    }
    case "ninja": {
      const band = mk(new THREE.TorusGeometry(0.29, 0.06, 8, 20), std(shade));
      band.rotation.x = Math.PI / 2;
      band.position.y = headY + 0.05;
      group.add(band);
      break;
    }
    case "hood": {
      const hood = mk(new THREE.SphereGeometry(0.36, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), std(shade));
      hood.position.y = headY;
      group.add(hood);
      break;
    }
    case "lobster": {
      const clawGeo = new THREE.SphereGeometry(0.13);
      const cL = mk(clawGeo, std(color));
      cL.position.set(-0.45, 0.5, 0);
      const cR = mk(clawGeo, std(color));
      cR.position.set(0.45, 0.5, 0);
      group.add(cL, cR);
      break;
    }
  }
}

function buildAgent(kindId: string): Built {
  const kind = findKind(kindId);
  const color = new THREE.Color(kind?.color ?? "#8888aa").getHex();
  const shade = new THREE.Color(kind?.shade ?? "#555577").getHex();
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.5, 6, 14), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const headY = 1.15;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 14),
    new THREE.MeshStandardMaterial({ color: 0xf3e6d6, roughness: 0.7 })
  );
  head.position.y = headY;
  head.castShadow = true;
  group.add(head);

  addAccessory(group, kind?.silhouette ?? "robot", color, shade, headY);

  // Ground ring (selection / working indicator).
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.62, 36),
    new THREE.MeshBasicMaterial({ color: 0x78e68c, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  // Rising "work" particles.
  const particles: THREE.Mesh[] = [];
  const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const pMat = new THREE.MeshBasicMaterial({ color: 0x78e68c });
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(pGeo, pMat.clone());
    p.visible = false;
    group.add(p);
    particles.push(p);
  }

  const label = makeLabel();
  group.add(label.spr);

  body.userData.id = ""; // set by caller
  return { group, body, ring, label, particles };
}

export function Scene3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // ── Camera (orthographic iso) ──
    let frustum = 13;
    let zoom = 1;
    const camTarget = new THREE.Vector3(CENTER, 0, CENTER);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const placeCam = () => {
      cam.position.set(camTarget.x + 16, 18, camTarget.z + 16);
      cam.lookAt(camTarget);
    };
    const applyFrustum = () => {
      const aspect = mount.clientWidth / mount.clientHeight;
      const f = frustum / zoom;
      cam.left = (-f * aspect) / 2;
      cam.right = (f * aspect) / 2;
      cam.top = f / 2;
      cam.bottom = -f / 2;
      cam.updateProjectionMatrix();
    };
    applyFrustum();
    placeCam();

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x8a7ff0, 0.55));
    const key = new THREE.DirectionalLight(0xfff0f6, 1.1);
    key.position.set(8, 16, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe1467a, 0.5);
    fill.position.set(-10, 6, -8);
    scene.add(fill);

    // ── Floor ──
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(N, N),
      new THREE.MeshStandardMaterial({ color: 0x141026, roughness: 0.9, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(CENTER, 0, CENTER);
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(N, N, 0x7c6cf0, 0x3a2f66);
    grid.position.set(CENTER, 0.01, CENTER);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    // Neon border.
    const edges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(N, N));
    const border = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xe1467a }));
    border.rotation.x = -Math.PI / 2;
    border.position.set(CENTER, 0.02, CENTER);
    scene.add(border);

    // Project-name banner sprite along the front edge of the board.
    const projCanvas = document.createElement("canvas");
    projCanvas.width = 512;
    projCanvas.height = 96;
    const projTex = new THREE.CanvasTexture(projCanvas);
    const projSpr = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: projTex, transparent: true, depthTest: false, depthWrite: false })
    );
    projSpr.scale.set(6.4, 1.2, 1);
    projSpr.position.set(CENTER, 0.5, N + 0.7);
    projSpr.renderOrder = 9;
    scene.add(projSpr);
    let projLast = "";
    function drawProject() {
      const name = useStore.getState().projectName;
      if (name === projLast) return;
      projLast = name;
      const ctx = projCanvas.getContext("2d")!;
      ctx.clearRect(0, 0, 512, 96);
      ctx.textAlign = "center";
      ctx.font = "600 44px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "rgba(180,160,230,0.85)";
      ctx.shadowColor = "rgba(225,70,122,0.6)";
      ctx.shadowBlur = 10;
      ctx.fillText(name, 256, 60);
      projTex.needsUpdate = true;
    }
    drawProject();

    // ── Agent meshes, diffed against the store each frame ──
    const built = new Map<string, Built>();
    const pickables: THREE.Mesh[] = [];

    function ensureAgents() {
      const agents = useStore.getState().agents;
      // add
      for (const a of Object.values(agents)) {
        if (!built.has(a.id)) {
          const b = buildAgent(a.kind);
          b.body.userData.id = a.id;
          b.group.position.set(a.x, 0, a.y);
          scene.add(b.group);
          built.set(a.id, b);
          pickables.push(b.body);
        }
      }
      // remove
      for (const id of [...built.keys()]) {
        if (!agents[id]) {
          const b = built.get(id)!;
          scene.remove(b.group);
          b.group.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              mats.forEach((mm) => mm.dispose());
            }
          });
          const pi = pickables.indexOf(b.body);
          if (pi >= 0) pickables.splice(pi, 1);
          built.delete(id);
        }
      }
    }

    // ── Interaction ──
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function setNdc(e: { clientX: number; clientY: number }) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    }
    let downPos = { x: 0, y: 0 };
    function onClick(e: MouseEvent) {
      // Ignore clicks that were drags (pan).
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;
      setNdc(e);
      ray.setFromCamera(ndc, cam);
      const hits = ray.intersectObjects(pickables, false);
      const id = hits[0]?.object.userData.id as string | undefined;
      useStore.getState().select(id ?? null);
    }
    function onDouble(e: MouseEvent) {
      setNdc(e);
      ray.setFromCamera(ndc, cam);
      const hits = ray.intersectObjects(pickables, false);
      const id = hits[0]?.object.userData.id as string | undefined;
      if (id) useStore.getState().openTerminal(id);
    }
    function onContext(e: MouseEvent) {
      e.preventDefault();
      const { selectedId, issueMove } = useStore.getState();
      if (!selectedId) return;
      setNdc(e);
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObject(floor, false)[0];
      if (!hit) return;
      const gx = Math.max(0.6, Math.min(N - 0.6, hit.point.x));
      const gy = Math.max(0.6, Math.min(N - 0.6, hit.point.z));
      issueMove(selectedId, gx, gy);
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      zoom = Math.min(3, Math.max(0.5, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      applyFrustum();
    }
    // Pan with middle-mouse or shift+left drag.
    let panning = false;
    let panStart = { x: 0, y: 0, tx: 0, tz: 0 };
    const rightDir = new THREE.Vector3(1, 0, -1).normalize();
    const upDir = new THREE.Vector3(-1, 0, -1).normalize();
    function onDown(e: PointerEvent) {
      downPos = { x: e.clientX, y: e.clientY };
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        panning = true;
        panStart = { x: e.clientX, y: e.clientY, tx: camTarget.x, tz: camTarget.z };
        renderer.domElement.setPointerCapture(e.pointerId);
      }
    }
    function onMove(e: PointerEvent) {
      if (!panning) return;
      const wpp = frustum / zoom / mount.clientHeight;
      const dx = (e.clientX - panStart.x) * wpp;
      const dy = (e.clientY - panStart.y) * wpp;
      camTarget.set(panStart.tx, 0, panStart.tz);
      camTarget.addScaledVector(rightDir, -dx);
      camTarget.addScaledVector(upDir, dy);
      placeCam();
    }
    function onUp() {
      panning = false;
    }

    const el = renderer.domElement;
    el.addEventListener("click", onClick);
    el.addEventListener("dblclick", onDouble);
    el.addEventListener("contextmenu", onContext);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);

    function onResize() {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      applyFrustum();
    }
    window.addEventListener("resize", onResize);

    // ── Render loop ──
    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      ensureAgents();
      const { agents, selectedId } = useStore.getState();

      drawProject();

      for (const a of Object.values(agents)) {
        const b = built.get(a.id);
        if (!b) continue;
        const working = a.status === "working";

        // Movement (same wander/order logic as before, on the X/Z plane).
        a.bob += dt * (working ? 7 : 2.2);
        const dx = a.tx - a.x;
        const dy = a.ty - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08) {
          a.ordered = false;
          if (!working && Math.random() < 0.004) {
            a.tx = 1.2 + Math.random() * (N - 2.4);
            a.ty = 1.2 + Math.random() * (N - 2.4);
          }
        }
        const speed = a.ordered ? 3.2 : working ? 0.6 : 1.2;
        if (dist > 0.02) {
          a.x += (dx / dist) * speed * dt;
          a.y += (dy / dist) * speed * dt;
          const ang = Math.atan2(dx, dy);
          b.group.rotation.y = ang;
        }

        b.group.position.x = a.x;
        b.group.position.z = a.y;
        b.group.position.y = Math.abs(Math.sin(a.bob)) * 0.12;

        const selected = a.id === selectedId;
        const ringMat = b.ring.material as THREE.MeshBasicMaterial;
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ringMat.opacity = selected ? 0.6 + 0.35 * pulse : working ? 0.25 + 0.2 * pulse : 0;
        ringMat.color.set(selected ? 0xaef0c0 : 0x78e68c);

        // particles
        b.particles.forEach((p, i) => {
          if (!working) {
            p.visible = false;
            return;
          }
          p.visible = true;
          const ph = (t * 1.2 + i * 0.5) % 1;
          p.position.set(Math.sin((t + i) * 3) * 0.3, 1.3 + ph * 1.2, Math.cos((t + i) * 2) * 0.3);
          (p.material as THREE.MeshBasicMaterial).opacity = 1 - ph;
          (p.material as THREE.MeshBasicMaterial).transparent = true;
        });

        // label
        drawLabel(b.label, a.name, a.status, selected);
        // keep label upright toward camera handled by Sprite automatically
      }

      renderer.render(scene, cam);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("click", onClick);
      el.removeEventListener("dblclick", onDouble);
      el.removeEventListener("contextmenu", onContext);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  return <div ref={mountRef} className="scene-canvas" />;
}
