// Landing page CSS — monocromo blanco/negro con opacidades variables
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.7);--border:rgba(255,255,255,0.08);--text:rgba(255,255,255,0.85)}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
.hero-video{position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:0;pointer-events:none;opacity:0.4}
.video-overlay{position:fixed;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(10,10,15,0.85) 0%,rgba(10,10,15,0.6) 50%,rgba(10,10,15,0.9) 100%)}
.glow-orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;animation:orbFloat 20s ease-in-out infinite}
.glow-orb-1{width:400px;height:400px;background:rgba(255,255,255,0.03);top:-100px;left:-100px;animation-delay:0s}
.glow-orb-2{width:300px;height:300px;background:rgba(255,255,255,0.02);bottom:-50px;right:-50px;animation-delay:-7s}
.glow-orb-3{width:250px;height:250px;background:rgba(255,255,255,0.015);top:50%;left:60%;animation-delay:-14s}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-30px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}}
.container{position:relative;z-index:1;max-width:800px;margin:0 auto;padding:24px 16px 60px}
.hero{text-align:center;padding:40px 16px 24px;position:relative}
.hero-text{text-align:center}
.hero-badge{display:inline-block;padding:4px 14px;border:1px solid rgba(255,255,255,0.6);border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:8px;letter-spacing:2px;text-transform:uppercase;animation:glowPulse 3s ease-in-out infinite}
.logo-video{position:absolute;left:40px;top:50%;transform:translateY(-50%);width:100px;height:100px;object-fit:cover;border-radius:50%;border:1px solid rgba(255,255,255,0.08);opacity:0.85}
@keyframes glowPulse{0%,100%{box-shadow:0 0 10px rgba(0,255,245,0.2)}50%{box-shadow:0 0 25px rgba(0,255,245,0.5)}}
@keyframes wobbleCard{0%,100%{transform:scale(1) rotate(0deg)}15%{transform:scale(1.02) rotate(-1.5deg)}30%{transform:scale(0.98) rotate(1deg)}45%{transform:scale(1.01) rotate(-0.5deg)}60%{transform:scale(0.99) rotate(0.8deg)}75%{transform:scale(1.01) rotate(-0.3deg)}}
@keyframes bounceIcon{0%,100%{transform:translateY(0)}25%{transform:translateY(-6px) rotate(-5deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-3px) rotate(5deg)}}
@keyframes glitchText{0%,100%{opacity:1;transform:translateX(0)}10%{opacity:0.7;transform:translateX(-2px)}12%{opacity:1;transform:translateX(0)}20%{opacity:0.8;transform:translateX(1px)}22%{opacity:1;transform:translateX(0)}}
@keyframes floatCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes breathe{0%,100%{opacity:0.85}50%{opacity:1}}
@keyframes tiltPulse{0%,100%{transform:rotate(0deg)}25%{transform:rotate(0.5deg)}75%{transform:rotate(-0.5deg)}}
.hero{animation:floatCard 4s ease-in-out infinite}
.hero-badge{animation:breathe 3s ease-in-out infinite}
.logo-video{animation:breathe 4s ease-in-out infinite}
.carousel-slide.active{animation:floatCard 5s ease-in-out infinite}
.carousel-btn{animation:tiltPulse 3s ease-in-out infinite}
.code-block{animation:floatCard 6s ease-in-out infinite;transition:all 0.3s}
.code-block:hover{animation:glitchText 0.5s ease-in-out}
.cta-btn{animation:breathe 4s ease-in-out infinite;transition:all 0.3s}
.cta-btn:hover{animation:glitchText 0.3s ease-in-out}
.comp-select{animation:tiltPulse 4s ease-in-out infinite}
.comp-btn{animation:breathe 3s ease-in-out infinite}
.comp-btn:hover{transform:scale(1.05)}
.comp-result{animation:floatCard 6s ease-in-out infinite}
.comp-result:nth-child(odd){animation-delay:-2s}
.footer{animation:breathe 6s ease-in-out infinite}
.hero h1{font-size:clamp(28px,5vw,48px);font-weight:800;background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.6) 40%,rgba(255,255,255,0.5) 70%,rgba(255,255,255,0.4) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px;margin-bottom:8px;line-height:1.1}
.hero .sub{font-family:'JetBrains Mono',monospace;font-size:clamp(11px,1.5vw,14px);color:rgba(255,255,255,0.35);letter-spacing:4px;margin-bottom:4px}
.hero .version{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:1px}
.hero .version span{color:rgba(255,255,255,0.55)}
.desc{font-size:14px;line-height:1.7;color:var(--text);opacity:0.7;text-align:center;margin-bottom:24px;padding:0 12px}
.desc strong{color:rgba(255,255,255,0.6);opacity:1}
.carousel-wrap{position:relative;margin:0 auto 32px;max-width:600px;margin-left:-50px}
.carousel-viewport{position:relative;overflow:hidden;border-radius:12px;height:100px;max-width:520px}
.carousel-track{position:relative;height:100%}
.carousel-slide{position:absolute;inset:0;display:flex;align-items:center;gap:16px;padding:16px 20px;background:var(--card);border:1px solid var(--border);border-radius:12px;backdrop-filter:blur(12px);opacity:0;transform:scale(0.92);transition:all 0.6s cubic-bezier(0.16,1,0.3,1);pointer-events:none}
.carousel-slide.active{opacity:1;transform:scale(1);pointer-events:auto}
.carousel-slide.exit{opacity:0;transform:scale(0.92) translateY(-8px)}
.carousel-slide .icon{font-size:28px;flex-shrink:0}
.carousel-slide .info{flex:1;min-width:0}
.carousel-slide .info h4{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;margin-bottom:2px}
.carousel-slide .info p{font-size:12px;opacity:0.6;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.carousel-dots{display:flex;justify-content:center;gap:6px;margin-top:10px;flex-wrap:wrap;padding:0 16px}
.carousel-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.35);border:none;cursor:pointer;transition:all 0.3s;padding:0;flex-shrink:0}
.carousel-dot.active{background:rgba(255,255,255,0.6);box-shadow:0 0 8px rgba(0,255,245,0.4);width:20px;border-radius:3px}
.carousel-dot:hover{background:rgba(255,255,255,0.6)}
.carousel-controls{display:flex;justify-content:center;gap:12px;margin-top:6px}
.carousel-btn{background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;transition:all 0.2s}
.carousel-btn:hover{background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.6);color:rgba(255,255,255,0.6)}
.status-bar{display:flex;justify-content:center;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:20px}
.status-bar .num{color:rgba(255,255,255,0.6)}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:rgba(255,255,255,0.35);font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:3px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)}
.section{margin-bottom:28px}
.grid-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;margin-left:-20px}
.grid-left,.grid-right{display:flex;flex-direction:column}
.section-title{font-size:14px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title::before{content:'◆';font-size:10px;color:rgba(255,255,255,0.5)}
.section p{font-size:13px;line-height:1.6;color:var(--text);opacity:0.7}
.endpoint-display{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin:10px 0;font-family:'JetBrains Mono',monospace;font-size:12px}
.endpoint-display .method{color:rgba(255,255,255,0.55);font-weight:700;flex-shrink:0}
.endpoint-display .url{color:rgba(255,255,255,0.6);word-break:break-all;font-size:11px}
.endpoint-display .copy-hint{margin-left:auto;font-size:9px;color:rgba(255,255,255,0.35);cursor:pointer;padding:2px 6px;border-radius:4px;flex-shrink:0;transition:all 0.2s}
.endpoint-display .copy-hint:hover{background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.6)}
.code-block{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin:8px 0;position:relative;font-size:11px}
.code-block .lang{position:absolute;top:6px;right:8px;font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(255,255,255,0.35);letter-spacing:1px}
.code-block code{display:block;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5;color:rgba(255,255,255,0.55);white-space:pre-wrap;word-break:break-all;margin-top:4px}
.code-block .method{color:rgba(255,255,255,0.5);font-weight:700}
.code-block .url{color:rgba(255,255,255,0.6)}
.code-block .prompt-line{color:rgba(255,255,255,0.35)}
.code-block .string{color:rgba(255,255,255,0.5)}
h3{font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,0.6);margin:16px 0 6px;letter-spacing:1px}
.footer{text-align:center;padding:24px 0;border-top:1px solid rgba(255,255,255,0.08);margin-top:32px}
.footer-text{font-size:10px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace;margin:2px 0}
.footer-sub{font-size:9px;color:rgba(255,255,255,0.15);font-family:'JetBrains Mono',monospace;margin:2px 0}
.admin-link{color:rgba(255,255,255,0.25);text-decoration:none;transition:all 0.2s;font-size:11px}
.admin-link:hover{color:rgba(255,255,255,0.6)}
.cursor-blink::after{content:'▋';animation:blink 1s step-end infinite;color:rgba(255,255,255,0.6)}
@keyframes blink{50%{opacity:0}}
.cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:24px 0}
.cta-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;text-decoration:none;transition:all 0.3s;letter-spacing:1px}
.cta-btn:first-child{background:linear-gradient(135deg,rgba(255,255,255,0.6),rgba(255,255,255,0.4));color:#000;border:none}
.cta-btn:first-child:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,255,245,0.3)}
.cta-btn:last-child{border:1px solid var(--border);color:var(--text);background:var(--card);backdrop-filter:blur(12px)}
.cta-btn:last-child:hover{border-color:rgba(255,255,255,0.6);color:rgba(255,255,255,0.6);background:rgba(0,255,245,0.04)}
.stat-pulse{display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.55);margin-right:4px;animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
@media(max-width:640px){.container{padding:16px 12px 40px}.hero{padding:24px 12px 16px}.carousel-wrap{max-width:100%}.carousel-viewport{height:90px}.carousel-slide{gap:12px;padding:12px 16px}}
.comp-wrap{max-width:600px;margin:24px auto 0;padding:16px 20px;background:var(--card);border:1px solid var(--border);border-radius:12px;backdrop-filter:blur(12px)}
.comp-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:4px;display:block}
.comp-selects{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.comp-select{flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.8);outline:none}
.comp-select:focus{border-color:rgba(255,255,255,0.3)}
.comp-select option{background:#0a0a0f;color:rgba(255,255,255,0.8)}
.comp-textarea{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:10px 12px;font-family:'Inter',sans-serif;font-size:13px;color:rgba(255,255,255,0.85);resize:vertical;min-height:60px;outline:none;box-sizing:border-box;flex:1}
.comp-textarea:focus{border-color:rgba(255,255,255,0.3)}
.comp-btn{display:block;padding:10px;border:none;border-radius:6px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s;letter-spacing:1px}
.comp-btn:hover{background:rgba(255,255,255,0.2)}
.comp-btn:disabled{opacity:0.3;cursor:not-allowed}
.comp-prompt-row{display:flex;gap:8px;align-items:flex-start}
.comp-prompt-row .comp-btn{flex-shrink:0;padding:10px 20px;margin:0}
.comp-status{text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);margin-top:8px;min-height:18px}
.comp-results{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.comp-card{border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 14px;background:rgba(255,255,255,0.02)}
.comp-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.comp-card-model{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6)}
.comp-card-latency{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,0.3)}
.comp-card-badge{font-size:9px;padding:1px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace}
.comp-card-badge-1{background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9)}
.comp-card-badge-2{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6)}
.comp-card-badge-3{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.4)}
.comp-card-content{font-size:13px;line-height:1.5;color:rgba(255,255,255,0.75);max-height:200px;overflow-y:auto;word-break:break-word}
.comp-card-error{font-size:11px;color:rgba(255,255,255,0.3);font-style:italic}
.comp-card-fastest{border-color:rgba(255,255,255,0.25)}
`;

module.exports = CSS;
