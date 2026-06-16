// Shared model definitions for Carbonato Proxy
// Single source of truth — import this instead of duplicating arrays
// price_in / price_out: USD por 1M tokens (0 = free tier)
// name se lee de process.env.MODELO{idx}_MODEL (ej: MODELO1_MODEL)
const MODELOS = [
  { id: 'modelo1',  icon: '⬡', desc: 'Kilo Auto — alto rendimiento',              price_in: 0,   price_out: 0 },
  { id: 'modelo2',  icon: '▲', desc: 'Nemotron 3 Super 120B',                      price_in: 0,   price_out: 0 },
  { id: 'modelo3',  icon: '◈', desc: 'Laguna M.1',                                 price_in: 0,   price_out: 0 },
  { id: 'modelo4',  icon: '»', desc: 'Laguna XS.2',                                price_in: 0,   price_out: 0 },
  { id: 'modelo5',  icon: '◉', desc: 'Nemotron Nano Omni 30B',                     price_in: 0,   price_out: 0 },
  { id: 'modelo6',  icon: '⌬', desc: 'Step-3.7-Flash',                             price_in: 0,   price_out: 0 },
  { id: 'modelo7',  icon: '⬢', desc: 'Nemotron 3 Ultra 550B',                      price_in: 0,   price_out: 0 },
  { id: 'modelo8',  icon: '⇌', desc: 'OpenRouter multi-proveedor',                 price_in: 0,   price_out: 0 },
  { id: 'modelo9',  icon: '↻', desc: 'Smart Rotator',                              price_in: 0,   price_out: 0 },
  { id: 'modelo10', icon: '▣', desc: 'Pollinations HD — imágenes',                 price_in: 0,   price_out: 0 },
  { id: 'modelo11', icon: '⟁', desc: 'DeepSeek V4 Flash',                          price_in: 0,   price_out: 0 },
  { id: 'modelo12', icon: '◬', desc: 'MiMo V2.5',                                  price_in: 0,   price_out: 0 },
  { id: 'modelo13', icon: '▸', desc: 'Qwen3.6 — Ollama local',                     price_in: 0,   price_out: 0 },
  { id: 'modelo14', icon: '⛧', desc: 'Qwen3 14B — Ollama local',                   price_in: 0,   price_out: 0 },
  { id: 'modelo15', icon: '◆', desc: 'Claude Sonnet 4.6 — Modelverse',             price_in: 3.0, price_out: 15.0 },
  { id: 'modelo16', icon: '⬟', desc: 'GPT-5.1 Codex Max — Modelverse',             price_in: 2.5, price_out: 10.0 },
  { id: 'modelo17', icon: '☠', desc: 'DeepSeek V4 Flash — relay',                  price_in: 0,   price_out: 0 },
  { id: 'modelo18', icon: '⌖', desc: 'GLM 5.1 — NVIDIA NIM',                       price_in: 0.8, price_out: 0.8 },
  { id: 'modelo19', icon: '⟁', desc: 'Qwen3.6 Abliterated — Ollama',               price_in: 0,   price_out: 0 },
  { id: 'modelo20', icon: '⬡', desc: 'Qwen3 Coder 30B — Ollama local',             price_in: 0,   price_out: 0 },
  { id: 'modelo21', icon: '⚙', desc: 'Claude Sonnet 4.6 — proxy privado',          price_in: 3.0, price_out: 15.0 },
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
