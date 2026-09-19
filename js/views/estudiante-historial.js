// ================================================================
// Vista: Estudiante - Mi Historial completo
// ================================================================

import { money, weekLabel, estadoInfo, iconHtml, esc } from '../utils.js';

export function renderEstudianteHistorial(parent, { status, balance, session, showToast, refresh, onNavigate }) {
  const miembroId = session.id;

  const weekRows = status.weeks.map((w) => {
    const key = `${miembroId}-${w.id}`;
    const g = status.grouped ? status.grouped[key] : null;
    const abonado = g ? Number(g.total) : 0;
    const cuota = Number(w.monto_cuota);
    const deuda = Math.max(0, cuota - abonado);
    const estado = abonado >= cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
    return { week: w, abonado, deuda, estado };
  });

  // Separar: semanas con deuda primero, luego pagadas
  const conDeuda = weekRows.filter((r) => r.estado !== 'pagado');
  const pagadas = weekRows.filter((r) => r.estado === 'pagado');

  function renderWeekRow(item, index) {
    const { week, abonado, deuda, estado } = item;
    const est = estadoInfo(estado);
    const isPaid = estado === 'pagado';

    return `
      <div class="glass-card historial-row ${isPaid ? 'historial-row-pagado' : ''}" style="animation-delay:${index * 30}ms;">
        <div class="historial-week">
          <span class="historial-week-label">${iconHtml('calendar')} ${weekLabel(week)}</span>
          <span class="historial-week-date">${week.fecha_inicio} → ${week.fecha_fin}</span>
        </div>
        <div class="historial-details">
          <div class="historial-amounts">
            <span class="amount-row">
              <span class="amount-label">${iconHtml('coins')} Cuota:</span>
              <span class="amount-value">${money(cuota)}</span>
            </span>
            <span class="amount-row">
              <span class="amount-label">${iconHtml('wallet')} Abonado:</span>
              <span class="amount-value text-emerald-400">${money(abonado)}</span>
            </span>
            ${deuda > 0 ? `
            <span class="amount-row">
              <span class="amount-label">${iconHtml('alert')} Deuda:</span>
              <span class="amount-value text-rose-400">${money(deuda)}</span>
            </span>
            ` : ''}
          </div>
          <div class="historial-estado">
            <span class="badge-pill ${est.cls}">${est.label}${estado === 'abonado' ? ` (falta ${money(deuda)})` : ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  parent.innerHTML = `
    <div class="space-y-6">
      <div class="anim-fadeUp">
        <h1 class="page-head-title">${iconHtml('history')} Mi historial de cuotas</h1>
        <p class="page-head-sub">Detalle semana a semana de tus pagos y deudas.</p>
      </div>

      ${conDeuda.length > 0 ? `
      <div class="space-y-4">
        <div class="section-head">
          <h2 class="section-title">${iconHtml('alert')} Semanas con deuda (${conDeuda.length})</h2>
        </div>
        <div class="historial-list">
          ${conDeuda.map(renderWeekRow).join('')}
        </div>
      </div>
      ` : ''}

      ${pagadas.length > 0 ? `
      <div class="space-y-4">
        <div class="section-head">
          <h2 class="section-title">${iconHtml('checkCircle')} Semanas al día (${pagadas.length})</h2>
        </div>
        <div class="historial-list">
          ${pagadas.map(renderWeekRow).join('')}
        </div>
      </div>
      ` : ''}

      ${weekRows.length === 0 ? `
      <div class="glass-panel rounded-2xl p-8 text-center anim-fadeUp">
        ${iconHtml('calendar', 'text-4xl', 'text-emerald-400')}
        <p class="mt-4" style="color:var(--text-2);">No hay semanas registradas en el periodo.</p>
      </div>
      ` : ''}
    </div>
  `;
}