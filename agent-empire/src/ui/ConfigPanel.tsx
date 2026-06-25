import { useState } from "react";
import { findKind } from "../agents/catalog";
import { useStore } from "../store";

// Agent configuration form, shown after picking an avatar in the recruit modal.
// Mirrors the reference fields: Name, Launch Command, Working Directory,
// Dev Server, and Split Direction.
export function ConfigPanel() {
  const configFor = useStore((s) => s.configFor);
  const openConfig = useStore((s) => s.openConfig);

  const isNew = !!configFor && configFor.startsWith("new:");
  const kindId = isNew ? configFor!.slice(4) : "";
  const kind = findKind(kindId);

  const [name, setName] = useState(kind?.name ?? "Agent");
  const [command, setCommand] = useState(kind?.defaultCommand ?? "bash");
  const [cwd, setCwd] = useState("~/projects/my-app");
  const [devCommand, setDevCommand] = useState("");
  const [split, setSplit] = useState<"vertical" | "horizontal">("vertical");
  const [busy, setBusy] = useState(false);

  if (!configFor || !isNew) return null;

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: kindId, name, command, cwd, devCommand, split }),
      });
      openConfig(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => openConfig(null)}>
      <div className="modal config" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="modal-title">
            <span
              className="avatar sm"
              style={{ background: `radial-gradient(circle at 35% 30%, ${kind?.color}, ${kind?.shade})` }}
            >
              {kind?.glyph}
            </span>
            Configure {kind?.name}
          </div>
          <button className="close" onClick={() => openConfig(null)}>
            ✕
          </button>
        </header>

        <label className="field">
          <span>👤 Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="field">
          <span>›_ Launch Command</span>
          <input className="mono" value={command} onChange={(e) => setCommand(e.target.value)} />
        </label>

        <label className="field">
          <span>📁 Working Directory</span>
          <input className="mono" value={cwd} onChange={(e) => setCwd(e.target.value)} placeholder="~/projects/my-app" />
        </label>

        <label className="field">
          <span>Dev Server</span>
          <small>Run a second command alongside the main terminal, like a dev server.</small>
          <input className="mono" value={devCommand} onChange={(e) => setDevCommand(e.target.value)} placeholder="bun run dev" />
        </label>

        <div className="field">
          <span>Split Direction</span>
          <div className="seg">
            <button className={split === "vertical" ? "on" : ""} onClick={() => setSplit("vertical")}>
              ▥ Vertical
            </button>
            <button className={split === "horizontal" ? "on" : ""} onClick={() => setSplit("horizontal")}>
              ▤ Horizontal
            </button>
          </div>
        </div>

        <div className="config-actions">
          <button className="save" disabled={busy} onClick={save}>
            {busy ? "Recruiting…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
