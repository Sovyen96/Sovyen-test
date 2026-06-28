# 🎨 Customizing agents

Everything about who your agents are and how they look lives in **one file**:
[`src/agents/catalog.ts`](src/agents/catalog.ts). This guide covers the three
things you'll want to do.

---

## 1. Add / remove / edit agents from the app (no code)

This is the day-to-day flow and it's exactly what the video shows:

- **Add** — click **`＋ Recruit Agent`** (or press `R`). Pick a character in the
  grid, then fill the form:
  - **Name** — label shown over the character.
  - **Launch Command** — the CLI that boots this agent, e.g. `claude`,
    `codex`, `cursor-agent`, or any shell command.
  - **Working Directory** — where it runs, e.g. `~/projects/my-app`.
  - **Dev Server** *(optional)* — a second command run alongside, e.g.
    `bun run dev`.
  - **Split Direction** — Vertical / Horizontal.
  - **Save** → the character appears on the map and its process starts.
- **Remove** — click a character to select it, then **Disband** in the bottom
  bar (or 🗑 in its terminal window).
- **Restart** — **Restart** in the bottom bar relaunches the CLI.

Your roster is saved to `~/.agent-empire/agents.json` and is re-spawned
automatically when the server restarts.

---

## 2. Add a new *type* of agent to the recruit grid

Add an entry to the `AGENT_KINDS` array in `src/agents/catalog.ts`:

```ts
{
  id: "mistral",                 // unique id
  name: "Mistral",               // shown in the grid + over the character
  role: "Mistral · le chat CLI", // small caption in the recruit card
  color: "#f97316",              // main body color
  shade: "#b45309",              // limbs / shading color
  defaultCommand: "mistral",     // pre-filled Launch Command
  glyph: "🐈",                    // emoji fallback
  silhouette: "robot",           // which 3D outfit to use (see below)
},
```

That's it — it shows up in **Recruit Agent** with its own 3D portrait, and on
the map, automatically. To **remove** a type, delete its entry.

---

## 3. Change how a character looks

Two levers, both on the catalog entry:

- **`color` / `shade`** — recolor the body and limbs instantly.
- **`silhouette`** — picks the procedural outfit. Available values:
  | silhouette   | look                                  |
  | ------------ | ------------------------------------- |
  | `astronaut`  | helmet + dark visor                   |
  | `robot`      | antenna with a glowing bulb           |
  | `gem`        | gem crown + cape                      |
  | `ninja`      | headband + tie                        |
  | `hood`       | pointed hood (assassin)               |
  | `lobster`    | claws + antennae, body-colored head   |

The 3D characters are built in
[`src/scene/character.ts`](src/scene/character.ts) (cel-shaded "chibi" rig).
To invent a brand-new outfit, add a `case` to `addAccessory()` there and a new
value to the `Silhouette` type in the catalog.

The recruit-grid portraits and the config preview are rendered from the *same*
character builder ([`src/scene/thumbnails.ts`](src/scene/thumbnails.ts)), so any
change you make shows up everywhere consistently.

---

## 4. AI-generated art (already wired)

Each catalog entry carries two optional AI assets, both generated with
Higgsfield and referenced by CDN URL by default:

- **`image`** — a chibi portrait shown in the recruit grid + config preview.
- **`model`** — a **textured GLB** loaded as the real 3D character in the scene.

Both degrade gracefully: the portrait falls back to the procedural 3D thumbnail
then the emoji glyph; the model falls back to the procedural chibi rig
(`loadModel()` in `src/scene/character.ts`). So a blocked, expired or
CORS-restricted asset never breaks the app — it just shows the procedural
version.

### Serving the assets locally (recommended for reliability)

CDN links can expire and `GLTFLoader` needs the host to allow CORS. To make the
assets bulletproof, download them into `/public` and serve them yourself:

```bash
node scripts/fetch-assets.mjs        # downloads the 6 PNGs + 6 GLBs into public/
# then set LOCAL_ASSETS = true in src/agents/catalog.ts
```

`LOCAL_ASSETS` just swaps the CDN bases for `/avatars` and `/models`; the
filenames are identical, so nothing else changes.

### Regenerating / replacing art

Swap any `image`/`model` URL for your own. To regenerate matching characters,
make a portrait with an image model, then convert it to a textured GLB with an
image→3D tool (here: Higgsfield `image_to_3d`, `should_texture: true`,
`pose_mode: "a-pose"`).
