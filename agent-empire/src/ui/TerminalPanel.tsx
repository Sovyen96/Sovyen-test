import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useStore, type TermWindow } from "../store";
import { socket } from "../net/socket";
import { findKind } from "../agents/catalog";

// Renders every open terminal window. Each one is an independent, draggable,
// resizable panel bound to its agent's live PTY — so you can watch and drive
// many agents at the same time (the reference's "many windows" view).
export function TerminalDeck() {
  const terminals = useStore((s) => s.terminals);
  const wins = Object.values(terminals).sort((a, b) => a.z - b.z);
  return (
    <>
      {wins.map((w) => (
        <TerminalWindow key={w.id} win={w} />
      ))}
    </>
  );
}

function TerminalWindow({ win }: { win: TermWindow }) {
  const agent = useStore((s) => s.agents[win.id]);
  const focusTerminal = useStore((s) => s.focusTerminal);
  const closeTerminal = useStore((s) => s.closeTerminal);
  const toggleMinimize = useStore((s) => s.toggleMinimize);
  const moveTerminal = useStore((s) => s.moveTerminal);
  const resizeTerminal = useStore((s) => s.resizeTerminal);
  const restartAgent = useStore((s) => s.restartAgent);
  const removeAgent = useStore((s) => s.removeAgent);
  const dispatchTask = useStore((s) => s.dispatchTask);

  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [task, setTask] = useState("");

  // ── Mount the xterm once per agent ──
  useEffect(() => {
    if (win.min || !hostRef.current) return;
    const term = new Terminal({
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 12.5,
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
    termRef.current = term;
    fitRef.current = fit;
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
      socket.send({ type: "resize", id: win.id, cols: term.cols, rows: term.rows });
    };
    const onData = term.onData((d) => socket.send({ type: "input", id: win.id, data: d }));
    const off = socket.on((msg) => {
      if (msg.id !== win.id) return;
      if (msg.type === "pty" || msg.type === "replay") term.write(msg.data);
      if (msg.type === "restart") term.clear();
    });
    socket.send({ type: "attach", id: win.id });
    sendResize();

    return () => {
      onData.dispose();
      off();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.id, win.min]);

  // Refit whenever the window is resized.
  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;
    try {
      fit.fit();
      socket.send({ type: "resize", id: win.id, cols: term.cols, rows: term.rows });
    } catch {
      /* ignore */
    }
  }, [win.w, win.h, win.id]);

  // ── Drag the titlebar ──
  function startDrag(e: React.PointerEvent) {
    focusTerminal(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = win.x;
    const oy = win.y;
    const onMove = (ev: PointerEvent) => {
      moveTerminal(win.id, Math.max(0, ox + ev.clientX - startX), Math.max(60, oy + ev.clientY - startY));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ── Resize handle ──
  function startResize(e: React.PointerEvent) {
    e.stopPropagation();
    focusTerminal(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const ow = win.w;
    const oh = win.h;
    const onMove = (ev: PointerEvent) => {
      resizeTerminal(win.id, ow + ev.clientX - startX, oh + ev.clientY - startY);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (!agent) return null;
  const kind = findKind(agent.kind);

  const style: React.CSSProperties = {
    left: win.x,
    top: win.y,
    width: win.w,
    height: win.min ? undefined : win.h,
    zIndex: win.z,
  };

  return (
    <div className={`terminal-window${win.min ? " min" : ""}`} style={style} onPointerDown={() => focusTerminal(win.id)}>
      <div className="terminal-titlebar" onPointerDown={startDrag}>
        <div className="tw-dots">
          <span className="d red" onPointerDown={(e) => e.stopPropagation()} onClick={() => closeTerminal(win.id)} />
          <span className="d yellow" onPointerDown={(e) => e.stopPropagation()} onClick={() => toggleMinimize(win.id)} />
          <span className="d green" />
        </div>
        <div className="tw-title">
          <span>{kind?.glyph}</span> {agent.name}
          <span className={`tw-badge s-${agent.status}`}>{agent.status}</span>
          <span className="tw-cwd">{agent.cwd}</span>
        </div>
        <div className="tw-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => restartAgent(win.id)} title="Restart">
            ↻
          </button>
          <button
            onClick={() => {
              removeAgent(win.id);
            }}
            title="Disband"
          >
            🗑
          </button>
          <button onClick={() => closeTerminal(win.id)} title="Close">
            ✕
          </button>
        </div>
      </div>

      {!win.min && (
        <>
          <div className="terminal-host" ref={hostRef} />
          <form
            className="terminal-task"
            onSubmit={(e) => {
              e.preventDefault();
              dispatchTask(win.id, task);
              setTask("");
            }}
          >
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={`Dispatch a task to ${agent.name}…`}
            />
            <button type="submit">Send ⏎</button>
          </form>
          <div className="terminal-resize" onPointerDown={startResize} />
        </>
      )}
    </div>
  );
}
