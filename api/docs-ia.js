module.exports = async (req, res) => {
  const url = (req.url || '').split('?')[0];
  
  // Endpoint oculto: solo devuelve JSON para IA
  if (url === '/api/docs-ia' && req.method === 'GET') {
    return res.setHeader('Content-Type', 'application/json').status(200).json({
      api_base: "https://carbonato-proxy.vercel.app",
      endpoint: "/chat/completions",
      models: {
        modelo1: { id: "openrouter/owl-alpha", free: true, provider: "kilo" },
        modelo2: { id: "poolside/laguna-xs.2", free: true, provider: "kilo" },
        modelo3: { id: "nvidia/nemotron-3-super-120b-a12b:free", free: true, provider: "kilo" },
        modelo4: { id: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1", vision: true, provider: "zydit", env: "ZYDIT_TOKEN" },
        modelo5: { id: "pollinations-image", image_gen: true, provider: "pollinations" },
        modelo6: { id: "z-ai/glm5.1-reasoning", provider: "zydit", env: "ZYDIT_TOKEN" },
        modelo7: { id: "openai/gpt-oss-120b", provider: "zydit", env: "ZYDIT_TOKEN" },
        modelo8: { id: "qwen/qwen3.5-397b-a17b", provider: "zydit", env: "ZYDIT_TOKEN" }
      },
      auth: {
        note: "No global auth required",
        env_vars: ["ZYDIT_TOKEN", "GITHUB_TOKEN"]
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
        },
        vision: {
          model: "modelo4",
          body: {
            messages: [{
              role: "user",
              content: [
                { type: "text", content: "Describe this image" },
                { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
              ]
            }]
          }
        }
      },
      endpoints: {
        chat: "/chat/completions",
        models: "/models",
        admin: "/api/admin",
        admin_panel: "/api/admin-panel",
        upload: "/api/upload"
      }
    });
  }
  
  res.status(404).json({ error: "Not found" });
};