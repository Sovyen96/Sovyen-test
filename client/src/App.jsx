import { useEffect, useState } from "react";
import JoinScreen from "./components/JoinScreen.jsx";
import Chat from "./components/Chat.jsx";
import AvatarPanel from "./components/AvatarPanel.jsx";
import ProximityVideo from "./components/ProximityVideo.jsx";
import Whiteboard from "./components/Whiteboard.jsx";
import OfficeCanvas from "./game/OfficeCanvas.jsx";
import { socket } from "./socket.js";
import { EMOTES } from "./game/appearance.js";
import { saveProfile } from "./game/profile.js";

// Botón táctil que simula la pulsación de una tecla de dirección.
function DPadButton({ code, children }) {
  const press = (e) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent("keydown", { code }));
  };
  const release = (e) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent("keyup", { code }));
  };
  return (
    <button
      className="dpad-btn"
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={release}
      onTouchStart={press}
      onTouchEnd={release}
    >
      {children}
    </button>
  );
}

// Modal para reeditar el avatar dentro de la oficina.
function EditModal({ initial, onSave, onClose }) {
  const [draft, setDraft] = useState(initial);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Personaliza tu avatar</h2>
        <AvatarPanel value={draft} onChange={setDraft} />
        <div className="join-actions">
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="enter-btn" onClick={() => onSave(draft)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(null);
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [online, setOnline] = useState(1);
  const [board, setBoard] = useState(false);

  // Mantiene el contador de gente en línea.
  useEffect(() => {
    if (!me) return;
    const onInit = ({ players }) => setOnline(players.length);
    const onJoined = () => setOnline((n) => n + 1);
    const onLeft = () => setOnline((n) => Math.max(1, n - 1));
    socket.on("init", onInit);
    socket.on("player-joined", onJoined);
    socket.on("player-left", onLeft);
    return () => {
      socket.off("init", onInit);
      socket.off("player-joined", onJoined);
      socket.off("player-left", onLeft);
    };
  }, [me]);

  if (!me) return <JoinScreen onJoin={setMe} />;

  const saveAppearance = (next) => {
    const updated = { ...me, ...next };
    setMe(updated);
    saveProfile(updated);
    // Avisa al servidor; el resto (y nuestro propio avatar) se actualizan en vivo.
    socket.emit("update", next);
    setEditing(false);
  };

  return (
    <div className="game-root">
      <OfficeCanvas me={me} onPrompt={setPrompt} onOpenBoard={() => setBoard(true)} />

      <div className="hud-top">
        <span className="badge">🏢 La Oficina de la IA · 🟢 {online} en línea</span>
        <button className="edit-btn" onClick={() => setEditing(true)}>✏️ Editar avatar</button>
        <button className="edit-btn" onClick={() => setBoard(true)}>🖌️ Pizarra</button>
      </div>

      <ProximityVideo />

      {prompt && <div className="interact-prompt">{prompt}</div>}

      <div className="emote-bar">
        {EMOTES.map((emoji, i) => (
          <button key={emoji} onClick={() => socket.emit("emote", { emoji })} title={`Tecla ${i + 1}`}>
            {emoji}
          </button>
        ))}
      </div>

      <div className="dpad">
        <div />
        <DPadButton code="ArrowUp">⬆️</DPadButton>
        <div />
        <DPadButton code="ArrowLeft">⬅️</DPadButton>
        <DPadButton code="ArrowDown">⬇️</DPadButton>
        <DPadButton code="ArrowRight">➡️</DPadButton>
      </div>

      <Chat />

      <Whiteboard open={board} onClose={() => setBoard(false)} />

      {editing && (
        <EditModal
          initial={me}
          onSave={saveAppearance}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
