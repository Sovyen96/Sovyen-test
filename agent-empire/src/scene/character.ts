import * as THREE from "three";
import { findKind, type Silhouette } from "../agents/catalog";

// Shared, cel-shaded "chibi" character builder used by the live scene, the
// recruit-grid thumbnails and the config preview. Big head + small body +
// toon material + a dark outline give the stylized game look from the
// reference video.

let gradientTex: THREE.DataTexture | null = null;
function toonGradient() {
  if (gradientTex) return gradientTex;
  // A 4-step ramp produces flat cel-shading bands.
  const data = new Uint8Array([90, 140, 200, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  gradientTex = tex;
  return tex;
}

function toon(color: THREE.ColorRepresentation, emissive: THREE.ColorRepresentation = 0x000000) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), emissive });
}

// A slightly inflated black back-faces shell → clean toon outline.
function outline(mesh: THREE.Mesh, thickness = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x0a0710, side: THREE.BackSide }));
  o.scale.setScalar(thickness);
  o.position.copy(mesh.position);
  o.rotation.copy(mesh.rotation);
  return o;
}

function addAccessory(g: THREE.Group, sil: Silhouette, color: number, shade: number, headY: number) {
  const add = (m: THREE.Mesh) => {
    m.castShadow = true;
    g.add(m);
    return m;
  };
  switch (sil) {
    case "astronaut": {
      // Glass visor + helmet rim.
      const helmet = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 16), toon(0xe9eefc)));
      helmet.position.y = headY;
      helmet.scale.set(1, 0.95, 1);
      const visor = add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.41, 18, 12, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.35, Math.PI * 0.4),
          new THREE.MeshToonMaterial({ color: 0x16202e, gradientMap: toonGradient(), emissive: 0x0a1830, emissiveIntensity: 0.6 })
        )
      );
      visor.position.set(0, headY, 0.06);
      break;
    }
    case "robot": {
      const stalk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), toon(shade)));
      stalk.position.y = headY + 0.5;
      const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.08), toon(0xffd36b, 0xffb020)));
      bulb.position.y = headY + 0.68;
      break;
    }
    case "gem": {
      const crown = add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 4), toon(color, color)));
      crown.position.y = headY + 0.5;
      crown.rotation.y = Math.PI / 4;
      // little cape
      const cape = add(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 12, 1, true), toon(shade)));
      cape.position.set(0, 0.55, -0.18);
      cape.rotation.x = -0.25;
      break;
    }
    case "ninja": {
      const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 22), toon(shade)));
      band.rotation.x = Math.PI / 2;
      band.position.y = headY + 0.12;
      // hood-ish back
      const tie = add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 6), toon(shade)));
      tie.position.set(-0.35, headY + 0.12, -0.2);
      tie.rotation.z = 0.6;
      break;
    }
    case "hood": {
      const hood = add(
        new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7), toon(shade))
      );
      hood.position.y = headY + 0.04;
      const peak = add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8), toon(shade)));
      peak.position.set(0, headY + 0.42, -0.1);
      break;
    }
    case "lobster": {
      const clawGeo = new THREE.SphereGeometry(0.16);
      const cL = add(new THREE.Mesh(clawGeo, toon(color)));
      cL.position.set(-0.5, 0.55, 0.05);
      const cR = add(new THREE.Mesh(clawGeo, toon(color)));
      cR.position.set(0.5, 0.55, 0.05);
      // antennae
      for (const s of [-1, 1]) {
        const a = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), toon(color)));
        a.position.set(s * 0.12, headY + 0.5, 0.1);
        a.rotation.z = s * 0.4;
      }
      break;
    }
  }
}

/**
 * Build a stylized chibi character group for an agent kind.
 * The torso mesh is tagged `name = "pick"` for raycasting.
 */
export function buildCharacter(kindId: string): THREE.Group {
  const kind = findKind(kindId);
  const color = new THREE.Color(kind?.color ?? "#8888aa").getHex();
  const shade = new THREE.Color(kind?.shade ?? "#555577").getHex();
  const sil = kind?.silhouette ?? "robot";
  const skin = sil === "lobster" ? color : 0xf4e3d2;

  const g = new THREE.Group();
  const headY = 1.18;

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.34, 6, 16), toon(color));
  torso.position.y = 0.58;
  torso.castShadow = true;
  torso.name = "pick";
  g.add(outline(torso), torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 16), toon(skin));
  head.position.y = headY;
  head.castShadow = true;
  g.add(outline(head, 1.05), head);

  // Eyes (skip for astronaut — visor hides them)
  if (sil !== "astronaut") {
    const eyeGeo = new THREE.SphereGeometry(0.06, 10, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1420 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo, eyeMat);
      e.position.set(s * 0.16, headY + 0.04, 0.4);
      g.add(e);
    }
  }

  // Arms
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 4, 10), toon(shade));
    arm.position.set(s * 0.36, 0.6, 0);
    arm.rotation.z = s * 0.18;
    arm.castShadow = true;
    g.add(arm);
  }

  // Legs + feet
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.16, 4, 10), toon(shade));
    leg.position.set(s * 0.16, 0.2, 0);
    leg.castShadow = true;
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), toon(shade));
    foot.position.set(s * 0.16, 0.07, 0.06);
    foot.scale.set(1, 0.7, 1.3);
    g.add(foot);
  }

  addAccessory(g, sil, color, shade, headY);
  return g;
}
