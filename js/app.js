// ================================================================
// Controlador principal de la aplicación (JS puro) — Router + 2 Shells
// ================================================================

import * as api from './api.js';
import { iconHtml, esc } from './utils.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderPlanilla } from './views/planilla.js';
import { openAbonoModal } from './views/abono-modal.js';
import { renderAlumnos } from './views/alumnos.js';
import { renderExportar } from './views/exportar.js';
import { renderConfiguracion } from './views/configuracion.js';
import { renderEstudianteDashboard } from './views/estudiante-dashboard.js';
import { renderEstudianteHistorial } from './views/estudiante-historial.js';

const appRoot = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const SELECTED_WEEK_KEY = '3e2_selected_week';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

function localDateISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Rutas de la aplicación
const ROUTES = {
  '/login': { view: 'login', public: true },
  '/admin': { view: 'admin', roles: ['admin'] },
  '/admin/resumen': { view: 'admin', roles: ['admin'], tab: 'resumen' },
  '/admin/planilla': { view: 'admin', roles: ['admin'], tab: 'planilla' },
  '/admin/alumnos': { view: 'admin', roles: ['admin'], tab: 'alumnos' },
  '/admin/exportar': { view: 'admin', roles: ['admin'], tab: 'exportar' },
  '/admin/configuracion': { view: 'admin', roles: ['admin'], tab: 'configuracion' },
  '/estudiante': { view: 'estudiante', roles: ['estudiante'] },
  '/estudiante/dashboard': { view: 'estudiante', roles: ['estudiante'], tab: 'dashboard' },
  '/estudiante/historial': { view: 'estudiante', roles: ['estudiante'], tab: 'historial' },
};

const ADMIN_TABS = [
  { id: 'resumen', label: 'Resumen', icon: 'dashboard' },
  { id: 'planilla', label: 'Planilla', icon: 'table' },
  { id: 'alumnos', label: 'Alumnos', icon: 'users' },
  { id: 'exportar', label: 'Exportar', icon: 'export' },
  { id: 'configuracion', label: 'Configurar', icon: 'settings' }
];

const ESTUDIANTE_TABS = [
  { id: 'dashboard', label: 'Mi Resumen', icon: 'dashboard' },
  { id: 'historial', label: 'Mi Historial', icon: 'history' }
];

const state = {
  session: null,
  status: null,
  balance: null,
  loading: false,
  route: '/login',
  adminTab: 'resumen',
  estudianteTab: 'dashboard',
  selectedWeekId: null,
  loginTab: 'admin'
};

let toastTimer = null;
let inactivityTimer = null;
let lastActivityAt = 0;

function clearInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = null;
}

function resetInactivityTimer() {
  if (!api.getSession()) {
    clearInactivityTimer();
    return;
  }

  lastActivityAt = Date.now();
  clearInactivityTimer();
  inactivityTimer = setTimeout(() => {
    const inactiveFor = Date.now() - lastActivityAt;
    if (inactiveFor >= INACTIVITY_TIMEOUT_MS && api.getSession()) {
      void handleLogout('Sesión cerrada por 15 minutos de inactividad.');
      return;
    }
    resetInactivityTimer();
  }, INACTIVITY_TIMEOUT_MS);
}

['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) => {
  window.addEventListener(eventName, resetInactivityTimer, { passive: true });
});

// ---------------- Toast ----------------

export function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  const isError = type === 'error';
  toastRoot.innerHTML = `
    <div class="toast-wrap">
      <div class="toast ${isError ? 'toast-error' : 'toast-success'}">
        ${iconHtml(isError ? 'alert' : 'check')}
        <p class="toast-msg">${message}</p>
        <button class="toast-close" data-toast-close>${iconHtml('x')}</button>
      </div>
    </div>
  `;
  toastRoot.querySelector('[data-toast-close]').addEventListener('click', () => (toastRoot.innerHTML = ''));
  toastTimer = setTimeout(() => (toastRoot.innerHTML = ''), 3500);
}

// ---------------- Router ----------------

function getRoute(path) {
  return ROUTES[path] || ROUTES['/login'];
}

