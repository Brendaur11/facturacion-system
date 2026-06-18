import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factura, FacturaEstado } from '../facturas/entities/factura.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
  ) {}

  async getResumen(empresaId: string) {
    const [emitidas, pagadas, borradores, anuladas] = await Promise.all([
      this.facturasRepository.count({ where: { estado: FacturaEstado.EMITIDA, empresa: { id: empresaId } } }),
      this.facturasRepository.count({ where: { estado: FacturaEstado.PAGADA, empresa: { id: empresaId } } }),
      this.facturasRepository.count({ where: { estado: FacturaEstado.BORRADOR, empresa: { id: empresaId } } }),
      this.facturasRepository.count({ where: { estado: FacturaEstado.ANULADA, empresa: { id: empresaId } } }),
    ]);

    const totalPagado = await this.facturasRepository
      .createQueryBuilder('f')
      .select('SUM(f.total)', 'sum')
      .where('f.estado = :estado', { estado: FacturaEstado.PAGADA })
      .andWhere('f.empresaId = :empresaId', { empresaId })
      .getRawOne<{ sum: string }>();

    const totalPendiente = await this.facturasRepository
      .createQueryBuilder('f')
      .select('SUM(f.total)', 'sum')
      .where('f.estado = :estado', { estado: FacturaEstado.EMITIDA })
      .andWhere('f.empresaId = :empresaId', { empresaId })
      .getRawOne<{ sum: string }>();

    return {
      emitidas,
      pagadas,
      borradores,
      anuladas,
      totalPagado: parseFloat(totalPagado?.sum ?? '0'),
      totalPendiente: parseFloat(totalPendiente?.sum ?? '0'),
    };
  }

  getUltimas(empresaId: string) {
    return this.facturasRepository.find({
      where: { empresa: { id: empresaId } },
      order: { createdAt: 'DESC' },
      take: 5,
    });
  }

  async getPorMes(empresaId: string): Promise<Array<{ mes: string; total: number; cantidad: number }>> {
    const rows = await this.facturasRepository
      .createQueryBuilder('f')
      .select("TO_CHAR(f.fecha, 'YYYY-MM')", 'mes')
      .addSelect('SUM(f.total)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('f.estado = :estado', { estado: FacturaEstado.PAGADA })
      .andWhere('f.empresaId = :empresaId', { empresaId })
      .andWhere(
        "f.fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'",
      )
      .groupBy("TO_CHAR(f.fecha, 'YYYY-MM')")
      .orderBy('mes', 'ASC')
      .getRawMany<{ mes: string; total: string; cantidad: string }>();

    return rows.map((r) => ({
      mes: r.mes,
      total: parseFloat(r.total ?? '0'),
      cantidad: parseInt(r.cantidad ?? '0', 10),
    }));
  }
}
