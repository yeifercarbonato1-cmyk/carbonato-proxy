#!/usr/bin/env node
// Auto-detect and update Kilo models - runs via cron

const fs = require('fs');

const KILO_MODELS = [
  "kilo-auto/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-m.1:free",
  "poolside/laguna-xs.2:free",
  "stepfun/step-3.7-flash:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemini-2.0-flash-exp:free",
  "openrouter/free"
];

(async () => {
  const workingModels = [];
  
  console.log(`[${new Date().toISOString()}] Checking Kilo models...`);
  
  for (const modelId of KILO_MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('https://api.kilo.ai/api/gateway/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 5
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      const data = await response.json();
      if (response.ok && !data.error) {
        workingModels.push(modelId);
        console.log(`[OK] ${modelId}`);
      } else {
        console.log(`[FAIL] ${modelId}: ${data.error || 'unknown error'}`);
      }
    } catch (e) {
      console.log(`[ERROR] ${modelId}: ${e.message}`);
    }
  }
  
  // Generate new config
  const newConfig = {};
  workingModels.forEach((model, i) => {
    newConfig[`modelo${i+1}`] = {
      url: "https://api.kilo.ai/api/gateway/chat/completions",
      model: model,
      key: "",
      system_prompt: (i === 0) ? "" : ""
    };
  });
  
  // Add modelo5 (pollinations)
  if (!newConfig.modelo5) {
    newConfig.modelo5 = {
      url: "https://image.pollinations.ai/prompt/",
      model: "pollinations-image",
      key: "",
      system_prompt: ""
    };
  }
  
  console.log(`\n[${new Date().toISOString()}] Working models: ${workingModels.length}/${KILO_MODELS.length}`);
  
  // Update local /tmp config
  try {
    fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(newConfig, null, 2));
    console.log('[OK] Local config updated');
  } catch(e) {
    console.log('[ERROR] Local config write failed:', e.message);
  }
  
  // Push to GitHub if token exists
  const token = process.env.GITHUB_TOKEN;
  if (token && workingModels.length > 0) {
    try {
      const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json';
      const getRes = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}` } });
      
      let fileData = {};
      let sha = '';
      if (getRes.ok) {
        fileData = await getRes.json();
        sha = fileData.sha || '';
      }
      
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Auto-update models - ${workingModels.length} working - ${new Date().toISOString()}`,
          content: Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64'),
          sha: sha
        })
      });
      
      if (putRes.ok) {
        console.log('[OK] GitHub config updated');
      } else {
        console.log('[ERROR] GitHub update failed:', putRes.status);
      }
    } catch(e) {
      console.log('[ERROR] GitHub:', e.message);
    }
  }
  
  process.exit(0);
})();