function navigate(path) {
  const route = getRoute(path);
  const session = api.getSession();
  state.session = session;

  // Verificar autenticación
  if (!route.public && !session) {
    navigate('/login');
    return;
  }

  // Verificar rol
  if (!route.public && session && route.roles && !route.roles.includes(session.tipo)) {
    // Redirigir a la ruta correcta según el rol
    navigate(session.tipo === 'admin' ? '/admin' : '/estudiante');
    return;
  }

  state.route = path;
  if (route.tab) {
    if (session.tipo === 'admin') state.adminTab = route.tab;
    else state.estudianteTab = route.tab;
  }
  window.history.pushState({}, '', path);
  renderApp();
}

// Manejar botones atrás/adelante del navegador
window.addEventListener('popstate', () => {
  state.route = window.location.pathname;
  renderApp();
});

// ---------------- Boot ----------------

async function boot() {
  const session = api.getSession();
  state.session = session;

  // Si hay sesión, validar que la ruta actual sea correcta
  const currentPath = window.location.pathname;
  const route = getRoute(currentPath);

  if (!session) {
    if (!route.public) {
      navigate('/login');
      return;
    }
    renderLogin(appRoot, { onLogin: handleLogin, initialTab: state.loginTab });
    return;
  }

  resetInactivityTimer();

  // Si hay sesión pero está en login, redirigir
  if (currentPath === '/login') {
    navigate(session.tipo === 'admin' ? '/admin' : '/estudiante');
    return;
  }

  // Si la ruta no coincide con el rol, redirigir
  if (!route.public && route.roles && !route.roles.includes(session.tipo)) {
    navigate(session.tipo === 'admin' ? '/admin' : '/estudiante');
    return;
  }

  state.route = currentPath;
  if (route.tab) {
    if (session.tipo === 'admin') state.adminTab = route.tab;
    else state.estudianteTab = route.tab;
  }

  await loadData();
}

async function handleLogin(credentials) {
  const res = await api.login(credentials);
  if (res.success) {
    state.session = res.user;
    resetInactivityTimer();
    modalRoot.innerHTML = '';
    toastRoot.innerHTML = '';
    showToast(`Bienvenido, ${res.user.nombre}.`);
    const loaded = await loadData();
    if (!loaded || !api.getSession()) return res;
    // Navegar a la ruta inicial según rol
    navigate(res.user.tipo === 'admin' ? '/admin' : '/estudiante');
  }
  return res;
}

async function handleLogout(message = '') {
  const previousTipo = state.session?.tipo || api.getSession()?.tipo;
  clearInactivityTimer();
  api.logout();
  state.session = null;
  state.status = null;
  state.balance = null;
  state.adminTab = 'resumen';
  state.estudianteTab = 'dashboard';
  state.selectedWeekId = null;
  state.loginTab = previousTipo === 'estudiante' ? 'estudiante' : 'admin';
  modalRoot.innerHTML = '';
  toastRoot.innerHTML = '';
  navigate('/login');
  if (message) showToast(message, 'error');
}

// ---------------- Datos ----------------

async function loadData() {
  try {
    state.loading = true;
    const [status, balance] = await Promise.all([api.getStatus(), api.getBalance()]);
    state.status = status;
    state.balance = balance;
    if (!state.selectedWeekId && status.weeks.length) {
      const today = localDateISO();
      const currentWeek = status.weeks.find(
        (week) => week.fecha_inicio <= today && week.fecha_fin >= today
      );
      const savedWeekId = Number(localStorage.getItem(SELECTED_WEEK_KEY));
      const savedWeek = status.weeks.find((week) => week.id === savedWeekId);
      const mobile = window.matchMedia('(max-width: 639px)').matches;
      state.selectedWeekId = mobile
        ? currentWeek?.id || savedWeek?.id || status.weeks[status.weeks.length - 1].id
        : savedWeek?.id || currentWeek?.id || status.weeks[status.weeks.length - 1].id;
    }
  } catch (err) {
    if (err && err.message === 'no-auth') {
      showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
      await handleLogout();
      return false;
    }
    showToast(err.message || 'No se pudo cargar la información.', 'error');
  } finally {
    state.loading = false;
    renderApp();
  }
  return Boolean(state.status && state.balance);
}

