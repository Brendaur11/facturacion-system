import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Empresa } from '../modules/empresa/entities/empresa.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Empresa) private readonly empresaRepo: Repository<Empresa>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedEmpresa();
    await this.seedAdmin();
    await this.seedSuperadmin();
  }

  private async seedEmpresa(): Promise<Empresa> {
    let empresa = await this.empresaRepo.findOne({ where: {} });
    if (!empresa) {
      empresa = this.empresaRepo.create({
        nombre: 'Mi Empresa S.A.',
        cuit: '30-12345678-9',
        direccion: 'Av. Corrientes 1234, CABA',
        telefono: '011-4567-8900',
        email: 'contacto@miempresa.com',
      });
      empresa = await this.empresaRepo.save(empresa);
      this.logger.log('Empresa de ejemplo creada.');
    }
    return empresa;
  }

  private async seedAdmin() {
    const empresa = await this.empresaRepo.findOne({ where: {} });
    if (!empresa) return;

    const existing = await this.usersRepo.findOne({ where: { email: 'admin@facturacion.com' } });
    if (!existing) {
      const hashed = await bcrypt.hash('admin123', 10);
      await this.usersRepo.save(this.usersRepo.create({
        nombre: 'Administrador',
        email: 'admin@facturacion.com',
        password: hashed,
        rol: UserRole.ADMIN,
        empresaId: empresa.id,
      }));
      this.logger.log('Usuario admin creado.');
    } else if (!existing.empresaId) {
      await this.usersRepo.update(existing.id, { empresaId: empresa.id });
    }
  }

  private async seedSuperadmin() {
    const existing = await this.usersRepo.findOne({ where: { email: 'superadmin@facturacion.com' } });
    if (!existing) {
      const hashed = await bcrypt.hash('superadmin123', 10);
      await this.usersRepo.save(this.usersRepo.create({
        nombre: 'Super Administrador',
        email: 'superadmin@facturacion.com',
        password: hashed,
        rol: UserRole.SUPERADMIN,
      }));
      this.logger.log('Usuario superadmin creado.');
    }
  }
}
