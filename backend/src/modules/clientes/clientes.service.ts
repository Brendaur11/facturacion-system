import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
  ) {}

  findAll(empresaId: string, search?: string) {
    const qb = this.clientesRepository
      .createQueryBuilder('cliente')
      .where('cliente.activo = :activo', { activo: true })
      .andWhere('cliente.empresaId = :empresaId', { empresaId });

    if (search) {
      qb.andWhere(
        '(LOWER(cliente.nombre) LIKE :search OR LOWER(cliente.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    return qb.orderBy('cliente.nombre', 'ASC').getMany();
  }

  async findOne(id: string, empresaId: string) {
    const cliente = await this.clientesRepository.findOne({
      where: { id, empresaId },
    });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return cliente;
  }

  create(createClienteDto: CreateClienteDto, empresaId: string) {
    const cliente = this.clientesRepository.create({ ...createClienteDto, empresaId });
    return this.clientesRepository.save(cliente);
  }

  async update(id: string, updateClienteDto: UpdateClienteDto, empresaId: string) {
    await this.findOne(id, empresaId);
    await this.clientesRepository.update(id, updateClienteDto);
    return this.findOne(id, empresaId);
  }

  async remove(id: string, empresaId: string) {
    await this.findOne(id, empresaId);
    await this.clientesRepository.update(id, { activo: false });
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
      if (!nombre) {
        errors.push({ fila: i + 2, mensaje: 'El campo nombre es obligatorio' });
        continue;
      }
      try {
        await this.create(
          {
            nombre,
            email: pick(row, 'email', 'Email', 'EMAIL') || undefined,
            telefono: pick(row, 'telefono', 'Teléfono', 'Telefono', 'TELEFONO') || undefined,
            direccion: pick(row, 'direccion', 'Dirección', 'Direccion', 'DIRECCION') || undefined,
            cuitDni: pick(row, 'cuitDni', 'CUIT/DNI', 'cuit_dni', 'cuit', 'CUIT', 'CUITDNI') || undefined,
          },
          empresaId,
        );
        created++;
      } catch {
        errors.push({ fila: i + 2, mensaje: 'Error al guardar el registro. Verificá los datos.' });
      }
    }

    return { created, errors };
  }
}
