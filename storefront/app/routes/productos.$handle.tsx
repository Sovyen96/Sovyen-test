import {useParams, Link} from 'react-router';
import {getProductByHandle, formatPrice, mockProducts} from '~/lib/mockProducts';
import {ProductCard} from '~/components/ProductCard';

export const meta = ({params}: {params: {handle: string}}) => {
  const p = getProductByHandle(params.handle);
  return [
    {title: p ? `${p.title} · Mónica Lazcano` : 'Producto · Mónica Lazcano'},
    {name: 'description', content: p?.description ?? ''},
  ];
};

export default function ProductPage() {
  const {handle} = useParams();
  const product = handle ? getProductByHandle(handle) : null;

  if (!product) {
    return (
      <div className="container-edge pt-40 pb-28 text-center">
        <p className="eyebrow text-[var(--color-clay-deep)] mb-4">404</p>
        <h1 className="font-display text-4xl mb-6">Producto no encontrado</h1>
        <Link to="/colecciones/mezcales" className="btn-ghost">Ver la colección</Link>
      </div>
    );
  }

  const related = mockProducts.filter((p) => p.handle !== product.handle).slice(0, 3);

  return (
    <>
      <section className="pt-32 pb-24">
        <div className="container-edge grid md:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div className="aspect-[3/4] overflow-hidden bg-[var(--color-bone-soft)] sticky top-32">
            <img
              src={product.image.url}
              alt={product.image.alt}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="max-w-md">
            <p className="eyebrow text-[var(--color-clay-deep)] mb-4">{product.subtitle}</p>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] mb-6">
              {product.title}
            </h1>
            <p className="text-2xl tabular-nums mb-10">{formatPrice(product.price)}</p>

            <p className="text-[var(--color-charcoal-soft)] leading-relaxed mb-10">
              {product.description}
            </p>

            <button className="btn-primary w-full justify-center mb-4">
              Añadir al carrito
            </button>
            <p className="text-xs text-center text-[var(--color-charcoal-soft)]/60 uppercase tracking-[0.18em] mb-12">
              {product.edicion}
            </p>

            <dl className="border-t border-[var(--color-charcoal)]/15 divide-y divide-[var(--color-charcoal)]/15 text-sm">
              <Row label="Agave">{product.agave}</Row>
              <Row label="Región">{product.region}</Row>
              <Row label="Maestro">{product.maestro}</Row>
              <Row label="Alcohol">{product.abv}</Row>
              <Row label="Notas">{product.notes.join(' · ')}</Row>
            </dl>
          </div>
        </div>
      </section>

      <section className="container-edge py-24 border-t border-[var(--color-charcoal)]/10">
        <p className="eyebrow text-[var(--color-clay-deep)] mb-4">Sigue explorando</p>
        <h2 className="font-display text-3xl md:text-4xl mb-12">Otras ediciones</h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {related.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
    </>
  );
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex justify-between py-4 gap-6">
      <dt className="text-[var(--color-charcoal-soft)]/60 uppercase tracking-[0.18em] text-xs">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
