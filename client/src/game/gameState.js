// ─────────────────────────────────────────────────────────────
// Estado compartido (ligero) entre el motor del juego y la UI.
// OfficeCanvas lo mantiene actualizado; ProximityVideo lo consulta
// para saber quién está cerca y abrir/cerrar las videollamadas.
// ─────────────────────────────────────────────────────────────
export const gameState = {
  myId: null,
  /** Mapa id -> objeto jugador (con tx, ty, name). Referencia viva. */
  players: new Map(),
};
