# Guía de Deploy — Vercel + Railway + Neon

## Plataformas

| Plataforma | Qué hostea | Costo inicial |
|---|---|---|
| Vercel | Next.js (frontend) | Gratis |
| Railway | NestJS (backend) | $5/mes (incluye $5 crédito = efectivamente $0) |
| Neon | PostgreSQL | Gratis hasta 0.5 GB |

> Upgradeá Railway a Pro ($20/mes) cuando tengas clientes reales en producción para evitar pausas en deploys.

---

## Arquitectura resultante

```
Browser del cliente
    ↓  llama a https://tu-app.vercel.app/api/...
Vercel — Next.js (frontend + BFF)
    ↓  llamada server-side, URL nunca expuesta al browser
Railway — NestJS (backend privado)
    ↓
Neon — PostgreSQL (base de datos)
```

El NestJS **no queda expuesto directamente al browser**. El frontend actúa como intermediario (BFF — Backend for Frontend): el browser llama a las rutas `/api/` de Next.js, y Next.js reenvía la request a Railway desde el servidor.

---

## Paso 1 — Base de datos (Neon)

> Se usa Neon en lugar de Railway Postgres porque no consume los créditos de Railway, tiene free tier sin pausas automáticas y provee una sola `DATABASE_URL` lista para usar.

1. Crear cuenta en [neon.tech](https://neon.tech)
2. Crear un nuevo proyecto → anotar la `DATABASE_URL` (formato `postgresql://usuario:password@host/dbname`)
3. Guardar la URL — se carga en Railway en el paso 3

---

## Paso 2 — Implementar el BFF en Next.js

> Este paso modifica el frontend para que las llamadas al backend pasen por el servidor de Next.js en lugar de salir directamente del browser.

### 2.1 — Crear el proxy genérico

Crear el archivo `frontend/src/app/api/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.API_URL // sin NEXT_PUBLIC_

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'GET')
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'POST')
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'PATCH')
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'DELETE')
}

async function proxyRequest(req: NextRequest, path: string[], method: string) {
  const url = `${BACKEND_URL}/${path.join('/')}${req.nextUrl.search}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  const authorization = req.headers.get('authorization')
  if (authorization) headers['Authorization'] = authorization

  const body = method !== 'GET' && method !== 'DELETE'
    ? await req.text()
    : undefined

  const response = await fetch(url, { method, headers, body })

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  const data = isJson ? await response.json() : await response.arrayBuffer()

  return new NextResponse(
    isJson ? JSON.stringify(data) : data,
    {
      status: response.status,
      headers: { 'Content-Type': contentType },
    }
  )
}
```

### 2.2 — Cambiar la variable de entorno en el frontend

En `frontend/.env.local`, cambiar:

```env
# Antes (expuesta al browser)
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1

# Después (solo para desarrollo local — el browser llama al propio Next.js)
NEXT_PUBLIC_API_URL=http://localhost:3004/api/v1
```

> En producción (Vercel), `NEXT_PUBLIC_API_URL` apuntará a la misma URL de Vercel: `https://tu-app.vercel.app/api/v1`  
> La variable `API_URL` (sin NEXT_PUBLIC_) contendrá la URL real de Railway, solo visible en el servidor.

### 2.3 — Agregar la variable interna al `.env.local`

```env
# URL real del backend — NUNCA con prefijo NEXT_PUBLIC_
API_URL=http://localhost:3002/api/v1
```

---

## Paso 3 — Deploy del backend en Railway

1. Crear cuenta en [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo**
2. Seleccionar el repositorio → elegir la carpeta `backend` como root
3. Railway detecta NestJS automáticamente

### Variables de entorno en Railway

Ir a **Variables** del servicio y cargar:

```env
PORT=3002
DATABASE_URL=      # la URL completa que provee Neon (reemplaza todas las DB_* individuales)
JWT_SECRET=        # string largo y aleatorio (mín. 32 caracteres)
JWT_EXPIRATION=7d
NODE_ENV=production
FRONTEND_URL=https://tu-app.vercel.app   # dominio real de Vercel
BACKEND_URL=https://tu-backend.railway.app
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=         # credenciales Mailtrap (o SendGrid en producción)
MAIL_PASS=
MAIL_FROM=noreply@tudominio.com
```

> Neon provee una sola `DATABASE_URL` que TypeORM acepta directamente — no hace falta cargar `DB_HOST`, `DB_PORT`, etc. por separado.

### Configurar el dominio de Railway

Una vez deployado, Railway asigna una URL pública como `https://facturacion-abc123.railway.app`. Anotarla — se usa en Vercel.

---

## Paso 4 — Deploy del frontend en Vercel

1. Crear cuenta en [vercel.com](https://vercel.com) → **New Project → Import Git Repository**
2. Seleccionar el repositorio → configurar **Root Directory** como `frontend`
3. Framework: Next.js (detectado automáticamente)

### Variables de entorno en Vercel

Ir a **Settings → Environment Variables** y cargar:

```env
# Visible en el browser — apunta al propio Vercel
NEXT_PUBLIC_API_URL=https://tu-app.vercel.app/api/v1

# Solo server-side — URL real de Railway (NUNCA expuesta al browser)
API_URL=https://facturacion-abc123.railway.app/api/v1
```

---

## Paso 5 — Configurar CORS en el backend

En `backend/src/main.ts`, asegurarse de que CORS esté restringido al dominio de Vercel:

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL, // https://tu-app.vercel.app
  credentials: true,
})
```

Esto asegura que Railway solo acepte requests provenientes del servidor de Vercel.

---

## Paso 6 — Ejecutar el seed en producción (primera vez)

Conectarse a la base de datos de producción y ejecutar el seed manualmente desde Railway:

1. En Railway → servicio backend → pestaña **Shell**
2. Ejecutar:

```bash
npx ts-node --project tsconfig.seed.json src/database/seeds/seed.ts
```

Esto crea el usuario admin con credenciales:
- Email: `admin@facturacion.com`
- Password: `admin123`

> **Cambiar la contraseña del admin inmediatamente** desde `/perfil` tras el primer login.

---

## Checklist final

- [ ] Base de datos creada en Neon y `DATABASE_URL` anotada
- [ ] BFF implementado en `frontend/src/app/api/[...path]/route.ts`
- [ ] Variables de entorno cargadas en Railway
- [ ] Backend deployado y con URL de Railway anotada
- [ ] Variables de entorno cargadas en Vercel (`NEXT_PUBLIC_API_URL` y `API_URL`)
- [ ] Frontend deployado en Vercel
- [ ] Seed ejecutado desde Railway Shell
- [ ] Contraseña del admin cambiada
- [ ] Verificar login en `https://tu-app.vercel.app/login`

