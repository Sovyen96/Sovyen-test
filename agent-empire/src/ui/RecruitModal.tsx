import { useMemo, useState } from "react";
import { AGENT_KINDS, type AgentKind } from "../agents/catalog";
import { getThumbnails } from "../scene/thumbnails";
import { useStore } from "../store";

// Renders an agent portrait, preferring the AI image and degrading gracefully
// to the procedural 3D thumbnail and finally the emoji glyph.
function Portrait({ kind, thumb }: { kind: AgentKind; thumb?: string }) {
  const [failed, setFailed] = useState(false);
  if (kind.image && !failed) {
    return <img src={kind.image} alt={kind.name} onError={() => setFailed(true)} />;
  }
  if (thumb) return <img src={thumb} alt={kind.name} />;
  return <span>{kind.glyph}</span>;
}

// "Recruit Agent" — the grid of selectable AI avatars from the reference UI.
export function RecruitModal() {
  const recruiting = useStore((s) => s.recruiting);
  const closeRecruit = useStore((s) => s.closeRecruit);
  const openConfig = useStore((s) => s.openConfig);
  // Generate the 3D character portraits lazily, the first time the modal opens.
  const thumbs = useMemo(() => (recruiting ? getThumbnails() : {}), [recruiting]);
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
              <div className="avatar portrait" style={{ background: `radial-gradient(circle at 50% 35%, ${k.shade}33, transparent 70%)` }}>
                {/* Prefer the AI portrait; fall back to the procedural 3D thumbnail, then the glyph. */}
                <Portrait kind={k} thumb={thumbs[k.id]} />
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
