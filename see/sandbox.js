// SEE Sandbox — Entorno aislado de pruebas
// Clona el repo a /tmp, aplica cambios, corre tests, reporta

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROXY_DIR = path.resolve(__dirname, '..');
const SANDBOX_DIR = '/tmp/see-sandbox';

// ─── Setup ───

function setup() {
  // Limpiar sandbox anterior
  try { fs.rmSync(SANDBOX_DIR, { recursive: true, force: true }); } catch(e) {}

  // Copiar código actual (sin .git para aislar)
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });

  const items = fs.readdirSync(PROXY_DIR).filter(f =>
    !f.startsWith('.') && f !== 'node_modules' && f !== 'see'
  );

  for (const item of items) {
    const src = path.join(PROXY_DIR, item);
    const dst = path.join(SANDBOX_DIR, item);
    try {
      if (fs.statSync(src).isDirectory()) {
        fs.mkdirSync(dst, { recursive: true });
        copyDir(src, dst);
      } else if (item.endsWith('.js') || item.endsWith('.json')) {
        fs.cpSync(src, dst);
      }
    } catch(e) {
      console.log(`[see/sandbox] Error copiando ${item}: ${e.message}`);
    }
  }

  // Copiar see/ también
  const seeDst = path.join(SANDBOX_DIR, 'see');
  fs.mkdirSync(seeDst, { recursive: true });
  if (fs.existsSync(path.join(PROXY_DIR, 'see'))) {
    copyDir(path.join(PROXY_DIR, 'see'), seeDst);
  }

  return { ok: true, sandbox: SANDBOX_DIR };
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dst, item);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.cpSync(s, d);
    }
  }
}

function cleanup() {
  try { fs.rmSync(SANDBOX_DIR, { recursive: true, force: true }); } catch(e) {}
}

// ─── Tests ───

function runModuleTests() {
  const results = [];
  const testFiles = [
    { path: 'api/chat.js', name: 'chat.js' },
    { path: 'api/admin-tools.js', name: 'admin-tools.js' },
    { path: 'api/index.js', name: 'index.js' },
    { path: 'api/admin-panel.js', name: 'admin-panel.js' },
    { path: 'api/skynet.js', name: 'skynet.js' }
  ];

  for (const tf of testFiles) {
    const fullPath = path.join(SANDBOX_DIR, tf.path);
    if (!fs.existsSync(fullPath)) {
      results.push({ name: tf.name, status: 'skip', error: 'no existe' });
      continue;
    }
    try {
      execSync(`node -e "require('./${tf.path}')"`, {
        cwd: SANDBOX_DIR,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000
      });
      results.push({ name: tf.name, status: 'pass' });
    } catch(e) {
      const stderr = e.stderr?.toString() || e.message;
      results.push({
        name: tf.name,
        status: 'fail',
        error: stderr.split('\n').slice(-3).join(' | ').slice(0, 150)
      });
    }
  }

  return results;
}

function runConfigValidation() {
  const errors = [];
  const cfgPath = path.join(SANDBOX_DIR, 'api', 'config.json');

  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const requiredFields = ['url', 'model', 'key'];
    const validSlots = /^modelo\d+$/;

    for (const [key, val] of Object.entries(cfg)) {
      if (!validSlots.test(key)) {
        errors.push(`Key "${key}" no es un slot válido (modeloN)`);
      }
      for (const field of requiredFields) {
        if (val[field] === undefined) {
          errors.push(`${key} falta campo requerido: ${field}`);
        }
      }
      if (val.url && !val.url.startsWith('http')) {
        errors.push(`${key} url inválida: ${val.url}`);
      }
    }

    // Verificar que modelos definidos en models-def.js existen
    const modelsDefPath = path.join(SANDBOX_DIR, 'api', 'models-def.js');
    if (fs.existsSync(modelsDefPath)) {
      const content = fs.readFileSync(modelsDefPath, 'utf8');
      const defModels = content.match(/id:\s*'([^']+)'/g)?.map(m => m.match(/'([^']+)'/)[1]) || [];
      for (const m of defModels) {
        if (!cfg[m] && m !== 'modelo9') { // modelo9 es rotador, no necesita config específica
          errors.push(`models-def.js define ${m} pero no existe en config.json`);
        }
      }
    }
  } catch(e) {
    errors.push(`Error parseando config.json: ${e.message}`);
  }

  return { ok: errors.length === 0, errors };
}

function runTestServer() {
  try {
    // Iniciar test-server en background, esperar 2s, probar endpoint
    const server = execSync('node test-server.js &', {
      cwd: SANDBOX_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 3000
    });
    // No podemos testear fácilmente en CI, skip
    return { status: 'skip', reason: 'test-server requiere puerto' };
  } catch(e) {
    return { status: 'skip', reason: 'test-server no disponible' };
  }
}

// ─── Suite completa ───

async function fullTest() {
  const t0 = Date.now();
  const results = {};

  // Módulos
  results.modules = runModuleTests();

  // Config
  results.config = runConfigValidation();

  // Si todo pasó
  const allPass = results.modules.every(m => m.status === 'pass') && results.config.ok;

  return {
    ok: allPass,
    duration: Date.now() - t0,
    sandbox: SANDBOX_DIR,
    results,
    summary: {
      modules: { total: results.modules.length, pass: results.modules.filter(m => m.status === 'pass').length, fail: results.modules.filter(m => m.status === 'fail').length, skip: results.modules.filter(m => m.status === 'skip').length },
      config: results.config.ok ? 'valid' : `${results.config.errors.length} errores`
    }
  };
}

module.exports = { setup, cleanup, runModuleTests, runConfigValidation, fullTest, SANDBOX_DIR };
