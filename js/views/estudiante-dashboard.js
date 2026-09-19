// ================================================================
// Vista: Estudiante - Mi Resumen (Dashboard personal)
// ================================================================

import { money, weekLabel, estadoInfo, iconHtml, esc } from '../utils.js';

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

function weekCardEstudiante(week, status, miembroId) {
  const key = `${miembroId}-${week.id}`;
  const g = status.grouped ? status.grouped[key] : null;
  const abonado = g ? Number(g.total) : 0;
  const cuota = Number(week.monto_cuota);
  const deuda = Math.max(0, cuota - abonado);
  const estado = abonado >= cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
  const est = estadoInfo(estado);

  // Si está pagado completo, no mostrar la tarjeta (se oculta)
  if (estado === 'pagado') {
    return '';
  }

  return `
    <div class="glass-card glass-card-hover week-card-estudiante" data-week="${week.id}">
      <div class="week-card-head">
        <span class="week-card-title">${iconHtml('calendar')} ${weekLabel(week)}</span>
        <span class="week-fee">${money(cuota)}/semana</span>
      </div>
      <div class="week-card-progress">
        <span>Cuota: ${money(cuota)} · Abonado: ${money(abonado)}</span>
        <span class="count">${deuda > 0 ? `Falta: ${money(deuda)}` : 'Completo'}</span>
      </div>
      <div class="week-bars">
        <span class="bar-${est.cls.replace('chip-', '')}"></span>
      </div>
      <div class="week-estado">
        <span class="badge-pill ${est.cls}">${est.label}${estado === 'abonado' ? ` (falta ${money(deuda)})` : ''}</span>
      </div>
    </div>
  `;
}

export function renderEstudianteDashboard(parent, { status, balance, session, showToast, refresh, onNavigate }) {
  const miembroId = session.id;
  const firstName = esc((session.nombre || 'Estudiante').split(' ')[0]);

  // Solo semanas ya cursadas (fecha_fin <= hoy)
  const today = new Date().toISOString().slice(0, 10);
  const semanasCursadas = status.weeks.filter((w) => w.fecha_fin <= today);

  // Calcular estadísticas personales
  let totalAbonado = 0;
  let totalDeuda = 0;
  let semanasPagadas = 0;
  let semanasConDeuda = 0;

  const weeksWithDebt = [];

  for (const w of semanasCursadas) {
    const key = `${miembroId}-${w.id}`;
    const g = status.grouped ? status.grouped[key] : null;
    const abonado = g ? Number(g.total) : 0;
    const cuota = Number(w.monto_cuota);
    const deuda = Math.max(0, cuota - abonado);
    const estado = abonado >= cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';

    totalAbonado += abonado;
    totalDeuda += deuda;

    if (estado === 'pagado') {
      semanasPagadas++;
    } else {
      semanasConDeuda++;
      weeksWithDebt.push({ week: w, abonado, deuda, estado });
    }
  }

  const totalSemanas = semanasCursadas.length;
  const porcentaje = totalSemanas > 0 ? Math.round((semanasPagadas / totalSemanas) * 100) : 0;

  parent.innerHTML = `
    <div class="space-y-6">
      <div class="anim-fadeUp">
        <h1 class="page-head-title" style="font-size:1.25rem;">Hola, ${firstName} 👋</h1>
        <p class="page-head-sub">Tu estado de cuotas del grupo 3E2.</p>
      </div>

      <div class="stat-grid">
        ${statCard({
          icon: 'wallet',
          label: 'Total abonado',
          value: money(totalAbonado),
          sub: `de ${money(totalSemanas > 0 ? Number(status.weeks[0]?.monto_cuota || 2.5) * totalSemanas : 0)} esperados`,
          accentClass: 'stat-emerald'
        })}
        ${statCard({
          icon: 'alert',
          label: 'Deuda pendiente',
          value: money(totalDeuda),
          sub: `${semanasConDeuda} semana${semanasConDeuda !== 1 ? 's' : ''} con deuda`,
          accentClass: 'stat-rose'
        })}
        ${statCard({
          icon: 'check',
          label: 'Semanas al día',
          value: `${semanasPagadas} / ${totalSemanas}`,
          sub: `${porcentaje}% cumplimiento`,
          accentClass: 'stat-teal'
        })}
      </div>

      <div class="glass-panel rounded-2xl p-5 anim-fadeUp" style="animation-delay:200ms;">
        <div class="flex items-center justify-between" style="margin-bottom:0.5rem;">
          <span class="flex items-center" style="gap:0.375rem;font-weight:500;color:var(--text-2);">
            ${iconHtml('sparkles')} Tu cumplimiento
          </span>
          <span class="font-bold text-emerald-400">${porcentaje}%</span>
        </div>
        <div class="compliance-bar">
          <div class="compliance-fill" style="width:${Math.min(100, porcentaje)}%"></div>
        </div>
        <p class="config-hint" style="margin-top:0.75rem;text-align:center;">
          ${semanasConDeuda === 0 ? '🎉 ¡Estás al día con todas tus cuotas!' : `Tienes ${semanasConDeuda} semana${semanasConDeuda !== 1 ? 's' : ''} pendiente${semanasConDeuda !== 1 ? 's' : ''} de pago.`}
        </p>
      </div>

      <div class="space-y-4">
        <div class="section-head">
          <h2 class="section-title">${iconHtml('calendar')} Próximas semanas con deuda</h2>
          <a href="#" class="link-emerald" data-nav="historial">Ver historial completo →</a>
        </div>
        <div class="week-grid week-grid-estudiante">
          ${weeksWithDebt
            .slice(0, 6)
            .map((item) => weekCardEstudiante(item.week, status, miembroId))
            .join('')}
          ${weeksWithDebt.length === 0 ? `
            <div class="glass-card text-center py-8" style="grid-column: 1 / -1;">
              ${iconHtml('checkCircle', 'text-emerald-400')}
              <p class="mt-2" style="color:var(--text-2);">¡Todas tus semanas están al día! 🎉</p>
            </div>
          ` : ''}
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
}