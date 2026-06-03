# 🚀 Publicar la oficina virtual

La app está empaquetada como **un único servicio**: el servidor Node sirve el
cliente ya compilado (`client/dist`) **y** gestiona el tiempo real (Socket.IO) y
la señalización de vídeo (WebRTC). Solo necesitas desplegar **una cosa** y
compartir **una URL**.

> Pensada para reuniones pequeñas (4-5 personas; aforo configurable, 12 por
> defecto).

---

## Probarlo en "modo producción" en local

```bash
npm run build      # instala dependencias y compila el cliente
npm start          # arranca el servidor en http://localhost:3001
```

Abre **http://localhost:3001** (¡no el 5173!). Ahí ves la app exactamente como
se servirá en producción, en una sola URL.

---

## Opción A — Render (recomendada, gratis, con WebSockets)

1. Sube este repo a GitHub (ya está en tu repositorio).
2. En [render.com](https://render.com) → **New → Blueprint** y selecciona el
   repo: detectará el fichero [`render.yaml`](./render.yaml) y creará el servicio.
   - O bien **New → Web Service** manual con:
     - **Build Command:** `npm --prefix server install && npm --prefix client install && npm --prefix client run build`
     - **Start Command:** `node server/index.js`
3. Render te da una URL pública tipo `https://oficina-virtual.onrender.com`.
   ¡Eso es lo que compartes para la reunión!

> El plan gratis "duerme" tras un rato de inactividad (el primer acceso tarda
> unos segundos en despertar). Para reuniones serias, sube a un plan de pago.

## Opción B — Docker (cualquier sitio: Fly.io, Railway, VPS…)

```bash
docker build -t oficina-virtual .
docker run -p 3001:3001 oficina-virtual
```

Despliega esa imagen en tu plataforma favorita. La plataforma inyecta `PORT`
automáticamente; el servidor lo respeta.

## Opción C — Railway

1. **New Project → Deploy from GitHub repo**.
2. Build Command: `npm run build` · Start Command: `npm start`.
3. Railway expone la URL pública.

---

## 🎥 Vídeo/voz fiable entre redes: añade un TURN

El vídeo por proximidad usa WebRTC P2P. Con solo **STUN** (configurado por
defecto) funciona en muchos casos, pero **si los participantes están en redes
distintas** (oficina, casa, móvil) algunos NAT bloquean la conexión directa.
Para que funcione siempre, añade un **servidor TURN**.

No hay que recompilar: el cliente pide la config a `/rtc-config`. Solo define
estas variables de entorno en tu plataforma:

```
TURN_URL=turn:tu-servidor-turn:3478
TURN_USERNAME=usuario
TURN_CREDENTIAL=secreto
```

Opciones rápidas de TURN:
- **[Metered](https://www.metered.ca/tools/openrelay/)** (TURN gratuito/managed).
- **[Twilio Network Traversal Service](https://www.twilio.com/stun-turn)**.
- Montar **[coturn](https://github.com/coturn/coturn)** en un VPS.

---

## ⚙️ Variables de entorno

| Variable          | Por defecto | Descripción                                  |
|-------------------|-------------|----------------------------------------------|
| `PORT`            | `3001`      | Puerto del servidor (lo fija la plataforma). |
| `MAX_PLAYERS`     | `12`        | Aforo máximo de la oficina.                  |
| `TURN_URL`        | —           | URL del servidor TURN (opcional).            |
| `TURN_USERNAME`   | —           | Usuario TURN.                                |
| `TURN_CREDENTIAL` | —           | Credencial TURN.                             |

> Cámara y micrófono requieren **HTTPS** (todas las plataformas anteriores lo
> dan automáticamente). En local funciona con `http://localhost`.
