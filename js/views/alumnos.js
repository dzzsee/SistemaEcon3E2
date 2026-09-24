// ================================================================
// Vista: Alumnos (integrantes con historial expandible)
// ================================================================

import { money, weekLabel, estadoInfo, iconHtml, esc } from '../utils.js';

const escN = (n) => esc(n);

export function renderAlumnos(parent, { status }) {
  let expanded = null;

  const rows = status.members.map((m) => {
    let totalAbonado = 0;
    let totalDeuda = 0;
    const weekRows = status.weeks.map((w) => {
      const key = `${m.numero_lista}-${w.id}`;
      const g = status.grouped ? status.grouped[key] : null;
      const abonado = g ? Number(g.total) : 0;
      const deuda = Math.max(0, Number(w.monto_cuota) - abonado);
      const estado = abonado >= Number(w.monto_cuota) ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
      totalAbonado += abonado;
      totalDeuda += deuda;
      return { w, abonado, deuda, estado };
    });
    return { m, totalAbonado, totalDeuda, weekRows };
  });

  function cardHtml(row, idx) {
    const { m, totalAbonado, totalDeuda, weekRows } = row;
    const isOpen = expanded === m.numero_lista;
    const percentage = status.weeks.length
      ? Math.round((weekRows.filter((r) => r.estado === 'pagado').length / status.weeks.length) * 100)
      : 0;

    return `
      <div class="glass-card alumno-card ${isOpen ? 'alumno-card-open' : ''} anim-fadeUp" style="animation-delay:${idx * 40}ms;">
        <button class="alumno-row-main" data-toggle="${m.numero_lista}">
          <div class="alumno-num">${m.numero_lista}</div>
          <div class="alumno-main">
            <p class="alumno-name">${escN(m.nombre)}</p>
            <div class="alumno-totals">
              <span>${iconHtml('wallet')} ${money(totalAbonado)}</span>
              <span class="debt">${iconHtml('alert')} ${money(totalDeuda)}</span>
            </div>
            <div class="alumno-bar">
              <div class="alumno-bar-fill" style="width:${percentage}%"></div>
            </div>
          </div>
          <div class="alumno-side">
            <span class="alumno-pct">${percentage}%</span>
            <span class="alumno-pct-label">cumplimiento</span>
            ${iconHtml('chevronDown', `chevron ${isOpen ? 'chevron-open' : ''}`)}
          </div>
        </button>

        ${
          isOpen
            ? `<div class="alumno-expand anim-fadeUp">
                <div class="expand-headrow"><span>Semana</span><span>Estado</span></div>
                <div class="expand-list">
                  ${weekRows
                    .map((r) => {
                      const est = estadoInfo(r.estado);
                      const right = r.estado === 'pagado'
                        ? '<span class="badge-pill ' + est.cls + '">' + est.label + '</span>'
                        : '<span class="badge-pill ' + est.cls + '">' + (r.estado === 'abonado' ? `Falta ${money(r.deuda)}` : money(r.deuda)) + '</span>';
                      return `
                        <div class="expand-row">
                          <span class="w">${weekLabel(r.w)}</span>
                          <span class="right">
                            <span class="amount">${r.abonado > 0 ? money(r.abonado) : '-'}</span>
                            ${right}
                          </span>
                        </div>`;
                    })
                    .join('')}
                </div>
              </div>`
            : ''
        }
      </div>
    `;
  }

  function render() {
    parent.innerHTML = `
      <div class="space-y-5">
        <div class="anim-fadeUp">
          <h1 class="page-head-title">${iconHtml('user')} Integrantes de 3E2</h1>
          <p class="page-head-sub">Lista fija de ${status.members.length} integrantes.</p>
        </div>
        <div class="alumno-grid">
          ${rows.map(cardHtml).join('')}
        </div>
      </div>
    `;

    parent.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = Number(btn.dataset.toggle);
        expanded = expanded === num ? null : num;
        render();
      });
    });
  }

  render();
}
