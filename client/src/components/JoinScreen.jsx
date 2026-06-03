import { useState } from "react";

const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#9b59b6",
  "#f39c12", "#1abc9c", "#e84393", "#34495e",
];

export default function JoinScreen({ onJoin }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[1]);

  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim() || "Invitado";
    onJoin({ name: clean.slice(0, 16), color });
  };

  return (
    <div className="join-screen">
      <form className="join-card" onSubmit={submit}>
        <h1>🏢 La Oficina de la IA</h1>
        <p className="subtitle">Entra y muévete por la oficina virtual</p>

        <label>Tu nombre</label>
        <input
          autoFocus
          value={name}
          maxLength={16}
          placeholder="p. ej. Manuel"
          onChange={(e) => setName(e.target.value)}
        />

        <label>Color de tu avatar</label>
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={"swatch" + (c === color ? " selected" : "")}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <button type="submit" className="enter-btn">Entrar a la oficina</button>
        <p className="hint">Muévete con WASD o las flechas ⬆️⬇️⬅️➡️</p>
      </form>
    </div>
  );
}
