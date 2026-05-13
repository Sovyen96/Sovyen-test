# Mónica Lazcano — Hydrogen Storefront

Storefront premium para la marca de mezcal artesanal **Mónica Lazcano**, construido sobre [Shopify Hydrogen](https://hydrogen.shopify.dev/) (React Router 7 + Oxygen + Vite).

> Concepto visual: **artesanal con toques minimalistas**. Paleta de tierra, ocre y carbón. Tipografía Fraunces (display) + Inter (body). Animaciones suaves con `cubic-bezier(0.16, 1, 0.3, 1)`.

## Estado actual

El proyecto está **scaffoldeado con datos mock** y listo para conectarse a una tienda Shopify real. Tareas hechas:

- ✅ Estructura Hydrogen completa (Vite + React Router 7 + Oxygen)
- ✅ Sistema de diseño en Tailwind 4 (`app/styles/app.css`)
- ✅ Componentes base: `Header`, `Footer`, `ProductCard`, `AgeGate`
- ✅ Páginas: home, colección, producto detalle, historia
- ✅ Datos mock de 4 mezcales con copy listo (`app/lib/mockProducts.ts`)
- ✅ SEO básico, meta tags en español, currency formatting MXN

Pendiente para mañana:
- Instalar dependencias: `npm install`
- Crear la tienda Shopify (ver paso 1)
- Conectar credenciales (ver paso 2)
- Reemplazar mocks por queries reales a Storefront API (ver paso 3)

---

## Pasos para mañana

### 1. Crear la tienda Shopify

Los previews ya están generándose en la sesión anterior con la descripción:
- **Producto**: mezcal artesanal, ediciones limitadas, agave espadín, oaxaca
- **Audiencia**: conocedores mezcal, 30-50, valoran artesanía, sustentabilidad
- **Estilo**: artesanal minimalista, tierra, ocre, serif elegante

Pídeme que te los muestre y elige el que más te guste. Al hacer signup desde el preview, Shopify crea la tienda con tema y productos precargados.

### 2. Obtener credenciales Storefront API

En el admin de Shopify:

1. **Settings** → **Apps and sales channels** → **Develop apps**
2. **Create an app** → nombre: `monica-lazcano-headless`
3. **Configure Storefront API scopes** → marca todos los `unauthenticated_read_*`
4. **Install app** → copia el **Storefront API access token**

Crea el archivo `.env` (copiando `.env.example`) y rellena:

```bash
SESSION_SECRET="cadena-aleatoria-larga"
PUBLIC_STORE_DOMAIN="monica-lazcano.myshopify.com"
PUBLIC_STOREFRONT_API_TOKEN="el-token-publico"
PRIVATE_STOREFRONT_API_TOKEN="el-token-privado"
```

Genera el secret con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Instalar y arrancar

```bash
cd storefront
npm install
npm run dev
```

Abre http://localhost:3000 — verás la home con los productos mock.

### 4. Conectar productos reales

Cuando los productos reales existan en Shopify, reemplaza el uso de `mockProducts` por queries con el cliente `storefront` que Hydrogen inyecta en `loader`. Ejemplo en `app/routes/_index.tsx`:

```ts
export async function loader({context}: LoaderFunctionArgs) {
  const {products} = await context.storefront.query(FEATURED_QUERY);
  return {products};
}

const FEATURED_QUERY = `#graphql
  query FeaturedProducts {
    products(first: 3, sortKey: BEST_SELLING) {
      nodes {
        id handle title
        priceRange { minVariantPrice { amount currencyCode } }
        featuredImage { url altText }
      }
    }
  }
`;
```

Después borrar `app/lib/mockProducts.ts`.

---

## Comandos

```bash
npm run dev         # dev server con HMR
npm run build       # build producción
npm run preview     # preview build local
npm run typecheck   # tsc --noEmit
```

## Estructura

```
storefront/
├── app/
│   ├── components/      # UI reutilizable
│   ├── lib/             # helpers, mocks, GraphQL fragments
│   ├── routes/          # rutas React Router 7
│   ├── styles/app.css   # Tailwind + design tokens
│   ├── root.tsx         # shell + meta + fonts
│   ├── entry.client.tsx
│   └── entry.server.tsx
├── server.ts            # Oxygen worker entry
├── vite.config.ts
└── .env.example
```

## Apps Shopify recomendadas para mañana

Una vez la tienda esté lista, instalar:

- **Verificación de edad**: AgeChecker.Net o Shopify Age Verifier (obligatorio para alcohol).
- **Reseñas**: Judge.me (gratis, integra bien con headless).
- **Email marketing**: Klaviyo (mejor que Shopify Email para storytelling).
- **Inventario por lotes**: Stock Sync o Bundles.
- **Envío de alcohol**: ShipCompliant o solución manual con CFDI/edad por estado.

## Roadmap del look "espectacular"

Después de tener lo básico funcionando, capas adicionales para llevar el look a nivel agencia:

1. **Framer Motion** para transiciones entre páginas y reveals al hacer scroll.
2. **Video hero** loop silencioso de palenque/agave (de 8-12s, comprimido).
3. **Cursor custom** sutil en zonas hero.
4. **React Three Fiber** para una botella 3D rotable en la página de producto.
5. **Sanity** o **Prismic** como CMS para el blog "Diario de la casa".
6. **Imágenes en Cloudinary** con `f_auto, q_auto, w_*` y `blur-up placeholder`.
