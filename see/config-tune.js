// SEE Config Tune — Lee/escribe config.json con hot-reload awareness
// Reutiliza la lógica de chat.js/skynet.js pero como módulo

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'api', 'config.json');
const MODELS_DEF_PATH = path.join(__dirname, '..', 'api', 'models-def.js');

function getConfig() {
  try {
    // Hot-reload: /tmp/proxy-config.json tiene prioridad (admin guardó)
    const tmp = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8'));
    if (tmp && typeof tmp === 'object' && Object.keys(tmp).length > 0) return tmp;
  } catch(e) {}
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch(e) {
    return {};
  }
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  // También actualizar hot-reload
  try {
    fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(cfg, null, 2));
  } catch(e) {}
  return { ok: true, path: CONFIG_PATH };
}

function resolveKey(keyPlaceholder) {
  if (!keyPlaceholder) return '';
  if (keyPlaceholder === '$OR_KEY1') return process.env.OR_KEY1 || '';
  if (keyPlaceholder === '$OR_KEY2') return process.env.OR_KEY2 || '';
  return keyPlaceholder;
}

function readModelsDef() {
  try {
    return JSON.parse(fs.readFileSync('/tmp/models-def.json', 'utf8'));
  } catch(e) {}
  // Parsear el JS export
  try {
    const content = fs.readFileSync(MODELS_DEF_PATH, 'utf8');
    const match = content.match(/const MODELOS\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      // Convertir JS literal a JSON
      const js = match[1]
        .replace(/'/g, '"')
        .replace(/\/\/[^"]*$/gm, '') // comentarios de línea
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(js);
    }
  } catch(e) {}
  return [];
}

function getFreeSlots() {
  const cfg = getConfig();
  const used = Object.keys(cfg);
  const slots = [];
  for (let i = 1; i <= 20; i++) {
    const key = `modelo${i}`;
    if (!used.includes(key)) slots.push(key);
  }
  return slots;
}

// Sugiere configuración óptima basada en latencia
function suggestTimeout(modelKey, latency) {
  // timeout = latencia * 3 + 5000 (mínimo 15000)
  return Math.max(15000, Math.round(latency * 3 + 5000));
}

module.exports = {
  getConfig, writeConfig, resolveKey, readModelsDef, getFreeSlots, suggestTimeout,
  CONFIG_PATH, MODELS_DEF_PATH
};
