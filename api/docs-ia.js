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
        modelo5: { id: "pollinations-image", free: true, provider: "pollinations", image_gen: true, description: "Image generation" },
        modelo6: { id: "stepfun/step-3.7-flash:free", free: true, provider: "kilo", description: "Fast reasoning" },
        modelo7: { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true, provider: "kilo", description: "Code model" },
        modelo8: { id: "openrouter/free", free: true, provider: "kilo", description: "OpenRouter access" }
      },
      endpoints: {
        chat: "/chat/completions",
        models: "/models",
        admin: "/api/admin",
        admin_panel: "/api/admin-panel",
        check_models: "/api/models-check",
        upload: "/api/upload"
      },
      usage: {
        chat: {
          method: "POST",
          body: {
            model: "modelo1-modelo8",
            messages: [{ role: "user", content: "Hello" }]
          }
        },
        image_gen: {
          model: "modelo5",
          body: { messages: [{ role: "user", content: "prompt text" }] }
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