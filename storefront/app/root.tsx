import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  type LoaderFunctionArgs,
} from 'react-router';
import {Header} from '~/components/Header';
import {Footer} from '~/components/Footer';
import appStyles from '~/styles/app.css?url';

export const links = () => [
  {rel: 'stylesheet', href: appStyles},
  {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
  {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous'},
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500;600&display=swap',
  },
  {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
];

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront, env} = context;
  return {
    shop: await getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    },
  };
}

export default function App() {
  const nonce = useNonce();

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen flex flex-col">
        <Analytics.Provider cart={null} shop={null} consent={null}>
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message =
    isRouteErrorResponse(error)
      ? error.statusText
      : error instanceof Error
        ? error.message
        : 'Error desconocido';

  return (
    <html lang="es">
      <head>
        <title>Algo salió mal · Mónica Lazcano</title>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <p className="eyebrow text-clay-deep mb-4">Error</p>
          <h1 className="text-4xl mb-4">Algo salió mal</h1>
          <p className="text-charcoal-soft mb-8">{message}</p>
          <a href="/" className="btn-ghost">Volver al inicio</a>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
