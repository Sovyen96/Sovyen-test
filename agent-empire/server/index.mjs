// Agent Empire — backend.
//
// Responsibilities:
//   * Spawn each "recruited" agent as a real OS process inside a pseudo-terminal
//     (node-pty when available, with a graceful child_process fallback).
//   * Stream that terminal's output to the browser over a WebSocket and pipe
//     keystrokes back, so the in-app xterm.js panel is a live shell.
//   * Track a lightweight "working / idle" status per agent (derived from how
//     recently it produced output) so the isometric scene can animate it.
//   * Serve the built front-end in production.
//
// Everything is in-memory and local-first: this is a personal command center,
// not a multi-tenant service.

import express from "express";
import { WebSocketServer } from "ws";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn as childSpawn } from "node:child_process";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const HOME = os.homedir();

// ── Try to load node-pty; fall back to plain pipes if the native build is
// missing. Real interactive TUIs (Claude Code, etc.) need the PTY path, but the
// fallback keeps the app usable for line-based commands and on machines where
// node-pty failed to compile.
let pty = null;
try {
  pty = (await import("node-pty")).default ?? (await import("node-pty"));
  if (!pty.spawn) pty = null;
} catch {
  pty = null;
}
const PTY_MODE = pty ? "pty" : "pipe";
console.log(`[agent-empire] terminal backend: ${PTY_MODE}`);

// ── Agent registry ──────────────────────────────────────────────────────────
/**
 * @typedef {Object} Agent
 * @property {string} id
 * @property {string} kind        catalog id (claude, codex, ...)
 * @property {string} name        display name
 * @property {string} command     launch command
 * @property {string} cwd         working directory
 * @property {string} devCommand  optional second command (dev server)
 * @property {string} status      'idle' | 'working' | 'exited'
 * @property {object} proc        the pty/child process handle
 * @property {object} devProc     optional dev-server handle
 * @property {string[]} buffer    recent output (replayed to late subscribers)
 * @property {number} lastActivity epoch ms of last output
 * @property {number} cols
 * @property {number} rows
 */

/** @type {Map<string, Agent>} */
const agents = new Map();
const sockets = new Set();
const MAX_BUFFER = 4000; // lines of scrollback kept server-side per agent

function expandHome(p) {
  if (!p) return process.cwd();
  if (p === "~") return HOME;
  if (p.startsWith("~/")) return path.join(HOME, p.slice(2));
  return p;
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function publicAgent(a) {
  return {
    id: a.id,
    kind: a.kind,
    name: a.name,
    command: a.command,
    cwd: a.cwd,
    devCommand: a.devCommand,
    status: a.status,
    lastActivity: a.lastActivity,
  };
}

function setStatus(a, status) {
  if (a.status === status) return;
  a.status = status;
  broadcast({ type: "status", id: a.id, status });
}

// An agent flips to "working" the moment it emits output and relaxes back to
// "idle" after a short quiet period — same heuristic that drives the character
// animation in the scene.
setInterval(() => {
  const now = Date.now();
  for (const a of agents.values()) {
    if (a.status === "exited") continue;
    if (now - a.lastActivity > 1200 && a.status !== "idle") setStatus(a, "idle");
  }
}, 600);

function onOutput(a, data) {
  a.lastActivity = Date.now();
  if (a.status === "idle") setStatus(a, "working");
  a.buffer.push(data);
  if (a.buffer.length > MAX_BUFFER) a.buffer.splice(0, a.buffer.length - MAX_BUFFER);
  broadcast({ type: "pty", id: a.id, data });
}

function startProcess(command, cwd, cols, rows) {
  const shell = process.env.SHELL || (process.platform === "win32" ? "powershell.exe" : "bash");
  if (pty) {
    return {
      mode: "pty",
      handle: pty.spawn(shell, ["-lc", command], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: { ...process.env, TERM: "xterm-256color" },
      }),
    };
  }
  // Fallback: pipe-based child process (no real TTY).
  return {
    mode: "pipe",
    handle: childSpawn(shell, ["-lc", command], {
      cwd,
      env: { ...process.env, TERM: "xterm-256color" },
    }),
  };
}

function wireProcess(a, wrapped) {
  const { mode, handle } = wrapped;
  if (mode === "pty") {
    handle.onData((d) => onOutput(a, d));
    handle.onExit(({ exitCode }) => {
      onOutput(a, `\r\n\x1b[90m[process exited (${exitCode})]\x1b[0m\r\n`);
      setStatus(a, "exited");
    });
  } else {
    handle.stdout.on("data", (d) => onOutput(a, d.toString()));
    handle.stderr.on("data", (d) => onOutput(a, d.toString()));
    handle.on("exit", (code) => {
      onOutput(a, `\r\n\x1b[90m[process exited (${code})]\x1b[0m\r\n`);
      setStatus(a, "exited");
    });
  }
  return handle;
}

