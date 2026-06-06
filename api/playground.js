const url = require('url');

module.exports = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // POST /api/playground/chat - send message to model
  if (req.method === 'POST' && path === '/api/playground/chat') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let data;
    try { data = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON inválido' }); }

    const model = data.model || 'modelo1';
    const messages = data.messages || [];
    const stream = data.stream === true;

    if (messages.length === 0) return res.status(400).json({ error: 'Se requiere al menos 1 mensaje' });

    const BASE = process.env.BASE_URL || 'http://localhost:3456';

    if (stream) {
      // Streaming response
      const resp = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: AbortSignal.timeout(60000)
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (!resp.ok) {
        const errText = await resp.text();
        res.write(`data: ${JSON.stringify({ error: errText })}\n\n`);
        res.end();
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                res.write('data: [DONE]\n\n');
              } else {
                res.write(`data: ${dataStr}\n\n`);
              }
            }
          }
        }
      } catch(e) {
        // connection closed by client
      }
      res.end();
      return;
    }

    // Non-streaming
    try {
      const r = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
        signal: AbortSignal.timeout(60000)
      });
      const json = await r.json();
      return res.json(json);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET /api/playground - HTML interface
  if (req.method === 'GET' && path === '/api/playground') {
    return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ PLAYGROUND — CARBONATO ⎈</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.6);--border:rgba(0,255,255,0.1);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--text:#e0e0e0;--dim:#6666aa}
html,body{height:100%;overflow:hidden}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);display:flex;flex-direction:column}
.header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border);flex-shrink:0}
.header h1{font-size:16px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header .model-select{display:flex;align-items:center;gap:8px}
.header select{background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;padding:6px 10px;outline:none}
.header select:focus{border-color:var(--cyan)}
.header a{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);text-decoration:none}
.header a:hover{color:var(--cyan)}
.chat-area{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:80%;padding:12px 16px;border-radius:12px;font-size:13px;line-height:1.6;animation:fadeIn 0.3s ease}
.msg.user{align-self:flex-end;background:linear-gradient(135deg,rgba(0,255,245,0.15),rgba(123,47,247,0.15));border:1px solid rgba(0,255,245,0.2);border-bottom-right-radius:4px}
.msg.assistant{align-self:flex-start;background:var(--card);border:1px solid var(--border);border-bottom-left-radius:4px}
.msg .msg-model{font-size:8px;color:var(--dim);font-family:'JetBrains Mono',monospace;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px}
.msg .msg-content{white-space:pre-wrap;word-break:break-word}
.msg .msg-content p{margin-bottom:8px}
.msg .msg-content p:last-child{margin-bottom:0}
.typing{padding:10px 16px;font-size:11px;color:var(--dim);font-family:'JetBrains Mono',monospace;animation:pulse 1.5s ease-in-out infinite}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
.input-area{flex-shrink:0;padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:10px;align-items:flex-end}
.input-area textarea{flex:1;padding:10px 14px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'Inter',sans-serif;font-size:13px;outline:none;resize:none;max-height:150px;line-height:1.5}
.input-area textarea:focus{border-color:var(--cyan)}
.send-btn{width:44px;height:44px;border:none;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--purple));color:#000;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0}
.send-btn:hover{transform:scale(1.1);box-shadow:0 4px 20px rgba(0,255,245,0.3)}
.send-btn:disabled{opacity:0.4;cursor:wait}
.clear-btn{background:none;border:1px solid var(--border);border-radius:8px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:10px;padding:6px 12px;cursor:pointer;transition:all 0.2s}
.clear-btn:hover{color:var(--cyan);border-color:var(--cyan)}
.toolbar{display:flex;gap:6px;align-items:center}
#scrollBtn{position:fixed;bottom:80px;right:24px;width:36px;height:36px;border-radius:50%;border:1px solid var(--cyan);background:var(--card);color:var(--cyan);font-size:14px;cursor:pointer;display:none;align-items:center;justify-content:center;backdrop-filter:blur(12px);transition:all 0.2s}
#scrollBtn:hover{background:rgba(0,255,245,0.1)}
pre code{font-family:'JetBrains Mono',monospace;font-size:12px;background:rgba(0,0,0,0.4);padding:2px 6px;border-radius:4px}
</style>
</head>
<body>
<div class="header">
  <h1>⎈ PLAYGROUND</h1>
  <div class="toolbar">
    <div class="model-select">
      <span style="font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace">MODELO:</span>
      <select id="modelSelect">
        ${Array.from({length:16},(_,i) => '<option value="modelo'+(i+1)+'"'+(i===0?'selected':'')+'>modelo'+(i+1)+'</option>').join('')}
      </select>
    </div>
    <button class="clear-btn" onclick="clearChat()">✕ LIMPIAR</button>
  </div>
