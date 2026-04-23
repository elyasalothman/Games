// ─── إخفاء شاشة التحميل كأولوية قصوى قبل أي كود آخر ───
function hideLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 500);
  }
}
setTimeout(hideLoader, 800); // حماية فورية
window.addEventListener('load', hideLoader);
document.addEventListener('DOMContentLoaded', hideLoader);

// ─── AUDIO SYSTEM & RADIO (نظام الصوت والراديو مثل قراند) ───
let audioCtx;
let isSoundEnabled = getStore('sound', false); // إيقاف الصوت والموسيقى افتراضياً عند أول زيارة للموقع
let currentStationIdx = getStore('radioStation', 0);

// قائمة محطات الراديو (أضف ملفات الـ mp3 الخاصة بك في مجلد المشروع)
const RADIO_STATIONS = [
  { name: 'راديو ألعاب اليوم', src: 'bg-music.mp3' },
  { name: 'محطة الرواق (Lofi)', src: 'lofi.mp3' },
  { name: 'محطة الحماس (Action)', src: 'action.mp3' },
  { name: 'الراديو مغلق (Off)', src: '' } // خيار لإيقاف موسيقى الخلفية فقط
];

// حماية من أخطاء الذاكرة المؤقتة (إذا كان المؤشر غير موجود)
if (!RADIO_STATIONS[currentStationIdx]) currentStationIdx = 0;

let bgMusic = new Audio(RADIO_STATIONS[currentStationIdx].src);
bgMusic.loop = true;
bgMusic.volume = 0.05; // خفض مستوى الصوت ليكون هادئاً جداً في البداية
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

// ─── DATA (تم توحيد الألعاب وتصنيفها) ───
const ALL_GAMES = [
  {id:'snake',   category: 'puzzle', name:{ar:'الثعبان', en:'Snake'}, icon:'🐍', desc:{ar:'كُل الطعام دون أن تصطدم!', en:'Eat the food without crashing!'}},
  {id:'memory',  category: 'puzzle', name:{ar:'تطابق الذاكرة', en:'Memory Match'}, icon:'🧠', desc:{ar:'اقلب البطاقات واكتشف الأزواج المتطابقة!', en:'Flip cards and find matching pairs!'}},
  {id:'math',    category: 'puzzle', name:{ar:'تحدي الأرقام', en:'Math Challenge'}, icon:'🔢', desc:{ar:'أجب على الأسئلة الرياضية بسرعة.', en:'Answer math questions quickly.'}},
  {id:'word',    category: 'puzzle', name:{ar:'فك الكلمة', en:'Word Scramble'}, icon:'📝', desc:{ar:'رتّب الحروف لتكوّن كلمة صحيحة!', en:'Rearrange letters to form a word!'}},
  {id:'reaction',category: 'puzzle', name:{ar:'رد الفعل', en:'Reaction Time'}, icon:'⚡', desc:{ar:'اضغط بمجرد تغيّر اللون!', en:'Click as soon as the color changes!'}},
  {id:'color',   category: 'puzzle', name:{ar:'مطابقة الألوان', en:'Color Match'}, icon:'🎨', desc:{ar:'اختر لون النص وليس معنى الكلمة!', en:'Choose the text color, not the word!'}},
  {id:'guesser', category: 'puzzle', name:{ar:'خمن الرقم', en:'Number Guesser'}, icon:'🤔', desc:{ar:'هل يمكنك تخمين الرقم السري؟', en:'Can you guess the secret number?'}},
  {id:'sequence',category: 'puzzle', name:{ar:'تتبع النمط', en:'Sequence'}, icon:'🧩', desc:{ar:'تذكر تسلسل الألوان وأعد تكراره!', en:'Remember the color sequence and repeat!'}},
  {id:'anime',   category: 'puzzle', name:{ar:'تحدي الأنمي', en:'Anime Trivia'}, icon:'🎌', desc:{ar:'اختبر معلوماتك في عالم الأنمي الشيق!', en:'Test your knowledge in the exciting Anime world!'}},
  {id:'agar',    category: 'online', name:{ar:'معركة الخلايا', en:'Cell Wars'}, icon:'🦠', desc:{ar:'لعبة أونلاين! كُل لتكبر وتجنب الأعداء.', en:'Online! Eat to grow and avoid enemies.'}},
  {id:'baloot',  category: 'card', name:{ar:'بلوت', en:'Baloot'}, icon:'♠️', desc:{ar:'لعبة الورق الأشهر في الخليج. حكم أو صن؟', en:'The most famous card game in the Gulf.'}},
  {id:'uno',     category: 'card', name:{ar:'أونو', en:'Uno'}, icon:' UNO ', desc:{ar:'تخلص من أوراقك أولاً! لعبة جماعية ممتعة.', en:'Get rid of your cards first! A fun group game.'}},
  {id:'domino',  category: 'card', name:{ar:'دومينو', en:'Dominoes'}, icon:'🀄', desc:{ar:'صل الأرقام المتشابهة وسيطر على الطاولة.', en:'Connect matching numbers and dominate the table.'}}
];

