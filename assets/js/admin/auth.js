/**
 * Autenticação do admin (client-side).
 *
 * IMPORTANTE: isto é uma barreira de acesso para uso interno em um site
 * estático — a senha vira hash SHA-256 no localStorage e a sessão fica no
 * sessionStorage. Para segurança real (multiusuário, dados sensíveis),
 * migre para autenticação em backend.
 */
import { settings } from './store.js';

const SESSION_KEY = 'slurk-admin-session';

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hasPassword() {
  return Boolean(settings.get().passwordHash);
}

export async function setPassword(password) {
  settings.set({ passwordHash: await sha256(password) });
}

export async function login(password) {
  const ok = (await sha256(password)) === settings.get().passwordHash;
  if (ok) sessionStorage.setItem(SESSION_KEY, '1');
  return ok;
}

export function isLogged() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
