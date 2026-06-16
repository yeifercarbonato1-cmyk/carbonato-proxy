// ═══════════════════════════════════════════════════════════
// SKYNET — Router Inteligente, Chaining & Scanner
// PRIMERA RED DE SKYNET
// ═══════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { MODELOS } = require('./models-def.js');
const { 
  recordFailure: memFail, 
  recordSuccess: memSuccess,
  getMemoryStats,
  getModelHealth,
  logActivity,
  getActivity,
  logAccess,
  getAccessLogs,
  clearAccessLogs
} = require('./skynet-memory.js');

// ─── Helpers ─────────────────────────────────────────────

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown';
}

function resolveKey(cfg) {
  if (!cfg.key) return '';
  if (typeof cfg.key === 'string' && cfg.key.startsWith('$')) {
    return process.env[cfg.key.slice(1)] || '';
  }
  return cfg.key;
}

function getConfig() {
  try {
    const tmp = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8'));
    if (tmp && typeof tmp === 'object' && Object.keys(tmp).length > 0) return tmp;
  } catch(e) {}
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  } catch (e) {
    return {};
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch (e) {
    return {};
  }
}

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(data);
}

// ─── Llamada a modelo interno ────────────────────────────

async function callModel(modelKey, messages, opts = {}) {
  const CONFIG = getConfig();
  const cfg = CONFIG[modelKey];
  if (!cfg) throw new Error(`Modelo ${modelKey} no configurado`);
  if (cfg.isRotator) throw new Error(`No se puede llamar al rotador directamente`);

  const maxTokens = opts.max_tokens || 512;

  // Truncar messages a ~8000 chars total (excepto si contiene imágenes)
  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === 'image_url'));
  let msgs = messages;
  if (!hasImages) {
    const MAX_CHARS = 8000;
    let totalChars = 0;
    const truncated = [];
    for (const m of messages) {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      const remaining = MAX_CHARS - totalChars;
      if (remaining <= 0) break;
      if (content.length > remaining) {
        truncated.push({ ...m, content: content.slice(0, remaining) + '...[truncated]' });
        break;
      }
      truncated.push(m);
      totalChars += content.length;
    }
    msgs = truncated;
  }

  const body = {
    model: cfg.model,
    messages: msgs,
    max_tokens: maxTokens,
    temperature: opts.temperature ?? 0.7,
    stream: false
  };

  if (cfg.system_prompt) {
    const hasSystem = messages.some(m => m.role === 'system');
    if (!hasSystem) {
      body.messages = [{ role: 'system', content: cfg.system_prompt }, ...messages];
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  const key = resolveKey(cfg);
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const timeout = opts.timeout || 25000;
  const upstreamRes = await fetch(cfg.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout)
  });

  const text = await upstreamRes.text();

  if (!upstreamRes.ok) {
    throw new Error(`${modelKey} responded ${upstreamRes.status}: ${text.slice(0, 200)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`${modelKey} returned non-JSON response`);
  }

  const content = parsed?.choices?.[0]?.message?.content || parsed?.choices?.[0]?.message?.reasoning || '';
  return { content, raw: parsed, model: modelKey };
}

// ─── MODELO10: Generación de imágenes ────────────────────

async function callImageModel(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
  return {
    content: `![image](${imageUrl})`,
    raw: { created: Math.floor(Date.now() / 1000), data: [{ url: imageUrl }] },
    model: 'modelo10'
  };
}

// ─── 1. ROUTER INTELIGENTE ───────────────────────────────

function buildRouterPrompt() {
  const descriptions = MODELOS
    .filter(m => m.id !== 'modelo9')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(m => `${m.id}: ${m.desc}`).join('\n');

  return `Eres SKYNET ROUTER. Analiza el mensaje y elige el modelo ÓPTIMO.

MODELOS DISPONIBLES:
${descriptions}

REGLAS DE ENRUTAMIENTO:
- modelo4 → más rápido (saludos, consultas simples, charla casual)
- modelo2, modelo7 → más inteligentes (código, análisis, razonamiento)
- modelo5 → imágenes, visión multimodal (si el mensaje contiene data:image o image_url)
- modelo10 → SOLO para generar imágenes (si el usuario pide explícitamente crear una imagen)
- modelo11 → tool calling, JSON estructurado
- modelo1 → balanceado (default)
- modelo9 → NO usar (rotador interno)

Responde ÚNICAMENTE JSON: {"model":"modeloX","reason":"razón breve"}`;
}

async function handleRouter(req, res) {
  const body = await readBody(req);
  const messages = body.messages || [];
  const userMessage = messages.map(m => m.content).filter(Boolean).join(' ');

  if (!userMessage) {
    return json(res, 400, { error: { message: 'Se requiere messages con contenido', type: 'invalid_request_error' } });
  }

  // Si es imagen explícita, modelo5
  const hasImage = messages.some(m => {
    const c = m.content;
    if (Array.isArray(c)) return c.some(p => p.type === 'image_url');
    return false;
  });
  if (hasImage) {
    // Enrutar directamente a modelo5
    try {
      const result = await callModel('modelo5', messages, { max_tokens: body.max_tokens || 1024, timeout: 30000 });
      memSuccess('modelo5');
      res.setHeader('X-Skynet-Router', 'modelo5');
      return json(res, 200, { ...result.raw, skynet: { router: 'modelo5', reason: 'Imagen detectada' } });
    } catch (e) {
      memFail('modelo5');
      return json(res, 502, { error: { message: e.message, type: 'skynet_router_error' } });
    }
  }

  // Paso 1: Router analiza con modelo4 (rápido)
  let chosenModel = 'modelo1';
  let reason = 'Fallback genérico';
  try {
    const routerResult = await callModel('modelo4', [
      { role: 'system', content: buildRouterPrompt() },
      { role: 'user', content: `Mensaje del usuario: "${userMessage.slice(0, 500)}"\n\n¿Qué modelo debe responder?` }
    ], { max_tokens: 100, temperature: 0.1, timeout: 10000 });

    const routerText = routerResult.content.trim();
    try {
      const parsed = JSON.parse(routerText);
      chosenModel = parsed.model || 'modelo1';
      reason = parsed.reason || 'Selección automática';
      // Validar que el modelo existe y no es rotador
      const validModels = MODELOS.map(m => m.id).filter(id => id !== 'modelo9');
      if (!validModels.includes(chosenModel)) {
        chosenModel = 'modelo1';
        reason = 'Modelo inválido, fallback a modelo1';
      }
    } catch (e) {
      // Si no es JSON, extraer modelo del texto
      const match = routerText.match(/modelo\d+/);
      if (match) chosenModel = match[0];
    }
  } catch (e) {
    // Router falló, usar modelo1 como fallback
    console.log(`[skynet] Router falló: ${e.message}, usando modelo1`);
  }

  // Paso 2: Llamar al modelo elegido
  try {
    const result = await callModel(chosenModel, messages, {
      max_tokens: body.max_tokens || 1024,
      temperature: body.temperature,
      timeout: 30000
    });
    memSuccess(chosenModel);
    res.setHeader('X-Skynet-Router', chosenModel);
    res.setHeader('X-Skynet-Reason', reason);
    logActivity('router', { router: chosenModel, reason, contentLen: (result.content||'').length });
    return json(res, 200, { ...result.raw, skynet: { router: chosenModel, reason } });
  } catch (e) {
    memFail(chosenModel);
    // Fallback: intentar con modelo1
    if (chosenModel !== 'modelo1') {
      try {
        const fallback = await callModel('modelo1', messages, {
          max_tokens: body.max_tokens || 1024,
          temperature: body.temperature,
          timeout: 30000
        });
        res.setHeader('X-Skynet-Router', `fallback:modelo1`);
        res.setHeader('X-Skynet-Reason', `${chosenModel} falló, fallback modelo1`);
        return json(res, 200, { ...fallback.raw, skynet: { router: chosenModel, fallback: 'modelo1', reason: `${chosenModel} falló` } });
      } catch (e2) {
        return json(res, 502, { error: { message: `Router falló: ${e2.message}`, type: 'skynet_router_error' } });
      }
    }
    return json(res, 502, { error: { message: e.message, type: 'skynet_router_error' } });
  }
}

// ─── 2. CHAINING ─────────────────────────────────────────

const CHAIN_EXCLUDE = ['modelo9', 'modelo10'];

async function handleChain(req, res) {
  const body = await readBody(req);
  const chain = body.chain || [];
  const messages = body.messages || [];
  const maxTokens = body.max_tokens || 512;
  const temperature = body.temperature ?? 0.7;

  if (!Array.isArray(chain) || chain.length < 2) {
    return json(res, 400, { error: { message: 'Se requiere chain con al menos 2 modelos', type: 'invalid_request_error' } });
  }

  // Validar modelos
  const validModels = MODELOS.map(m => m.id);
  for (const m of chain) {
    if (!validModels.includes(m)) {
      return json(res, 400, { error: { message: `Modelo "${m}" no válido`, type: 'invalid_request_error' } });
    }
    if (CHAIN_EXCLUDE.includes(m)) {
      return json(res, 400, { error: { message: `Modelo ${m} no soportado en chains`, type: 'invalid_request_error' } });
    }
  }

  const steps = [];
  let accumulatedMessages = [...messages];

  for (let i = 0; i < chain.length; i++) {
    const modelKey = chain[i];
    try {
      const result = await callModel(modelKey, accumulatedMessages, {
        max_tokens: maxTokens,
        temperature,
        timeout: 25000
      });

      steps.push({
        step: i + 1,
        model: modelKey,
        status: 'ok',
        content_length: result.content.length,
        tokens: result.raw?.usage?.total_tokens || 0
      });

      // Mantener mensajes originales + último output (evita O(n²))
      if (i === 0) {
        accumulatedMessages = [
          ...messages,
          { role: 'assistant', content: result.content },
          { role: 'user', content: `Continúa desde donde quedó el modelo anterior. Mejora, refina o completa. No repitas.` }
        ];
      } else {
        accumulatedMessages = [
          ...messages,
          { role: 'user', content: `Resultado del paso anterior (${modelKey}):\n${result.content.slice(0, 2000)}\n\nContinúa refinando o completando. No repitas.` }
        ];
      }

      // Si es el último paso, devolver su output
      if (i === chain.length - 1) {
        res.setHeader('X-Skynet-Chain', chain.join('->'));
        logActivity('chain', { chain: chain.join('->'), steps, finalLen: result.content.length });
        return json(res, 200, {
          steps,
          final: result.content,
          model: modelKey,
          usage: result.raw?.usage || {}
        });
      }
    } catch (e) {
      steps.push({
        step: i + 1,
        model: modelKey,
        status: 'error',
        error: e.message
      });
      // Devolver resultado parcial
      res.setHeader('X-Skynet-Chain', chain.join('->') + ' (parcial)');
      return json(res, 502, {
        error: {
          message: `Chain falló en paso ${i + 1} (${modelKey}): ${e.message}`,
          type: 'skynet_chain_error',
          partial: true
        },
        steps,
        completedSteps: steps.filter(s => s.status === 'ok').length,
        totalSteps: chain.length
      });
    }
  }
}

// ─── Scan compartido (paralelo, chunks de 4) ────────────

async function scanModels(timeout = 10000) {
  const CONFIG = getConfig();
  const results = [];
  const CHUNK = 4;

  // Modelos a probar (saltar rotador)
  const toScan = MODELOS.filter(m => CONFIG[m.id] && !CONFIG[m.id].isRotator);
  // Modelos skipped
  for (const model of MODELOS) {
    const cfg = CONFIG[model.id];
    if (!cfg || cfg.isRotator) {
      results.push({ id: model.id, status: 'skipped', reason: !cfg ? 'no config' : 'rotator', latency: 0 });
    }
  }

  // Procesar en chunks de 4 para no saturar Vercel Hobby
  for (let i = 0; i < toScan.length; i += CHUNK) {
    const chunk = toScan.slice(i, i + CHUNK);
    const chunkResults = await Promise.allSettled(chunk.map(model => {
      const t0 = Date.now();
      return callModel(model.id, [{ role: 'user', content: 'ping' }], { max_tokens: 1, timeout })
        .then(r => {
          memSuccess(model.id);
          return { id: model.id, status: 'online', latency: Date.now() - t0, tokens: r.raw?.usage?.total_tokens || 0 };
        })
        .catch(e => {
          memFail(model.id);
          return { id: model.id, status: 'offline', latency: Date.now() - t0, error: e.message.slice(0, 100) };
        });
    }));
    for (const r of chunkResults) {
      if (r.status === 'fulfilled') results.push(r.value);
      else results.push({ id: 'unknown', status: 'error', latency: 0, error: r.reason?.message?.slice(0, 100) || 'unknown' });
    }
  }

  return results;
}

// ─── 3. SCANNER ──────────────────────────────────────────

async function handleScan(req, res) {
  const results = await scanModels(10000);
  const online = results.filter(r => r.status === 'online').length;
  const offline = results.filter(r => r.status === 'offline').length;
  const memoryStats = getMemoryStats();
  logActivity('scan', { online, offline, total: MODELOS.length });

  return json(res, 200, {
    total: MODELOS.length,
    online,
    offline,
    skipped: results.filter(r => r.status === 'skipped').length,
    results,
    lastScan: new Date().toISOString(),
    memory: memoryStats
  });
}

// ─── 4. MEMORY STATS ─────────────────────────────────────

function handleMemoryStats(req, res) {
  return json(res, 200, getMemoryStats());
}

// ─── 5. DATA HUB — todos los datos en un endpoint ────────

async function handleDataHub(req, res) {
  const memoryStats = getMemoryStats();
  const scanResults = await scanModels(5000);
  const CONFIG = getConfig();

  return json(res, 200, {
    timestamp: Date.now(),
    models: {
      total: MODELOS.length,
      online: scanResults.filter(r => r.status === 'online').length,
      offline: scanResults.filter(r => r.status === 'offline').length,
      skipped: scanResults.filter(r => r.status === 'skipped').length,
      results: scanResults
    },
    memory: memoryStats,
    config: {
      modelsInConfig: Object.keys(CONFIG).length,
      envKeys: { or1: !!process.env.OR_KEY1, or2: !!process.env.OR_KEY2 }
    },
    version: 'SKYNET v1.0 — PRIMERA RED DE SKYNET'
  });
}

// ─── 6.5 SEE INTEGRATION: Diagnose & Evolve ──────────────

async function handleSeeDiagnose(req, res) {
  let diagnose;
  try { diagnose = require('../see/diagnose.js'); } catch(e) {
    return json(res, 501, { error: { message: 'SEE diagnose module not available', type: 'not_implemented' } });
  }
  try {
    const result = await diagnose.fullDiagnose();
    return json(res, 200, { ok: true, ...result });
  } catch(e) {
    console.log(`[skynet] Diagnose error: ${e.message}`);
    return json(res, 500, { ok: false, error: e.message });
  }
}

async function handleSeeEvolve(req, res) {
  let worker;
  try { worker = require('../see/see-worker.js'); } catch(e) {
    return json(res, 501, { error: { message: 'SEE evolve module not available', type: 'not_implemented' } });
  }
  try {
    const result = await worker.runCycle();
    return json(res, 200, { ok: true, ...result });
  } catch(e) {
    console.log(`[skynet] Evolve error: ${e.message}`);
    return json(res, 500, { ok: false, error: e.message });
  }
}

// ─── 6. LOGS ENDPOINT ────────────────────────────────────

async function handleLogs(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const method = req.method;
  const pathname = url.pathname;

  // GET /v1/skynet/logs ↗ devuelve JSON
  if (method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const logs = await getAccessLogs(Math.min(limit, 200));
    return json(res, 200, { ok: true, total: logs.length, logs });
  }

  // POST /v1/skynet/logs/clear — limpia logs
  if (method === 'POST' && pathname.endsWith('/clear')) {
    clearAccessLogs();
    return json(res, 200, { ok: true, message: 'Access logs cleared' });
  }

  return json(res, 404, { error: { message: 'Not found', type: 'not_found' } });
}

// ─── Router principal ────────────────────────────────────

module.exports = async (req, res) => {
  let urlPath = (req.url || '').split('?')[0];
  // Normalizar: eliminar trailing slash (excepto si es solo '/')
  if (urlPath.length > 1 && urlPath.endsWith('/')) urlPath = urlPath.slice(0, -1);
  const method = req.method;
  const ip = getClientIp(req);
  const t0 = Date.now();

  // Helper para logAccess silencioso
  const log = (entry) => logAccess({
    timestamp: new Date().toISOString(), ip, ...entry,
    latency_ms: Date.now() - t0
  }).catch(() => {});

  // Interceptar res.json para capturar modelo y status
  const _origJson = res.json.bind(res);
  let _respStatus = 200;
  let _respModel = '';
  res.json = function(data) {
    _respModel = data?.skynet?.router || data?.model || data?.skynet?.fallback || '';
    return _origJson(data);
  };

  try {
    // Logs endpoint (antes del routing normal)
    if (urlPath.startsWith('/v1/skynet/logs')) {
      const result = await handleLogs(req, res);
      _respStatus = 200;
      log({ endpoint: urlPath, method });
      return result;
    }

    if (urlPath === '/v1/skynet/chat' && method === 'POST') {
      const result = await handleRouter(req, res);
      _respStatus = 200;
      log({ endpoint: '/v1/skynet/chat', method, model: _respModel });
      return result;
    }
    if (urlPath === '/v1/skynet/chain' && method === 'POST') {
      const result = await handleChain(req, res);
      _respStatus = 200;
      log({ endpoint: '/v1/skynet/chain', method, model: _respModel || '' });
      return result;
    }
    if (urlPath === '/v1/skynet/scan' && (method === 'POST' || method === 'GET')) {
      const result = await handleScan(req, res);
      _respStatus = 200;
      log({ endpoint: '/v1/skynet/scan', method });
      return result;
    }
    if (urlPath === '/v1/skynet/memory' && method === 'GET') {
      const result = handleMemoryStats(req, res);
      _respStatus = 200;
      log({ endpoint: '/v1/skynet/memory', method });
      return result;
    }
    if (urlPath === '/v1/skynet/data' && (method === 'GET' || method === 'POST')) {
      const result = await handleDataHub(req, res);
      _respStatus = 200;
      log({ endpoint: '/v1/skynet/data', method });
      return result;
    }
    // ─── 7. SEE INTEGRATION ────────────────────────────────
    if (urlPath === '/v1/skynet/diagnose' && (method === 'GET' || method === 'POST')) {
      const result = await handleSeeDiagnose(req, res);
      _respStatus = 200;
      log({ endpoint: '/v1/skynet/diagnose', method });
      return result;
    }
    if (urlPath === '/v1/skynet/evolve' && method === 'POST') {
      const result = await handleSeeEvolve(req, res);
      _respStatus = 200;
      log({ endpoint: '/v1/skynet/evolve', method });
      return result;
    }
  } catch (e) {
    console.log(`[skynet] Error global: ${e.message}`);
    log({ endpoint: urlPath, method, status: 'error', error: e.message.slice(0, 200) });
    return json(res, 500, { error: { message: `Skynet error: ${e.message}`, type: 'skynet_error' } });
  }

  log({ endpoint: urlPath, method, status: '404' });
  return json(res, 404, { error: { message: 'Skynet endpoint not found', type: 'not_found' } });
};

// Export para testing/debug
module.exports.callModel = callModel;
module.exports.getConfig = getConfig;
