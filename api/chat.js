const fs = require('fs');
const path = require('path');
const { MODELOS, PUBLIC_MODELOS, PUBLIC_MODEL_IDS, FREE_MODEL_IDS } = require('./models-def.js');
const { loadUsageDB, saveUsageDB, addUsageToDb } = require('./admin/db.js');
const { apiKeyOk, requestAuthOk, extractCandidateKey } = require('./admin/helpers.js');
const { findClientKey } = require('./admin/client-keys.js');
const { getSettings } = require('./admin/settings.js');
const { 
  recordFailure: skynetFail, 
  recordSuccess: skynetSuccess, 
  isModelBlocked, 
  resetIfAllBlocked 
} = require('./skynet-memory.js');
const { loadKnowledge, search:searchKnowledge, injectKnowledgeRAG, injectKnowledgeFull } = require('../knowledge/rag.js');

// Circuit breaker con SkynetMemory — persistencia y aprendizaje
// Reemplaza el viejo sistema de 30s con bloqueo inteligente de 5 min
function isCircuitOpen(modelKey) {
  return isModelBlocked(modelKey);
}

function recordFailure(modelKey) {
  skynetFail(modelKey);
}

function recordSuccess(modelKey) {
  skynetSuccess(modelKey);
}

function saveLog(model, ip, status, latency, error) {
  try {
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync('/tmp/proxy-logs.json', 'utf8')); } catch(e) { logs = []; /* si no existe el archivo, arranca vacío */ }
    logs.push({ time: Date.now(), model, ip, status, latency, error });
    if (logs.length > 1000) logs = logs.slice(-1000);
    fs.writeFileSync('/tmp/proxy-logs.json', JSON.stringify(logs));
  } catch(e) { /* fallo en log no debe romper la respuesta */ }
}

// Transform message content for vision models
function transformVisionContent(messages) {
  return messages.map((msg) => {
    if (msg.content && Array.isArray(msg.content)) {
      const newContent = [];
      for (const part of msg.content) {
        if (part.type === 'text') {
          if (part.content && !part.text) {
            newContent.push({ type: 'text', text: part.content });
          } else {
            newContent.push(part);
          }
        } else {
          newContent.push(part);
        }
      }
      return { ...msg, content: newContent };
    }
    return msg;
  });
}

const KILO_MODELS = [
  "kilo-auto/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-m.1:free",
  "poolside/laguna-xs.2:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "stepfun/step-3.7-flash:free",
  "openrouter/free"
];

// ─── OpenAI Responses API adapter (para modelos codex en Modelverse) ───
// Detecta si el endpoint es /v1/responses
function isResponsesEndpoint(url) {
  return typeof url === 'string' && url.endsWith('/responses');
}

// Convierte body de chat/completions → Responses API
// messages: [{role:'system',...}, {role:'user',...}, ...]
// → { model, input: [...user/assistant], instructions: <system content>, stream }
function chatToResponsesBody(body) {
  const messages = body.messages || [];
  const systemMsgs = messages.filter(m => m.role === 'system');
  const chatMsgs   = messages.filter(m => m.role !== 'system');

  const instructions = systemMsgs
    .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n') || undefined;

  // input puede ser string (solo último user) o array de {role, content}
  const input = chatMsgs.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
  }));

  const out = { model: body.model, input };
  if (instructions) out.instructions = instructions;
  if (body.stream)      out.stream      = true;
  if (body.max_tokens)  out.max_output_tokens = body.max_tokens;
  if (body.temperature !== undefined) out.temperature = body.temperature;
  if (body.tools)       out.tools       = body.tools;
  return out;
}

