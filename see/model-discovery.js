// SEE Model Discovery — Descubre modelos nuevos free en providers
// Busca en Kilo.ai y OpenCode Zen modelos gratuitos que podamos agregar

const config = require('./config-tune.js');

const PROVIDERS = {
  kilo: {
    name: 'Kilo.ai',
    models: [
      'kilo-auto/free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'poolside/laguna-m.1:free',
      'poolside/laguna-xs.2:free',
      'stepfun/step-3.7-flash:free',
      'openrouter/free',
      'google/gemini-2.0-flash-exp:free',
      'nvidia/nemotron-3-super-120b-a12b:free'
    ],
    testUrl: 'https://api.kilo.ai/api/gateway/chat/completions',
    keyRequired: false,
    keyResolver: () => ''
  },
  opencode: {
    name: 'OpenCode Zen',
    models: [
      'nemotron-3-ultra-free',
      'nemotron-3-super-free',
      'deepseek-v4-flash-free',
      'mimo-v2.5-free',
      'minimax-m3-free',
      'qwen3.6-plus-free',
      'memfree-3.2-free',
      'qwen4-ultra-free'
    ],
    testUrl: 'https://opencode.ai/zen/v1/chat/completions',
    keyRequired: false,
    keyResolver: () => ''
  }
};

// Modelos actualmente configurados
function getCurrentModelIds() {
  const cfg = config.getConfig();
  return new Set(Object.values(cfg).map(c => c.model));
}

// Prueba si un modelo realmente existe y responde
async function testModel(providerKey, modelId, timeout = 10000) {
  const p = PROVIDERS[providerKey];
  if (!p) return { ok: false, error: 'provider desconocido' };

  const t0 = Date.now();
  try {
    const headers = { 'Content-Type': 'application/json' };
    const key = p.keyResolver();
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const r = await fetch(p.testUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 2
      }),
      signal: AbortSignal.timeout(timeout)
    });

    const latency = Date.now() - t0;
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      // 401 "Free promotion has ended" = promo expirada
      if (text.includes('promotion has ended') || text.includes('credits')) {
        return { ok: false, error: 'promo_expirada', latency, status: r.status };
      }
      return { ok: false, error: `HTTP ${r.status}: ${text.slice(0, 80)}`, latency, status: r.status };
    }

    const text = await r.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed.choices?.[0]?.message?.content) {
        return { ok: true, latency, model: modelId, provider: providerKey };
      }
      if (parsed.choices?.[0]?.message?.reasoning) {
        return { ok: true, latency, model: modelId, provider: providerKey, note: 'solo reasoning' };
      }
      return { ok: false, error: 'respuesta sin content', latency };
    } catch(e) {
      return { ok: false, error: 'respuesta no JSON', latency };
    }
  } catch(e) {
    return { ok: false, error: e.message.slice(0, 80), latency: Date.now() - t0 };
  }
}

// Descubre modelos nuevos: testea todos los que NO están en config
async function discoverNew(timeout = 10000) {
  const current = getCurrentModelIds();
  const results = [];

  for (const [pKey, p] of Object.entries(PROVIDERS)) {
    for (const modelId of p.models) {
      if (current.has(modelId)) continue; // ya lo tenemos

      console.log(`[see/discovery] Testing ${pKey}:${modelId}...`);
      const result = await testModel(pKey, modelId, timeout);
      results.push({
        ...result,
        provider: pKey,
        providerName: p.name
      });

      if (result.ok) {
        console.log(`[see/discovery] ✅ ${modelId} — ${result.latency}ms`);
      } else {
        console.log(`[see/discovery] ❌ ${modelId} — ${result.error}`);
      }
    }
  }

  const working = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);

  return {
    timestamp: new Date().toISOString(),
    tested: results.length,
    working,
    failed,
    summary: {
      total: results.length,
      working: working.length,
      failed: failed.length,
      promoExpiradas: failed.filter(f => f.error === 'promo_expirada').length
    }
  };
}

// Sugiere slots libres para modelos nuevos
function suggestSlots(discoveryResult) {
  const cfg = config.getConfig();
  const usedSlots = Object.keys(cfg);
  const working = discoveryResult.working;

  // Encontrar slots disponibles (modelo18+)
  let nextSlot = 18;
  while (usedSlots.includes(`modelo${nextSlot}`)) nextSlot++;

  const suggestions = [];
  for (const model of working.slice(0, 3)) { // max 3 sugerencias
    const slot = `modelo${nextSlot}`;
    suggestions.push({
      slot,
      model: model.model,
      provider: model.provider,
      providerName: model.providerName,
      latency: model.latency,
      reason: `${model.latency}ms desde test — nuevo modelo free`
    });
    nextSlot++;
  }

  return suggestions;
}

module.exports = { discoverNew, testModel, suggestSlots, PROVIDERS };
