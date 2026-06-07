// SEE Model Swap — Reemplazo inteligente de modelos caídos
// Cuando un modelo falla consistentemente, busca alternativas

const config = require('./config-tune.js');
const discovery = require('./model-discovery.js');
const memory = require('./memory.js');

// Evalúa si un modelo debe ser reemplazado
function shouldReplace(findings, modelKey, mem) {
  const healthFindings = findings.filter(f =>
    f.area === 'health' && f.model === modelKey && f.severity === 'critical'
  );
  if (healthFindings.length === 0) return false;

  const modelHistory = mem.modelHistory[modelKey];
  if (!modelHistory) return healthFindings.length >= 2;

  // Si falló 3+ veces seguidas y lleva +24h sin OK
  const consecutiveFails = modelHistory.fails || 0;
  const lastOk = modelHistory.lastOk ? new Date(modelHistory.lastOk).getTime() : 0;
  const daysSinceOk = lastOk > 0 ? (Date.now() - lastOk) / 86400000 : 999;

  return (consecutiveFails >= 3 && daysSinceOk > 1) || daysSinceOk > 3;
}

// Genera descripción genérica para el slot
function generateDescription(modelKey, providerName, modelId) {
  const descs = {
    'kilo-auto/free': 'Modelo estrella — alto rendimiento',
    'nemotron-3-ultra-free': 'NVIDIA 550B MoE — razonamiento masivo',
    'nemotron-3-super-free': 'Razonamiento profundo — tareas complejas',
    'deepseek-v4-flash-free': 'Tool calling avanzado',
    'mimo-v2.5-free': 'Ligero y eficiente',
    'qwen4-ultra-free': 'Alta capacidad de proceso',
    'memfree-3.2-free': 'Equilibrio velocidad y calidad'
  };

  if (descs[modelId]) return descs[modelId];

  // Generar description en base al provider
  const base = {
    'Kilo.ai': 'Modelo de alto rendimiento',
    'OpenCode Zen': 'Modelo eficiente y rápido',
    'OpenRouter': 'Acceso multi-proveedor'
  };
  return base[providerName] || `Modelo ${modelKey}`;
}

// Busca el mejor reemplazo para un modelo caído
async function findReplacement(modelKey, findings, mem) {
  const cfg = config.getConfig();
  const currentCfg = cfg[modelKey];
  if (!currentCfg) return null;

  console.log(`[see/swap] Buscando reemplazo para ${modelKey} (actual: ${currentCfg.model})`);

  // Descubrir modelos nuevos
  const discovered = await discovery.discoverNew(15000);

  if (discovered.working.length === 0) {
    console.log(`[see/swap] No hay modelos nuevos disponibles`);
    return null;
  }

  // El más rápido de los nuevos
  const fastest = [...discovered.working].sort((a, b) => a.latency - b.latency)[0];

  // Determinar qué provider URL usar según el modelo
  let url = 'https://api.kilo.ai/api/gateway/chat/completions';
  let key = '';
  let systemPrompt = currentCfg.system_prompt || '';

  if (fastest.provider === 'opencode') {
    url = 'https://opencode.ai/zen/v1/chat/completions';
  }

  const desc = generateDescription(modelKey, fastest.providerName, fastest.model);

  return {
    slot: modelKey,
    oldModel: currentCfg.model,
    newModel: fastest.model,
    provider: fastest.provider,
    providerName: fastest.providerName,
    url,
    key,
    system_prompt: systemPrompt,
    description: desc,
    latency: fastest.latency,
    reason: `${currentCfg.model} caído → ${fastest.model} (${fastest.latency}ms)`
  };
}

// Aplica el reemplazo en config.json
function applySwap(replacement) {
  const cfgPath = require('path').join(__dirname, '..', 'api', 'config.json');
  const modelsDefPath = require('path').join(__dirname, '..', 'api', 'models-def.js');

  // Leer config actual
  const cfg = config.getConfig();

  // Actualizar config.json
  cfg[replacement.slot] = {
    url: replacement.url,
    model: replacement.newModel,
    key: replacement.key,
    system_prompt: replacement.system_prompt
  };

  // Escribir
  const fs = require('fs');
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

  // Actualizar models-def.js si existe descripción
  if (replacement.description) {
    let defContent = fs.readFileSync(modelsDefPath, 'utf8');
    const lines = defContent.split('\n');
    let inModel = false;
    const newLines = lines.map(line => {
      if (line.includes(`id: '${replacement.slot}'`)) inModel = true;
      if (inModel && line.includes('desc:')) {
        inModel = false;
        return line.replace(/desc:\s*'[^']*'/, `desc: '${replacement.description}'`);
      }
      return line;
    });
    fs.writeFileSync(modelsDefPath, newLines.join('\n'));
  }

  return {
    ok: true,
    file: cfgPath,
    changes: {
      slot: replacement.slot,
      from: replacement.oldModel,
      to: replacement.newModel,
      description: replacement.description
    }
  };
}

module.exports = { shouldReplace, findReplacement, applySwap, generateDescription };
