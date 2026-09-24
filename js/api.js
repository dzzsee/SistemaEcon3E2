// ================================================================
// Cliente API — Cloudflare Pages Functions + D1 (único modo)
// ================================================================

const SESSION_KEY = '3e2_session';

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(user, token) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, token, timestamp: Date.now() }));
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

function tokenHeader() {
  const session = getSession();
  return { Authorization: `Bearer ${session?.token || ''}` };
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const requestOptions = { ...options, signal: controller.signal };

  let res;
  try {
    res = await fetch(path, requestOptions);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('La solicitud tardó demasiado. Intenta de nuevo.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401) {
    const error = new Error('no-auth');
    error.status = 401;
    throw error;
  }
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      /* sin cuerpo */
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// ---------------- AUTH ----------------

export async function login({ usuario, pin, cedula }) {
  try {
    const body = {};
    if (usuario) body.usuario = usuario;
    if (pin) body.pin = pin;
    if (cedula) body.cedula = cedula;

    const data = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (data.success) {
      setSession(data.user, data.token);
      return { success: true, user: data.user };
    }
    return data;
  } catch (err) {
    if (err.message === 'no-auth') return { success: false, message: 'Credenciales inválidas. Verifica tus datos.' };
    throw err;
  }
}

export async function ping() {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

// ---------------- DATA ----------------

export async function getStatus() {
  return request('/api/status', { headers: tokenHeader() });
}

export async function getBalance() {
  return request('/api/balance', { headers: tokenHeader() });
}

export async function addAbono({ miembro_id, semana_id, monto, nota }) {
  return request('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
    body: JSON.stringify({ miembro_id, semana_id, monto, nota })
  });
}

export async function deleteAbonos({ miembro_id, semana_id }) {
  return request('/api/payments', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
    body: JSON.stringify({ miembro_id, semana_id })
  });
}

export async function createWeek({ fecha_inicio, fecha_fin, monto_cuota, descripcion }) {
  return request('/api/weeks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
    body: JSON.stringify({ fecha_inicio, fecha_fin, monto_cuota, descripcion })
  });
}

// ---------------- CONFIG ----------------

export async function getConfig() {
  return request('/api/config', { headers: tokenHeader() });
}

export async function saveConfig(payload) {
  return request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
    body: JSON.stringify({ accion: 'config', ...payload })
  });
}

export async function regenerateWeek(payload) {
  return request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
    body: JSON.stringify({ accion: 'semana', ...payload })
  });
}

export async function updateAdmin(payload) {
  return request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
    body: JSON.stringify({ accion: 'usuario', ...payload })
  });
}