const fs = require('fs');
const path = require('path');

const KNOWLEDGE_PATH = path.join(__dirname, 'knowledge.json');

// ─── Cargar base de conocimiento ───
function loadKnowledge() {
  try {
    return JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, 'utf8'));
  } catch(e) {
    return { entries: [], metadata: { version: 1 } };
  }
}

// ─── Guardar base de conocimiento ───
function saveKnowledge(kb) {
  kb.metadata.updated = new Date().toISOString();
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(kb, null, 2));
}

// ─── Buscar conocimiento relevante (RAG simple) ───
function searchKnowledge(query, limit = 3) {
  const kb = loadKnowledge();
  if (!kb.entries || kb.entries.length === 0) return [];

  const q = query.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, '');
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored = kb.entries.map(entry => {
    const text = (entry.title + ' ' + entry.content + ' ' + (entry.tags || []).join(' ')).toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (text.includes(term)) score++;
      // Bonus por match en título
      if (entry.title.toLowerCase().includes(term)) score += 2;
    }
    return { ...entry, score };
  });

  return scored
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── Obtener todo el conocimiento ───
function getAllKnowledge() {
  return loadKnowledge().entries || [];
}

// ─── Agregar entrada ───
function addEntry(title, content, tags = []) {
  const kb = loadKnowledge();
  kb.entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    content,
    tags,
    created: new Date().toISOString()
  });
  saveKnowledge(kb);
  return kb.entries[kb.entries.length - 1];
}

// ─── Eliminar entrada ───
function removeEntry(id) {
  const kb = loadKnowledge();
  kb.entries = kb.entries.filter(e => e.id !== id);
  saveKnowledge(kb);
}

// ─── Inyectar conocimiento en mensajes (modo RAG) ───
function injectKnowledgeRAG(messages, query, limit = 3) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) return messages;

  const results = searchKnowledge(query, limit);
  if (results.length === 0) return messages;

  const contextStr = results.map(r => {
    return `📖 ${r.title}:\n${r.content}`;
  }).join('\n\n---\n\n');

  const knowledgeMsg = {
    role: 'system',
    content: `[CONTEXTO RECUPERADO]\n${contextStr}\n\nUsa este conocimiento solo si es relevante para la pregunta. Si no hay relación, ignóralo.`
  };

  return [...messages, knowledgeMsg];
}

// ─── Inyectar conocimiento completo en mensajes (modo system prompt gigante) ───
function injectKnowledgeFull(messages) {
  const all = getAllKnowledge();
  if (all.length === 0) return messages;

  const contextStr = all.map(r => {
    return `📖 ${r.title}:\n${r.content}`;
  }).join('\n\n---\n\n');

  const knowledgeMsg = {
    role: 'system',
    content: `[BASE DE CONOCIMIENTO COMPLETA]\n\n${contextStr}\n\nTienes acceso a toda esta base de conocimiento. Úsala cuando sea pertinente.`
  };

  return [...messages, knowledgeMsg];
}

// ─── Obtener conocimiento para endpoint Tool/MCP ───
function queryKnowledgeTool(query) {
  const results = searchKnowledge(query, 5);
  return {
    status: 'ok',
    total: results.length,
    results: results.map(r => ({
      title: r.title,
      content: r.content,
      tags: r.tags || []
    }))
  };
}

// ─── Obtener stats de la base ───
function getKnowledgeStats() {
  const kb = loadKnowledge();
  return {
    total_entries: kb.entries.length,
    last_updated: kb.metadata.updated,
    version: kb.metadata.version
  };
}

module.exports = {
  loadKnowledge,
  saveKnowledge,
  searchKnowledge,
  getAllKnowledge,
  addEntry,
  removeEntry,
  injectKnowledgeRAG,
  injectKnowledgeFull,
  queryKnowledgeTool,
  getKnowledgeStats
};
