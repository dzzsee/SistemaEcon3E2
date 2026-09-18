// ================================================================
// Vista: Resumen (dashboard)
// ================================================================

import { money, weekLabel, iconHtml, esc } from '../utils.js';

function statCard({ icon, label, value, sub, accentClass }) {
  return `
    <div class="glass-card glass-card-hover relative overflow-hidden rounded-2xl p-5 anim-fadeUp">
      <div class="stat-card-head">
        <div>
          <p class="stat-label">${label}</p>
          <p class="stat-value">${value}</p>
          ${sub ? `<p class="stat-sub">${sub}</p>` : ''}
        </div>
        <div class="stat-icon ${accentClass}">${iconHtml(icon)}</div>
      </div>
    </div>
  `;
}

function weekCard(week, status, onClick) {
  const members = status.members;
  let pagados = 0;
  let abonados = 0;
  let deudas = 0;
  let recaudado = 0;

  for (const m of members) {
    const key = `${m.numero_lista}-${week.id}`;
    const g = status.grouped ? status.grouped[key] : null;
    const abonado = g ? Number(g.total) : 0;
    recaudado += abonado;
    if (abonado >= Number(week.monto_cuota)) pagados++;
    else if (abonado > 0) abonados++;
    else deudas++;
  }

  const total = money(recaudado);
  const esperado = money(Number(week.monto_cuota) * members.length);

  return `
    <button class="glass-card glass-card-hover week-card" data-week="${week.id}">
      <div class="week-card-head">
        <span class="week-card-title">${iconHtml('calendar')} ${weekLabel(week)}</span>
        <span class="week-fee">${money(week.monto_cuota)}/semana</span>
      </div>
      <div class="week-card-progress">
        <span>Recaudado ${total} de ${esperado}</span>
        <span class="count">${pagados} pagados</span>
      </div>
      <div class="week-bars">
        <span class="bar-emerald"></span>
        <span class="bar-amber"></span>
        <span class="bar-rose"></span>
      </div>
      <div class="week-counts">
        <span class="chip chip-emerald">${pagados}</span>
        <span class="chip chip-amber">${abonados}</span>
        <span class="chip chip-rose">${deudas}</span>
      </div>
    </button>
  `;
}

export function renderDashboard(parent, { status, balance, session, onNavigate }) {
  const pct = balance.porcentajeCobro;
  const firstName = esc((session.nombre || 'Usuario').split(' ')[0]);

  parent.innerHTML = `
    <div class="space-y-6">
      <div class="anim-fadeUp">
        <h1 class="page-head-title" style="font-size:1.25rem;">Hola, ${firstName} 👋</h1>
        <p class="page-head-sub">Este es el estado financiero del grupo 3E2.</p>
      </div>

      <div class="stat-grid">
        ${statCard({
          icon: 'wallet',
          label: 'Total recaudado',
          value: money(balance.totalRecaudado),
          sub: `de ${money(balance.totalEsperado)} esperados`,
          accentClass: 'stat-emerald'
        })}
        ${statCard({
          icon: 'alert',
          label: 'En deuda',
          value: money(balance.totalDeuda),
          sub: `${balance.totalAlumnos} integrantes · ${balance.totalSemanas} semanas`,
          accentClass: 'stat-rose'
        })}
        ${statCard({
          icon: 'trending',
          label: 'Porcentaje cobrado',
          value: `${pct}%`,
          sub: 'del total proyectado',
          accentClass: 'stat-teal'
        })}
        ${statCard({
          icon: 'check',
          label: 'Grupo',
          value: `${balance.totalAlumnos}`,
          sub: 'integrantes inscritos',
          accentClass: 'stat-violet'
        })}
      </div>

      <div class="glass-panel rounded-2xl p-5 anim-fadeUp" style="animation-delay:200ms;">
        <div class="flex items-center justify-between" style="margin-bottom:0.5rem;">
          <span class="flex items-center" style="gap:0.375rem;font-weight:500;color:var(--text-2);">
            ${iconHtml('sparkles')} Cumplimiento global
          </span>
          <span class="font-bold text-emerald-400">${pct}%</span>
        </div>
        <div class="compliance-bar">
          <div class="compliance-fill" style="width:${Math.min(100, pct)}%"></div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="section-head">
          <h2 class="section-title">${iconHtml('users')} Progreso semanal</h2>
          <a href="#" class="link-emerald" data-nav="planilla">Ver planilla →</a>
        </div>
        <div class="week-grid">
          ${[...status.weeks]
            .slice(-6)
            .reverse()
            .map((w) => weekCard(w, status))
            .join('')}
        </div>
      </div>
    </div>
  `;

  parent.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      onNavigate(el.dataset.nav);
    });
  });

  parent.querySelectorAll('[data-week]').forEach((el) => {
    el.addEventListener('click', () => onNavigate('planilla'));
  });
}