// ─── STORAGE & CORE ───
function getStore(k,def){try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):def;}catch(e){return def;}}
function setStore(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

function checkDailyReset() {
  const today = new Date().toDateString();
  const lastQuestDate = getStore('lastQuestDate', '');
  if (today !== lastQuestDate) {
     ['quest_play', 'quest_score', 'quest_online'].forEach(k => setStore(k, 0));
     ['quest_claimed_play', 'quest_claimed_score', 'quest_claimed_online'].forEach(k => setStore(k, false));
     setStore('lastQuestDate', today);
  }
}

function checkStreak(){
  const today=new Date().toDateString();
  const last=getStore('lastVisit','');
  let streak=getStore('streak',0);
  if(last!==today){
    const d=new Date(); d.setDate(d.getDate()-1);
    const yesterday=d.toDateString();
    streak=last===yesterday?streak+1:1;
    setStore('streak',streak); setStore('lastVisit',today);
    if(last!==today) setStore('todayGamesCount',0);
  }
  return streak;
}

// ─── THEME & LANGUAGE SYSTEM ───
let currentTheme = getStore('theme', 'light');
let currentLang = getStore('lang', 'ar');

if (currentLang !== 'ar' && currentLang !== 'en') currentLang = 'ar';

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

// ─── ACHIEVEMENTS SYSTEM ───
const ACHIEVEMENTS = [
  { id: 'first_play', icon: '🎮', name: { ar: 'البداية', en: 'First Play' }, desc: { ar: 'العب أول لعبة لك', en: 'Play your first game' }, check: () => getStore('todayGamesCount', 0) >= 1 },
  { id: 'level_5', icon: '🌟', name: { ar: 'نجم صاعد', en: 'Rising Star' }, desc: { ar: 'صل إلى المستوى 5', en: 'Reach level 5' }, check: () => (Math.floor(getStore('totalScore', 0) / 200) + 1) >= 5 },
  { id: 'streak_3', icon: '🔥', name: { ar: 'متحمس', en: 'On Fire' }, desc: { ar: 'العب لـ 3 أيام متتالية', en: 'Play for 3 consecutive days' }, check: () => getStore('streak', 0) >= 3 },
  { id: 'score_1000', icon: '💰', name: { ar: 'غني بالنقاط', en: 'Score Wealthy' }, desc: { ar: 'اجمع 1000 نقطة', en: 'Collect 1000 total points' }, check: () => getStore('totalScore', 0) >= 1000 },
  { id: 'social_player', icon: '🌐', name: { ar: 'اجتماعي', en: 'Social' }, desc: { ar: 'جرب الألعاب الأونلاين', en: 'Try online games' }, check: () => getStore('best_agar', 0) > 0 || getStore('best_baloot', 0) > 0 || getStore('best_uno', 0) > 0 }
];
const AVATARS = ['👤', '👦', '👧', '👨', '👩', '🤖', '👽', '👻', '🤡', '🐯', '🦁', '😎', '🤓', '🤠', '👑'];

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
  try {
    document.querySelectorAll('.stat-pill')[0].childNodes[0].nodeValue = d.level + ' ';
    document.querySelectorAll('.stat-pill')[1].childNodes[0].nodeValue = d.streak + ' ';
    document.querySelectorAll('.stat-pill')[2].childNodes[0].nodeValue = d.totalScore + ' ';
    document.querySelectorAll('.stat-pill')[3].childNodes[0].nodeValue = d.todayGames + ' ';
  } catch(e) {}
  if(document.querySelector('.ad-label')) document.querySelector('.ad-label').textContent = d.adLabel;
  if(document.querySelector('.ad-content span')) document.querySelector('.ad-content span').textContent = d.adSpace;
  
  if (document.getElementById('gameSearchInput')) document.getElementById('gameSearchInput').placeholder = currentLang === 'ar' ? '🔍 ابحث عن لعبة...' : '🔍 Search for a game...';
  init(); // إعادة رسم البطاقات باللغة الجديدة
}

function toggleLang() {
  playSound('blip');
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  setStore('lang', currentLang); applyLang();
}

