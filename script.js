// Common util: base64 encode/decode for URL-safe strings
function encodeData(obj){
  const s = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeData(str){
  try{
    str = str.replace(/-/g,'+').replace(/_/g,'/');
    while(str.length % 4) str += '=';
    const json = decodeURIComponent(escape(atob(str)));
    return JSON.parse(json);
  }catch(e){return null}
}

/* Small helper: show confetti briefly */
function showConfetti(){
  const conf = document.createElement('div'); conf.className='confetti';
  for(let i=0;i<24;i++){
    const c = document.createElement('div'); c.className='c';
    c.style.left = Math.random()*100 + '%';
    c.style.background = ['#e63946','#ff6b6b','#d62828','#ff4757'][Math.floor(Math.random()*4)];
    c.style.transform = `translateY(-20vh) rotate(${Math.random()*360}deg)`;
    c.style.animationDelay = (Math.random()*0.4)+'s';
    c.style.width = (8+Math.random()*8)+'px';
    c.style.height = (10+Math.random()*10)+'px';
    conf.appendChild(c);
  }
  document.body.appendChild(conf);
  setTimeout(()=>conf.remove(),2600);
}

// index.html behaviour
if(document.getElementById('wishForm')){
  const toName = document.getElementById('toName');
  const message = document.getElementById('message');
  // quote input is optional in the markup; handle if it's missing
  const quote = document.getElementById('quote');
  const fromName = document.getElementById('fromName');
  const generate = document.getElementById('generate');
  const preview = document.getElementById('preview');
  const shareWA = document.getElementById('shareWA');
  const result = document.getElementById('result');
  const shareLink = document.getElementById('shareLink');
  const copy = document.getElementById('copy');
  const open = document.getElementById('open');
  const emojiPanel = document.getElementById('emojiPanel');

  // emoji clicks -> append to message
  if(emojiPanel){
    emojiPanel.addEventListener('click', e=>{
      if(e.target.classList.contains('emoji')){
        message.value += (message.value ? ' ' : '') + e.target.textContent;
      }
    });
  }

  function buildLink(){
    const payload = {to:toName.value.trim(),message:message.value.trim(),quote:(quote ? quote.value : ''),from:fromName.value.trim(),t:Date.now()}
    const token = encodeData(payload);
    // Use URL constructor so relative/absolute resolution works correctly on the web and file://
    const url = new URL('wish.html?d=' + token, location.href).href;
    return {url,token,payload};
  }

  generate.addEventListener('click',()=>{
    const {url, token, payload} = buildLink();
    result.classList.remove('hidden');
    shareLink.value = url;
    showConfetti();
    // debug panel removed — no direct-token UI shown
  });

  preview.addEventListener('click',()=>{
    // Navigate directly to the wish viewer (avoid popup blockers)
    const {url} = buildLink();
    location.href = url;
  });

  shareWA && shareWA.addEventListener('click',async ()=>{
    const {url, payload} = buildLink();
    // Prefer Web Share API when available (mobile)
    if(navigator.share){
      try{ await navigator.share({title: `A Valentine wish for ${payload.to||'you'}`, text: payload.message || '', url}); return; }catch(_){}
    }
    // Fallback to WhatsApp Web / App share URL
    const text = encodeURIComponent(url);
    window.open('https://wa.me/?text='+text, '_blank');
  });

  copy && copy.addEventListener('click',()=>{
    shareLink.select();
    document.execCommand('copy');
  });

  open && open.addEventListener('click',()=>{
    // Use same-window navigation to avoid popup blockers while testing locally
    location.href = shareLink.value;
  });
}

// Floating CTA click handler (opens Instagram or configured target)
const cta = document.getElementById('ctaIg');
if(cta){
  cta.addEventListener('click', (e)=>{
    e.preventDefault();
    const url = cta.dataset.target || 'https://instagram.com';
    window.open(url, '_blank', 'noopener');
  });
}

// --- Inline preview rendering (used by index.html) ---
function renderInlinePreview(data, token, url){
  const card = document.getElementById('previewCard');
  if(!card) { location.href = url; return; }
  document.getElementById('previewTo').textContent = data.to ? `To: ${data.to}` : 'To: You';
  document.getElementById('previewQuote').textContent = data.quote || '';
  const imgEl = document.getElementById('previewImg');
  if(data.img){ imgEl.src = data.img; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
  document.getElementById('previewMessage').textContent = data.message || '';
  document.getElementById('previewFrom').textContent = data.from ? `— ${data.from}` : '— (an anonymous friend)';
  card.classList.remove('hidden');
  // wire preview download/open buttons
  document.getElementById('previewOpen').onclick = ()=> { location.href = url; };
  document.getElementById('previewDownload').onclick = ()=>{
    // reuse wish.html's rendering logic by creating a temporary canvas render similar to download flow
    const w = 900, h = 900; const cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h; const ctx = cnv.getContext('2d');
    const grad = ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,'#2b002e'); grad.addColorStop(1,'#120018'); ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    const drawAndFinish = ()=>{ ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='36px Poppins, serif'; ctx.fillStyle='#ffd6e8'; ctx.fillText((data.to?`To: ${data.to}`:'To: You'), w/2, 520); ctx.font='24px Poppins, serif'; ctx.fillStyle='#fff'; wrapText(ctx, data.message||'', w/2, 560, 760, 34); if(data.from) { ctx.font='22px Poppins, serif'; ctx.fillStyle='#ffdcee'; ctx.fillText('— ' + data.from, w/2, 820); } cnv.toBlob((blob)=>{ const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=u; a.download='valentine-wish.png'; a.click(); URL.revokeObjectURL(u); },'image/png'); };
    if(data.img){ const img = new Image(); img.onload = ()=>{ const iw=img.width, ih=img.height; const maxW = w-160; const sw = Math.min(maxW, iw); const sh = (sw/iw)*ih; ctx.save(); ctx.beginPath(); roundRect(ctx,80,60,sw,360,20); ctx.clip(); ctx.drawImage(img,80,60,sw,360); ctx.restore(); drawAndFinish(); }; img.onerror = ()=> drawAndFinish(); img.src = data.img; } else drawAndFinish();
  };
}

// wish.html behaviour: decode and render
if(document.getElementById('wishCard') || document.getElementById('error')){
  const params = new URLSearchParams(location.search);
  const d = params.get('d');
  const data = d ? decodeData(d) : null;
  const card = document.getElementById('wishCard');
  const err = document.getElementById('error');
  if(!data){ err.classList.remove('hidden'); }
  else{
    document.getElementById('toHeading').textContent = (data.to ? `To: ${data.to}` : 'To: You');
    document.getElementById('quoteLine').textContent = data.quote || '';
    document.getElementById('messageText').textContent = data.message || '';
    if(data.from) document.getElementById('fromLine').textContent = '— ' + data.from;
    card.classList.remove('hidden');

    // if there is an image, show it
    if(data.img){
      const img = document.createElement('img'); img.src = data.img; img.alt='Attached image';
      img.style.maxWidth='100%'; img.style.borderRadius='12px'; img.style.margin='8px 0 16px';
      card.insertBefore(img, card.firstChild);
    }

    // celebration when viewing
    showConfetti();

    // Download as image: simple canvas render (includes image when present)
    const dlBtn = document.getElementById('downloadBtn');
    if(dlBtn) dlBtn.addEventListener('click',()=>{
      const w = 900, h = 900;
      const cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext('2d');
      // background gradient
      const grad = ctx.createLinearGradient(0,0,0,h);
      grad.addColorStop(0,'#2b002e'); grad.addColorStop(1,'#120018');
      ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);

      // if image exists, draw it centered top
      const drawAndFinish = ()=>{
        ctx.fillStyle = '#fff'; ctx.textAlign='center';
        ctx.font = '36px Poppins, serif'; ctx.fillStyle='#ffd6e8'; ctx.fillText((data.to ? `To: ${data.to}` : 'To: You'), w/2, 520);
        ctx.font='24px Poppins, serif'; ctx.fillStyle='#fff'; wrapText(ctx, data.message || '', w/2, 560, 760, 34);
        if(data.from) { ctx.font='22px Poppins, serif'; ctx.fillStyle='#ffdcee'; ctx.fillText('— ' + data.from, w/2, 820); }
        cnv.toBlob((blob)=>{ const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='valentine-wish.png'; a.click(); URL.revokeObjectURL(url); },'image/png');
      };

      if(data.img){
        const img = new Image(); img.crossOrigin='anonymous'; img.onload = ()=>{
          // draw image scaled
          const iw = img.width, ih = img.height; const maxW = w-160; const sw = Math.min(maxW, iw); const sh = (sw/iw)*ih;
          ctx.save(); ctx.beginPath(); roundRect(ctx, 80, 60, sw, 360, 20); ctx.clip(); ctx.drawImage(img, 80, 60, sw, 360); ctx.restore();
          drawAndFinish();
        }; img.onerror = ()=> drawAndFinish(); img.src = data.img;
      } else drawAndFinish();
    });

    const backBtn = document.getElementById('back');
    if(backBtn) backBtn.addEventListener('click',()=> window.location.href='index.html');

    const homeBtn = document.getElementById('homeBtn');
    if(homeBtn) homeBtn.addEventListener('click',()=> window.location.href='index.html');
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = text.split(' ');
  let line = '';
  for(let n=0;n<words.length;n++){
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if(metrics.width > maxWidth && n>0){ ctx.fillText(line, x, y); line = words[n] + ' '; y += lineHeight; }
    else line = testLine;
  }
  ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, width, height, radius){
  ctx.moveTo(x+radius, y);
  ctx.arcTo(x+width, y, x+width, y+height, radius);
  ctx.arcTo(x+width, y+height, x, y+height, radius);
  ctx.arcTo(x, y+height, x, y, radius);
  ctx.arcTo(x, y, x+width, y, radius);
  ctx.closePath();
}

/* animated background: floating heart particles drawn on canvas */
function initBackground(canvasId){
  const c = document.getElementById(canvasId);
  if(!c) return;
  const ctx = c.getContext('2d');
  let W = c.width = window.innerWidth;
  let H = c.height = window.innerHeight;
  const hearts = [];

  function rand(min,max){ return min + Math.random()*(max-min); }

  function spawn(){
    const size = rand(16,72);
    hearts.push({x:rand(0,W), y:H+size, vy:rand(0.4,1.8), vx:rand(-0.4,0.4), size, rot:rand(0,Math.PI*2), w:Math.random(), color: ['#ff5b8a','#ffd2e6','#7a5cff','#ffd166'][Math.floor(Math.random()*4)], alpha:rand(0.2,0.9)});
  }

  function drawHeart(x,y,s,fill,alpha,rot){
    ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    const topCurveHeight = s * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, topCurveHeight - s/2, -s/2, topCurveHeight - s/2, -s/2, topCurveHeight);
    ctx.bezierCurveTo(-s/2, topCurveHeight + s/2, 0, topCurveHeight + s*0.85, 0, s);
    ctx.bezierCurveTo(0, topCurveHeight + s*0.85, s/2, topCurveHeight + s/2, s/2, topCurveHeight);
    ctx.bezierCurveTo(s/2, topCurveHeight - s/2, 0, topCurveHeight - s/2, 0, topCurveHeight);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  let spawnTicker = 0;
  function loop(){
    ctx.clearRect(0,0,W,H);
    if(Math.random() < 0.06) spawn();
    for(let i=hearts.length-1;i>=0;i--){
      const h = hearts[i];
      h.y -= h.vy; h.x += h.vx + Math.sin((h.y+h.x)/50)*0.3; h.rot += 0.01;
      drawHeart(h.x, h.y, h.size/2, h.color, h.alpha, h.rot);
      if(h.y < -100 || h.x < -200 || h.x > W+200) hearts.splice(i,1);
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', ()=>{ W = c.width = window.innerWidth; H = c.height = window.innerHeight; });
  loop();
}

// initialize background canvas when present
if(typeof window !== 'undefined'){
  window.addEventListener('load', ()=>{ if(document.getElementById('bgCanvas')) initBackground('bgCanvas'); });
}
