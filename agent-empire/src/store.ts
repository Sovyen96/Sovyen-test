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
  tx: number; // wander target
  ty: number;
  facing: number; // -1 left, 1 right
  bob: number; // animation phase
};

type UIView = "scene" | null;

type State = {
  agents: Record<string, Agent>;
  selectedId: string | null;
  recruiting: boolean;
  configFor: string | null; // agent id whose config panel is open
  terminalOpen: boolean;
  projectName: string;
  terminalBackend: string;

  // actions
  init: () => void;
  select: (id: string | null) => void;
  openRecruit: () => void;
  closeRecruit: () => void;
  openConfig: (id: string | null) => void;
  openTerminal: (id: string) => void;
  closeTerminal: () => void;
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
    facing: 1,
    bob: Math.random() * Math.PI * 2,
  };
}

export const useStore = create<State>((set, get) => ({
  agents: {},
  selectedId: null,
  recruiting: false,
  configFor: null,
  terminalOpen: false,
  projectName: "App Development",
  terminalBackend: "",

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
          set({
            agents: next,
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
          // Keep lastActivity fresh so the scene animates even between status flips.
          const a = s.agents[msg.id];
          if (a) a.lastActivity = Date.now();
          break;
        }
        default:
          break;
      }
    });
    // Load any agents that already exist (e.g. after a UI reload).
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
  openTerminal: (id) => set({ terminalOpen: true, selectedId: id }),
  closeTerminal: () => set({ terminalOpen: false }),

  removeAgent: async (id) => {
    await fetch(`/api/agents/${id}`, { method: "DELETE" }).catch(() => {});
  },
  restartAgent: async (id) => {
    await fetch(`/api/agents/${id}/restart`, { method: "POST" }).catch(() => {});
  },
}));
