import {Link} from 'react-router';
import {mockProducts, formatPrice} from '~/lib/mockProducts';
import {ProductCard} from '~/components/ProductCard';

export const meta = () => [
  {title: 'Mónica Lazcano · Mezcal artesanal de Oaxaca'},
  {
    name: 'description',
    content:
      'Mezcal artesanal hecho a mano en pequeños lotes en San Baltazar Guelavila, Oaxaca. Ediciones limitadas por la maestra mezcalera Mónica Lazcano.',
  },
];

export default function Home() {
  const featured = mockProducts.slice(0, 3);

  return (
    <>
      {/* Hero editorial */}
      <section className="relative h-[92vh] min-h-[640px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1597290282695-edc43d0e7129?auto=format&fit=crop&w=2400&q=85"
            alt="Maestra mezcalera en palenque al amanecer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-charcoal)]/85 via-[var(--color-charcoal)]/30 to-transparent" />
        </div>
        <div className="container-edge relative pb-20 md:pb-28 text-[var(--color-bone)]">
          <p className="eyebrow text-[var(--color-clay)] mb-6 animate-fade-up">
            Casa Lazcano · Oaxaca, México
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-4xl animate-fade-up" style={{animationDelay: '120ms'}}>
            Mezcal hecho con tiempo,<br />tierra y silencio.
          </h1>
          <div className="mt-10 flex flex-wrap gap-4 animate-fade-up" style={{animationDelay: '240ms'}}>
            <Link to="/colecciones/mezcales" className="btn-primary bg-[var(--color-bone)] text-[var(--color-charcoal)] hover:bg-[var(--color-clay)]">
              Ver la colección
            </Link>
            <Link to="/historia" className="btn-ghost border-[var(--color-bone)]/60 text-[var(--color-bone)] hover:bg-[var(--color-bone)] hover:text-[var(--color-charcoal)]">
              Conoce la casa
            </Link>
          </div>
        </div>
      </section>

      {/* Manifiesto */}
      <section className="container-edge py-28 md:py-40">
        <div className="grid md:grid-cols-12 gap-10">
          <p className="eyebrow text-[var(--color-clay-deep)] md:col-span-3">
            Nuestra manera
          </p>
          <div className="md:col-span-8 md:col-start-5">
            <p className="font-display text-3xl md:text-4xl lg:text-5xl leading-[1.15]">
              No producimos al ritmo del mercado.
              <span className="text-[var(--color-clay-deep)]"> Producimos al ritmo del agave.</span>
              {' '}Cada botella es el resultado de doce a veinte años de espera, seis días de cocción en tierra,
              y tres generaciones cuidando un palenque que no se apaga.
            </p>
          </div>
        </div>
      </section>

      {/* Colección destacada */}
      <section className="container-edge pb-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="eyebrow text-[var(--color-clay-deep)] mb-4">La colección</p>
            <h2 className="font-display text-4xl md:text-5xl">Ediciones de la casa</h2>
          </div>
          <Link to="/colecciones/mezcales" className="link-underline text-sm uppercase tracking-[0.18em] hidden md:inline">
            Ver todas
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Bloque editorial proceso */}
      <section className="bg-[var(--color-bone-soft)] py-28 md:py-40">
        <div className="container-edge grid md:grid-cols-2 gap-16 items-center">
          <div className="aspect-[4/5] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1568849676085-51415703900f?auto=format&fit=crop&w=1600&q=85"
              alt="Tahona de piedra moliendo agave cocido"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="eyebrow text-[var(--color-clay-deep)] mb-5">El proceso</p>
            <h2 className="font-display text-4xl md:text-5xl mb-6 leading-tight">
              Seis días de tierra,<br />ocho de fermento.
            </h2>
            <p className="text-[var(--color-charcoal-soft)] leading-relaxed mb-6 max-w-md">
              El agave maduro se cocina en horno de tierra durante seis días.
              Se muele a mano en tahona de piedra. Fermenta con su propia agua,
              en tinas de madera, hasta que la naturaleza decide.
            </p>
            <p className="text-[var(--color-charcoal-soft)] leading-relaxed max-w-md">
              Luego se destila dos veces en olla de barro. Nada más. Nada menos.
            </p>
            <Link to="/proceso" className="btn-ghost mt-10">
              Conoce el palenque
            </Link>
          </div>
        </div>
      </section>

      {/* Diario / Newsletter */}
      <section className="container-edge py-28">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow text-[var(--color-clay-deep)] mb-5">Diario de la casa</p>
          <h2 className="font-display text-4xl md:text-5xl mb-6 leading-tight">
            Avisos de cosecha y nuevos lotes
          </h2>
          <p className="text-[var(--color-charcoal-soft)] mb-10">
            Una carta al año. Cuando hay nuevo mezcal, cuando hay nada.
            Sin ruido, sin promociones.
          </p>
          <form className="flex gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              className="flex-1 px-5 py-4 bg-transparent border border-[var(--color-charcoal)]/30 focus:border-[var(--color-charcoal)] outline-none text-sm"
            />
            <button type="submit" className="btn-primary">
              Suscribirme
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