let currentCategory = 'all';
function filterCategory(cat, btnEvent) {
  playSound('blip');
  currentCategory = cat;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if(btnEvent) btnEvent.target.classList.add('active');
  renderGames();
}

function renderGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const searchInput = document.getElementById('gameSearchInput');
  const term = searchInput ? searchInput.value.toLowerCase() : '';
  let favs = getStore('favorites', []);
  if (!Array.isArray(favs)) favs = [];

  ALL_GAMES.forEach(g => {
    if (currentCategory !== 'all' && currentCategory !== 'favorites' && g.category !== currentCategory) return;
    if (currentCategory === 'favorites' && !favs.includes(g.id)) return;
    
    const gameName = g.name.ar + ' ' + g.name.en;
    if (term && !gameName.toLowerCase().includes(term)) return;

    const best = getStore(`best_${g.id}`, '---');
    const isFav = favs.includes(g.id);
    const favColor = isFav ? 'active-fav' : '';

    grid.innerHTML += `<div class="game-card" onclick="openGame('${g.id}')">
      <div class="card-actions">
        <button class="card-action-btn ${favColor}" onclick="toggleFavorite('${g.id}', event)" title="المفضلة">⭐</button>
        <button class="card-action-btn" onclick="shareGame('${g.id}', '${g.name[currentLang]}', event)" title="مشاركة">🔗</button>
      </div>
      <span class="game-icon">${g.icon}</span>
      <div class="game-name">${g.name[currentLang]}</div>
      <div class="game-desc">${g.desc[currentLang]}</div>
      <div class="game-best">${DICT[currentLang].best} ${best}</div>
    </div>`;
  });
}

// تحديث دالة init لتدعم اللغة
function init() {
  checkDailyReset();
  document.getElementById('streakCount').textContent = checkStreak();
  const currentTotal = getStore('totalScore', 0);
  document.getElementById('totalScore').textContent = currentTotal;
  document.getElementById('playerLevel').textContent = Math.floor(currentTotal / 200) + 1;
  document.getElementById('todayGames').textContent = getStore('todayGamesCount', 0);
  
  const d = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
  document.getElementById('dateBanner').textContent = d.toLocaleDateString(locale, options);

  renderGames();
  checkAchievements();
}

function filterGames() {
  renderGames();
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
    script.src = gameFiles[id] + '?v=' + Date.now();
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
  if (['agar', 'baloot', 'uno'].includes(id)) {
    setStore('quest_online', 1); // تسجيل إنجاز الدخول للعبة أونلاين
    const nameInput = document.getElementById(id + 'Name');
    if (nameInput && !nameInput.value) nameInput.value = getStore('globalPlayerName', '');
  }

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
  setStore('quest_score', getStore('quest_score', 0) + pts); // إضافة للنقاط اليومية
  checkAchievements();
}
function recordGamePlayed(){
  let cnt=getStore('todayGamesCount',0)+1;
  setStore('todayGamesCount',Math.min(cnt,8));
  document.getElementById('todayGames').textContent=Math.min(cnt,8);
  setStore('quest_play', getStore('quest_play', 0) + 1); // زيادة عدد مرات اللعب للمهام
  checkAchievements();
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
      const playerName = prompt('🎉 رقم قياسي جديد! أدخل اسمك للوحة الصدارة:', getStore('globalPlayerName', 'لاعب مجهول'));
      if (playerName) {
        setStore('globalPlayerName', playerName);
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
  document.getElementById('leaderboardGameSelect').innerHTML = ALL_GAMES.map(g => `<option value="${g.id}">${g.icon} ${g.name[currentLang]}</option>`).join('');
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

// ─── THE REST OF THE 7 FEATURES ───
function toggleFavorite(id, e) {
  e.stopPropagation(); playSound('blip');
  let favs = getStore('favorites', []);
  if (!Array.isArray(favs)) favs = [];
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id); showToast('تمت الإزالة من المفضلة 💔');
  } else {
    favs.push(id); showToast('تمت الإضافة للمفضلة ⭐');
  }
  setStore('favorites', favs); renderGames();
}

function shareGame(id, name, e) {
  e.stopPropagation(); playSound('blip');
  const text = `جرب لعبة ${name} الممتعة على ألعاب اليوم وتحداني! 🎮`;
  if (navigator.share) { navigator.share({ title: 'ألعاب اليوم', text: text, url: window.location.href });
  } else { navigator.clipboard.writeText(`${text} \n${window.location.href}`); showToast('تم نسخ الرابط! 📋'); }
}

function toggleFullscreen() {
  playSound('blip');
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else if (document.exitFullscreen) document.exitFullscreen();
}

