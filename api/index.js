const CSS = require('./landing-css.js');
const { renderHTML } = require('./landing-html.js');
const { renderScript } = require('./landing-js.js');
const { PUBLIC_MODELOS } = require('./models-def.js');

module.exports = async (req, res) => {
  // Serve static video from public/
  if (req.url === '/hero-bg.mp4' || req.url === '/logo.mp4') {
    const fs = require('fs');
    const fileName = req.url.slice(1);
    const p = require('path').join(__dirname, '..', 'public', fileName);
    if (fs.existsSync(p)) {
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': fs.statSync(p).size });
      fs.createReadStream(p).pipe(res);
      return;
    }
  }

  const modelos = PUBLIC_MODELOS.map(m => ({icon:m.icon, name:m.id, desc:m.desc}));
  const cardsJS = JSON.stringify(modelos);

  let html = renderHTML(cardsJS);
  // Inject CSS and JS
  html = html.replace('/*CSS*/', CSS);
  html = html.replace('<!--SCRIPTS-->', renderScript(cardsJS));

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
};
