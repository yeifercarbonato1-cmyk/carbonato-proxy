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
  { id: 'modelo13', name: 'Qwen3.6',                    icon: '🔥', desc: 'Qwen3.6 — Ollama' },
  { id: 'modelo14', name: 'Qwen3.6 Abliterated 27B',    icon: '🌀', desc: 'huihui_ai/qwen3.6-abliterated:27b' },
  { id: 'modelo15', name: 'Claude Sonnet 4.6',          icon: '💫', desc: 'Modelo premium vía Modelverse' },
  { id: 'modelo16', name: 'GPT-5.5',                    icon: '🧌', desc: 'Modelo premium vía Modelverse' },
  { id: 'modelo17', name: 'DeepSeek V4 Flash',          icon: '🦴', desc: 'DeepSeek V4 Flash — relay especializado' },
  { id: 'modelo18', name: 'GLM 5.1 — Zhipu AI',         icon: '🦖', desc: 'z-ai/glm-5.1 — razonamiento vía NVIDIA NIM' },
  { id: 'modelo19', name: 'Qwen3.6 Abliterated 27B',    icon: '🧟', desc: 'huihui_ai/qwen3.6-abliterated:27b' },
  { id: 'modelo20', name: 'Minimax M2.7',               icon: '🐉', desc: 'minimaxai/minimax-m2.7 vía NVIDIA NIM' },
  { id: 'modelo21', name: 'DeepSeek V3.2 Tools',        icon: '⚙️', desc: 'DeepSeek-V3.2 — OpenAI compatible con tool calling' },
];

// Modelos mostrados en la página pública/bienvenida
const PUBLIC_MODELOS = MODELOS.slice(0, 12);

// Modelos de uso libre sin API key
const FREE_MODELOS = MODELOS.slice(0, 5);

// IDs-only list for quick iteration
const MODEL_IDS = MODELOS.map(m => m.id);
const PUBLIC_MODEL_IDS = PUBLIC_MODELOS.map(m => m.id);
const FREE_MODEL_IDS = FREE_MODELOS.map(m => m.id);

module.exports = { MODELOS, PUBLIC_MODELOS, FREE_MODELOS, MODEL_IDS, PUBLIC_MODEL_IDS, FREE_MODEL_IDS };
