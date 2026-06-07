// Landing page JS — carrusel de modelos + competencia
function renderScript(cardsJS) {
  return `<script>
const modelos = ${cardsJS};
let current = 0;
let autoplay = null;
const INTERVALO = 3000;

const track = document.getElementById('track');
const dotsEl = document.getElementById('dots');

function renderSlide(i, className) {
  const m = modelos[i];
  return \`<div class="carousel-slide \${className}">
    <span class="icon">\${m.icon}</span>
    <div class="info">
      <h4>\${m.name}</h4>
      <p>\${m.desc}</p>
    </div>
  </div>\`;
}

function render() {
  const prev = (current - 1 + modelos.length) % modelos.length;
  const next = (current + 1) % modelos.length;
  track.innerHTML = renderSlide(prev, 'exit') + renderSlide(current, 'active') + renderSlide(next, '');
  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === current);
  });
}

function goTo(idx) {
  if (idx === current) return;
  current = idx;
  render();
  resetAutoplay();
}

function goNext() {
  current = (current + 1) % modelos.length;
  render();
  resetAutoplay();
}

function goPrev() {
  current = (current - 1 + modelos.length) % modelos.length;
  render();
  resetAutoplay();
}

function resetAutoplay() {
  if (autoplay) clearInterval(autoplay);
  autoplay = setInterval(goNext, INTERVALO);
}

for (let i = 0; i < modelos.length; i++) {
  const dot = document.createElement('button');
  dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
  dot.onclick = () => goTo(i);
  dotsEl.appendChild(dot);
}

render();
autoplay = setInterval(goNext, INTERVALO);

document.getElementById('prevBtn').onclick = goPrev;
document.getElementById('nextBtn').onclick = goNext;

document.querySelector('.carousel-wrap').addEventListener('mouseenter', () => {
  if (autoplay) clearInterval(autoplay);
  autoplay = null;
});
document.querySelector('.carousel-wrap').addEventListener('mouseleave', () => {
  if (!autoplay) autoplay = setInterval(goNext, INTERVALO);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') goPrev();
  if (e.key === 'ArrowRight') goNext();
});

// === COMPETENCIA ===
function fillSelects() {
  for (let i = 1; i <= 3; i++) {
    const sel = document.getElementById('comp' + i);
    if (!sel) return;
    sel.innerHTML = modelos.map((m, j) => '<option value="' + j + '">' + m.icon + ' ' + m.name + ' — ' + m.desc + '</option>').join('');
    sel.selectedIndex = i - 1;
  }
}
fillSelects();

document.getElementById('compBtn').onclick = async function() {
  const btn = this;
  const status = document.getElementById('compStatus');
  const results = document.getElementById('compResults');
  const prompt = document.getElementById('compPrompt').value.trim();
  if (!prompt) { status.textContent = '✗ Escribe un prompt'; return; }

  const idxs = [1,2,3].map(i => parseInt(document.getElementById('comp' + i).value));
  const models = idxs.map(i => modelos[i].name);

  btn.disabled = true;
  btn.textContent = '⟫ COMPITIENDO... ⟪';
  status.textContent = 'Enviando a ' + models.join(', ') + '...';
  results.innerHTML = '';

  const promises = models.map(async (model) => {
    const t0 = performance.now();
    try {
      const r = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model, messages: [{role:'user',content:prompt}]})
      });
      const t1 = performance.now();
      const latency = (t1 - t0).toFixed(0);
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        return {model, latency, error: r.status + ' ' + errText.slice(0,100)};
      }
      const data = await r.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || JSON.stringify(data).slice(0,200);
      return {model, latency, content, tokens: data.usage?.total_tokens || 0};
    } catch(e) {
      return {model, latency: '-', error: e.message};
    }
  });

  const compResults = await Promise.all(promises);

  const sorted = [...compResults].sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return (parseInt(a.latency) || 99999) - (parseInt(b.latency) || 99999);
  });

  const labels = ['#1 MÁS RÁPIDO', '#2', '#3'];
  const badgeCls = ['comp-card-badge-1 comp-card-fastest', 'comp-card-badge-2', 'comp-card-badge-3'];

  results.innerHTML = sorted.map((r, i) => {
    const m = modelos.find(m => m.name === r.model) || {icon:'⚡',name:r.model};
    return '<div class="comp-card' + (i === 0 ? ' comp-card-fastest' : '') + '">' +
      '<div class="comp-card-head">' +
        '<span class="comp-card-model">' + m.icon + ' ' + r.model + '</span>' +
        '<span class="comp-card-badge ' + badgeCls[i] + '">' + labels[i] + '</span>' +
      '</div>' +
      '<div class="comp-card-head" style="margin-bottom:8px">' +
        '<span class="comp-card-latency">⏱ ' + (r.error ? '-' : r.latency + 'ms') + (r.tokens ? '  · ' + r.tokens + ' tokens' : '') + '</span>' +
      '</div>' +
      (r.error ? '<div class="comp-card-error">✗ ' + r.error + '</div>' : '<div class="comp-card-content">' + r.content.slice(0,500) + '</div>') +
    '</div>';
  }).join('');

  status.textContent = '✅ Competencia completa — ' + sorted.length + ' resultados';
  btn.disabled = false;
  btn.textContent = '⟫ COMPETIR ⟪';
};

document.getElementById('compPrompt').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('compBtn').click();
  }
});
</script>`;
}

module.exports = { renderScript };
