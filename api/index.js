module.exports = async (req, res) => {
  return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>🍄 CARBONATO PROXY 🍄</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:'Press Start 2P',monospace;
  background:#5c94fc;
  color:#fff;
  min-height:100vh;
  image-rendering:pixelated;
  background-image:
    radial-gradient(circle at 10% 20%, #fff 2px, transparent 3px),
    radial-gradient(circle at 90% 80%, #fff 2px, transparent 3px),
    linear-gradient(180deg, #5c94fc 0%, #87ceeb 40%, #228b22 40%, #228b22 100%);
  background-size: 200px 200px, 300px 300px, 100% 100%;
}
.clouds{
  position:absolute;
  width:100%;
  height:150px;
  top:50px;
  z-index:0;
}
.cloud{
  position:absolute;
  background:#fff;
  border-radius:50%;
  opacity:0.9;
}
.cloud1{width:100px;height:40px;top:20px;left:10%;border-radius:50% 50% 0 0}
.cloud2{width:80px;height:35px;top:40px;left:25%;}
.cloud3{width:120px;height:45px;top:10px;left:40%;}
.cloud4{width:90px;height:38px;top:30px;left:60%;}
.cloud5{width:110px;height:42px;top:15px;left:75%;}
.container{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:30px 20px}
.header{
  text-align:center;
  margin-bottom:40px;
  padding:30px;
  background:#8b4513;
  border:4px solid #d2691e;
  box-shadow:8px 8px 0 #5d2906;
  position:relative;
  image-rendering:pixelated;
}
.header::before{
  content:"";
  position:absolute;
  top:-20px;
  left:50%;
  transform:translateX(-50%);
  width:60px;
  height:20px;
  background:#ffd700;
  border:2px solid #b8860b;
  box-shadow:2px 2px 0 #8b6508;
}
h1{
  font-size:24px;
  color:#ffd700;
  text-shadow:3px 3px 0 #b8860b;
  letter-spacing:4px;
  margin-bottom:10px;
}
.sub{
  font-size:12px;
  color:#fff;
  text-shadow:1px 1px 0 #000;
  margin-bottom:5px;
}
.version{
  font-size:10px;
  color:#ffd700;
}
.section{
  background:#deb887;
  border:3px solid #8b4513;
  padding:20px;
  margin-bottom:20px;
  position:relative;
  box-shadow:5px 5px 0 #5d2906;
}
.section::before{
  content:"🧱";
  position:absolute;
  top:-15px;
  left:10px;
  background:#8b4513;
  padding:0 8px;
  font-size:12px;
}
h2{
  font-size:14px;
  color:#8b4513;
  margin-bottom:15px;
  text-shadow:1px 1px 0 #fff;
}
h3{
  font-size:12px;
  margin:15px 0 8px;
  color:#5d2906;
}
p,li{
  font-size:11px;
  color:#4a2c2a;
  line-height:1.8;
}
ul{list-style:none;padding-left:0}
li:before{content:"🪙 ";color:#ffd700}
code{
  display:block;
  background:#000;
  border:2px solid #ffd700;
  padding:12px;
  font-size:10px;
  color:#00ff00;
  margin:8px 0;
  overflow-x:auto;
  white-space:pre-wrap;
  word-break:break-all;
  line-height:1.8;
}
.tag{
  display:inline-block;
  padding:3px 8px;
  font-size:9px;
  margin:2px;
  border:1px solid;
}
.tag-kilo{background:#ffd700;color:#8b4513;border-color:#b8860b}
.tag-zydit{background:#ff69b4;color:#fff;border-color:#ff1493}
.tag-vision{background:#9400d3;color:#fff;border-color:#8a2be2}
.tag-free{background:#00ff00;color:#000;border-color:#006400}
.model-card{
  background:#d2b48c;
  border:3px solid #8b4513;
  padding:15px;
  margin:10px 0;
  box-shadow:4px 4px 0 #5d2906;
  position:relative;
}
.model-card::before{
  content:"📦";
  position:absolute;
  top:-10px;
  right:10px;
  font-size:14px;
}
.model-card h4{
  font-size:12px;
  color:#8b4513;
  margin-bottom:8px;
}
.model-card p{
  font-size:10px;
  color:#5d2906;
  line-height:1.8;
}
.endpoint{
  background:#000;
  border:2px solid #ffd700;
  padding:10px;
  margin:8px 0;
  font-size:10px;
  color:#00ff00;
}
.method{color:#ff69b4}
.url{color:#00bfff}
table{
  width:100%;
  border-collapse:collapse;
  margin:10px 0;
}
th,td{
  border:2px solid #8b4513;
  padding:8px;
  font-size:10px;
  text-align:left;
}
th{
  background:#8b4513;
  color:#ffd700;
}
td{
  background:#deb887;
  color:#4a2c2a;
}
tr:hover td{
  background:#d2b48c;
  color:#8b4513;
}
.login-btn{
  display:block;
  width:100%;
  max-width:300px;
  margin:30px auto;
  padding:16px;
  background:#ffd700;
  border:4px solid #8b4513;
  color:#8b4513;
  font-family:'Press Start 2P',monospace;
  font-size:10px;
  cursor:pointer;
  text-align:center;
  text-decoration:none;
  text-shadow:1px 1px 0 #fff;
  box-shadow:6px 6px 0 #5d2906;
  letter-spacing:2px;
  transition:all 0.1s;
}
.login-btn:hover{
  background:#8b4513;
  color:#ffd700;
  box-shadow:0 0 15px #ffd700;
}
.login-btn:active{
  transform:translate(3px,3px);
  box-shadow:3px 3px 0 #5d2906;
}
.footer{
  text-align:center;
  margin-top:40px;
  padding:20px;
  font-size:9px;
  color:#fff;
  background:#8b4513;
  border-top:3px solid #d2691e;
}
.ground{
  position:fixed;
  bottom:0;
  left:0;
  right:0;
  height:60px;
  background:#8b4513;
  border-top:4px solid #d2691e;
  z-index:0;
}
.question-block{
  position:fixed;
  width:24px;
  height:24px;
  background:#ffd700;
  border:2px solid #b8860b;
  animation:pulse 2s infinite;
  opacity:0.3;
}
@keyframes pulse{
  0%,100%{opacity:0.3;transform:scale(1)}
  50%{opacity:0.6;transform:scale(1.1)}
}
</style>
</head>
<body>
<div class="clouds">
  <div class="cloud cloud1"></div>
  <div class="cloud cloud2"></div>
  <div class="cloud cloud3"></div>
  <div class="cloud cloud4"></div>
  <div class="cloud cloud5"></div>
</div>
<div class="ground"></div>
<div class="question-block" style="top:100px;left:5%"></div>
<div class="question-block" style="top:150px;left:80%"></div>

<div class="container">
<div class="header">
  <h1>🍄 CARBONATO PROXY 🍄</h1>
  <div class="sub">/// SUPER AI BROS GATEWAY ///</div>
  <div class="version">v4.20 // 4 POWER-UP MODELS</div>
</div>

<div class="section">
  <h2>[ QUE ES ESTO? ]</h2>
  <p>Carbonato Proxy es un gateway unificado que te permite acceder a multiples modelos de IA desde una sola URL compatible con el formato OpenAI. Collecta todos los power-ups sin salir del castillo!</p>
</div>

<div class="section">
  <h2>[ POWER-UPS DISPONIBLES ]</h2>
  
  <div class="model-card">
    <h4>🌟 modelo1</h4>
    <p><span class="tag tag-kilo">KILO</span> <span class="tag tag-free">GRATIS</span></p>
    <p>Power-Up sorpresa gratis. Los modelos pueden variar por eso son gratis. Para conversaciones y misiones normales.</p>
  </div>
  
  <div class="model-card">
    <h4>🌙 modelo2</h4>
    <p><span class="tag tag-kilo">KILO</span> <span class="tag tag-free">GRATIS</span></p>
    <p>Power-Up sorpresa gratis. Los modelos pueden variar por eso son gratis. Perfecto para misiones de codigo y tareas ninja.</p>
  </div>
  
  <div class="model-card">
    <h4>🚀 modelo3</h4>
    <p><span class="tag tag-kilo">KILO</span> <span class="tag tag-free">GRATIS</span></p>
    <p>Power-Up sorpresa gratis. Los modelos pueden variar por eso son gratis. El power-up mas poderoso para razonamiento epico!</p>
  </div>
  
  <div class="model-card">
    <h4>👁️ modelo4</h4>
    <p><span class="tag tag-zydit">ZYDIT</span> <span class="tag tag-vision">VISION</span> <span class="tag tag-free">GRATIS</span></p>
    <p>Power-Up sorpresa gratis para vision. Los modelos pueden variar por eso son gratis. Analiza imagenes como el mario con la capa roja!</p>
  </div>
</div>

<div class="section">
  <h2>[ COMO JUGAR ]</h2>
  <p>Todos los power-ups usan la misma URL base:</p>
  
  <div class="endpoint">
    <span class="method">POST</span> <span class="url">https://carbonato-proxy.vercel.app/chat/completions</span>
  </div>
  
  <h3>Conversacion normal (modelo1, modelo2, modelo3)</h3>
  <code>curl -s -X POST "https://carbonato-proxy.vercel.app/chat/completions" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "modelo1",
    "messages": [
      {"role": "user", "content": "Hola, como estas?"}
    ]
  }'</code>
  
  <h3>Vision con imagenes (modelo4)</h3>
  <code># Paso 1: Convertir imagen a base64
IMAGE_B64=$(base64 -w 0 mi_imagen.png)

# Paso 2: Usar el visor de imagenes
curl -s -X POST "https://carbonato-proxy.vercel.app/chat/completions" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "modelo4",
    "messages": [
      {
        "role": "user",
        "content": "Describe esta imagen: data:image/png;base64,'"$IMAGE_B64"'\"
      }
    ],
    "max_tokens": 300
  }'</code>
</div>

<div class="section">
  <h2>[ POWER-UP LIST ]</h2>
  <code>curl -s "https://carbonato-proxy.vercel.app/models"</code>
</div>

<a href="/api/admin" class="login-btn">[ ADMIN CASTLE ]</a>

  <div class="footer">
PIPE BROS // KILO AI PROVIDER // 4 POWER-UPS // v4.20<br>
  <span style="font-size:10px;color:#ffd700">Pagina creada con Hermes - 100% codigo libre</span>
</div>
</div>
</body>
</html>`);
};