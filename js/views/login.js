// ================================================================
// Vista: Login
// ================================================================

import { iconHtml } from '../utils.js';

const QUICK = [
  { rol: 'tutor', usuario: 'tutor', pin: '1234', label: 'Tutor(a)' },
  { rol: 'presidente', usuario: 'presidente', pin: '2345', label: 'Presidente' },
  { rol: 'tesorero', usuario: 'tesorero', pin: '3456', label: 'Tesorero' }
];

export function renderLogin(root, { onLogin }) {
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

        <form id="login-form" class="glass-panel login-card">
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

          <div id="login-error" class="login-error hidden"></div>

          <button type="submit" id="login-submit" class="btn-primary" disabled>
            ${iconHtml('lock')}
            <span>Entrar al sistema</span>
          </button>
        </form>

        <div class="quick-card">
          <div class="quick-heading">
            ${iconHtml('feather')}
            <span>Acceso rápido (demo)</span>
          </div>
          <div class="quick-grid">
            ${QUICK.map(
              (q) =>
                `<button type="button" class="quick-btn" data-usuario="${q.usuario}" data-pin="${q.pin}">${q.label}</button>`
            ).join('')}
          </div>
          <div class="mode-hint">${iconHtml('cloud')} Conexión Cloudflare D1 detectada automáticamente</div>
        </div>

        <p class="login-footer">Solo el tutor, presidente y tesorero tienen acceso</p>
      </div>
    </div>
  `;

  const userInput = root.querySelector('#login-user');
  const pinInput = root.querySelector('#login-pin');
  const errorBox = root.querySelector('#login-error');
  const submitBtn = root.querySelector('#login-submit');
  const submitLabel = submitBtn.querySelector('span');

  function validate() {
    submitBtn.disabled = !userInput.value.trim() || !pinInput.value.trim();
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
    const usuario = userInput.value.trim();
    const pin = pinInput.value.trim();
    if (!usuario || !pin) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `${iconHtml('loader')}<span>Validando…</span>`;
    submitLabel.textContent = 'Validando…';

    try {
      const res = await onLogin(usuario, pin);
      if (!res.success) {
        setError(res.message || 'Credenciales inválidas.');
        submitBtn.innerHTML = `${iconHtml('lock')}<span>Entrar al sistema</span>`;
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      submitBtn.innerHTML = `${iconHtml('lock')}<span>Entrar al sistema</span>`;
    }
  }

  root.querySelector('#login-form').addEventListener('submit', handleSubmit);
  userInput.addEventListener('input', validate);
  pinInput.addEventListener('input', validate);

  root.querySelectorAll('.quick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      userInput.value = btn.dataset.usuario;
      pinInput.value = btn.dataset.pin;
      userInput.dispatchEvent(new Event('input'));
      pinInput.dispatchEvent(new Event('input'));
    });
  });

  validate();
  pinInput.focus();
}