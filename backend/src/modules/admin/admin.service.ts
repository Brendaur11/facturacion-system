import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import { CreateEmpresaDto } from '../empresa/dto/create-empresa.dto';
import { UpdateEmpresaDto } from '../empresa/dto/update-empresa.dto';
import { Empresa } from '../empresa/entities/empresa.entity';
import { Factura, FacturaEstado } from '../facturas/entities/factura.entity';
import { Producto } from '../productos/entities/producto.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresasRepo: Repository<Empresa>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Factura)
    private readonly facturasRepo: Repository<Factura>,
    @InjectRepository(Cliente)
    private readonly clientesRepo: Repository<Cliente>,
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
  ) {}

  // ── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard() {
    const [totalEmpresas, totalUsuarios, totalFacturas] = await Promise.all([
      this.empresasRepo.count(),
      this.usersRepo.count({ where: { rol: Not(UserRole.SUPERADMIN) } }),
      this.facturasRepo.count(),
    ]);

    const [ingresosPagados, distribucion, topEmpresas, clientesPorEmpresa, productosPorEmpresa, facturasPorMes] =
      await Promise.all([
        // Total ingresos globales
        this.facturasRepo
          .createQueryBuilder('f')
          .select('COALESCE(SUM(f.total), 0)', 'sum')
          .where('f.estado = :estado', { estado: FacturaEstado.PAGADA })
          .getRawOne<{ sum: string }>(),

        // Distribución de estados
        Promise.all([
          this.facturasRepo.count({ where: { estado: FacturaEstado.BORRADOR } }),
          this.facturasRepo.count({ where: { estado: FacturaEstado.EMITIDA } }),
          this.facturasRepo.count({ where: { estado: FacturaEstado.PAGADA } }),
          this.facturasRepo.count({ where: { estado: FacturaEstado.ANULADA } }),
        ]),

        // Top 5 empresas por facturas + ingresos
        this.facturasRepo
          .createQueryBuilder('f')
          .select('e.id', 'id')
          .addSelect('e.nombre', 'nombre')
          .addSelect('COUNT(f.id)', 'facturas')
          .addSelect(
            "COALESCE(SUM(CASE WHEN f.estado = 'PAGADA' THEN f.total ELSE 0 END), 0)",
            'ingresos',
          )
          .leftJoin('f.empresa', 'e')
          .groupBy('e.id, e.nombre')
          .orderBy('facturas', 'DESC')
          .limit(5)
          .getRawMany<{ id: string; nombre: string; facturas: string; ingresos: string }>(),

        // Clientes activos por empresa
        this.clientesRepo
          .createQueryBuilder('c')
          .select('c.empresaId', 'empresaId')
          .addSelect('COUNT(*)', 'total')
          .where('c.activo = :activo', { activo: true })
          .groupBy('c.empresaId')
          .getRawMany<{ empresaId: string; total: string }>(),

        // Productos activos por empresa
        this.productosRepo
          .createQueryBuilder('p')
          .select('p.empresaId', 'empresaId')
          .addSelect('COUNT(*)', 'total')
          .where('p.activo = :activo', { activo: true })
          .groupBy('p.empresaId')
          .getRawMany<{ empresaId: string; total: string }>(),

        // Facturas pagadas por mes (últimos 6 meses, global)
        this.facturasRepo
          .createQueryBuilder('f')
          .select("TO_CHAR(f.fecha, 'YYYY-MM')", 'mes')
          .addSelect('COALESCE(SUM(f.total), 0)', 'total')
          .addSelect('COUNT(*)', 'cantidad')
          .where('f.estado = :estado', { estado: FacturaEstado.PAGADA })
          .andWhere(
            "f.fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'",
          )
          .groupBy("TO_CHAR(f.fecha, 'YYYY-MM')")
          .orderBy('mes', 'ASC')
          .getRawMany<{ mes: string; total: string; cantidad: string }>(),
      ]);

    const clienteMap = Object.fromEntries(
      clientesPorEmpresa.map((r) => [r.empresaId, parseInt(r.total, 10)]),
    );
    const productoMap = Object.fromEntries(
      productosPorEmpresa.map((r) => [r.empresaId, parseInt(r.total, 10)]),
    );

    return {
      totales: {
        empresas: totalEmpresas,
        usuarios: totalUsuarios,
        facturas: totalFacturas,
        ingresos: parseFloat(ingresosPagados?.sum ?? '0'),
      },
      distribucionEstados: {
        BORRADOR: distribucion[0],
        EMITIDA: distribucion[1],
        PAGADA: distribucion[2],
        ANULADA: distribucion[3],
      },
      topEmpresas: topEmpresas.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        facturas: parseInt(e.facturas, 10),
        ingresos: parseFloat(e.ingresos),
        clientes: clienteMap[e.id] ?? 0,
        productos: productoMap[e.id] ?? 0,
      })),
      facturasPorMes: facturasPorMes.map((r) => ({
        mes: r.mes,
        total: parseFloat(r.total),
        cantidad: parseInt(r.cantidad, 10),
      })),
    };
  }

  // ── Empresas ────────────────────────────────────────────────────────────

  findAllEmpresas(): Promise<Empresa[]> {
    return this.empresasRepo.find({ order: { nombre: 'ASC' } });
  }

  async createEmpresa(dto: CreateEmpresaDto): Promise<Empresa> {
    const empresa = this.empresasRepo.create(dto);
    return this.empresasRepo.save(empresa);
  }

  async updateEmpresa(id: string, dto: UpdateEmpresaDto): Promise<Empresa> {
    const empresa = await this.empresasRepo.findOne({ where: { id } });
    if (!empresa) throw new NotFoundException(`Empresa ${id} no encontrada`);
    await this.empresasRepo.update(id, dto);
    return this.empresasRepo.findOne({ where: { id } }) as Promise<Empresa>;
  }

  async removeEmpresa(id: string): Promise<void> {
    const empresa = await this.empresasRepo.findOne({ where: { id } });
    if (!empresa) throw new NotFoundException(`Empresa ${id} no encontrada`);
    await this.empresasRepo.delete(id);
  }

  // ── Usuarios ────────────────────────────────────────────────────────────

  async findAllUsuarios(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepo.find({ order: { nombre: 'ASC' } });
    return users.map((u) => {
      const { password: _, ...rest } = u;
      return rest;
    });
  }

  async createUsuario(dto: CreateTenantUserDto): Promise<Omit<User, 'password'>> {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      nombre: dto.nombre,
      email: dto.email,
      password: hashed,
      rol: dto.rol ?? UserRole.ADMIN,
      empresaId: dto.empresaId ?? undefined,
    });
    const saved = await this.usersRepo.save(user);
    const { password: _, ...result } = saved;
    return result;
  }

  async updateUsuario(id: string, dto: UpdateTenantUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    const updates: Partial<User> = {};
    if (dto.nombre !== undefined) updates.nombre = dto.nombre;
    if (dto.rol !== undefined) updates.rol = dto.rol;
    if (dto.empresaId !== undefined) updates.empresaId = dto.empresaId ?? undefined;
    if (dto.email !== undefined && dto.email !== user.email) {
      const conflict = await this.usersRepo.findOne({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('El email ya está en uso');
      updates.email = dto.email;
    }
    await this.usersRepo.update(id, updates);
    const updated = await this.usersRepo.findOne({ where: { id } });
    const { password: _, ...result } = updated!;
    return result;
  }

  async removeUsuario(id: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    await this.usersRepo.delete(id);
  }
}
