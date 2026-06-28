// Downloads the AI-generated avatar portraits (.png) and 3D models (.glb) into
// public/avatars and public/models, preserving the exact filenames the catalog
// uses. After running this, set LOCAL_ASSETS = true in src/agents/catalog.ts to
// serve everything locally (avoids CDN expiry / CORS issues with GLTFLoader).
//
//   node scripts/fetch-assets.mjs
//
// Run it on your own machine (this repo's CI sandbox blocks the CDN host).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const HF = "https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp";
const GLB = "https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a";

const assets = [
  // portraits
  ["avatars", `${HF}/hf_20260625_193101_eb7508f8-3d14-47a4-9ec5-538d80fe31db.png`],
  ["avatars", `${HF}/hf_20260625_193111_5c664635-f16a-4368-a504-32fefde80171.png`],
  ["avatars", `${HF}/hf_20260625_193113_be847ce5-e2fd-4daa-9d98-b9793794bc4e.png`],
  ["avatars", `${HF}/hf_20260625_193116_e023e725-f0b7-4c5a-a486-9c65dbe27e24.png`],
  ["avatars", `${HF}/hf_20260625_193118_ac981358-c050-4db6-88d4-55d5fd0b01f1.png`],
  ["avatars", `${HF}/hf_20260625_193120_9e1782b7-0e45-4896-8272-74c2ea7edebf.png`],
  // models
  ["models", `${GLB}/f3b8c8e3-af9b-4e35-8d72-e5b20c50148b.glb`],
  ["models", `${GLB}/da84b090-491d-495a-a094-ed711267fe07.glb`],
  ["models", `${GLB}/7e81ac05-7882-411c-ba7f-f05c8b44cdf9.glb`],
  ["models", `${GLB}/b54b9999-367a-4cf1-a393-dc06f19f5438.glb`],
  ["models", `${GLB}/523b3f26-04c9-47dd-b29a-334a62051f2a.glb`],
  ["models", `${GLB}/03d80d64-0800-4da8-ae60-931d9954eda1.glb`],
];

async function main() {
  for (const [dir, url] of assets) {
    const outDir = path.join(root, "public", dir);
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, path.basename(new URL(url).pathname));
    process.stdout.write(`↓ ${path.basename(out)} … `);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`FAILED (${res.status})`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(out, buf);
    console.log(`${(buf.length / 1024).toFixed(0)} KB`);
  }
  console.log("\nDone. Now set LOCAL_ASSETS = true in src/agents/catalog.ts.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
