// ─── AUDIO SYSTEM & RADIO (نظام الصوت والراديو مثل قراند) ───
let audioCtx;
let isSoundEnabled = getStore('sound', true);
let currentStationIdx = getStore('radioStation', 0);

// قائمة محطات الراديو (أضف ملفات الـ mp3 الخاصة بك في مجلد المشروع)
const RADIO_STATIONS = [
  { name: 'راديو ألعاب اليوم', src: 'bg-music.mp3' },
  { name: 'محطة الرواق (Lofi)', src: 'lofi.mp3' },
  { name: 'محطة الحماس (Action)', src: 'action.mp3' },
  { name: 'الراديو مغلق (Off)', src: '' } // خيار لإيقاف موسيقى الخلفية فقط
];

let bgMusic = new Audio(RADIO_STATIONS[currentStationIdx].src);
bgMusic.loop = true;
bgMusic.volume = 0.15;
let musicStarted = false;

// التشغيل التلقائي عند أول نقرة في الموقع (حماية المتصفحات)
document.addEventListener('click', () => {
  if (isSoundEnabled && !musicStarted && bgMusic.src && !bgMusic.src.endsWith(window.location.host + '/')) {
    bgMusic.play().then(() => musicStarted = true).catch(() => {});
  }
}, { once: true });

function toggleSound() {
  isSoundEnabled = !isSoundEnabled;
  setStore('sound', isSoundEnabled);
  applySoundState();
  playSound('blip');
}

function applySoundState() {
  const btn = document.getElementById('soundBtn');
  if (btn) btn.textContent = isSoundEnabled ? '🔊' : '🔇';
  
  if (isSoundEnabled && bgMusic.src && !bgMusic.src.endsWith(window.location.host + '/')) { 
    bgMusic.play().then(() => musicStarted = true).catch(()=>{}); 
  } else { 
    bgMusic.pause(); 
  }
}

function nextRadioStation() {
  // الانتقال للمحطة التالية
  currentStationIdx = (currentStationIdx + 1) % RADIO_STATIONS.length;
  setStore('radioStation', currentStationIdx); // حفظ المحطة
  
  const station = RADIO_STATIONS[currentStationIdx];
  bgMusic.pause();
  
  if (station.src) {
    bgMusic.src = station.src;
    if (isSoundEnabled) {
      bgMusic.play().catch(() => {});
      musicStarted = true;
    }
  } else {
    // إذا كانت المحطة هي "مغلق"
    bgMusic.src = '';
  }
  
  playSound('blip'); // صوت تغيير القناة (تشويش خفيف)
  
  // إظهار اسم المحطة في الشاشة مثل GTA
  showToast('📻 ' + station.name);
}

