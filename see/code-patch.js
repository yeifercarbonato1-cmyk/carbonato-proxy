// SEE Code Patch — Corrige bugs conocidos mediante patrones
// Cada bug conocido tiene un patrón de detección + fix

const fs = require('fs');
const path = require('path');
const config = require('./config-tune.js');

const PROXY_DIR = path.resolve(__dirname, '..');

// ─── Definiciones de bugs conocidos ───

const KNOWN_PATTERNS = [
  // ⚠️ silent-catch DESHABILITADO — detecta mal líneas y corrompe código
  // Ver https://github.com/yeifer125/carbonato-proxy/issues/SEE-bug
  // {
  //   id: 'silent-catch',
  //   description: 'Catch silencioso sin logging',
  //   severity: 'improvement',
  //   ...
  // },
  {
    id: 'console-log-debug',
    description: 'console.log de debug sin propósito',
    severity: 'improvement',
    detect: (file, content) => {
      if (!file.endsWith('.js')) return null;
      const matches = [];
      const lines = content.split('\n');
      const whitelist = ['[config]', '[rotator]', '[skynet]', '[see]', 'Error', 'error'];
      const blacklist = ['console.log(\'[see', 'console.log(\'[skynet'];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim().startsWith('console.log(')) continue;
        if (whitelist.some(w => line.includes(w))) continue;
        if (blacklist.some(b => line.includes(b))) continue;

        matches.push({
          line: i + 1,
          code: line.trim().slice(0, 80),
          file
        });
      }
      return matches.length > 0 ? matches : null;
    },
    fix: (file, content, match) => {
      // No fix automático — solo reportar. El developer decide si borrar o no.
      return { ok: false, error: 'requiere decisión manual', reportOnly: true };
    }
  }
];

// ─── Detección ───

function scanForBugs() {
  const findings = [];
  const apiDir = path.join(PROXY_DIR, 'api');
  const seeDir = path.join(PROXY_DIR, 'see');

  [apiDir, seeDir].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(PROXY_DIR, filePath);

      for (const pattern of KNOWN_PATTERNS) {
        try {
          const result = pattern.detect(relPath, content);
          if (result) {
            result.forEach(m => {
              findings.push({
                id: pattern.id,
                severity: pattern.severity,
                description: pattern.description,
                file: m.file || relPath,
                line: m.line,
                code: m.code,
                fixable: pattern.fix(relPath, content, m).ok || false
              });
            });
          }
        } catch(e) {
          // Si falla la detección, seguir
        }
      }
    }
  });

  return findings;
}

// ─── Aplicar fix ───

function applyFix(finding) {
  for (const pattern of KNOWN_PATTERNS) {
    if (pattern.id !== finding.id) continue;

    // Sanitizar: "api/admin-panel.js:~17" → path="api/admin-panel.js", line=17
    let filePathRaw = finding.file || '';
    let lineNum = finding.line || 0;
    const tildeMatch = filePathRaw.match(/^(.*):~(\d+)$/);
    if (tildeMatch) {
      filePathRaw = tildeMatch[1];
      lineNum = parseInt(tildeMatch[2], 10);
    }

    const filePath = path.join(PROXY_DIR, filePathRaw);
    const content = fs.readFileSync(filePath, 'utf8');

    const match = {
      line: lineNum,
      file: filePathRaw,
      code: finding.code
    };

    const result = pattern.fix(filePathRaw, content, match);
    if (result.ok) {
      fs.writeFileSync(filePath, result.lines);
      return { ok: true, file: filePathRaw, line: lineNum, fix: pattern.id };
    }
    return result;
  }
  return { ok: false, error: 'patrón no encontrado' };
}

// ─── Helpers para evolver.js ───

function getFixablePatternIds() {
  return KNOWN_PATTERNS
    .filter(p => {
      // Probar si fix devuelve ok=false con reportOnly
      const result = p.fix('test.js', '', { line: 0, file: 'test.js', code: '' });
      return result.ok || !result.reportOnly;
    })
    .map(p => p.id);
}

function canAutoFix(patternId) {
  return getFixablePatternIds().includes(patternId);
}

module.exports = { scanForBugs, applyFix, KNOWN_PATTERNS, canAutoFix, getFixablePatternIds };
