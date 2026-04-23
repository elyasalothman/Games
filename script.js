// ─── AUDIO SYSTEM (مؤثرات صوتية بسيطة برمجياً) ───
let audioCtx;
function playSound(type) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  
  if (type === 'coin') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.08); // قفزة أوكتاف (صوت جمع العملة)
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'gameover') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);
  } else if (type === 'blip') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
  } else if (type === 'levelup') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(554, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);
  } else if (type === 'card') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
  }
}

// ─── DATA (تمت إضافة اللعبتين الجديدتين) ───
const GAMES = [
  {id:'snake',   name:{ar:'الثعبان', en:'Snake'}, icon:'🐍', desc:{ar:'كُل الطعام دون أن تصطدم!', en:'Eat the food without crashing!'}},
  {id:'memory',  name:{ar:'تطابق الذاكرة', en:'Memory Match'}, icon:'🧠', desc:{ar:'اقلب البطاقات واكتشف الأزواج المتطابقة!', en:'Flip cards and find matching pairs!'}},
  {id:'math',    name:{ar:'تحدي الأرقام', en:'Math Challenge'}, icon:'🔢', desc:{ar:'أجب على الأسئلة الرياضية بسرعة.', en:'Answer math questions quickly.'}},
  {id:'word',    name:{ar:'فك الكلمة', en:'Word Scramble'}, icon:'📝', desc:{ar:'رتّب الحروف لتكوّن كلمة صحيحة!', en:'Rearrange letters to form a word!'}},
  {id:'reaction',name:{ar:'رد الفعل', en:'Reaction Time'}, icon:'⚡', desc:{ar:'اضغط بمجرد تغيّر اللون!', en:'Click as soon as the color changes!'}},
  {id:'color',   name:{ar:'مطابقة الألوان', en:'Color Match'}, icon:'🎨', desc:{ar:'اختر لون النص وليس معنى الكلمة!', en:'Choose the text color, not the word!'}},
  {id:'guesser', name:{ar:'خمن الرقم', en:'Number Guesser'}, icon:'🤔', desc:{ar:'هل يمكنك تخمين الرقم السري؟', en:'Can you guess the secret number?'}},
  {id:'sequence',name:{ar:'تتبع النمط', en:'Sequence'}, icon:'🧩', desc:{ar:'تذكر تسلسل الألوان وأعد تكراره!', en:'Remember the color sequence and repeat!'}},
  {id:'agar',    name:{ar:'معركة الخلايا', en:'Cell Wars'}, icon:'🦠', desc:{ar:'لعبة أونلاين! كُل لتكبر وتجنب الأعداء.', en:'Online! Eat to grow and avoid enemies.'}},
  {id:'anime',   name:{ar:'تحدي الأنمي', en:'Anime Trivia'}, icon:'🎌', desc:{ar:'اختبر معلوماتك في عالم الأنمي الشيق!', en:'Test your knowledge in the exciting Anime world!'}}
];

// ─── CARD GAMES DATA ───
const CARD_GAMES = [
  {id:'baloot', name:{ar:'بلوت', en:'Baloot'}, icon:'♠️', desc:{ar:'لعبة الورق الأشهر في الخليج. حكم أو صن؟', en:'The most famous card game in the Gulf.'}},
  {id:'uno', name:{ar:'أونو', en:'Uno'}, icon:' UNO ', desc:{ar:'تخلص من أوراقك أولاً! لعبة جماعية ممتعة.', en:'Get rid of your cards first! A fun group game.'}},
  {id:'domino', name:{ar:'دومينو', en:'Dominoes'}, icon:'🀄', desc:{ar:'صل الأرقام المتشابهة وسيطر على الطاولة.', en:'Connect matching numbers and dominate the table.'}},
];

// ─── STORAGE & CORE ───
function getStore(k,def){try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):def;}catch{return def;}}
function setStore(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}

function checkStreak(){
  const today=new Date().toDateString();
  const last=getStore('lastVisit','');
  let streak=getStore('streak',0);
  if(last!==today){
    const d=new Date(); d.setDate(d.getDate()-1);
    const yesterday=d.toDateString();
    streak=last===yesterday?streak+1:1;
    setStore('streak',streak); setStore('lastVisit',today);
    if(last!==today) setStore('todayGames',0);
  }
  return streak;
}

// ─── THEME & LANGUAGE SYSTEM ───
let currentTheme = getStore('theme', 'light');
let currentLang = getStore('lang', 'ar');

const DICT = {
  ar: {
    subtitle: "ألعاب سريعة لتنشيط ذهنك",
    level: "المستوى:",
    streak: "سلسلة الأيام:",
    totalScore: "إجمالي النقاط:",
    todayGames: "ألعاب اليوم:",
    best: "🏆 أفضل:",
    adLabel: "إعلان",
    adSpace: "مساحة إعلانية (مثال: 728x90)"
  },
  en: {
    subtitle: "Quick games to boost your mind",
    level: "Level:",
    streak: "Day Streak:",
    totalScore: "Total Score:",
    todayGames: "Today's Games:",
    best: "🏆 Best:",
    adLabel: "Ad",
    adSpace: "Ad Space (e.g., 728x90)"
  }
};

function applyTheme() {
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    document.getElementById('themeBtn').textContent = '🌙';
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  setStore('theme', currentTheme); applyTheme();
}

function applyLang() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langBtn').textContent = currentLang === 'ar' ? 'EN' : 'عربي';
  
  const d = DICT[currentLang];
  document.querySelector('.sub-logo').textContent = d.subtitle;
  document.querySelectorAll('.stat-pill')[0].childNodes[0].nodeValue = d.level + ' ';
  document.querySelectorAll('.stat-pill')[1].childNodes[0].nodeValue = d.streak + ' ';
  document.querySelectorAll('.stat-pill')[2].childNodes[0].nodeValue = d.totalScore + ' ';
  document.querySelectorAll('.stat-pill')[3].childNodes[0].nodeValue = d.todayGames + ' ';
  if(document.querySelector('.ad-label')) document.querySelector('.ad-label').textContent = d.adLabel;
  if(document.querySelector('.ad-content span')) document.querySelector('.ad-content span').textContent = d.adSpace;
  
  init(); // إعادة رسم البطاقات باللغة الجديدة
}

function toggleLang() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  setStore('lang', currentLang); applyLang();
}

// تحديث دالة init لتدعم اللغة
function init() {
  document.getElementById('streakCount').textContent = checkStreak();
  const currentTotal = getStore('totalScore', 0);
  document.getElementById('totalScore').textContent = currentTotal;
  document.getElementById('playerLevel').textContent = Math.floor(currentTotal / 200) + 1;
  document.getElementById('todayGames').textContent = getStore('todayGamesCount', 0);
  
  const d = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
  document.getElementById('dateBanner').textContent = d.toLocaleDateString(locale, options);

  const grid = document.getElementById('gamesGrid');
  grid.innerHTML = '';
  GAMES.forEach(g => {
    const best = getStore(`best_${g.id}`, '---');
    grid.innerHTML += `<div class="game-card" onclick="openGame('${g.id}')">
      <span class="game-icon">${g.icon}</span>
      <div class="game-name">${g.name[currentLang]}</div>
      <div class="game-desc">${g.desc[currentLang]}</div>
      <div class="game-best">${DICT[currentLang].best} ${best}</div>
    </div>`;
  });

  // رسم بطاقات ألعاب الورق في الشاشة الرئيسية
  const cardGrid = document.getElementById('cardGamesGrid');
  if (cardGrid) {
    cardGrid.innerHTML = '';
    CARD_GAMES.forEach(g => {
      const best = getStore(`best_${g.id}`, '---');
      cardGrid.innerHTML += `<div class="game-card" onclick="openGame('${g.id}')">
        <span class="game-icon">${g.icon}</span>
        <div class="game-name">${g.name[currentLang]}</div>
        <div class="game-desc">${g.desc[currentLang]}</div>
        <div class="game-best">${DICT[currentLang].best} ${best}</div>
      </div>`;
    });
  }
}

