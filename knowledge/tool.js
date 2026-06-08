// knowledge/tool.js — Tool/MCP para consultar conocimiento
const rag = require('./rag.js');

function handleToolCall(params) {
  const { action, query } = params || {};

  switch (action) {
    case 'search':
      return rag.search(query || '', 3);
    case 'get':
      return { fullText: rag.loadKnowledge().fullText };
    case 'sections':
      return { total: rag.loadKnowledge().sections.length };
    case 'reload':
      rag.clearCache();
      rag.loadKnowledge();
      return { ok: true, message: 'Conocimiento recargado' };
    default:
      return { error: `Acción desconocida: ${action}. Usa: search, get, sections, reload` };
  }
}

module.exports = { handleToolCall };
