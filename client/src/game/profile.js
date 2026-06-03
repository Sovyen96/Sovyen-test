// ─────────────────────────────────────────────────────────────
// Perfil del usuario (nombre + apariencia) persistido en el navegador,
// para no tener que reconfigurarlo cada vez que se entra.
// ─────────────────────────────────────────────────────────────
const KEY = "office_profile";

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* almacenamiento no disponible (modo privado, etc.) */
  }
}
