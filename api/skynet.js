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
  getActivity
} = require('./skynet-memory.js');

// ─── Helpers ─────────────────────────────────────────────

function resolveKey(cfg) {
  if (!cfg.key) return '';
  if (cfg.key === '$OR_KEY1') return process.env.OR_KEY1 || '';
  if (cfg.key === '$OR_KEY2') return process.env.OR_KEY2 || '';
  return cfg.key;
}

function getConfig() {
  try {
    const tmp = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8'));
    if (tmp && typeof tmp === 'object' && Object.keys(tmp).length > 0) return tmp;
  } catch (e) {}
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
  const body = {
    model: cfg.model,
    messages,
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
    .filter(m => m.id !== 'modelo9') // excluir rotador
    .map(m => {
      let extra = '';
      if (m.id === 'modelo4') extra = ' — MEJOR PARA VELOCIDAD, saludos, consultas simples';
      else if (m.id === 'modelo2') extra = ' — MEJOR PARA razonamiento profundo, análisis, código complejo';
      else if (m.id === 'modelo7') extra = ' — MEJOR PARA problemas masivos, matemáticas, investigación';
      else if (m.id === 'modelo5') extra = ' — MEJOR PARA imágenes, visión multimodal';
      else if (m.id === 'modelo10') extra = ' — SOLO para generar imágenes';
      else if (m.id === 'modelo11') extra = ' — tool calling, funciones, JSON estructurado';
      else if (m.id === 'modelo1') extra = ' — buena opción genérica';
      else if (m.id === 'modelo6') extra = ' — rápido y preciso, buen balance';
      else if (m.id === 'modelo3') extra = ' — equilibrio velocidad/calidad';
      return `${m.id}: ${m.desc}${extra}`;
    }).join('\n');

  return `Eres SKYNET ROUTER, el núcleo de inteligencia de una red de IA autónoma.

Tu función: analizar el mensaje del usuario y elegir el modelo ÓPTIMO para responder.

MODELOS DISPONIBLES:
${descriptions}

INSTRUCCIONES:
- Analiza el contenido, la complejidad y la intención del mensaje.
- Si el mensaje pide EXPLÍCITAMENTE crear una imagen, elige modelo10.
- Si el mensaje contiene una imagen (data:image o URL de imagen), elige modelo5.
- Para preguntas simples, saludos, charla casual → modelo4 (más rápido).
- Para código, análisis, razonamiento → modelo2 o modelo7 según profundidad.
- Para tool calling o JSON estructurado → modelo11.
- Para el resto → modelo1 (balanceado).

Responde ÚNICAMENTE con el ID del modelo en este formato exacto:
{"model":"modeloX","reason":"razón breve"}

Nada más. Solo el JSON.`;
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

      // Agregar output al contexto para el siguiente modelo
      accumulatedMessages = [
        ...accumulatedMessages,
        { role: 'assistant', content: result.content },
        { role: 'user', content: `Continúa desde donde quedó el modelo anterior. Mejora, refina o completa lo que dijo. No repitas, solo construye sobre ello.` }
      ];

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

// ─── 3. SCANNER ──────────────────────────────────────────

async function handleScan(req, res) {
  const CONFIG = getConfig();
  const results = [];

  for (const model of MODELOS) {
    const cfg = CONFIG[model.id];
    if (!cfg || cfg.isRotator) {
      results.push({ id: model.id, status: 'skipped', reason: !cfg ? 'no config' : 'rotator' });
      continue;
    }

    const t0 = Date.now();
    try {
      const r = await callModel(model.id, [{ role: 'user', content: 'ping' }], {
        max_tokens: 1,
        timeout: 10000
      });
      const latency = Date.now() - t0;
      results.push({
        id: model.id,
        status: 'online',
        latency,
        tokens: r.raw?.usage?.total_tokens || 0
      });
      memSuccess(model.id);
    } catch (e) {
      const latency = Date.now() - t0;
      results.push({
        id: model.id,
        status: 'offline',
        latency,
        error: e.message.slice(0, 100)
      });
      memFail(model.id);
    }
  }

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
  const CONFIG = getConfig();
  const memoryStats = getMemoryStats();
  
  // Scan con timeout más corto para el dashboard
  const scanResults = [];
  for (const model of MODELOS) {
    const cfg = CONFIG[model.id];
    if (!cfg || cfg.isRotator) {
      scanResults.push({ id: model.id, status: 'skipped', reason: !cfg ? 'no config' : 'rotator' });
      continue;
    }
    const t0 = Date.now();
    try {
      await callModel(model.id, [{ role: 'user', content: 'ping' }], { max_tokens: 1, timeout: 5000 });
      scanResults.push({ id: model.id, status: 'online', latency: Date.now() - t0 });
    } catch (e) {
      scanResults.push({ id: model.id, status: 'offline', latency: Date.now() - t0, error: e.message.slice(0, 80) });
    }
  }

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

// ─── Router principal ────────────────────────────────────

module.exports = async (req, res) => {
  const url = (req.url || '').split('?')[0];
  const method = req.method;

  // CORS headers básicos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (url === '/v1/skynet/chat' && method === 'POST') {
      return await handleRouter(req, res);
    }
    if (url === '/v1/skynet/chain' && method === 'POST') {
      return await handleChain(req, res);
    }
    if (url === '/v1/skynet/scan' && (method === 'POST' || method === 'GET')) {
      return await handleScan(req, res);
    }
    if (url === '/v1/skynet/memory' && method === 'GET') {
      return handleMemoryStats(req, res);
    }
    if (url === '/v1/skynet/data' && (method === 'GET' || method === 'POST')) {
      return await handleDataHub(req, res);
    }
  } catch (e) {
    console.log(`[skynet] Error global: ${e.message}`);
    return json(res, 500, { error: { message: `Skynet error: ${e.message}`, type: 'skynet_error' } });
  }

  return json(res, 404, { error: { message: 'Skynet endpoint not found', type: 'not_found' } });
};

// Export para testing/debug
module.exports.callModel = callModel;
module.exports.getConfig = getConfig;
