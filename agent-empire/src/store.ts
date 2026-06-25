import { create } from "zustand";
import { socket } from "./net/socket";

export type AgentStatus = "idle" | "working" | "exited";

export type Agent = {
  id: string;
  kind: string;
  name: string;
  command: string;
  cwd: string;
  devCommand: string;
  status: AgentStatus;
  lastActivity: number;
  // ── Scene-only state (cosmetic, lives client-side) ──
  x: number; // world tile coords (float)
  y: number;
  tx: number; // move/wander target
  ty: number;
  ordered: boolean; // true while heading to a user-issued move order
  facing: number; // -1 left, 1 right
  bob: number; // animation phase
};

export type TermWindow = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
};

type State = {
  agents: Record<string, Agent>;
  selectedId: string | null;
  recruiting: boolean;
  configFor: string | null; // agent id whose config panel is open
  terminals: Record<string, TermWindow>; // open terminal windows by agent id
  zCounter: number;
  projectName: string;
  terminalBackend: string;
  pingMarker: { x: number; y: number; t: number } | null; // move-order ground ping

  // actions
  init: () => void;
  select: (id: string | null) => void;
  openRecruit: () => void;
  closeRecruit: () => void;
  openConfig: (id: string | null) => void;
  openTerminal: (id: string) => void;
  closeTerminal: (id: string) => void;
  focusTerminal: (id: string) => void;
  toggleMinimize: (id: string) => void;
  moveTerminal: (id: string, x: number, y: number) => void;
  resizeTerminal: (id: string, w: number, h: number) => void;
  tileTerminals: () => void;
  openAllTerminals: () => void;
  dispatchTask: (id: string, text: string) => void;
  issueMove: (id: string, gx: number, gy: number) => void;
  removeAgent: (id: string) => Promise<void>;
  restartAgent: (id: string) => Promise<void>;
};

let spawnSlot = 0;
function nextSpawnPoint() {
  // Spread newcomers around the floor in a loose ring.
  const angle = (spawnSlot++ * 137.5 * Math.PI) / 180;
  const r = 1.5 + (spawnSlot % 4) * 0.8;
  return { x: 4 + Math.cos(angle) * r, y: 4 + Math.sin(angle) * r };
}

function attach(raw: any): Agent {
  const p = nextSpawnPoint();
  return {
    id: raw.id,
    kind: raw.kind,
    name: raw.name,
    command: raw.command,
    cwd: raw.cwd,
    devCommand: raw.devCommand || "",
    status: raw.status || "idle",
    lastActivity: raw.lastActivity || Date.now(),
    x: p.x,
    y: p.y,
    tx: p.x,
    ty: p.y,
    ordered: false,
    facing: 1,
    bob: Math.random() * Math.PI * 2,
  };
}

let winCascade = 0;
function cascadeWindow(z: number): TermWindow {
  const i = winCascade++ % 6;
  return {
    id: "",
    x: 120 + i * 36,
    y: 110 + i * 30,
    w: 620,
    h: 380,
    z,
    min: false,
  };
}