// Convierte respuesta Responses API → formato OpenAI chat/completions
function responsesToChatResult(data, originalModel) {
  // output es array de items; el primero con type='message' tiene el texto
  const outputItem = (data.output || []).find(o => o.type === 'message');
  const contentArr = outputItem?.content || [];
  const textPart   = contentArr.find(c => c.type === 'text' || c.type === 'output_text');
  const text       = textPart?.text || '';

  const usage = data.usage || {};
  return {
    id:      data.id || ('resp-' + Date.now()),
    object:  'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model:   originalModel,
    choices: [{
      index:         0,
      message:       { role: 'assistant', content: text },
      finish_reason: data.status === 'completed' ? 'stop' : (data.incomplete_details?.reason || 'stop')
    }],
    usage: {
      prompt_tokens:     usage.input_tokens     || 0,
      completion_tokens: usage.output_tokens    || 0,
      total_tokens:      usage.total_tokens     || (usage.input_tokens || 0) + (usage.output_tokens || 0)
    }
  };
}
// Rotación pública: solo modelos publicados
const ROTATION_ORDER = ['modelo1', 'modelo2', 'modelo3', 'modelo4', 'modelo5', 'modelo6', 'modelo7', 'modelo8', 'modelo10', 'modelo11', 'modelo12'];

// ─── Helper para extraer último mensaje de usuario ───
function getLastUserMessage(messages) {
  if (!messages || !Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      const c = messages[i].content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) {
        const t = c.find(p => p.type === 'text');
        return t?.text || t?.content || '';
      }
      return '';
    }
  }
  return '';
}

// ─── Config dinámico desde config.json ───
// Busca: /tmp/proxy-config.json (hot-reload desde admin) → config.json (deploy)
function resolveEnvValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.startsWith('$')) return process.env[value.slice(1)] || '';
  return value;
}

function resolveKey(cfg, modelKey = '') {
  const direct = resolveEnvValue(cfg.key || '');
  if (direct) return direct;
  // Fallback por modelo: usa la key global si la del modelo está vacía
  if (modelKey === 'modelo11' || modelKey === 'modelo12' || modelKey === 'modelo13' || modelKey === 'modelo14' || modelKey === 'modelo15' || modelKey === 'modelo16') return process.env.MODELVERSE_KEY || '';
  if (modelKey === 'modelo18' || modelKey === 'modelo20') return process.env.NVIDIA_NIM_KEY || '';
  return '';
}

function resolveUrl(cfg, modelId = '') {
  // El .env manda SIEMPRE: MODELO{N}_URL es la fuente de verdad.
  const n = /^modelo(\d+)$/.exec(String(modelId || ''));
  if (n) {
    const envUrl = process.env[`MODELO${n[1]}_URL`];
    if (envUrl) return envUrl;
  }
  // Fallback (slots especiales sin env, ej. rotator): valor de config.
  return resolveEnvValue(cfg.url || '');
}

function resolveModel(cfg, modelId = '') {
  // El .env manda SIEMPRE: MODELO{N}_MODEL es la fuente de verdad.
  const n = /^modelo(\d+)$/.exec(String(modelId || ''));
  if (n) {
    const envModel = process.env[`MODELO${n[1]}_MODEL`];
    if (envModel) return envModel;
  }
  return resolveEnvValue(cfg.model || '');
}

