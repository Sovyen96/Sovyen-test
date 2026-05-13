import {Link} from 'react-router';
import type {MockProduct} from '~/lib/mockProducts';
import {formatPrice} from '~/lib/mockProducts';

export function ProductCard({product, index = 0}: {product: MockProduct; index?: number}) {
  return (
    <Link
      to={`/productos/${product.handle}`}
      className="group block animate-fade-up"
      style={{animationDelay: `${index * 80}ms`}}
    >
      <div className="aspect-[3/4] overflow-hidden bg-[var(--color-bone-soft)] mb-5">
        <img
          src={product.image.url}
          alt={product.image.alt}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-[var(--color-clay-deep)] mb-2">{product.subtitle}</p>
          <h3 className="font-display text-2xl leading-tight mb-1">{product.title}</h3>
          <p className="text-sm text-[var(--color-charcoal-soft)]/70">{product.agave}</p>
        </div>
        <p className="text-sm tabular-nums mt-7">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
