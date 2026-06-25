import { useEffect } from "react";
import { useStore } from "./store";
import { IsoScene } from "./scene/IsoScene";
import { Hud } from "./ui/Hud";
import { RecruitModal } from "./ui/RecruitModal";
import { ConfigPanel } from "./ui/ConfigPanel";
import { TerminalPanel } from "./ui/TerminalPanel";

export default function App() {
  const init = useStore((s) => s.init);
  const agentCount = useStore((s) => Object.keys(s.agents).length);
  const openRecruit = useStore((s) => s.openRecruit);

  useEffect(() => {
    init();
  }, [init]);

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
      <RecruitModal />
      <ConfigPanel />
      <TerminalPanel />
    </div>
  );
}
