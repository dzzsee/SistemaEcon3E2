import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const INITIAL_ADMINS = [
  { id: 1, usuario: 'tutor', pin: '1234', nombre: 'Prof. Tutor', rol: 'tutor' },
  { id: 2, usuario: 'presidente', pin: '2345', nombre: 'Presidente 3E2', rol: 'presidente' },
  { id: 3, usuario: 'tesorero', pin: '3456', nombre: 'Tesorero 3E2', rol: 'tesorero' }
];

export const INITIAL_MEMBERS = [
  { numero_lista: 1, nombre: 'Álvarez Mendoza Diego' },
  { numero_lista: 2, nombre: 'Benítez Castro Sofía' },
  { numero_lista: 3, nombre: 'Cabrera Romero Alejandro' },
  { numero_lista: 4, nombre: 'Delgado Morales Valentina' },
  { numero_lista: 5, nombre: 'Espinoza Ramos Mateo' },
  { numero_lista: 6, nombre: 'Flores Herrera Camila' },
  { numero_lista: 7, nombre: 'García López Daniel' },
  { numero_lista: 8, nombre: 'Hernández Castillo Valeria' },
  { numero_lista: 9, nombre: 'Ibarra Silva Sebastián' },
  { numero_lista: 10, nombre: 'Jiménez Ortiz Natalia' },
  { numero_lista: 11, nombre: 'Lara Méndez Emiliano' },
  { numero_lista: 12, nombre: 'Martínez Cruz Isabella' },
  { numero_lista: 13, nombre: 'Navarro Reyes Leonardo' },
  { numero_lista: 14, nombre: 'Orozco Torres Ximena' },
  { numero_lista: 15, nombre: 'Pérez Gómez Gabriel' },
  { numero_lista: 16, nombre: 'Quintana Domínguez Romina' },
  { numero_lista: 17, nombre: 'Ramírez Vega Santiago' },
  { numero_lista: 18, nombre: 'Sánchez Fuentes Victoria' },
  { numero_lista: 19, nombre: 'Torres Medina Samuel' },
  { numero_lista: 20, nombre: 'Vázquez Ruiz Mariana' }
];

const STORAGE_KEYS = {
  ADMINS: 'econ3e2_admins',
  MEMBERS: 'econ3e2_members',
  WEEKS: 'econ3e2_weeks',
  ABONOS: 'econ3e2_abonos',
  GASTOS: 'econ3e2_gastos',
  CONFIG: 'econ3e2_config',
  SESSION: '3e2_session'
};

const TOKEN_KEY = '3e2_session_token';

export function getMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

