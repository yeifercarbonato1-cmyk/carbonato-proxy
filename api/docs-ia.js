module.exports = async (req, res) => {
  const url = (req.url || '').split('?')[0];
  
  // Endpoint oculto: solo devuelve JSON para IA
  if (url === '/api/docs-ia' && req.method === 'GET') {
    return res.setHeader('Content-Type', 'application/json').status(200).json({
      api_base: "https://carbonato-proxy.vercel.app",
      endpoint: "/chat/completions",
      models: {
        modelo1: { id: "kilo-auto/free", free: true, provider: "kilo", description: "Auto-selection best model" },
        modelo2: { id: "nvidia/nemotron-3-super-120b-a12b:free", free: true, provider: "kilo", description: "120B reasoning" },
        modelo3: { id: "poolside/laguna-m.1:free", free: true, provider: "kilo", description: "Laguna M.1 balanced" },
        modelo4: { id: "poolside/laguna-xs.2:free", free: true, provider: "kilo", description: "Laguna XS.2 speed" },
        modelo5: { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true, provider: "kilo", description: "Multimodal (text+image)", image_gen: true },
        modelo6: { id: "stepfun/step-3.7-flash:free", free: true, provider: "kilo", description: "Fast reasoning" },
        modelo7: { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true, provider: "kilo", description: "Code model" },
        modelo8: { id: "openrouter/free", free: true, provider: "kilo", description: "OpenRouter access" },
        modelo9: { id: "smart-rotator", free: true, provider: "kilo", description: "Auto-failover with circuit breaker" },
        modelo10: { id: "google/gemini-2.0-flash-exp:free", free: true, provider: "kilo", description: "Google Gemini 2.0 Experimental" }
      },
      endpoints: {
        chat: "/chat/completions",
        models: "/models",
        admin: "/api/admin",
        admin_panel: "/api/admin-panel",
        check_models: "/api/models-check",
        images: "/images/generations",
        upload: "/api/upload"
      },
      usage: {
        chat: {
          method: "POST",
          body: {
            model: "modelo1-modelo10",
            messages: [{ role: "user", content: "Hello" }]
          }
        },
        image_gen: {
          endpoint: "/images/generations",
          model: "modelo5",
          body: { prompt: "a beautiful sunset over mountains" }
        }
      },
      auth: {
        note: "No global auth required. Admin panel uses hardcoded credentials (change in production)",
        env_vars: ["GITHUB_TOKEN", "IMGBB_API_KEY"]
      }
    });
  }
  
  res.status(404).json({ error: "Not found" });
};