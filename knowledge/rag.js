// knowledge/rag.js — Motor RAG simple
// 1. Carga knowledge/base.md (y archivos .md en knowledge/)
// 2. Indexa por secciones
// 3. Busca por keyword matching simple (sin vectores)
// 4. Inyecta secciones relevantes en el prompt

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname);

let _cache = null;

function loadKnowledge() {
  if (_cache) return _cache;
  const sections = [];
  try {
    const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf8');
      const blocks = content.split(/\n## /);
      for (const block of blocks) {
        const lines = block.trim().split('\n');
        const title = lines[0].replace(/^#+\s*/, '').trim();
        const body = lines.slice(1).join('\n').trim();
        if (body) {
          const keywords = (title + ' ' + body).toLowerCase().split(/\s+/).filter(w => w.length > 3);
          sections.push({ title, content: `## ${title}\n${body}`, keywords, raw: block });
        }
      }
    }
  } catch(e) {
    console.log('[knowledge] Error cargando:', e.message);
  }
  _cache = { sections, fullText: sections.map(s => s.content).join('\n\n') };
  return _cache;
}

function clearCache() {
  _cache = null;
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

// System prompt con TODO el conocimiento (modo "gigante")
function getSystemPromptFull() {
  const db = loadKnowledge();
  if (!db.fullText) return '';
  return `[CONOCIMIENTO]\n${db.fullText}\n[/CONOCIMIENTO]\n\nUsa el conocimiento entre [CONOCIMIENTO] y [/CONOCIMIENTO] para responder preguntas. Si la pregunta no está cubierta, responde con tu conocimiento general.`;
}

// System prompt con solo secciones relevantes (modo RAG)
function getSystemPromptRAG(query) {
  const result = search(query, 3);
  if (!result.found) return '';
  const relevant = result.sections.map(s => s.content).join('\n\n');
  return `[CONTEXTO RELEVANTE]\n${relevant}\n[/CONTEXTO RELEVANTE]\n\nUsa el contexto entre [CONTEXTO RELEVANTE] y [/CONTEXTO RELEVANTE] para responder. Si no hay contexto relevante, usa tu conocimiento general.`;
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

module.exports = { loadKnowledge, search, getSystemPromptFull, getSystemPromptRAG, injectKnowledgeRAG, injectKnowledgeFull, clearCache };
