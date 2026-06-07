// SkynetMemory — Sistema de memoria persistente para el rotador
// Aprende de fallos pasados y evita modelos caídos automáticamente
// Vercel-safe: usa /tmp/ (se pierde en cold starts)
const fs = require('fs');
const MEMORY_PATH = '/tmp/skynet-memory.json';

function getMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
  } catch (e) {
    return { failures: {}, blockedUntil: {}, lastReset: null };
  }
}

function saveMemory(mem) {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2));
  } catch (e) { /* Vercel serverless, /tmp/ puede no estar disponible */ }
}

// Registra un fallo y bloquea el modelo por 5 minutos
function recordFailure(modelKey) {
  const mem = getMemory();
  if (!mem.failures[modelKey]) mem.failures[modelKey] = [];
  mem.failures[modelKey].push({ time: Date.now(), count: mem.failures[modelKey].length + 1 });
  mem.blockedUntil[modelKey] = Date.now() + 300000; // 5 min
  saveMemory(mem);
}

// Registra éxito — desbloquea el modelo
function recordSuccess(modelKey) {
  const mem = getMemory();
  mem.failures[modelKey] = [];
  delete mem.blockedUntil[modelKey];
  saveMemory(mem);
}

// Verifica si un modelo está bloqueado
function isModelBlocked(modelKey) {
  const mem = getMemory();
  const until = mem.blockedUntil[modelKey];
  if (!until) return false;
  if (Date.now() > until) {
    // Bloqueo expiró, limpiar
    delete mem.blockedUntil[modelKey];
    mem.failures[modelKey] = [];
    saveMemory(mem);
    return false;
  }
  return true;
}

// Si TODOS los modelos están bloqueados, resetea la memoria
function resetIfAllBlocked(modelKeys) {
  const mem = getMemory();
  const now = Date.now();
  const allBlocked = modelKeys.every(k => {
    const until = mem.blockedUntil[k];
    return until && now < until;
  });
  if (allBlocked && modelKeys.length > 0) {
    mem.blockedUntil = {};
    mem.failures = {};
    mem.lastReset = now;
    mem.resetReason = 'Todos los modelos bloqueados — reset automático';
    saveMemory(mem);
    return true;
  }
  return false;
}

// Stats de memoria para monitoreo
function getMemoryStats() {
  const mem = getMemory();
  const now = Date.now();
  const blocked = Object.entries(mem.blockedUntil || {})
    .filter(([_, until]) => now < until)
    .map(([key, until]) => ({ model: key, remainingMs: until - now }));
  return {
    blockedCount: blocked.length,
    blocked,
    totalFailures: Object.values(mem.failures || {}).reduce((a, b) => a + b.length, 0),
    lastReset: mem.lastReset,
    resetReason: mem.resetReason
  };
}

// Health stats específicas para el bot/scanner
function getModelHealth(modelKey) {
  const mem = getMemory();
  const failures = mem.failures[modelKey] || [];
  const blocked = isModelBlocked(modelKey);
  return { blocked, failures: failures.length, lastFailure: failures.length > 0 ? failures[failures.length - 1] : null };
}

module.exports = {
  recordFailure,
  recordSuccess,
  isModelBlocked,
  resetIfAllBlocked,
  getMemoryStats,
  getModelHealth,
  getMemory
};
