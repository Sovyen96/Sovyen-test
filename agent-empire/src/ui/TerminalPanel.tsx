import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useStore } from "../store";
import { socket } from "../net/socket";
import { findKind } from "../agents/catalog";

// A live terminal bound to the selected agent's PTY over the WebSocket.
export function TerminalPanel() {
  const open = useStore((s) => s.terminalOpen);
  const id = useStore((s) => s.selectedId);
  const agent = useStore((s) => (id ? s.agents[id] : null));
  const closeTerminal = useStore((s) => s.closeTerminal);
  const restartAgent = useStore((s) => s.restartAgent);
  const removeAgent = useStore((s) => s.removeAgent);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !id || !hostRef.current) return;
    const term = new Terminal({
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: "#0c0a16",
        foreground: "#e7e3f5",
        cursor: "#8ce68c",
        selectionBackground: "rgba(150,120,230,0.3)",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    try {
      fit.fit();
    } catch {
      /* ignore */
    }

    const sendResize = () => {
      try {
        fit.fit();
      } catch {
        return;
      }
      socket.send({ type: "resize", id, cols: term.cols, rows: term.rows });
    };

    // Stream keystrokes to the process.
    const onData = term.onData((d) => socket.send({ type: "input", id, data: d }));

    // Receive output for this agent.
    const off = socket.on((msg) => {
      if (msg.id !== id) return;
      if (msg.type === "pty" || msg.type === "replay") term.write(msg.data);
      if (msg.type === "restart") term.clear();
    });

    // Ask the server to replay scrollback, then sync size.
    socket.send({ type: "attach", id });
    sendResize();

    const ro = new ResizeObserver(sendResize);
    ro.observe(hostRef.current);

    return () => {
      onData.dispose();
      off();
      ro.disconnect();
      term.dispose();
    };
  }, [open, id]);

  if (!open || !agent) return null;
  const kind = findKind(agent.kind);

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <div className="tw-dots">
          <span className="d red" onClick={closeTerminal} />
          <span className="d yellow" />
          <span className="d green" />
        </div>
        <div className="tw-title">
          <span>{kind?.glyph}</span> {agent.name}
          <span className="tw-cwd">{agent.cwd}</span>
        </div>
        <div className="tw-actions">
          <button onClick={() => restartAgent(agent.id)} title="Restart">
            ↻
          </button>
          <button
            onClick={() => {
              removeAgent(agent.id);
              closeTerminal();
            }}
            title="Disband"
          >
            🗑
          </button>
          <button onClick={closeTerminal} title="Close">
            ✕
          </button>
        </div>
      </div>
      <div className="terminal-host" ref={hostRef} />
    </div>
  );
}
