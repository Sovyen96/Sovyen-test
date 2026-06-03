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
  const [sharing, setSharing] = useState(false);

  const localRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // id -> { pc, remoteSet, candidates }
  const iceRef = useRef(ICE_DEFAULT); // config ICE (STUN/TURN) del servidor
  const screenStreamRef = useRef(null); // stream de pantalla compartida
  const audioCtxRef = useRef(null);     // análisis de voz (indicador "hablando")
  const speakIntervalRef = useRef(null);

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

      // Si estamos compartiendo pantalla, el nuevo peer la recibe ya.
      if (screenStreamRef.current) {
        const st = screenStreamRef.current.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender && st) sender.replaceTrack(st).catch(() => {});
      }

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

    // Detecta cuándo el usuario habla (voz por encima de un umbral, con
    // micro activo) y lo difunde para mostrar el aro verde en el avatar.
    const setupSpeaking = (stream) => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AC();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let speaking = false;
        let lastLoud = 0;
        speakIntervalRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) { const x = (v - 128) / 128; sum += x * x; }
          const rms = Math.sqrt(sum / data.length);
          const track = stream.getAudioTracks()[0];
          const enabled = track && track.enabled;
          if (rms > 0.05 && enabled) lastLoud = Date.now();
          const sp = enabled && Date.now() - lastLoud < 600; // "hangover"
          if (sp !== speaking) {
            speaking = sp;
            socket.emit("speaking", { on: sp });
          }
        }, 150);
      } catch { /* WebAudio no disponible */ }
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
        setupSpeaking(stream);
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
      if (speakIntervalRef.current) clearInterval(speakIntervalRef.current);
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
      socket.emit("speaking", { on: false });
      for (const id of [...peers.keys()]) closePeer(id);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setSharing(false);
      setRemotes({});
    };
  }, [active]);

  const toggleMic = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const on = !micOn;
    s.getAudioTracks().forEach((t) => (t.enabled = on));
    setMicOn(on);
    if (!on) socket.emit("speaking", { on: false });
  };
  const toggleCam = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const on = !camOn;
    s.getVideoTracks().forEach((t) => (t.enabled = on));
    setCamOn(on);
  };

  // Reemplaza la pista de vídeo saliente en todas las conexiones.
  const replaceVideoTrack = (track) => {
    peersRef.current.forEach(({ pc }) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(track).catch(() => {});
    });
  };

  const stopScreen = () => {
    const screen = screenStreamRef.current;
    if (screen) screen.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    const cam = localStreamRef.current ? localStreamRef.current.getVideoTracks()[0] : null;
    replaceVideoTrack(cam || null);
    if (localRef.current) localRef.current.srcObject = localStreamRef.current;
    setSharing(false);
  };

  const startScreen = async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screen;
      const track = screen.getVideoTracks()[0];
      replaceVideoTrack(track);
      if (localRef.current) localRef.current.srcObject = screen;
      track.onended = stopScreen; // botón "Dejar de compartir" del navegador
      setSharing(true);
    } catch {
      /* el usuario canceló el selector de pantalla */
    }
  };

  const toggleScreen = () => (sharing ? stopScreen() : startScreen());

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
          <video ref={localRef} autoPlay playsInline muted className={sharing ? "" : "mirror"} />
          <span className="video-label">{sharing ? "Tú (pantalla)" : "Tú"}</span>
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
        <button onClick={toggleScreen} className={sharing ? "on" : ""} title="Compartir pantalla">
          🖥️
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
