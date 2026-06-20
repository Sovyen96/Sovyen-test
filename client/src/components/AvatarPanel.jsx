import { useEffect, useRef, useState } from "react";
import {
  SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, HAIR_STYLES, ACCESSORIES,
} from "../game/appearance.js";
import { drawTrainer } from "../game/sprites.js";

// Vista previa del avatar; al hacer clic gira para verlo desde otro ángulo.
function AvatarPreview({ appearance }) {
  const ref = useRef(null);
  const [dir, setDir] = useState("down");

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = 130 * dpr;
    c.height = 130 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 130, 130);

    // Suelo sutil.
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(65, 100, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sprite pixel-art (mismo render que el juego).
    ctx.imageSmoothingEnabled = false;
    drawTrainer(ctx, appearance, dir, 0, 65, 92, 5);
  }, [appearance, dir]);

  const dirs = ["down", "left", "up", "right"];
  const turn = () => setDir((d) => dirs[(dirs.indexOf(d) + 1) % 4]);

  return (
    <div className="avatar-preview-wrap">
      <canvas ref={ref} style={{ width: 130, height: 130 }} onClick={turn} />
      <button type="button" className="turn-btn" onClick={turn}>↻ Girar</button>
    </div>
  );
}

function Swatches({ values, current, onPick }) {
  return (
    <div className="swatches">
      {values.map((c) => (
        <button
          type="button"
          key={c}
          className={"swatch" + (c === current ? " selected" : "")}
          style={{ background: c }}
          onClick={() => onPick(c)}
          aria-label={c}
        />
      ))}
    </div>
  );
}

/** Editor de apariencia controlado: recibe `value` y emite `onChange`. */
export default function AvatarPanel({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="avatar-panel">
      <AvatarPreview appearance={value} />

      <div className="avatar-controls">
        <label>Tono de piel</label>
        <Swatches values={SKIN_TONES} current={value.skin} onPick={(skin) => set({ skin })} />

        <label>Peinado</label>
        <div className="style-row">
          {HAIR_STYLES.map((s) => (
            <button
              type="button"
              key={s.id}
              className={"style-btn" + (s.id === value.hair ? " selected" : "")}
              onClick={() => set({ hair: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label>Color de pelo</label>
        <Swatches values={HAIR_COLORS} current={value.hairColor} onPick={(hairColor) => set({ hairColor })} />

        <label>Color de camiseta</label>
        <Swatches values={SHIRT_COLORS} current={value.color} onPick={(color) => set({ color })} />

        <label>Accesorio</label>
        <div className="style-row">
          {ACCESSORIES.map((s) => (
            <button
              type="button"
              key={s.id}
              className={"style-btn" + (s.id === value.accessory ? " selected" : "")}
              onClick={() => set({ accessory: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={value.glasses}
            onChange={(e) => set({ glasses: e.target.checked })}
          />
          Gafas 👓
        </label>
      </div>
    </div>
  );
}
