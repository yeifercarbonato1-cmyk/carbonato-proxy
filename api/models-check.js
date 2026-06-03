module.exports = async (req, res) => {
  // Kilo AI models to check
  const kiloModels = [
    "kilo-auto/free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "poolside/laguna-m.1:free",
    "poolside/laguna-xs.2:free",
    "stepfun/step-3.7-flash:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "google/gemini-2.0-flash-exp:free",
    "openrouter/free"
  ];

  const results = [];
  
  for (const modelId of kiloModels) {
    try {
      const response = await fetch('https://api.kilo.ai/api/gateway/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 5
        })
      });
      
      const data = await response.json();
      const working = response.ok && !data.error;
      
      results.push({
        model: modelId,
        status: working ? 'active' : 'error',
        response_time: Date.now(),
        error: data.error || null
      });
    } catch (e) {
      results.push({
        model: modelId,
        status: 'failed',
        error: e.message
      });
    }
  }

  const activeModels = results.filter(r => r.status === 'active').map(r => r.model);
  
  res.status(200).json({
    timestamp: new Date().toISOString(),
    total: results.length,
    active: activeModels.length,
    models: results,
    config_update: activeModels.length > 0 ? 
      activeModels.reduce((acc, m, i) => {
        acc[`modelo${i+1}`] = {
          url: "https://api.kilo.ai/api/gateway/chat/completions",
          model: m,
          key: "",
          system_prompt: ""
        };
        return acc;
      }, {}) : null
  });
};