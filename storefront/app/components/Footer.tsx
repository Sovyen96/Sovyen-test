import {Link} from 'react-router';

export function Footer() {
  return (
    <footer className="bg-[var(--color-charcoal)] text-[var(--color-bone)] mt-32">
      <div className="container-edge py-20">
        <div className="grid md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <p className="font-display text-3xl mb-6 leading-tight">
              Mezcal honesto,<br />hecho a mano,<br />en su tiempo.
            </p>
            <p className="text-sm text-[var(--color-bone)]/70 max-w-sm">
              Producido en pequeños lotes en Oaxaca por la familia Lazcano. Sólo
              vendemos lo que la tierra nos permite cada año.
            </p>
          </div>

          <div>
            <p className="eyebrow text-[var(--color-clay)] mb-5">Casa</p>
            <ul className="space-y-3 text-sm">
              <li><Link to="/historia" className="link-underline">Historia</Link></li>
              <li><Link to="/maestros" className="link-underline">Maestros</Link></li>
              <li><Link to="/proceso" className="link-underline">Proceso</Link></li>
              <li><Link to="/sostenibilidad" className="link-underline">Sostenibilidad</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-[var(--color-clay)] mb-5">Servicio</p>
            <ul className="space-y-3 text-sm">
              <li><Link to="/envios" className="link-underline">Envíos</Link></li>
              <li><Link to="/preguntas" className="link-underline">Preguntas</Link></li>
              <li><Link to="/contacto" className="link-underline">Contacto</Link></li>
              <li><Link to="/mayoreo" className="link-underline">Mayoreo</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--color-bone)]/15 mt-16 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-bone)]/60 uppercase tracking-[0.18em]">
            © {new Date().getFullYear()} Mónica Lazcano · Oaxaca, México
          </p>
          <p className="text-xs text-[var(--color-bone)]/60 max-w-md">
            Beber con responsabilidad. Prohibida su venta a menores de edad.
          </p>
        </div>
      </div>
    </footer>
  );
}
