// ================================================================
// Vista: Modal de abono
// ================================================================

import { money, weekLabel, iconHtml } from '../utils.js';

export function openAbonoModal(root, { member, week, status, session, showToast, onClose, onSaved, onDeleted }) {
  function getCurrentAbonado() {
    const key = `${member.numero_lista}-${week.id}`;
    const g = status.grouped ? status.grouped[key] : null;
    return g ? Number(g.total) : 0;
  }

  let currentAbonado = getCurrentAbonado();
  let pendiente = Math.max(0, Number(week.monto_cuota) - currentAbonado);
  let monto = pendiente > 0 ? pendiente : '';
  let nota = '';
  let loading = false;

  function getAbonos() {
    const key = `${member.numero_lista}-${week.id}`;
    const g = status.grouped ? status.grouped[key] : null;
    return g?.abonos || [];
  }

  const presets = () => {
    const cuota = Number(week.monto_cuota);
    const list = [cuota, cuota * 2, cuota * 4, 5, 10, 20];
    if (pendiente > 0 && !list.includes(pendiente)) list.push(pendiente);
    if (currentAbonado > 0 && !list.includes(currentAbonado)) list.push(currentAbonado);
    return [...new Set(list)].sort((a, b) => a - b).slice(0, 6);
  };

  function render() {
    const previas = presets();
    root.innerHTML = `
      <div class="modal-overlay" id="abono-overlay">
        <div class="glass-panel modal-sheet anim-slideUp">
          <div class="modal-head">
            <button class="modal-close" data-close>${iconHtml('x')}</button>
            <p class="modal-eyebrow">#${member.numero_lista} · Semana ${week.numero_semana}</p>
            <h3 class="modal-title">${member.nombre}</h3>
            <p class="modal-sub">${weekLabel(week)}</p>
          </div>

          <form id="abono-form" class="modal-body">
            <div class="summary-grid">
              <div class="summary-box">
                <p class="summary-label">Cuota</p>
                <p class="summary-value">${money(week.monto_cuota)}</p>
              </div>
              <div class="summary-box summary-box-emerald">
                <p class="summary-label">Abonado</p>
                <p class="summary-value v-emerald">${money(currentAbonado)}</p>
              </div>
              <div class="summary-box ${pendiente > 0 ? 'summary-box-rose' : 'summary-box-emerald'}">
                <p class="summary-label">Pendiente</p>
                <p class="summary-value ${pendiente > 0 ? 'v-rose' : 'v-emerald'}">${money(pendiente)}</p>
              </div>
            </div>

            ${
              currentAbonado >= Number(week.monto_cuota)
                ? `<div class="info-cover">${iconHtml('check')} Esta cuota ya está cubierta. Puedes registrar un aporte voluntario.</div>`
                : ''
            }

            <label class="field-label" for="abono-monto">Monto del abono</label>
            <div class="input-wrap" style="margin-bottom:0.75rem;">
              <span class="input-icon" style="color:var(--emerald-400);">${iconHtml('banknote')}</span>
              <input id="abono-monto" class="input-with-icon monto-input" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00" value="${monto}" autofocus />
            </div>

            <div class="preset-grid">
              ${previas
                .map(
                  (p) =>
                    `<button type="button" class="preset-btn" data-preset="${p}">${money(p)}</button>`
                )
                .join('')}
            </div>

            <label class="field-label" for="abono-nota">Nota (opcional)</label>
            <input id="abono-nota" class="input-plain" style="margin-bottom:1.25rem;" placeholder="Ej: Pago parcial, abono en efectivo…" value="${nota}" />

            <button type="submit" class="modal-submit" data-submit>
              ${iconHtml('check')} Registrar abono de ${money(Number(monto) || 0)}
            </button>

            ${currentAbonado > 0 ? `
              <button type="button" class="btn-danger" data-delete-payment>
                ${iconHtml('trash')} Quitar cuota registrada
              </button>
              <p class="config-hint">Elimina todos los abonos de esta cuota si fueron registrados por equivocación.</p>
            ` : ''}

            <p class="modal-registered-by">Registrado por: ${session.nombre} (${session.rol})</p>
          </form>
        </div>
      </div>
    `;

    const overlay = root.querySelector('#abono-overlay');
    const form = root.querySelector('#abono-form');
    const montoInput = root.querySelector('#abono-monto');
    const notaInput = root.querySelector('#abono-nota');
    const submitBtn = root.querySelector('[data-submit]');
    const submitText = submitBtn.lastChild;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    root.querySelector('[data-close]').addEventListener('click', close);

    const deleteBtn = root.querySelector('[data-delete-payment]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDelete);
    }

    function updateSubmit() {
      const num = Number(montoInput.value);
      submitBtn.disabled = loading || !num || num <= 0;
      submitText.textContent = ` Registrar abono de ${money(num || 0)}`;
    }

    montoInput.addEventListener('input', () => {
      monto = montoInput.value;
      root.querySelectorAll('.preset-btn').forEach((b) => {
        b.classList.toggle('preset-btn-active', Number(b.dataset.preset) === Number(monto));
      });
      updateSubmit();
    });

    notaInput.addEventListener('input', () => {
      nota = notaInput.value;
    });

    root.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        montoInput.value = btn.dataset.preset;
        montoInput.dispatchEvent(new Event('input'));
      });
    });

    form.addEventListener('submit', handleSubmit);
    updateSubmit();
    montoInput.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const num = Number(monto);
    if (!num || num <= 0) return;
    loading = true;
    const btn = root.querySelector('[data-submit]');
    btn.disabled = true;

    try {
      await onSaved({
        miembro_id: member.numero_lista,
        semana_id: week.id,
        monto: num,
        nota
      });
      const justo = num >= pendiente && pendiente > 0;
      showToast(justo ? `${member.nombre} quedó al corriente :)` : `Abono de ${money(num)} registrado para ${member.nombre}.`);
      close();
    } catch (err) {
      showToast(err.message || 'No se pudo registrar el abono.', 'error');
      loading = false;
      const submitBtn = root.querySelector('[data-submit]');
      submitBtn.disabled = false;
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Quitar la cuota registrada de ${member.nombre} para la Semana ${week.numero_semana}?`)) return;
    loading = true;
    const deleteBtn = root.querySelector('[data-delete-payment]');
    if (deleteBtn) deleteBtn.disabled = true;

    try {
      await onDeleted({ miembro_id: member.numero_lista, semana_id: week.id });
      showToast(`Cuota eliminada para ${member.nombre}.`);
      close();
    } catch (err) {
      showToast(err.message || 'No se pudo quitar la cuota.', 'error');
      loading = false;
      if (deleteBtn) deleteBtn.disabled = false;
    }
  }

  function close() {
    root.innerHTML = '';
    onClose();
  }

  render();
}