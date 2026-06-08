// SEE Evolver — Master de mejora continua
// Toma findings del diagnóstico y ejecuta mejoras delegando a sub-módulos

const modelSwap = require('./model-swap.js');
const codePatch = require('./code-patch.js');
const configTune = require('./config-tune.js');
const modelDiscovery = require('./model-discovery.js');
const sandbox = require('./sandbox.js');
const memory = require('./memory.js');
const gitBridge = require('./git-bridge.js');

// ─── Evalúa qué mejoras hacer ───

async function evaluateImprovements(diagnosis, mem) {
  console.log('[see/evolver] Evaluando mejoras potenciales...');
  const improvements = [];

  // 1. Reemplazo de modelos caídos
  const deadModels = diagnosis.findings.filter(f =>
    f.severity === 'critical' && f.area === 'health' && f.model
  );
  const seenModels = new Set();
  for (const dm of deadModels) {
    if (seenModels.has(dm.model)) continue;
    seenModels.add(dm.model);

    if (modelSwap.shouldReplace(diagnosis.findings, dm.model, mem)) {
      if (!memory.hasFailedRecently(mem, `swap_${dm.model}`, 72)) {
        console.log(`[see/evolver] ${dm.model} candidato a reemplazo`);
        improvements.push({
          action: 'model_swap',
          model: dm.model,
          detail: dm.detail.slice(0, 100),
          autoFix: true,
          priority: 10
        });
      } else {
        improvements.push({
          action: 'model_swap',
          model: dm.model,
          detail: `Reemplazo falló antes, esperando 72h: ${dm.detail.slice(0, 80)}`,
          autoFix: false,
          skipped: true,
          priority: 0
        });
      }
    }
  }

  // 2. Bugs de código (solo si hay handler en code-patch)
  const codeIssues = diagnosis.findings.filter(f => f.area === 'code' && f.severity === 'improvement');
  const fixableIds = codePatch.getFixablePatternIds();
  for (const ci of codeIssues) {
    if (!fixableIds.includes(ci.id)) continue; // code-patch no puede fixearlo
    if (!memory.hasFailedRecently(mem, `fix_${ci.file}_${ci.line}`, 24)) {
      improvements.push({
        action: 'code_patch',
        file: ci.file,
        line: ci.line,
        detail: ci.detail.slice(0, 100),
        autoFix: true,
        priority: 5
      });
    }
  }

  // 3. Oportunidades de nuevos modelos
  const opportunities = diagnosis.findings.filter(f => f.severity === 'opportunity');
  if (opportunities.length > 0 && !memory.hasFailedRecently(mem, 'discovery', 24)) {
    improvements.push({
      action: 'model_discovery',
      detail: `${opportunities.length} modelos infrautilizados — buscar reemplazos`,
      autoFix: true,
      priority: 3
    });
  }

  // Ordenar por prioridad
  improvements.sort((a, b) => b.priority - a.priority);
  return improvements;
}

// ─── Ejecuta una mejora ───

