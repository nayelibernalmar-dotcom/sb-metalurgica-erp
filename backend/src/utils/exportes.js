// src/utils/exportes.js
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const AZUL = '1B2A6B';

/**
 * Exporta una tabla de datos a Excel o PDF y la manda como descarga en `res`.
 * columnas: [{ header, key, width, align, formato: 'moneda'|'texto'|'numero' }]
 * filas: [{ ...key: valor }]
 * totales (opcional): fila final en negrita, mismas keys que columnas
 */
async function exportarTabla(res, { formato, nombreArchivo, titulo, subtitulo, columnas, filas, totales }) {
  if (formato === 'pdf') return exportarPDF(res, { nombreArchivo, titulo, subtitulo, columnas, filas, totales });
  return exportarExcel(res, { nombreArchivo, titulo, subtitulo, columnas, filas, totales });
}

function formatearValor(valor, formato) {
  if (valor === null || valor === undefined) return '';
  if (formato === 'moneda') return 'Gs. ' + Math.round(Number(valor)).toLocaleString('es-PY');
  if (formato === 'numero') return Number(valor).toLocaleString('es-PY');
  return String(valor);
}

async function exportarExcel(res, { nombreArchivo, titulo, subtitulo, columnas, filas, totales }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SB Metalúrgica SA';
  const ws = wb.addWorksheet(titulo?.slice(0, 31) || 'Reporte');

  ws.mergeCells(1, 1, 1, columnas.length);
  ws.getCell(1, 1).value = titulo || 'Reporte';
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF' + AZUL } };
  if (subtitulo) {
    ws.mergeCells(2, 1, 2, columnas.length);
    ws.getCell(2, 1).value = subtitulo;
    ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF6B72A0' } };
  }

  const filaEncabezado = subtitulo ? 4 : 3;
  ws.columns = columnas.map(c => ({ key: c.key, width: c.width || 20 }));
  const header = ws.getRow(filaEncabezado);
  columnas.forEach((c, i) => {
    header.getCell(i + 1).value = c.header;
    header.getCell(i + 1).font = { bold: true };
    header.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F2EE' } };
    header.getCell(i + 1).alignment = { horizontal: c.align || 'left' };
  });

  filas.forEach((fila, idx) => {
    const row = ws.getRow(filaEncabezado + 1 + idx);
    columnas.forEach((c, i) => {
      const valorCrudo = fila[c.key];
      row.getCell(i + 1).value = c.formato === 'moneda' || c.formato === 'numero'
        ? Number(valorCrudo) || 0
        : valorCrudo;
      row.getCell(i + 1).alignment = { horizontal: c.align || 'left' };
      if (c.formato === 'moneda') row.getCell(i + 1).numFmt = '#,##0 "Gs."';
    });
  });

  if (totales) {
    const rowTotales = ws.getRow(filaEncabezado + 1 + filas.length + 1);
    columnas.forEach((c, i) => {
      const valorCrudo = totales[c.key];
      if (valorCrudo === undefined) return;
      rowTotales.getCell(i + 1).value = c.formato === 'moneda' || c.formato === 'numero' ? Number(valorCrudo) || 0 : valorCrudo;
      rowTotales.getCell(i + 1).font = { bold: true };
      if (c.formato === 'moneda') rowTotales.getCell(i + 1).numFmt = '#,##0 "Gs."';
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

function exportarPDF(res, { nombreArchivo, titulo, subtitulo, columnas, filas, totales }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: columnas.length > 5 ? 'landscape' : 'portrait' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).fillColor(`#${AZUL}`).text('SB Metalúrgica SA', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor('#000').text(titulo || 'Reporte');
  if (subtitulo) doc.fontSize(9).fillColor('#6B72A0').text(subtitulo);
  doc.moveDown(0.8);

  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const anchoCol = anchoDisponible / columnas.length;
  let y = doc.y;

  const dibujarFila = (valores, opts = {}) => {
    let x = doc.page.margins.left;
    columnas.forEach((c, i) => {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000')
        .text(String(valores[i] ?? ''), x, y, { width: anchoCol - 6, align: c.align === 'right' ? 'right' : 'left' });
      x += anchoCol;
    });
    y += 18;
    if (y > doc.page.height - doc.page.margins.bottom - 30) { doc.addPage(); y = doc.page.margins.top; }
  };

  dibujarFila(columnas.map(c => c.header), { bold: true });
  doc.moveTo(doc.page.margins.left, y - 4).lineTo(doc.page.width - doc.page.margins.right, y - 4).strokeColor('#CCCCCC').stroke();

  filas.forEach(fila => {
    dibujarFila(columnas.map(c => formatearValor(fila[c.key], c.formato)));
  });

  if (totales) {
    doc.moveTo(doc.page.margins.left, y - 4).lineTo(doc.page.width - doc.page.margins.right, y - 4).strokeColor('#CCCCCC').stroke();
    dibujarFila(columnas.map(c => (totales[c.key] !== undefined ? formatearValor(totales[c.key], c.formato) : '')), { bold: true });
  }

  doc.end();
}

module.exports = { exportarTabla };
