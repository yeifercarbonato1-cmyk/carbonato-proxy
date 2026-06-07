// SEE Git Bridge — Operaciones git seguras con validaciones
// NO hace push sin flag explícito (PUSH_ENABLED = false por defecto)

const { execSync } = require('child_process');
const path = require('path');

const PROXY_DIR = path.resolve(__dirname, '..');
const ALLOWED_FILES = [
  'api/config.json',
  'api/models-def.js',
  'api/chat.js',
  'api/skynet.js',
  'api/skynet-memory.js',
  'api/index.js',
  'api/landing-*.js',
  'api/admin-tools.js',
  'api/admin/helpers.js',
  'api/admin/db.js',
  'api/admin/handlers.js',
  'api/admin-templates.js',
  'api/landing-css.js',
  'api/landing-html.js',
  'api/landing-js.js',
  'api/admin.js',
  'api/admin-panel.js',
  'api/auth.js',
  'api/see.js',
  'see/*.js',
  'vercel.json'
];

const PROTECTED = [
  'api/auth.js',
  '.env',
  'telegram-bot.js'
];

const PUSH_ENABLED = false; // CAMBIAR a true para activar push

function assertInRepo() {
  try {
    execSync('git rev-parse --git-dir', { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
  } catch(e) {
    throw new Error('No es un repositorio git');
  }
}

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROXY_DIR, encoding: 'utf8' }).trim();
}

function getCurrentSha() {
  return execSync('git rev-parse HEAD', { cwd: PROXY_DIR, encoding: 'utf8' }).trim();
}

function getDiff() {
  return execSync('git diff --stat', { cwd: PROXY_DIR, encoding: 'utf8' }).trim();
}

function isFileAllowed(filePath) {
  const relPath = path.relative(PROXY_DIR, path.resolve(PROXY_DIR, filePath));
  // Check protected first
  for (const p of PROTECTED) {
    if (relPath === p || relPath.startsWith(p + '/')) return false;
  }
  // Check allowed
  for (const a of ALLOWED_FILES) {
    if (a.includes('*')) {
      const prefix = a.replace('*', '');
      if (relPath.startsWith(prefix)) return true;
    }
    if (relPath === a) return true;
  }
  return false;
}

function validateChanges(files) {
  const errors = [];
  for (const f of files) {
    if (!isFileAllowed(f)) {
      errors.push(`Archivo no permitido: ${f}`);
    }
  }
  return errors;
}

function stage(files) {
  assertInRepo();
  const errors = validateChanges(files);
  if (errors.length > 0) throw new Error(`Bloqueado: ${errors.join(', ')}`);

  for (const f of files) {
    try {
      execSync(`git add "${f}"`, { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
    } catch(e) {
      throw new Error(`Error al stage ${f}: ${e.message}`);
    }
  }
  return true;
}

function commit(message) {
  assertInRepo();
  const prefix = `[SEE] cycle-${process.env.SEE_CYCLE || 'manual'}`;
  const fullMsg = `${prefix}: ${message}`;
  try {
    execSync(`git commit -m "${fullMsg.replace(/"/g, '\\"')}"`, { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
  } catch(e) {
    const stderr = e.stderr?.toString() || e.message;
    if (stderr.includes('nothing to commit')) return { ok: true, nothingToCommit: true };
    throw new Error(`Error en commit: ${stderr.slice(0, 300)}`);
  }
  return { ok: true, sha: getCurrentSha(), message: fullMsg };
}

function push(branch) {
  if (!PUSH_ENABLED) {
    return { ok: false, error: 'PUSH_ENABLED=false', skipped: true };
  }
  assertInRepo();
  const targetBranch = branch || getCurrentBranch();
  try {
    execSync(`git push origin ${targetBranch}`, { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
  } catch(e) {
    const stderr = e.stderr?.toString() || e.message;
    throw new Error(`Error en push: ${stderr.slice(0, 300)}`);
  }
  return { ok: true, branch: targetBranch };
}

function rollback(sha) {
  assertInRepo();
  try {
    execSync(`git revert --no-edit ${sha}`, { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
  } catch(e) {
    // Intentar reset en vez de revert
    try {
      execSync(`git reset --hard ${sha}`, { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
    } catch(e2) {
      throw new Error(`Rollback falló: ${e2.message}`);
    }
  }
  return { ok: true, sha: getCurrentSha() };
}

function createBranch(name) {
  assertInRepo();
  try {
    execSync(`git checkout -b ${name}`, { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
  } catch(e) {
    throw new Error(`Error creando branch ${name}: ${e.message}`);
  }
  return { ok: true, branch: name };
}

function checkout(branch) {
  assertInRepo();
  try {
    execSync(`git checkout ${branch}`, { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' });
  } catch(e) {
    throw new Error(`Error checkout ${branch}: ${e.message}`);
  }
  return { ok: true, branch };
}

function status() {
  try {
    const s = execSync('git status --short', { cwd: PROXY_DIR, encoding: 'utf8', stdio: 'pipe' }).trim();
    const branch = getCurrentBranch();
    const sha = getCurrentSha();
    return { branch, sha, dirty: s.length > 0, changes: s || '(clean)' };
  } catch(e) {
    return { error: e.message };
  }
}

module.exports = {
  stage, commit, push, rollback, createBranch, checkout, status, getDiff,
  isFileAllowed, validateChanges, getCurrentSha, getCurrentBranch,
  PUSH_ENABLED, ALLOWED_FILES, PROTECTED
};
