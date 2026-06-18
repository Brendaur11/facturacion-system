import * as pdfmake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Factura } from '../../facturas/entities/factura.entity';

// __importStar wraps both modules; .default points to the original module
// that pdfmake reads its own .vfs from internally.
const pdfMakeInstance: any = (pdfmake as any).default;
pdfMakeInstance.vfs = pdfFonts;

const DARK   = '#172031';
const ACCENT = '#1d4ed8';
const LIGHT  = '#f1f5f9';
const MUTED  = '#64748b';
const WHITE  = '#ffffff';
const BORDER = '#e2e8f0';

function fmt(n: number | string) {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildFacturaPdf(factura: Factura): any[] {
  const empresa  = factura.empresa;
  const cliente  = factura.cliente;
  const items    = factura.items ?? [];
  const subtotal = Number(factura.subtotal);
  const impuesto = subtotal * Number(factura.impuesto) / 100;
  const total    = Number(factura.total);

  const estadoColors: Record<string, string> = {
    PAGADA:   '#16a34a',
    EMITIDA:  '#3e68db',
    BORRADOR: '#6b7280',
    ANULADA:  '#b43434',
  };
  const estadoColor = estadoColors[factura.estado] ?? MUTED;

  return [
    // ── Header ──────────────────────────────────────────────────────────
    {
      canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 80, r: 6, color: DARK }],
      margin: [0, 0, 0, 0],
    },
    {
      columns: [
        {
          stack: [
            { text: empresa?.nombre ?? 'Empresa', fontSize: 18, bold: true, color: WHITE },
            { text: `CUIT: ${empresa?.cuit ?? '-'}`, fontSize: 9, color: '#94a3b8', margin: [0, 2, 0, 0] },
            { text: empresa?.email ?? '', fontSize: 9, color: '#94a3b8' },
          ],
        },
        {
          stack: [
            { text: `N° ${factura.numero}`, fontSize: 20, bold: true, color: WHITE, alignment: 'right' },
            // {
            //   text: factura.estado,
            //   fontSize: 9,
            //   bold: true,
            //   color: WHITE,
            //   alignment: 'right',
            //   background: estadoColor,
            //   margin: [0, 4, 0, 0],
            //   padding: [4, 2, 4, 2],
            //   borderRadius: [4, 4, 4, 4],
            // },
          ],
        },
      ],
      margin: [16, -70, 16, 40],
    },

    // ── Info row ────────────────────────────────────────────────────────
    {
      columns: [
        // Facturado a
        {
          stack: [
            { text: 'FACTURADO A', fontSize: 8, bold: true, color: MUTED, margin: [0, 0, 0, 4] },
            { text: cliente?.nombre ?? '-', fontSize: 12, bold: true, color: DARK },
            { text: cliente?.cuitDni ? `CUIT/DNI: ${cliente.cuitDni}` : '', fontSize: 9, color: MUTED },
            { text: cliente?.email ?? '', fontSize: 9, color: MUTED },
            { text: cliente?.telefono ?? '', fontSize: 9, color: MUTED },
            { text: cliente?.direccion ?? '', fontSize: 9, color: MUTED },
          ],
          width: '*',
        },
        // Datos de factura
        {
          stack: [
            { text: 'DATOS DE LA FACTURA', fontSize: 8, bold: true, color: MUTED, margin: [0, 0, 0, 4] },
            {
              columns: [
                { text: 'Fecha de emisión:', fontSize: 9, color: MUTED, width: 80 },
                { text: String(factura.fecha), fontSize: 9, bold: true, color: DARK },
              ],
              margin: [0, 2, 0, 0],
            },
            ...(factura.fechaVencimiento ? [{
              columns: [
                { text: 'Vencimiento:', fontSize: 9, color: MUTED, width: 80 },
                { text: String(factura.fechaVencimiento), fontSize: 9, bold: true, color: '#b45309' },
              ],
              margin: [0, 2, 0, 0],
            }] : []),
            {
              columns: [
                { text: 'Estado:', fontSize: 9, color: MUTED, width: 80 },
                { text: factura.estado, fontSize: 9, bold: true, color: estadoColor },
              ],
              margin: [0, 2, 0, 0],
            },
          ],
          width: 200,
        },
      ],
      margin: [0, 0, 0, 20],
    },

    // ── Divider ─────────────────────────────────────────────────────────
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 0, 0, 16] },

    // ── Items table ─────────────────────────────────────────────────────
    {
      table: {
        headerRows: 1,
        widths: ['*', 55, 80, 80],
        body: [
          // Header row
          [
            { text: 'DESCRIPCIÓN', style: 'tableHeader' },
            { text: 'CANT.', style: 'tableHeader', alignment: 'center' },
            { text: 'PRECIO UNIT.', style: 'tableHeader', alignment: 'right' },
            { text: 'SUBTOTAL', style: 'tableHeader', alignment: 'right' },
          ],
          // Data rows
          ...items.map((item, idx) => [
            { text: item.descripcion, fontSize: 9, color: DARK, fillColor: idx % 2 === 0 ? WHITE : LIGHT, margin: [4, 6, 4, 6] },
            { text: String(item.cantidad), fontSize: 9, color: DARK, alignment: 'center', fillColor: idx % 2 === 0 ? WHITE : LIGHT, margin: [4, 6, 4, 6] },
            { text: fmt(item.precioUnitario), fontSize: 9, color: DARK, alignment: 'right', fillColor: idx % 2 === 0 ? WHITE : LIGHT, margin: [4, 6, 4, 6] },
            { text: fmt(item.subtotal), fontSize: 9, color: DARK, alignment: 'right', fillColor: idx % 2 === 0 ? WHITE : LIGHT, margin: [4, 6, 4, 6] },
          ]),
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => BORDER,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 20],
    },

    // ── Totals ──────────────────────────────────────────────────────────
    {
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          stack: [
            {
              columns: [
                { text: 'Subtotal', fontSize: 9, color: MUTED },
                { text: fmt(subtotal), fontSize: 9, color: DARK, alignment: 'right' },
              ],
              margin: [0, 0, 0, 6],
            },
            {
              columns: [
                { text: `IVA (${factura.impuesto}%)`, fontSize: 9, color: MUTED },
                { text: fmt(impuesto), fontSize: 9, color: DARK, alignment: 'right' },
              ],
              margin: [0, 0, 0, 8],
            },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 0, 0, 8] },
            {
              fillColor: ACCENT,
              borderRadius: [4, 4, 4, 4],
              columns: [
                { text: 'TOTAL', fontSize: 12, bold: true, color: WHITE, margin: [10, 8, 0, 8] },
                { text: fmt(total), fontSize: 14, bold: true, color: WHITE, alignment: 'right', margin: [0, 7, 10, 7] },
              ],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 24],
    },

    // ── Notas ───────────────────────────────────────────────────────────
    ...(factura.notas ? [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER }], margin: [0, 0, 0, 12] },
      { text: 'NOTAS', fontSize: 8, bold: true, color: MUTED, margin: [0, 0, 0, 4] },
      { text: factura.notas, fontSize: 9, color: DARK, italics: true },
    ] : []),
  ];
}

export async function buildPdf(facturas: Factura[]): Promise<Buffer> {
  const content: any[] = [];

  for (let i = 0; i < facturas.length; i++) {
    content.push(...buildFacturaPdf(facturas[i]));
    if (i < facturas.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  const docDefinition = {
    pageMargins: [40, 40, 40, 50],
    content,
    styles: {
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: WHITE,
        fillColor: DARK,
        margin: [4, 7, 4, 7],
        borderRadius: [4, 4, 0, 0],
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: DARK,
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `${facturas[0]?.empresa?.nombre ?? ''} · ${facturas[0]?.empresa?.direccion ?? ''}`, fontSize: 7, color: '#94a3b8', margin: [40, 10, 0, 0] },
        { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#94a3b8', alignment: 'right', margin: [0, 10, 40, 0] },
      ],
    }),
  };

  const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
  const data = await pdfDoc.getBuffer();
  return Buffer.from(data);
}
