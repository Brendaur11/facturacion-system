import { format } from 'fast-csv';
import { Factura } from '../../facturas/entities/factura.entity';

export async function buildCsv(facturas: Factura[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, unknown>[] = [];

    for (const f of facturas) {
      for (const item of f.items ?? []) {
        rows.push({
          numero: f.numero,
          cliente: f.cliente?.nombre ?? '-',
          fecha: f.fecha,
          estado: f.estado,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotalItem: item.subtotal,
          subtotalFactura: f.subtotal,
          impuesto: f.impuesto,
          total: f.total,
        });
      }
    }

    const chunks: string[] = [];
    const stream = format({ headers: true });
    stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
    stream.on('end', () => resolve(chunks.join('')));
    stream.on('error', reject);
    rows.forEach((row) => stream.write(row));
    stream.end();
  });
}
