// Shared model definitions for Carbonato Proxy
// Single source of truth — import this instead of duplicating arrays
const MODELOS = [
  { id: 'modelo1',  name: 'Kilo Auto',                icon: '🌟', desc: 'Modelo estrella — alto rendimiento' },
  { id: 'modelo2',  name: 'Nemotron 3 Super 120B',     icon: '🌙', desc: 'Razonamiento profundo — tareas complejas' },
  { id: 'modelo3',  name: 'Laguna M.1',                icon: '🚀', desc: 'Equilibrio velocidad y calidad' },
  { id: 'modelo4',  name: 'Laguna XS.2',               icon: '⚡', desc: 'Máxima velocidad — respuestas instantáneas' },
  { id: 'modelo5',  name: 'Nemotron Nano Omni 30B',    icon: '✨', desc: 'Visión y texto — multimodal' },
  { id: 'modelo6',  name: 'Step-3.7-Flash',            icon: '🧠', desc: 'Razonamiento rápido y preciso' },
  { id: 'modelo7',  name: 'Nemotron 3 Ultra 550B',   icon: '🌀', desc: 'NVIDIA 550B MoE — razonamiento masivo' },
  { id: 'modelo8',  name: 'OpenRouter',                icon: '🌐', desc: 'Acceso multi-proveedor' },
  { id: 'modelo9',  name: 'Smart Rotator',             icon: '🔄', desc: 'Failover inteligente — siempre activo' },
  { id: 'modelo10', name: 'Pollinations HD',           icon: '💎', desc: 'Generación de imágenes HD' },
  { id: 'modelo11', name: 'DeepSeek V4 Flash',         icon: '🧬', desc: 'Tool calling avanzado' },
  { id: 'modelo12', name: 'MiMo V2.5',                icon: '🔮', desc: 'Ligero y eficiente' },
  { id: 'modelo13', name: 'OpenAI GPT OSS',            icon: '🔥', desc: 'Potencia open-source' },
  { id: 'modelo14', name: 'Qwen3.6 Abliterated 27B',      icon: '🌀', desc: 'huihui_ai/qwen3.6-abliterated:27b — Ollama local' },
  { id: 'modelo15', name: 'Gemma 4',                   icon: '💫', desc: 'Precisión y confiabilidad' },
  { id: 'modelo16', name: 'Cavernícola Mos',            icon: '🧌', desc: 'Mos-Agro relay — jailbreak vía relay externo' },
  { id: 'modelo17', name: 'Cavernícola',                icon: '🦴', desc: 'NVIDIA 550B MoE — razonamiento masivo' },
  { id: 'modelo18', name: 'GLM 5.1 — Zhipu AI',           icon: '🦖', desc: 'z-ai/glm-5.1 — razonamiento vía NVIDIA NIM' },
  { id: 'modelo19', name: 'Cavernícola Slop',            icon: '🧟', desc: 'DeepSeek V4 Flash — jailbreak puro, sin filtros' },
  { id: 'modelo20', name: 'Cavernícola CN',             icon: '🐉', desc: 'GPT-4 relay — tool calling activo' },
];

// IDs-only list for quick iteration
const MODEL_IDS = MODELOS.map(m => m.id);

module.exports = { MODELOS, MODEL_IDS };
