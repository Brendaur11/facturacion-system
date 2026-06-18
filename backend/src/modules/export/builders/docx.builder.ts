import {
  AlignmentType,
  BorderStyle,
  Document,
  HorizontalPositionAlign,
  ITableCellOptions,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from 'docx';
import { Factura } from '../../facturas/entities/factura.entity';

// Mirror the PDF palette (no # prefix for docx)
const DARK   = '172031';
const ACCENT = '1D4ED8';
const LIGHT  = 'F1F5F9';
const MUTED  = '64748B';
const WHITE  = 'FFFFFF';
const BORDER = 'E2E8F0';
const TOTAL_BG = 'DBEAFE';

const NONE_BORDER = { style: BorderStyle.NONE } as const;
const THIN_H: any = { style: BorderStyle.SINGLE, size: 1, color: BORDER };

function fmt(n: number | string): string {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helpers ──────────────────────────────────────────────────────────────────

function run(text: string, opts: { bold?: boolean; color?: string; size?: number; italic?: boolean } = {}): TextRun {
  return new TextRun({ text, font: 'Calibri', bold: opts.bold, color: opts.color ?? DARK, size: opts.size ?? 20, italics: opts.italic });
}

function para(children: TextRun[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): Paragraph {
  return new Paragraph({ alignment: align, children });
}

function spacer(): Paragraph {
  return new Paragraph({ children: [run('')], spacing: { before: 0, after: 80 } });
}

function divider(): Paragraph {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } },
    spacing: { before: 80, after: 160 },
  });
}

function noTableBorders(extra: Record<string, any> = {}): any {
  return {
    top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER,
    insideHorizontal: NONE_BORDER, insideVertical: NONE_BORDER,
    ...extra,
  };
}

function tc(children: Paragraph[], opts: {
  bg?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  margins?: ITableCellOptions['margins']; borders?: ITableCellOptions['borders'];
  width?: number;
} = {}): TableCell {
  const defaultBorders: ITableCellOptions['borders'] = {
    top: THIN_H, bottom: THIN_H, left: NONE_BORDER, right: NONE_BORDER,
  };
  return new TableCell({
    shading: opts.bg ? { type: ShadingType.CLEAR, fill: opts.bg } : undefined,
    margins: opts.margins ?? { top: 80, bottom: 80, left: 120, right: 120 },
    borders: opts.borders ?? defaultBorders,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children,
  });
}

// Sections ──────────────────────────────────────────────────────────────────

