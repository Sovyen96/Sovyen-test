import { useEffect, useRef, useState } from "react";
import { socket, SERVER_URL } from "../socket.js";
import { gameState } from "../game/gameState.js";

const RANGE = 4;          // distancia (en tiles) para abrir la llamada
const ICE_DEFAULT = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Elemento <video> que vuelca un MediaStream.
function VideoTile({ stream, muted, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline muted={muted} />
      <span className="video-label">{label}</span>
    </div>
  );
}

export default function ProximityVideo() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [remotes, setRemotes] = useState({}); // id -> MediaStream
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // id -> { pc, remoteSet, candidates }
  const iceRef = useRef(ICE_DEFAULT); // config ICE (STUN/TURN) del servidor

  // Volcado del stream local al <video>.
  useEffect(() => {
    if (localRef.current && localStreamRef.current) {
      localRef.current.srcObject = localStreamRef.current;
    }
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const peers = peersRef.current;

    const setRemote = (id, stream) =>
      setRemotes((r) => ({ ...r, [id]: stream }));
    const dropRemote = (id) =>
      setRemotes((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });

    const closePeer = (id) => {
      const entry = peers.get(id);
      if (entry) {
        try { entry.pc.close(); } catch { /* noop */ }
        peers.delete(id);
        dropRemote(id);
      }
    };

    const createPeer = async (id, initiator) => {
      const pc = new RTCPeerConnection(iceRef.current);
      const entry = { pc, remoteSet: false, candidates: [] };
      peers.set(id, entry);

      localStreamRef.current
        .getTracks()
        .forEach((t) => pc.addTrack(t, localStreamRef.current));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("rtc-signal", { to: id, data: { candidate: e.candidate } });
        }
      };
      pc.ontrack = (e) => setRemote(id, e.streams[0]);
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          closePeer(id);
        }
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("rtc-signal", { to: id, data: { sdp: pc.localDescription } });
      }
      return entry;
    };

    // Señalización entrante.
    const onSignal = async ({ from, data }) => {
      let entry = peers.get(from);
      if (!entry) entry = await createPeer(from, false);
      const { pc } = entry;

      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp);
        entry.remoteSet = true;
        for (const c of entry.candidates) {
          try { await pc.addIceCandidate(c); } catch { /* noop */ }
        }
        entry.candidates = [];
        if (data.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("rtc-signal", { to: from, data: { sdp: pc.localDescription } });
        }
      } else if (data.candidate) {
        if (entry.remoteSet) {
          try { await pc.addIceCandidate(data.candidate); } catch { /* noop */ }
        } else {
          entry.candidates.push(data.candidate);
        }
      }
    };

    // Comprueba quién está cerca y abre/cierra conexiones.
    const checkProximity = () => {
      const me = gameState.myId;
      const meP = me && gameState.players.get(me);
      if (!meP) return;

      const near = new Set();
      for (const [id, p] of gameState.players) {
        if (id === me) continue;
        const d = Math.hypot(p.tx - meP.tx, p.ty - meP.ty);
        if (d <= RANGE) near.add(id);
      }

      // Conectar con los nuevos (el id menor inicia la oferta).
      for (const id of near) {
        if (!peers.has(id) && me < id) createPeer(id, true);
      }
      // Cerrar con los que ya no están cerca o se han ido.
      for (const id of [...peers.keys()]) {
        if (!near.has(id) || !gameState.players.has(id)) closePeer(id);
      }
    };

    // Carga la config ICE (STUN/TURN) y luego pide cámara y micrófono.
    (async () => {
      try {
        const res = await fetch(`${SERVER_URL}/rtc-config`);
        if (res.ok) iceRef.current = await res.json();
      } catch { /* se usa la config STUN por defecto */ }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setCamOn(false);
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
      } catch {
        setError("No se pudo acceder a la cámara/micrófono.");
        setActive(false);
      }
    })();

    socket.on("rtc-signal", onSignal);
    const interval = setInterval(checkProximity, 800);

    return () => {
      cancelled = true;
      clearInterval(interval);
      socket.off("rtc-signal", onSignal);
      for (const id of [...peers.keys()]) closePeer(id);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setRemotes({});
    };
  }, [active]);

  const toggleMic = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const on = !micOn;
    s.getAudioTracks().forEach((t) => (t.enabled = on));
    setMicOn(on);
  };
  const toggleCam = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const on = !camOn;
    s.getVideoTracks().forEach((t) => (t.enabled = on));
    setCamOn(on);
  };

  if (!active) {
    return (
      <div className="rtc-launch">
        <button onClick={() => { setError(""); setActive(true); }}>
          🎙️ Activar voz/vídeo por proximidad
        </button>
        {error && <p className="rtc-error">{error}</p>}
      </div>
    );
  }

  const remoteIds = Object.keys(remotes);

  return (
    <div className="rtc-panel">
      <div className="rtc-grid">
        <div className="video-tile">
          <video ref={localRef} autoPlay playsInline muted />
          <span className="video-label">Tú</span>
        </div>
        {remoteIds.map((id) => (
          <VideoTile
            key={id}
            stream={remotes[id]}
            muted={false}
            label={gameState.players.get(id)?.name || "Invitado"}
          />
        ))}
      </div>

      <div className="rtc-controls">
        <button onClick={toggleMic} className={micOn ? "" : "off"}>
          {micOn ? "🎙️" : "🔇"}
        </button>
        <button onClick={toggleCam} className={camOn ? "" : "off"}>
          {camOn ? "📷" : "🚫"}
        </button>
        <button onClick={() => setActive(false)} className="leave">Salir</button>
      </div>
      <p className="rtc-hint">
        {remoteIds.length
          ? `Hablando con ${remoteIds.length} persona(s) cerca`
          : "Acércate a alguien para hablar"}
      </p>
    </div>
  );
}
