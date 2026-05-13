import {useEffect, useState} from 'react';

const STORAGE_KEY = 'ml.age-verified';

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  const confirm = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-charcoal)]/95 backdrop-blur-md flex items-center justify-center px-6">
      <div className="max-w-md text-center text-[var(--color-bone)] animate-fade-up">
        <p className="eyebrow text-[var(--color-clay)] mb-6">Mónica Lazcano</p>
        <h2 className="font-display text-4xl mb-6 leading-tight">
          ¿Tienes la edad legal para beber?
        </h2>
        <p className="text-sm text-[var(--color-bone)]/70 mb-10 max-w-sm mx-auto">
          Este sitio contiene contenido sobre bebidas alcohólicas. Al continuar,
          confirmas que tienes la edad legal en tu país.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={confirm} className="btn-primary bg-[var(--color-bone)] text-[var(--color-charcoal)] hover:bg-[var(--color-clay)]">
            Tengo la edad
          </button>
          <a
            href="https://www.google.com"
            className="btn-ghost border-[var(--color-bone)]/40 text-[var(--color-bone)]/80"
          >
            Salir
          </a>
        </div>
      </div>
    </div>
  );
}
