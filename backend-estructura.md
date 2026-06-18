# 🔧 Backend — Estructura Detallada (NestJS + TypeORM)

## Stack del Backend

| Tecnología | Uso |
|---|---|
| NestJS v10+ | Framework principal |
| TypeScript v5+ | Lenguaje |
| TypeORM v0.3+ | ORM para base de datos |
| PostgreSQL v15+ | Base de datos |
| Passport.js + JWT | Autenticación |
| class-validator | Validación de DTOs |
| class-transformer | Transformación de datos |
| Swagger (OpenAPI) | Documentación automática |
| @nestjs/config | Manejo de variables de entorno |
| pdfmake | Generación de PDFs en el backend |
| exceljs | Generación de archivos XLSX |
| docx | Generación de archivos DOCX |
| fast-csv | Generación de archivos CSV |

---

## Estructura de Carpetas

```
backend/
│
├── src/
│   │
│   ├── main.ts                         # Bootstrap de la app, Swagger config
│   ├── app.module.ts                   # Módulo raíz
│   ├── app.controller.ts               # Health check
│   │
│   ├── config/
│   │   ├── database.config.ts          # Configuración TypeORM
│   │   └── jwt.config.ts               # Configuración JWT
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       └── login.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── empresa/
│   │   │   ├── empresa.module.ts
│   │   │   ├── empresa.controller.ts
│   │   │   ├── empresa.service.ts
│   │   │   ├── entities/
│   │   │   │   └── empresa.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-empresa.dto.ts
│   │   │       └── update-empresa.dto.ts
│   │   │
│   │   ├── clientes/
│   │   │   ├── clientes.module.ts
│   │   │   ├── clientes.controller.ts
│   │   │   ├── clientes.service.ts
│   │   │   ├── entities/
│   │   │   │   └── cliente.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-cliente.dto.ts
│   │   │       └── update-cliente.dto.ts
│   │   │
│   │   ├── productos/
│   │   │   ├── productos.module.ts
│   │   │   ├── productos.controller.ts
│   │   │   ├── productos.service.ts
│   │   │   ├── entities/
│   │   │   │   └── producto.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-producto.dto.ts
│   │   │       └── update-producto.dto.ts
│   │   │
│   │   ├── facturas/
│   │   │   ├── facturas.module.ts
│   │   │   ├── facturas.controller.ts
│   │   │   ├── facturas.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── factura.entity.ts
│   │   │   │   └── factura-item.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-factura.dto.ts
│   │   │       ├── create-factura-item.dto.ts
│   │   │       └── update-factura.dto.ts
│   │   │
│   │   └── dashboard/
│   │       ├── dashboard.module.ts
│   │       ├── dashboard.controller.ts
│   │       └── dashboard.service.ts
│   │
│   │   └── export/
│   │       ├── export.module.ts
│   │       ├── export.controller.ts
│   │       ├── export.service.ts
│   │       ├── builders/
│   │       │   ├── pdf.builder.ts       # pdfmake — genera buffer PDF
│   │       │   ├── xlsx.builder.ts      # exceljs — genera buffer XLSX
│   │       │   ├── docx.builder.ts      # docx   — genera buffer DOCX
│   │       │   └── csv.builder.ts       # fast-csv — genera string CSV
│   │       └── dto/
│   │           └── export-facturas.dto.ts
│   │
│   └── database/
│       └── migrations/                 # Migraciones TypeORM
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── .env
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## Entidades TypeORM

### `user.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;  // bcrypt hash

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  rol: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### `empresa.entity.ts`
```typescript
@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  cuit: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  logo: string;           // URL o path del logo

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### `cliente.entity.ts`
```typescript
@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  cuitDni: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Factura, (factura) => factura.cliente)
  facturas: Factura[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### `producto.entity.ts`
```typescript
@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ nullable: true })
  unidad: string;         // ej: "hora", "unidad", "mes"

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### `factura.entity.ts`
```typescript
export enum FacturaEstado {
  BORRADOR = 'BORRADOR',
  EMITIDA  = 'EMITIDA',
  PAGADA   = 'PAGADA',
  ANULADA  = 'ANULADA',
}

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  numero: string;             // ej: "FAC-0001"

  @ManyToOne(() => Cliente, (cliente) => cliente.facturas)
  cliente: Cliente;

  @ManyToOne(() => Empresa)
  empresa: Empresa;

  @OneToMany(() => FacturaItem, (item) => item.factura, { cascade: true })
  items: FacturaItem[];

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'date', nullable: true })
  fechaVencimiento: Date;

  @Column({ type: 'enum', enum: FacturaEstado, default: FacturaEstado.BORRADOR })
  estado: FacturaEstado;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  impuesto: number;           // porcentaje, ej: 21

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### `factura-item.entity.ts`
```typescript
@Entity('factura_items')
export class FacturaItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Factura, (factura) => factura.items)
  factura: Factura;

  @ManyToOne(() => Producto, { nullable: true })
  producto: Producto;

  @Column()
  descripcion: string;        // puede diferir del producto original

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;           // cantidad * precioUnitario
}
```

