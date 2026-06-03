const fs = require('fs');

module.exports = async (req, res) => {
  try {
    // Leer de /tmp primero (cache local)
    let db;
    try {
      db = JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8'));
    } catch(e) {
      db = { usages: [], stats: {} };
    }
    
    const githubToken = process.env.GITHUB_TOKEN || '';
    if (githubToken) {
      try {
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
        const getRes = await fetch(apiUrl, {
          headers: { 'Authorization': `token ${githubToken}` }
        });
        
        if (getRes.ok) {
          const data = await getRes.json();
          const remoteDb = JSON.parse(Buffer.from(data.content, 'base64').toString());
          
          // Merge: combinar datos remotos con locales
          if (remoteDb.usages) {
            db.usages = remoteDb.usages;
          }
          if (remoteDb.stats) {
            db.stats = remoteDb.stats;
          }
          
          // Actualizar cache local
          try {
            fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(db, null, 2));
          } catch(e) {}
        }
      } catch(e) {}
    }
    
    return res.status(200).json(db);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};