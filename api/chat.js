const fs = require('fs');
const path = require('path');

// Circuit breaker para modelo9 - persiste en /tmp
let circuitBreaker = { failures: {}, lastFailures: {} };
try {
  const cbData = fs.readFileSync('/tmp/model9-circuit.json', 'utf8');
  circuitBreaker = JSON.parse(cbData);
} catch(e) {}

function saveCircuitBreaker() {
  try {
    fs.writeFileSync('/tmp/model9-circuit.json', JSON.stringify(circuitBreaker));
  } catch(e) {}
}

function isCircuitOpen(modelKey) {
  const failures = circuitBreaker.failures[modelKey] || [];
  const now = Date.now();
  // Filtrar fallos de los últimos 30s
  const recent = failures.filter(t => now - t < 30000);
  circuitBreaker.failures[modelKey] = recent;
  saveCircuitBreaker();
  return recent.length >= 2;
}

function recordFailure(modelKey) {
  if (!circuitBreaker.failures[modelKey]) {
    circuitBreaker.failures[modelKey] = [];
  }
  circuitBreaker.failures[modelKey].push(Date.now());
  saveCircuitBreaker();
}

function recordSuccess(modelKey) {
  circuitBreaker.failures[modelKey] = [];
  saveCircuitBreaker();
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
// Rotación para modelo9 (modelos de texto/imagen)
const ROTATION_ORDER = ['modelo1', 'modelo2', 'modelo3', 'modelo4', 'modelo5', 'modelo6', 'modelo7', 'modelo8', 'modelo10', 'modelo11', 'modelo12', 'modelo13', 'modelo14', 'modelo15', 'modelo16'];

// ─── Config dinámico desde config.json ───
// Busca: /tmp/proxy-config.json (hot-reload desde admin) → config.json (deploy)
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
  } catch(e) {}
  try {
    const cfgPath = path.join(__dirname, 'config.json');
    return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch(e) {
    console.log('[config] Error leyendo config.json:', e.message);
    return {};
  }
}

// Rate limiter para GitHub writes - máx 1 cada 30s
let _lastGithubSync = 0;
function shouldSyncToGitHub() {
  const now = Date.now();
  if (now - _lastGithubSync < 30000) return false;
  _lastGithubSync = now;
  return true;
}

