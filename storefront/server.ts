/**
 * Server entry para Shopify Oxygen.
 * Crea el contexto de Hydrogen (storefront client, cart, session) por request.
 */
import {createRequestHandler} from '@shopify/remix-oxygen';
import {createHydrogenContext, InMemoryCache} from '@shopify/hydrogen';
import {createCookieSessionStorage} from 'react-router';

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    try {
      const waitUntil = executionContext.waitUntil.bind(executionContext);
      const [cache, session] = await Promise.all([
        caches.open('hydrogen'),
        AppSession.init(request, [env.SESSION_SECRET]),
      ]);

      const hydrogenContext = createHydrogenContext({
        env,
        request,
        cache,
        waitUntil,
        session,
        i18n: {language: 'ES', country: 'MX'},
        cart: {queryFragment: ''},
      });

      const handleRequest = createRequestHandler({
        // eslint-disable-next-line import/no-unresolved
        build: await import('virtual:react-router/server-build'),
        mode: process.env.NODE_ENV,
        getLoadContext: () => ({
          ...hydrogenContext,
          // expose env on context for child loaders
          env,
        }),
      });

      const response = await handleRequest(request);
      if (session.isPending) {
        response.headers.set('Set-Cookie', await session.commit());
      }
      return response;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('Error inesperado', {status: 500});
    }
  },
} satisfies ExportedHandler<Env>;

class AppSession {
  #pending = false;
  #sessionStorage;
  #session;

  constructor(sessionStorage: any, session: any) {
    this.#sessionStorage = sessionStorage;
    this.#session = session;
  }

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });
    const session = await storage.getSession(request.headers.get('Cookie'));
    return new this(storage, session);
  }

  get isPending() {
    return this.#pending;
  }

  get(key: string) {
    return this.#session.get(key);
  }

  set(key: string, value: unknown) {
    this.#pending = true;
    this.#session.set(key, value);
  }

  unset(key: string) {
    this.#pending = true;
    this.#session.unset(key);
  }

  commit() {
    this.#pending = false;
    return this.#sessionStorage.commitSession(this.#session);
  }
}
