// ================================================================
// Vista: Exportar y gestionar
// ================================================================

import { money, esc, iconHtml } from '../utils.js';
import { exportCSV, exportPDF } from '../export.js';

export function renderExportar(parent, { status, balance, session, showToast, onCreateWeek }) {
  const rows = status.members.map((m) => {
    let abonado = 0;
    let deuda = 0;
    for (const w of status.weeks) {
      const key = `${m.numero_lista}-${w.id}`;
      const g = status.grouped ? status.grouped[key] : null;
      const a = g ? Number(g.total) : 0;
      abonado += a;
      deuda += Math.max(0, Number(w.monto_cuota) - a);
    }
    return { m, abonado, deuda };
  });

  let showForm = false;
  let busy = false;

  function render() {
    parent.innerHTML = `
      <div class="space-y-6">
        <div class="anim-fadeUp">
          <h1 class="page-head-title">${iconHtml('export')} Exportar y gestionar</h1>
          <p class="page-head-sub">Descarga el estado de cuotas o agrega nuevas semanas del calendario.</p>
        </div>

        <div class="export-grid">
          <button class="glass-card glass-card-hover export-card" data-action="csv">
            <div class="export-icon export-icon-emerald">${iconHtml('spreadsheet')}</div>
            <div>
              <p class="export-title">Descargar Excel / CSV</p>
              <p class="export-sub">Tabla completa por semana y totales</p>
            </div>
          </button>
          <button class="glass-card glass-card-hover export-card" data-action="pdf">
            <div class="export-icon export-icon-rose">${iconHtml('fileText')}</div>
            <div>
              <p class="export-title">Generar reporte PDF</p>
              <p class="export-sub">Documento listo para compartir</p>
            </div>
          </button>
        </div>

        <div class="glass-panel rounded-2xl p-5">
          <div class="weeks-panel-head">
            <h2 class="weeks-panel-title">${iconHtml('calendarPlus')} Semanas del calendario</h2>
            <button class="btn-teal" data-toggle-form>${showForm ? 'Cancelar' : 'Agregar semana'}</button>
          </div>

          ${
            showForm
              ? `
            <form id="new-week-form" class="new-week-form anim-fadeUp">
              <div>
                <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Inicio (lunes)</label>
                <input class="input-plain" type="date" name="inicio" required />
              </div>
              <div>
                <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Fin (domingo)</label>
                <input class="input-plain" type="date" name="fin" required />
              </div>
              <div>
                <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Cuota</label>
                <input class="input-plain" type="number" name="monto" min="1" step="0.5" value="20" required />
              </div>
              <div class="submit-cell">
                <div class="flex-1">
                  <label class="field-label" style="text-transform:uppercase;font-size:0.625rem;">Descripción</label>
                  <input class="input-plain" name="descripcion" placeholder="Opcional" />
                </div>
                <button type="submit" class="btn-submit-teal" data-submit-week>${iconHtml('calendarPlus')}</button>
              </div>
            </form>`
              : ''
          }

          <div class="weeks-chips">
            ${status.weeks
              .map(
                (w) =>
                  `<span class="week-chip">Sem ${w.numero_semana} · ${w.fecha_inicio.slice(5)} → ${w.fecha_fin.slice(5)} · ${money(w.monto_cuota)}</span>`
              )
              .join('')}
          </div>
        </div>

        <div class="glass-panel overflow-hidden rounded-2xl">
          <div class="preview-head">
            ${iconHtml('table')}
            <h3>Previsualización de totales</h3>
          </div>
          <div class="preview-scroll">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Integrante</th>
                  <th style="text-align:right;">Abonado</th>
                  <th style="text-align:right;">Deuda</th>
                  <th style="text-align:right;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map((r) => {
                    const estado =
                      r.deuda === 0
                        ? '<span class="badge-pill chip-emerald">Al corriente</span>'
                        : r.abonado > 0
                          ? '<span class="badge-pill chip-amber">Parcial</span>'
                          : '<span class="badge-pill chip-rose">Sin pagos</span>';
                    return `
                      <tr>
                        <td class="num">${r.m.numero_lista}</td>
                        <td class="name">${esc(r.m.nombre)}</td>
                        <td class="r text-emerald-400">${money(r.abonado)}</td>
                        <td class="r text-rose-400">${money(r.deuda)}</td>
                        <td class="r">${estado}</td>
                      </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    parent.querySelector('[data-action="csv"]').addEventListener('click', () => {
      exportCSV(status);
      showToast('Archivo CSV/Excel generado.');
    });

    parent.querySelector('[data-action="pdf"]').addEventListener('click', () => {
      exportPDF(status, balance, session);
      showToast('Reporte PDF generado.');
    });

    parent.querySelector('[data-toggle-form]').addEventListener('click', () => {
      showForm = !showForm;
      render();
    });

    if (showForm) {
      const form = parent.querySelector('#new-week-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const inicio = data.get('inicio');
        const fin = data.get('fin');
        const monto = data.get('monto');
        if (!inicio || !fin || !monto || busy) return;

        busy = true;
        const btn = form.querySelector('[data-submit-week]');
        btn.disabled = true;
        btn.innerHTML = iconHtml('loader');

        try {
          await onCreateWeek({
            fecha_inicio: inicio,
            fecha_fin: fin,
            monto_cuota: Number(monto),
            descripcion: data.get('descripcion') || undefined
          });
          showToast('Semana agregada correctamente.');
          showForm = false;
          render();
        } catch (err) {
          showToast(err.message || 'No se pudo agregar la semana.', 'error');
          btn.disabled = false;
          btn.innerHTML = iconHtml('calendarPlus');
        }
        busy = false;
      });
    }
  }

  render();
}