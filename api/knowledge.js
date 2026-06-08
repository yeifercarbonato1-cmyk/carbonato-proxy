// Endpoint de conocimiento para modelo17 Cavernícola
// Modo Tool/MCP — el modelo consulta la base de conocimiento vía GET
const { queryKnowledgeTool, getKnowledgeStats } = require('../knowledge/knowledge.js');

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method;

  // GET /api/knowledge?q=consulta — buscar conocimiento
  if (method === 'GET' && path === '/api/knowledge') {
    const query = url.searchParams.get('q') || '';
    if (!query.trim()) {
      return res.status(400).json({ status: 'error', message: 'Parámetro "q" requerido' });
    }
    const result = queryKnowledgeTool(query);
    return res.status(200).json(result);
  }

  // GET /api/knowledge/stats — estadísticas
  if (method === 'GET' && path === '/api/knowledge/stats') {
    return res.status(200).json(getKnowledgeStats());
  }

  // GET /api/knowledge/all — todo el conocimiento
  if (method === 'GET' && path === '/api/knowledge/all') {
    const { getAllKnowledge } = require('../knowledge/knowledge.js');
    return res.status(200).json({ status: 'ok', entries: getAllKnowledge() });
  }

  // POST /api/knowledge — agregar entrada
  if (method === 'POST' && path === '/api/knowledge') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const { title, content, tags } = JSON.parse(body);
      if (!title || !content) {
        return res.status(400).json({ status: 'error', message: 'title y content requeridos' });
      }
      const { addEntry } = require('../knowledge/knowledge.js');
      const entry = addEntry(title, content, tags || []);
      return res.status(201).json({ status: 'ok', entry });
    } catch(e) {
      return res.status(400).json({ status: 'error', message: e.message });
    }
  }

  // DELETE /api/knowledge?id=xxx — eliminar entrada
  if (method === 'DELETE' && path === '/api/knowledge') {
    const id = url.searchParams.get('id');
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Parámetro "id" requerido' });
    }
    const { removeEntry } = require('../knowledge/knowledge.js');
    removeEntry(id);
    return res.status(200).json({ status: 'ok', removed: id });
  }

  res.status(404).json({ status: 'error', message: 'Not found' });
};
