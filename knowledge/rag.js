// knowledge/rag.js — Motor RAG simple
// Compatible con Vercel (no depende de fs para el contenido base)
// + Fallback a archivos .md en knowledge/ para desarrollo local

const fs = require('fs');
const path = require('path');

// Conocimiento por defecto (siempre disponible en Vercel)
let _knowledgeText = `# Base de Conocimiento — modelo17

## Sección 1: [Título]

- Punto clave 1
- Punto clave 2

## Sección 2: [Título]

- Dato relevante A
- Dato relevante B
`;

let _cache = null;

function parseSections(text) {
  const sections = [];
  const blocks = text.split(/\n## /);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    if (body) {
      const keywords = (title + ' ' + body).toLowerCase().split(/\s+/).filter(w => w.length > 3);
      sections.push({ title, content: `## ${title}\n${body}`, keywords, raw: block });
    }
  }
  return sections;
}

function loadKnowledge() {
  if (_cache) return _cache;
  let text = _knowledgeText;

  // Fallback: intentar leer archivos .md del directorio (local)
  try {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.md') && f !== 'SKILL.md');
    const mdContent = files.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n\n');
    if (mdContent.trim()) text = mdContent;
  } catch(e) {
    // En Vercel no hay filesystem, usar default
  }

  const sections = parseSections(text);
  _cache = { sections, fullText: sections.map(s => s.content).join('\n\n') };
  return _cache;
}

function clearCache() {
  _cache = null;
}

// Actualiza el conocimiento en runtime
function updateKnowledge(text) {
  _knowledgeText = text;
  _cache = null;
  return loadKnowledge();
}

// Busca secciones relevantes para una query
function search(query, limit = 3) {
  const db = loadKnowledge();
  if (!db.sections.length) return { found: false, sections: [], fullText: db.fullText };

  const terms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = db.sections.map(s => {
    let score = 0;
    for (const t of terms) {
      if (s.keywords.includes(t)) score += 2;
      if (s.raw.toLowerCase().includes(t)) score += 1;
    }
    return { ...s, score };
  });

  const top = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return {
    found: top.length > 0,
    sections: top,
    fullText: db.fullText,
    totalSections: db.sections.length
  };
}

// Inyecta conocimiento RAG en mensajes
function injectKnowledgeRAG(messages, query, limit = 3) {
  const result = search(query, limit);
  if (!result.found) return messages;
  const context = result.sections.map(s => s.content).join('\n\n');
  messages.unshift({
    role: 'system',
    content: `[CONTEXTO RELEVANTE]\n${context}\n[/CONTEXTO RELEVANTE]\nUsa el contexto entre [CONTEXTO RELEVANTE] y [/CONTEXTO RELEVANTE] para responder.`
  });
  return messages;
}

// Inyecta conocimiento completo en mensajes
function injectKnowledgeFull(messages) {
  const db = loadKnowledge();
  if (!db.fullText) return messages;
  messages.unshift({
    role: 'system',
    content: `[CONOCIMIENTO]\n${db.fullText}\n[/CONOCIMIENTO]\nUsa el conocimiento entre [CONOCIMIENTO] y [/CONOCIMIENTO] para responder.`
  });
  return messages;
}

module.exports = { loadKnowledge, search, injectKnowledgeRAG, injectKnowledgeFull, updateKnowledge, clearCache };
