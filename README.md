# ⎈ CARBONATO PROXY

Gateway unificado de IA — 17 modelos desde una sola URL compatible con OpenAI API.

**URL base:** `https://carbonato-proxy.vercel.app`

---

## Endpoints públicos

| Endpoint | Descripción |
|----------|-------------|
| `/chat/completions` | API principal (OpenAI-compatible) |
| `/v1/chat/completions` | Alias compatibilidad OpenAI |
| `/v1/images/generations` | Generación de imágenes |
| `/models`, `/v1/models` | Lista modelos disponibles |
| `/api/playground` | Chat web interactivo |

## Endpoints admin

| Endpoint | Descripción |
|----------|-------------|
| `/api/admin` | Login |
| `/api/admin-panel` | Dashboard con estadísticas + charts |
| `/api/health/page` | Health check en vivo desde el navegador |
| `/api/competencia/page` | Comparador de hasta 3 modelos |
| `/api/rotator/page` | Ranking de velocidad del rotador |
| `/api/prompts/page` | Templates de prompts |
| `/api/visitors/page` | Dashboard de IPs + geolocalización |

---

## Modelos (17)

| # | Nombre | Descripción |
|---|--------|-------------|
| 1 | Kilo Auto | Modelo estrella — alto rendimiento |
| 2 | Nemotron 3 Super 120B | Razonamiento profundo — tareas complejas |
| 3 | Laguna M.1 | Equilibrio velocidad y calidad |
| 4 | Laguna XS.2 | Máxima velocidad — respuestas instantáneas |
| 5 | Nemotron Nano Omni 30B | Visión y texto — multimodal |
| 6 | Step-3.7-Flash | Razonamiento rápido y preciso |
| 7 | Nemotron 3 Ultra 550B | NVIDIA 550B MoE — razonamiento masivo |
| 8 | OpenRouter | Acceso multi-proveedor |
| 9 | Smart Rotator | Failover inteligente — prueba modelos secuencialmente con circuit breaker |
| 10 | Pollinations HD | Generación de imágenes HD |
| 11 | DeepSeek V4 Flash | Tool calling avanzado |
| 12 | MiniMax M3 | Ligero y eficiente |
| 13 | OpenAI GPT OSS | Potencia open-source |
| 14 | Nemotron Super 120B | Alta capacidad de proceso |
| 15 | Gemma 4 | Precisión y confiabilidad |
| 16 | GLM 4.5 Air MoE | Arquitectura MoE eficiente |
| 17 | Cavernícola | Conocimiento + caveman — respuestas brutales con base de datos |

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
    "messages":[{"role":"user","content":[
      {"type":"text","text":"Describe esta imagen"},
      {"type":"image_url","image_url":{"url":"data:image/jpeg;base64,..."}}
    ]}]
  }'
```

### Imagen (modelo10)

```bash
curl -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"modelo10","messages":[{"role":"user","content":"Gato astronauta"}]}'
```

### Smart Rotator (modelo9)

```bash
curl -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"modelo9","messages":[{"role":"user","content":"Hola"}]}'
```
El rotador prueba modelos automáticamente del más rápido al más lento según health histórico. Circuit breaker: 2 fallos en 30s = salta ese modelo.

---

## Admin

1. Ir a `/api/admin`
2. Credenciales configuradas en variables de entorno
3. Dashboard con 4 KPIs, 3 charts (Chart.js), gestión de 16 modelos
4. Live health check desde el navegador
5. Exportar CSV de uso
6. Persistencia vía GitHub API al repo de datos

---

## Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GITHUB_TOKEN` | Sí | Para guardar config/stats en GitHub |
| `ADMIN_USER` | Sí | Usuario admin |
| `ADMIN_PASS` | Sí | Contraseña admin |
| `OR_KEY1` | Para OR | 1ra key de OpenRouter |
| `OR_KEY2` | Para OR | 2da key de OpenRouter |

---

## Stack

- Node.js 22.x serverless en Vercel (5 funciones)
- 16 modelos multi-proveedor
- Streaming real SSE
- Smart Rotator con circuit breaker + ranking dinámico
- Panel admin cyberpunk (glassmorphism, charts)
- Landing page monocroma con carrusel
- Persistencia vía GitHub API (merge con dedup)
- Bot Telegram con health check cada 30 min

---

## Desarrollo Local

```bash
cd /media/disco1tb/hermes-cosas/espacio-de-trabajo/carbonato-proxy
node test-server.js
# Servidor en http://localhost:3456
```

**Nota:** sin las API keys de producción, la mayoría de modelos fallan localmente. Usar solo para debug de código.

---

## Arquitectura

```
api/
  chat.js             # Proxy principal + rotador
  admin-tools.js      # Router unificado (~20 endpoints)
  admin-panel.js      # Dashboard
  admin.js            # Login
  admin-templates.js  # Templates HTML reutilizables
  index.js            # Landing page wrapper
  landing-html.js     # HTML de la landing
  landing-css.js      # CSS de la landing
  landing-js.js       # JS de la landing (carrusel)
  models-def.js       # Fuente única de definiciones de modelos
vercel.json           # 5 builds, ~30 rutas
```

---

## Repositorios

- **Código:** `yeifer125/carbonato-proxy`
- **Datos/Stats:** `yeifer125/proxi-datos`
