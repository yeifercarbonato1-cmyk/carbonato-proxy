# 🍄 Carbonato Proxy v5.20

Gateway unificado de IA compatible con OpenAI. Accede a 8 modelos gratis desde una sola URL.

## 🔗 Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `/chat/completions` | API principal (OpenAI-compatible) |
| `/v1/chat/completions` | Alias para compatibilidad OpenAI |
| `/v1/images/generations` | Generación de imágenes |
| `/models` | Lista modelos disponibles |
| `/api/models-check` | Verifica disponibilidad de modelos Kilo |
| `/api/admin` | Panel administrativo |

## 🎮 Modelos Disponibles

| Modelo | Provider | Descripción |
|--------|----------|-------------|
| modelo1 | kilo-auto/free | Auto-selección (mejor disponible) |
| modelo2 | nvidia/nemotron-3-super-120b-a12b:free | 120B razonamiento épico |
| modelo3 | poolside/laguna-m.1:free | Laguna M.1 - equilibrio |
| modelo4 | poolside/laguna-xs.2:free | Laguna XS.2 - velocidad |
| modelo5 | pollinations-image | Generación de imágenes |
| modelo6 | stepfun/step-3.7-flash:free | Razonamiento rápido |
| modelo7 | nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | Código ninja |
| modelo8 | openrouter/free | Multi-modelo OpenRouter |

## 🚀 Uso

### Chat básico
```bash
curl -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "modelo1",
    "messages": [{"role": "user", "content": "Hola"}]
  }'
```

### Generar imagen
```bash
curl -X POST https://carbonato-proxy.vercel.app/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "modelo5",
    "messages": [{"role": "user", "content": "Gato astronauta"}]
  }'
```

## ⚙️ Configuración (Admin)

1. Acceder a `/api/admin`
2. Credenciales por defecto: `admin` / `carbonato2026`
3. Verificar modelos con botón "VERIFICAR MODELOS KILO"
4. Guardar cambios actualiza `api/config.json` en repo GitHub

## 🛠️ Variables de Entorno

```bash
GITHUB_TOKEN=tu_token       # Para guardar config/stats
IMGBB_API_KEY=tu_key        # Opcional, para upload de imágenes
```

## 📊 Repositorios

- **Código**: `yeifer125/carbonato.llm`
- **Datos/Stats**: `yeifer125/proxi-datos`

## 💻 Desarrollo Local

```bash
npm install -g vercel
vercel dev
```

---
Creado con Hermes - 100% código libre