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
    console.log(`[DEBUG] GITHUB_TOKEN presente: ${!!githubToken}`);
    if (githubToken) {
      try {
        const dbContent = JSON.stringify(db, null, 2);
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
        
        console.log(`[DEBUG] Intentando guardar en: ${apiUrl}`);
        
        // Primero obtener el SHA del archivo actual (o crear si no existe)
        const getResponse = await fetch(apiUrl, {
          headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        
        console.log(`[DEBUG] GET response status: ${getResponse.status}`);
        
        let sha = '';
        if (getResponse.ok) {
          const fileData = await getResponse.json();
          sha = fileData.sha || '';
          console.log(`[DEBUG] SHA obtenido: ${sha.substring(0,7)}...`);
        } else {
          console.log(`[DEBUG] GET falló - archivo probablemente no existe`);
        }
        
        // Hacer el commit con el nuevo contenido
        const putResponse = await fetch(apiUrl, {
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
        
        console.log(`[DEBUG] PUT response status: ${putResponse.status}`);
        if (!putResponse.ok) {
          const errorText = await putResponse.text();
          console.log(`[DEBUG] PUT error: ${errorText}`);
        }
        
      } catch(e) {
        console.log(`[ERROR] Excepción en guardado GitHub: ${e.message}`);
        console.log(e.stack);
      }
    } else {
      console.log(`[WARNING] GITHUB_TOKEN vacío`);
    }
    
    return res.status(200).json({ success: true });
  } catch(e) {
    console.log(`[ERROR] Excepción general: ${e.message}`);
    return res.status(400).json({ error: e.message });
  }
};