async function executeImprovement(improvement, mem) {
  console.log(`[see/evolver] Ejecutando: ${improvement.action} — ${improvement.detail.slice(0, 60)}...`);

  try {
    switch (improvement.action) {
      case 'model_swap': {
        const replacement = await modelSwap.findReplacement(improvement.model, [], mem);
        if (!replacement) {
          memory.recordFailedAttempt(mem, { action: 'model_swap', model: improvement.model, reason: 'no replacement found' });
          return { ...improvement, applied: false, error: 'No se encontró reemplazo' };
        }

        // Sandbox: aplicar y testear
        sandbox.setup();
        modelSwap.applySwap(replacement);
        const testResult = await sandbox.fullTest();
        sandbox.cleanup();

        if (!testResult.ok) {
          memory.recordFailedAttempt(mem, { action: 'model_swap', model: improvement.model, reason: `tests: ${testResult.summary.modules.fail} fail` });
          return { ...improvement, applied: false, error: 'Tests fallaron', testResult: testResult.summary };
        }

        // Stage + commit (sin push)
        const changedFiles = ['api/config.json', 'api/models-def.js'];
        try {
          gitBridge.stage(changedFiles);
          gitBridge.commit(`model swap ${improvement.model}: ${replacement.oldModel} → ${replacement.newModel}`);
        } catch(e) {
          console.log(`[see/evolver] Git stage falló (no crítico): ${e.message}`);
        }

        memory.updateModelHistory(mem, improvement.model, {
          swap: { from: replacement.oldModel, to: replacement.newModel }
        });
        memory.recordImprovement(mem, {
          action: 'model_swap',
          model: improvement.model,
          detail: `${replacement.oldModel} → ${replacement.newModel} (${replacement.latency}ms)`,
          latency: replacement.latency
        });

        return { ...improvement, applied: true, detail: replacement.reason, replacement };
      }

      case 'code_patch': {
        const finding = {
          id: 'silent-catch',
          file: improvement.file,
          line: improvement.line,
          code: improvement.detail
        };
        const result = codePatch.applyFix(finding);
        if (result.ok) {
          try {
            gitBridge.stage([improvement.file]);
            gitBridge.commit(`fix: catch silencioso en ${improvement.file}:${improvement.line}`);
          } catch(e) {}

          memory.recordImprovement(mem, {
            action: 'code_patch',
            file: improvement.file,
            line: improvement.line,
            detail: `Fixed silent catch at ${improvement.file}:${improvement.line}`
          });
          return { ...improvement, applied: true };
        }
        if (result.reportOnly) {
          return { ...improvement, applied: false, skipped: true, reason: 'requiere decisión manual' };
        }
        return { ...improvement, applied: false, error: result.error };
      }

      case 'model_discovery': {
        const discovered = await modelDiscovery.discoverNew(15000);
        if (discovered.working.length === 0) {
          memory.recordFailedAttempt(mem, { action: 'model_discovery', reason: 'no working models found' });
          return { ...improvement, applied: false, error: 'No se encontraron modelos nuevos' };
        }

        const slots = modelDiscovery.suggestSlots(discovered);
        if (slots.length === 0) {
          return { ...improvement, applied: false, skipped: true, reason: 'sin slots disponibles' };
        }

        // Aplicar el mejor
        const best = slots[0];
        const replacement = {
          slot: best.slot,
          oldModel: '(nuevo)',
          newModel: best.model,
          provider: best.provider,
          providerName: best.providerName,
          url: best.provider === 'opencode'
            ? 'https://opencode.ai/zen/v1/chat/completions'
            : 'https://api.kilo.ai/api/gateway/chat/completions',
          key: '',
          system_prompt: '',
          description: modelSwap.generateDescription(best.slot, best.providerName, best.model),
          latency: best.latency,
          reason: best.reason
        };

        sandbox.setup();
        modelSwap.applySwap(replacement);
        const testResult = await sandbox.fullTest();
        sandbox.cleanup();

        if (!testResult.ok) {
          return { ...improvement, applied: false, error: 'Tests fallaron' };
        }

        try {
          gitBridge.stage(['api/config.json', 'api/models-def.js']);
          gitBridge.commit(`discovery: nuevo ${best.slot} = ${best.model} (${best.latency}ms)`);
        } catch(e) {}

        memory.recordImprovement(mem, {
          action: 'model_discovery',
          slot: best.slot,
          detail: `Nuevo ${best.slot}: ${best.model} (${best.latency}ms)`
        });

        return {
          ...improvement,
          applied: true,
          detail: `Nuevo ${best.slot}: ${best.model} (${best.latency}ms)`,
          discovered: { modelsFound: discovered.working.length, best: best.model }
        };
      }

      default:
        return { ...improvement, applied: false, error: `Acción desconocida: ${improvement.action}` };
    }
  } catch(e) {
    console.log(`[see/evolver] Error ejecutando ${improvement.action}: ${e.message}`);
    return { ...improvement, applied: false, error: e.message };
  }
}

module.exports = { evaluateImprovements, executeImprovement };
