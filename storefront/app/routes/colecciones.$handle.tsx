import {useParams} from 'react-router';
import {mockProducts} from '~/lib/mockProducts';
import {ProductCard} from '~/components/ProductCard';

export const meta = ({params}: {params: {handle: string}}) => [
  {title: `Colección · ${params.handle} · Mónica Lazcano`},
];

export default function Collection() {
  const {handle} = useParams();

  return (
    <section className="container-edge pt-40 pb-28">
      <div className="max-w-3xl mb-16">
        <p className="eyebrow text-[var(--color-clay-deep)] mb-4">Colección</p>
        <h1 className="font-display text-5xl md:text-6xl mb-6 leading-tight capitalize">
          {handle?.replace(/-/g, ' ')}
        </h1>
        <p className="text-[var(--color-charcoal-soft)] text-lg max-w-xl leading-relaxed">
          Cada lote es producido en cantidades limitadas. Cuando se acaba, esperamos
          al siguiente ciclo del agave.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 md:gap-12">
        {mockProducts.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
