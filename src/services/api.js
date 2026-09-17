import { dbService } from './db.js';

// Cliente de API con dos modos de funcionamiento:
//  - "d1":   funciones de Cloudflare Pages (SQLite D1 en producción)
//  - "local": LocalStorage (demo local sin backend, para npm run dev)
//
// El primer acceso hace un health-check; si las funciones no están
// disponibles (desarrollo local sin wrangler) cambia automáticamente a "local".

let MODE = null;

async function detectMode() {
  if (MODE) return MODE;
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      MODE = data.ok ? 'd1' : 'local';
    } else {
      MODE = 'local';
    }
  } catch {
    MODE = 'local';
  }
  return MODE;
}

export function getMode() {
  return MODE;
}

function tokenHeader() {
  const session = dbService.getSession();
  return { Authorization: `Bearer ${session?.token || ''}` };
}

function fallbackToLocal(fn) {
  MODE = 'local';
  return fn();
}

// ---------------- AUTH ----------------

export async function login(usuario, pin) {
  const mode = await detectMode();

  if (mode === 'd1') {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, pin })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('3e2_session', JSON.stringify({ ...data.user, token: data.token, timestamp: Date.now() }));
      }
      return data;
    } catch {
      return fallbackToLocal(() => dbService.login(usuario, pin));
    }
  }

  return dbService.login(usuario, pin);
}

export async function logout() {
  localStorage.removeItem('3e2_session');
  dbService.logout();
}

export async function getSession() {
  const s = localStorage.getItem('3e2_session');
  return s ? JSON.parse(s) : null;
}

// ---------------- DATA ----------------

export async function getMembers() {
  const mode = await detectMode();
  if (mode === 'd1') {
    try {
      const res = await fetch('/api/members');
      if (res.ok) return await res.json();
    } catch {
      /* fallback abajo */
    }
  }
  return fallbackToLocal(() => dbService.getMembers());
}

export async function getWeeks() {
  const mode = await detectMode();
  if (mode === 'd1') {
    try {
      const res = await fetch('/api/weeks');
      if (res.ok) return await res.json();
    } catch {
      /* fallback */
    }
  }
  return fallbackToLocal(() => dbService.getWeeks());
}

export async function getStatus() {
  const mode = await detectMode();
  if (mode === 'd1') {
    try {
      const res = await fetch('/api/status', { headers: tokenHeader() });
      if (res.ok) return await res.json();
      if (res.status === 401) throw new Error('no-auth');
    } catch (e) {
      if (e.message === 'no-auth') throw e;
    }
  }
  return fallbackToLocal(() => {
    const members = dbService.getMembers();
    const weeks = dbService.getWeeks();
    const payments = dbService.getPayments();
    const grouped = {};
    for (const p of payments) {
      const key = `${p.miembro_id}-${p.semana_id}`;
      if (!grouped[key]) grouped[key] = { total: 0, abonos: [] };
      grouped[key].total += Number(p.monto);
      grouped[key].abonos.push(p);
    }
    return { members, weeks, grouped };
  });
}

export async function addAbono({ miembro_id, semana_id, monto, nota }) {
  const mode = await detectMode();
  const session = await getSession();

  if (mode === 'd1') {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
        body: JSON.stringify({ miembro_id, semana_id, monto, nota })
      });
      const data = await res.json();
      if (res.status === 401) throw new Error('no-auth');
      return data;
    } catch (e) {
      if (e.message === 'no-auth') throw e;
      return fallbackToLocal(() =>
        dbService.saveAbono({
          miembro_id,
          semana_id,
          monto,
          registrado_por: session?.nombre || 'Tesorero',
          nota
        })
      );
    }
  }

  return dbService.saveAbono({
    miembro_id,
    semana_id,
    monto,
    registrado_por: session?.nombre || 'Tesorero',
    nota
  });
}

export async function getBalance() {
  const mode = await detectMode();
  if (mode === 'd1') {
    try {
      const res = await fetch('/api/balance', { headers: tokenHeader() });
      if (res.ok) return await res.json();
      if (res.status === 401) throw new Error('no-auth');
    } catch (e) {
      if (e.message === 'no-auth') throw e;
    }
  }
  return fallbackToLocal(() => dbService.getBalanceSummary());
}

export async function getReport() {
  const mode = await detectMode();
  if (mode === 'd1') {
    try {
      const res = await fetch('/api/report', { headers: tokenHeader() });
      if (res.ok) return await res.json();
      if (res.status === 401) throw new Error('no-auth');
    } catch (e) {
      if (e.message === 'no-auth') throw e;
    }
  }
  return fallbackToLocal(() => {
    const members = dbService.getMembers();
    const weeks = dbService.getWeeks();
    const payments = dbService.getPayments();
    const matrix = members.map((m) => {
      const row = { numero_lista: m.numero_lista, nombre: m.nombre, total_abonado: 0, semanas: {} };
      for (const w of weeks) {
        const abonosMember = payments.filter((p) => p.miembro_id === m.numero_lista && p.semana_id === w.id);
        const abonado = abonosMember.reduce((acc, p) => acc + Number(p.monto), 0);
        const deuda = Math.max(0, Number(w.monto_cuota) - abonado);
        const estado = abonado >= w.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
        row.total_abonado += abonado;
        row.semanas[w.id] = { abonado, deuda, estado, cuota: w.monto_cuota };
      }
      return row;
    });
    return { generated_at: new Date().toISOString(), weeks, matrix };
  });
}

export async function createWeek({ fecha_inicio, fecha_fin, monto_cuota, descripcion }) {
  const mode = await detectMode();
  if (mode === 'd1') {
    try {
      const res = await fetch('/api/weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
        body: JSON.stringify({ fecha_inicio, fecha_fin, monto_cuota, descripcion })
      });
      if (res.status === 401) throw new Error('no-auth');
      return await res.json();
    } catch (e) {
      if (e.message === 'no-auth') throw e;
    }
  }
  return dbService.addWeek(fecha_inicio, fecha_fin, monto_cuota, descripcion);
}

export function resetDemo() {
  dbService.reset();
}

// Helper de formato moneda
export function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
}