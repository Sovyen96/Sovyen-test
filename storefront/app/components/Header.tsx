import {Link} from 'react-router';
import {useState, useEffect} from 'react';

const nav = [
  {to: '/colecciones/mezcales', label: 'Mezcales'},
  {to: '/historia', label: 'Historia'},
  {to: '/maestros', label: 'Maestros'},
  {to: '/diario', label: 'Diario'},
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[var(--color-bone)]/95 backdrop-blur-sm border-b border-[var(--color-charcoal)]/8 py-3'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="container-edge flex items-center justify-between">
        <Link to="/" className="font-display text-xl tracking-tight">
          Mónica Lazcano
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="link-underline text-sm uppercase tracking-[0.18em]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <Link
            to="/cuenta"
            className="hidden md:inline text-sm uppercase tracking-[0.18em] link-underline"
          >
            Cuenta
          </Link>
          <Link to="/carrito" className="text-sm uppercase tracking-[0.18em]">
            Carrito · <span className="tabular-nums">0</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
