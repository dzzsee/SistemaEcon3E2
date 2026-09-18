// ================================================================
// Vista: Configuración (valores del periodo + usuarios)
// ================================================================

import * as api from '../api.js';
import { iconHtml, esc } from '../utils.js';

export function renderConfiguracion(parent, { showToast, refresh }) {
  parent.innerHTML = `<div class="loader-wrap"><div class="spinner"></div></div>`;

  let cfg = null;
  let admins = null;

  async function load() {
    try {
      const data = await api.getConfig();
      cfg = data.config;
      admins = data.admins;
      render();
    } catch (err) {
      parent.innerHTML = `
        <div class="glass-panel rounded-2xl p-5">
          <p style="color:var(--rose-400);">${iconHtml('alert')} No se pudo cargar la configuración.</p>
        </div>`;
      showToast(err.message || 'Error al cargar configuración.', 'error');
    }
  }

  function render() {
    parent.innerHTML = `
      <div class="space-y-6">
        <div class="anim-fadeUp">
          <h1 class="page-head-title">${iconHtml('settings')} Configuración</h1>
          <p class="page-head-sub">Cuota semanal, periodo lectivo y acceso de los administradores.</p>
        </div>

        <!-- Cuota y periodo -->
        <div class="glass-panel rounded-2xl p-5 anim-fadeUp" style="animation-delay:80ms;">
          <div class="weeks-panel-head" style="margin-bottom:1rem;">
            <h2 class="weeks-panel-title">${iconHtml('coins')} Cuota y periodo lectivo</h2>
          </div>

          <form id="config-form" class="new-week-form">
            <div>
              <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Cuota semanal ($)</label>
              <input class="input-plain" type="number" name="cuota" min="0.01" step="0.01" value="${cfg.cuota_semanal}" required />
            </div>
            <div>
              <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Inicio del periodo</label>
              <input class="input-plain" type="date" name="inicio" value="${cfg.periodo_inicio}" required />
            </div>
            <div>
              <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Fin del periodo</label>
              <input class="input-plain" type="date" name="fin" value="${cfg.periodo_fin}" required />
            </div>
            <div class="submit-cell">
              <div class="flex-1">
                <button type="button" class="btn-danger" data-regenerate>${iconHtml('calendarPlus')} Regenerar semanas (borra abonos)</button>
              </div>
              <button type="submit" class="btn-submit-teal" data-save-config>${iconHtml('check')} Guardar</button>
            </div>
          </form>
          <p class="config-hint">Guardar actualiza la cuota y el periodo. "Regenerar semanas" reconstruye el calendario completo y elimina los abonos existentes.</p>
        </div>

        <!-- Usuarios -->
        <div class="glass-panel rounded-2xl p-5 anim-fadeUp" style="animation-delay:160ms;">
          <div class="weeks-panel-head" style="margin-bottom:1rem;">
            <h2 class="weeks-panel-title">${iconHtml('users')} Usuarios administradores</h2>
          </div>
          <div class="cfg-admin-list">
            ${admins
              .map(
                (a) => `
                  <div class="cfg-admin-item" data-admin="${a.id}">
                    <div class="cfg-admin-fields">
                      <div>
                        <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Nombre</label>
                        <input class="input-plain admin-nombre" value="${esc(a.nombre)}" />
                      </div>
                      <div>
                        <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Usuario</label>
                        <input class="input-plain admin-usuario" value="${esc(a.usuario)}" autocomplete="off" />
                      </div>
                      <div>
                        <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">PIN nuevo (opcional)</label>
                        <input class="input-plain admin-pin" type="password" inputmode="numeric" placeholder="••••" autocomplete="new-password" />
                      </div>
                    </div>
                    <div class="cfg-admin-actions">
                      <span class="role-badge ${rolCls(a.rol)}"><span class="dot"></span>${rolLabel(a.rol)}</span>
                      <button type="button" class="btn-teal" data-save-admin="${a.id}">${iconHtml('check')} Guardar</button>
                    </div>
                  </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    parent.querySelector('#config-form').addEventListener('submit', onSaveConfig);
    parent.querySelector('[data-regenerate]').addEventListener('click', onRegenerate);

    parent.querySelectorAll('[data-save-admin]').forEach((btn) => {
      btn.addEventListener('click', () => onSaveAdmin(Number(btn.dataset.saveAdmin)));
    });
  }

  async function onSaveConfig(e) {
    e.preventDefault();
    const form = parent.querySelector('#config-form');
    const data = new FormData(form);
    const payload = {
      cuota_semanal: Number(data.get('cuota')),
      periodo_inicio: data.get('inicio'),
      periodo_fin: data.get('fin')
    };
    try {
      const res = await api.saveConfig(payload);
      if (!res.success) throw new Error(res.message || 'No se pudo guardar.');
      cfg = res.config;
      showToast('Configuración guardada.');
      render();
    } catch (err) {
      showToast(err.message || 'No se pudo guardar la configuración.', 'error');
    }
  }

  async function onRegenerate() {
    if (!confirm('¿Reconstruir todas las semanas del periodo? Se eliminarán todos los abonos registrados.')) return;
    const form = parent.querySelector('#config-form');
    const data = new FormData(form);
    const payload = {
      cuota_semanal: Number(data.get('cuota')),
      periodo_inicio: data.get('inicio'),
      periodo_fin: data.get('fin')
    };
    try {
      const res = await api.regenerateWeek(payload);
      if (!res.success) throw new Error(res.message || 'No se pudo regenerar.');
      await api.saveConfig(payload);
      showToast(`Periodo regenerado: ${res.weeks} semanas.`);
      await refresh();
      await load();
    } catch (err) {
      showToast(err.message || 'No se pudieron regenerar las semanas.', 'error');
    }
  }

  async function onSaveAdmin(id) {
    const item = parent.querySelector(`[data-admin="${id}"]`);
    const nombre = item.querySelector('.admin-nombre').value.trim();
    const usuario = item.querySelector('.admin-usuario').value.trim();
    const pin = item.querySelector('.admin-pin').value.trim();
    try {
      const res = await api.updateAdmin({ id, nombre, usuario, pin });
      if (!res.success) throw new Error(res.message || 'No se pudo guardar.');
      admins = res.admins;
      showToast('Usuario actualizado.');
      render();
    } catch (err) {
      showToast(err.message || 'No se pudo guardar el usuario.', 'error');
    }
  }

  function rolCls(rol) {
    return { tutor: 'role-tutor', presidente: 'role-presidente', tesorero: 'role-tesorero' }[rol] || 'role-tesorero';
  }

  function rolLabel(rol) {
    return { tutor: 'Tutor(a)', presidente: 'Presidente', tesorero: 'Tesorero' }[rol] || rol;
  }

  load();
}