# Carbonato Proxy — API Documentation

## Base URL
`https://carbonato-proxy.vercel.app`

## Authentication
La API requiere autenticación.

Usar uno:
- `Authorization: Bearer <CARBONATO_API_KEY>`
- `x-api-key: <CARBONATO_API_KEY>`
- cookie admin `admin_sess` después de login en `/api/admin`

Variables:
- `CARBONATO_API_KEY`: una llave única
- `CARBONATO_API_KEYS`: varias llaves separadas por coma
- `ADMIN_USER`, `ADMIN_PASS`, `SESSION_SECRET`: login admin

---

## Endpoints

### POST /chat/completions
Alias: `/v1/chat/completions`

Compatible OpenAI.

```bash
curl -s https://carbonato-proxy.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CARBONATO_API_KEY" \
  -d '{
    "model": "modelo1",
    "messages": [{"role":"user","content":"Hola"}],
    "stream": false
  }'
```

### GET /models
Alias: `/v1/models`

Requiere la misma autenticación. Devuelve solo modelos públicos.

```bash
curl -s https://carbonato-proxy.vercel.app/v1/models \
  -H "Authorization: Bearer $CARBONATO_API_KEY"
```

### POST /v1/images/generations
Alias: `/images/generations`

Requiere autenticación.

---

## Modelos públicos

Solo se publican 12 modelos:

| ID | Tipo |
|----|------|
| modelo1 | Chat |
| modelo2 | Chat |
| modelo3 | Chat |
| modelo4 | Chat |
| modelo5 | Visión/texto |
| modelo6 | Chat |
| modelo7 | Chat |
| modelo8 | Chat |
| modelo9 | Rotador público |
| modelo10 | Imágenes |
| modelo11 | Chat |
| modelo12 | Chat |

Modelos privados no aparecen en `/models` ni pueden llamarse sin cookie admin.

---

## Knowledge

`GET /api/knowledge?q=...` requiere API key o cookie admin.

---

## Admin

- Login: `GET /api/admin`
- Auth: `POST /api/admin-auth`
- Dashboard: `GET /api/admin-panel`
- Logout: `GET /api/admin-logout`

`/api/admin-auth` tiene rate limit básico por IP.

---

## Errores

| Código | Significado |
|--------|------------|
| 400 | Modelo inválido / bad request |
| 401 | Auth faltante o inválida |
| 429 | Demasiados intentos login |
| 500 | Error interno/upstream |
| 502 | Provider caído/timeout |
