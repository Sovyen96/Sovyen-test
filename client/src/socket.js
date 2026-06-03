import { io } from "socket.io-client";

// URL del servidor de sockets. En desarrollo apunta al puerto 3001;
// en producción se puede sobreescribir con VITE_SERVER_URL.
const URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(URL, { autoConnect: false });