function writeToProc(wrappedHandle, mode, data) {
  if (!wrappedHandle) return;
  if (mode === "pty") wrappedHandle.write(data);
  else if (wrappedHandle.stdin && wrappedHandle.stdin.writable) wrappedHandle.stdin.write(data);
}

function resizeProc(a, cols, rows) {
  a.cols = cols;
  a.rows = rows;
  if (a.procMode === "pty" && a.proc) {
    try {
      a.proc.resize(cols, rows);
    } catch {
      /* ignore */
    }
  }
}

function createAgent(cfg) {
  const id = nanoid(8);
  const cwd = expandHome(cfg.cwd);
  let safeCwd = cwd;
  if (!fs.existsSync(safeCwd)) safeCwd = HOME; // don't crash on a typo'd path
  const cols = cfg.cols || 100;
  const rows = cfg.rows || 30;

  /** @type {Agent} */
  const a = {
    id,
    kind: cfg.kind || "molly",
    name: cfg.name || cfg.kind || "Agent",
    command: cfg.command || "bash",
    cwd: safeCwd,
    devCommand: cfg.devCommand || "",
    status: "idle",
    lastActivity: Date.now(),
    buffer: [],
    cols,
    rows,
    proc: null,
    procMode: PTY_MODE,
    devProc: null,
  };

  const main = startProcess(a.command, safeCwd, cols, rows);
  a.procMode = main.mode;
  a.proc = wireProcess(a, main);

  if (a.devCommand) {
    const dev = startProcess(a.devCommand, safeCwd, cols, rows);
    a.devMode = dev.mode;
    a.devProc = dev.handle;
    // Dev-server output is folded into the same stream, prefixed for clarity.
    if (dev.mode === "pty") {
      dev.handle.onData((d) => onOutput(a, d));
    } else {
      dev.handle.stdout.on("data", (d) => onOutput(a, d.toString()));
      dev.handle.stderr.on("data", (d) => onOutput(a, d.toString()));
    }
  }

  agents.set(id, a);
  broadcast({ type: "spawn", agent: publicAgent(a) });
  return a;
}

function killAgent(a) {
  try {
    if (a.procMode === "pty") a.proc?.kill();
    else a.proc?.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  try {
    if (a.devProc) {
      if (a.devMode === "pty") a.devProc.kill();
      else a.devProc.kill("SIGTERM");
    }
  } catch {
    /* ignore */
  }
}

// ── HTTP API ────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, terminal: PTY_MODE, home: HOME });
});

app.get("/api/agents", (_req, res) => {
  res.json([...agents.values()].map(publicAgent));
});

app.post("/api/agents", (req, res) => {
  const a = createAgent(req.body || {});
  res.json(publicAgent(a));
});

app.delete("/api/agents/:id", (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  killAgent(a);
  agents.delete(req.params.id);
  broadcast({ type: "despawn", id: a.id });
  res.json({ ok: true });
});

app.post("/api/agents/:id/restart", (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  killAgent(a);
  a.buffer = [];
  const main = startProcess(a.command, a.cwd, a.cols, a.rows);
  a.procMode = main.mode;
  a.proc = wireProcess(a, main);
  setStatus(a, "idle");
  broadcast({ type: "restart", id: a.id });
  res.json(publicAgent(a));
});

// Serve the built front-end in production.
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

const server = http.createServer(app);

// ── WebSocket: live terminal I/O ─────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  sockets.add(ws);
  // Bring the new client up to speed.
  ws.send(JSON.stringify({ type: "hello", terminal: PTY_MODE, agents: [...agents.values()].map(publicAgent) }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const a = msg.id ? agents.get(msg.id) : null;
    switch (msg.type) {
      case "input":
        if (a) writeToProc(a.proc, a.procMode, msg.data);
        break;
      case "resize":
        if (a) resizeProc(a, msg.cols, msg.rows);
        break;
      case "attach":
        // Replay buffered scrollback so the terminal panel shows history.
        if (a) ws.send(JSON.stringify({ type: "replay", id: a.id, data: a.buffer.join("") }));
        break;
      default:
        break;
    }
  });

  ws.on("close", () => sockets.delete(ws));
});

server.listen(PORT, () => {
  console.log(`[agent-empire] http + ws listening on http://localhost:${PORT}`);
  if (!fs.existsSync(distDir)) {
    console.log("[agent-empire] dev mode — run the Vite client with: npm run dev");
  }
});
