// api/knowledge.js — Endpoint de conocimiento
// GET  /api/knowledge?q=consulta    → RAG search
// POST /api/knowledge               → Tool/MCP call
// GET  /api/knowledge/dump          → Conocimiento completo

const rag = require('../knowledge/rag.js');
const tool = require('../knowledge/tool.js');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  // GET /api/knowledge?q=... → RAG search
  if (pathname === '/api/knowledge' && method === 'GET') {
    const query = url.searchParams.get('q') || '';
    if (!query) {
      const db = rag.loadKnowledge();
      return res.status(200).json({
        ok: true,
        totalSections: db.sections.length,
        message: 'Usa ?q=consulta para buscar conocimiento'
      });
    }
    const result = rag.search(query);
    return res.status(200).json({ ok: true, ...result });
  }

  // GET /api/knowledge/dump → contenido completo
  if (pathname === '/api/knowledge/dump' && method === 'GET') {
    const db = rag.loadKnowledge();
    return res.status(200).json({ ok: true, fullText: db.fullText, totalSections: db.sections.length });
  }

  // POST /api/knowledge → Tool/MCP
  if (pathname === '/api/knowledge' && method === 'POST') {
    let body = {};
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length > 0) body = JSON.parse(Buffer.concat(chunks).toString());
    } catch(e) {
      return res.status(400).json({ error: 'JSON inválido' });
    }
    const result = tool.handleToolCall(body);
    return res.status(200).json({ ok: true, ...result });
  }

  res.status(404).json({ error: 'Not found. Usa GET /api/knowledge?q=consulta o POST /api/knowledge' });
};
