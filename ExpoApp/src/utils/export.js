import { EncodingType, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { money, formatDateShort, weekLabel } from './cn.js';

const BOM = '\uFEFF';

function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function celdaCsv(valor) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

function filaCsv(celdas) {
  return celdas.map(celdaCsv).join(',');
}

export function buildRows(report) {
  const weeks = report?.weeks || [];
  return (report?.matrix || []).map((row) => {
    const celdas = [row.numero_lista, row.nombre];
    for (const week of weeks) {
      const info = row.semanas?.[week.id] || { abonado: 0, deuda: 0, estado: 'deuda' };
      celdas.push(info.abonado, info.deuda, info.estado);
    }
    celdas.push(row.total_abonado);
    return celdas;
  });
}

export function buildGastosRows(gastos) {
  return (gastos || []).map((g) => [
    g.id,
    g.fecha,
    g.concepto,
    g.categoria || '',
    g.monto,
    g.registrado_por || '',
    g.nota || '',
    g.nombre_archivo || ''
  ]);
}

async function compartirArchivo(uri, nombre, mimeType) {
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) throw new Error('El intercambio de archivos no está disponible en este dispositivo.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: nombre });
}

export async function exportarCSV(nombre, filas) {
  const contenido = BOM + filas.map(filaCsv).join('\r\n');
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  await archivo.write(contenido, { encoding: EncodingType.UTF8 });
  await compartirArchivo(archivo.uri, nombre, 'text/csv');
  return archivo.uri;
}

export async function exportarPlanillaCSV(report, nombre = 'planilla-3e2.csv') {
  const weeks = report?.weeks || [];
  const encabezado = ['No. lista', 'Nombre'];
  for (const week of weeks) {
    const etiqueta = weekLabel(week);
    encabezado.push(`${etiqueta} - Abonado`, `${etiqueta} - Deuda`, `${etiqueta} - Estado`);
  }
  encabezado.push('Total abonado');
  return exportarCSV(nombre, [encabezado, ...buildRows(report)]);
}

export async function exportarGastosCSV(gastos, nombre = 'gastos-3e2.csv') {
  const encabezado = [
    'ID',
    'Fecha',
    'Concepto',
    'Categoría',
    'Monto',
    'Registrado por',
    'Nota',
    'Factura'
  ];
  return exportarCSV(nombre, [encabezado, ...buildGastosRows(gastos)]);
}

function htmlPlanilla(report, balance, session) {
  const weeks = report?.weeks || [];
  const celdas = weeks
    .map((w) => `<th>${escapar(weekLabel(w))}<br><small>${formatDateShort(w.fecha_inicio)}</small></th>`)
    .join('');
  const filas = (report?.matrix || [])
    .map((row) => {
      const celdasFila = weeks
        .map((w) => {
          const info = row.semanas?.[w.id] || { abonado: 0, deuda: 0, estado: 'deuda' };
          return `<td>${money(info.abonado)}<br><small>${escapar(info.estado)}</small></td>`;
        })
        .join('');
      return `<tr><td>${row.numero_lista}</td><td>${escapar(row.nombre)}</td>${celdasFila}<td><b>${money(row.total_abonado)}</b></td></tr>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Helvetica, Arial, sans-serif; font-size: 9px; color: #0f172a; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h2 { font-size: 12px; margin: 16px 0 6px; color: #047857; }
          p { margin: 2px 0; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px; text-align: left; vertical-align: top; }
          th { background: #ecfdf5; font-size: 8px; }
          tr:nth-child(even) td { background: #f8fafc; }
          small { color: #64748b; font-size: 7px; }
          .resumen { display: flex; gap: 10px; margin-top: 8px; }
          .resumen div { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; }
        </style>
      </head>
      <body>
        <h1>Control 3E2 · Planilla de cuotas</h1>
        <p>Generado: ${escapar(new Date().toLocaleString('es-MX'))}</p>
        <p>Registrado por: ${escapar(session?.nombre || 'Tesorero')} (${escapar(session?.rol || 'tesorero')})</p>
        <div class="resumen">
          <div>Recaudado<br><b>${money(balance?.totalRecaudado)}</b></div>
          <div>Gastos<br><b>${money(balance?.totalGastos)}</b></div>
          <div>Saldo de caja<br><b>${money(balance?.saldoCaja)}</b></div>
          <div>Deuda<br><b>${money(balance?.totalDeuda)}</b></div>
        </div>
        <h2>Detalle por integrante</h2>
        <table>
          <thead><tr><th>No.</th><th>Integrante</th>${celdas}<th>Total</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </body>
    </html>
  `;
}

export async function exportarPDF(report, balance, session, nombre = 'planilla-3e2.pdf') {
  const html = htmlPlanilla(report, balance, session);
  const { uri } = await Print.printAsync({ html, width: 612, height: 792 });
  await compartirArchivo(uri, nombre, 'application/pdf');
  return uri;
}
