import * as ExcelJS from 'exceljs';
import { Factura } from '../../facturas/entities/factura.entity';

// Mirror the PDF/DOCX palette
const C = {
  dark:    'FF172031',
  accent:  'FF1D4ED8',
  light:   'FFF1F5F9',
  muted:   'FF64748B',
  white:   'FFFFFFFF',
  border:  'FFE2E8F0',
  total:   'FFDBEAFE',
  slate:   'FF94A3B8',
  green:   'FF16A34A',
  blue:    'FF3E68DB',
  gray:    'FF6B7280',
  red:     'FFB43434',
  amber:   'FFB45309',
};

const estadoColor: Record<string, string> = {
  PAGADA: C.green, EMITIDA: C.blue, BORRADOR: C.gray, ANULADA: C.red,
};

function fmt(n: number | string): string {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function font(opts: { bold?: boolean; color?: string; size?: number; italic?: boolean } = {}): Partial<ExcelJS.Font> {
  return { name: 'Calibri', bold: opts.bold, color: { argb: opts.color ?? C.dark.replace('FF','') }, size: opts.size ?? 10, italic: opts.italic };
}

function border(sides: ('top'|'bottom'|'left'|'right')[] = [], color = C.border): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: color } };
  return {
    top:    sides.includes('top')    ? edge : undefined,
    bottom: sides.includes('bottom') ? edge : undefined,
    left:   sides.includes('left')   ? edge : undefined,
    right:  sides.includes('right')  ? edge : undefined,
  };
}

