# 🧾 Sistema de Facturación — Arquitectura General del Proyecto

## Visión General

Sistema de facturación para gestión interna compuesto por dos aplicaciones independientes que se comunican entre sí:

- **Backend**: API REST construida con NestJS + TypeORM + PostgreSQL
- **Frontend**: Sistema de ventas construido con Next.js + TypeScript

---

## Stack Tecnológico

| Capa | Tecnología | Versión recomendada |
|---|---|---|
| Backend Framework | NestJS | v10+ |
| Lenguaje | TypeScript | v5+ |
| ORM | TypeORM | v0.3+ |
| Base de datos | PostgreSQL | v15+ |
| Autenticación | JWT + Passport.js | — |
| Documentación API | Swagger (OpenAPI) | — |
| Frontend Framework | Next.js | v14+ (App Router) |
| UI Components | shadcn/ui + Tailwind CSS | — |
| HTTP Client | Axios | — |
| Validación (backend) | class-validator + class-transformer | — |
| Variables de entorno | dotenv / @nestjs/config | — |
| Exportación PDF | @nestjs/pdf / pdfmake (backend) | — |
| Exportación XLSX | exceljs (backend) | — |
| Exportación DOCX | docx (backend) | — |
| Exportación CSV | fast-csv (backend) | — |

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Navegador)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────┐
│              FRONTEND — Next.js (App Router)                │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │   /clientes │  │  /facturas  │  │   /productos       │  │
│  └─────────────┘  └─────────────┘  └────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Axios / API Service Layer               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP REST + JWT
┌─────────────────────▼───────────────────────────────────────┐
│                BACKEND — NestJS API REST                    │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  │
│  │  Auth    │  │ Clientes │  │ Facturas  │  │Productos │  │
│  │ Module   │  │ Module   │  │  Module   │  │ Module   │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   TypeORM                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    PostgreSQL                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Repositorios

Se recomienda un **monorepo** para mantener frontend y backend juntos pero separados:

```
facturacion-system/
│
├── backend/                  # NestJS API
├── frontend/                 # Next.js App
├── .gitignore
├── README.md
└── docker-compose.yml        # PostgreSQL + servicios
```

---

## Módulos del Sistema

### Backend (NestJS)

| Módulo | Responsabilidad |
|---|---|
| `AuthModule` | Login, JWT, Guards |
| `UsersModule` | Gestión del usuario/admin |
| `EmpresaModule` | Datos del emisor (tu empresa) |
| `ClientesModule` | CRUD de clientes |
| `ProductosModule` | CRUD de productos/servicios |
| `FacturasModule` | Creación y gestión de facturas |
| `FacturaItemsModule` | Ítems de cada factura |
| `ExportModule` | Exportación de facturas a PDF, XLSX, DOCX y CSV |

### Frontend (Next.js)

| Ruta | Descripción |
|---|---|
| `/login` | Autenticación |
| `/dashboard` | Resumen general |
| `/clientes` | Listado y gestión de clientes |
| `/clientes/[id]` | Detalle de cliente |
| `/facturas` | Listado de facturas con selección múltiple y exportación |
| `/facturas/nueva` | Crear nueva factura |
| `/facturas/[id]` | Detalle / vista previa |
| `/facturas/exportar` | Selección y descarga masiva de facturas |
| `/productos` | Gestión de productos/servicios |
| `/configuracion` | Datos de la empresa emisora |

---

## Entidades de la Base de Datos

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│   Usuario   │       │   Empresa    │       │    Cliente      │
│─────────────│       │──────────────│       │─────────────────│
│ id          │       │ id           │       │ id              │
│ nombre      │       │ nombre       │       │ nombre          │
│ email       │       │ cuit         │       │ email           │
│ password    │       │ direccion    │       │ telefono        │
│ rol         │       │ telefono     │       │ direccion       │
│ createdAt   │       │ email        │       │ cuit/dni        │
└─────────────┘       │ logo         │       │ createdAt       │
                      └──────────────┘       └────────┬────────┘
                                                      │
                                             ┌────────▼────────┐
┌─────────────────┐                          │    Factura      │
│    Producto     │                          │─────────────────│
│─────────────────│                          │ id              │
│ id              │                          │ numero          │
│ nombre          │◄─────────────────────────│ clienteId       │
│ descripcion     │   FacturaItem            │ empresaId       │
│ precio          │                          │ fecha           │
│ unidad          │                          │ estado          │
│ activo          │                          │ subtotal        │
└─────────────────┘                          │ impuesto        │
                                             │ total           │
                                             │ notas           │
                      ┌──────────────┐       └────────┬────────┘
                      │ FacturaItem  │                │
                      │──────────────│◄───────────────┘
                      │ id           │
                      │ facturaId    │
                      │ productoId   │
                      │ descripcion  │
                      │ cantidad     │
                      │ precioUnit   │
                      │ subtotal     │
                      └──────────────┘
```

---

## Flujo de Autenticación

```
Frontend (Next.js)
      │
      │ POST /auth/login { email, password }
      ▼
Backend (NestJS)
      │
      │ Valida credenciales → genera JWT
      ▼
Frontend recibe { access_token }
      │
      │ Guarda token (httpOnly cookie o localStorage)
      │
      │ Todas las requests siguientes:
      │ Authorization: Bearer <token>
      ▼
Backend → Guard valida JWT → permite acceso
```

---

## Variables de Entorno

### Backend `.env`
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_NAME=facturacion_db

# JWT
JWT_SECRET=tu_secret_key
JWT_EXPIRATION=7d

# App
PORT=3001
NODE_ENV=development
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Docker Compose (PostgreSQL local)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: facturacion_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: tu_password
      POSTGRES_DB: facturacion_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Convenciones del Proyecto

- **Idioma del código**: inglés (variables, funciones, clases)
- **Idioma de la UI**: español
- **Formato de fechas**: ISO 8601 (`YYYY-MM-DD`)
- **Moneda**: ARS (pesos argentinos), almacenada como `decimal(10,2)`
- **Estados de factura**: `BORRADOR` | `EMITIDA` | `PAGADA` | `ANULADA`
- **Roles de usuario**: `ADMIN` | `USER`

---

## Roadmap Sugerido

```
Fase 1 — Base
  ✅ Setup del proyecto (NestJS + Next.js + PostgreSQL)
  ✅ Autenticación JWT
  ✅ CRUD de Empresa

Fase 2 — Datos maestros
  ✅ CRUD de Clientes
  ✅ CRUD de Productos/Servicios

Fase 3 — Facturación
  ✅ Crear factura con ítems
  ✅ Listar y filtrar facturas
  ✅ Cambio de estado de factura
  ✅ Vista previa / impresión
  ✅ Exportación individual y masiva (PDF, XLSX, DOCX, CSV)
  ✅ Selección múltiple de facturas para descarga

Fase 4 — Mejoras
  ⬜ Dashboard con métricas avanzadas
  ⬜ Filtros avanzados y reportes
  ⬜ Integración AFIP (futuro)
```
