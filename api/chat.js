const fs = require('fs');

const CONFIG_PATH = '/tmp/proxy-config.json';

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
  "stepfun/step-3.7-flash:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openrouter/free"
];

const DEFAULT_CONFIG = {
  modelo1: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: KILO_MODELS[0], key: "", system_prompt: "" },
  modelo2: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: KILO_MODELS[1], key: "", system_prompt: "" },
  modelo3: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: KILO_MODELS[2], key: "", system_prompt: "" },
  modelo4: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: KILO_MODELS[3], key: "", system_prompt: "" },
  modelo5: { url: "https://image.pollinations.ai/prompt/", model: "pollinations-image", key: "", system_prompt: "" },
  modelo6: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: KILO_MODELS[4], key: "", system_prompt: "" },
  modelo7: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: KILO_MODELS[5], key: "", system_prompt: "" },
  modelo8: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: KILO_MODELS[6], key: "", system_prompt: "" }
};

function getConfig() {
  return DEFAULT_CONFIG;
}

function loadUsageDB() {
  try { return JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8')); } catch(e) { return { usages: [], stats: {} }; }
}

async function saveUsageDB(db) {
  try { fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(db, null, 2)); } catch(e) {}
  let token = process.env.GITHUB_TOKEN;
  if (!token) { console.log('GITHUB_TOKEN no configurado'); return; }
  try {
    const content = JSON.stringify(db, null, 2);
    const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
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
    
    const CONFIG = getConfig();
    const userModel = body.model;
    const cfg = CONFIG[userModel];
    
    // Modelo5: Generación de imágenes con Pollinations
    const useStream = body.stream === true;
    if (userModel === 'modelo5' && useStream) {
      try {
        const messages = body.messages || [];
        const lastMsg = messages[messages.length - 1];
        const prompt = lastMsg?.content || body.prompt || 'a beautiful sunset';
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const chunk1 = { id: "img-" + Date.now(), object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "modelo5", choices: [{ index: 0, delta: { role: "assistant" } }] };
        res.write(`data: ${JSON.stringify(chunk1)}\n\n`);
        
        const content = `Imagen generada: ${imageUrl}`;
        const chunk2 = { id: "img-" + Date.now(), object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "modelo5", choices: [{ index: 0, delta: { content: content } }] };
        res.write(`data: ${JSON.stringify(chunk2)}\n\n`);
        
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
    
    body.model = cfg.model;
    
    if (cfg.system_prompt) {
      const hasSystem = body.messages && body.messages.some(m => m.role === 'system');
      if (!hasSystem) {
        body.messages = [{ role: 'system', content: cfg.system_prompt }, ...(body.messages || [])];
      }
    }
    
    const headers = { 'Content-Type': 'application/json' };
    // Los tools se envían directamente al backend
    
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