export function formatDatePretty(dateString) {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function generateDefaultWeeks(count = 10, startOffset = -2) {
  const weeks = [];
  const currentMonday = getMonday(new Date());

  for (let i = startOffset; i < count + startOffset; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() + i * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const numero = i - startOffset + 1;
    weeks.push({
      id: numero,
      numero_semana: numero,
      fecha_inicio: formatDateISO(monday),
      fecha_fin: formatDateISO(sunday),
      monto_cuota: 20.0,
      descripcion: `Semana ${numero}`
    });
  }
  return weeks;
}

async function read(key, fallback = null) {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

async function write(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function has(key) {
  const value = await AsyncStorage.getItem(key);
  return value !== null;
}

function crearToken(usuario) {
  const raw = `${usuario}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  if (typeof btoa === 'function') return btoa(raw);
  return raw;
}

async function seedIfMissing() {
  if (!(await has(STORAGE_KEYS.ADMINS))) await write(STORAGE_KEYS.ADMINS, INITIAL_ADMINS);
  if (!(await has(STORAGE_KEYS.MEMBERS))) await write(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  if (!(await has(STORAGE_KEYS.WEEKS))) await write(STORAGE_KEYS.WEEKS, generateDefaultWeeks());
  if (!(await has(STORAGE_KEYS.ABONOS))) await write(STORAGE_KEYS.ABONOS, []);
  if (!(await has(STORAGE_KEYS.GASTOS))) await write(STORAGE_KEYS.GASTOS, []);
  if (!(await has(STORAGE_KEYS.CONFIG))) {
    const weeks = await read(STORAGE_KEYS.WEEKS, []);
    await write(STORAGE_KEYS.CONFIG, {
      cuota_semanal: weeks[0]?.monto_cuota || 20,
      periodo_inicio: weeks[0]?.fecha_inicio || '',
      periodo_fin: weeks[weeks.length - 1]?.fecha_fin || ''
    });
  }
}

export const dbService = {
  async getAdmins() {
    await seedIfMissing();
    return read(STORAGE_KEYS.ADMINS, INITIAL_ADMINS);
  },

  async getMembers() {
    await seedIfMissing();
    return read(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  },

  async getWeeks() {
    await seedIfMissing();
    return read(STORAGE_KEYS.WEEKS, generateDefaultWeeks());
  },

  async getConfig() {
    await seedIfMissing();
    return read(STORAGE_KEYS.CONFIG, {});
  },

  async saveConfig(values) {
    await seedIfMissing();
    const config = { ...(await this.getConfig()), ...values };
    await write(STORAGE_KEYS.CONFIG, config);
    const weeks = (await this.getWeeks()).map((week) => ({
      ...week,
      monto_cuota: Number(config.cuota_semanal)
    }));
    await write(STORAGE_KEYS.WEEKS, weeks);
    return { success: true, config };
  },

  async regenerateWeeks(values) {
    await seedIfMissing();
    const start = new Date(`${values.periodo_inicio}T00:00:00`);
    const end = new Date(`${values.periodo_fin}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return { success: false, message: 'El periodo no es válido.' };
    }
    const weeks = [];
    for (let cursor = new Date(start), numero = 1; cursor <= end; numero++) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeks.push({
        id: Date.now() + numero,
        numero_semana: numero,
        fecha_inicio: formatDateISO(cursor),
        fecha_fin: formatDateISO(weekEnd),
        monto_cuota: Number(values.cuota_semanal),
        descripcion: `Semana ${numero}`
      });
      cursor.setDate(cursor.getDate() + 7);
    }
    await write(STORAGE_KEYS.WEEKS, weeks);
    await write(STORAGE_KEYS.CONFIG, values);
    return { success: true, weeks: weeks.length };
  },

  async updateAdmin({ id, nombre, usuario, pin }) {
    await seedIfMissing();
    const admins = await this.getAdmins();
    const admin = admins.find((item) => item.id === Number(id));
    if (!admin) return { success: false, message: 'Usuario no encontrado.' };
    if (admins.some((item) => item.id !== admin.id && item.usuario === usuario)) {
      return { success: false, message: 'Ese usuario ya existe.' };
    }
    admin.nombre = nombre;
    admin.usuario = usuario;
    if (pin) admin.pin = pin;
    await write(STORAGE_KEYS.ADMINS, admins);
    return { success: true, admins };
  },

  async addWeek(fecha_inicio, fecha_fin, monto_cuota, descripcion) {
    await seedIfMissing();
    const weeks = await this.getWeeks();
    const numero = weeks.length ? Math.max(...weeks.map((w) => w.numero_semana)) + 1 : 1;
    const newWeek = {
      id: Date.now(),
      numero_semana: numero,
      fecha_inicio,
      fecha_fin,
      monto_cuota: Number(monto_cuota),
      descripcion: descripcion || `Semana ${numero}`
    };
    weeks.push(newWeek);
    await write(STORAGE_KEYS.WEEKS, weeks);
    return { success: true, id: newWeek.id };
  },

  async getAbonos() {
    await seedIfMissing();
    return read(STORAGE_KEYS.ABONOS, []);
  },

  async getGastos() {
    await seedIfMissing();
    return read(STORAGE_KEYS.GASTOS, []);
  },

  async saveGasto({ concepto, categoria, monto, fecha, nota, registrado_por, archivo }) {
    await seedIfMissing();
    const gastos = await this.getGastos();
    const record = {
      id: Date.now() + Math.random(),
      concepto,
      categoria: categoria || null,
      monto: Number(monto),
      fecha,
      nota: nota || '',
      registrado_por: registrado_por || 'Tesorero',
      nombre_archivo: archivo?.nombre || null,
      mime: archivo?.mime || null,
      tamano: archivo?.tamano || 0,
      uri_archivo: archivo?.uri || null,
      tiene_archivo: archivo?.uri ? 1 : 0,
      fecha_registro: new Date().toISOString()
    };
    gastos.push(record);
    await write(STORAGE_KEYS.GASTOS, gastos);
    return { success: true, id: record.id, tiene_archivo: Boolean(record.tiene_archivo) };
  },

  async deleteGasto(id) {
    await seedIfMissing();
    const gastos = await this.getGastos();
    await write(
      STORAGE_KEYS.GASTOS,
      gastos.filter((g) => g.id !== id)
    );
    return { success: true, id };
  },

  async saveAbono({ miembro_id, semana_id, monto, registrado_por, nota }) {
    await seedIfMissing();
    const abonos = await this.getAbonos();
    const record = {
      id: Date.now() + Math.random(),
      miembro_id: Number(miembro_id),
      semana_id: Number(semana_id),
      monto: Number(monto),
      fecha_registro: new Date().toISOString(),
      registrado_por: registrado_por || 'Tesorero',
      nota: nota || ''
    };
    abonos.push(record);
    await write(STORAGE_KEYS.ABONOS, abonos);

    const weeks = await this.getWeeks();
    const week = weeks.find((w) => w.id === Number(semana_id));
    const cuota = week ? week.monto_cuota : 0;
    const total = abonos
      .filter((a) => a.miembro_id === Number(miembro_id) && a.semana_id === Number(semana_id))
      .reduce((acc, a) => acc + a.monto, 0);

    return { success: true, id: record.id, abonado: total, cuota };
  },

  async getBalanceSummary() {
    await seedIfMissing();
    const members = await this.getMembers();
    const weeks = await this.getWeeks();
    const abonos = await this.getAbonos();
    const gastos = await this.getGastos();

    const totalRecaudado = abonos.reduce((acc, a) => acc + Number(a.monto), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
    const totalEsperado = weeks.reduce((acc, w) => acc + w.monto_cuota * members.length, 0);
    const hoy = new Date().toISOString().slice(0, 10);
    const semanasCursadas = weeks.filter((w) => w.fecha_inicio <= hoy);
    const totalEsperadoCursado = semanasCursadas.reduce(
      (acc, w) => acc + w.monto_cuota * members.length,
      0
    );

    const saldoCaja = totalRecaudado - totalGastos;
    const totalDeuda = Math.max(0, totalEsperadoCursado - totalRecaudado + totalGastos);
    const porcentajeCobro = totalEsperadoCursado > 0 ? (saldoCaja / totalEsperadoCursado) * 100 : 0;

    return {
      totalRecaudado,
      totalGastos,
      saldoCaja,
      totalEsperado: totalEsperadoCursado,
      totalEsperadoPeriodo: totalEsperado,
      totalDeuda,
      porcentajeCobro: Number(porcentajeCobro.toFixed(1)),
      totalAlumnos: members.length,
      totalSemanas: weeks.length,
      semanasCursadas: semanasCursadas.length
    };
  },

  async login(usuario, pin) {
    await seedIfMissing();
    const admins = await this.getAdmins();
    const found = admins.find(
      (a) =>
        a.usuario.toLowerCase() === String(usuario).trim().toLowerCase() &&
        a.pin === String(pin).trim()
    );
    if (!found) {
      return { success: false, message: 'Credenciales inválidas. Verifica tu usuario y PIN.' };
    }

    const token = crearToken(found.usuario);
    const perfil = {
      id: found.id,
      usuario: found.usuario,
      nombre: found.nombre,
      rol: found.rol,
      timestamp: Date.now()
    };
    await write(STORAGE_KEYS.SESSION, perfil);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return { success: true, user: { ...perfil, token } };
  },

  async getSession() {
    const perfil = await read(STORAGE_KEYS.SESSION, null);
    if (!perfil) return null;
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return { ...perfil, token: token || '' };
  },

  async logout() {
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async reset() {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await seedIfMissing();
  }
};
