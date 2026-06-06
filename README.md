# ⎈ Carbonato Proxy

Gateway unificado de IA compatible con OpenAI API. 16 modelos desde una sola URL: Kilo.ai, OpenCode Zen, OpenRouter, Pollinations y Smart Rotator.

**URL base:** `https://carbonato-proxy.vercel.app`

---

## Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `/chat/completions` | API principal (OpenAI-compatible) |
| `/v1/chat/completions` | Alias compatibilidad OpenAI |
| `/v1/images/generations` | Generación de imágenes |
| `/models`, `/v1/models` | Lista modelos disponibles |
| `/api/admin` | Login panel administrativo |
| `/api/admin-panel` | Dashboard de administración |
| `/api/models-check` | Verifica modelos en Kilo.ai |

---

## Modelos (16)

### Kilo.ai Gateway (gratis, sin key)
| # | Model ID | Descripción |
|---|----------|-------------|
| 1 | kilo-auto/free | Auto-selección (mejor disponible) |
| 2 | nvidia/nemotron-3-super-120b-a12b:free | 120B razonamiento |
| 3 | poolside/laguna-m.1:free | Equilibrio calidad/velocidad |
| 4 | poolside/laguna-xs.2:free | Máxima velocidad |
| 5 | nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | **Visión + texto multimodal** |
| 6 | stepfun/step-3.7-flash:free | Razonamiento rápido |
| 7 | nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | Código |
| 8 | openrouter/free | Multi-modelo vía OpenRouter |

### Smart Rotator
| # | Descripción |
|---|-------------|
| 9 | Prueba modelos 1→16 secuencialmente con circuit breaker |

### Pollinations (imágenes)
| # | Descripción |
|---|-------------|
| 10 | Generación de imágenes con Pollinations.ai |

### OpenCode Zen (sin key)
| # | Model ID | Descripción |
|---|----------|-------------|
| 11 | deepseek-v4-flash-free | DeepSeek V4 rápido |
| 12 | minimax-m3-free | MiniMax M3 |

### OpenRouter (con key rotada)
| # | Model ID | Key |
|---|----------|-----|
| 13 | openai/gpt-oss-120b:free | `$OR_KEY1` |
| 14 | nvidia/nemotron-3-super-120b-a12b:free | `$OR_KEY2` |
| 15 | google/gemma-4-1b-it:free | `$OR_KEY1` |
| 16 | z-ai/glm-4.5-air:free | `$OR_KEY2` |

---

## Uso

### Chat (texto)
```bash
curl -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"modelo1","messages":[{"role":"user","content":"Hola"}]}'
```

### Streaming
```bash
curl -s -N -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"modelo1","messages":[{"role":"user","content":"Hola"}],"stream":true}'
```

### Visión (modelo5)
```bash
curl -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model":"modelo5",
    "messages":[{"role":"user","content":[{"type":"text","text":"Describe esta imagen"},{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,..."}}]}]
  }'
```

### Imagen (modelo10)
```bash
curl -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"modelo10","messages":[{"role":"user","content":"Gato astronauta"}]}'
```

---

## Admin

1. Ir a `/api/admin`
2. Credenciales: `admin` / `carbonato2026`
3. Dashboard cyberpunk con gestión de 16 modelos, estadísticas, pruebas en vivo
4. Botón "VERIFICAR MODELOS" consulta disponibilidad en Kilo.ai
5. Cambios se guardan vía GitHub API al repo `yeifer125/proxi-datos`

---

## Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GITHUB_TOKEN` | Sí | Para guardar config/stats en GitHub |
| `ADMIN_USER` | No | Usuario admin (default: admin) |
| `ADMIN_PASS` | No | Contraseña admin (default: carbonato2026) |
| `OR_KEY1` | Para OR | 1ra key de OpenRouter |
| `OR_KEY2` | Para OR | 2da key de OpenRouter |

---

## Stack

- Node.js serverless en Vercel
- 16 modelos multi-proveedor
- Streaming real SSE
- Smart Rotator con circuit breaker
- Panel admin cyberpunk (glassmorphism + neón)
- Persistencia vía GitHub API

---

## Desarrollo Local

```bash
cd /media/disco1tb/hermes-cosas/espacio-de-trabajo/carbonato-proxy
node test-server.js
# Servidor en http://localhost:3456
# Rutas: /chat/completions, /api/admin, /api/admin-panel, /models
```

---

## Repositorios

- **Código:** `yeifer125/carbonato-proxy`
- **Datos/Stats:** `yeifer125/proxi-datos`
