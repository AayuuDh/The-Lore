const SESSION_KEY = "lore-local-session";
const USER_ID_KEY = "lore-local-user-id";

function createUserId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getLocalSession() {
  if (localStorage.getItem(SESSION_KEY) !== "active") return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function startLocalSession() {
  const userId = localStorage.getItem(USER_ID_KEY) || createUserId();
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(SESSION_KEY, "active");
  return userId;
}

export function endLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}