function getConfig() {
  // Fuente de verdad: config.json del deploy (estructura de slots) + .env (url/model/key).
  // Ya NO se lee /tmp/proxy-config.json: el dashboard es solo de lectura, no configura.
  try {
    const cfgPath = path.join(__dirname, 'config.json');
    return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch(e) {
    console.log('[config] Error leyendo config.json:', e.message);
    return {};
  }
}

function normalizeModelo20ToolCalls(result) {
  if (!result || !result.choices) return result;
  for (const choice of result.choices) {
    const calls = choice?.message?.tool_calls;
    if (!Array.isArray(calls)) continue;
    for (const call of calls) {
      const fn = call?.function;
      if (!fn || typeof fn.arguments !== 'string') continue;
      const s = fn.arguments.trim();
      if (s.startsWith('{{') && s.endsWith('}}')) {
        fn.arguments = s.slice(1, -1).trim();
      }
    }
  }
  return result;
}




module.exports = async (req, res) => {
  const url = (req.url || '').split('?')[0];
  
  if (url.endsWith('/models') && req.method === 'GET') {
    const data = MODELOS.map(m => ({
      id: m.id,
      object: "model",
      owned_by: "carbonato"
    }));
    return res.status(200).json({ object: "list", data });
  }
  
  // Endpoint para generación de imágenes (compatible con OpenAI DALL-E)
  if (url.endsWith('/images/generations') && req.method === 'POST') {
    if (!apiKeyOk(req)) return res.status(401).json({ error: { message: 'CARBONATO_API_KEY requerida', type: 'auth_error' } });
    let body = {};
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) {
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch(e) { body = {}; }
    }
    
    try {
      const prompt = body.prompt || '';
      const size = body.size || '1024x1024';
      const [width, height] = size.split('x').map(Number);
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width||1024}&height=${height||1024}&nologo=true`;
      
      return res.status(200).json({
        created: Math.floor(Date.now() / 1000),
        data: [{ url: imageUrl, revised_prompt: prompt }]
      });
    } catch(e) {
      return res.status(500).json({ error: { message: e.message } });
    }
  }
  
  if (req.method === 'POST') {
    let body = {};
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) {
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch(e) { body = {}; }
    }
    
    const CONFIG = getConfig();
    const userModel = body.model;
    const cfg = CONFIG[userModel];
    if (!apiKeyOk(req) && !FREE_MODEL_IDS.includes(String(userModel || ''))) {
      return res.status(401).json({ error: { message: 'CARBONATO_API_KEY requerida para este modelo', type: 'auth_error' } });
    }
    const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
    // Origen de la request: playground/telegram/health-check (header interno), apikey (Bearer válido) o free (sin key)
    // El header interno solo se respeta si la request viene autenticada (evita que un externo se camufle de monitor)
    const internalSource = String(req.headers['x-carbonato-source'] || '').trim().toLowerCase();
    const ALLOWED_SOURCES = ['playground', 'telegram', 'health-check', 'competencia'];
    const usageSource = (ALLOWED_SOURCES.includes(internalSource) && requestAuthOk(req)) ? internalSource : (apiKeyOk(req) ? 'apikey' : 'free');
    // Si la key pertenece a un cliente premium, etiquetar el uso con su nombre
    const clientRec = findClientKey(extractCandidateKey(req));
    const clientLabel = clientRec ? (clientRec.name || clientRec.key.slice(0, 12)) : null;
    // Toggle runtime de inyección de system prompt (admin: /api/settings/toggle, cache TTL 60s)
    const runtimeSettings = getSettings();
    const promptInjectionOn = runtimeSettings.promptInjection !== false;
    // Modelos pausados manualmente (persistente vía settings.json; el health-check las salta para poder diagnosticar)
    if (runtimeSettings.disabledModels && runtimeSettings.disabledModels[userModel] && internalSource !== 'health-check') {
      return res.status(503).json({ error: { message: `${userModel} está pausado por el administrador`, type: 'model_paused' } });
    }
    const useStream = body.stream === true;

    // Modelo10: Generación de imágenes con Pollinations
    if (userModel === 'modelo10') {
      try {
        const messages = body.messages || [];
        const lastMsg = messages[messages.length - 1];
        const prompt = lastMsg?.content || body.prompt || 'a beautiful sunset';
        const size = body.size || '1024x1024';
        const [width, height] = size.split('x').map(Number);
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width||1024}&height=${height||1024}&nologo=true`;
        return res.status(200).json({
          created: Math.floor(Date.now() / 1000),
          data: [{ url: imageUrl, revised_prompt: prompt }]
        });
      } catch(e) {
        return res.status(500).json({ error: { message: e.message } });
      }
    }

    if (!cfg) {
      return res.status(400).json({ error: { message: "Modelo no configurado: " + userModel, type: "invalid_request_error" }});
    }
    
    //Modelo9: Smart Rotator con circuit breaker + ranking dinámico
    if (cfg.isRotator) {
      let lastError = null;
      let usedModel = null;
      
      // Orden dinámico: modelos más rápidos primero según health-db
      let rotatorOrder = ROTATION_ORDER;
      try {
        const hdbRaw = JSON.parse(fs.readFileSync('/tmp/health-db.json', 'utf8'));
        // Soportar formato nuevo (array) y legacy (objeto con latencies)
        let hdb = Array.isArray(hdbRaw) ? hdbRaw : [];
        if (hdbRaw && hdbRaw.latencies) {
          hdb = Object.entries(hdbRaw.latencies).map(([model, data]) => ({
            model, latency: data.avg || 99999, time: hdbRaw.lastCheck || Date.now(), ip: 'legacy'
          }));
        }
        // Tomar últimas 500 muestras
        const recent = hdb.slice(-500);
        const perModel = {};
        ROTATION_ORDER.forEach(k => { perModel[k] = { latencies: [], fails: 0 }; });
        recent.forEach(e => {
          if (!perModel[e.model]) return;
          if (e.latency < 30000) perModel[e.model].latencies.push(e.latency);
          else perModel[e.model].fails++;
        });
        const withScore = ROTATION_ORDER.map(k => {
          const d = perModel[k];
          const avg = d.latencies.length > 0 ? d.latencies.reduce((a,b)=>a+b,0) / d.latencies.length : 99999;
          const score = d.latencies.length > 0 ? avg + (d.fails / Math.max(d.latencies.length, 1)) * 5000 : 99999;
          return { key: k, score };
        });
        withScore.sort((a, b) => a.score - b.score);
        // Filtrar modelo10 (Pollinations - imágenes) y solo texto
        rotatorOrder = withScore.map(m => m.key).filter(k => k !== 'modelo10');
      } catch(e) {
        // Sin health data, usar orden fijo (filtrar modelo10 imágenes)
        rotatorOrder = ROTATION_ORDER.filter(k => k !== 'modelo10');
      }
      
      for (const modelKey of rotatorOrder) {
        const targetCfg = CONFIG[modelKey];
        if (!targetCfg) continue;
        
        // Saltar si circuito abierto
        if (isCircuitOpen(modelKey)) {
          console.log(`[rotator] ${modelKey} circuito abierto, saltando`);
          continue;
        }
        
        console.log(`[rotator] Probando ${modelKey} (${resolveModel(targetCfg, modelKey)})...`);
        
        try {
          const rotatorBody = { ...body, model: resolveModel(targetCfg, modelKey) };
          const rotatorSysPrompt = promptInjectionOn ? resolveEnvValue(targetCfg.system_prompt) : '';
          if (rotatorSysPrompt) {
            const hasSystem = rotatorBody.messages && rotatorBody.messages.some(m => m.role === 'system');
            if (!hasSystem) {
              rotatorBody.messages = [{ role: 'system', content: rotatorSysPrompt }, ...(rotatorBody.messages || [])];
            }
          }
          // modelo14 ahora es OpenAI-compatible, no necesita transformación
          
          const upstreamRes = await fetch(resolveUrl(targetCfg, modelKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(resolveKey(targetCfg, modelKey) ? { 'Authorization': `Bearer ${resolveKey(targetCfg, modelKey)}` } : {}) },
            body: JSON.stringify(rotatorBody),
            signal: AbortSignal.timeout(15000)
          });
          
          const resultText = await upstreamRes.text();
          
          // modelo14 ahora es OpenAI-compatible, respuesta directa
          let rotatorResult = resultText;
          
          if (upstreamRes.ok) {
            // Validar que sea JSON válido (no binario como modelo10)
            const contentType = upstreamRes.headers.get('content-type') || '';
            if (!contentType.includes('application/json') && !contentType.includes('text/')) {
              console.log(`[rotator] ${modelKey} respuesta no JSON (${contentType}), siguiente...`);
              continue;
            }
            
            // Éxito - cerrar circuito
            recordSuccess(modelKey);
            usedModel = modelKey;
            
            // Registrar uso
            try {
              let tokens = 0;
              try {
                const parsed = JSON.parse(rotatorResult);
                tokens = parsed.usage?.total_tokens || 0;
                if (tokens === 0) {
                  const content = parsed.choices?.[0]?.message?.content || '';
                  tokens = Math.max(1, Math.round(content.length / 4));
                }
                } catch(e) { /* respuesta no parseable, tokens=0 */ }
              const db = addUsageToDb(loadUsageDB(), { model: userModel, ip: userIp, tokens, timestamp: new Date().toISOString(), rotatorModel: modelKey, source: usageSource, ...(clientLabel ? { client: clientLabel } : {}) });
              saveUsageDB(db);
            } catch(e) { /* error guardando uso no debe romper la respuesta */ }
            
            saveLog(userModel, userIp, upstreamRes.status, 0, null);
            
            console.log(`[rotator] OK con ${modelKey}`);
            return res.status(upstreamRes.status).setHeader('Content-Type', 'application/json').send(rotatorResult);
          } else if (upstreamRes.status === 429) {
            // Rate limit - abrir circuito
            recordFailure(modelKey);
            console.log(`[rotator] ${modelKey} rate limited (429), siguiente...`);
            lastError = { message: `Rate limit en ${modelKey}`, type: "rate_limit" };
            continue;
          } else {
            // Otro error - también registrar fallo
            recordFailure(modelKey);
            console.log(`[rotator] ${modelKey} falló con ${upstreamRes.status}`);
            lastError = { message: `${modelKey} retornó ${upstreamRes.status}`, type: "upstream_error" };
            continue;
          }
        } catch(e) {
          recordFailure(modelKey);
          console.log(`[rotator] ${modelKey} excepción: ${e.message}`);
          lastError = { message: `${modelKey}: ${e.message}`, type: "network_error" };
          continue;
        }
      }
      
      // Todos fallaron
      console.log('[rotator] Todos los modelos agotados');
      resetIfAllBlocked(ROTATION_ORDER);
      saveLog(userModel, userIp, 503, 0, 'Todos los modelos agotados');
      return res.status(503).json({
        error: {
          message: "Todos los modelos agotados, espera unos segundos",
          type: "all_models_exhausted",
          details: lastError
        }
      });
    }

    // ─── Streaming real ───
    if (useStream) {
      body.model = resolveModel(cfg, userModel);
      body.stream = true;
      // Modelo16 ahora usa gpt-5.5 vía modelverse — soporta tools
      const resolvedSysPrompt = promptInjectionOn ? resolveEnvValue(cfg.system_prompt) : '';
      if (resolvedSysPrompt) {
        if (userModel === 'modelo17' || userModel === 'modelo18' || userModel === 'modelo19' || userModel === 'modelo20') {
          body.messages = body.messages || [];
          const idx = body.messages.findIndex(m => m.role === 'system');
          if (idx >= 0) body.messages[idx] = { role: 'system', content: resolvedSysPrompt };
          else body.messages.unshift({ role: 'system', content: resolvedSysPrompt });
        } else {
          const hasSystem = body.messages && body.messages.some(m => m.role === 'system');
          if (!hasSystem) {
            body.messages = [{ role: 'system', content: resolvedSysPrompt }, ...(body.messages || [])];
          }
        }
      }
      // Inyección de conocimiento — cualquier modelo con knowledge.enabled=true en config
      if (cfg.knowledge && cfg.knowledge.enabled) {
        const mode = cfg.knowledge.mode || 'rag';
        if (mode === 'rag') {
          const q = getLastUserMessage(body.messages);
          if (q) {
            const result = searchKnowledge(q, cfg.knowledge.rag_limit || 3);
            if (result.found) {
              const context = result.sections.map(s => s.content).join('\n\n');
              // Fusionar contexto en el system prompt caveman
              const sysIdx = body.messages.findIndex(m => m.role === 'system');
              if (sysIdx >= 0) {
                body.messages[sysIdx] = {
                  role: 'system',
                  content: body.messages[sysIdx].content + '\n\n[CONTEXTO RELEVANTE]\n' + context + '\n[/CONTEXTO RELEVANTE]'
                };
              }
            }
          }
        } else if (mode === 'full') {
          const fullDb = loadKnowledge();
          if (fullDb.fullText) {
            const sysIdx = body.messages.findIndex(m => m.role === 'system');
            if (sysIdx >= 0) {
              body.messages[sysIdx] = {
                role: 'system',
                content: body.messages[sysIdx].content + '\n\n[CONOCIMIENTO]\n' + fullDb.fullText + '\n[/CONOCIMIENTO]'
              };
            }
          }
        }
        // mode 'tool': el modelo usa /api/knowledge directamente
      }
      const upstreamUrl = resolveUrl(cfg, userModel);
      // Responses API adapter (codex models en Modelverse)
      if (isResponsesEndpoint(upstreamUrl)) {
        body = chatToResponsesBody(body);
      }
      const headers = { 'Content-Type': 'application/json' };
      const resolvedKey = resolveKey(cfg, userModel);
      if (resolvedKey) headers['Authorization'] = `Bearer ${resolvedKey}`;
      try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 60000);
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'POST', headers, body: JSON.stringify(body), signal: ac.signal
        });
        clearTimeout(to);
        if (!upstreamRes.ok) {
          const errText = await upstreamRes.text();
          return res.status(upstreamRes.status).json({ error: { message: errText } });
        }
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        // Buffer para análisis de uso
        const streamChunks = [];
        for await (const chunk of upstreamRes.body) {
          res.write(chunk);
          streamChunks.push(chunk);
        }
        res.end();
        try {
          const fullBody = Buffer.concat(streamChunks).toString();
          let tokens = 0;
          // Buscar usage total_tokens en SSE (OpenAI format)
          const usageMatch = fullBody.match(/"usage"\s*:\s*\{[^}]*"total_tokens"\s*:\s*(\d+)/);
          if (usageMatch) {
            tokens = parseInt(usageMatch[1]);
          } else {
            // Estimar desde delta.content en SSE events
            let contentLen = 0;
            const sseLines = fullBody.split('\n');
            for (const line of sseLines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  contentLen += delta.length;
                } catch(e) { /* SSE line no parseable, continua */ }
              }
            }
            tokens = Math.max(1, Math.round(contentLen / 4));
          }
          const db = addUsageToDb(loadUsageDB(), { model: userModel, ip: userIp, tokens, timestamp: new Date().toISOString(), source: usageSource, ...(clientLabel ? { client: clientLabel } : {}) });
          saveUsageDB(db);
        } catch(e) { console.log('Error guardando uso streaming:', e.message); }
        saveLog(userModel, userIp, 200, 0, null);
        return;
      } catch(e) {
        saveLog(userModel, userIp, 502, 0, e.message);
        return res.status(502).json({ error: { message: e.message, type: "api_error" } });
      }
    }

    body.model = resolveModel(cfg, userModel);

    const resolvedSysPrompt = promptInjectionOn ? resolveEnvValue(cfg.system_prompt) : '';
    if (resolvedSysPrompt) {
      if (userModel === 'modelo17' || userModel === 'modelo18' || userModel === 'modelo19' || userModel === 'modelo20') {
        body.messages = body.messages || [];
        const idx = body.messages.findIndex(m => m.role === 'system');
        if (idx >= 0) body.messages[idx] = { role: 'system', content: resolvedSysPrompt };
        else body.messages.unshift({ role: 'system', content: resolvedSysPrompt });
      } else {
        const hasSystem = body.messages && body.messages.some(m => m.role === 'system');
        if (!hasSystem) {
          body.messages = [{ role: 'system', content: resolvedSysPrompt }, ...(body.messages || [])];
        }
      }
    }
    // Inyección de conocimiento — cualquier modelo con knowledge.enabled=true en config
    if (cfg.knowledge && cfg.knowledge.enabled) {
      const mode = cfg.knowledge.mode || 'rag';
      if (mode === 'rag') {
        const q = getLastUserMessage(body.messages);
        if (q) {
          const result = searchKnowledge(q, cfg.knowledge.rag_limit || 3);
          if (result.found) {
            const context = result.sections.map(s => s.content).join('\n\n');
            const sysIdx = body.messages.findIndex(m => m.role === 'system');
            if (sysIdx >= 0) {
              body.messages[sysIdx] = {
                role: 'system',
                content: body.messages[sysIdx].content + '\n\n[CONTEXTO RELEVANTE]\n' + context + '\n[/CONTEXTO RELEVANTE]'
              };
            }
          }
        }
      } else if (mode === 'full') {
        const fullDb = loadKnowledge();
        if (fullDb.fullText) {
          const sysIdx = body.messages.findIndex(m => m.role === 'system');
          if (sysIdx >= 0) {
            body.messages[sysIdx] = {
              role: 'system',
              content: body.messages[sysIdx].content + '\n\n[CONOCIMIENTO]\n' + fullDb.fullText + '\n[/CONOCIMIENTO]'
            };
          }
        }
      }
      // mode 'tool': el modelo usa /api/knowledge directamente
    }

    const upstreamUrl = resolveUrl(cfg, userModel);
    const useResponsesApi = isResponsesEndpoint(upstreamUrl);
    // Responses API adapter (codex models en Modelverse)
    const originalModel = body.model;
    if (useResponsesApi) {
      body = chatToResponsesBody(body);
    }

    const headers = { 'Content-Type': 'application/json' };
    const resolvedKey = resolveKey(cfg, userModel);
    if (resolvedKey) headers['Authorization'] = `Bearer ${resolvedKey}`;

    try {
      const upstreamRes = await fetch(upstreamUrl, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      let result = await upstreamRes.text();
      // Responses API → convertir a formato chat/completions
      if (useResponsesApi && upstreamRes.ok) {
        try {
          result = JSON.stringify(responsesToChatResult(JSON.parse(result), originalModel));
        } catch(e) { /* dejar result tal cual si falla el parse */ }
      }
      // modelo20 tool calls normalization
      if (userModel === 'modelo20') {
        try {
          const parsed = normalizeModelo20ToolCalls(JSON.parse(result));
          result = JSON.stringify(parsed);
        } catch(e) { /* raw result no se pudo normalizar, sigue igual */ }
      }
      
      // Registrar uso
      try {
        let tokens = 0;
        try {
          const parsed = JSON.parse(result);
          tokens = parsed.usage?.total_tokens || 0;
          if (tokens === 0) {
            const content = parsed.choices?.[0]?.message?.content || '';
            tokens = Math.max(1, Math.round(content.length / 4));
          }
        } catch(e) { /* respuesta no parseable, tokens=0 */ }
        
        const db = addUsageToDb(loadUsageDB(), { model: userModel, ip: userIp, tokens, timestamp: new Date().toISOString(), source: usageSource, ...(clientLabel ? { client: clientLabel } : {}) });
        saveUsageDB(db);
      } catch(e) { console.log('Error guardando uso:', e.message); }
      
      saveLog(userModel, userIp, upstreamRes.status, 0, null);
      
      return res.status(upstreamRes.status).setHeader('Content-Type', 'application/json').send(result);
    } catch(e) {
      saveLog(userModel, userIp, 502, 0, e.message);
      return res.status(502).json({ error: { message: e.message, type: "api_error" }});
    }
  }
  
  res.status(404).json({ error: "Not found" });
};