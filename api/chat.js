const fs = require('fs');

const CONFIG_PATH = '/tmp/proxy-config.json';

const DEFAULT_CONFIG = {
  modelo1: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "openrouter/owl-alpha", key: "", system_prompt: "" },
  modelo2: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "poolside/laguna-xs.2-20260421:free", key: "", system_prompt: "" },
  modelo3: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "nvidia/nemotron-3-super-120b-a12b:free", key: "", system_prompt: "" },
  modelo4: { url: "https://api.zydit.in/v1/chat/completions", model: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1", key: "", system_prompt: "Eres un modelo de visión. Analiza las imágenes que te envíen y describe todo lo que ves con detalle en español." },
  modelo5: { url: "https://image.pollinations.ai/prompt/", model: "pollinations-image", key: "", system_prompt: "" },
  modelo6: { url: "https://api.zydit.in/v1/chat/completions", model: "moonshotai/kimi-k2.6", key: "", system_prompt: "" },
  modelo7: { url: "https://api.zydit.in/v1/chat/completions", model: "openai/gpt-oss-120b", key: "", system_prompt: "" },
  modelo8: { url: "https://api.zydit.in/v1/chat/completions", model: "qwen/qwen3.5-397b-a17b", key: "", system_prompt: "" }
};

async function getConfig() {
  // Intentar leer desde /tmp primero
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (cfg && Object.keys(cfg).length > 0) return cfg;
  } catch(e) {}
  
  // Intentar leer desde GitHub API como fallback
  try {
    const res = await fetch('https://api.github.com/repos/yeifer125/carbonato-proxy/contents/api/config.json');
    if (res.ok) {
      const data = await res.json();
      const cfg = JSON.parse(Buffer.from(data.content, 'base64').toString());
      if (cfg && Object.keys(cfg).length > 0) {
        // Guardar en /tmp para próximas peticiones
        try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg)); } catch(e) {}
        return cfg;
      }
    }
  } catch(e) {}
  
  return DEFAULT_CONFIG;
}

function loadUsageDB() {
  try { return JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8')); } catch(e) { return { usages: [], stats: {} }; }
}

async function saveUsageDB(db) {
  try { fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(db, null, 2)); } catch(e) {}
  // Obtener token de GitHub: primero env, luego archivo local
  let token = process.env.GITHUB_TOKEN;
  if (!token) { console.log('GITHUB_TOKEN no configurado'); return; }
  try {
    const content = JSON.stringify(db, null, 2);
    const apiUrl = 'https://api.github.com/repos/yeifer125/carbonato-proxy/contents/api/usage-db.json';
    const getRes = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}` } });
    if (!getRes.ok) { console.log('Error obteniendo archivo GitHub:', getRes.status); return; }
    const fileData = await getRes.json();
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Update usage stats', content: Buffer.from(content).toString('base64'), sha: fileData.sha })
    });
    if (!putRes.ok) { console.log('Error guardando en GitHub:', putRes.status); }
    else { console.log('Usage guardado en GitHub OK'); }
  } catch(e) { console.log('Error GitHub:', e.message); }
}

module.exports = async (req, res) => {
  const url = (req.url || '').split('?')[0];
  
  if (url.endsWith('/models') && req.method === 'GET') {
    return res.status(200).json({
      object: "list",
      data: [
        { id: "modelo1", object: "model", owned_by: "carbonato" },
        { id: "modelo2", object: "model", owned_by: "carbonato" },
        { id: "modelo3", object: "model", owned_by: "carbonato" },
        { id: "modelo4", object: "model", owned_by: "carbonato" },
        { id: "modelo5", object: "model", owned_by: "carbonato" },
        { id: "modelo6", object: "model", owned_by: "carbonato" },
        { id: "modelo7", object: "model", owned_by: "carbonato" },
        { id: "modelo8", object: "model", owned_by: "carbonato" }
      ]
    });
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
    
    const CONFIG = await getConfig();
    const userModel = body.model;
    const cfg = CONFIG[userModel];
    
  // Modelo5: Generación de imágenes con Pollinations
  // Soporte para streaming en modelo5
  const useStream = body.stream === true;
  if (userModel === 'modelo5' && useStream) {
  try {
  const messages = body.messages || [];
  const lastMsg = messages[messages.length - 1];
  const prompt = lastMsg?.content || body.prompt || 'a beautiful sunset';
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
  
  // Responder en formato stream compatible con OpenAI
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Chunk 1: Inicio
  const chunk1 = { id: "img-" + Date.now(), object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "modelo5", choices: [{ index: 0, delta: { role: "assistant" } }] };
  res.write(`data: ${JSON.stringify(chunk1)}\n\n`);
  
  // Chunk 2: Content
  const content = `Imagen generada: ${imageUrl}`;
  const chunk2 = { id: "img-" + Date.now(), object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "modelo5", choices: [{ index: 0, delta: { content: content } }] };
  res.write(`data: ${JSON.stringify(chunk2)}\n\n`);
  
  // Chunk 3: Fin
  const chunk3 = { id: "img-" + Date.now(), object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "modelo5", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
  res.write(`data: ${JSON.stringify(chunk3)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
  return;
  } catch(e) {
  return res.status(500).json({ error: { message: e.message } });
  }
  }
  
  if (userModel === 'modelo5') {
    try {
      const messages = body.messages || [];
      const lastMsg = messages[messages.length - 1];
      const prompt = lastMsg?.content || body.prompt || 'a beautiful sunset';
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
      
      // Registrar uso
      try {
        const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
        const db = loadUsageDB();
        db.usages.push({ model: userModel, ip: userIp, tokens: 1, timestamp: new Date().toISOString() });
        if (!db.stats[userModel]) db.stats[userModel] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
        db.stats[userModel].totalRequests += 1;
        if (db.stats[userModel].uniqueIPs && !db.stats[userModel].uniqueIPs.includes(userIp)) db.stats[userModel].uniqueIPs.push(userIp);
        if (db.usages.length > 1000) db.usages = db.usages.slice(-1000);
        db.stats[userModel].totalTokens += 1;
        await saveUsageDB(db);
      } catch(e) {}
      
      // Respuesta en formato OpenAI compatible con Hermes
      return res.status(200).json({
        id: "img-" + Date.now(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "modelo5",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Imagen generada: " + imageUrl
          },
          finish_reason: "stop"
        }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      });
    } catch(e) {
      return res.status(500).json({ error: { message: e.message } });
    }
  }
    
    if (!cfg) {
      return res.status(400).json({ error: { message: "Modelo no configurado: " + userModel, type: "invalid_request_error" }});
    }
    
    // Modelo4: Solo convertir content->text para Zydit, mantener formato array
    if (userModel === 'modelo4' && body.messages) {
      for (let i = 0; i < body.messages.length; i++) {
        const msg = body.messages[i];
        if (msg.content && Array.isArray(msg.content)) {
          for (let j = 0; j < msg.content.length; j++) {
            const part = msg.content[j];
            // Zydit espera "text" no "content" para el tipo text
            if (part.type === 'text' && part.content && !part.text) {
              part.text = part.content;
              delete part.content;
            }
          }
        }
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
  if (cfg.key) {
    headers['Authorization'] = 'Bearer ' + cfg.key;
  } else if (cfg.url.includes('zydit.in')) {
    // fallback to env vars for Zydit tokens (e.g., ZYDIT_TOKEN or MODEL6_KEY)
    const envKey = process.env.ZYDIT_TOKEN || process.env.MODELO6_KEY;
    if (envKey) headers['Authorization'] = 'Bearer ' + envKey;
  }
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