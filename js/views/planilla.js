// ================================================================
// Vista: Planilla (matriz miembro × semana)
// ================================================================

import { money, weekLabel, estadoInfo, computeEstado, buildMatrix, iconHtml, esc } from '../utils.js';

export function renderPlanilla(
  parent,
  { status, balance, selectedWeekId, onSelectWeek, openAbono, refresh, session, showToast }
) {
  const weeks = status.weeks;
  if (!weeks.length) {
    parent.innerHTML = `<div class="py-24 text-center text-sm" style="color:var(--text-3)">No hay semanas registradas.</div>`;
    return;
  }

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) || weeks[weeks.length - 1];
  const matrix = buildMatrix(status);

  // Resumen de la semana seleccionada
  let pagados = 0;
  let abonados = 0;
  let deudas = 0;
  let recaudado = 0;
  for (const m of status.members) {
    const key = `${m.numero_lista}-${selectedWeek.id}`;
    const g = status.grouped ? status.grouped[key] : null;
    const abonado = g ? Number(g.total) : 0;
    recaudado += abonado;
    if (abonado >= Number(selectedWeek.monto_cuota)) pagados++;
    else if (abonado > 0) abonados++;
    else deudas++;
  }
  const esperado = Number(selectedWeek.monto_cuota) * status.members.length;

  parent.innerHTML = `
    <div class="space-y-5">
      <div class="week-selector">
        <button class="sel-arrow" data-arrow="-1" aria-label="Semana anterior">${iconHtml('chevronLeft')}</button>
        <div class="week-pills no-scrollbar">
          ${weeks
            .map(
              (w) =>
                `<button class="week-pill ${w.id === selectedWeek.id ? 'week-pill-active' : ''}" data-week="${w.id}">Sem. ${w.numero_semana}</button>`
            )
            .join('')}
        </div>
        <button class="sel-arrow" data-arrow="1" aria-label="Semana siguiente">${iconHtml('chevronRight')}</button>
      </div>

      <div class="glass-panel week-head">
        <div class="flex flex-wrap items-center justify-between" style="gap:0.75rem;">
          <div>
            <h2 class="week-title">${iconHtml('coins')} ${weekLabel(selectedWeek)}</h2>
            <p class="week-desc">Cuota semanal de ${money(selectedWeek.monto_cuota)} por integrante</p>
          </div>
          <div class="legend-grid">
            <div class="legend-box">
              <p class="legend-box-lg lg-emerald">${pagados}</p>
              <p class="legend-label">Pagados</p>
            </div>
            <div class="legend-box">
              <p class="legend-box-lg lg-amber">${abonados}</p>
              <p class="legend-label">Abonados</p>
            </div>
            <div class="legend-box">
              <p class="legend-box-lg lg-rose">${deudas}</p>
              <p class="legend-label">Deudas</p>
            </div>
          </div>
        </div>
        <div class="week-recap">
          <span class="label">Recaudado esta semana</span>
          <span class="value">${money(recaudado)} <small>/ ${money(esperado)}</small></span>
        </div>
      </div>

      <!-- Matriz escritorio -->
      <div class="glass-panel matrix-wrap">
        <div class="matrix-scroll">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="sticky-col">#</th>
                <th class="sticky-col sticky-col-name">Integrante</th>
                <th style="text-align:center;padding-inline:0.75rem;">Anticipado</th>
                ${weeks
                  .map(
                    (w) =>
                      `<th style="text-align:center;">Sem ${w.numero_semana}<span class="th-date">${w.fecha_inicio.slice(5, 10)}</span></th>`
                  )
                  .join('')}
                <th style="text-align:center;padding-inline:0.75rem;">Total abonado</th>
              </tr>
            </thead>
            <tbody>
              ${status.members
                .map((m) => {
                  const row = matrix[m.numero_lista];
                  return `
                    <tr>
                      <td class="sticky-col num-cell">${m.numero_lista}</td>
                      <td class="sticky-col-name">${esc(m.nombre)}</td>
                      <td style="text-align:center;padding-inline:0.75rem;;font-size:0.75rem;color:var(--text-2);">${money(row.total_abonado)}</td>
                      ${weeks
                        .map((w) => {
                          const cell = row.cells[w.id];
                          const est = estadoInfo(cell.estado);
                          const selected = w.id === selectedWeek.id;
                          return `
                            <td>
                              <button class="cell-badge ${est.cls} ${selected ? 'cell-selected' : ''}" 
                                data-cell-week="${w.id}" data-cell-member="${m.numero_lista}"
                                title="${esc(m.nombre)} · ${weekLabel(w)}">
                                ${cell.abonado > 0 ? money(cell.abonado).replace('MX$', '$') : '·'}
                              </button>
                            </td>`;
                        })
                        .join('')}
                      <td class="total-cell">${money(row.total_abonado)}</td>
                    </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Lista móvil -->
      <div class="mobile-list">
        ${status.members
          .map((m) => {
            const key = `${m.numero_lista}-${selectedWeek.id}`;
            const g = status.grouped ? status.grouped[key] : null;
            const abonado = g ? Number(g.total) : 0;
            const cuota = Number(selectedWeek.monto_cuota);
            const deuda = Math.max(0, cuota - abonado);
            const estado = computeEstado(abonado, cuota);
            const est = estadoInfo(estado);

            let sub;
            if (estado === 'pagado') sub = `${money(abonado)} · Completado`;
            else if (estado === 'abonado') sub = `Abonado ${money(abonado)} · falta ${money(deuda)}`;
            else sub = `Debe ${money(deuda)}`;

            return `
              <button class="glass-card glass-card-hover member-row" data-mobile-member="${m.numero_lista}">
                <div class="member-num">${m.numero_lista}</div>
                <div class="member-row-main">
                  <p class="member-row-name">${esc(m.nombre)}</p>
                  <p class="member-row-sub">${sub}</p>
                </div>
                <div class="member-row-state">
                  <span class="state-dot ${est.dot}"></span>
                  <span class="collect-btn ${abonado >= cuota ? 'collect-btn-solid' : 'collect-btn-soft'}">
                    ${iconHtml('plus')} ${abonado >= cuota ? 'Registrado' : 'Cobrar'}
                  </span>
                </div>
              </button>`;
          })
          .join('')}
      </div>
    </div>
  `;

  // ── Eventos ──
  const idx = weeks.findIndex((w) => w.id === selectedWeek.id);

  parent.querySelectorAll('[data-arrow]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = Number(btn.dataset.arrow);
      const target = weeks[Math.min(weeks.length - 1, Math.max(0, idx + delta))];
      if (target) onSelectWeek(target.id);
    });
  });

  parent.querySelectorAll('[data-week]').forEach((btn) => {
    btn.addEventListener('click', () => onSelectWeek(Number(btn.dataset.week)));
  });

  parent.querySelectorAll('[data-cell-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const member = status.members.find((m) => m.numero_lista === Number(btn.dataset.cellMember));
      const week = weeks.find((w) => w.id === Number(btn.dataset.cellWeek));
      openAbono({ member, week });
    });
  });

  parent.querySelectorAll('[data-mobile-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const member = status.members.find((m) => m.numero_lista === Number(btn.dataset.mobileMember));
      openAbono({ member, week: selectedWeek });
    });
  });
}