function openGame(id){
  const overlay = document.getElementById(id+'Overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow='hidden';
  }
  
  if(id==='memory') initMemory();
  if(id==='word') initWord();
  if(id==='reaction') initReaction();
  if(id==='color') initColor();
  if(id==='snake') initSnakeDisplay();
  if(id==='guesser') initGuesser();
  if(id==='sequence') initSequence();
  if(id==='agar') initAgar();
  if(id==='anime') { if(typeof initAnime === 'function') initAnime(); else showToast('جاري تحميل اللعبة...'); }
  if(id==='domino') { // Placeholder for Card Games
    document.getElementById('balootOverlay').classList.add('active');
    document.body.style.overflow='hidden';
  }
  if(id==='baloot') initBaloot();
  if(id==='uno') initUno();
}
function closeGame(id){
  const overlay = document.getElementById(id+'Overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  document.body.style.overflow='';
  if(id==='snake') stopSnake();
  if(id==='math') stopMath();
  if(id==='color') stopColor();
  if(id==='agar') closeAgar();
  if(id==='anime' && typeof closeAnime === 'function') closeAnime();
  if(id==='domino') document.getElementById('balootOverlay').classList.remove('active');
  if(id==='baloot') closeBaloot();
  if(id==='uno') closeUno();
}

function addScore(pts){
  const oldScore = getStore('totalScore', 0);
  const oldLevel = Math.floor(oldScore / 200) + 1;
  
  let total=oldScore+pts;
  setStore('totalScore',total);
  document.getElementById('totalScore').textContent=total;
  
  const newLevel = Math.floor(total / 200) + 1;
  document.getElementById('playerLevel').textContent = newLevel;
  
  if (newLevel > oldLevel) {
      playSound('levelup');
      showToast(`🎉 مبروك! وصلت للمستوى ${newLevel} 🌟`);
  }
}
function recordGamePlayed(){
  let cnt=getStore('todayGamesCount',0)+1;
  setStore('todayGamesCount',Math.min(cnt,8));
  document.getElementById('todayGames').textContent=Math.min(cnt,8);
}
function showToast(msg){
  const t=document.createElement('div');
  t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

// ─── LEADERBOARD SYSTEM ───
function submitScore(game_id, score, isLowerBetter = false) {
  if(score === 0 && !isLowerBetter) return;
  const currentBest = getStore('best_' + game_id, isLowerBetter ? 9999 : 0);
  const isNewRecord = isLowerBetter ? (score < currentBest) : (score > currentBest);
  
  if (isNewRecord || currentBest === 0 || currentBest === 9999) {
    setTimeout(async () => {
      const playerName = prompt('🎉 رقم قياسي جديد! أدخل اسمك للوحة الصدارة:', getStore('playerName', 'لاعب مجهول'));
      if (playerName) {
        setStore('playerName', playerName);
        try {
          await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game_id, player_name: playerName, score }) });
          showToast('تم حفظ نتيجتك في لوحة الصدارة 🏆');
        } catch(e) { console.error(e); }
      }
    }, 600); // ننتظر قليلاً حتى تظهر شاشة نهاية اللعبة أولاً
  }
}

function openLeaderboard() {
  document.getElementById('leaderboardOverlay').classList.add('active');
  document.getElementById('leaderboardGameSelect').innerHTML = GAMES.map(g => `<option value="${g.id}">${g.icon} ${g.name[currentLang]}</option>`).join('');
  fetchLeaderboard();
}
function closeLeaderboard() { document.getElementById('leaderboardOverlay').classList.remove('active'); }

