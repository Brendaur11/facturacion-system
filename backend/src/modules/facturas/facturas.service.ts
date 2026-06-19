import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '../auth/mailer.service';
import { buildPdf } from '../export/builders/pdf.builder';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaEstadoDto } from './dto/update-factura.dto';
import { FacturaEstado } from './entities/factura.entity';
import { Factura } from './entities/factura.entity';
import { FacturaItem } from './entities/factura-item.entity';

@Injectable()
export class FacturasService {
  private readonly logger = new Logger(FacturasService.name);

  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
    @InjectRepository(FacturaItem)
    private readonly itemsRepository: Repository<FacturaItem>,
    private readonly mailerService: MailerService,
  ) {}

  findAll(empresaId: string, estado?: FacturaEstado, clienteId?: string) {
    const qb = this.facturasRepository
      .createQueryBuilder('factura')
      .leftJoinAndSelect('factura.cliente', 'cliente')
      .leftJoinAndSelect('factura.empresa', 'empresa')
      .where('factura.empresaId = :empresaId', { empresaId })
      .orderBy('factura.createdAt', 'DESC');

    if (estado) qb.andWhere('factura.estado = :estado', { estado });
    if (clienteId) qb.andWhere('cliente.id = :clienteId', { clienteId });

    return qb.getMany();
  }

  async findOne(id: string, empresaId: string) {
    const factura = await this.facturasRepository
      .createQueryBuilder('factura')
      .leftJoinAndSelect('factura.cliente', 'cliente')
      .leftJoinAndSelect('factura.empresa', 'empresa')
      .leftJoinAndSelect('factura.items', 'items')
      .where('factura.id = :id', { id })
      .andWhere('factura.empresaId = :empresaId', { empresaId })
      .getOne();
    if (!factura) throw new NotFoundException(`Factura ${id} no encontrada`);
    return factura;
  }

  async create(createFacturaDto: CreateFacturaDto, empresaId: string) {
    const { items, clienteId, impuesto = 0, ...rest } = createFacturaDto;

    const subtotal = items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0,
    );
    const total = subtotal + subtotal * (impuesto / 100);

    const count = await this.facturasRepository.count({
      where: { empresa: { id: empresaId } },
    });
    const numero = `FAC-${String(count + 1).padStart(4, '0')}`;

    const mappedItems = items.map((item) => {
      const facturaItem = this.itemsRepository.create({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.cantidad * item.precioUnitario,
      });
      if (item.productoId) {
        facturaItem.producto = { id: item.productoId } as any;
      }
      return facturaItem;
    });

    const factura = this.facturasRepository.create({
      ...rest,
      numero,
      cliente: { id: clienteId } as any,
      empresa: { id: empresaId } as any,
      subtotal,
      impuesto,
      total,
      items: mappedItems,
    });

    return this.facturasRepository.save(factura);
  }

  async updateEstado(id: string, dto: UpdateFacturaEstadoDto, empresaId: string) {
    const factura = await this.findOne(id, empresaId);
    if (factura.estado === FacturaEstado.ANULADA) {
      throw new BadRequestException('Una factura anulada no puede modificarse');
    }
    await this.facturasRepository.update(id, { estado: dto.estado });
    return this.findOne(id, empresaId);
  }

  async remove(id: string, empresaId: string) {
    const factura = await this.findOne(id, empresaId);
    if (factura.estado !== FacturaEstado.BORRADOR) {
      throw new BadRequestException('Solo se pueden eliminar facturas en estado BORRADOR');
    }
    await this.facturasRepository.delete(id);
  }

  async sendInvoiceByEmail(id: string, empresaId: string): Promise<{ email: string }> {
    const factura = await this.findOne(id, empresaId);
    if (!factura.cliente?.email) {
      throw new BadRequestException('El cliente no tiene email registrado');
    }
    try {
      const pdfBuffer = await buildPdf([factura]);
      await this.mailerService.sendInvoice(factura.cliente.email, factura, pdfBuffer);
    } catch (err) {
      this.logger.error('Error al enviar email', err);
      throw new InternalServerErrorException('No se pudo enviar el email. Verificá la configuración SMTP en el servidor.');
    }
    return { email: factura.cliente.email };
  }
}
