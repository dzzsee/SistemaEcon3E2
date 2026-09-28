import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { money } from './cn.js';

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
      const abonado = g ? g.total : 0;
      const deuda = Math.max(0, w.monto_cuota - abonado);
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

export function exportPDF(status, balance, session) {
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
  doc.text(`Total recaudado: ${money(balance.totalRecaudado)}`, 40, 108);
  doc.text(`Total esperado: ${money(balance.totalEsperado)}`, 220, 108);
  doc.text(`Deuda pendiente: ${money(balance.totalDeuda)}`, 400, 108);
  doc.text(`Cumplimiento: ${balance.porcentajeCobro}%`, 580, 108);
  // Segunda fila: los gastos salen de la caja y acaban en la deuda del grupo.
  doc.text(`Total en gastos: ${money(balance.totalGastos)}`, 40, 122);
  doc.text(`Efectivo en caja: ${money(balance.saldoCaja)}`, 220, 122);

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
      return c.abonado > 0 ? money(c.abonado).replace('MX$', '$') : '—';
    }),
    money(r.totalAbonado).replace('MX$', '$'),
    money(r.totalDeuda).replace('MX$', '$')
  ]);

  const tabla = autoTable(doc, {
    head,
    body,
    startY: 140,
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
        if (value >= week.monto_cuota) data.cell.styles.textColor = [5, 150, 105];
        else if (value > 0) data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  // Pie de la planilla, anclado a donde termino la tabla. Se dibuja ANTES de
  // addPage(): si no, el texto caeria en la pagina de gastos y se solaparia.
  const altoPagina = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Sem = semana del calendario · Verde: pagado · Ámbar: abonado parcial · Rojo: deuda',
    40,
    Math.min(tabla.lastAutoTable.finalY + 14, altoPagina - 24)
  );

  // Tabla de gastos, en su propia pagina para no partir la planilla.
  const gastos = status.gastos || [];
  if (gastos.length) {
    doc.addPage();
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, pageWidth, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Gastos Registrados · 3E2', 40, 32);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${gastos.length} registro(s) · total ${money(balance.totalGastos)}`, 40, 50);

    autoTable(doc, {
      head: [['Fecha', 'Concepto', 'Categoría', 'Monto', 'Nota', 'Registró', 'Factura']],
      body: [...gastos]
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
        .map((g) => [
          g.fecha,
          g.concepto,
          g.categoria || '—',
          money(g.monto).replace('MX$', '$'),
          g.nota || '—',
          g.registrado_por || '—',
          g.tiene_archivo ? 'Sí' : 'No'
        ]),
      startY: 84,
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      columnStyles: {
        0: { cellWidth: 62 },
        3: { cellWidth: 66, halign: 'right' },
        6: { cellWidth: 44, halign: 'center' }
      }
    });

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Los gastos se descuentan del efectivo en caja y aumentan la deuda pendiente del grupo.',
      40,
      altoPagina - 24
    );
  }

  doc.save(`control-cuotas-3E2-${today()}.pdf`);
}

// CSV solo de gastos. El CSV principal es por integrante, asi que los gastos
// viven en su propio archivo para que se pueda abrir sin depender de Excel.
export function exportGastosCSV(status) {
  const gastos = status.gastos || [];
  const header = ['Fecha', 'Concepto', 'Categoría', 'Monto', 'Nota', 'Registró', 'Tiene factura'];
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const lines = [header.map(escapar).join(',')];
  for (const g of [...gastos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))) {
    lines.push(
      [
        g.fecha,
        escapar(g.concepto),
        escapar(g.categoria),
        g.monto,
        escapar(g.nota),
        escapar(g.registrado_por),
        g.tiene_archivo ? 'Sí' : 'No'
      ].join(',')
    );
  }
  const total = gastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);
  lines.push(['', 'TOTAL', '', total, '', '', ''].join(','));

  // BOM para acentos en Excel
  const csv = '\uFEFF' + lines.join('\n');
  download(`gastos-3E2-${today()}.csv`, csv, 'text/csv;charset=utf-8;');
}
