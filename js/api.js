// ================================================================
// Cliente API — Cloudflare Pages Functions + D1 (único modo)
// ================================================================

const SESSION_KEY = '3e2_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(user, token) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, token, timestamp: Date.now() }));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function tokenHeader() {
  const session = getSession();
  return { Authorization: `Bearer ${session?.token || ''}` };
}

async function request(path, options = {}) {
  const res = await fetch(path, options);
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

export async function login(usuario, pin) {
  try {
    const data = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, pin })
    });
    if (data.success) {
      setSession(data.user, data.token);
      return { success: true, user: data.user };
    }
    return data;
  } catch (err) {
    if (err.message === 'no-auth') return { success: false, message: 'Credenciales inválidas. Verifica tu usuario y PIN.' };
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

export async function createWeek({ fecha_inicio, fecha_fin, monto_cuota, descripcion }) {
  return request('/api/weeks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader() },
    body: JSON.stringify({ fecha_inicio, fecha_fin, monto_cuota, descripcion })
  });
}