export async function buildXlsx(facturas: Factura[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Facturación';
  workbook.created = new Date();

  for (const factura of facturas) {
    const sheetName = factura.numero.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 31);
    const ws = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0, footer: 0 } },
      views: [{ showGridLines: false }],
    });

    // ── Column widths (A=desc, B=qty, C=price, D=subtotal) ──────────
    ws.getColumn('A').width = 40;
    ws.getColumn('B').width = 10;
    ws.getColumn('C').width = 18;
    ws.getColumn('D').width = 18;

    let r = 1;

    // ── 1. Header ────────────────────────────────────────────────────
    // Row 1: company name (left) | invoice number (right)
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`C${r}:D${r}`);
    ws.getRow(r).height = 30;

    const companyCell = ws.getCell(`A${r}`);
    companyCell.value  = factura.empresa?.nombre ?? 'Empresa';
    companyCell.font   = font({ bold: true, color: 'FFFFFF', size: 16 });
    companyCell.fill   = fill(C.dark);
    companyCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const numCell = ws.getCell(`C${r}`);
    numCell.value  = `N° ${factura.numero}`;
    numCell.font   = font({ bold: true, color: 'FFFFFF', size: 16 });
    numCell.fill   = fill(C.dark);
    numCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    r++;

    // Row 2: CUIT/email (left) | blank (right — same dark bg)
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`C${r}:D${r}`);
    ws.getRow(r).height = 16;

    const subCell = ws.getCell(`A${r}`);
    subCell.value  = `CUIT: ${factura.empresa?.cuit ?? '-'}  ·  ${factura.empresa?.email ?? ''}  ·  ${factura.empresa?.direccion ?? ''}`;
    subCell.font   = font({ color: '94A3B8', size: 8 });
    subCell.fill   = fill(C.dark);
    subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    ws.getCell(`C${r}`).fill = fill(C.dark);
    r++;

    // Spacer
    ws.getRow(r).height = 8;
    r++;

    // ── 2. Info section ──────────────────────────────────────────────
    // Labels row
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`C${r}:D${r}`);
    ws.getRow(r).height = 14;

    const labelCliente = ws.getCell(`A${r}`);
    labelCliente.value = 'FACTURADO A';
    labelCliente.font  = font({ bold: true, color: C.muted.replace('FF',''), size: 8 });
    labelCliente.alignment = { vertical: 'middle' };

    const labelFactura = ws.getCell(`C${r}`);
    labelFactura.value = 'DATOS DE LA FACTURA';
    labelFactura.font  = font({ bold: true, color: C.muted.replace('FF',''), size: 8 });
    labelFactura.alignment = { vertical: 'middle' };
    r++;

    // Client + invoice data side by side
    const clientLines = [
      { v: factura.cliente?.nombre ?? '-', bold: true, size: 12, color: C.dark.replace('FF','') },
      { v: `CUIT/DNI: ${factura.cliente?.cuitDni ?? '-'}`, size: 9, color: C.muted.replace('FF','') },
      { v: factura.cliente?.email ?? '', size: 9, color: C.muted.replace('FF','') },
      { v: factura.cliente?.telefono ?? '', size: 9, color: C.muted.replace('FF','') },
      { v: factura.cliente?.direccion ?? '', size: 9, color: C.muted.replace('FF','') },
    ];

    const invoiceLines: { label: string; value: string; valueColor?: string }[] = [
      { label: 'Fecha de emisión:', value: String(factura.fecha) },
      ...(factura.fechaVencimiento ? [{ label: 'Vencimiento:', value: String(factura.fechaVencimiento), valueColor: C.amber.replace('FF','') }] : []),
      { label: 'Estado:', value: factura.estado, valueColor: (estadoColor[factura.estado] ?? C.muted).replace('FF','') },
    ];

    const maxLines = Math.max(clientLines.length, invoiceLines.length);
    for (let i = 0; i < maxLines; i++) {
      ws.mergeCells(`A${r}:B${r}`);
      ws.getRow(r).height = 14;

      if (clientLines[i]) {
        const cl = clientLines[i];
        const cell = ws.getCell(`A${r}`);
        cell.value = cl.v;
        cell.font  = font({ bold: cl.bold, size: cl.size, color: cl.color });
        cell.alignment = { vertical: 'middle' };
      }

      if (invoiceLines[i]) {
        const il = invoiceLines[i];
        ws.getCell(`C${r}`).value = il.label;
        ws.getCell(`C${r}`).font  = font({ size: 9, color: C.muted.replace('FF','') });
        ws.getCell(`C${r}`).alignment = { vertical: 'middle' };

        ws.getCell(`D${r}`).value = il.value;
        ws.getCell(`D${r}`).font  = font({ bold: true, size: 9, color: il.valueColor ?? C.dark.replace('FF','') });
        ws.getCell(`D${r}`).alignment = { vertical: 'middle', horizontal: 'right' };
      }
      r++;
    }

    // Divider
    ws.getRow(r).height = 2;
    ['A','B','C','D'].forEach(col => {
      const cell = ws.getCell(`${col}${r}`);
      cell.border = border(['bottom']);
    });
    r++;

    // Spacer
    ws.getRow(r).height = 6;
    r++;

    // ── 3. Items table header ────────────────────────────────────────
    ws.getRow(r).height = 22;
    const headers = [
      { col: 'A', text: 'DESCRIPCIÓN',  align: 'left'   as const },
      { col: 'B', text: 'CANT.',        align: 'center' as const },
      { col: 'C', text: 'PRECIO UNIT.', align: 'right'  as const },
      { col: 'D', text: 'SUBTOTAL',     align: 'right'  as const },
    ];
    for (const h of headers) {
      const cell = ws.getCell(`${h.col}${r}`);
      cell.value = h.text;
      cell.font  = font({ bold: true, color: 'FFFFFF', size: 9 });
      cell.fill  = fill(C.dark);
      cell.alignment = { vertical: 'middle', horizontal: h.align, indent: h.align === 'left' ? 1 : 0 };
    }
    r++;

    // ── 4. Item rows ─────────────────────────────────────────────────
    const items = factura.items ?? [];
    for (let i = 0; i < items.length; i++) {
      const item  = items[i];
      const rowFill = fill(i % 2 === 0 ? 'FFFFFFFF' : C.light);
      ws.getRow(r).height = 18;

      const desc = ws.getCell(`A${r}`);
      desc.value = item.descripcion;
      desc.font  = font({ size: 9 });
      desc.fill  = rowFill;
      desc.alignment = { vertical: 'middle', indent: 1 };
      desc.border = border(['top','bottom']);

      const qty = ws.getCell(`B${r}`);
      qty.value = Number(item.cantidad);
      qty.font  = font({ size: 9 });
      qty.fill  = rowFill;
      qty.alignment = { vertical: 'middle', horizontal: 'center' };
      qty.border = border(['top','bottom']);

      const price = ws.getCell(`C${r}`);
      price.value = Number(item.precioUnitario);
      price.numFmt = '"$"#,##0.00';
      price.font  = font({ size: 9 });
      price.fill  = rowFill;
      price.alignment = { vertical: 'middle', horizontal: 'right' };
      price.border = border(['top','bottom']);

      const sub = ws.getCell(`D${r}`);
      sub.value = Number(item.subtotal);
      sub.numFmt = '"$"#,##0.00';
      sub.font  = font({ size: 9 });
      sub.fill  = rowFill;
      sub.alignment = { vertical: 'middle', horizontal: 'right' };
      sub.border = border(['top','bottom']);

      r++;
    }

    // Spacer
    ws.getRow(r).height = 8;
    r++;

    // ── 5. Totals (right-aligned like PDF) ───────────────────────────
    const subtotal = Number(factura.subtotal);
    const imp      = subtotal * Number(factura.impuesto) / 100;
    const total    = Number(factura.total);

    const totalsRows: { label: string; value: number; isBig?: boolean }[] = [
      { label: 'Subtotal', value: subtotal },
      { label: `IVA (${factura.impuesto}%)`, value: imp },
      { label: 'TOTAL', value: total, isBig: true },
    ];

    for (const tot of totalsRows) {
      ws.mergeCells(`A${r}:C${r}`);
      ws.getRow(r).height = tot.isBig ? 24 : 18;

      const lCell = ws.getCell(`A${r}`);
      lCell.value = tot.label;
      lCell.font  = font({ bold: tot.isBig, size: tot.isBig ? 12 : 9, color: tot.isBig ? 'FFFFFF' : C.muted.replace('FF','') });
      lCell.fill  = tot.isBig ? fill(C.accent) : undefined!;
      lCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

      const vCell = ws.getCell(`D${r}`);
      vCell.value  = tot.value;
      vCell.numFmt = '"$"#,##0.00';
      vCell.font   = font({ bold: tot.isBig, size: tot.isBig ? 14 : 9, color: tot.isBig ? 'FFFFFF' : C.dark.replace('FF','') });
      vCell.fill   = tot.isBig ? fill(C.accent) : undefined!;
      vCell.alignment = { vertical: 'middle', horizontal: 'right' };

      r++;
    }

    // ── 6. Notes ─────────────────────────────────────────────────────
    if (factura.notas) {
      ws.getRow(r).height = 8; r++;
      ws.mergeCells(`A${r}:D${r}`);
      ws.getCell(`A${r}`).value = 'NOTAS';
      ws.getCell(`A${r}`).font  = font({ bold: true, size: 8, color: C.muted.replace('FF','') });
      r++;
      ws.mergeCells(`A${r}:D${r}`);
      ws.getCell(`A${r}`).value = factura.notas;
      ws.getCell(`A${r}`).font  = font({ italic: true, size: 9 });
      ws.getCell(`A${r}`).alignment = { wrapText: true };
      ws.getRow(r).height = 20;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
