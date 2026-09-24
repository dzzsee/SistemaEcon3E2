// ================================================================
// Vista: Login
// ================================================================

import { iconHtml } from '../utils.js';

export function renderLogin(root, { onLogin, initialTab = 'admin' }) {
  root.className = 'app-root';
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-bg">
        <div class="blob b1"></div>
        <div class="blob b2"></div>
        <div class="blob b3"></div>
        <div class="dots"></div>
      </div>

      <div class="login-box anim-fadeUp">
        <div class="text-center">
          <div class="login-logo">${iconHtml('wallet', 'icon-lg')}</div>
          <h1 class="login-title">Control 3E2</h1>
          <p class="login-sub">Cuotas semanales · Grupo de trabajo</p>
        </div>

        <!-- Selector de tipo de acceso -->
        <div class="login-tabs" role="tablist">
          <button role="tab" id="tab-admin" class="login-tab active" aria-selected="true" data-tab="admin">
            ${iconHtml('userShield')} Administrador
          </button>
          <button role="tab" id="tab-estudiante" class="login-tab" aria-selected="false" data-tab="estudiante">
            ${iconHtml('user')} Estudiante
          </button>
        </div>

        <form id="login-form" class="glass-panel login-card">
          <!-- Formulario Administrador -->
          <div id="panel-admin" class="login-panel" role="tabpanel" aria-labelledby="tab-admin">
            <h2 style="margin:0 0 1.25rem;font-size:1.125rem;font-weight:600;color:#fff;">Acceso de administrador</h2>

            <label class="field-label" for="login-user">Usuario</label>
            <div class="input-wrap">
              ${iconHtml('user', 'input-icon')}
              <input id="login-user" class="input-with-icon" placeholder="tutor, presidente, tesorero" autocomplete="username" />
            </div>

            <label class="field-label" for="login-pin">PIN</label>
            <div class="input-wrap" style="margin-bottom:1.25rem;">
              ${iconHtml('lock', 'input-icon')}
              <input id="login-pin" class="input-with-icon" type="password" placeholder="••••" inputmode="numeric" autocomplete="current-password" />
            </div>
          </div>

          <!-- Formulario Estudiante -->
          <div id="panel-estudiante" class="login-panel hidden" role="tabpanel" aria-labelledby="tab-estudiante" hidden>
            <h2 style="margin:0 0 1.25rem;font-size:1.125rem;font-weight:600;color:#fff;">Acceso de estudiante</h2>

            <label class="field-label" for="login-cedula">Cédula</label>
            <div class="input-wrap">
              ${iconHtml('idCard', 'input-icon')}
              <input id="login-cedula" class="input-with-icon" placeholder="1712345678" inputmode="numeric" autocomplete="username" />
            </div>

            <label class="field-label" for="login-pin-est">PIN (4 dígitos)</label>
            <div class="input-wrap" style="margin-bottom:1.25rem;">
              ${iconHtml('lock', 'input-icon')}
              <input id="login-pin-est" class="input-with-icon" type="password" placeholder="••••" inputmode="numeric" maxlength="4" autocomplete="current-password" />
            </div>
          </div>

          <div id="login-error" class="login-error hidden"></div>

          <button type="submit" id="login-submit" class="btn-primary" disabled>
            ${iconHtml('lock')}
            <span>Entrar al sistema</span>
          </button>
        </form>

        <p class="login-footer">Administradores: tutor, presidente, tesorero · Estudiantes: cédula + PIN</p>
      </div>
    </div>
  `;

  const tabAdmin = root.querySelector('#tab-admin');
  const tabEstudiante = root.querySelector('#tab-estudiante');
  const panelAdmin = root.querySelector('#panel-admin');
  const panelEstudiante = root.querySelector('#panel-estudiante');

  const userInput = root.querySelector('#login-user');
  const pinInput = root.querySelector('#login-pin');
  const cedulaInput = root.querySelector('#login-cedula');
  const pinEstInput = root.querySelector('#login-pin-est');
  const errorBox = root.querySelector('#login-error');
  const submitBtn = root.querySelector('#login-submit');
  const submitLabel = submitBtn.querySelector('span');

  let currentTab = initialTab === 'estudiante' ? 'estudiante' : 'admin';

  function switchTab(tab) {
    currentTab = tab;
    if (tab === 'admin') {
      tabAdmin.classList.add('active');
      tabAdmin.setAttribute('aria-selected', 'true');
      tabEstudiante.classList.remove('active');
      tabEstudiante.setAttribute('aria-selected', 'false');
      panelAdmin.classList.remove('hidden');
      panelAdmin.removeAttribute('hidden');
      panelEstudiante.classList.add('hidden');
      panelEstudiante.setAttribute('hidden', '');
    } else {
      tabEstudiante.classList.add('active');
      tabEstudiante.setAttribute('aria-selected', 'true');
      tabAdmin.classList.remove('active');
      tabAdmin.setAttribute('aria-selected', 'false');
      panelEstudiante.classList.remove('hidden');
      panelEstudiante.removeAttribute('hidden');
      panelAdmin.classList.add('hidden');
      panelAdmin.setAttribute('hidden', '');
    }
    validate();
    setError('');
  }

  function validate() {
    if (currentTab === 'admin') {
      submitBtn.disabled = !userInput.value.trim() || !pinInput.value.trim();
    } else {
      submitBtn.disabled = !cedulaInput.value.trim() || !pinEstInput.value.trim();
    }
  }

  function setError(message) {
    if (message) {
      errorBox.textContent = message;
      errorBox.classList.remove('hidden');
    } else {
      errorBox.classList.add('hidden');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    let usuario, pin, cedula;

    if (currentTab === 'admin') {
      usuario = userInput.value.trim();
      pin = pinInput.value.trim();
      if (!usuario || !pin) return;
    } else {
      cedula = cedulaInput.value.trim();
      pin = pinEstInput.value.trim();
      if (!cedula || !pin) return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `${iconHtml('loader')}<span>Validando…</span>`;
    submitLabel.textContent = 'Validando…';

    try {
      const res = await onLogin({ usuario, pin, cedula });
      if (!res.success) {
        setError(res.message || 'Credenciales inválidas.');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      if (submitBtn.isConnected) {
        submitBtn.innerHTML = `${iconHtml('lock')}<span>Entrar al sistema</span>`;
        validate();
      }
    }
  }

  tabAdmin.addEventListener('click', () => switchTab('admin'));
  tabEstudiante.addEventListener('click', () => switchTab('estudiante'));

  root.querySelector('#login-form').addEventListener('submit', handleSubmit);
  userInput.addEventListener('input', validate);
  pinInput.addEventListener('input', validate);
  cedulaInput.addEventListener('input', validate);
  pinEstInput.addEventListener('input', validate);

  validate();
  switchTab(currentTab);
  // Focus en el campo correspondiente según la tab activa
  if (currentTab === 'admin') userInput.focus();
  else cedulaInput.focus();
}