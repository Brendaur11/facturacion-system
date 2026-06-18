import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassThrough } from 'stream';
import { In, Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ZipArchive } = require('archiver');
import { Factura } from '../facturas/entities/factura.entity';
import { buildCsv } from './builders/csv.builder';
import { buildDocx } from './builders/docx.builder';
import { buildPdf } from './builders/pdf.builder';
import { buildXlsx } from './builders/xlsx.builder';
import { ExportFacturasDto } from './dto/export-facturas.dto';

export interface ExportResult {
  data: Buffer;
  contentType: string;
  filename: string;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf:  'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv:  'text/csv; charset=utf-8',
  zip:  'application/zip',
};

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
  ) {}

  private async getFacturas(dto: ExportFacturasDto, empresaId: string): Promise<Factura[]> {
    const facturas = await this.facturasRepository.find({
      where: { id: In(dto.ids), empresa: { id: empresaId } },
      relations: { cliente: true, empresa: true, items: true },
    });
    if (facturas.length === 0) throw new NotFoundException('No se encontraron facturas');
    return facturas;
  }

  private async buildZip(
    facturas: Factura[],
    builderFn: (f: Factura[]) => Promise<Buffer | string>,
    ext: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const arc = new ZipArchive({ zlib: { level: 6 } });
      const pass = new PassThrough();
      const chunks: Buffer[] = [];

      pass.on('data', (chunk: Buffer) => chunks.push(chunk));
      pass.on('end', () => resolve(Buffer.concat(chunks)));
      pass.on('error', reject);
      arc.on('error', reject);
      arc.pipe(pass);

      const appendAll = async () => {
        for (const factura of facturas) {
          const raw = await builderFn([factura]);
          const buf = typeof raw === 'string' ? Buffer.from(raw, 'utf-8') : raw;
          arc.append(buf, { name: `${factura.numero}.${ext}` });
        }
        await arc.finalize();
      };

      appendAll().catch(reject);
    });
  }

  async exportPdf(dto: ExportFacturasDto, empresaId: string): Promise<ExportResult> {
    const facturas = await this.getFacturas(dto, empresaId);
    if (facturas.length === 1) {
      return { data: await buildPdf(facturas), contentType: CONTENT_TYPES.pdf, filename: `${facturas[0].numero}.pdf` };
    }
    return { data: await this.buildZip(facturas, buildPdf, 'pdf'), contentType: CONTENT_TYPES.zip, filename: 'facturas.zip' };
  }

  async exportXlsx(dto: ExportFacturasDto, empresaId: string): Promise<ExportResult> {
    const facturas = await this.getFacturas(dto, empresaId);
    if (facturas.length === 1) {
      return { data: await buildXlsx(facturas), contentType: CONTENT_TYPES.xlsx, filename: `${facturas[0].numero}.xlsx` };
    }
    return { data: await this.buildZip(facturas, buildXlsx, 'xlsx'), contentType: CONTENT_TYPES.zip, filename: 'facturas.zip' };
  }

  async exportDocx(dto: ExportFacturasDto, empresaId: string): Promise<ExportResult> {
    const facturas = await this.getFacturas(dto, empresaId);
    if (facturas.length === 1) {
      return { data: await buildDocx(facturas), contentType: CONTENT_TYPES.docx, filename: `${facturas[0].numero}.docx` };
    }
    return { data: await this.buildZip(facturas, buildDocx, 'docx'), contentType: CONTENT_TYPES.zip, filename: 'facturas.zip' };
  }

  async exportCsv(dto: ExportFacturasDto, empresaId: string): Promise<ExportResult> {
    const facturas = await this.getFacturas(dto, empresaId);
    if (facturas.length === 1) {
      const raw = await buildCsv(facturas);
      return { data: Buffer.from(raw, 'utf-8'), contentType: CONTENT_TYPES.csv, filename: `${facturas[0].numero}.csv` };
    }
    return { data: await this.buildZip(facturas, buildCsv, 'csv'), contentType: CONTENT_TYPES.zip, filename: 'facturas.zip' };
  }
}
