// ================================================================
// Exportación: Excel/CSV y reporte PDF (jsPDF desde CDN)
// ================================================================

import { money, weekLabel } from './utils.js';

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildRows(status) {
  return status.members.map((m) => {
    const cells = {};
    let totalAbonado = 0;
    let totalDeuda = 0;
    for (const w of status.weeks) {
      const key = `${m.numero_lista}-${w.id}`;
      const g = status.grouped?.[key];
      const abonado = g ? Number(g.total) : 0;
      const deuda = Math.max(0, Number(w.monto_cuota) - abonado);
      totalAbonado += abonado;
      totalDeuda += deuda;
      cells[w.id] = { abonado, estado: abonado >= w.monto_cuota ? 'Pagado' : abonado > 0 ? 'Abonado' : 'Deuda' };
    }
    return { m, cells, totalAbonado, totalDeuda };
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function exportCSV(status) {
  const rows = buildRows(status);
  const header = [
    'No. lista',
    'Integrante',
    ...status.weeks.map((w) => `Sem ${w.numero_semana} (${w.fecha_inicio})`),
    'Total abonado',
    'Deuda total'
  ];

  const lines = [header.join(',')];
  for (const r of rows) {
    const line = [
      r.m.numero_lista,
      `"${r.m.nombre}"`,
      ...status.weeks.map((w) => `${r.cells[w.id].abonado} - ${r.cells[w.id].estado}`),
      r.totalAbonado,
      r.totalDeuda
    ];
    lines.push(line.join(','));
  }

  // BOM para acentos en Excel
  const csv = '\uFEFF' + lines.join('\n');
  download(`control-cuotas-3E2-${today()}.csv`, csv, 'text/csv;charset=utf-8;');
}

function moneyShort(n) {
  return money(n);
}

export function exportPDF(status, balance, session) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageWidth, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Control de Cuotas Semanales · 3E2', 40, 32);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generado: ${new Date().toLocaleString('es-MX')}   |   Responsable: ${session.nombre} (${session.rol})`,
    40,
    50
  );

  // Resumen
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen financiero', 40, 92);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total recaudado: ${moneyShort(balance.totalRecaudado)}`, 40, 108);
  doc.text(`Total esperado: ${moneyShort(balance.totalEsperado)}`, 220, 108);
  doc.text(`Deuda pendiente: ${moneyShort(balance.totalDeuda)}`, 400, 108);
  doc.text(`Cumplimiento: ${balance.porcentajeCobro}%`, 580, 108);

  // Tabla principal
  const head = [[
    '#',
    'Integrante',
    ...status.weeks.map((w) => `S${w.numero_semana}`),
    'Abonado',
    'Deuda'
  ]];

  const body = buildRows(status).map((r) => [
    r.m.numero_lista,
    r.m.nombre,
    ...status.weeks.map((w) => {
      const c = r.cells[w.id];
      return c.abonado > 0 ? moneyShort(c.abonado) : '—';
    }),
    moneyShort(r.totalAbonado),
    moneyShort(r.totalDeuda)
  ]);

  window.jspdf.autotable(doc, {
    head,
    body,
    startY: 124,
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 140 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index >= 2 && data.column.index < 2 + status.weeks.length) {
        const text = String(data.cell.raw);
        if (text !== '—' && !text.startsWith('$')) return;
        const value = text === '—' ? 0 : Number(text.replace(/[^0-9.]/g, ''));
        const week = status.weeks[data.column.index - 2];
        if (value >= Number(week.monto_cuota)) data.cell.styles.textColor = [5, 150, 105];
        else if (value > 0) data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Sem = semana del calendario · Verde: pagado · Ámbar: abonado parcial · Rojo: deuda',
    40,
    doc.internal.pageSize.getHeight() - 24
  );

  doc.save(`control-cuotas-3E2-${today()}.pdf`);
}