function exportSave() {
  playSound('blip');
  const data = JSON.stringify(localStorage);
  const base64 = btoa(unescape(encodeURIComponent(data)));
  navigator.clipboard.writeText(base64);
  showToast('تم نسخ كود التقدم! احتفظ به بمكان آمن 💾');
}

function importSave() {
  playSound('blip');
  const code = prompt('أدخل كود النسخ الاحتياطي لاستعادة حسابك والتقدم:');
  if (code) {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(code))));
      Object.keys(parsed).forEach(k => localStorage.setItem(k, parsed[k]));
      showToast('تمت استعادة التقدم بنجاح! 🔄');
      setTimeout(() => location.reload(), 1500);
    } catch(e) { showToast('❌ الكود غير صحيح أو تالف!'); }
  }
}

function openQuests() {
  playSound('blip'); document.getElementById('questsOverlay').classList.add('active');
  const list = document.getElementById('questsList');
  const quests = [
    { id: 'play', target: 5, reward: 200, name: 'العب 5 ألعاب مختلفة' },
    { id: 'score', target: 500, reward: 300, name: 'اجمع 500 نقطة إجمالية' },
    { id: 'online', target: 1, reward: 150, name: 'العب جولة واحدة أونلاين' }
  ];
  list.innerHTML = quests.map(q => {
    const current = Math.min(getStore('quest_' + q.id, 0), q.target);
    const claimed = getStore('quest_claimed_' + q.id, false);
    const pct = (current / q.target) * 100;
    const btnHtml = claimed ? `<button class="btn btn-dark" disabled>تم الاستلام</button>` : current >= q.target ? `<button class="btn btn-green" onclick="claimQuest('${q.id}', ${q.reward})">استلام المكافأة</button>` : `<button class="btn btn-dark" disabled>${current}/${q.target}</button>`;
    return `<div class="quest-card"><div class="quest-info"><h4>${q.name}</h4><div class="quest-progress-bg"><div class="quest-progress-fill" style="width:${pct}%"></div></div><div class="quest-reward">+${q.reward} نقطة</div></div>${btnHtml}</div>`;
  }).join('');
}
function closeQuests() { playSound('blip'); document.getElementById('questsOverlay').classList.remove('active'); }

function claimQuest(id, reward) {
  playSound('coin'); setStore('quest_claimed_' + id, true); addScore(reward);
  showToast(`تم استلام ${reward} نقطة بنجاح! 🎁`); openQuests(); // Refresh modal
}

// ─── PROFILE & ACHIEVEMENTS ───
function openProfile() {
  playSound('blip');
  document.getElementById('profileOverlay').classList.add('active');
  document.getElementById('profileName').value = getStore('globalPlayerName', '');
  
  const avatarSelect = document.getElementById('profileAvatar');
  avatarSelect.innerHTML = AVATARS.map(a => `<option value="${a}">${a}</option>`).join('');
  avatarSelect.value = getStore('globalPlayerAvatar', '👤');

  renderAchievements();
}
function closeProfile() { playSound('blip'); document.getElementById('profileOverlay').classList.remove('active'); }
function saveProfile() {
  setStore('globalPlayerName', document.getElementById('profileName').value.trim());
  setStore('globalPlayerAvatar', document.getElementById('profileAvatar').value);
  showToast('✅ تم حفظ الملف الشخصي');
}
function renderAchievements() {
  const list = document.getElementById('achievementsList');
  list.innerHTML = ACHIEVEMENTS.map(ach => {
    const isUnlocked = getStore(`ach_${ach.id}`, false) || ach.check();
    if (isUnlocked && !getStore(`ach_${ach.id}`, false)) setStore(`ach_${ach.id}`, true);
    return `<div class="achieve-card ${isUnlocked ? '' : 'locked'}">
      <div class="achieve-icon">${isUnlocked ? ach.icon : '🔒'}</div>
      <div class="achieve-info"><h4>${ach.name[currentLang]}</h4><p>${ach.desc[currentLang]}</p></div>
    </div>`;
  }).join('');
}
function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (!getStore(`ach_${ach.id}`, false) && ach.check()) {
      setStore(`ach_${ach.id}`, true);
      showToast(`🏅 إنجاز جديد: ${ach.name[currentLang]}`);
      playSound('levelup');
    }
  });
}

function closeAd() {
    if(document.getElementById('stickyAd')) document.getElementById('stickyAd').style.display = 'none';
    document.body.style.paddingBottom = '0';
}

// ─── START ───
applyTheme();
applyLang(); // تقوم هذه الدالة بتشغيل init() تلقائياً بداخلها
applySoundState();