function playSound(type) {
  if (!isSoundEnabled) return; // منع المؤثرات إذا كان الصوت مكتوماً

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
  playSound('blip');
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
  playSound('blip');
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

const loadedScripts = {};
const gameFiles = {
  'snake': 'snake-game.js',
  'anime': 'anime-game.js',
  'uno': 'uno-client.js',
  'memory': 'memory-game.js',
  'math': 'math-game.js',
  'word': 'word-game.js',
  'color': 'color-game.js',
  'reaction': 'reaction-game.js',
  'guesser': 'guesser-game.js',
  'sequence': 'sequence-game.js',
  'agar': 'agar-game.js',
  'baloot': 'baloot-game.js'
};

function openGame(id) {
  playSound('blip');
  const overlay = document.getElementById(id+'Overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow='hidden';
  }

  if (gameFiles[id] && !loadedScripts[id]) {
    showToast('جاري تحميل اللعبة...');
    const script = document.createElement('script');
    script.src = gameFiles[id];
    script.onload = () => {
      loadedScripts[id] = true;
      runGameInit(id);
    };
    script.onerror = () => showToast('❌ حدث خطأ في تحميل اللعبة');
    document.body.appendChild(script);
  } else {
    runGameInit(id);
  }
}

function runGameInit(id) {
  if(id==='memory' && typeof initMemory === 'function') initMemory();
  if(id==='word' && typeof initWord === 'function') initWord();
  if(id==='reaction' && typeof initReaction === 'function') initReaction();
  if(id==='color' && typeof initColor === 'function') initColor();
  if(id==='snake' && typeof initSnakeDisplay === 'function') initSnakeDisplay();
  if(id==='math' && typeof initMath === 'function') initMath();
  if(id==='guesser' && typeof initGuesser === 'function') initGuesser();
  if(id==='sequence' && typeof initSequence === 'function') initSequence();
  if(id==='agar' && typeof initAgar === 'function') initAgar();
  if(id==='anime' && typeof initAnime === 'function') initAnime();
  if(id==='domino') { // Placeholder for Card Games
    document.getElementById('balootOverlay').classList.add('active');
    document.body.style.overflow='hidden';
  }
  if(id==='baloot' && typeof initBaloot === 'function') initBaloot();
  if(id==='uno' && typeof initUno === 'function') initUno();
}

function closeGame(id){
  playSound('blip');
  const overlay = document.getElementById(id+'Overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  document.body.style.overflow='';
  if(id==='snake' && typeof stopSnake === 'function') stopSnake();
  if(id==='math' && typeof stopMath === 'function') stopMath();
  if(id==='color' && typeof stopColor === 'function') stopColor();
  if(id==='agar' && typeof closeAgar === 'function') closeAgar();
  if(id==='anime' && typeof closeAnime === 'function') closeAnime();
  if(id==='domino') document.getElementById('balootOverlay').classList.remove('active');
  if(id==='baloot' && typeof closeBaloot === 'function') closeBaloot();
  if(id==='uno' && typeof closeUno === 'function') closeUno();
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
  playSound('blip');
  document.getElementById('leaderboardOverlay').classList.add('active');
  document.getElementById('leaderboardGameSelect').innerHTML = GAMES.map(g => `<option value="${g.id}">${g.icon} ${g.name[currentLang]}</option>`).join('');
  fetchLeaderboard();
}
function closeLeaderboard() { 
  playSound('blip');
  document.getElementById('leaderboardOverlay').classList.remove('active'); 
}

async function fetchLeaderboard() {
  const game_id = document.getElementById('leaderboardGameSelect').value;
  const isLowerBetter = ['memory', 'reaction', 'guesser'].includes(game_id);
  const content = document.getElementById('leaderboardContent');
  content.innerHTML = '<div class="leaderboard-status">جاري التحميل...</div>';
  try {
    const res = await fetch(`/api/leaderboard/${game_id}?sort=${isLowerBetter ? 'asc' : 'desc'}`);
    const data = await res.json();
    if (data.length === 0) { content.innerHTML = '<div class="leaderboard-status empty">لا توجد نتائج بعد. كن الأول!</div>'; return; }
    let html = '<table class="leaderboard-table"><tr><th>#</th><th>اللاعب</th><th>النتيجة</th></tr>';
    data.forEach((row, i) => {
        const displayScore = game_id === 'reaction' ? row.score + ' ms' : row.score;
        let rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        let medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
        html += `<tr class="${rankClass}"><td>${medal}${i+1}</td><td>${row.player_name}</td><td class="leaderboard-score">${displayScore}</td></tr>`;
    });
    content.innerHTML = html + '</table>';
  } catch(e) { content.innerHTML = '<div class="leaderboard-status error">خطأ في الاتصال بالخادم</div>'; }
}

// ─────────────────────────────────────────────
let reactionState={phase:'idle',timeout:null,startTime:0,round:0,times:[],maxRounds:5};
function initReaction(){
  reactionState={phase:'idle',timeout:null,startTime:0,round:0,times:[],maxRounds:5};
  document.getElementById('reactionBest').textContent=getStore('best_reaction','-');
  document.getElementById('reactionAvg').textContent='-'; document.getElementById('reactionRound').textContent='1/5';
  document.getElementById('reactionResult').textContent='';
  const zone=document.getElementById('reactionZone');
  zone.className = 'reaction-zone idle';
  zone.textContent='انقر للبدء';
}
function handleReaction(){
  const zone=document.getElementById('reactionZone'); const res=document.getElementById('reactionResult');
  if(reactionState.phase==='idle'){
    zone.className = 'reaction-zone waiting'; zone.textContent='انتظر... لا تضغط!';
    res.textContent=''; const delay=1500+Math.random()*3000;
    reactionState.timeout=setTimeout(()=>{
      reactionState.phase='ready'; reactionState.startTime=performance.now();
      zone.className = 'reaction-zone ready'; zone.textContent='اضغط الآن! ⚡';
    },delay);
    reactionState.phase='waiting';
  } else if(reactionState.phase==='waiting'){
    clearTimeout(reactionState.timeout); playSound('gameover');
    zone.className = 'reaction-zone too-soon'; zone.textContent='مبكر جداً! انقر مجدداً';
    reactionState.phase='idle'; res.textContent='❌ تعجّلت!';
  } else if(reactionState.phase==='ready'){
    playSound('coin');
    const ms=Math.round(performance.now()-reactionState.startTime);
    reactionState.times.push(ms); reactionState.round++; res.textContent=`${ms} مللي ثانية`;
    const best=Math.min(ms,getStore('best_reaction',9999));
    setStore('best_reaction',best); document.getElementById('reactionBest').textContent=best+' ms';
    if(reactionState.round<reactionState.maxRounds){
      document.getElementById('reactionRound').textContent=`${reactionState.round+1}/5`;
      zone.className = 'reaction-zone idle'; zone.textContent='انقر مجدداً';
      reactionState.phase='idle';
    } else {
      const avg=Math.round(reactionState.times.reduce((a,b)=>a+b,0)/reactionState.times.length);
      document.getElementById('reactionAvg').textContent=avg+' ms';
      zone.className = 'reaction-zone finished'; zone.textContent='انقر لبدء جولة جديدة';
      res.textContent=`متوسطك: ${avg} ms`;
      submitScore('reaction', avg, true);
      addScore(100); recordGamePlayed(); reactionState.phase='idle'; reactionState.round=0; reactionState.times=[];
      document.getElementById('reactionRound').textContent='1/5';
    }
  }
}

// ─────────────────────────────────────────────
// 🧩 SEQUENCE / SIMON SAYS (لعبة جديدة)
// ─────────────────────────────────────────────
let seqState = { sequence: [], playerStep: 0, level: 1, playing: false };
function initSequence(){
  seqState = { sequence: [], playerStep: 0, level: 1, playing: false };
  document.getElementById('seqLevel').textContent = '1';
  document.getElementById('seqBest').textContent = getStore('best_seq', 0);
  document.getElementById('seqStartBtn').classList.remove('d-none');
}
function startSequence(){
  document.getElementById('seqStartBtn').classList.add('d-none');
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
    const startBtn = document.getElementById('seqStartBtn');
    startBtn.classList.remove('d-none');
    startBtn.textContent = '▶ إعادة المحاولة';
    seqState.sequence = [];
    showToast('❌ تسلسل خاطئ!');
  }
}
function closeAd() {
    if(document.getElementById('stickyAd')) document.getElementById('stickyAd').style.display = 'none';
    document.body.style.paddingBottom = '0';
}

// ─── START ───
init();
applyTheme();
applyLang();
applySoundState();

// ─── إخفاء شاشة التحميل عند اكتمال تحميل الصفحة ───
window.addEventListener('load', () => {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 500); // إزالة العنصر بالكامل بعد انتهاء حركة التلاشي
  }
});