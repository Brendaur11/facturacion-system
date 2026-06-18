# Integración sistema-a-sistema con Service Account

## ¿Qué es un service account?

Un service account es un usuario técnico creado exclusivamente para que un sistema se autentique contra otro de forma programática. No es una persona: nunca inicia sesión desde la UI. Su credencial vive como variable de entorno en el sistema que consume la API.

```
Sistema de Gestión de Ventas
        │
        │  POST /auth/login  (una sola vez, o cuando el token vence)
        ▼
API de Facturación
        │
        │  Retorna JWT
        ▼
Sistema de Gestión de Ventas almacena el token en memoria
        │
        │  GET /clientes, POST /facturas, etc.  (con Bearer token)
        ▼
API de Facturación  →  PostgreSQL
```

---

## Paso 1 — Crear el service account en el sistema de facturación

Tenés dos opciones equivalentes. Usá la que te resulte más cómoda.

### Opción A: vía endpoint (requiere estar logueado como admin)

```bash
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{
    "nombre": "Sistema de Ventas",
    "email": "ventas-system@interno",
    "password": "REEMPLAZAR_POR_PASSWORD_SEGURA",
    "rol": "USER"
  }'
```

### Opción B: directamente en la base de datos

```sql
INSERT INTO users (id, nombre, email, password, rol, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Sistema de Ventas',
  'ventas-system@interno',
  -- Generá el hash con: node -e "require('bcrypt').hash('TU_PASSWORD',10).then(console.log)"
  '$2b$10$HASH_GENERADO_AQUI',
  'USER',
  NOW(),
  NOW()
);
```

> **Convención de nombre:** usá un email que deje claro que es un sistema, no una persona.  
> Ejemplos: `ventas-system@interno`, `svc-ventas@facturacion`, `bot-ventas@midominio.com`

---

## Paso 2 — Ajustar la expiración del JWT

El sistema de facturación usa la variable `JWT_EXPIRATION` en `backend/.env`. El valor por defecto es `7d`.

Para un service account conviene un valor más largo para reducir la frecuencia de re-login:

```env
# backend/.env
JWT_EXPIRATION=30d   # o 90d según tu preferencia
```

> El token sigue siendo un JWT estándar — si necesitás revocar acceso, simplemente eliminás el usuario del sistema de facturación o cambiás el `JWT_SECRET` (esto invalida **todos** los tokens activos).

---

## Paso 3 — Configurar el sistema de ventas

Las credenciales del service account **nunca van en el código**. Van en variables de entorno del sistema de ventas.

```env
# Sistema de Gestión de Ventas — .env

FACTURACION_API_URL=http://localhost:3002/api/v1
FACTURACION_SA_EMAIL=ventas-system@interno
FACTURACION_SA_PASSWORD=REEMPLAZAR_POR_PASSWORD_SEGURA
```

---

## Paso 4 — Implementar el cliente en el sistema de ventas

El patrón recomendado es un **cliente con token cacheado**: autentica una sola vez, reutiliza el token mientras sea válido, y renueva solo cuando vence.

### TypeScript / NestJS

```typescript
// facturacion.client.ts

import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacturacionClient implements OnModuleInit {
  private readonly logger = new Logger(FacturacionClient.name);
  private readonly http: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: this.config.get<string>('FACTURACION_API_URL'),
      timeout: 10_000,
    });
  }

  async onModuleInit() {
    await this.autenticar();
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  private async autenticar(): Promise<void> {
    const res = await this.http.post('/auth/login', {
      email: this.config.get<string>('FACTURACION_SA_EMAIL'),
      password: this.config.get<string>('FACTURACION_SA_PASSWORD'),
    });

    this.token = res.data.data.access_token;

    // Calculá cuándo vence el token a partir del payload JWT
    const payload = JSON.parse(
      Buffer.from(this.token!.split('.')[1], 'base64').toString(),
    );
    // Guardamos con 60 segundos de margen antes del vencimiento real
    this.tokenExpiresAt = payload.exp * 1000 - 60_000;
    this.logger.log('Service account autenticado correctamente.');
  }

  private async getToken(): Promise<string> {
    if (!this.token || Date.now() >= this.tokenExpiresAt) {
      this.logger.log('Token vencido o ausente — re-autenticando...');
      await this.autenticar();
    }
    return this.token!;
  }

  private async headers() {
    return { Authorization: `Bearer ${await this.getToken()}` };
  }

  // ── Métodos de la API de Facturación ───────────────────────────────────

  async getClientes(search?: string) {
    const res = await this.http.get('/clientes', {
      headers: await this.headers(),
      params: search ? { search } : {},
    });
    return res.data.data;
  }

  async crearFactura(payload: CrearFacturaDto) {
    const res = await this.http.post('/facturas', payload, {
      headers: await this.headers(),
    });
    return res.data.data;
  }

  async getResumenDashboard() {
    const res = await this.http.get('/dashboard/resumen', {
      headers: await this.headers(),
    });
    return res.data.data;
  }

  // Agregá aquí los demás endpoints que necesite el sistema de ventas
}
```

