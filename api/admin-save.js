const fs = require('fs');

module.exports = async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const config = JSON.parse(body);
    
    // Guardar en /tmp para uso inmediato
    try {
      fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(config, null, 2));
    } catch(e) {}
    
    // Usar GitHub API para hacer commit - repo proxi-datos
    const githubToken = process.env.GITHUB_TOKEN || '';
    if (githubToken) {
      try {
        const configContent = JSON.stringify(config, null, 2);
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json';
        
        // Primero obtener el SHA del archivo actual (o crear si no existe)
        const getResponse = await fetch(apiUrl, {
          headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        
        let sha = '';
        if (getResponse.ok) {
          const fileData = await getResponse.json();
          sha = fileData.sha || '';
        }
        
        // Hacer el commit con el nuevo contenido
        await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Update config via panel',
            content: Buffer.from(configContent).toString('base64'),
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