---

## Endpoints de la API

### Auth
```
POST   /auth/login           → Login, retorna JWT
POST   /auth/register        → Registrar usuario (solo ADMIN)
GET    /auth/profile         → Datos del usuario autenticado
```

### Empresa
```
GET    /empresa              → Obtener datos de la empresa
POST   /empresa              → Crear empresa
PATCH  /empresa/:id          → Actualizar empresa
```

### Clientes
```
GET    /clientes             → Listar clientes (con paginación y filtros)
GET    /clientes/:id         → Obtener cliente por ID
POST   /clientes             → Crear cliente
PATCH  /clientes/:id         → Actualizar cliente
DELETE /clientes/:id         → Desactivar cliente (soft delete)
```

### Productos
```
GET    /productos            → Listar productos activos
GET    /productos/:id        → Obtener producto por ID
POST   /productos            → Crear producto
PATCH  /productos/:id        → Actualizar producto
DELETE /productos/:id        → Desactivar producto (soft delete)
```

### Facturas
```
GET    /facturas             → Listar facturas (filtros: estado, cliente, fecha)
GET    /facturas/:id         → Obtener factura con ítems
POST   /facturas             → Crear factura con ítems
PATCH  /facturas/:id         → Actualizar factura (solo BORRADOR)
PATCH  /facturas/:id/estado  → Cambiar estado de factura
DELETE /facturas/:id         → Eliminar factura (solo BORRADOR)
```

### Dashboard
```
GET    /dashboard/resumen    → Totales: facturas emitidas, cobradas, pendientes
GET    /dashboard/ultimas    → Últimas 5 facturas emitidas
```

### Export
```
POST   /export/facturas/pdf     → Exportar 1 o N facturas como PDF (una por página)
POST   /export/facturas/xlsx    → Exportar 1 o N facturas como planilla Excel
POST   /export/facturas/docx    → Exportar 1 o N facturas como documento Word
POST   /export/facturas/csv     → Exportar 1 o N facturas como CSV plano
```

Body esperado por todos los endpoints de export:
```json
{
  "ids": ["uuid-1", "uuid-2"]   // array de IDs; un solo elemento = exportación individual
}
```

Todos retornan un `StreamableFile` con los headers correctos:
- PDF  → `Content-Type: application/pdf`
- XLSX → `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- DOCX → `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- CSV  → `Content-Type: text/csv`

---

## DTOs de ejemplo

### `create-factura.dto.ts`
```typescript
import { IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateFacturaItemDto } from './create-factura-item.dto';

export class CreateFacturaDto {
  @IsUUID()
  clienteId: string;

  @IsUUID()
  empresaId: string;

  @IsDateString()
  fecha: string;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFacturaItemDto)
  items: CreateFacturaItemDto[];

  @IsString()
  @IsOptional()
  notas?: string;
}
```

### `create-factura-item.dto.ts`
```typescript
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateFacturaItemDto {
  @IsUUID()
  @IsOptional()
  productoId?: string;

  @IsString()
  descripcion: string;

  @IsNumber()
  @Min(0.01)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;
}
```

---

## Configuración de TypeORM (`database.config.ts`)

```typescript
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development', // ⚠️ false en producción
  logging: process.env.NODE_ENV === 'development',
}));
```

---

## Configuración de Swagger (`main.ts`)

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('API de Facturación')
    .setDescription('Sistema de facturación para gestión interna')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
```

> 📄 Una vez corriendo, la documentación estará en: `http://localhost:3001/docs`

### `export-facturas.dto.ts`
```typescript
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class ExportFacturasDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  ids: string[];
}
```

---

## Patrones utilizados

| Patrón | Descripción |
|---|---|
| **Repository Pattern** | TypeORM Repository inyectado en cada Service |
| **DTO Pattern** | Objetos para validar entrada de datos |
| **Guard Pattern** | JwtAuthGuard protege todos los endpoints privados |
| **Interceptor** | ResponseInterceptor para normalizar respuestas |
| **Soft Delete** | Clientes y productos se desactivan, no se borran |
| **Cascade** | Al crear una Factura se crean los FacturaItems automáticamente |
| **Builder Pattern** | Cada formato de exportación tiene su propio builder desacoplado |
| **StreamableFile** | NestJS retorna los archivos como stream, sin guardarlos en disco |
| **Bulk / Single export** | El mismo endpoint acepta 1 o N ids; el builder arma el archivo apropiado |

---

## Comandos útiles

```bash
# Instalar dependencias
npm install

# Instalar librerías de exportación
npm install pdfmake exceljs docx fast-csv
npm install -D @types/pdfmake

# Correr en desarrollo
npm run start:dev

# Generar una migración
npm run migration:generate -- src/database/migrations/NombreMigracion

# Ejecutar migraciones
npm run migration:run

# Revertir última migración
npm run migration:revert

# Build para producción
npm run build
npm run start:prod
```
