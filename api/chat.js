const fs = require('fs');
const path = require('path');
const { MODELOS } = require('./models-def.js');
const { loadUsageDB, saveUsageDB } = require('./admin/db.js');
const { 
  recordFailure: skynetFail, 
  recordSuccess: skynetSuccess, 
  isModelBlocked, 
  resetIfAllBlocked 
} = require('./skynet-memory.js');

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
    try { logs = JSON.parse(fs.readFileSync('/tmp/proxy-logs.json', 'utf8')); } catch(e) { logs = []; }
    logs.push({ time: Date.now(), model, ip, status, latency, error });
    if (logs.length > 1000) logs = logs.slice(-1000);
    fs.writeFileSync('/tmp/proxy-logs.json', JSON.stringify(logs));
  } catch(e) {
      console.log('[see:fix] catch en línea 33:', e.message);
      console.log('[see:fix] catch en línea 33:', e.message);
      console.log('[see:fix] catch en línea 33:', e.message);
      console.log('[see:fix] catch en línea 33:', e.message);
      console.log('[see:fix] catch en línea 33:', e.message);
      console.log('[see:fix] catch en línea 33:', e.message);
      console.log('[see:fix] catch en línea 33:', e.message);
      console.log('[see:fix] catch en línea 33:', e.message);}
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



module.exports = async (req, res) => {
  const url = (req.url || '').split('?')[0];
  
  if (url.endsWith('/models') && req.method === 'GET') {
    const data = MODELOS.map(m => ({
      id: m.id,
      object: "model",
      owned_by: "carbonato",
      description: m.desc
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
              try {
                const parsed = JSON.parse(resultText);
                tokens = parsed.usage?.total_tokens || 0;
                if (tokens === 0) {
                  const content = parsed.choices?.[0]?.message?.content || '';
                  tokens = Math.max(1, Math.round(content.length / 4));
                }
              } catch(e) {}
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
            
            saveLog(userModel, userIp, upstreamRes.status, 0, null);
            
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
      const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
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
                } catch(e) {}
              }
            }
            tokens = Math.max(1, Math.round(contentLen / 4));
          }
          const db = loadUsageDB();
          db.usages.push({ model: userModel, ip: userIp, tokens, timestamp: new Date().toISOString() });
          if (!db.stats[userModel]) db.stats[userModel] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
          db.stats[userModel].totalRequests += 1;
          if (db.stats[userModel].uniqueIPs && !db.stats[userModel].uniqueIPs.includes(userIp)) db.stats[userModel].uniqueIPs.push(userIp);
          if (db.usages.length > 1000) db.usages = db.usages.slice(-1000);
          db.lastUpdated = new Date().toISOString();
          db.lastModel = userModel;
          await saveUsageDB(db);
        } catch(e) { console.log('Error guardando uso streaming:', e.message); }
        saveLog(userModel, userIp, 200, 0, null);
        return;
      } catch(e) {
        saveLog(userModel, userIp, 502, 0, e.message);
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
    
    const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
    try {
      const upstreamRes = await fetch(cfg.url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const result = await upstreamRes.text();
      
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
        } catch(e) {}
        
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
      
      saveLog(userModel, userIp, upstreamRes.status, 0, null);
      
      return res.status(upstreamRes.status).setHeader('Content-Type', 'application/json').send(result);
    } catch(e) {
      saveLog(userModel, userIp, 502, 0, e.message);
      return res.status(502).json({ error: { message: e.message, type: "api_error" }});
    }
  }
  
  res.status(404).json({ error: "Not found" });
};