async function fetchLeaderboard() {
  const game_id = document.getElementById('leaderboardGameSelect').value;
  const isLowerBetter = ['memory', 'reaction', 'guesser'].includes(game_id);
  const content = document.getElementById('leaderboardContent');
  content.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحميل...</div>';
  try {
    const res = await fetch(`/api/leaderboard/${game_id}?sort=${isLowerBetter ? 'asc' : 'desc'}`);
    const data = await res.json();
    if (data.length === 0) { content.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد نتائج بعد. كن الأول!</div>'; return; }
    let html = '<table class="leaderboard-table"><tr><th>#</th><th>اللاعب</th><th>النتيجة</th></tr>';
    data.forEach((row, i) => {
        const displayScore = game_id === 'reaction' ? row.score + ' ms' : row.score;
        let rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        let medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
        html += `<tr class="${rankClass}"><td>${medal}${i+1}</td><td>${row.player_name}</td><td style="font-weight:bold; color:var(--accent-blue);">${displayScore}</td></tr>`;
    });
    content.innerHTML = html + '</table>';
  } catch(e) { content.innerHTML = '<div style="text-align:center; padding:20px; color:var(--accent-red);">خطأ في الاتصال بالخادم</div>'; }
}

// ─────────────────────────────────────────────
// 🐍 SNAKE (تم إبطاء السرعة إلى 180)
// ─────────────────────────────────────────────
let snakeGame={running:false,loop:null,snake:[],dir:{x:1,y:0},nextDir:{x:1,y:0},food:{x:0,y:0},score:0,size:16};
const SZ=16, COLS=20, ROWS=20;

function initSnakeDisplay(){
  document.getElementById('snakeBest').textContent=getStore('best_snake',0);
  document.getElementById('snakeScore').textContent=0;
  drawSnakeIdle();
}
function drawSnakeIdle(){
  const canvas=document.getElementById('snakeCanvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,320,320);
  ctx.fillStyle='#0f0f1b'; ctx.fillRect(0,0,320,320); // خلفية أركيد داكنة
  ctx.fillStyle='#00d2ff'; ctx.font='bold 16px Tajawal'; ctx.textAlign='center';
  ctx.fillText('اضغط ▶ ابدأ للعب', 160, 160);
}
function startSnake(){
  stopSnake();
  snakeGame.snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  snakeGame.dir={x:1,y:0}; snakeGame.nextDir={x:1,y:0};
  snakeGame.score=0; snakeGame.running=true;
  document.getElementById('snakeScore').textContent=0;
  placeSnakeFood();
  // تعديل السرعة هنا (180 بدل 120 ليكون أسهل)
  snakeGame.loop=setInterval(tickSnake,180);
}
function stopSnake(){
  snakeGame.running=false;
  if(snakeGame.loop){clearInterval(snakeGame.loop);snakeGame.loop=null;}
}
function placeSnakeFood(){
  let pos;
  do{pos={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)};}
  while(snakeGame.snake.some(s=>s.x===pos.x&&s.y===pos.y));
  snakeGame.food=pos;
}
function snakeDir(dx,dy){
  if(!snakeGame.running){startSnake();return;}
  if(dx===1&&snakeGame.dir.x===-1||dx===-1&&snakeGame.dir.x===1)return;
  if(dy===1&&snakeGame.dir.y===-1||dy===-1&&snakeGame.dir.y===1)return;
  snakeGame.nextDir={x:dx,y:dy};
}
function tickSnake(){
  snakeGame.dir=snakeGame.nextDir;
  const head={x:snakeGame.snake[0].x+snakeGame.dir.x, y:snakeGame.snake[0].y+snakeGame.dir.y};
  if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snakeGame.snake.some(s=>s.x===head.x&&s.y===head.y)){
    stopSnake(); playSound('gameover');
    submitScore('snake', snakeGame.score, false);
    const best=Math.max(snakeGame.score,getStore('best_snake',0));
    setStore('best_snake',best); document.getElementById('snakeBest').textContent=best;
    addScore(snakeGame.score*10); recordGamePlayed();
    drawSnakeEnd(); return;
  }
  snakeGame.snake.unshift(head);
  if(head.x===snakeGame.food.x&&head.y===snakeGame.food.y){
    snakeGame.score++; playSound('success');
    document.getElementById('snakeScore').textContent=snakeGame.score;
    placeSnakeFood();
  } else { snakeGame.snake.pop(); }
  drawSnake();
}
function drawSnake(){
  const canvas=document.getElementById('snakeCanvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,320,320);
  ctx.fillStyle='#0f0f1b'; ctx.fillRect(0,0,320,320);
  
  ctx.shadowBlur = 10; ctx.shadowColor = '#ff3366'; // توهج الطعام
  ctx.fillStyle='#ff3366'; 
  ctx.beginPath();ctx.arc(snakeGame.food.x*SZ+SZ/2,snakeGame.food.y*SZ+SZ/2,SZ/2-2,0,Math.PI*2);ctx.fill();
  
  ctx.shadowColor = '#00d2ff'; // توهج الثعبان
  ctx.fillStyle='#00d2ff'; 
  snakeGame.snake.forEach((s,i)=>{
    ctx.beginPath();ctx.roundRect(s.x*SZ+1,s.y*SZ+1,SZ-2,SZ-2,4);ctx.fill();
  });
  ctx.shadowBlur = 0; // إعادة ضبط التوهج
}
function drawSnakeEnd(){
  const canvas=document.getElementById('snakeCanvas');
  const ctx=canvas.getContext('2d');
  drawSnake();
  ctx.fillStyle='rgba(15,15,27,0.8)'; ctx.fillRect(0,0,320,320);
  ctx.fillStyle='#ff3366'; ctx.font='bold 20px Tajawal'; ctx.textAlign='center';
  ctx.fillText('انتهت اللعبة!', 160,140);
  ctx.fillStyle='#fff'; ctx.font='bold 16px Tajawal';
  ctx.fillText('النقاط: '+snakeGame.score, 160, 170);
}
document.addEventListener('keydown',e=>{
  const m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  const d=m[e.key];
  if(d&&document.getElementById('snakeOverlay').classList.contains('active')){e.preventDefault();snakeDir(d[0],d[1]);}
});

// ─────────────────────────────────────────────
// 🧠 MEMORY
// ─────────────────────────────────────────────
const MEM_EMOJIS=['🌟','🦋','🎸','🍕','🌈','🦊','🎮','🌺'];
let memState={cards:[],flipped:[],matched:0,attempts:0,locked:false};
function initMemory(){
  const pairs=[...MEM_EMOJIS,...MEM_EMOJIS].sort(()=>Math.random()-0.5);
  memState={cards:pairs.map((e,i)=>({id:i,emoji:e,flipped:false,matched:false})),flipped:[],matched:0,attempts:0,locked:false};
  document.getElementById('memAttempts').textContent=0;
  document.getElementById('memMatched').textContent=0;
  document.getElementById('memBest').textContent=getStore('best_memory','-');
  renderMemory();
}
function renderMemory(){
  const g=document.getElementById('memoryGrid'); g.innerHTML='';
  memState.cards.forEach((c,i)=>{
    const d=document.createElement('div');
    d.className='mem-card'+(c.flipped?' flipped':'')+(c.matched?' matched':'');
    d.style.cssText = `aspect-ratio:1; background:${c.flipped||c.matched?'var(--card-bg)':'var(--accent-purple)'}; border-radius:16px; border:2px solid var(--border-color); display:flex; align-items:center; justify-content:center; font-size:28px; cursor:pointer; box-shadow:0 6px 0 var(--border-color); transition: all 0.2s;`;
    d.innerHTML=`<span style="display:${c.flipped||c.matched?'block':'none'}">${c.emoji}</span>`;
    if(!c.matched) d.onclick=()=>flipCard(i);
    g.appendChild(d);
  });
}
function flipCard(i){
  if(memState.locked||memState.cards[i].flipped||memState.cards[i].matched)return;
  playSound('blip');
  memState.cards[i].flipped=true; memState.flipped.push(i); renderMemory();
  if(memState.flipped.length===2){
    memState.attempts++; document.getElementById('memAttempts').textContent=memState.attempts;
    memState.locked=true;
    const [a,b]=memState.flipped;
    if(memState.cards[a].emoji===memState.cards[b].emoji){
      playSound('coin');
      memState.cards[a].matched=memState.cards[b].matched=true;
      memState.matched++; document.getElementById('memMatched').textContent=memState.matched;
      memState.flipped=[]; memState.locked=false; renderMemory();
      if(memState.matched===8){
        playSound('levelup');
        submitScore('memory', memState.attempts, true);
        const best=getStore('best_memory',999);
        if(memState.attempts<best){setStore('best_memory',memState.attempts);document.getElementById('memBest').textContent=memState.attempts;}
        addScore(100); recordGamePlayed(); showToast('🎉 أحسنت!');
      }
    } else {
      setTimeout(()=>{
        memState.cards[a].flipped=memState.cards[b].flipped=false;
        memState.flipped=[]; memState.locked=false; renderMemory();
      },800);
    }
  }
}

// ─────────────────────────────────────────────
// 🔢 MATH (تم زيادة الوقت المتاح)
// ─────────────────────────────────────────────
let mathState={score:0,q:0,total:10,timer:null,timerVal:0,active:false};
function startMath(){
  mathState={score:0,q:0,total:10,timer:null,timerVal:0,active:true};
  document.getElementById('mathStartBtn').style.display='none';
  nextMathQ();
}
function stopMath(){if(mathState.timer)clearInterval(mathState.timer);mathState.active=false;}
function nextMathQ(){
  if(mathState.q>=mathState.total){endMath();return;}
  mathState.q++; document.getElementById('mathQ').textContent=mathState.q;
  const ops=['+','-','×']; const op=ops[Math.floor(Math.random()*ops.length)];
  let a=Math.floor(Math.random()*10)+2,b=Math.floor(Math.random()*10)+2,ans;
  if(op==='+')ans=a+b; else if(op==='-'){if(a<b){const t=a;a=b;b=t;}ans=a-b;} else ans=a*b;
  document.getElementById('mathQuestion').textContent=`${a} ${op} ${b} = ?`;
  const opts=new Set([ans]);
  while(opts.size<4){const w=ans+Math.floor(Math.random()*10)-5;if(w!==ans&&w>=0)opts.add(w);}
  const shuffled=[...opts].sort(()=>Math.random()-0.5);
  const cont=document.getElementById('mathOptions'); cont.innerHTML='';
  shuffled.forEach(o=>{
    const btn=document.createElement('button');
    btn.className='math-opt btn'; btn.textContent=o;
    btn.onclick=()=>answerMath(btn,o,ans);
    cont.appendChild(btn);
  });
  startMathTimer(ans);
}
function startMathTimer(correctAns){
  if(mathState.timer)clearInterval(mathState.timer);
  let t=100; const bar=document.getElementById('timerBar');
  bar.style.width='100%'; bar.style.background='var(--accent-blue)';
  mathState.timer=setInterval(()=>{
    t-=0.7; // كان 1.4، الآن أبطأ بالنصف (وقت أكثر)
    bar.style.width=t+'%';
    if(t<30) bar.style.background='var(--accent-red)';
    if(t<=0){clearInterval(mathState.timer); playSound('gameover'); wrongFlash(correctAns); setTimeout(nextMathQ,800);}
  },70);
}
function answerMath(btn,chosen,correct){
  clearInterval(mathState.timer);
  document.querySelectorAll('.math-opt').forEach(b=>b.onclick=null);
  if(chosen===correct){
    playSound('coin'); btn.style.background='var(--accent-green)'; btn.style.color='#fff';
    mathState.score++; document.getElementById('mathScore').textContent=mathState.score;
    setTimeout(nextMathQ,500);
  } else {
    playSound('gameover'); btn.style.background='var(--accent-red)'; btn.style.color='#fff';
    wrongFlash(correct); setTimeout(nextMathQ,800);
  }
}
function wrongFlash(correct){
  document.querySelectorAll('.math-opt').forEach(b=>{if(parseInt(b.textContent)===correct){b.style.background='var(--accent-green)';b.style.color='#fff';}});
}
function endMath(){
  mathState.active=false;
  submitScore('math', mathState.score, false);
  const best=Math.max(mathState.score,getStore('best_math',0));
  setStore('best_math',best); document.getElementById('mathBest').textContent=best;
  addScore(mathState.score*10); recordGamePlayed();
  document.getElementById('mathQuestion').textContent='انتهى التحدي!';
  document.getElementById('mathOptions').innerHTML='';
  document.getElementById('mathStartBtn').style.display='inline-block';
  document.getElementById('mathStartBtn').textContent='▶ العب مجدداً';
}

// ─────────────────────────────────────────────
// 📝 WORD SCRAMBLE
// ─────────────────────────────────────────────
const WORDS=[
  {word:'تفاحة',hint:'🍎 فاكهة حمراء'},{word:'بحر',hint:'🌊 مسطح مائي ضخم'},
  {word:'شمس',hint:'☀️ نجم يضيء نهارنا'},{word:'كتاب',hint:'📖 نقرأ منه'},
  {word:'مدرسة',hint:'🏫 مكان للتعلم'},{word:'سيارة',hint:'🚗 وسيلة مواصلات'}
];
let wordState={score:0,num:0,answer:[],tiles:[],usedIdx:[],current:null};
function initWord(){
  wordState={score:0,num:0,answer:[],tiles:[],usedIdx:[],current:null};
  document.getElementById('wordScore').textContent=0;
  document.getElementById('wordBest').textContent=getStore('best_word',0);
  loadNextWord();
}
function loadNextWord(){
  const w=WORDS[wordState.num%WORDS.length]; wordState.current=w;
  wordState.answer=new Array(w.word.length).fill(null); wordState.usedIdx=[];
  const scrambled=w.word.split('').sort(()=>Math.random()-0.5);
  wordState.tiles=scrambled;
  document.getElementById('wordNum').textContent=wordState.num+1;
  document.getElementById('wordHint').textContent=w.hint;
  renderWord();
}
function renderWord(){
  const slots=document.getElementById('answerSlots'); const letters=document.getElementById('wordLetters');
  slots.innerHTML='';
  wordState.answer.forEach((l,i)=>{
    const d=document.createElement('div'); d.className='answer-slot';
    d.style.cssText='width:40px;height:50px;border-bottom:3px solid var(--accent-blue);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;margin:4px;cursor:pointer; text-shadow: 0 0 10px var(--accent-blue);';
    d.textContent=l||''; if(l) d.onclick=()=>removeFromAnswer(i);
    slots.appendChild(d);
  });
  letters.innerHTML='';
  wordState.tiles.forEach((l,i)=>{
    const d=document.createElement('div');
    d.style.cssText=`width:40px;height:50px;background:var(--card-bg);border:2px solid var(--border-color);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;margin:4px;cursor:pointer;box-shadow:0 4px 0 var(--border-color); opacity:${wordState.usedIdx.includes(i)?'0.3':'1'};`;
    d.textContent=l; if(!wordState.usedIdx.includes(i)) d.onclick=()=>addToAnswer(i,l);
    letters.appendChild(d);
  });
}
function addToAnswer(idx,letter){
  playSound('blip');
  const emptySlot=wordState.answer.indexOf(null); if(emptySlot===-1)return;
  wordState.answer[emptySlot]=letter; wordState.usedIdx.push(idx); renderWord();
  if(!wordState.answer.includes(null)) checkWord();
}
function removeFromAnswer(i){
  playSound('blip');
  const letter=wordState.answer[i];
  const tileIdx=wordState.tiles.findIndex((t,ti)=>t===letter&&wordState.usedIdx.includes(ti)&&!wordState.answer.slice(0,i).includes(t));
  wordState.answer[i]=null; wordState.usedIdx.splice(wordState.usedIdx.indexOf(tileIdx),1); renderWord();
}
function clearAnswer(){wordState.answer=new Array(wordState.current.word.length).fill(null);wordState.usedIdx=[];renderWord();}
function checkWord(){
  if(wordState.answer.join('')===wordState.current.word){
    playSound('levelup'); wordState.score+=10; document.getElementById('wordScore').textContent=wordState.score;
    submitScore('word', wordState.score, false);
    const best=Math.max(wordState.score,getStore('best_word',0));
    setStore('best_word',best); document.getElementById('wordBest').textContent=best;
    addScore(10); recordGamePlayed(); wordState.num++; setTimeout(loadNextWord,800);
  } else { playSound('gameover'); showToast('❌ خطأ، حاول مجدداً'); setTimeout(clearAnswer,800); }
}
function skipWord(){wordState.num++;loadNextWord();}

// ─────────────────────────────────────────────
// ⚡ REACTION TIME
// ─────────────────────────────────────────────
let reactionState={phase:'idle',timeout:null,startTime:0,round:0,times:[],maxRounds:5};
function initReaction(){
  reactionState={phase:'idle',timeout:null,startTime:0,round:0,times:[],maxRounds:5};
  document.getElementById('reactionBest').textContent=getStore('best_reaction','-');
  document.getElementById('reactionAvg').textContent='-'; document.getElementById('reactionRound').textContent='1/5';
  document.getElementById('reactionResult').textContent='';
  const zone=document.getElementById('reactionZone');
  zone.style.cssText='background:var(--card-bg); border:2px dashed var(--accent-blue); border-radius:20px; padding:60px 20px; text-align:center; font-size:20px; font-weight:bold; cursor:pointer; margin:20px 0; box-shadow: 0 0 20px rgba(0,210,255,0.1);';
  zone.textContent='انقر للبدء';
}
function handleReaction(){
  const zone=document.getElementById('reactionZone'); const res=document.getElementById('reactionResult');
  if(reactionState.phase==='idle'){
    zone.style.background='#ffcc00'; zone.style.color='#000'; zone.style.border='none'; zone.textContent='انتظر... لا تضغط!';
    res.textContent=''; const delay=1500+Math.random()*3000;
    reactionState.timeout=setTimeout(()=>{
      reactionState.phase='ready'; reactionState.startTime=performance.now();
      zone.style.background='#34c759'; zone.style.color='#fff'; zone.textContent='اضغط الآن! ⚡';
    },delay);
    reactionState.phase='waiting';
  } else if(reactionState.phase==='waiting'){
    clearTimeout(reactionState.timeout); playSound('gameover');
    zone.style.background='var(--card-bg)'; zone.style.color='var(--text-main)'; zone.style.border='2px dashed var(--accent-red)'; zone.textContent='مبكر جداً! انقر مجدداً';
    reactionState.phase='idle'; res.textContent='❌ تعجّلت!';
  } else if(reactionState.phase==='ready'){
    playSound('coin');
    const ms=Math.round(performance.now()-reactionState.startTime);
    reactionState.times.push(ms); reactionState.round++; res.textContent=`${ms} مللي ثانية`;
    const best=Math.min(ms,getStore('best_reaction',9999));
    setStore('best_reaction',best); document.getElementById('reactionBest').textContent=best+' ms';
    if(reactionState.round<reactionState.maxRounds){
      document.getElementById('reactionRound').textContent=`${reactionState.round+1}/5`;
      zone.style.background='var(--card-bg)'; zone.style.color='var(--text-main)'; zone.style.border='2px dashed var(--accent-blue)'; zone.textContent='انقر مجدداً';
      reactionState.phase='idle';
    } else {
      const avg=Math.round(reactionState.times.reduce((a,b)=>a+b,0)/reactionState.times.length);
      document.getElementById('reactionAvg').textContent=avg+' ms';
      zone.style.background='var(--card-bg)'; zone.style.color='var(--text-main)'; zone.style.border='2px dashed var(--accent-green)'; zone.textContent='انقر لبدء جولة جديدة';
      res.textContent=`متوسطك: ${avg} ms`;
      submitScore('reaction', avg, true);
      addScore(100); recordGamePlayed(); reactionState.phase='idle'; reactionState.round=0; reactionState.times=[];
      document.getElementById('reactionRound').textContent='1/5';
    }
  }
}

// ─────────────────────────────────────────────
// 🎨 COLOR MATCH (تم زيادة الوقت المتاح)
// ─────────────────────────────────────────────
const COLORS=[
  {name:'أحمر', hex:'#ff3b30'},{name:'أزرق', hex:'#007aff'},
  {name:'أخضر', hex:'#34c759'},{name:'أصفر', hex:'#ffcc00'},
  {name:'بنفسجي', hex:'#af52de'},{name:'برتقالي', hex:'#ff9500'}
];
let colorState={score:0,wrong:0,timer:null,active:false,correctColor:null};
function initColor(){
  colorState={score:0,wrong:0,timer:null,active:false,correctColor:null};
  document.getElementById('colorScore').textContent=0; document.getElementById('colorWrong').textContent=0;
  document.getElementById('colorBest').textContent=getStore('best_color',0);
  document.getElementById('colorWord').textContent='لعبة الألوان';
  document.getElementById('colorWord').style.cssText='font-size:36px; font-weight:bold; text-align:center; margin:20px 0; color:var(--text-main); text-shadow: 0 0 10px currentColor;';
  document.getElementById('colorOptions').innerHTML=''; document.getElementById('colorOptions').style.cssText='display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';
  document.getElementById('colorStartBtn').style.display='inline-block';
  document.getElementById('colorTimerBar').style.width='100%';
}
function startColor(){
  colorState.active=true; colorState.score=0; colorState.wrong=0;
  document.getElementById('colorStartBtn').style.display='none';
  nextColorQ();
}
function stopColor(){if(colorState.timer)clearInterval(colorState.timer);colorState.active=false;}
function nextColorQ(){
  if(!colorState.active)return;
  const displayColor=COLORS[Math.floor(Math.random()*COLORS.length)];
  const textColor=COLORS[Math.floor(Math.random()*COLORS.length)];
  colorState.correctColor=textColor;
  document.getElementById('colorWord').textContent=displayColor.name;
  document.getElementById('colorWord').style.color=textColor.hex;
  const shuffled=COLORS.sort(()=>Math.random()-0.5).slice(0,4);
  if(!shuffled.some(c=>c.name===textColor.name)) shuffled[0]=textColor;
  shuffled.sort(()=>Math.random()-0.5);
  const opts=document.getElementById('colorOptions'); opts.innerHTML='';
  shuffled.forEach(c=>{
    const btn=document.createElement('button');
    btn.style.cssText=`width:80px;height:80px;border-radius:16px;border:none;background:${c.hex};color:#fff;font-family:Tajawal;font-weight:bold;cursor:pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.5);`;
    btn.textContent=c.name; btn.onclick=()=>answerColor(c.name===textColor.name,btn);
    opts.appendChild(btn);
  });
  startColorTimer();
}
function startColorTimer(){
  if(colorState.timer)clearInterval(colorState.timer);
  let t=100; const bar=document.getElementById('colorTimerBar');
  bar.style.width='100%'; bar.style.background='var(--accent-blue)';
  colorState.timer=setInterval(()=>{
    t-=1; // كان 2، الآن أبطأ بالنصف (وقت أكثر)
    bar.style.width=t+'%';
    if(t<30) bar.style.background='var(--accent-red)';
    if(t<=0){
      clearInterval(colorState.timer); playSound('gameover'); colorState.wrong++;
      document.getElementById('colorWrong').textContent=colorState.wrong;
      if(colorState.wrong>=3) endColor(); else nextColorQ();
    }
  },100);
}
function answerColor(correct,btn){
  clearInterval(colorState.timer);
  document.querySelectorAll('#colorOptions button').forEach(b=>b.onclick=null);
  if(correct){
    playSound('coin'); colorState.score++; document.getElementById('colorScore').textContent=colorState.score;
    const best=Math.max(colorState.score,getStore('best_color',0));
    setStore('best_color',best); document.getElementById('colorBest').textContent=best;
    setTimeout(nextColorQ,400);
  } else {
    playSound('gameover'); colorState.wrong++; document.getElementById('colorWrong').textContent=colorState.wrong;
    btn.style.opacity='0.2';
    if(colorState.wrong>=3) setTimeout(endColor,400); else setTimeout(nextColorQ,400);
  }
}
function endColor(){
  colorState.active=false; addScore(colorState.score*10); recordGamePlayed();
  submitScore('color', colorState.score, false);
  document.getElementById('colorWord').textContent='انتهت اللعبة!'; document.getElementById('colorWord').style.color='#ff3b30';
  document.getElementById('colorOptions').innerHTML='';
  document.getElementById('colorStartBtn').style.display='inline-block'; document.getElementById('colorStartBtn').textContent='▶ العب مجدداً';
}

// ─────────────────────────────────────────────
// 🤔 NUMBER GUESSER (لعبة جديدة)
// ─────────────────────────────────────────────
let guessState={secret:0, attempts:0};
function initGuesser(){
  guessState.secret = Math.floor(Math.random() * 100) + 1;
  guessState.attempts = 0;
  document.getElementById('guessAttempts').textContent = 0;
  document.getElementById('guessBest').textContent = getStore('best_guess', '-');
  document.getElementById('guessMessage').textContent = 'أنا أفكر في رقم بين 1 و 100';
  document.getElementById('guessMessage').style.color = 'var(--text-main)';
  document.getElementById('guessInput').value = '';
  document.getElementById('guessInput').disabled = false;
}
function checkGuess(){
  const input = document.getElementById('guessInput');
  const msg = document.getElementById('guessMessage');
  const val = parseInt(input.value);
  if(isNaN(val) || val < 1 || val > 100) {
    msg.textContent = 'الرجاء إدخال رقم صحيح من 1 إلى 100!';
    playSound('gameover'); return;
  }
  guessState.attempts++;
  document.getElementById('guessAttempts').textContent = guessState.attempts;
  
  if(val === guessState.secret){
    playSound('levelup');
    msg.textContent = `🎉 صحيح! الرقم هو ${guessState.secret}`;
    msg.style.color = 'var(--accent-green)';
    input.disabled = true;
    submitScore('guesser', guessState.attempts, true);
    const best = getStore('best_guess', 999);
    if(guessState.attempts < best) { setStore('best_guess', guessState.attempts); document.getElementById('guessBest').textContent = guessState.attempts; }
    addScore(100 - (guessState.attempts * 5)); recordGamePlayed();
  } else if (val < guessState.secret) {
    playSound('blip'); msg.textContent = '⬆️ الرقم السري أكبر!'; msg.style.color = 'var(--accent-blue)';
  } else {
    playSound('blip'); msg.textContent = '⬇️ الرقم السري أصغر!'; msg.style.color = 'var(--accent-orange)';
  }
  input.value = ''; input.focus();
}

// ─────────────────────────────────────────────
// 🧩 SEQUENCE / SIMON SAYS (لعبة جديدة)
// ─────────────────────────────────────────────
let seqState = { sequence: [], playerStep: 0, level: 1, playing: false };
function initSequence(){
  seqState = { sequence: [], playerStep: 0, level: 1, playing: false };
  document.getElementById('seqLevel').textContent = '1';
  document.getElementById('seqBest').textContent = getStore('best_seq', 0);
  document.getElementById('seqStartBtn').style.display = 'inline-block';
}
function startSequence(){
  document.getElementById('seqStartBtn').style.display = 'none';
  seqState.sequence = []; seqState.level = 1; document.getElementById('seqLevel').textContent = seqState.level;
  nextSeqLevel();
}
function nextSeqLevel(){
  seqState.playerStep = 0;
  seqState.playing = true;
  seqState.sequence.push(Math.floor(Math.random() * 4)); // 0 to 3
  playSequence();
}
function playSequence(){
  let i = 0;
  const interval = setInterval(() => {
    flashSeqBtn(seqState.sequence[i]);
    i++;
    if(i >= seqState.sequence.length) {
      clearInterval(interval);
      seqState.playing = false; // Player's turn
    }
  }, 800);
}
function flashSeqBtn(id){
  const btn = document.getElementById('seq'+id);
  playSound('blip');
  btn.style.opacity = '1';
  btn.style.transform = 'scale(1.05)';
  setTimeout(() => {
    btn.style.opacity = '0.5';
    btn.style.transform = 'scale(1)';
  }, 400);
}
function handleSeqClick(id){
  if(seqState.playing || seqState.sequence.length === 0) return;
  
  flashSeqBtn(id);
  if(id === seqState.sequence[seqState.playerStep]) {
    seqState.playerStep++;
    if(seqState.playerStep === seqState.sequence.length) {
      playSound('levelup');
      seqState.level++; document.getElementById('seqLevel').textContent = seqState.level;
      const best = Math.max(seqState.level - 1, getStore('best_seq', 0));
      setStore('best_seq', best); document.getElementById('seqBest').textContent = best;
      setTimeout(nextSeqLevel, 1000);
    }
  } else {
    playSound('gameover');
    addScore(seqState.level * 10); recordGamePlayed();
    submitScore('sequence', seqState.level - 1, false);
    document.getElementById('seqStartBtn').style.display = 'inline-block';
    document.getElementById('seqStartBtn').textContent = '▶ إعادة المحاولة';
    seqState.sequence = [];
    showToast('❌ تسلسل خاطئ!');
  }
}
function closeAd() {
    if(document.getElementById('stickyAd')) document.getElementById('stickyAd').style.display = 'none';
    document.body.style.paddingBottom = '0';
}

// ─────────────────────────────────────────────
// 🌐 MULTIPLAYER (AGAR.IO CLONE)
// ─────────────────────────────────────────────
let socket;
let agarState = { players: {}, foods: [], viruses: [], isStarted: false, realPlayersCount: 0 };
let myAgarId = null;
let agarLoop;
let mouseX = 0, mouseY = 0;
let isStopped = false; // متغير لحالة الوقوف

function initAgar() {
    document.getElementById('agarStartScreen').style.display = 'block';
    document.getElementById('agarCanvas').style.display = 'none';
    document.getElementById('agarStatus').style.display = 'none';
    document.getElementById('agarChat').style.display = 'none';
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('mobileSplitBtn').style.display = 'none';
    if(socket) { socket.disconnect(); socket = null; }
}

function joinAgarGame(mode) {
    // التحقق من أن الموقع يعمل عبر الخادم المحلي وليس كملف مباشر
    if (typeof io === 'undefined') {
        alert('❌ عذراً! لا يمكن الاتصال بالخادم حالياً. يرجى التأكد من اتصالك بالإنترنت وتحديث الصفحة.');
        return;
    }

    const name = document.getElementById('agarName').value || 'لاعب';
    const color = document.getElementById('agarColor').value;
    const skin = document.getElementById('agarSkin').value;
    let room = 'public';

    if (mode === 'private') {
        room = prompt('أدخل اسم أو رقم الغرفة لإنشائها أو الانضمام إليها:');
        if (!room) return; // إذا ألغى المستخدم الإدخال
    } else if (mode === 'computer') {
        // إنشاء غرفة عشوائية فريدة للعب ضد الكمبيوتر
        room = 'bot_room_' + Math.random().toString(36).substr(2, 6);
    }

    document.getElementById('agarStartScreen').style.display = 'none';
    const cvs = document.getElementById('agarCanvas');
    const ctx = cvs.getContext('2d');
    cvs.style.display = 'block'; document.getElementById('agarStatus').style.display = 'block';
    document.getElementById('agarChat').style.display = 'block';
    
    // إظهار زر الانقسام إذا كان الجهاز يدعم اللمس
    if ('ontouchstart' in window) document.getElementById('mobileSplitBtn').style.display = 'block';
    
    // عرض رسالة تحميل أثناء الاتصال بدلاً من الشاشة الفارغة
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#007aff';
    ctx.font = 'bold 24px Tajawal';
    ctx.textAlign = 'center';
    ctx.fillText('جاري الاتصال بساحة اللعب...', cvs.width / 2, cvs.height / 2);

    socket = io();
    socket.on('connect_error', () => {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = '#ff3b30';
        ctx.fillText('❌ فشل الاتصال بالخادم! يرجى تحديث الصفحة.', cvs.width / 2, cvs.height / 2);
    });

    socket.emit('joinGame', { name, room, mode, color, skin });
    
    // استقبال الحالة الأولية الكاملة للعبة عند الانضمام
    socket.on('init', (data) => {
        myAgarId = data.id;
        agarState.foods = data.initialFoods || [];
        agarState.viruses = data.initialViruses || [];
    });

    // استقبال التحديثات الجزئية بدلاً من الحالة الكاملة
    socket.on('gameStateUpdate', (state) => {
        agarState.players = state.players;
         agarState.isStarted = state.isStarted;
        agarState.realPlayersCount = state.realPlayersCount;

        // معالجة التغييرات على الطعام
        if (state.foodChanges && state.foodChanges.length > 0) {
            state.foodChanges.forEach(change => {
                if (change.type === 'remove') {
                    const index = agarState.foods.findIndex(f => f.id === change.id);
                    if (index !== -1) agarState.foods.splice(index, 1);
                } else if (change.type === 'add') {
                    agarState.foods.push(change.food);
                }
            });
        }
        
        // معالجة التغييرات على الفيروسات
        if (state.virusChanges && state.virusChanges.length > 0) {
            state.virusChanges.forEach(change => {
                if (change.type === 'remove') {
                    const index = agarState.viruses.findIndex(v => v.id === change.id);
                    if (index !== -1) agarState.viruses.splice(index, 1);
                } else if (change.type === 'add') {
                    agarState.viruses.push(change.virus);
                }
            });
        }
        requestAnimationFrame(drawAgar); // تحسين الأداء أثناء الرسم
    });
    socket.on('chatMessage', (data) => {
        const chatBox = document.getElementById('chatMessages');
        chatBox.innerHTML += `<div><strong style="color:var(--accent-orange)">${data.name}:</strong> ${data.msg}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    });
    socket.on('died', () => { showToast('❌ لقد تم ابتلاعك!'); playSound('gameover'); initAgar(); });

    // إرسال رسائل الدردشة
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            socket.emit('chatMessage', chatInput.value.trim());
            chatInput.value = '';
        }
    });

    // تتبع حركة الماوس وتوجيه الخلية
    cvs.addEventListener('mousemove', (e) => {
        if (document.activeElement === chatInput) return; // لا تتحرك إذا كان يكتب بالدردشة
        
        isStopped = false; // إلغاء الوقوف عند تحريك الماوس
        const rect = cvs.getBoundingClientRect();
        // استخدام أبعاد العنصر المعروضة على الشاشة لضمان دقة التوجيه
        mouseX = e.clientX - rect.left - (rect.width / 2);
        mouseY = e.clientY - rect.top - (rect.height / 2);
    });
    
    // دعم التوجيه عن طريق اللمس (للجوال)
    const touchHandler = (e) => {
        if (document.activeElement === chatInput) return;
        e.preventDefault(); isStopped = false;
        const rect = cvs.getBoundingClientRect();
        const touch = e.touches[0];
        mouseX = touch.clientX - rect.left - (rect.width / 2);
        mouseY = touch.clientY - rect.top - (rect.height / 2);
    };
    cvs.addEventListener('touchstart', touchHandler, {passive: false});
    cvs.addEventListener('touchmove', touchHandler, {passive: false});

    if(agarLoop) clearInterval(agarLoop);
    agarLoop = setInterval(() => {
        if(!myAgarId) return;
        const myCells = Object.values(agarState.players || {}).filter(p => p.owner === myAgarId);
        if (myCells.length === 0 || !agarState.isStarted) return;
        const dist = Math.hypot(mouseX, mouseY);
        if (dist > 10 && !isStopped) socket.emit('move', { x: mouseX / dist, y: mouseY / dist }); // إرسال اتجاه الماوس
    }, 1000 / 30);

    window.addEventListener('keydown', handleAgarKey);
}

function handleAgarKey(e) {
    const chatInput = document.getElementById('chatInput');
    if (document.activeElement === chatInput) return; // تعطيل الأزرار أثناء الدردشة

    if (e.code === 'KeyS' || e.code === 'KeyQ') {
        isStopped = true;
        socket.emit('move', { x: 0, y: 0 }); // أمر الوقوف
    }
    if (e.code === 'Space' && document.getElementById('agarOverlay').classList.contains('active')) {
        e.preventDefault();
        const dist = Math.hypot(mouseX, mouseY);
        if (dist > 0) socket.emit('split', { x: mouseX / dist, y: mouseY / dist });
    }
}

// دالة انقسام الخلية للجوال
window.splitAgarMobile = function() {
    const dist = Math.hypot(mouseX, mouseY);
    if (dist > 0 && socket) socket.emit('split', { x: mouseX / dist, y: mouseY / dist });
};

function drawAgar() {
    const cvs = document.getElementById('agarCanvas');
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    const myCells = Object.values(agarState.players).filter(p => p.owner === myAgarId);
    if (myCells.length === 0) return;
    const me = myCells.reduce((max, cell) => cell.r > max.r ? cell : max, myCells[0]);

    ctx.save();
    ctx.translate(cvs.width/2 - me.x, cvs.height/2 - me.y); // تحريك الكاميرا لتتبع اللاعب

    // رسم خريطة اللعبة (الحدود)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.strokeRect(0, 0, 2000, 2000);

    // رسم الطعام
    (agarState.foods || []).forEach(f => {
        ctx.beginPath(); ctx.arc(f.x, f.y, 5, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.fill();
    });
    
    // رسم الألغام (الفيروسات)
    (agarState.viruses || []).forEach(v => {
        ctx.beginPath();
        for(let i=0; i<15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const r = i % 2 === 0 ? v.r : v.r - 4; // شكل مسنن
            ctx.lineTo(v.x + Math.cos(angle)*r, v.y + Math.sin(angle)*r);
        }
        ctx.closePath();
        ctx.fillStyle = '#34c759'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#248a3d'; ctx.stroke();
    });

    // رسم اللاعبين مرتبين بحسب الحجم (الأصغر بالخلف)
    Object.values(agarState.players).sort((a,b) => a.r - b.r).forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
        
        // رسم الشكل (Skin) إذا وجد
        if (p.skin) {
            ctx.font = `${p.r * 1.2}px Arial`; // حجم الشكل يتناسب مع حجم الخلية
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(p.skin, p.x, p.y);
        }

        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Tajawal'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4; ctx.fillText(p.name, p.x, p.y); ctx.shadowBlur = 0;
        ctx.fillText(p.name, p.x, p.y + (p.skin ? p.r / 2 + 10 : 0)); // إزاحة الاسم لأسفل قليلاً إذا كان هناك شكل
        ctx.shadowBlur = 0;
    });
    ctx.restore();
    
    // 🏆 رسم لوحة الصدارة الحية (In-Game Leaderboard)
    if (agarState.isStarted) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.roundRect(cvs.width - 170, 10, 160, 130, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Tajawal'; ctx.textAlign = 'right';
        ctx.fillText('🏆 المتصدرين', cvs.width - 20, 35);
        ctx.font = '14px Tajawal';
        const sortedPlayers = Object.values(agarState.players).sort((a,b) => b.r - a.r).slice(0, 5);
        sortedPlayers.forEach((p, i) => {
            ctx.fillStyle = p.id === myAgarId ? '#ffcc00' : '#fff';
            ctx.fillText(`${i+1}. ${p.name} (${Math.round(p.r)})`, cvs.width - 20, 60 + (i * 18));
        });
    }

    // رسم رسالة الانتظار إذا كانت اللعبة العامة لم تبدأ (أقل من 4 لاعبين)
    if (!agarState.isStarted) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,cvs.width,cvs.height);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Tajawal'; ctx.textAlign = 'center';
        ctx.fillText('بانتظار لاعبين آخرين...', cvs.width/2, cvs.height/2 - 20);
        ctx.font = '20px Tajawal';
        ctx.fillText(`العدد الحالي: ${agarState.realPlayersCount} / 4 للاستمرار`, cvs.width/2, cvs.height/2 + 20);
    }
}

function closeAgar() { 
    if(socket) socket.disconnect(); 
    if(agarLoop) clearInterval(agarLoop); 
    window.removeEventListener('keydown', handleAgarKey);
}

// ─────────────────────────────────────────────
// ♠️ BALOOT (UI & Scaffolding)
// ─────────────────────────────────────────────
let balootSocket;
let myBalootState = null;

function initBaloot() {
    document.getElementById('balootOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('balootStartScreen').style.display = 'block';
    document.getElementById('balootGameScreen').style.display = 'none';
}

function joinBalootGame(mode) {
    const name = document.getElementById('balootName').value || 'لاعب';
    let room = 'public_baloot';
    
    if (mode === 'private') {
        room = prompt('أدخل اسم أو رقم غرفة البلوت:');
        if (!room) return;
    } else if (mode === 'computer') {
        room = 'bot_baloot_' + Math.random().toString(36).substr(2, 6);
    }

    document.getElementById('balootStartScreen').style.display = 'none';
    document.getElementById('balootGameScreen').style.display = 'block';
    
    // الاتصال بخادم البلوت
    balootSocket = io();
    balootSocket.emit('joinBaloot', { name, room, mode });
    
    // الاستماع لحالة الطاولة والأوراق
    balootSocket.on('balootGameState', (state) => {
        myBalootState = state;
        renderBalootTable();
    });
}

function dealBalootCards() {
    if (balootSocket) balootSocket.emit('dealBaloot');
    playSound('card');
}

function sendBalootAction(action) {
    if (balootSocket) balootSocket.emit('balootAction', action);
}

function playBalootCard(index) {
    if (balootSocket) balootSocket.emit('playBalootCard', index);
    playSound('card');
}

function declareProject() {
    if (balootSocket) balootSocket.emit('declareProject');
}

function balootQaid() {
    if (balootSocket) balootSocket.emit('balootQaid');
}

function renderBalootTable() {
    if (!myBalootState || !balootSocket) return;
    
    // تحديث لوحة النتائج (لنا ولهم)
    if (myBalootState.team1 && myBalootState.team2) {
        const isTeam1 = myBalootState.team1.includes(balootSocket.id);
        const myTeamScore = isTeam1 ? myBalootState.scoreTeam1 : myBalootState.scoreTeam2;
        const theirTeamScore = isTeam1 ? myBalootState.scoreTeam2 : myBalootState.scoreTeam1;
        document.getElementById('balootScoreUs').textContent = myTeamScore;
        document.getElementById('balootScoreThem').textContent = theirTeamScore;
    }

    // تحديث أسماء اللاعبين حول الطاولة بناءً على ترتيب الجلوس
    if (myBalootState.turnOrder && myBalootState.turnOrder.length === 4) {
        const myIndex = myBalootState.turnOrder.indexOf(balootSocket.id);
        if (myIndex !== -1) {
            const rightId = myBalootState.turnOrder[(myIndex + 1) % 4];
            const topId = myBalootState.turnOrder[(myIndex + 2) % 4];
            const leftId = myBalootState.turnOrder[(myIndex + 3) % 4];

            document.getElementById('balootPlayerRight').textContent = myBalootState.players[rightId] ? myBalootState.players[rightId].name : 'خصم 1';
            document.getElementById('balootPlayerTop').textContent = myBalootState.players[topId] ? myBalootState.players[topId].name : 'الخوي';
            document.getElementById('balootPlayerLeft').textContent = myBalootState.players[leftId] ? myBalootState.players[leftId].name : 'خصم 2';
        }
    }

    // رسم أوراق اللاعب (أنت)
    const myPlayer = myBalootState.players[balootSocket.id];
    if (myPlayer && myPlayer.cards) {
        const hand = document.getElementById('balootMyHand');
        hand.innerHTML = '';
        myPlayer.cards.forEach((c, index) => {
            const colorClass = c.color === 'red' ? 'card-red' : 'card-black';
            hand.innerHTML += `<div class="baloot-card ${colorClass}" onclick="playBalootCard(${index})"><div class="card-top-left">${c.value}${c.suit}</div><div class="card-center">${c.suit}</div></div>`;
        });
    }
    
    // رسم الأوراق في منتصف الطاولة (الطاولة الحالية)
    const center = document.getElementById('balootCenter');
    if (myBalootState.state === 'playing') {
        center.innerHTML = '';
        if (myBalootState.currentTrick) {
            myBalootState.currentTrick.forEach((play, i) => {
                const c = play.card;
                const colorClass = c.color === 'red' ? 'card-red' : 'card-black';
                const rotation = (i * 20) - 30; // ميلان خفيف لكل ورقة لتبدو متراكمة
                // رفع الورقة في البعد Z لتبدو الأوراق متراكمة فوق بعضها في الـ 3D
                center.innerHTML += `<div class="baloot-card ${colorClass}" style="position:absolute; transform: rotate(${rotation}deg) translateZ(${i * 5}px); margin:0; box-shadow: -2px 5px 10px rgba(0,0,0,0.5); cursor:default;"><div class="card-top-left">${c.value}${c.suit}</div><div class="card-center">${c.suit}</div></div>`;
            });
        }
    } else if (myBalootState.centerCard) {
        const c = myBalootState.centerCard;
        const colorClass = c.color === 'red' ? 'card-red' : 'card-black';
        center.innerHTML = `<div class="baloot-card ${colorClass}" style="margin:0; transform: scale(1.2) translateZ(10px); box-shadow: 0 15px 25px rgba(0,0,0,0.6); cursor:default;"><div class="card-top-left">${c.value}${c.suit}</div><div class="card-center">${c.suit}</div></div>`;
    } else {
        center.innerHTML = '';
    }

    // التحكم في الأزرار وحالة اللعبة
    const btnDeal = document.getElementById('btnDeal');
    const btnSan = document.getElementById('btnSan');
    const btnHakam = document.getElementById('btnHakam');
    const btnPass = document.getElementById('btnPass');
    const btnProject = document.getElementById('btnProject');
    const btnQaid = document.getElementById('btnQaid');
    const statusDiv = document.getElementById('balootActionStatus');

    btnDeal.style.display = 'none'; btnSan.style.display = 'none';
    btnHakam.style.display = 'none'; btnPass.style.display = 'none'; 
    btnProject.style.display = 'none'; btnQaid.style.display = 'none';
    statusDiv.textContent = '';

    if (myBalootState.state === 'waiting') {
        // السماح للاعب الأول (مدير الغرفة) بتوزيع الورق
        const firstPlayerId = Object.keys(myBalootState.players)[0];
        if (balootSocket.id === firstPlayerId) btnDeal.style.display = 'inline-block';
        else statusDiv.textContent = 'بانتظار توزيع الورق...';
    } else if (myBalootState.state === 'bidding') {
        const currentTurnId = myBalootState.turnOrder[myBalootState.currentTurnIndex];
        if (currentTurnId === balootSocket.id) {
            btnSan.style.display = 'inline-block'; btnHakam.style.display = 'inline-block'; btnPass.style.display = 'inline-block';
            statusDiv.textContent = 'دورك في المشترا!';
        } else {
            const turnPlayer = myBalootState.players[currentTurnId];
            statusDiv.textContent = `بانتظار ${turnPlayer ? turnPlayer.name : 'اللاعب'} ليشتري...`;
        }
    } else if (myBalootState.state === 'playing') {
        // إظهار زر "قيد" إذا رمى شخص آخر ورقة
        if (myBalootState.lastPlay && myBalootState.lastPlay.playerId !== balootSocket.id) {
            btnQaid.style.display = 'inline-block';
        }

        const currentTurnId = myBalootState.turnOrder[myBalootState.currentTurnIndex];
        if (currentTurnId === balootSocket.id) {
            // إظهار زر إعلان المشروع إذا كان متوفراً في أول أكلة
            const me = myBalootState.players[balootSocket.id];
            if (myBalootState.firstTrick && me.project && !me.projectDeclared) {
                btnProject.textContent = `أعلن ${me.project.name}`;
                btnProject.style.display = 'inline-block';
            }

            statusDiv.textContent = 'دورك! العب ورقة.';
        } else {
            const turnPlayer = myBalootState.players[currentTurnId];
            statusDiv.textContent = `بانتظار ${turnPlayer ? turnPlayer.name : 'اللاعب'} ليلعب...`;
        }
    }
}

function closeBaloot() {
    document.getElementById('balootOverlay').classList.remove('active');
    document.body.style.overflow = '';
    if (balootSocket) { balootSocket.disconnect(); balootSocket = null; }
}

// ─── START ───
init();
applyTheme();
applyLang();

// تحميل ملفات الألعاب الإضافية (مثل لعبة الأنمي)
const animeScript = document.createElement('script');
animeScript.src = 'anime-game.js';
document.body.appendChild(animeScript);