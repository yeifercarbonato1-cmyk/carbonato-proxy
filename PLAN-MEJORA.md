# PLAN DE MEJORA — Carbonato Proxy ✅ COMPLETADO

Sin push a git hasta autorización.

---

## FASE 1: Fusión de endpoints pequeños en admin-tools.js ✅

**Antes:** 11 funciones Vercel de 12 usadas
**Después:** 5 funciones — 7 slots libres

| Archivo | Líneas | Nuevo handler en admin-tools.js |
|---------|--------|--------------------------------|
| admin-auth.js | 17 | `handleAdminAuth` |
| admin-save.js | 52 | `handleAdminSave` |
| admin-logout.js | 3 | `handleAdminLogout` |
| upload.js | 66 | `handleUpload` |
| models-check.js | 63 | `handleModelsCheck` |
| docs-ia.js | 51 | `handleDocsIA` |

**vercel.json:** Removidas 6 builds y 6 rutas de archivos sueltos. Agregadas rutas nuevas hacia admin-tools.js.

**Funciones Vercel actuales:**
1. `api/chat.js` — proxy principal
2. `api/admin-panel.js` — dashboard
3. `api/admin-tools.js` — router unificado (16 handlers)
4. `api/admin.js` — login page
5. `api/index.js` — landing

---

## FASE 2: Refactor admin-panel.js ✅

- **Creado `api/admin-templates.js`** — 17 funciones template exportadas (headHTML, navHTML, modelCardHTML, chartScriptsHTML, etc.)
- **admin-panel.js reducido de 484 → ~130 líneas**
- **Usa `models-def.js`** para icons, colores y nombres (sin arrays hardcodeados)
- **Separada lógica backend** del rendering HTML

---

## FASE 3: Mejoras en página de visitantes ✅

- Barra de búsqueda por IP (filtro client-side en tiempo real)
- Paginación (20 IPs por página, botones Anterior/Siguiente)
- Filtro por fecha (inputs date Desde/Hasta con botón limpiar)
- Botón exportar CSV de IPs filtradas
- Botón de reset oculto ● mantenido

---

## FASE 4: Nuevas features ✅

### Página de Logs (`/api/logs/page`)
- Muestra historial de requests: hora, modelo, IP, status, latencia, error
- Últimos 100 registros de `/tmp/proxy-logs.json`
- Logging implementado en chat.js: 6 puntos de log (rotator success/fail, streaming, no-streaming, errores)

### Editor de Config (`/api/config/page` + `/api/config/save`)
- Editor JSON con syntax highlighting
- Carga `config.json` desde GitHub (proxi-datos)
- Guarda con PUT a GitHub + copia local a /tmp

### Estado del Bot Telegram en dashboard
- Card en overview que muestra estado del bot (ACTIVO/ERROR/SIN DATOS)
- Detecta último check en health-db.json (última hora = activo)

### Reporte diario automático
- Cron job `proxy-daily-report` — todos los días a las 8am
- Genera stats: IPs únicas, requests, tokens, top modelos, health status
- Envía a Telegram (chat ID 7507526979)

---

## IMPACTO EN VERCEL

| Estado actual | Antes |
|--------------|-------|
| 5 funciones | 11 funciones |
| 7 slots libres | 1 slot libre |
| 0 endpoints sueltos | 6 endpoints sueltos |

**Archivos modificados:** admin-tools.js (+6 handlers + logs + config), admin-panel.js (refactor completo), chat.js (+logging), vercel.json (builds/routes), admin-templates.js (NUEVO), PLAN-MEJORA.md (NUEVO).
