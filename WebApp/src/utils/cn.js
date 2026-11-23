import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const ROLES = {
  tutor: {
    label: 'Tutor(a)',
    color: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    dot: 'bg-violet-400'
  },
  presidente: {
    label: 'Presidente',
    color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400'
  },
  tesorero: {
    label: 'Tesorero',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400'
  }
};

export function rolInfo(rol) {
  return ROLES[rol] || ROLES.tesorero;
}

export function money(n) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(n || 0));
}

export function formatDateShort(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function weekLabel(w) {
  return `${formatDateShort(w.fecha_inicio)} – ${formatDateShort(w.fecha_fin)}`;
}

export function estadoInfo(estado) {
  switch (estado) {
    case 'pagado':
      return { label: 'Pagado', text: 'text-emerald-400', bg: 'bg-emerald-500', soft: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    case 'abonado':
      return { label: 'Abonado', text: 'text-amber-400', bg: 'bg-amber-500', soft: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    default:
      return { label: 'Deuda', text: 'text-rose-400', bg: 'bg-rose-500', soft: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
  }
}