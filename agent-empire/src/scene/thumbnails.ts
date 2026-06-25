import * as THREE from "three";
import { buildCharacter } from "./character";
import { AGENT_KINDS } from "../agents/catalog";

// Renders each agent kind's chibi character to a PNG data-URL once, using a
// single offscreen WebGL context. The recruit grid + config preview then just
// show <img> tags — cheap and crisp, and they match the live scene exactly.

let cache: Record<string, string> | null = null;

function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mm) => mm.dispose());
    }
  });
}

export function getThumbnails(): Record<string, string> {
  if (cache) return cache;
  cache = {};
  try {
    const size = 300;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xb6adff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(2.5, 4, 3.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe1467a, 0.55);
    fill.position.set(-3, 1.5, -2);
    scene.add(fill);

    const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    cam.position.set(0.1, 1.35, 3.1);
    cam.lookAt(0, 0.85, 0);

    for (const k of AGENT_KINDS) {
      const ch = buildCharacter(k.id);
      ch.rotation.y = -0.35; // slight 3/4 turn
      scene.add(ch);
      renderer.render(scene, cam);
      cache[k.id] = renderer.domElement.toDataURL("image/png");
      scene.remove(ch);
      disposeGroup(ch);
    }
    renderer.dispose();
  } catch (e) {
    console.warn("[agent-empire] thumbnail generation failed:", e);
  }
  return cache;
}
