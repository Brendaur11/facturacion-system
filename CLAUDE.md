# Sistema de Facturación — Guía para Claude Code

## Stack

- **Backend:** NestJS 11, TypeORM, PostgreSQL 15, JWT, Swagger — puerto `3002`
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui v4 (base-ui), Axios — puerto `3004`
- **Base de datos:** PostgreSQL en Docker — puerto `5433`

---

## Levantar el proyecto

### 1. Variables de entorno

Crear `backend/.env` si no existe:

```env
PORT=3002
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_NAME=facturacion_db
JWT_SECRET=tu_secret_key_muy_larga_y_segura
JWT_EXPIRATION=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3004
BACKEND_URL=http://localhost:3002
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=tu_usuario_mailtrap
MAIL_PASS=tu_password_mailtrap
MAIL_FROM=noreply@facturacion.com
```

Crear `frontend/.env.local` si no existe:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

### 2. Base de datos (Docker)

```bash
docker-compose up -d
```

PostgreSQL se crea automáticamente. Las tablas las crea TypeORM al arrancar el backend (`synchronize: true`).

### 3. Backend

```bash
cd backend
npm install
npm run start:dev
```

Verificar en: `http://localhost:3002/api/v1/health`
Swagger en: `http://localhost:3002/docs`

### 4. Seed (primera vez solamente)

```bash
cd backend
npx ts-node --project tsconfig.seed.json src/database/seeds/seed.ts
```

Crea el usuario admin y la empresa de ejemplo.

**Credenciales del admin:**
- Email: `admin@facturacion.com`
- Password: `admin123`

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acceder en: `http://localhost:3004`

---

## Arquitectura

```
facturacion-system/
├── backend/          # NestJS API REST
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── empresa/
│   │   │   ├── clientes/
│   │   │   ├── productos/
│   │   │   ├── facturas/
│   │   │   ├── dashboard/
│   │   │   └── export/        # PDF, XLSX, DOCX, CSV
│   │   └── database/seeds/
│   └── .env                   # no commiteado
├── frontend/         # Next.js App Router
│   ├── src/
│   │   ├── app/               # páginas
│   │   ├── components/        # UI y layout
│   │   ├── services/          # llamadas al backend
│   │   ├── types/             # tipos TypeScript
│   │   └── lib/               # utils y axios instance
│   └── .env.local             # no commiteado
└── docker-compose.yml
```

---

## Módulos del backend

| Endpoint base | Descripción |
|---|---|
| `POST /auth/login` | Autenticación JWT |
| `GET /auth/profile` | Perfil del usuario |
| `GET/PATCH /empresa` | Datos de la empresa emisora |
| `GET/POST/PATCH/DELETE /clientes` | CRUD clientes |
| `GET/POST/PATCH/DELETE /productos` | CRUD productos |
| `GET/POST /facturas` | Listado y creación de facturas |
| `PATCH /facturas/:id/estado` | Cambio de estado (ANULADA es terminal) |
| `GET /dashboard/resumen` | Métricas: emitidas, pagadas, borradores, anuladas, totales |
| `GET /dashboard/ultimas` | Últimas 5 facturas |
| `POST /export/facturas/pdf` | Exportar PDF |
| `POST /export/facturas/xlsx` | Exportar Excel |
| `POST /export/facturas/docx` | Exportar Word |
| `POST /export/facturas/csv` | Exportar CSV |
| `PATCH /auth/profile` | Actualizar nombre o contraseña propios (requiere `currentPassword` para cambiar pass) |
| `POST /auth/profile/avatar` | Subir foto de perfil (JPG/PNG/WebP, máx 2 MB) — sirve desde `/uploads/avatars/` |
| `POST /auth/forgot-password` | Solicitar reset de contraseña — envía email con token UUID (expira 1h) |
| `POST /auth/reset-password` | Restablecer contraseña con token del email |

---

## Páginas del frontend

| Ruta | Descripción |
|---|---|
| `/login` | Autenticación |
| `/dashboard` | Métricas y últimas facturas |
| `/clientes` | CRUD con búsqueda |
| `/productos` | CRUD con búsqueda |
| `/facturas` | Listado, filtros por estado, selección múltiple, exportación |
| `/facturas/nueva` | Formulario de creación con ítems |
| `/facturas/[id]` | Detalle, cambio de estado inline, exportación individual |
| `/configuracion` | Datos de la empresa emisora |
| `/perfil` | Mi Perfil — cambiar nombre, contraseña, foto de avatar |
| `/recuperar-contrasena` | Solicitar reset de contraseña por email |
| `/recuperar-contrasena/[token]` | Formulario de nueva contraseña con token del email |

---

## Reglas de negocio importantes

- `ANULADA` es un estado terminal — el backend rechaza cualquier cambio de estado posterior con 400.
- Al crear una factura se requiere solo `clienteId`. El `empresaId` lo extrae el backend del JWT — **no enviarlo en el body** (el DTO no lo tiene, `forbidNonWhitelisted` devuelve 400 si se envía).
- El campo `notas` no se muestra en el detalle cuando el estado es `PAGADA` o `ANULADA` y el texto contiene "pendiente".
- Los exports de PDF, DOCX y XLSX comparten el mismo diseño visual (header oscuro, tabla con filas alternadas, totales con fondo azul).

---

## Seguridad implementada

### Rate limiting — `@nestjs/throttler`
- **Global:** 100 requests / 60 s por IP (todos los endpoints)
- **Login:** 5 intentos / 15 min — `@Throttle({ global: { limit: 5, ttl: 900_000 } })`
- **Forgot-password:** 3 intentos / 5 min — `@Throttle({ global: { limit: 3, ttl: 300_000 } })`
- **Reset-password:** 10 intentos / 15 min — `@Throttle({ global: { limit: 10, ttl: 900_000 } })`
- Configurado como `APP_GUARD` global en `AppModule` — no requiere decoradores extra por controlador
- Responde `429 Too Many Requests` al superarlo

