// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// --- FIREBASE CONFIGURATION ---
// TODO: Replace this with your actual Firebase project config from console.firebase.google.com
// PASTE YOUR COPIED CONFIG HERE OVER THESE PLACEHOLDERS

 const firebaseConfig = {
  apiKey: "AIzaSyAtx5iZmWd-QfvyZ7pY4VyDnqlc6XMlW_c",
  authDomain: "valentine-wish-v2.firebaseapp.com",
  projectId: "valentine-wish-v2",
  storageBucket: "valentine-wish-v2.firebasestorage.app",
  messagingSenderId: "941252582001",
  appId: "1:941252582001:web:dd55f4d6e722152db159d0"
};

// Safety check: Alert if config is still default
if (firebaseConfig.apiKey.includes("REPLACE")) {
  alert("Setup Required: You need to replace the placeholder keys in script.js with your NEW Firebase Project configuration.");
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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

// --- MAIN APP LOGIC ---

const wishForm = document.getElementById('wishForm');
const createLinkSection = document.getElementById('createLinkSection');
const inboxSection = document.getElementById('inboxSection');

// 1. SENDER & RECEIVER FLOW (index.html)
if(wishForm && createLinkSection){
  const urlParams = new URLSearchParams(window.location.search);
  const toParam = urlParams.get('to');

  // Emoji panel logic
  const emojiPanel = document.getElementById('emojiPanel');
  const messageInput = document.getElementById('message');
  if(emojiPanel){
    emojiPanel.addEventListener('click', e=>{
      if(e.target.classList.contains('emoji')){
        messageInput.value += (messageInput.value ? ' ' : '') + e.target.textContent;
      }
    });
  }

  if (toParam) {
    // --- SENDER MODE (Writing to someone) ---
    // Hide inbox/create sections, show write form
    createLinkSection.style.display = 'none';
    inboxSection.style.display = 'none';
    wishForm.style.display = 'block';

    // Decode recipient name
    try {
      // Get name from URL parameter 'n'
      const nameParam = urlParams.get('n');
      const displayName = nameParam ? decodeURIComponent(nameParam) : "Anonymous User";

      const toInput = document.getElementById('toName');
      toInput.value = displayName;
      toInput.readOnly = true;
      toInput.style.opacity = '0.7';
      
      const logo = document.querySelector('.logo');
      if(logo) logo.innerHTML = `<span class="spark">💖</span> Send a secret wish to ${displayName}`;

      // Handle Send
      const sendBtn = document.getElementById('sendBtn');
      sendBtn.addEventListener('click', async () => {
        const msg = messageInput.value.trim();
        if(!msg) return alert("Please write a message!");
        
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";

        try {
          await addDoc(collection(db, "messages"), {
            to: toParam, // The UID from the URL
            message: msg,
            quote: document.getElementById('quote')?.value || '',
            from: document.getElementById('fromName')?.value || '',
            timestamp: serverTimestamp()
          });
          
          wishForm.style.display = 'none';
          document.getElementById('sentConfirmation').classList.remove('hidden');
          showConfetti();
        } catch (e) {
          console.error(e);
          alert("Error sending message: " + e.message);
          sendBtn.disabled = false;
        }
      });

    } catch (e) { console.error(e); }

  } else {
    // --- RECEIVER MODE (Dashboard/Inbox) ---
    wishForm.style.display = 'none'; // Hide send form
    
    // Check if user is logged in
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is logged in -> Show Inbox
        createLinkSection.style.display = 'none';
        inboxSection.style.display = 'block';
        
        // Generate Share Link
        const uName = user.displayName || 'User';
        const link = `${window.location.origin}${window.location.pathname}?to=${user.uid}&n=${encodeURIComponent(uName)}`;
        document.getElementById('myShareLink').value = link;

        // Listen for messages
        // Note: Removed orderBy server-side to avoid index creation requirement. Sorting client-side.
        const q = query(collection(db, "messages"), where("to", "==", user.uid));
        
        onSnapshot(q, (snapshot) => {
          const list = document.getElementById('inboxList');
          list.innerHTML = '';
          if(snapshot.empty){
            list.innerHTML = '<p style="text-align:center;opacity:0.6">No messages yet. Share your link!</p>';
            return;
          }

          // Client-side sort (Newest first)
          const msgs = [];
          snapshot.forEach(doc => msgs.push({ ...doc.data(), id: doc.id }));
          msgs.sort((a,b) => {
            const tA = a.timestamp ? a.timestamp.seconds : 0;
            const tB = b.timestamp ? b.timestamp.seconds : 0;
            return tB - tA;
          });

          msgs.forEach((data) => {
            const item = document.createElement('div');
            item.className = 'card';
            item.style.position = 'relative'; // Enable absolute positioning for delete button
            item.style.padding = '16px';
            item.style.background = 'rgba(255,255,255,0.05)';
            item.innerHTML = `
              <div style="font-weight:bold;color:#ffd3e0;margin-bottom:4px;padding-right:24px">${data.quote || 'New Wish'}</div>
              <div style="margin-bottom:12px">${data.message}</div>
              ${data.from ? `<div style="font-size:0.85rem;color:#bfc3d6;font-style:italic">— ${data.from}</div>` : ''}
            `;

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            delBtn.title = 'Delete';
            // Override default button styles for a clean icon look
            delBtn.style.cssText = 'position:absolute;top:10px;right:10px;padding:8px;background:transparent;border:none;box-shadow:none;opacity:0.6;cursor:pointer;line-height:0;border-radius:50%;transition:all 0.2s ease;color:#ff6b6b;';
            
            delBtn.onmouseenter = () => { delBtn.style.opacity = '1'; delBtn.style.background = 'rgba(255, 71, 87, 0.15)'; };
            delBtn.onmouseleave = () => { delBtn.style.opacity = '0.6'; delBtn.style.background = 'transparent'; };

            delBtn.onclick = async () => {
              if(confirm('Are you sure you want to delete this wish?')) {
                try { await deleteDoc(doc(db, "messages", data.id)); } catch(e){ alert(e.message); }
              }
            };
            item.appendChild(delBtn);
            list.appendChild(item);
          });
        }, (error) => {
          console.error("Inbox Error:", error);
          document.getElementById('inboxList').innerHTML = `<p style="text-align:center;color:#ff6b6b">Error loading messages: ${error.message}</p>`;
        });

      } else {
        // User not logged in -> Show Create Inbox
        createLinkSection.style.display = 'block';
        inboxSection.style.display = 'none';
        
        const createBtn = document.getElementById('createInboxBtn');
        createBtn.addEventListener('click', () => {
          const name = document.getElementById('myName').value.trim();
          if(!name) return alert("Enter your name");
          
          createBtn.disabled = true;
          createBtn.textContent = "Creating...";

          signInAnonymously(auth).then(async (userCredential) => {
            // Update profile with name so it's associated with the account
            try {
              await updateProfile(userCredential.user, { displayName: name });
              window.location.reload();
            } catch (e) { console.error("Profile update failed", e); }
          }).catch((error) => {
            console.error(error);
            alert("Error creating inbox: " + error.message);
            createBtn.disabled = false;
            createBtn.textContent = "Create Inbox";
          });
        });
      }
    });
    
    // Copy link handler
    const copyBtn = document.getElementById('copyMyLink');
    const shareInput = document.getElementById('myShareLink');
    if(copyBtn){
      copyBtn.addEventListener('click', () => {
        shareInput.select();
        shareInput.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(shareInput.value).catch(()=>{});
        document.execCommand('copy');
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(()=>copyBtn.textContent=original, 2000);
      });
    }
  }
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
    const drawAndFinish = ()=>{ ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='36px Poppins, serif'; ctx.fillStyle='#ffd6e8'; ctx.fillText((data.to?`To: ${data.to}`:'To: You'), w/2, 520); ctx.font='24px Poppins, serif'; ctx.fillStyle='#fff'; wrapText(ctx, data.message||'', w/2, 560, 760, 34); if(data.from) { ctx.font='22px Poppins, serif'; ctx.fillStyle='#ffdcee'; ctx.fillText('— ' + data.from, w/2, 820); } cnv.toBlob((blob)=>{ const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=u; a.download='secret-wish.png'; a.click(); URL.revokeObjectURL(u); },'image/png'); };
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

    // Inject "Copy Link" button to share the wish URL
    const actionsRow = card.querySelector('.row') || card.querySelector('.actions');
    if(actionsRow && !document.getElementById('copyWishUrl')){
      const copyBtn = document.createElement('button');
      copyBtn.id = 'copyWishUrl';
      copyBtn.textContent = 'Copy Link';
      copyBtn.style.marginRight = '8px';
      
      copyBtn.addEventListener('click', ()=>{
        const url = window.location.href;
        const tempInput = document.createElement('input');
        document.body.appendChild(tempInput);
        tempInput.value = url;
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(()=> copyBtn.textContent = originalText, 2000);
      });
      
      // Insert before other buttons
      actionsRow.insertBefore(copyBtn, actionsRow.firstChild);
    }

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
        cnv.toBlob((blob)=>{ const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='secret-wish.png'; a.click(); URL.revokeObjectURL(url); },'image/png');
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