function loadUsageDB() {
  try { return JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8')); } catch(e) { return { usages: [], stats: {} }; }
}

async function saveUsageDB(localDb) {
  try { fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(localDb, null, 2)); } catch(e) {}
  if (!shouldSyncToGitHub()) return;
  let token = process.env.GITHUB_TOKEN;
  if (!token) { console.log('GITHUB_TOKEN no configurado'); return; }
  try {
    const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
    // 1. Fetch current data from GitHub (source of truth)
    let remoteDb = { usages: [], stats: {} };
    let sha = '';
    const getRes = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha || '';
      remoteDb = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
    } else if (getRes.status !== 404) {
      console.log('Error obteniendo archivo GitHub:', getRes.status);
      return;
    }
    // 2. MERGE: local + remote, dedup por timestamp+model+ip
    const mergedDb = { usages: [], stats: {} };
    const seen = new Set();
    for (const u of (remoteDb.usages || [])) {
      const k = u.timestamp + '|' + u.model + '|' + u.ip;
      if (!seen.has(k)) { seen.add(k); mergedDb.usages.push(u); }
    }
    for (const u of (localDb.usages || [])) {
      const k = u.timestamp + '|' + u.model + '|' + u.ip;
      if (!seen.has(k)) { seen.add(k); mergedDb.usages.push(u); }
    }
    // Rebuild stats desde merged usages
    for (const u of mergedDb.usages) {
      if (!mergedDb.stats[u.model]) mergedDb.stats[u.model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
      mergedDb.stats[u.model].totalTokens += u.tokens || 0;
      mergedDb.stats[u.model].totalRequests += 1;
      if (!mergedDb.stats[u.model].uniqueIPs.includes(u.ip)) mergedDb.stats[u.model].uniqueIPs.push(u.ip);
    }
    if (mergedDb.usages.length > 1000) mergedDb.usages = mergedDb.usages.slice(-1000);
    // 3. Write merged data a GitHub
    const content = JSON.stringify(mergedDb, null, 2);
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Update usage stats - ${mergedDb.usages.length} records`, content: Buffer.from(content).toString('base64'), sha })
    });
    if (!putRes.ok) { const e = await putRes.text(); console.log('Error guardando en GitHub:', putRes.status, e.substring(0,200)); }
    else { console.log('Usage guardado en GitHub OK -', mergedDb.usages.length, 'registros'); }
    // Actualizar /tmp con merged (refleja GitHub)
    try { fs.writeFileSync('/tmp/usage-db.json', content); } catch(e) {}
  } catch(e) { console.log('Error GitHub:', e.message); }
}

module.exports = async (req, res) => {
  const url = (req.url || '').split('?')[0];
  
  if (url.endsWith('/models') && req.method === 'GET') {
    const CONFIG = getConfig();
    const data = Object.keys(CONFIG).map(key => ({
      id: key,
      object: "model",
      owned_by: "carbonato",
      ...(key === 'modelo9' ? { description: "Smart Model Rotator - auto-failover entre todos los modelos" } : {}),
      ...(key === 'modelo11' ? { description: "DeepSeek V4 Flash via OpenCode Zen - gratuito e ilimitado" } : {}),
      ...(key === 'modelo12' ? { description: "MiniMax M3 via OpenCode Zen - gratuito e ilimitado" } : {}),
      ...(key === 'modelo13' ? { description: "OpenAI GPT OSS 120B via OpenRouter - key1" } : {}),
      ...(key === 'modelo14' ? { description: "Nvidia Nemotron Super 120B via OpenRouter - key2" } : {}),
      ...(key === 'modelo15' ? { description: "Google Gemma 4 31B via OpenRouter - key2" } : {}),
      ...(key === 'modelo16' ? { description: "Z.ai GLM 4.5 Air MoE via OpenRouter - key1" } : {})
    }));
    return res.status(200).json({ object: "list", data });
  }
  
  // Endpoint para generación de imágenes (compatible con OpenAI DALL-E)
  if (url.endsWith('/images/generations') && req.method === 'POST') {
    let body = {};
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) {
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch(e) {}
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
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch(e) {}
    }
    
    const CONFIG = getConfig();
    const userModel = body.model;
    const cfg = CONFIG[userModel];
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
      const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
      let lastError = null;
      let usedModel = null;
      
      // Orden dinámico: modelos más rápidos primero según health-db
      let rotatorOrder = ROTATION_ORDER;
      try {
        const hdb = JSON.parse(fs.readFileSync('/tmp/health-db.json', 'utf8'));
        const latencies = hdb.latencies || {};
        const withScore = ROTATION_ORDER.map(k => {
          const l = latencies[k] || { avg: 0, count: 0, fails: 0 };
          const score = l.count > 0 ? l.avg + (l.fails / Math.max(l.count, 1)) * 5000 : 99999;
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
        
        console.log(`[rotator] Probando ${modelKey} (${targetCfg.model})...`);
        
        try {
          const rotatorBody = { ...body, model: targetCfg.model };
          if (targetCfg.system_prompt) {
            const hasSystem = rotatorBody.messages && rotatorBody.messages.some(m => m.role === 'system');
            if (!hasSystem) {
              rotatorBody.messages = [{ role: 'system', content: targetCfg.system_prompt }, ...(rotatorBody.messages || [])];
            }
          }
          
          const upstreamRes = await fetch(targetCfg.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(targetCfg.key ? { 'Authorization': `Bearer ${resolveKey(targetCfg)}` } : {}) },
            body: JSON.stringify(rotatorBody),
            signal: AbortSignal.timeout(15000)
          });
          
          const resultText = await upstreamRes.text();
          
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
              try { tokens = JSON.parse(resultText).usage?.total_tokens || 0; } catch(e) {}
              const db = loadUsageDB();
              db.usages.push({ model: userModel, ip: userIp, tokens, timestamp: new Date().toISOString(), rotatorModel: modelKey });
              if (!db.stats[userModel]) db.stats[userModel] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
              db.stats[userModel].totalTokens += tokens;
              db.stats[userModel].totalRequests += 1;
              if (db.stats[userModel].uniqueIPs && !db.stats[userModel].uniqueIPs.includes(userIp)) db.stats[userModel].uniqueIPs.push(userIp);
              if (db.usages.length > 1000) db.usages = db.usages.slice(-1000);
              db.lastUpdated = new Date().toISOString();
              db.lastModel = userModel;
              db.lastTokens = tokens;
              await saveUsageDB(db);
            } catch(e) {}
            
            console.log(`[rotator] OK con ${modelKey}`);
            return res.status(upstreamRes.status).setHeader('Content-Type', 'application/json').send(resultText);
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
      body.model = cfg.model;
      body.stream = true;
      if (cfg.system_prompt) {
        const hasSystem = body.messages && body.messages.some(m => m.role === 'system');
        if (!hasSystem) {
          body.messages = [{ role: 'system', content: cfg.system_prompt }, ...(body.messages || [])];
        }
      }
      const headers = { 'Content-Type': 'application/json' };
      const resolvedKey = resolveKey(cfg);
      if (resolvedKey) headers['Authorization'] = `Bearer ${resolvedKey}`;
      try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 60000);
        const upstreamRes = await fetch(cfg.url, {
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
        for await (const chunk of upstreamRes.body) {
          res.write(chunk);
        }
        res.end();
        try {
          const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
          const db = loadUsageDB();
          db.usages.push({ model: userModel, ip: userIp, tokens: 0, timestamp: new Date().toISOString() });
          if (!db.stats[userModel]) db.stats[userModel] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
          db.stats[userModel].totalRequests += 1;
          if (db.stats[userModel].uniqueIPs && !db.stats[userModel].uniqueIPs.includes(userIp)) db.stats[userModel].uniqueIPs.push(userIp);
          if (db.usages.length > 1000) db.usages = db.usages.slice(-1000);
          db.lastUpdated = new Date().toISOString();
          db.lastModel = userModel;
          await saveUsageDB(db);
        } catch(e) { console.log('Error guardando uso streaming:', e.message); }
        return;
      } catch(e) {
        return res.status(502).json({ error: { message: e.message, type: "api_error" } });
      }
    }

    body.model = cfg.model;
    
    if (cfg.system_prompt) {
      const hasSystem = body.messages && body.messages.some(m => m.role === 'system');
      if (!hasSystem) {
        body.messages = [{ role: 'system', content: cfg.system_prompt }, ...(body.messages || [])];
      }
    }
    
    const headers = { 'Content-Type': 'application/json' };
    const resolvedKey = resolveKey(cfg);
    if (resolvedKey) headers['Authorization'] = `Bearer ${resolvedKey}`;
    
    try {
      const upstreamRes = await fetch(cfg.url, { method: 'POST', headers, body: JSON.stringify(body) });
      const result = await upstreamRes.text();
      
      // Registrar uso
      try {
        const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
        let tokens = 0;
        try { tokens = JSON.parse(result).usage?.total_tokens || 0; } catch(e) {}
        
        const db = loadUsageDB();
        db.usages.push({ model: userModel, ip: userIp, tokens, timestamp: new Date().toISOString() });
        if (!db.stats[userModel]) db.stats[userModel] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
        db.stats[userModel].totalTokens += tokens;
        db.stats[userModel].totalRequests += 1;
        if (db.stats[userModel].uniqueIPs && !db.stats[userModel].uniqueIPs.includes(userIp)) db.stats[userModel].uniqueIPs.push(userIp);
        if (db.usages.length > 1000) db.usages = db.usages.slice(-1000);
        db.lastUpdated = new Date().toISOString();
        db.lastModel = userModel;
        db.lastTokens = tokens;
        await saveUsageDB(db);
      } catch(e) { console.log('Error guardando uso:', e.message); }
      
      return res.status(upstreamRes.status).setHeader('Content-Type', 'application/json').send(result);
    } catch(e) {
      return res.status(502).json({ error: { message: e.message, type: "api_error" }});
    }
  }
  
  res.status(404).json({ error: "Not found" });
};