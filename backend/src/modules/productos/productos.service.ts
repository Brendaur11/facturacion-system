import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
  ) {}

  findAll(empresaId: string, search?: string) {
    const qb = this.productosRepository
      .createQueryBuilder('producto')
      .where('producto.activo = :activo', { activo: true })
      .andWhere('producto.empresaId = :empresaId', { empresaId });

    if (search) {
      qb.andWhere('LOWER(producto.nombre) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    return qb.orderBy('producto.nombre', 'ASC').getMany();
  }

  async findOne(id: string, empresaId: string) {
    const producto = await this.productosRepository.findOne({
      where: { id, empresaId },
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    return producto;
  }

  create(createProductoDto: CreateProductoDto, empresaId: string) {
    const producto = this.productosRepository.create({ ...createProductoDto, empresaId });
    return this.productosRepository.save(producto);
  }

  async update(id: string, updateProductoDto: UpdateProductoDto, empresaId: string) {
    await this.findOne(id, empresaId);
    await this.productosRepository.update(id, updateProductoDto);
    return this.findOne(id, empresaId);
  }

  async remove(id: string, empresaId: string) {
    await this.findOne(id, empresaId);
    await this.productosRepository.update(id, { activo: false });
  }

  async importFromBuffer(
    buffer: Buffer,
    empresaId: string,
  ): Promise<{ created: number; errors: Array<{ fila: number; mensaje: string }> }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const pick = (row: Record<string, unknown>, ...keys: string[]): string => {
      for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
      }
      return '';
    };

    const errors: Array<{ fila: number; mensaje: string }> = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nombre = pick(row, 'nombre', 'Nombre', 'NOMBRE');
      const precioRaw = pick(row, 'precio', 'Precio', 'PRECIO');
      const precio = parseFloat(precioRaw);

      if (!nombre) {
        errors.push({ fila: i + 2, mensaje: 'El campo nombre es obligatorio' });
        continue;
      }
      if (!precioRaw || isNaN(precio) || precio < 0) {
        errors.push({ fila: i + 2, mensaje: 'El campo precio debe ser un número mayor o igual a 0' });
        continue;
      }
      try {
        await this.create(
          {
            nombre,
            descripcion: pick(row, 'descripcion', 'Descripción', 'Descripcion', 'DESCRIPCION') || undefined,
            precio,
            unidad: pick(row, 'unidad', 'Unidad', 'UNIDAD') || undefined,
          },
          empresaId,
        );
        created++;
      } catch (err) {
        errors.push({ fila: i + 2, mensaje: `Error: ${(err as Error).message}` });
      }
    }

    return { created, errors };
  }
}
