import { io } from "socket.io-client";

// Base del servidor:
//  - Producción: mismo origen que sirve la app (cadena vacía → same-origin).
//  - Desarrollo: el servidor de sockets corre aparte en el puerto 3001.
//  - Override manual con VITE_SERVER_URL si se despliega el server en otra URL.
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

export const socket = io(SERVER_URL || undefined, { autoConnect: false });