async function refresh() {
  await loadData();
}

// ---------------- Render Principal ----------------

function renderApp() {
  const route = getRoute(state.route);

  if (route.view === 'login') {
    renderLogin(appRoot, { onLogin: handleLogin, initialTab: state.loginTab });
    return;
  }

  if (state.session.tipo === 'admin') {
    if (appRoot.dataset.shell !== 'admin') renderAdminShell();
    else renderAdminTabbar();
    renderAdminTab();
  } else {
    if (appRoot.dataset.shell !== 'estudiante') renderEstudianteShell();
    else renderEstudianteTabbar();
    renderEstudianteTab();
  }
}

// ---------------- Admin Shell ----------------

function renderAdminShell() {
  const info = rolLabel(state.session.rol);
  appRoot.className = 'app-root';
  appRoot.dataset.shell = 'admin';
  appRoot.innerHTML = `
    <div class="bg-decor">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <header class="header">
      <div class="container header-inner">
        <button class="logo-btn" data-nav="resumen">
          <span class="logo-badge">${iconHtml('wallet')}</span>
          <span>
            <p class="logo-title">Control 3E2</p>
            <p class="logo-sub">Administración</p>
          </span>
        </button>
        <div class="flex items-center" style="gap:0.5rem;">
          <span class="role-badge ${info.cls}"><span class="dot"></span>${info.label} · ${esc(state.session.nombre)}</span>
          <button class="btn-logout" data-logout>
            ${iconHtml('logout')}<span class="logout-text">Salir</span>
          </button>
        </div>
      </div>
    </header>

    <nav class="tabbar" id="tabbar"></nav>

    <main class="main">
      <div class="container" id="content"></div>
    </main>

    <nav class="bottomnav">
      <div class="bottomnav-inner"></div>
    </nav>
  `;

  appRoot.querySelector('[data-logout]').addEventListener('click', () => handleLogout());
  appRoot.querySelector('[data-nav]').addEventListener('click', () => navigate('/admin/resumen'));

  if (window.matchMedia('(max-width: 639px)').matches) {
    appRoot.querySelector('.logout-text').style.display = 'none';
  }

  renderAdminTabbar();
}

function renderAdminTabbar() {
  const tabbar = appRoot.querySelector('#tabbar');
  const bottom = appRoot.querySelector('.bottomnav-inner');
  if (!tabbar || !bottom) return;

  tabbar.innerHTML = `<div class="container tabbar-inner no-scrollbar">
    ${ADMIN_TABS.map(
      (t) =>
        `<button class="tab ${state.adminTab === t.id ? 'tab-active' : ''}" data-tab="${t.id}">${iconHtml(t.icon)} ${t.label}</button>`
    ).join('')}
  </div>`;

  bottom.innerHTML = ADMIN_TABS.map(
    (t) =>
      `<button class="bottomnav-btn ${state.adminTab === t.id ? 'bottomnav-btn-active' : ''}" data-tab="${t.id}">
        ${iconHtml(t.icon)} ${t.label}
      </button>`
  ).join('');

  appRoot.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`/admin/${btn.dataset.tab}`));
  });
}

function renderAdminTab() {
  const content = appRoot.querySelector('#content');
  if (!content) return;

  if (state.loading && !state.status) {
    content.innerHTML = `<div class="loader-wrap"><div class="spinner"></div></div>`;
    return;
  }

  if (!state.status || !state.balance) {
    return;
  }

  const ctx = {
    status: state.status,
    balance: state.balance,
    session: state.session,
    showToast,
    refresh,
    onNavigate: (tab) => navigate(`/admin/${tab}`),
    selectedWeekId: state.selectedWeekId,
    onSelectWeek: (id) => {
      state.selectedWeekId = id;
      localStorage.setItem(SELECTED_WEEK_KEY, String(id));
      navigate(`/admin/planilla`);
    },
    openAbono,
    onCreateWeek: async (payload) => {
      await api.createWeek(payload);
      await refresh();
    }
  };

  switch (state.adminTab) {
    case 'resumen':
      renderDashboard(content, ctx);
      break;
    case 'planilla':
      renderPlanilla(content, ctx);
      break;
    case 'alumnos':
      renderAlumnos(content, ctx);
      break;
    case 'exportar':
      renderExportar(content, ctx);
      break;
    case 'configuracion':
      renderConfiguracion(content, ctx);
      break;
  }
}

