// Upload de imágenes - convierte base64 a URL pública usando imgbb
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  
  try {
    const data = JSON.parse(body);
    
    // Soporta base64 directo o URL
    if (data.url) {
      return res.json({ success: true, url: data.url });
    }
    
    if (!data.base64) {
      return res.status(400).json({ error: 'Se requiere base64 o url' });
    }
    
    // Extraer el base64 sin el prefijo data:image/...
    let base64Data = data.base64;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Usar imgbb para subir la imagen (API key gratuita)
    const imgbbKey = process.env.IMGBB_API_KEY || '';
    
    if (!imgbbKey) {
      // Si no hay API key, devolver el data URL directamente
      // Pollinations puede manejar data URLs en algunos casos
      const mimeType = data.mimetype || 'image/png';
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      return res.json({ 
        success: true, 
        url: dataUrl,
        note: 'Usando data URL. Para mejores resultados configurar IMGBB_API_KEY'
      });
    }
    
    // Subir a imgbb
    const formData = new FormData();
    formData.append('image', base64Data);
    
    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: 'POST',
      body: formData
    });
    
    const imgbbData = await imgbbRes.json();
    
    if (imgbbData.data && imgbbData.data.url) {
      return res.json({
        success: true,
        url: imgbbData.data.url,
        delete_url: imgbbData.data.delete_url
      });
    }
    
    return res.status(500).json({ error: 'Error al subir imagen' });
    
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};