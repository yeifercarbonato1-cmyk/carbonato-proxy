const fs = require('fs');

module.exports = async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const newData = JSON.parse(body);
    
    // Cargar datos actuales desde GitHub (si hay token)
    const githubToken = process.env.GITHUB_TOKEN || '';
    let db = { usages: [], stats: {} };
    
    if (githubToken) {
      try {
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
        const getResponse = await fetch(apiUrl, {
          headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        
        if (getResponse.ok) {
          const fileData = await getResponse.json();
          db = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
        }
      } catch(e) {}
    }
    
    // Añadir nuevos usos al historial (si es array)
    if (Array.isArray(newData.usages)) {
      db.usages.push(...newData.usages);
    } else if (newData.usages) {
      db.usages.push(newData.usages);
    }
    
    // Actualizar estadísticas (sumar)
    if (newData.stats) {
      for (const [model, stats] of Object.entries(newData.stats)) {
        if (!db.stats[model]) {
          db.stats[model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
        }
        db.stats[model].totalTokens += stats.totalTokens || 0;
        db.stats[model].totalRequests += stats.totalRequests || 0;
        // Añadir IPs únicas
        if (Array.isArray(stats.uniqueIPs)) {
          for (const ip of stats.uniqueIPs) {
            if (!db.stats[model].uniqueIPs.includes(ip)) {
              db.stats[model].uniqueIPs.push(ip);
            }
          }
        }
      }
    }
    
    const dbContent = JSON.stringify(db, null, 2);
    
    // Guardar en /tmp para uso inmediato (puede no persistir)
    try {
      fs.writeFileSync('/tmp/usage-db.json', dbContent);
    } catch(e) {}
    
    // Usar GitHub API para hacer commit
    if (githubToken) {
      try {
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
        
        // Obtener SHA actual
        let sha = '';
        try {
          const getSha = await fetch(apiUrl, {
            headers: { 'Authorization': `token ${githubToken}` }
          });
          if (getSha.ok) {
            const fileData = await getSha.json();
            sha = fileData.sha || '';
          }
        } catch(e) {}
        
        // PUT actualizado
        await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Update usage stats - ${db.usages.length} records`,
            content: Buffer.from(dbContent).toString('base64'),
            sha: sha
          })
        });
      } catch(e) {}
    }
    
    return res.status(200).json({ success: true, count: db.usages.length });
  } catch(e) {
    return res.status(400).json({ error: e.message });
  }
};