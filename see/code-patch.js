// SEE Code Patch — Corrige bugs conocidos mediante patrones
// Cada bug conocido tiene un patrón de detección + fix

const fs = require('fs');
const path = require('path');
const config = require('./config-tune.js');

const PROXY_DIR = path.resolve(__dirname, '..');

// ─── Definiciones de bugs conocidos ───

const KNOWN_PATTERNS = [
  {
    id: 'silent-catch',
    description: 'Catch silencioso sin logging',
    severity: 'improvement',
    detect: (file, content) => {
      if (!file.endsWith('.js')) return null;
      const matches = [];
      const lines = content.split('\n');
      let inCatch = false;
      let catchLine = 0;
      let depth = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/catch\s*\([^)]+\)\s*\{/)) {
          inCatch = true;
          catchLine = i + 1;
          depth = 1;
          continue;
        }
        if (inCatch) {
          const opens = (line.match(/\{/g) || []).length;
          const closes = (line.match(/\}/g) || []).length;
          depth += opens - closes;

          const trimmed = line.trim();
          if (depth <= 0) {
            // Llegamos al final del catch
            if (trimmed === '}' || trimmed === '})' || trimmed === '});') {
              inCatch = false;
              continue;
            }
          }

          // Si el catch tiene solo comentarios o está vacío
          if (depth <= 0 || (depth === 0 && trimmed === '}')) {
            const bodyEnd = i;
            const catchBody = lines.slice(catchLine, bodyEnd).join('\n').trim();
            if (!catchBody || catchBody.match(/^\/\/.*$/) || catchBody === '{}') {
              matches.push({
                line: catchLine,
                code: lines.slice(catchLine - 1, i + 1).join('\n').slice(0, 80),
                file
              });
            }
            inCatch = false;
          }
        }
      }
      return matches.length > 0 ? matches : null;
    },
    fix: (file, content, match) => {
      const lines = content.split('\n');
      const lineIdx = match.line - 1;
      const line = lines[lineIdx];

      // Buscar la variable del catch
      const varMatch = line.match(/catch\s*\((\w+)\)/);
      const varName = varMatch ? varMatch[1] : 'e';

      // Agregar console.error dentro del catch
      const indent = line.match(/^(\s*)/)[1];
      const insertLine = `  ${indent}console.log('[see:fix] catch en línea ${match.line}:', ${varName}.message);`;

      // Encontrar dónde insertar (después de { )
      const openBrace = line.indexOf('{');
      if (openBrace > -1) {
        // El { está en la misma línea que catch
        const before = line.substring(0, openBrace + 1);
        const after = line.substring(openBrace + 1);
        lines[lineIdx] = before + '\n' + indent + insertLine + after;
        return { ok: true, lines: lines.join('\n') };
      }

      // Buscar la línea después (catch en línea separada)
      if (lineIdx + 1 < lines.length && lines[lineIdx + 1].includes('{')) {
        const nextLine = lineIdx + 1;
        const indent2 = lines[nextLine].match(/^(\s*)/)[1];
        const before = lines[nextLine].substring(0, lines[nextLine].indexOf('{') + 1);
        const after = lines[nextLine].substring(lines[nextLine].indexOf('{') + 1);
        lines[nextLine] = before + '\n' + indent2 + insertLine + after;
        return { ok: true, lines: lines.join('\n') };
      }

      return { ok: false, error: 'formato de catch no reconocido' };
    }
  },
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

module.exports = { scanForBugs, applyFix, KNOWN_PATTERNS };
