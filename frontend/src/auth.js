export function setTokens(access, refresh) {
  if (access) localStorage.setItem("token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

// Compatibilidad: mantiene la API anterior
export function setToken(token) {
  setTokens(token);
}

export function setAccessToken(token) {
  if (token) localStorage.setItem("token", token);
}

export function getAccessToken() {
  return localStorage.getItem("token");
}

export function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
}

export function isLoggedIn() {
  return !!getAccessToken();
}
