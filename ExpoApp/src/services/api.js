import { dbService } from './db.js';
import { eliminarFactura, guardarFactura } from './files.js';

export function getMode() {
  return 'local';
}

export async function getActiveMode() {
  return 'local';
}

export function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
}

export async function login(usuario, pin) {
  return dbService.login(usuario, pin);
}

export async function logout() {
  return dbService.logout();
}

export async function getSession() {
  return dbService.getSession();
}

export async function getMembers() {
  return dbService.getMembers();
}

export async function getWeeks() {
  return dbService.getWeeks();
}

export async function getStatus() {
  const members = await dbService.getMembers();
  const weeks = await dbService.getWeeks();
  const payments = await dbService.getAbonos();
  const gastos = await dbService.getGastos();
  const grouped = {};
  for (const p of payments) {
    const key = `${p.miembro_id}-${p.semana_id}`;
    if (!grouped[key]) grouped[key] = { total: 0, abonos: [] };
    grouped[key].total += Number(p.monto);
    grouped[key].abonos.push(p);
  }
  return { members, weeks, grouped, gastos };
}

export async function addAbono({ miembro_id, semana_id, monto, nota }) {
  const session = await getSession();
  return dbService.saveAbono({
    miembro_id,
    semana_id,
    monto,
    registrado_por: session?.nombre || 'Tesorero',
    nota
  });
}

export async function getBalance() {
  return dbService.getBalanceSummary();
}

export async function getReport() {
  const members = await dbService.getMembers();
  const weeks = await dbService.getWeeks();
  const payments = await dbService.getAbonos();
  const matrix = members.map((m) => {
    const row = { numero_lista: m.numero_lista, nombre: m.nombre, total_abonado: 0, semanas: {} };
    for (const w of weeks) {
      const abonosMember = payments.filter(
        (p) => p.miembro_id === m.numero_lista && p.semana_id === w.id
      );
      const abonado = abonosMember.reduce((acc, p) => acc + Number(p.monto), 0);
      const deuda = Math.max(0, Number(w.monto_cuota) - abonado);
      const estado = abonado >= w.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
      row.total_abonado += abonado;
      row.semanas[w.id] = { abonado, deuda, estado, cuota: w.monto_cuota };
    }
    return row;
  });
  return { generated_at: new Date().toISOString(), weeks, matrix };
}

export async function createWeek({ fecha_inicio, fecha_fin, monto_cuota, descripcion }) {
  return dbService.addWeek(fecha_inicio, fecha_fin, monto_cuota, descripcion);
}

export async function getConfig() {
  return { success: true, config: await dbService.getConfig(), admins: await dbService.getAdmins() };
}

export async function saveConfig(payload) {
  return dbService.saveConfig(payload);
}

export async function regenerateWeeks(payload) {
  return dbService.regenerateWeeks(payload);
}

export async function updateAdmin(payload) {
  return dbService.updateAdmin(payload);
}

export async function resetDemo() {
  return dbService.reset();
}

export async function getGastos() {
  return dbService.getGastos();
}

export async function addGasto(datos, archivo = null) {
  const session = await getSession();
  const guardado = archivo ? await guardarFactura(archivo) : null;
  try {
    return await dbService.saveGasto({
      ...datos,
      registrado_por: session?.nombre || 'Tesorero',
      archivo: guardado
    });
  } catch (error) {
    if (guardado?.uri) await eliminarFactura({ uri_archivo: guardado.uri });
    throw error;
  }
}

export async function deleteGasto(id) {
  const gastos = await dbService.getGastos();
  const gasto = gastos.find((g) => g.id === id);
  const resultado = await dbService.deleteGasto(id);
  if (resultado.success) await eliminarFactura(gasto);
  return resultado;
}
