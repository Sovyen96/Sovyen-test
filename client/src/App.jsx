import { useState } from "react";
import JoinScreen from "./components/JoinScreen.jsx";
import Chat from "./components/Chat.jsx";
import OfficeCanvas from "./game/OfficeCanvas.jsx";

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

export default function App() {
  const [me, setMe] = useState(null);

  if (!me) return <JoinScreen onJoin={setMe} />;

  return (
    <div className="game-root">
      <OfficeCanvas me={me} />

      <div className="hud-top">
        <span className="badge">🏢 La Oficina de la IA</span>
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
    </div>
  );
}
