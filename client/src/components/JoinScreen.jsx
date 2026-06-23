import { useState } from "react";
import AvatarPanel from "./AvatarPanel.jsx";
import { randomAppearance, normalizeAppearance } from "../game/appearance.js";
import { loadProfile, saveProfile } from "../game/profile.js";

export default function JoinScreen({ onJoin }) {
  const saved = loadProfile();
  const [name, setName] = useState(saved?.name || "");
  const [appearance, setAppearance] = useState(() =>
    saved ? normalizeAppearance(saved) : randomAppearance()
  );

  const submit = (e) => {
    e.preventDefault();
    const clean = (name.trim() || "Invitado").slice(0, 16);
    const profile = { name: clean, ...appearance };
    saveProfile(profile);
    onJoin(profile);
  };

  return (
    <div className="join-screen">
      <form className="join-card wide" onSubmit={submit}>
        <h1>🏢 La Oficina de la IA</h1>
        <p className="subtitle">Crea tu avatar y entra a la oficina virtual</p>

        <AvatarPanel value={appearance} onChange={setAppearance} />

        <label>Tu nombre</label>
        <input
          autoFocus
          value={name}
          maxLength={16}
          placeholder="p. ej. Manuel"
          onChange={(e) => setName(e.target.value)}
        />

        <div className="join-actions">
          <button type="button" className="ghost-btn" onClick={() => setAppearance(randomAppearance())}>
            🎲 Aleatorio
          </button>
          <button type="submit" className="enter-btn">Entrar a la oficina</button>
        </div>
        <p className="hint">Muévete con WASD o las flechas ⬆️⬇️⬅️➡️</p>
      </form>
    </div>
  );
}
