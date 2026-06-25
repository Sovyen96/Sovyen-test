import { useStore } from "../store";
import { findKind } from "../agents/catalog";

// The game-style HUD: a top resource bar (agent metrics), a left tool rail,
// and a contextual action bar for the selected agent.
export function Hud() {
  const agents = useStore((s) => s.agents);
  const projectName = useStore((s) => s.projectName);
  const backend = useStore((s) => s.terminalBackend);
  const openRecruit = useStore((s) => s.openRecruit);
  const selectedId = useStore((s) => s.selectedId);
  const openTerminal = useStore((s) => s.openTerminal);
  const restartAgent = useStore((s) => s.restartAgent);
  const removeAgent = useStore((s) => s.removeAgent);
  const tileTerminals = useStore((s) => s.tileTerminals);
  const openAllTerminals = useStore((s) => s.openAllTerminals);
  const openCount = useStore((s) => Object.keys(s.terminals).length);

  const list = Object.values(agents);
  const working = list.filter((a) => a.status === "working").length;
  const selected = selectedId ? agents[selectedId] : null;
  const selKind = selected ? findKind(selected.kind) : null;

  return (
    <>
      {/* Top resource bar */}
      <div className="hud-top">
        <div className="hud-project">
          <span className="dot" /> {projectName}
        </div>
        <div className="hud-stats">
          <div className="stat">
            <span className="stat-num">{list.length}</span>
            <span className="stat-label">agents</span>
          </div>
          <div className="stat">
            <span className="stat-num accent-green">{working}</span>
            <span className="stat-label">working</span>
          </div>
          <div className="stat">
            <span className="stat-num accent-dim">{backend === "pty" ? "PTY" : backend ? "pipe" : "…"}</span>
            <span className="stat-label">terminal</span>
          </div>
        </div>
        <div className="hud-win-controls">
          <button className="ghost-btn" onClick={openAllTerminals} disabled={list.length === 0} title="Open every agent's terminal">
            ▦ Open all
          </button>
          <button className="ghost-btn" onClick={tileTerminals} disabled={openCount === 0} title="Tile open terminals">
            ⊞ Tile{openCount ? ` (${openCount})` : ""}
          </button>
        </div>
        <button className="recruit-btn" onClick={openRecruit}>
          ＋ Recruit Agent
        </button>
      </div>

      {/* Left tool rail */}
      <div className="hud-rail">
        <button title="Recruit" onClick={openRecruit}>
          👥
        </button>
        <button title="Workspace">🏠</button>
        <button title="Agents">🤖</button>
        <button title="Logs">📜</button>
        <button title="Settings">⚙️</button>
      </div>

      {/* Selection action bar */}
      {selected && (
        <div className="hud-select">
          <span
            className="avatar sm"
            style={{ background: `radial-gradient(circle at 35% 30%, ${selKind?.color}, ${selKind?.shade})` }}
          >
            {selKind?.glyph}
          </span>
          <div className="sel-meta">
            <div className="sel-name">{selected.name}</div>
            <div className={`sel-status s-${selected.status}`}>{selected.status}</div>
          </div>
          <div className="sel-actions">
            <button onClick={() => openTerminal(selected.id)}>Open terminal</button>
            <button onClick={() => restartAgent(selected.id)}>Restart</button>
            <button className="danger" onClick={() => removeAgent(selected.id)}>
              Disband
            </button>
          </div>
        </div>
      )}
    </>
  );
}
