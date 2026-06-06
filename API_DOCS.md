# Carbonato Proxy — API Documentation

## Base URL
`https://carbonato-proxy.vercel.app`

## Authentication
No global auth. /chat/completions es público.
Panel admin requiere cookie `admin_sess=ok` (login en `/api/admin`).

---

## Endpoints

### POST /chat/completions (alias: /v1/chat/completions)
API principal compatible OpenAI.

**Request body:**
```json
{
  "model": "modelo1",
  "messages": [{"role": "user", "content": "Hola"}],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Streaming:** pasar `"stream": true` para recibir SSE chunks en tiempo real.

### POST /v1/images/generations (alias: /images/generations)
Generación de imágenes vía modelo10.

### GET /models (alias: /v1/models)
Lista todos los modelos disponibles.

---

## Modelos

### Kilo.ai Gateway (sin key)

| ID | Modelo Interno | Notas |
|----|---------------|-------|
| modelo1 | kilo-auto/free | Auto-selección |
| modelo2 | nvidia/nemotron-3-super-120b-a12b:free | 120B params |
| modelo3 | poolside/laguna-m.1:free | Balance |
| modelo4 | poolside/laguna-xs.2:free | Rápido |
| modelo5 | nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | **Visión multimodal** |
| modelo6 | stepfun/step-3.7-flash:free | Razonamiento |
| modelo7 | nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | Código |
| modelo8 | openrouter/free | Multi-modelo |

### Smart Rotator

| ID | Comportamiento |
|----|---------------|
| modelo9 | Prueba modelo1→16 secuencialmente. Circuit breaker: 2 fallos/30s |

### Imágenes

| ID | Endpoint | Tipo |
|----|----------|------|
| modelo10 | https://image.pollinations.ai/prompt/ | Generación de imágenes |

**Uso imágenes:**
```json
{"model":"modelo10","messages":[{"role":"user","content":"Gato astronauta"}]}
```
Respuesta: `{ "data": [{ "url": "https://image.pollinations.ai/..." }] }`

### OpenCode Zen (sin key)

| ID | Modelo Interno |
|----|---------------|
| modelo11 | deepseek-v4-flash-free |
| modelo12 | minimax-m3-free |

Endpoint: `https://opencode.ai/zen/v1/chat/completions`
No requiere API key.

### OpenRouter (con key)

| ID | Modelo Interno | Key |
|----|---------------|-----|
| modelo13 | openai/gpt-oss-120b:free | `OR_KEY1` |
| modelo14 | nvidia/nemotron-3-super-120b-a12b:free | `OR_KEY2` |
| modelo15 | google/gemma-4-1b-it:free | `OR_KEY1` |
| modelo16 | z-ai/glm-4.5-air:free | `OR_KEY2` |

Endpoint: `https://openrouter.ai/api/v1/chat/completions`

---

## Streaming

Todos los modelos de texto (1-4, 6-8, 11-16) soportan streaming real.
No soportan streaming: modelo5 (visión), modelo9 (rotador), modelo10 (imagen).

**Respuesta SSE:**
```
data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":"token"}}]}

data: [DONE]
```

Timeout streaming: 60s. Timeout rotador: 15s por intento.

---

## Visión (modelo5)

```json
{
  "model": "modelo5",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "Describe esta imagen"},
      {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
    ]
  }]
}
```

---

## Errores

| Código | Significado |
|--------|------------|
| 400 | Modelo inválido / bad request |
| 401 | API key faltante |
| 500 | Error upstream del provider |
| 502 | Timeout / provider caído |

---

## Model Check

`GET /api/models-check` — verifica disponibilidad de modelos en Kilo.ai.
Requiere cookie admin. Retorna estado de cada modelo + sugerencias de actualización.

---

## Admin Panel

- **Login:** `GET /api/admin`
- **Dashboard:** `GET /api/admin-panel` (requiere cookie)
- **Auth:** `POST /api/admin-auth` (form: user, pass)
- **Save:** `POST /api/admin-save` (JSON con config completa)
- **Logout:** `GET /api/admin-logout`

Diseño cyberpunk: dark mode, glassmorphism, neón, animaciones.

---

## Variables de Entorno (Vercel)

```
GITHUB_TOKEN=<token_repo_scope>
ADMIN_USER=admin
ADMIN_PASS=carbonato2026
OR_KEY1=sk-or-...
OR_KEY2=sk-or-...
```

⚠️ Usar API REST de Vercel para setear env vars (CLI bug: `vercel env add` guarda valores vacíos).
