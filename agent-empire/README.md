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
  working directory and optional dev server (mirrors the reference UI).
- **Isometric scene** — each agent is a character that wanders the floor and
  shows a green **Working** ring when its process is producing output.
- **Real terminals** — double-click an agent (or "Open terminal") to attach a
  live [xterm.js](https://xtermjs.org/) terminal to its actual process. Type
  into it, restart it, or disband it.
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

- Multiple terminal windows tiled at once (the reference shows several open).
- Per-agent task queue + "move order" to assign work spots on the map.
- 3D avatars (three.js) instead of the stylized 2D characters.
- Package as a desktop app (Tauri/Electron) for a true native window.