</div>
<div class="chat-area" id="chatArea"></div>
<div id="scrollBtn" onclick="scrollToBottom()">↓</div>
<div class="input-area">
  <textarea id="input" rows="1" placeholder="Escribí un mensaje..." onkeydown="handleKey(event)"></textarea>
  <button class="send-btn" id="sendBtn" onclick="sendMsg()">↑</button>
</div>
<script>
let messages = [];
const API = '/api/playground/chat';
let isStreaming = false;

function scrollToBottom(){const a=document.getElementById('chatArea');a.scrollTop=a.scrollHeight;}
function addMsg(role, content, model){
  const area = document.getElementById('chatArea');
  const div = document.createElement('div');
  div.className = 'msg '+role;
  div.innerHTML = (role==='assistant' ? '<div class="msg-model">'+model+'</div>' : '') + '<div class="msg-content">'+formatContent(content)+'</div>';
  area.appendChild(div);
  setTimeout(scrollToBottom,50);
  return div;
}
function formatContent(s){
  return esc(s).replace(/\\n/g,'<br>').replace(/\\t/g,'&nbsp;&nbsp;');
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function addTyping(){
  const area = document.getElementById('chatArea');
  const div = document.createElement('div');
  div.className = 'msg assistant typing';
  div.id = 'typing';
  div.innerHTML = '⟫ Pensando...';
  area.appendChild(div);
  setTimeout(scrollToBottom,50);
  return div;
}
function removeTyping(){
  const t = document.getElementById('typing');
  if(t) t.remove();
}

async function sendMsg(){
  if(isStreaming) return;
  const input = document.getElementById('input');
  const text = input.value.trim();
  if(!text) return;
  input.value = '';
  input.style.height = 'auto';

  const model = document.getElementById('modelSelect').value;
  messages.push({role:'user',content:text});
  addMsg('user', text);

  isStreaming = true;
  document.getElementById('sendBtn').disabled = true;

  const typingEl = addTyping();

  try {
    const r = await fetch(API, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model,messages,stream:false})
    });
    const d = await r.json();

    removeTyping();
    isStreaming = false;
    document.getElementById('sendBtn').disabled = false;

    if(d.error){addMsg('assistant','⛔ Error: '+d.error,model);return;}
    if(d.choices && d.choices[0] && d.choices[0].message){
      const content = d.choices[0].message.content || '';
      messages.push({role:'assistant',content});
      addMsg('assistant', content, model);
    }
  } catch(e) {
    removeTyping();
    isStreaming = false;
    document.getElementById('sendBtn').disabled = false;
    addMsg('assistant','⛔ Error: '+e.message, model);
  }
  input.focus();
}

function clearChat(){
  messages = [];
  document.getElementById('chatArea').innerHTML = '';
  document.getElementById('input').focus();
}

function handleKey(e){
  if(e.key==='Enter' && !e.shiftKey){
    e.preventDefault();
    sendMsg();
  }
  // Auto-resize
  setTimeout(()=>{
    const ta = document.getElementById('input');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  },10);
}

// Scroll button
document.getElementById('chatArea').addEventListener('scroll', function(){
  const btn = document.getElementById('scrollBtn');
  btn.style.display = (this.scrollHeight - this.scrollTop - this.clientHeight > 100) ? 'flex' : 'none';
});

// Auto-focus
document.getElementById('input').focus();
</script>
</body>
</html>`);
  }

  return res.status(404).json({ error: 'Not found' });
};
