import { AGENT_KINDS } from "../agents/catalog";
import { useStore } from "../store";

// "Recruit Agent" — the grid of selectable AI avatars from the reference UI.
export function RecruitModal() {
  const recruiting = useStore((s) => s.recruiting);
  const closeRecruit = useStore((s) => s.closeRecruit);
  const openConfig = useStore((s) => s.openConfig);
  if (!recruiting) return null;

  return (
    <div className="modal-backdrop" onClick={closeRecruit}>
      <div className="modal recruit" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <div className="modal-title">
              <span className="modal-icon">👥</span> Recruit Agent
            </div>
            <div className="modal-sub">Select an AI to join your team</div>
          </div>
          <button className="close" onClick={closeRecruit}>
            ✕
          </button>
        </header>
        <div className="recruit-grid">
          {AGENT_KINDS.map((k) => (
            <button key={k.id} className="recruit-card" onClick={() => openConfig(`new:${k.id}`)}>
              <div className="avatar" style={{ background: `radial-gradient(circle at 35% 30%, ${k.color}, ${k.shade})` }}>
                <span>{k.glyph}</span>
              </div>
              <div className="recruit-name" style={{ color: k.color }}>
                {k.name}
              </div>
              <div className="recruit-role">{k.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
