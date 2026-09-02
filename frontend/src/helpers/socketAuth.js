/**
 * JWT para handshake Socket.IO (backend aceita Bearer ou token direto).
 */
import api from "../services/api";

export function resolveSocketAuthToken() {
  let raw = api.defaults?.headers?.Authorization;
  if (!raw) {
    try {
      const stored = localStorage.getItem("token");
      if (stored) {
        raw = `Bearer ${JSON.parse(stored)}`;
      }
    } catch {
      /* ignore */
    }
  }
  if (!raw) return "";
  const str = String(raw).trim();
  if (/^bearer\s+/i.test(str)) {
    return str.replace(/^bearer\s+/i, "").trim();
  }
  return str;
}
