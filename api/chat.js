const fs = require('fs');

const CONFIG_PATH = '/tmp/proxy-config.json';

const DEFAULT_CONFIG = {
  modelo1: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "openrouter/owl-alpha", key: "", system_prompt: "" },
  modelo2: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "poolside/laguna-xs.2-20260421:free", key: "", system_prompt: "" },
  modelo3: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "nvidia/nemotron-3-super-120b-a12b:free", key: "", system_prompt: "" },
  modelo4: { url: "https://api.zydit.in/v1/chat/completions", model: "meta/llama-3.2-11b-vision-instruct", key: "zyd_live_n1n4mk4CM8Ty_oK9yIaZH85zg-g9YNN1_3yNLbkDzvg", system_prompt: "Eres un modelo de visión. Analiza las imágenes se te envíen y describe todo lo que ves con detalle." }
};

async function getConfig() {
  // Intentar leer desde /tmp primero
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (cfg && Object.keys(cfg).length > 0) return cfg;
  } catch(e) {}
  
  // Intentar leer desde GitHub API como fallback
  try {
    const res = await fetch('https://api.github.com/repos/yeifer125/carbonato.llm/contents/api/config.json');
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
  // Intentar guardar en GitHub
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    try {
      const content = JSON.stringify(db, null, 2);
      const apiUrl = 'https://api.github.com/repos/yeifer125/carbonato.llm/contents/api/usage-db.json';
      const getRes = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}` } });
      const fileData = await getRes.json();
      await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Update usage stats', content: Buffer.from(content).toString('base64'), sha: fileData.sha })
      });
    } catch(e) {}
  }
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
        { id: "modelo5", object: "model", owned_by: "carbonato" }
      ]
    });
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
        
        // Respuesta en formato compatible con OpenAI
        return res.status(200).json({
          created: Math.floor(Date.now() / 1000),
          data: [{ url: imageUrl }],
          model: 'modelo5'
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
    if (cfg.key) headers['Authorization'] = 'Bearer ' + cfg.key;
    
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
        if (!db.stats[userModel].uniqueIPs.includes(userIp)) db.stats[userModel].uniqueIPs.push(userIp);
        if (db.usages.length > 1000) db.usages = db.usages.slice(-1000);
        await saveUsageDB(db);
      } catch(e) {}
      
      return res.status(upstreamRes.status).setHeader('Content-Type', 'application/json').send(result);
    } catch(e) {
      return res.status(502).json({ error: { message: e.message, type: "api_error" }});
    }
  }
  
  res.status(404).json({ error: "Not found" });
};