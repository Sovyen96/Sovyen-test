# 🏰 Agent Empire

An **Age-of-Empires-style command center for AI coding agents**. Recruit
agents (Claude, Codex, Gemini, Qwen, Cursor, or your own CLI), watch them all
live on an isometric battlefield, and open a real terminal for any of them — all
running **simultaneously**.

Inspired by the multi-agent "war room" concept: every agent is a little
character on the map, with an idle/working state, and a live PTY behind it.

![concept](docs/concept.md)

## What it does

- **Recruit Agent** — pick an AI avatar and configure its launch command,
  working directory and optional dev server (mirrors the reference UI). Each
  agent has its own procedural look (astronaut, robot, ninja, hooded, …).
- **Isometric scene** — every agent is a character that wanders the floor,
  emits little "code" particles, and shows a green **Working** ring when its
  process is producing output. Decorative desk/paper props dress the room.
- **Many live terminals at once** — open any number of agents' terminals as
  independent, **draggable & resizable** windows. **Open all** + **Tile**
  arrange them in a grid so you can watch every agent simultaneously. Each is a
  real [xterm.js](https://xtermjs.org/) terminal bound to the process.
- **Dispatch tasks** — type a prompt in a terminal's task bar and hit ⏎ to send
  it straight into that agent's CLI (the "orchestration" from the video).
- **RTS controls** — **click** to select, **right-click** the floor to issue a
  move order (AoE-style ground ping), **double-click** to open a terminal,
  **wheel** to zoom, **shift/middle-drag** to pan. Shortcuts: `R` recruit,
  `T` tile, `Esc` deselect.
- **Live status** — the backend spawns each agent in a real pseudo-terminal
  ([node-pty](https://github.com/microsoft/node-pty)) and streams output over a
  WebSocket. It falls back to plain pipes if `node-pty` can't be built.

## Run it

```bash
cd agent-empire
npm install          # builds node-pty if your toolchain allows; otherwise falls back
npm run dev          # starts the Node backend (:8787) + Vite UI (:5173)
```

Then open <http://localhost:5173>.

> The agents run **on your machine**, so the CLIs you reference (`claude`,
> `codex`, `gemini`, `cursor-agent`, …) must be installed and on your `PATH`.
> Start by recruiting **Claude** with the launch command `claude`.

### Production build

```bash
npm run build        # bundles the UI into dist/
npm start            # serves UI + API from the Node server on :8787
```

## How it maps to the design

| Reference UI                | Here                                             |
| --------------------------- | ------------------------------------------------ |
| Isometric room / floor      | `src/scene/IsoScene.tsx` + `src/scene/iso.ts`    |
| Recruit Agent grid          | `src/ui/RecruitModal.tsx`                        |
| Name / Command / Cwd / Dev  | `src/ui/ConfigPanel.tsx`                         |
| Terminal windows            | `src/ui/TerminalPanel.tsx` (xterm.js)            |
| "Working" status + rings    | server status heuristic → `drawCharacter()`      |
| Spawning the real CLI       | `server/index.mjs` (node-pty / pipe fallback)    |

## Roadmap

- ~~Multiple terminal windows tiled at once.~~ ✅ done
- ~~"Move order" to assign work spots on the map.~~ ✅ done
- ~~RTS camera (pan/zoom) + dispatch tasks from the UI.~~ ✅ done
- Persist recruited agents/config between sessions.
- 3D avatars (three.js) instead of the stylized 2D characters.
- Package as a desktop app (Tauri/Electron) for a true native window.
