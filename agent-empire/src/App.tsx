import { useEffect } from "react";
import { useStore } from "./store";
import { IsoScene } from "./scene/IsoScene";
import { Hud } from "./ui/Hud";
import { RecruitModal } from "./ui/RecruitModal";
import { ConfigPanel } from "./ui/ConfigPanel";
import { TerminalDeck } from "./ui/TerminalPanel";

export default function App() {
  const init = useStore((s) => s.init);
  const agentCount = useStore((s) => Object.keys(s.agents).length);
  const openRecruit = useStore((s) => s.openRecruit);

  useEffect(() => {
    init();
  }, [init]);

  // Global shortcuts: Esc dismisses overlays / clears selection; R recruits.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const s = useStore.getState();
      if (e.key === "Escape") {
        if (s.recruiting) s.closeRecruit();
        else if (s.configFor) s.openConfig(null);
        else s.select(null);
      } else if (e.key.toLowerCase() === "r") {
        s.openRecruit();
      } else if (e.key.toLowerCase() === "t") {
        s.tileTerminals();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <IsoScene />
      <Hud />
      {agentCount === 0 && (
        <div className="empty-hint">
          <h1>Your war room is empty</h1>
          <p>Recruit AI agents and watch them work side by side, Age-of-Empires style.</p>
          <button onClick={openRecruit}>＋ Recruit your first agent</button>
        </div>
      )}
      <div className="controls-hint">
        <span>🖱️ click select</span>
        <span>·</span>
        <span>right-click move</span>
        <span>·</span>
        <span>dbl-click terminal</span>
        <span>·</span>
        <span>wheel zoom</span>
        <span>·</span>
        <span>shift/mid-drag pan</span>
      </div>
      <RecruitModal />
      <ConfigPanel />
      <TerminalDeck />
    </div>
  );
}