### Autenticación y sesión
- JWT en **sessionStorage** (no localStorage) — se borra al cerrar el browser/pestaña
- Cookie `token` sin `max-age` (session cookie) — el middleware de Next.js la usa para proteger rutas SSR
- El interceptor Axios lee de `sessionStorage`; al recibir 401 borra sesión y cookie
- Middleware valida expiración del JWT antes de permitir acceso; rutas `/admin/*` requieren rol `SUPERADMIN`

### Guards del backend
- `JwtAuthGuard` — requerido en todos los endpoints protegidos
- `SuperAdminGuard` — requerido en `/admin/*`, `POST /auth/register`, y `/users/*`
- Patrón: `@UseGuards(JwtAuthGuard, SuperAdminGuard)`

### CORS
- Restringido al origen definido en la variable de entorno `FRONTEND_URL` (default: `http://localhost:3004`)
- Agregar al `.env`: `FRONTEND_URL=http://localhost:3004`

### Validación de DTOs
- `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`
- Arrays con `@ArrayMinSize` / `@ArrayMaxSize` (facturas: 1–100 ítems; export: 1–200 IDs)
- Strings con `@MaxLength` en todos los campos de texto libre
- Números con `@Min` / `@Max` donde corresponde (impuesto: 0–100)
- Upload de clientes: límite de 5 MB en `multer`
- Avatar: valida MIME type **y** extensión del archivo (`fileFilter` en multer) — máx 2 MB
- Templates de email: `escapeHtml()` en `MailerService` para prevenir XSS via campos de usuario

---

## Consideraciones técnicas

### shadcn/ui v4 (base-ui)
- `DropdownMenuTrigger` ya es un `<button>` — nunca envolver con `<Button>`. Usar `buttonVariants()` directo en el trigger.
- `asChild` no existe en base-ui — usar `<Link className={buttonVariants(...)}>` en su lugar.
- `Select.onValueChange` recibe `string | null` — siempre guardar con `(v) => v && setter(v)`.
- `SelectValue` muestra el `value` (UUID) no el label — renderizar el label manualmente en el trigger para selects con IDs como valores.

### Tailwind CSS v4
- No usar `@tailwind base/components/utilities` en CSS — usar `@import "tailwindcss"`.
- No hay `tailwind.config.ts` — la configuración va en el CSS.

### Mi Perfil y recuperación de contraseña
- Avatar guardado en `backend/uploads/avatars/{userId}.{ext}` — servido como estático desde `/uploads` via `app.useStaticAssets()`
- `avatarUrl` completa (con `BACKEND_URL`) almacenada en columna `text` de la tabla `users`
- Sidebar actualiza el avatar en tiempo real escuchando el evento `sessionUpdated` (dispatched desde `authService.saveUser()`)
- Reset token: UUID v4 (`randomUUID()`), expiración 1h almacenada en `resetTokenExpires` (tipo `timestamptz`)
- `safeUser()` en `AuthService` excluye siempre `password`, `resetToken` y `resetTokenExpires` de todas las respuestas
- `User.resetToken` y `User.avatarUrl` deben declararse como `@Column({ type: 'text', nullable: true })` — TypeORM no infiere el tipo desde `string | null`
- Email enviado por Mailtrap (dev) vía nodemailer — configurar credenciales en `.env`

### archiver v8 — API completamente diferente a v5/v6
- `require('archiver')` en v8 devuelve un **objeto** `{ ZipArchive, TarArchive, ... }`, NO una función callable.
- La API cambió a clase + pipe:
  ```typescript
  // ❌ v5/v6 — rompe en v8
  const arc = archiver('zip', { zlib: { level: 6 } });
  arc.on('data', chunk => ...); arc.finalize();

  // ✅ v8
  const { ZipArchive } = require('archiver');
  const arc = new ZipArchive({ zlib: { level: 6 } });
  const pass = new PassThrough();
  arc.pipe(pass);
  pass.on('data', chunk => chunks.push(chunk));
  pass.on('end', () => resolve(Buffer.concat(chunks)));
  arc.append(buf, { name: 'file.pdf' });
  await arc.finalize(); // Promise en v8
  ```
- Ver implementación completa en `src/modules/export/export.service.ts → buildZip()`.

### Descargas binarias con axios (frontend)
- Siempre usar `{ responseType: 'blob' }` — sin esto axios corrompe los bytes binarios.
- Leer `Content-Type` y `Content-Disposition` de los **headers de la respuesta** para obtener el tipo real y el nombre de archivo (no asumir el formato solicitado — puede ser ZIP).
- El `<a>` debe estar en el DOM antes del click:
  ```typescript
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  ```
- Ver implementación en `src/services/export.service.ts`.

### TypeORM 1.x — relaciones en find()
- `relations` debe ser un objeto, **no** un array de strings:
  ```typescript
  // ❌ TypeORM 0.x (rompe en 1.x con TS2559)
  relations: ['cliente', 'empresa', 'items']
  // ✅ TypeORM 1.x
  relations: { cliente: true, empresa: true, items: true }
  ```

### pdfmake 0.3.x en Node.js
- `import * as pdfmake` pasa por `__importStar` — acceder al módulo real con `(pdfmake as any).default`.
- `getBuffer()` es Promise-based en 0.3.x, no usa callback.
- `vfs_fonts` en 0.3.x exporta el objeto VFS directamente (sin `.pdfMake.vfs`).
