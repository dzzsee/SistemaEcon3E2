// ================================================================
// Utilidades compartidas: formato, roles, estados e iconos SVG
// ================================================================

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
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function weekLabel(w) {
  return `${formatDateShort(w.fecha_inicio)} – ${formatDateShort(w.fecha_fin)}`;
}

export function estadoInfo(estado) {
  switch (estado) {
    case 'pagado':
      return {
        label: 'Pagado',
        text: 'text-emerald-400',
        bg: 'var(--emerald-500)',
        cls: 'estado-pagado',
        dot: 'dot-pagado',
        chip: 'chip-emerald'
      };
    case 'abonado':
      return {
        label: 'Abonado',
        text: 'text-amber-400',
        bg: 'var(--amber-500)',
        cls: 'estado-abonado',
        dot: 'dot-abonado',
        chip: 'chip-amber'
      };
    default:
      return {
        label: 'Deuda',
        text: 'text-rose-400',
        bg: 'var(--rose-500)',
        cls: 'estado-deuda',
        dot: 'dot-deuda',
        chip: 'chip-rose'
      };
  }
}

export function computeEstado(abonado, cuota) {
  if (abonado >= cuota) return 'pagado';
  if (abonado > 0) return 'abonado';
  return 'deuda';
}

export const ROLES = {
  tutor: {
    label: 'Tutor(a)',
    cls: 'role-tutor'
  },
  presidente: {
    label: 'Presidente',
    cls: 'role-presidente'
  },
  tesorero: {
    label: 'Tesorero',
    cls: 'role-tesorero'
  }
};

export function rolInfo(rol) {
  return ROLES[rol] || ROLES.tesorero;
}

// Dado status (members + weeks + grouped) devuelve la matriz por miembro
export function buildMatrix(status) {
  const rows = {};
  for (const m of status.members) {
    const row = { member: m, total_abonado: 0, total_deuda: 0, cells: {} };
    for (const w of status.weeks) {
      const key = `${m.numero_lista}-${w.id}`;
      const g = status.grouped ? status.grouped[key] : null;
      const abonado = g ? Number(g.total) : 0;
      const deuda = Math.max(0, Number(w.monto_cuota) - abonado);
      const estado = computeEstado(abonado, Number(w.monto_cuota));
      row.total_abonado += abonado;
      row.total_deuda += deuda;
      row.cells[w.id] = { abonado, deuda, estado, cuota: Number(w.monto_cuota) };
    }
    rows[m.numero_lista] = row;
  }
  return rows;
}

// Escapa HTML para evitar inyección al renderizar con template strings
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Constructor auxiliar de elementos
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value != null) {
      node.setAttribute(key, value);
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

// Iconos SVG (inline). Uso: icon('wallet')
const ICONS = {
  wallet:
    '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  dashboard:
    '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  table: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  export: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  feather: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" x2="2" y1="8" y2="22"/><line x1="17.5" x2="9" y1="15" y2="15"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  spreadsheet: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
  fileText:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  calendarPlus:
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M10 16h4"/><path d="M12 14v4"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>'
};

export function iconHtml(name, cls = '') {
  const paths = ICONS[name] || '';
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

export function icon(name, cls = '') {
  const template = document.createElement('template');
  template.innerHTML = iconHtml(name, cls).trim();
  return template.content.firstChild;
}