function buildFacturaDocx(factura: Factura): (Table | Paragraph)[] {
  const empresa  = factura.empresa;
  const cliente  = factura.cliente;
  const items    = factura.items ?? [];
  const subtotal = Number(factura.subtotal);
  const impuesto = subtotal * Number(factura.impuesto) / 100;
  const total    = Number(factura.total);

  const estadoColorMap: Record<string, string> = {
    PAGADA: '16A34A', EMITIDA: '3E68DB', BORRADOR: '6B7280', ANULADA: 'B43434',
  };
  const estadoColor = estadoColorMap[factura.estado] ?? MUTED;

  const noBorder: ITableCellOptions['borders'] = {
    top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER,
  };

  // ── 1. Header (dark bar: company left, invoice number right) ─────────
  const header = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noTableBorders(),
    rows: [
      new TableRow({
        height: { value: convertInchesToTwip(0.85), rule: 'atLeast' },
        children: [
          // Left: company info
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: DARK },
            borders: noBorder,
            margins: { top: 160, bottom: 120, left: 220, right: 120 },
            children: [
              para([run(empresa?.nombre ?? 'Empresa', { bold: true, color: WHITE, size: 36 })]),
              para([run(`CUIT: ${empresa?.cuit ?? '-'}  ·  ${empresa?.email ?? ''}`, { color: '94A3B8', size: 16 })]),
            ],
          }),
          // Right: invoice number
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: DARK },
            borders: noBorder,
            margins: { top: 160, bottom: 120, left: 120, right: 220 },
            children: [
              para([run(`N° ${factura.numero}`, { bold: true, color: WHITE, size: 40 })], AlignmentType.RIGHT),
            ],
          }),
        ],
      }),
    ],
  });

  // ── 2. Info columns (client left, invoice data right) ────────────────
  const info = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noTableBorders({ insideVertical: { style: BorderStyle.SINGLE, size: 2, color: BORDER } }),
    rows: [
      new TableRow({
        children: [
          // Client
          new TableCell({
            borders: noBorder,
            margins: { top: 120, bottom: 120, left: 0, right: 200 },
            children: [
              para([run('FACTURADO A', { bold: true, color: MUTED, size: 15 })]),
              spacer(),
              para([run(cliente?.nombre ?? '-', { bold: true, color: DARK, size: 24 })]),
              para([run(cliente?.cuitDni ? `CUIT/DNI: ${cliente.cuitDni}` : '', { color: MUTED, size: 18 })]),
              para([run(cliente?.email ?? '', { color: MUTED, size: 18 })]),
              para([run(cliente?.telefono ?? '', { color: MUTED, size: 18 })]),
              para([run(cliente?.direccion ?? '', { color: MUTED, size: 18 })]),
            ],
          }),
          // Invoice data
          new TableCell({
            borders: noBorder,
            margins: { top: 120, bottom: 120, left: 200, right: 0 },
            children: [
              para([run('DATOS DE LA FACTURA', { bold: true, color: MUTED, size: 15 })]),
              spacer(),
              para([run('Fecha de emisión:  ', { color: MUTED, size: 18 }), run(String(factura.fecha), { bold: true, size: 18 })]),
              ...(factura.fechaVencimiento
                ? [para([run('Vencimiento:  ', { color: MUTED, size: 18 }), run(String(factura.fechaVencimiento), { bold: true, color: 'B45309', size: 18 })])]
                : []),
              para([run('Estado:  ', { color: MUTED, size: 18 }), run(factura.estado, { bold: true, color: estadoColor, size: 18 })]),
            ],
          }),
        ],
      }),
    ],
  });

  // ── 3. Items table ───────────────────────────────────────────────────
  // Column widths in twentieths of a point — total ~9360 twips for Letter
  const colWidths = [5300, 1000, 1800, 1800];

  const tableHeaderRow = new TableRow({
    children: [
      { text: 'DESCRIPCIÓN', align: AlignmentType.LEFT },
      { text: 'CANT.', align: AlignmentType.CENTER },
      { text: 'PRECIO UNIT.', align: AlignmentType.RIGHT },
      { text: 'SUBTOTAL', align: AlignmentType.RIGHT },
    ].map(({ text, align }, i) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: DARK },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        borders: noBorder,
        width: { size: colWidths[i], type: WidthType.DXA },
        children: [para([run(text, { bold: true, color: WHITE, size: 17 })], align)],
      })
    ),
  });

  const dataRows = items.map((item, idx) => {
    const bg = idx % 2 === 0 ? WHITE : LIGHT;
    const cellBorders: ITableCellOptions['borders'] = {
      top: THIN_H, bottom: THIN_H, left: NONE_BORDER, right: NONE_BORDER,
    };
    return new TableRow({
      children: [
        new TableCell({ shading: { type: ShadingType.CLEAR, fill: bg }, borders: cellBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: colWidths[0], type: WidthType.DXA }, children: [para([run(item.descripcion, { size: 18 })])] }),
        new TableCell({ shading: { type: ShadingType.CLEAR, fill: bg }, borders: cellBorders, margins: { top: 80, bottom: 80, left: 60, right: 60 },   width: { size: colWidths[1], type: WidthType.DXA }, children: [para([run(String(item.cantidad), { size: 18 })], AlignmentType.CENTER)] }),
        new TableCell({ shading: { type: ShadingType.CLEAR, fill: bg }, borders: cellBorders, margins: { top: 80, bottom: 80, left: 60, right: 120 },  width: { size: colWidths[2], type: WidthType.DXA }, children: [para([run(fmt(item.precioUnitario), { size: 18 })], AlignmentType.RIGHT)] }),
        new TableCell({ shading: { type: ShadingType.CLEAR, fill: bg }, borders: cellBorders, margins: { top: 80, bottom: 80, left: 60, right: 120 },  width: { size: colWidths[3], type: WidthType.DXA }, children: [para([run(fmt(item.subtotal), { size: 18 })], AlignmentType.RIGHT)] }),
      ],
    });
  });

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noTableBorders(),
    rows: [tableHeaderRow, ...dataRows],
  });

  // ── 4. Totals (right-aligned, mirrors PDF) ───────────────────────────
  const totalsTable = new Table({
    width: { size: 45, type: WidthType.PERCENTAGE },
    alignment: HorizontalPositionAlign.RIGHT,
    borders: noTableBorders(),
    rows: [
      // Subtotal
      new TableRow({
        children: [
          new TableCell({ borders: noBorder, margins: { top: 60, bottom: 60, left: 120, right: 80 }, children: [para([run('Subtotal', { color: MUTED, size: 18 })])] }),
          new TableCell({ borders: noBorder, margins: { top: 60, bottom: 60, left: 80, right: 120 }, children: [para([run(fmt(subtotal), { size: 18 })], AlignmentType.RIGHT)] }),
        ],
      }),
      // IVA
      new TableRow({
        children: [
          new TableCell({ borders: noBorder, margins: { top: 60, bottom: 60, left: 120, right: 80 }, children: [para([run(`IVA (${factura.impuesto}%)`, { color: MUTED, size: 18 })])] }),
          new TableCell({ borders: noBorder, margins: { top: 60, bottom: 60, left: 80, right: 120 }, children: [para([run(fmt(impuesto), { size: 18 })], AlignmentType.RIGHT)] }),
        ],
      }),
      // TOTAL (blue bg)
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: ACCENT },
            borders: noBorder,
            margins: { top: 120, bottom: 120, left: 160, right: 80 },
            children: [para([run('TOTAL', { bold: true, color: WHITE, size: 24 })])],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: ACCENT },
            borders: noBorder,
            margins: { top: 120, bottom: 120, left: 80, right: 160 },
            children: [para([run(fmt(total), { bold: true, color: WHITE, size: 28 })], AlignmentType.RIGHT)],
          }),
        ],
      }),
    ],
  });

  const result: (Table | Paragraph)[] = [
    header,
    spacer(),
    info,
    divider(),
    itemsTable,
    spacer(),
    totalsTable,
  ];

  // ── 5. Notes ─────────────────────────────────────────────────────────
  if (factura.notas) {
    result.push(
      spacer(),
      para([run('NOTAS', { bold: true, color: MUTED, size: 16 })]),
      para([run(factura.notas, { italic: true, color: DARK, size: 18 })]),
    );
  }

  return result;
}

export async function buildDocx(facturas: Factura[]): Promise<Buffer> {
  const children: (Table | Paragraph)[] = [];

  for (let i = 0; i < facturas.length; i++) {
    children.push(...buildFacturaDocx(facturas[i]));
    if (i < facturas.length - 1) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20, color: DARK } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.75),
            left:   convertInchesToTwip(0.9),
            right:  convertInchesToTwip(0.9),
          },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