// ---------------- Estudiante Shell ----------------

function renderEstudianteShell() {
  appRoot.className = 'app-root';
  appRoot.dataset.shell = 'estudiante';
  appRoot.innerHTML = `
    <div class="bg-decor">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <header class="header header-estudiante">
      <div class="container header-inner">
        <div class="estudiante-brand">
          <span class="logo-badge">${iconHtml('wallet')}</span>
          <span>
            <p class="logo-title">Control 3E2</p>
            <p class="logo-sub">Mi consulta</p>
          </span>
        </div>
        <div class="flex items-center" style="gap:0.5rem;">
          <span class="role-badge role-estudiante"><span class="dot"></span>Estudiante · ${esc(state.session.nombre)}</span>
          <button class="btn-logout" data-logout>
            ${iconHtml('logout')}<span class="logout-text">Salir</span>
          </button>
        </div>
      </div>
    </header>

    <nav class="tabbar tabbar-estudiante" id="tabbar"></nav>

    <main class="main">
      <div class="container" id="content"></div>
    </main>
  `;

  appRoot.querySelector('[data-logout]').addEventListener('click', () => handleLogout());

  if (window.matchMedia('(max-width: 639px)').matches) {
    appRoot.querySelector('.logout-text').style.display = 'none';
  }

  renderEstudianteTabbar();
}

function renderEstudianteTabbar() {
  const tabbar = appRoot.querySelector('#tabbar');
  if (!tabbar) return;

  tabbar.innerHTML = `<div class="container tabbar-inner no-scrollbar">
    ${ESTUDIANTE_TABS.map(
      (t) =>
        `<button class="tab ${state.estudianteTab === t.id ? 'tab-active' : ''}" data-tab="${t.id}">${iconHtml(t.icon)} ${t.label}</button>`
    ).join('')}
  </div>`;

  appRoot.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`/estudiante/${btn.dataset.tab}`));
  });
}

function renderEstudianteTab() {
  const content = appRoot.querySelector('#content');
  if (!content) return;

  if (state.loading && !state.status) {
    content.innerHTML = `<div class="loader-wrap"><div class="spinner"></div></div>`;
    return;
  }

  if (!state.status || !state.balance) {
    return;
  }

  const ctx = {
    status: state.status,
    balance: state.balance,
    session: state.session,
    showToast,
    refresh,
    onNavigate: (tab) => navigate(`/estudiante/${tab}`)
  };

  switch (state.estudianteTab) {
    case 'dashboard':
      renderEstudianteDashboard(content, ctx);
      break;
    case 'historial':
      renderEstudianteHistorial(content, ctx);
      break;
  }
}

// ---------------- Modal de abono (solo admin) ----------------

function openAbono({ member, week }) {
  openAbonoModal(modalRoot, {
    member,
    week,
    status: state.status,
    session: state.session,
    showToast,
    onClose: () => {
      modalRoot.innerHTML = '';
    },
    onSaved: async (payload) => {
      await api.addAbono(payload);
      await refresh();
    },
    onDeleted: async (payload) => {
      await api.deleteAbonos(payload);
      await refresh();
    }
  });
}

// ---------------- Auxiliares ----------------

const ROL_LABELS = {
  tutor: { label: 'Tutor(a)', cls: 'role-tutor' },
  presidente: { label: 'Presidente', cls: 'role-presidente' },
  tesorero: { label: 'Tesorero', cls: 'role-tesorero' }
};

function rolLabel(rol) {
  return ROL_LABELS[rol] || ROL_LABELS.tesorero;
}

// ---------------- Arranque ----------------

boot();