export const useStore = create<State>((set, get) => ({
  agents: {},
  selectedId: null,
  recruiting: false,
  configFor: null,
  terminals: {},
  zCounter: 10,
  projectName: "App Development",
  terminalBackend: "",
  pingMarker: null,

  init: () => {
    socket.connect();
    socket.on((msg) => {
      const s = get();
      switch (msg.type) {
        case "hello": {
          const next: Record<string, Agent> = {};
          for (const a of msg.agents) next[a.id] = attach(a);
          set({ agents: next, terminalBackend: msg.terminal });
          break;
        }
        case "spawn": {
          set({ agents: { ...s.agents, [msg.agent.id]: attach(msg.agent) } });
          break;
        }
        case "despawn": {
          const next = { ...s.agents };
          delete next[msg.id];
          const terms = { ...s.terminals };
          delete terms[msg.id];
          set({
            agents: next,
            terminals: terms,
            selectedId: s.selectedId === msg.id ? null : s.selectedId,
          });
          break;
        }
        case "status": {
          const a = s.agents[msg.id];
          if (a) set({ agents: { ...s.agents, [msg.id]: { ...a, status: msg.status, lastActivity: Date.now() } } });
          break;
        }
        case "pty": {
          const a = s.agents[msg.id];
          if (a) a.lastActivity = Date.now();
          break;
        }
        default:
          break;
      }
    });
    fetch("/api/agents")
      .then((r) => r.json())
      .then((list: any[]) => {
        const cur = get().agents;
        const next = { ...cur };
        for (const a of list) if (!next[a.id]) next[a.id] = attach(a);
        set({ agents: next });
      })
      .catch(() => {});
  },

  select: (id) => set({ selectedId: id }),
  openRecruit: () => set({ recruiting: true }),
  closeRecruit: () => set({ recruiting: false }),
  openConfig: (id) => set({ configFor: id, recruiting: false }),

  openTerminal: (id) => {
    const s = get();
    const z = s.zCounter + 1;
    if (s.terminals[id]) {
      set({ terminals: { ...s.terminals, [id]: { ...s.terminals[id], z, min: false } }, zCounter: z, selectedId: id });
      return;
    }
    const win = cascadeWindow(z);
    win.id = id;
    set({ terminals: { ...s.terminals, [id]: win }, zCounter: z, selectedId: id });
  },
  closeTerminal: (id) => {
    const s = get();
    const terms = { ...s.terminals };
    delete terms[id];
    set({ terminals: terms });
  },
  focusTerminal: (id) => {
    const s = get();
    const z = s.zCounter + 1;
    if (!s.terminals[id]) return;
    set({ terminals: { ...s.terminals, [id]: { ...s.terminals[id], z } }, zCounter: z, selectedId: id });
  },
  toggleMinimize: (id) => {
    const s = get();
    const w = s.terminals[id];
    if (!w) return;
    set({ terminals: { ...s.terminals, [id]: { ...w, min: !w.min } } });
  },
  moveTerminal: (id, x, y) => {
    const s = get();
    const w = s.terminals[id];
    if (!w) return;
    set({ terminals: { ...s.terminals, [id]: { ...w, x, y } } });
  },
  resizeTerminal: (id, w, h) => {
    const s = get();
    const win = s.terminals[id];
    if (!win) return;
    set({ terminals: { ...s.terminals, [id]: { ...win, w: Math.max(320, w), h: Math.max(200, h) } } });
  },
  tileTerminals: () => {
    const s = get();
    const ids = Object.keys(s.terminals);
    if (!ids.length) return;
    const cols = Math.ceil(Math.sqrt(ids.length));
    const rows = Math.ceil(ids.length / cols);
    const pad = 14;
    const top = 80;
    const W = window.innerWidth - pad * 2;
    const H = window.innerHeight - top - pad;
    const cw = (W - pad * (cols - 1)) / cols;
    const ch = (H - pad * (rows - 1)) / rows;
    const terms = { ...s.terminals };
    ids.forEach((id, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      terms[id] = {
        ...terms[id],
        min: false,
        x: pad + c * (cw + pad),
        y: top + r * (ch + pad),
        w: cw,
        h: ch,
      };
    });
    set({ terminals: terms });
  },
  openAllTerminals: () => {
    const s = get();
    let z = s.zCounter;
    const terms = { ...s.terminals };
    for (const id of Object.keys(s.agents)) {
      if (!terms[id]) {
        z += 1;
        const win = cascadeWindow(z);
        win.id = id;
        terms[id] = win;
      }
    }
    set({ terminals: terms, zCounter: z });
    // Tile right after opening.
    setTimeout(() => get().tileTerminals(), 0);
  },

  dispatchTask: (id, text) => {
    if (!text.trim()) return;
    socket.send({ type: "input", id, data: text + "\r" });
  },

  issueMove: (id, gx, gy) => {
    const s = get();
    const a = s.agents[id];
    if (!a) return;
    a.tx = gx;
    a.ty = gy;
    a.ordered = true;
    set({ pingMarker: { x: gx, y: gy, t: Date.now() } });
  },

  removeAgent: async (id) => {
    await fetch(`/api/agents/${id}`, { method: "DELETE" }).catch(() => {});
    get().closeTerminal(id);
  },
  restartAgent: async (id) => {
    await fetch(`/api/agents/${id}/restart`, { method: "POST" }).catch(() => {});
  },
}));