### Registrar el cliente como módulo NestJS

```typescript
// facturacion.module.ts

import { Module } from '@nestjs/common';
import { FacturacionClient } from './facturacion.client';

@Module({
  providers: [FacturacionClient],
  exports: [FacturacionClient],
})
export class FacturacionModule {}
```

### Usar desde cualquier servicio del sistema de ventas

```typescript
// ventas.service.ts

@Injectable()
export class VentasService {
  constructor(private readonly facturacion: FacturacionClient) {}

  async cerrarVenta(venta: Venta) {
    // Lógica de cierre en el sistema de ventas...
    await this.procesarPago(venta);

    // Generar la factura automáticamente en el sistema de facturación
    const factura = await this.facturacion.crearFactura({
      clienteId: venta.clienteId,
      empresaId: venta.empresaId,
      fecha: new Date().toISOString(),
      items: venta.items.map((i) => ({
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      })),
    });

    return { venta, factura };
  }
}
```

---

## Paso 5 — Verificar la integración

Probá la autenticación del service account con cURL antes de tocar código:

```bash
# 1. Obtener token
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ventas-system@interno",
    "password": "TU_PASSWORD"
  }'

# Respuesta esperada:
# { "data": { "access_token": "eyJ...", "user": { ... } }, "statusCode": 200 }

# 2. Usar el token en una llamada real
curl http://localhost:3002/api/v1/clientes \
  -H "Authorization: Bearer eyJ..."

# 3. Decodificar el token para ver cuándo vence (sin librería)
echo "eyJ..." | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
# Buscá el campo "exp" — es un Unix timestamp
```

---

## Referencia rápida de endpoints

Los endpoints disponibles para el sistema de ventas son todos los del business API autenticados:

| Método | Endpoint | Uso típico desde ventas |
|--------|----------|------------------------|
| `GET` | `/clientes` | Buscar cliente para asociar a una venta |
| `POST` | `/clientes` | Crear cliente nuevo detectado en ventas |
| `GET` | `/productos` | Sincronizar catálogo de productos |
| `POST` | `/facturas` | Emitir factura al cerrar una venta |
| `PATCH` | `/facturas/:id/estado` | Marcar como PAGADA cuando se confirma el pago |
| `GET` | `/dashboard/resumen` | Métricas consolidadas en el panel de ventas |
| `GET` | `/empresa` | Obtener datos del emisor para mostrar en documentos |

---

## Consideraciones de seguridad

**Qué hacer:**
- Guardá las credenciales del service account exclusivamente en variables de entorno
- Usá una password larga y aleatoria (mínimo 32 caracteres): `openssl rand -base64 32`
- Si el sistema de ventas está en producción, restringí la API de facturación por IP o red privada (solo accesible desde el servidor de ventas)
- Rotá la password del service account periódicamente

**Qué no hacer:**
- No commiteés las credenciales en Git (verificá que `.env` esté en `.gitignore`)
- No uses las mismas credenciales del admin humano para la integración
- No pongas el token JWT hardcodeado en el código — siempre usá el flujo de login con re-autenticación automática

---

## Próximos pasos si el sistema crece

Cuando la integración se vuelva más compleja o tengás más sistemas consumidores, considerá:

1. **API Keys dedicadas** — en lugar de email/password, emitís una clave opaca por sistema consumidor y la validás en un middleware
2. **OAuth 2.0 Client Credentials** — estándar para M2M en sistemas con múltiples consumidores externos
3. **API Gateway** (Kong, AWS API Gateway) — un único punto de entrada que gestiona auth, rate limiting y logging para todos los consumidores
4. **Multi-tenancy** — si el sistema de facturación va a tener varios clientes independientes, agregar `tenantId` a las entidades permite que cada sistema consumidor opere sobre sus propios datos en aislamiento total
