import { useEffect, useRef, useState } from "react";
import { socket } from "../socket.js";

export default function Chat() {
  const [text, setText] = useState("");
  const [log, setLog] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    const onChat = (msg) => {
      setLog((prev) => [...prev.slice(-40), { ...msg, t: Date.now() }]);
    };
    socket.on("chat", onChat);
    return () => socket.off("chat", onChat);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const send = (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    socket.emit("chat", { text: clean.slice(0, 140) });
    setText("");
  };

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef}>
        {log.map((m, i) => (
          <div className="chat-line" key={i}>
            <span className="chat-name">{m.name}:</span> {m.text}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={send}>
        <input
          value={text}
          maxLength={140}
          placeholder="Escribe un mensaje y pulsa Enter…"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
