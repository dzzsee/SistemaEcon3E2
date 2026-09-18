// ================================================================
// Controlador principal de la aplicación (JS puro)
// ================================================================

import * as api from './api.js';
import { iconHtml, esc } from './utils.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderPlanilla } from './views/planilla.js';
import { openAbonoModal } from './views/abono-modal.js';
import { renderAlumnos } from './views/alumnos.js';
import { renderExportar } from './views/exportar.js';

const appRoot = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: 'dashboard' },
  { id: 'planilla', label: 'Planilla', icon: 'table' },
  { id: 'alumnos', label: 'Alumnos', icon: 'users' },
  { id: 'exportar', label: 'Exportar', icon: 'export' }
];

const state = {
  session: null,
  status: null,
  balance: null,
  loading: false,
  tab: 'resumen',
  selectedWeekId: null
};

let toastTimer = null;

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

// ---------------- Boot ----------------

async function boot() {
  const session = api.getSession();
  state.session = session;

  if (!session) {
    renderLogin(appRoot, { onLogin: handleLogin });
    return;
  }

  renderShell();
  await loadData();
}

async function handleLogin(usuario, pin) {
  const res = await api.login(usuario, pin);
  if (res.success) {
    state.session = res.user;
    modalRoot.innerHTML = '';
    toastRoot.innerHTML = '';
    renderShell();
    showToast(`Bienvenido, ${res.user.nombre}.`);
    await loadData();
  }
  return res;
}

async function handleLogout() {
  api.logout();
  state.session = null;
  state.status = null;
  state.balance = null;
  state.tab = 'resumen';
  state.selectedWeekId = null;
  modalRoot.innerHTML = '';
  toastRoot.innerHTML = '';
  renderLogin(appRoot, { onLogin: handleLogin });
}

// ---------------- Datos ----------------

async function loadData() {
  try {
    state.loading = true;
    renderTabbar();
    const [status, balance] = await Promise.all([api.getStatus(), api.getBalance()]);
    state.status = status;
    state.balance = balance;
    if (!state.selectedWeekId && status.weeks.length) {
      state.selectedWeekId = status.weeks[status.weeks.length - 1].id;
    }
  } catch (err) {
    if (err && err.message === 'no-auth') {
      showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
      await handleLogout();
      return;
    }
    showToast(err.message || 'No se pudo cargar la información.', 'error');
  } finally {
    state.loading = false;
    renderTab();
  }
}

async function refresh() {
  await loadData();
}

// ---------------- Shell (header + tabs + bottom nav) ----------------

function renderShell() {
  const info = rolLabel(state.session.rol);
  appRoot.className = 'app-root';
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
            <p class="logo-sub">Cuotas semanales</p>
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

  appRoot.querySelector('[data-logout]').addEventListener('click', handleLogout);
  appRoot.querySelector('[data-nav]').addEventListener('click', () => navigate('resumen'));

  // Logout con etiqueta oculta en móvil
  if (window.matchMedia('(max-width: 639px)').matches) {
    appRoot.querySelector('.logout-text').style.display = 'none';
  }

  renderTabbar();
}

function renderTabbar() {
  const tabbar = appRoot.querySelector('#tabbar');
  const bottom = appRoot.querySelector('.bottomnav-inner');
  if (!tabbar || !bottom) return;

  tabbar.innerHTML = `<div class="container tabbar-inner no-scrollbar">
    ${TABS.map(
      (t) =>
        `<button class="tab ${state.tab === t.id ? 'tab-active' : ''}" data-tab="${t.id}">${iconHtml(t.icon)} ${t.label}</button>`
    ).join('')}
  </div>`;

  bottom.innerHTML = TABS.map(
    (t) =>
      `<button class="bottomnav-btn ${state.tab === t.id ? 'bottomnav-btn-active' : ''}" data-tab="${t.id}">
        ${iconHtml(t.icon)} ${t.label}
      </button>`
  ).join('');

  appRoot.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });
}

function navigate(tabId) {
  state.tab = tabId;
  renderTabbar();
  renderTab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------- Contenido de pestañas ----------------

function renderTab() {
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
    onNavigate: navigate,
    selectedWeekId: state.selectedWeekId,
    onSelectWeek: (id) => (state.selectedWeekId = id),
    openAbono,
    onCreateWeek: async (payload) => {
      await api.createWeek(payload);
      await refresh();
    }
  };

  switch (state.tab) {
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
  }
}

// ---------------- Modal de abono ----------------

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