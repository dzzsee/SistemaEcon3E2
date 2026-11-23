// Almacenamiento local (LocalStorage) usado como respaldo para desarrollo
// y para el template de conexión con Cloudflare D1 (misma lógica que las funciones).

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

const STORAGE_KEYS = {
  ADMINS: 'econ3e2_admins',
  MEMBERS: 'econ3e2_members',
  WEEKS: 'econ3e2_weeks',
  ABONOS: 'econ3e2_abonos',
  GASTOS: 'econ3e2_gastos',
  CONFIG: 'econ3e2_config',
  SESSION: '3e2_session'
};

function read(key, fallback = null) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedIfMissing() {
  if (!localStorage.getItem(STORAGE_KEYS.ADMINS)) write(STORAGE_KEYS.ADMINS, INITIAL_ADMINS);
  const members = read(STORAGE_KEYS.MEMBERS, null);
  if (!members) write(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const weeks = read(STORAGE_KEYS.WEEKS, null);
  if (!weeks) write(STORAGE_KEYS.WEEKS, generateDefaultWeeks());
  if (!localStorage.getItem(STORAGE_KEYS.ABONOS)) write(STORAGE_KEYS.ABONOS, []);
  if (!localStorage.getItem(STORAGE_KEYS.GASTOS)) write(STORAGE_KEYS.GASTOS, []);
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    const weeks = read(STORAGE_KEYS.WEEKS, []);
    write(STORAGE_KEYS.CONFIG, {
      cuota_semanal: weeks[0]?.monto_cuota || 20,
      periodo_inicio: weeks[0]?.fecha_inicio || '',
      periodo_fin: weeks.at(-1)?.fecha_fin || ''
    });
  }
}

export const dbService = {
  getAdmins() {
    seedIfMissing();
    return read(STORAGE_KEYS.ADMINS, INITIAL_ADMINS);
  },

  getMembers() {
    seedIfMissing();
    return read(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  },

  getWeeks() {
    seedIfMissing();
    return read(STORAGE_KEYS.WEEKS, generateDefaultWeeks());
  },

  getConfig() {
    seedIfMissing();
    return read(STORAGE_KEYS.CONFIG, {});
  },

  saveConfig(values) {
    seedIfMissing();
    const config = { ...this.getConfig(), ...values };
    write(STORAGE_KEYS.CONFIG, config);
    const weeks = this.getWeeks().map((week) => ({ ...week, monto_cuota: Number(config.cuota_semanal) }));
    write(STORAGE_KEYS.WEEKS, weeks);
    return { success: true, config };
  },

  regenerateWeeks(values) {
    seedIfMissing();
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
    write(STORAGE_KEYS.WEEKS, weeks);
    write(STORAGE_KEYS.CONFIG, values);
    return { success: true, weeks: weeks.length };
  },

  updateAdmin({ id, nombre, usuario, pin }) {
    seedIfMissing();
    const admins = this.getAdmins();
    const admin = admins.find((item) => item.id === Number(id));
    if (!admin) return { success: false, message: 'Usuario no encontrado.' };
    if (admins.some((item) => item.id !== admin.id && item.usuario === usuario)) {
      return { success: false, message: 'Ese usuario ya existe.' };
    }
    admin.nombre = nombre;
    admin.usuario = usuario;
    if (pin) admin.pin = pin;
    write(STORAGE_KEYS.ADMINS, admins);
    return { success: true, admins };
  },

  addWeek(fecha_inicio, fecha_fin, monto_cuota, descripcion) {
    seedIfMissing();
    const weeks = this.getWeeks();
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
    write(STORAGE_KEYS.WEEKS, weeks);
    return { success: true, id: newWeek.id };
  },

  getAbonos() {
    seedIfMissing();
    return read(STORAGE_KEYS.ABONOS, []);
  },

  getGastos() {
    seedIfMissing();
    return read(STORAGE_KEYS.GASTOS, []);
  },

  // En modo LocalStorage no hay R2: el archivo NO se conserva (solo se registra
  // el gasto). Ver GastoModal.jsx, que avisa de esto al administrador.
  saveGasto({ concepto, categoria, monto, fecha, nota, registrado_por }) {
    seedIfMissing();
    const gastos = this.getGastos();
    const record = {
      id: Date.now() + Math.random(),
      concepto,
      categoria: categoria || null,
      monto: Number(monto),
      fecha,
      nota: nota || '',
      registrado_por: registrado_por || 'Tesorero',
      nombre_archivo: null,
      mime: null,
      tamano: 0,
      tiene_archivo: 0,
      fecha_registro: new Date().toISOString()
    };
    gastos.push(record);
    write(STORAGE_KEYS.GASTOS, gastos);
    return { success: true, id: record.id, tiene_archivo: false };
  },

  deleteGasto(id) {
    seedIfMissing();
    const gastos = this.getGastos();
    write(STORAGE_KEYS.GASTOS, gastos.filter((g) => g.id !== id));
    return { success: true, id };
  },

  saveAbono({ miembro_id, semana_id, monto, registrado_por, nota }) {
    seedIfMissing();
    const abonos = this.getAbonos();
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
    write(STORAGE_KEYS.ABONOS, abonos);

    const weeks = this.getWeeks();
    const week = weeks.find((w) => w.id === Number(semana_id));
    const cuota = week ? week.monto_cuota : 0;
    const total = abonos
      .filter((a) => a.miembro_id === Number(miembro_id) && a.semana_id === Number(semana_id))
      .reduce((acc, a) => acc + a.monto, 0);

    return { success: true, id: record.id, abonado: total, cuota };
  },

  getBalanceSummary() {
    seedIfMissing();
    const members = this.getMembers();
    const weeks = this.getWeeks();
    const abonos = this.getAbonos();
    const gastos = this.getGastos();

    const totalRecaudado = abonos.reduce((acc, a) => acc + Number(a.monto), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
    const totalEsperado = weeks.reduce((acc, w) => acc + w.monto_cuota * members.length, 0);
    const hoy = new Date().toISOString().slice(0, 10);
    const semanasCursadas = weeks.filter((w) => w.fecha_inicio <= hoy);
    const totalEsperadoCursado = semanasCursadas
      .reduce((acc, w) => acc + w.monto_cuota * members.length, 0);

    // Espejo exacto de functions/api/balance.js: los gastos aumentan la deuda y
    // saldoCaja puede quedar negativo.
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

  login(usuario, pin) {
    seedIfMissing();
    const admins = this.getAdmins();
    const found = admins.find(
      (a) => a.usuario.toLowerCase() === String(usuario).trim().toLowerCase() && a.pin === pin.trim()
    );
    if (found) {
      const session = {
        id: found.id,
        usuario: found.usuario,
        nombre: found.nombre,
        rol: found.rol,
        token: btoa(`${found.usuario}:${Date.now()}`),
        timestamp: Date.now()
      };
      write(STORAGE_KEYS.SESSION, session);
      return { success: true, user: session };
    }
    return { success: false, message: 'Credenciales inválidas. Verifica tu usuario y PIN.' };
  },

  getSession() {
    return read(STORAGE_KEYS.SESSION, null);
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  reset() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    seedIfMissing();
  }
};