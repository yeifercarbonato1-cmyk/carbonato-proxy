# Plan: Sistema de Autenticación y API Keys

## Problema
Cualquier persona con acceso al proxy puede usar los 16 modelos sin registro ni restricción.

## Objetivo
Sistema completo de usuarios, login y API keys para controlar el acceso a los modelos.

---

## Arquitectura

### Persistencia
- **Local:** archivos JSON en disco (para test local)
- **Vercel:** archivos JSON en GitHub (`proxi-datos/usuarios-db.json`, `proxi-datos/llaves-db.json`)
- Mismo patrón que ya usa `usage-db.json` y `health-db.json`

### Esquemas de datos

```json
// usuarios-db.json
{
  "usuarios": [
    {
      "id": "uuid",
      "usuario": "string",
      "email": "string",
      "hash": "string (scrypt)",
      "salt": "string",
      "rol": "user | admin",
      "creado": "ISO date",
      "activo": true
    }
  ],
  "sesiones": [
    {
      "id": "uuid",
      "usuarioId": "uuid",
      "token": "string (HMAC)",
      "expira": "ISO date (+7d)"
    }
  ]
}

// llaves-db.json
{
  "llaves": [
    {
      "id": "uuid",
      "usuarioId": "uuid",
      "llave": "string (hash)",
      "prefijo": "cb_a1b2... (primeros 8 chars)",
      "nombre": "string",
      "creado": "ISO date",
      "activo": true
    }
  ]
}
```

### Dependencias
- **cero dependencias externas** — usamos `crypto` (built-in) para:
  - Hashing: `crypto.scryptSync`
  - UUID: `crypto.randomUUID()`
  - Tokens HMAC: `crypto.createHmac`

---

## Plan de Implementación

### Fase 1: Módulo de base de datos de usuarios
**Archivo:** `api/user-db.js`

Funciones:
- `loadUsers()` — carga usuarios-db.json (local + GitHub)
- `saveUsers(db)` — guarda a local + GitHub
- `createUser(usuario, email, password)` — hash + insert
- `findUserByLogin(usuario)` — para login
- `createSession(usuarioId)` — genera token HMAC, expira 7d
- `getSession(token)` — valida token, devuelve usuario
- `destroySession(token)` — logout

### Fase 2: Endpoints de autenticación
**Archivo:** `api/auth.js` (nuevo, registrado en vercel.json)

Endpoints:
| Método | Ruta | Función |
|--------|------|---------|
| POST | /api/auth/register | Crear usuario (usuario, email, password) |
| POST | /api/auth/login | Login, devuelve cookie + JSON |
| POST | /api/auth/logout | Borrar sesión |
| GET | /api/auth/me | Info del usuario actual |

### Fase 3: Módulo de API Keys
**Archivo:** `api/llaves-db.js`

Funciones:
- `loadKeys()` / `saveKeys(db)`
- `createKey(usuarioId, nombre)` — genera llave `cb_` + 32 chars hex
- `getUserKeys(usuarioId)` — lista llaves del usuario
- `revokeKey(id)` — desactiva llave
- `validateKey(llave)` — busca por hash, devuelve usuarioId o null

### Fase 4: Endpoints de API Keys
**Archivo:** `api/llaves.js` (nuevo, registrado en vercel.json)

| Método | Ruta | Función |
|--------|------|---------|
| GET | /api/keys | Listar llaves del usuario autenticado |
| POST | /api/keys | Crear nueva llave |
| DELETE | /api/keys/:id | Revocar llave |

### Fase 5: Middleware de protección
**Modificar:** `api/chat.js`

Antes de procesar cualquier request a /v1/chat/completions:
1. Buscar API key en header `Authorization: Bearer <key>` o query param `?key=<key>`
2. Validar contra `llaves-db.json` usando `validateKey()`
3. Si inválida → 401 `{ error: 'API key inválida o faltante' }`
4. Si válida → registrar usuarioId en el log de usage

Para el landing page `/`, `/models`, `/v1/models`:
- NO requerir API key (son públicos)
- Solo `/v1/chat/completions` requiere key

### Fase 6: Páginas web
**Archivo:** `api/paginas.js` (nuevo) o agregar a `api/index.js`

Páginas:
- `/login` → formulario de login + registro
- `/register` → formulario de registro
- `/account` → dashboard del usuario (ver/crear/revocar llaves, ver uso)

### Fase 7: Registro en test-server.js y vercel.json
- Agregar `auth.js`, `llaves.js`, `paginas.js` a test-server.js
- Agregar rutas a vercel.json

---

## Orden de trabajo (local primero)

```
Fase 1 → Fase 2 → probar registro/login local
Fase 3 → Fase 4 → probar creación/validación de keys local
Fase 5 → probar que chat.js rechaza requests sin key
Fase 6 → tener páginas funcionales local
Fase 7 → registrar todo y probar flujo completo local
        → commit + push a git
        → Vercel despliega automáticamente
```

## Consideraciones de seguridad
- Passwords hasheados con scrypt (N=16384, r=8, p=1)
- Tokens de sesión HMAC-SHA256 con clave secreta de `process.env.AUTH_SECRET`
- API keys generadas con `crypto.randomBytes(32).toString('hex')`
- Solo el prefijo `cb_XXXXXXXX` se muestra al usuario
- La llave completa solo se muestra UNA vez al crearla
- Rate limiting básico: 1 registro por IP cada 5 min

## Archivos a modificar/crear (resumen)

| Archivo | Acción |
|---------|--------|
| `api/user-db.js` | CREAR |
| `api/auth.js` | CREAR |
| `api/llaves-db.js` | CREAR |
| `api/llaves.js` | CREAR |
| `api/paginas.js` | CREAR |
| `api/chat.js` | MODIFICAR (middleware auth) |
| `api/test-server.js` | MODIFICAR (registrar handlers) |
| `vercel.json` | MODIFICAR (agregar rutas) |
| `PLAN-AUTH.md` | Este documento |
