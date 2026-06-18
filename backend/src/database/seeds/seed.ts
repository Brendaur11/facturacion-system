import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Empresa } from '../../modules/empresa/entities/empresa.entity';
import { User, UserRole } from '../../modules/users/entities/user.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5433', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'facturacion_db',
  entities: [User, Empresa],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Conectado a la base de datos.');

  const usersRepo = AppDataSource.getRepository(User);
  const empresaRepo = AppDataSource.getRepository(Empresa);

  // 1. Empresa de ejemplo
  let empresa = await empresaRepo.findOne({ where: {} });
  if (!empresa) {
    empresa = empresaRepo.create({
      nombre: 'Mi Empresa S.A.',
      cuit: '30-12345678-9',
      direccion: 'Av. Corrientes 1234, CABA',
      telefono: '011-4567-8900',
      email: 'contacto@miempresa.com',
    });
    empresa = await empresaRepo.save(empresa);
    console.log('✔  Empresa de ejemplo creada.');
  } else {
    console.log('ℹ  Empresa ya existía, se omite.');
  }

  // 2. Usuario admin — vinculado a la empresa
  const adminEmail = 'admin@facturacion.com';
  let admin = await usersRepo.findOne({ where: { email: adminEmail } });

  if (!admin) {
    const hashed = await bcrypt.hash('admin123', 10);
    admin = usersRepo.create({
      nombre: 'Administrador',
      email: adminEmail,
      password: hashed,
      rol: UserRole.ADMIN,
      empresaId: empresa.id,
    });
    await usersRepo.save(admin);
    console.log('✔  Usuario admin creado:');
    console.log('   Email:    admin@facturacion.com');
    console.log('   Password: admin123');
    console.log(`   EmpresaId: ${empresa.id}`);
  } else {
    // Vincular admin existente a la empresa si aún no tiene empresaId
    if (!admin.empresaId) {
      await usersRepo.update(admin.id, { empresaId: empresa.id });
      console.log(`✔  Admin vinculado a empresa: ${empresa.id}`);
    } else {
      console.log('ℹ  Usuario admin ya existía y tiene empresa asignada, se omite.');
    }
  }

  // 3. Usuario superadmin (sin empresa — gestiona todos los tenants)
  const superadminEmail = 'superadmin@facturacion.com';
  const existingSuperadmin = await usersRepo.findOne({ where: { email: superadminEmail } });
  if (!existingSuperadmin) {
    const hashed = await bcrypt.hash('superadmin123', 10);
    const superadmin = usersRepo.create({
      nombre: 'Super Administrador',
      email: superadminEmail,
      password: hashed,
      rol: UserRole.SUPERADMIN,
    });
    await usersRepo.save(superadmin);
    console.log('✔  Usuario superadmin creado:');
    console.log('   Email:    superadmin@facturacion.com');
    console.log('   Password: superadmin123');
  } else {
    console.log('ℹ  Usuario superadmin ya existía, se omite.');
  }

  await AppDataSource.destroy();
  console.log('Seed finalizado correctamente.');
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
