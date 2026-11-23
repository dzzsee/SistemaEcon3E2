export function cn(...partes) {
  return partes.filter(Boolean).join(' ');
}

export const ROLES = {
  tutor: { label: 'Tutor', color: 'text-sky-300 border-sky-400/30 bg-sky-500/10', dot: 'bg-sky-400' },
  presidente: { label: 'Presidente', color: 'text-violet-300 border-violet-400/30 bg-violet-500/10', dot: 'bg-violet-400' },
  tesorero: { label: 'Tesorero', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10', dot: 'bg-amber-400' }
};

export function rolInfo(rol) {
  return ROLES[rol] || { label: rol || 'Usuario', color: 'text-slate-300 border-white/10 bg-white/5', dot: 'bg-slate-400' };
}

export function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
}

export function formatDateShort(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function weekLabel(week) {
  if (!week) return '';
  if (week.descripcion) return week.descripcion;
  return `Semana ${week.numero_semana ?? week.id}`;
}

export function estadoInfo(estado) {
  if (estado === 'pagado') {
    return {
      label: 'Pagado',
      text: 'text-emerald-300',
      bg: 'bg-emerald-500/15',
      soft: 'border border-emerald-400/30 bg-emerald-500/15',
      border: 'border-emerald-400/30'
    };
  }
  if (estado === 'abonado') {
    return {
      label: 'Abonado',
      text: 'text-amber-300',
      bg: 'bg-amber-500/15',
      soft: 'border border-amber-400/30 bg-amber-500/15',
      border: 'border-amber-400/30'
    };
  }
  return {
    label: 'Deuda',
    text: 'text-rose-300',
    bg: 'bg-rose-500/15',
    soft: 'border border-rose-400/30 bg-rose-500/15',
    border: 'border-rose-400/30'
  };
}
