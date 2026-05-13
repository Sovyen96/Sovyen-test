/**
 * Productos mock — se reemplazan por queries reales a Shopify Storefront API
 * cuando se conecte la tienda creada desde los previews.
 */

export type MockProduct = {
  id: string;
  handle: string;
  title: string;
  subtitle: string;
  agave: string;
  region: string;
  abv: string;
  maestro: string;
  edicion: string;
  price: {amount: string; currencyCode: string};
  description: string;
  notes: string[];
  image: {url: string; alt: string};
};

export const mockProducts: MockProduct[] = [
  {
    id: 'gid://shopify/Product/1',
    handle: 'espadin-ancestral',
    title: 'Espadín Ancestral',
    subtitle: 'Edición Tierra',
    agave: 'Agave Espadín',
    region: 'San Baltazar Guelavila, Oaxaca',
    abv: '46%',
    maestro: 'Don Atenógenes Lazcano',
    edicion: 'Lote 03 · 480 botellas',
    price: {amount: '1280.00', currencyCode: 'MXN'},
    description:
      'Cocido en horno de tierra durante seis días, molido en tahona de piedra y destilado dos veces en olla de barro. Una expresión silenciosa del espadín maduro.',
    notes: ['Tierra húmeda', 'Cítrico ahumado', 'Mineral'],
    image: {
      url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=1600&q=80',
      alt: 'Botella de mezcal Espadín Ancestral sobre piedra',
    },
  },
  {
    id: 'gid://shopify/Product/2',
    handle: 'tobala-silvestre',
    title: 'Tobalá Silvestre',
    subtitle: 'Edición Sierra',
    agave: 'Agave Tobalá',
    region: 'Sola de Vega, Oaxaca',
    abv: '48%',
    maestro: 'Maestra Mónica Lazcano',
    edicion: 'Lote 01 · 220 botellas',
    price: {amount: '2450.00', currencyCode: 'MXN'},
    description:
      'Agave silvestre de quince años madurado en montaña. Sólo se produce cuando la sierra lo permite. Cada botella firmada por la maestra.',
    notes: ['Flores secas', 'Madera tostada', 'Pimienta blanca'],
    image: {
      url: 'https://images.unsplash.com/photo-1614113489855-3f6a06fac0b0?auto=format&fit=crop&w=1600&q=80',
      alt: 'Botella de mezcal Tobalá Silvestre',
    },
  },
  {
    id: 'gid://shopify/Product/3',
    handle: 'cuishe-de-monte',
    title: 'Cuishe de Monte',
    subtitle: 'Edición Madre',
    agave: 'Agave Cuishe',
    region: 'Miahuatlán, Oaxaca',
    abv: '47%',
    maestro: 'Don Atenógenes Lazcano',
    edicion: 'Lote 02 · 310 botellas',
    price: {amount: '1890.00', currencyCode: 'MXN'},
    description:
      'Un cuishe largo, mineral, hecho con paciencia. Doce años de espera del agave, ocho días de fermentación natural, cero atajos.',
    notes: ['Piedra mojada', 'Hierba fresca', 'Cuero suave'],
    image: {
      url: 'https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?auto=format&fit=crop&w=1600&q=80',
      alt: 'Botella de mezcal Cuishe de Monte',
    },
  },
  {
    id: 'gid://shopify/Product/4',
    handle: 'arroqueno-reposado',
    title: 'Arroqueño',
    subtitle: 'Edición Memoria',
    agave: 'Agave Arroqueño',
    region: 'San Luis del Río, Oaxaca',
    abv: '49%',
    maestro: 'Maestra Mónica Lazcano',
    edicion: 'Lote 01 · 180 botellas',
    price: {amount: '2980.00', currencyCode: 'MXN'},
    description:
      'Veinte años de crecimiento, una destilación. El arroqueño concentra el carácter de la tierra: profundo, ahumado, persistente.',
    notes: ['Humo de encino', 'Chocolate amargo', 'Frutos secos'],
    image: {
      url: 'https://images.unsplash.com/photo-1568849676085-51415703900f?auto=format&fit=crop&w=1600&q=80',
      alt: 'Botella de mezcal Arroqueño',
    },
  },
];

export const getProductByHandle = (handle: string) =>
  mockProducts.find((p) => p.handle === handle);

export const formatPrice = (price: {amount: string; currencyCode: string}) => {
  const n = parseFloat(price.amount);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: price.currencyCode,
    maximumFractionDigits: 0,
  }).format(n);
};
