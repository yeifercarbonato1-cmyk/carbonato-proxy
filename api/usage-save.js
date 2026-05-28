const fs = require('fs');

module.exports = async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const db = JSON.parse(body);
    
    // Guardar en /tmp para uso inmediato
    try {
      fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(db, null, 2));
    } catch(e) {}
    
    // Usar GitHub API para hacer commit (necesita GITHUB_TOKEN)
    const githubToken = process.env.GITHUB_TOKEN || '';
    if (githubToken) {
      try {
        const dbContent = JSON.stringify(db, null, 2);
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
        
        // Primero obtener el SHA del archivo actual
        const getResponse = await fetch(apiUrl, {
          headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        const fileData = await getResponse.json();
        const sha = fileData.sha || '';
        
        // Hacer el commit con el nuevo contenido
        await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Update usage stats',
            content: Buffer.from(dbContent).toString('base64'),
            sha: sha
          })
        });
      } catch(e) {}
    }
    
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(400).json({ error: e.message });
  }
};