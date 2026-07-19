(function() { // ─── تغليف الكود بالكامل لمنع تلوث النطاق العام (IIFE) ───
  'use strict';

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

const SOUND_EFFECTS = {
  coin: { type: 'square', freq1: 880, freq2: 1760, freqTime: 0.08, gain: 0.1, duration: 0.3 },
  gameover: { type: 'sawtooth', freq1: 300, freq2: 50, gain: 0.1, duration: 0.5, ramp: 'exponential' },
  blip: { type: 'square', freq1: 440, gain: 0.05, duration: 0.05, ramp: 'exponential' },
  levelup: {
    type: 'square',
    freqSteps: [{ f: 440, t: 0 }, { f: 554, t: 0.1 }, { f: 659, t: 0.2 }, { f: 880, t: 0.3 }],
    gain: 0.1,
    duration: 0.5,
    ramp: 'linear'
  },
  card: { type: 'triangle', freq1: 150, freq2: 50, gain: 0.1, duration: 0.1, ramp: 'exponential' }
};

function playSound(type) {
  if (!isSoundEnabled) return; // منع المؤثرات إذا كان الصوت مكتوماً

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const effect = SOUND_EFFECTS[type];
  if (!effect) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  osc.type = effect.type;
  gain.gain.setValueAtTime(effect.gain, now);

  if (effect.freqSteps) {
    effect.freqSteps.forEach(step => {
      osc.frequency.setValueAtTime(step.f, now + step.t);
    });
  } else {
    osc.frequency.setValueAtTime(effect.freq1, now);
    if (effect.freq2) {
      if (effect.freqTime) {
        osc.frequency.setValueAtTime(effect.freq2, now + effect.freqTime);
      } else {
        osc.frequency.exponentialRampToValueAtTime(effect.freq2, now + effect.duration);
      }
    }
  }

  if (effect.ramp === 'linear') {
    gain.gain.linearRampToValueAtTime(0.0001, now + effect.duration);
  } else {
    gain.gain.exponentialRampToValueAtTime(0.0001, now + effect.duration);
  }

  osc.start(now);
  osc.stop(now + effect.duration);
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
  {id:'anime',   category: 'puzzle', name:{ar:'تحدي الأنمي', en:'Anime Trivia'}, icon:'🎌', desc:{ar:'اختبر معلوماتك في عالم الأنمي الشيق!', en:'Test your knowledge in the exciting Anime world!'}, isNew: true},
  {id:'agar',    category: 'online', name:{ar:'معركة الخلايا', en:'Cell Wars'}, icon:'🦠', desc:{ar:'لعبة أونلاين! كُل لتكبر وتجنب الأعداء.', en:'Online! Eat to grow and avoid enemies.'}},
  {id:'baloot',  category: 'card', name:{ar:'بلوت', en:'Baloot'}, icon:'♠️', desc:{ar:'لعبة الورق الأشهر في الخليج. حكم أو صن؟', en:'The most famous card game in the Gulf.'}},
  {id:'uno',     category: 'card', name:{ar:'أونو', en:'Uno'}, icon:' UNO ', desc:{ar:'تخلص من أوراقك أولاً! لعبة جماعية ممتعة.', en:'Get rid of your cards first! A fun group game.'}},
  {id:'domino',  category: 'card', name:{ar:'دومينو', en:'Dominoes'}, icon:'🀄', desc:{ar:'صل الأرقام المتشابهة وسيطر على الطاولة.', en:'Connect matching numbers and dominate the table.'}, isNew: true},
  {id:'money',   category: 'puzzle', name:{ar:'صائد الأموال', en:'Money Catcher'}, icon:'💰', desc:{ar:'التقط الأموال المتساقطة وتجنب القنابل!', en:'Catch falling money and avoid bombs!'}},
  {id:'empire',  category: 'puzzle', name:{ar:'إمبراطورية الضغط', en:'Tap Empire'}, icon:'👑', desc:{ar:'اضغط واجمع الثروة وابنِ إمبراطوريتك على الجوال!', en:'Tap to earn and build your mobile money empire!'}, isNew: true},
  {id:'invest',  category: 'puzzle', name:{ar:'محاكاة الاستثمار', en:'Invest Sim'}, icon:'📈', desc:{ar:'أسواق حقيقية الضغط، دخل سلبي، وحفظ سحابي لتقدمك.', en:'Market pressure, passive income, and cloud-saved progress.'}, isNew: true}
];

// ─── STORAGE & CORE ───
function getStore(key, defaultValue){try{const value=localStorage.getItem(key);return value!==null?JSON.parse(value):defaultValue;}catch(e){return defaultValue;}}
function setStore(key, value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.error(`Failed to save to localStorage: ${key}`, e);}}

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
let currentUser = null;
let googleAuthEnabled = false;

if (currentLang !== 'ar' && currentLang !== 'en') currentLang = 'ar';

const DICT = {
  ar: {
    subtitle: "ألعاب سريعة لتنشيط ذهنك",
    level: "المستوى:",
    streak: "سلسلة الأيام:",
    totalScore: "إجمالي النقاط:",
    todayGames: "ألعاب اليوم:",
    best: "🏆 أفضل:",
    tabAll: "الكل",
    tabPuzzle: "🧠 ذكاء",
    tabCard: "🃏 ورق",
    tabOnline: "🌐 أونلاين",
    tabFav: "⭐ المفضلة",
    catPuzzle: "ذكاء",
    catCard: "ورق",
    catOnline: "أونلاين",
    heroTitle: "العب، تنافس، وطوّر مهاراتك!",
    heroDesc: "مجموعة متنوعة من ألعاب الذكاء والورق والأونلاين — مجانية بالكامل وبدون تسجيل.",
    randomPlay: "🎲 العب عشوائياً",
    dailyQuests: "📋 المهام اليومية",
    heroGames: "لعبة",
    heroOnline: "أونلاين",
    heroLeader: "صدارة",
    featured: "⭐ ألعاب مميزة",
    hot: "رائج",
    footerTagline: "منصة ألعاب عربية مجانية لتنشيط الذهن والترفيه",
    footerCopy: "© 2026 الياس العثمان",
    welcomeTitle: "مرحباً بك في ألعاب اليوم!",
    welcomeText: "اختر اسمك، العب الألعاب، اجمع النقاط، ونافس على لوحة الصدارة.",
    welcomeName: "أدخل اسمك",
    welcomeStart: "🚀 ابدأ اللعب",
    welcomeSkip: "تخطي",
    welcomeOr: "أو",
    googleSignIn: "تسجيل الدخول بـ Google",
    googleSignOut: "تسجيل الخروج",
    authSuccess: "تم تسجيل الدخول بنجاح! 🎉",
    authFailed: "فشل تسجيل الدخول. حاول مرة أخرى.",
    searchPlaceholder: "🔍 ابحث عن لعبة...",
    emptyGames: "لا توجد ألعاب مطابقة للبحث",
    loadingGame: "جاري تحميل اللعبة...",
    recent: "🕐 آخر ما لعبت",
    newBadge: "جديد",
    installBanner: "📲 ثبّت ألعاب اليوم على جهازك للوصول السريع!",
    installBtn: "تثبيت",
    questPlay: "العب 5 ألعاب مختلفة",
    questScore: "اجمع 500 نقطة إجمالية",
    questOnline: "العب جولة واحدة أونلاين",
    questClaimed: "تم الاستلام",
    questClaim: "استلام المكافأة",
    questRenew: "تتجدد المهام يومياً منتصف الليل",
    lbLoading: "جاري التحميل...",
    lbEmpty: "لا توجد نتائج بعد. كن الأول!",
    lbError: "خطأ في الاتصال بالخادم",
    lbPlayer: "اللاعب",
    lbScore: "النتيجة",
    levelUp: "مبروك! وصلت للمستوى"
  },
  en: {
    subtitle: "Quick games to boost your mind",
    level: "Level:",
    streak: "Day Streak:",
    totalScore: "Total Score:",
    todayGames: "Today's Games:",
    best: "🏆 Best:",
    tabAll: "All",
    tabPuzzle: "🧠 Puzzle",
    tabCard: "🃏 Cards",
    tabOnline: "🌐 Online",
    tabFav: "⭐ Favorites",
    catPuzzle: "Puzzle",
    catCard: "Cards",
    catOnline: "Online",
    heroTitle: "Play, Compete, and Level Up!",
    heroDesc: "A variety of puzzle, card, and online games — completely free, no signup required.",
    randomPlay: "🎲 Random Game",
    dailyQuests: "📋 Daily Quests",
    heroGames: "Games",
    heroOnline: "Online",
    heroLeader: "Leaderboard",
    featured: "⭐ Featured Games",
    hot: "Hot",
    footerTagline: "Free Arabic games platform for brain training and fun",
    footerCopy: "© 2026 Elyas Al-Othman",
    welcomeTitle: "Welcome to Today Games!",
    welcomeText: "Pick your name, play games, earn points, and compete on the leaderboard.",
    welcomeName: "Enter your name",
    welcomeStart: "🚀 Start Playing",
    welcomeSkip: "Skip",
    welcomeOr: "or",
    googleSignIn: "Sign in with Google",
    googleSignOut: "Sign out",
    authSuccess: "Signed in successfully! 🎉",
    authFailed: "Sign-in failed. Please try again.",
    searchPlaceholder: "🔍 Search for a game...",
    emptyGames: "No games match your search",
    loadingGame: "Loading game...",
    recent: "🕐 Recently Played",
    newBadge: "NEW",
    installBanner: "📲 Install Today Games on your device for quick access!",
    installBtn: "Install",
    questPlay: "Play 5 different games",
    questScore: "Collect 500 total points",
    questOnline: "Play one online game",
    questClaimed: "Claimed",
    questClaim: "Claim Reward",
    questRenew: "Quests renew daily at midnight",
    lbLoading: "Loading...",
    lbEmpty: "No scores yet. Be the first!",
    lbError: "Server connection error",
    lbPlayer: "Player",
    lbScore: "Score",
    levelUp: "Level up! You reached level"
  }
};

// ─── ACHIEVEMENTS SYSTEM ───
const ACHIEVEMENTS = [
  { id: 'first_play', icon: '🎮', name: { ar: 'البداية', en: 'First Play' }, desc: { ar: 'العب أول لعبة لك', en: 'Play your first game' }, check: () => getStore('todayGamesCount', 0) >= 1 },
  { id: 'level_5', icon: '🌟', name: { ar: 'نجم صاعد', en: 'Rising Star' }, desc: { ar: 'صل إلى المستوى 5', en: 'Reach level 5' }, check: () => (Math.floor(getStore('totalScore', 0) / 200) + 1) >= 5 },
  { id: 'streak_3', icon: '🔥', name: { ar: 'متحمس', en: 'On Fire' }, desc: { ar: 'العب لـ 3 أيام متتالية', en: 'Play for 3 consecutive days' }, check: () => getStore('streak', 0) >= 3 },
  { id: 'score_1000', icon: '💰', name: { ar: 'غني بالنقاط', en: 'Score Wealthy' }, desc: { ar: 'اجمع 1000 نقطة', en: 'Collect 1000 total points' }, check: () => getStore('totalScore', 0) >= 1000 },
  { id: 'social_player', icon: '🌐', name: { ar: 'اجتماعي', en: 'Social' }, desc: { ar: 'جرب الألعاب الأونلاين', en: 'Try online games' }, check: () => getStore('best_agar', 0) > 0 || getStore('best_baloot', 0) > 0 || getStore('best_uno', 0) > 0 },
  { id: 'domino_win', icon: '🀄', name: { ar: 'سيد الدومينو', en: 'Domino Master' }, desc: { ar: 'افز في جولة دومينو', en: 'Win a domino round' }, check: () => getStore('domino_player_wins', 0) >= 1 },
  { id: 'anime_fan', icon: '🎌', name: { ar: 'أوتاكو', en: 'Otaku' }, desc: { ar: 'أجب على 3 أسئلة أنمي صح', en: 'Answer 3 anime questions correctly' }, check: () => getStore('best_anime', 0) >= 60 },
  { id: 'money_rich', icon: '💰', name: { ar: 'ثري', en: 'Tycoon' }, desc: { ar: 'اجمع 500$ في صائد الأموال', en: 'Collect $500 in Money Catcher' }, check: () => getStore('best_money', 0) >= 500 },
  { id: 'empire_builder', icon: '👑', name: { ar: 'إمبراطور', en: 'Emperor' }, desc: { ar: 'اجمع 10,000$ في إمبراطورية الضغط', en: 'Earn $10,000 in Tap Empire' }, check: () => getStore('best_empire', 0) >= 10000 },
  { id: 'investor', icon: '📈', name: { ar: 'مستثمر', en: 'Investor' }, desc: { ar: 'اوصل صافي ثروتك إلى 25,000 في محاكاة الاستثمار', en: 'Reach 25,000 net worth in Invest Sim' }, check: () => getStore('best_invest', 0) >= 25000 }
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

const FEATURED_IDS = ['empire', 'invest', 'agar', 'baloot', 'anime'];
const CAT_LABELS = { puzzle: 'catPuzzle', card: 'catCard', online: 'catOnline' };

function applyLang() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langBtn').textContent = currentLang === 'ar' ? 'EN' : 'عربي';
  
  const dict = DICT[currentLang];
  document.querySelector('.sub-logo').textContent = dict.subtitle;
  try {
    document.getElementById('levelLabel').textContent = dict.level + ' ';
    document.getElementById('streakLabel').textContent = dict.streak + ' ';
    document.getElementById('totalScoreLabel').textContent = dict.totalScore + ' ';
    document.getElementById('todayGamesLabel').textContent = dict.todayGames + ' ';
    document.getElementById('heroTitle').textContent = dict.heroTitle;
    document.getElementById('heroDesc').textContent = dict.heroDesc;
    document.getElementById('randomGameBtn').textContent = dict.randomPlay;
    document.getElementById('heroQuestsBtn').textContent = dict.dailyQuests;
    document.getElementById('heroGamesLabel').textContent = dict.heroGames;
    document.getElementById('heroOnlineLabel').textContent = dict.heroOnline;
    document.getElementById('heroLeaderLabel').textContent = dict.heroLeader;
    document.getElementById('featuredTitle').textContent = dict.featured;
    document.getElementById('footerTagline').textContent = dict.footerTagline;
    document.getElementById('footerCopy').textContent = dict.footerCopy;
    document.getElementById('welcomeTitle').textContent = dict.welcomeTitle;
    document.getElementById('welcomeText').textContent = dict.welcomeText;
    document.getElementById('welcomeName').placeholder = dict.welcomeName;
    document.getElementById('welcomeStartBtn').textContent = dict.welcomeStart;
    document.getElementById('welcomeSkipBtn').textContent = dict.welcomeSkip;
    const welcomeOr = document.getElementById('welcomeOrText');
    if (welcomeOr) welcomeOr.textContent = dict.welcomeOr;
    const welcomeGoogleText = document.getElementById('welcomeGoogleText');
    if (welcomeGoogleText) welcomeGoogleText.textContent = dict.googleSignIn;
    const profileGoogleText = document.getElementById('profileGoogleText');
    if (profileGoogleText) profileGoogleText.textContent = dict.googleSignIn;
    const signOutBtn = document.getElementById('profileSignOutBtn');
    if (signOutBtn) signOutBtn.textContent = dict.googleSignOut;
    document.getElementById('heroGameCount').textContent = ALL_GAMES.length;
    document.getElementById('todayGamesMax').textContent = ALL_GAMES.length;
    const recentTitle = document.getElementById('recentTitle');
    if (recentTitle) recentTitle.textContent = dict.recent;
    const installText = document.getElementById('installBannerText');
    if (installText) installText.textContent = dict.installBanner;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.textContent = dict.installBtn;
    const tabs = document.querySelectorAll('.tab-btn');
    const tabKeys = ['tabAll', 'tabPuzzle', 'tabCard', 'tabOnline', 'tabFav'];
    tabs.forEach((btn, i) => { if (tabKeys[i]) btn.textContent = dict[tabKeys[i]]; });
  } catch(e) {}
  if (document.getElementById('gameSearchInput')) document.getElementById('gameSearchInput').placeholder = dict.searchPlaceholder;
  renderFeatured();
  renderRecent();
  init();
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
  if (btnEvent) {
    const btn = btnEvent.target.closest ? btnEvent.target.closest('.tab-btn') : btnEvent.target;
    if (btn) btn.classList.add('active');
  }
  renderGames();
}

function renderGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  
  const searchInput = document.getElementById('gameSearchInput');
  const term = searchInput ? searchInput.value.toLowerCase() : '';
  let favs = getStore('favorites', []);
  if (!Array.isArray(favs)) favs = [];
  const dict = DICT[currentLang];

  const filtered = ALL_GAMES.filter(g => {
    if (currentCategory !== 'all' && currentCategory !== 'favorites' && g.category !== currentCategory) return false;
    if (currentCategory === 'favorites' && !favs.includes(g.id)) return false;
    const gameName = g.name.ar + ' ' + g.name.en;
    return !term || gameName.toLowerCase().includes(term);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">${dict.emptyGames}</div></div>`;
    return;
  }

  grid.innerHTML = filtered.map(g => {
    const best = getStore(`best_${g.id}`, '---');
    const isFav = favs.includes(g.id);
    const catKey = CAT_LABELS[g.category];
    const catLabel = catKey ? dict[catKey] : '';
    const catClass = g.category === 'card' ? 'cat-card' : g.category === 'online' ? 'cat-online' : '';
    return `<div class="game-card" data-game-id="${g.id}">
      <div class="card-actions">
        <button class="card-action-btn ${isFav ? 'active-fav' : ''}" data-action="favorite" data-game-id="${g.id}" title="المفضلة">⭐</button>
        <button class="card-action-btn" data-action="share" data-game-id="${g.id}" data-game-name="${g.name[currentLang]}" title="مشاركة">🔗</button>
      </div>
      ${g.isNew ? `<span class="new-badge">${dict.newBadge}</span>` : ''}
      <span class="game-icon">${g.icon}</span>
      <div class="game-name">${g.name[currentLang]}</div>
      <div class="game-desc">${g.desc[currentLang]}</div>
      <div class="game-best">${dict.best} ${best}</div>
      ${catLabel ? `<span class="cat-badge ${catClass}">${catLabel}</span>` : ''}
    </div>`;
  }).join('');
}

function trackRecentGame(id) {
  let recent = getStore('recentGames', []);
  if (!Array.isArray(recent)) recent = [];
  recent = recent.filter(r => r !== id);
  recent.unshift(id);
  recent = recent.slice(0, 6);
  setStore('recentGames', recent);
  renderRecent();
}

function renderRecent() {
  const section = document.getElementById('recentSection');
  const container = document.getElementById('recentGames');
  if (!section || !container) return;

  const recent = getStore('recentGames', []);
  if (!Array.isArray(recent) || recent.length === 0) {
    section.classList.add('d-none');
    return;
  }

  section.classList.remove('d-none');
  container.innerHTML = recent.map(id => {
    const g = ALL_GAMES.find(x => x.id === id);
    if (!g) return '';
    return `<div class="recent-card" data-game-id="${g.id}">
      <span class="game-icon">${g.icon}</span>
      <div class="game-name">${g.name[currentLang]}</div>
    </div>`;
  }).join('');
}

function renderFeatured() {
  const container = document.getElementById('featuredGames');
  if (!container) return;
  const dict = DICT[currentLang];
  container.innerHTML = FEATURED_IDS.map(id => {
    const g = ALL_GAMES.find(x => x.id === id);
    if (!g) return '';
    return `<div class="featured-card" data-game-id="${g.id}">
      <span class="game-icon">${g.icon}</span>
      <div class="game-name">${g.name[currentLang]}</div>
      <div class="featured-badge">${dict.hot}</div>
    </div>`;
  }).join('');
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
  'baloot': 'baloot-game.js',
  'money': 'money-game.js',
  'empire': 'empire-game.js',
  'domino': 'domino-game.js',
  'invest': 'invest-game.js'
};

const gameInitializers = {
  'memory': () => typeof initMemory === 'function' && initMemory(),
  'word': () => typeof initWord === 'function' && initWord(),
  'reaction': () => typeof initReaction === 'function' && initReaction(),
  'color': () => typeof initColor === 'function' && initColor(),
  'snake': () => typeof initSnakeDisplay === 'function' && initSnakeDisplay(),
  'math': () => typeof initMath === 'function' && initMath(),
  'guesser': () => typeof initGuesser === 'function' && initGuesser(),
  'sequence': () => typeof initSequence === 'function' && initSequence(),
  'agar': () => typeof initAgar === 'function' && initAgar(),
  'anime': () => typeof initAnime === 'function' && initAnime(),
  'baloot': () => typeof initBaloot === 'function' && initBaloot(),
  'uno': () => typeof initUno === 'function' && initUno(),
  'money': () => typeof initMoney === 'function' && initMoney(),
  'empire': () => typeof initEmpire === 'function' && initEmpire(),
  'domino': () => typeof initDomino === 'function' && initDomino(),
  'invest': () => typeof initInvest === 'function' && initInvest()
};

function openGame(id) {
  playSound('blip');
  trackRecentGame(id);
  const overlay = document.getElementById(id+'Overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow='hidden';
  }

  if (gameFiles[id] && !loadedScripts[id]) {
    showToast(DICT[currentLang].loadingGame);
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
    restorePlayerNames();
  }

  if (gameInitializers[id]) {
    gameInitializers[id]();
  }
}

const gameClosers = {
  'snake': () => typeof stopSnake === 'function' && stopSnake(),
  'math': () => typeof stopMath === 'function' && stopMath(),
  'color': () => typeof stopColor === 'function' && stopColor(),
  'agar': () => typeof closeAgar === 'function' && closeAgar(),
  'anime': () => typeof closeAnime === 'function' && closeAnime(),
  'baloot': () => typeof closeBaloot === 'function' && closeBaloot(),
  'uno': () => typeof closeUno === 'function' && closeUno(),
  'money': () => typeof stopMoney === 'function' && stopMoney(),
  'empire': () => typeof closeEmpire === 'function' && closeEmpire(),
  'domino': () => typeof closeDomino === 'function' && closeDomino(),
  'invest': () => typeof closeInvest === 'function' && closeInvest()
};

function closeGame(id){
  playSound('blip');
  const overlay = document.getElementById(id+'Overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  document.body.style.overflow='';
  if (gameClosers[id]) {
    gameClosers[id]();
  }
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
      showToast(`🎉 ${DICT[currentLang].levelUp} ${newLevel} 🌟`);
  }
  setStore('quest_score', getStore('quest_score', 0) + pts); // إضافة للنقاط اليومية
  checkAchievements();
}
function recordGamePlayed(){
  const max = ALL_GAMES.length;
  let cnt=getStore('todayGamesCount',0)+1;
  setStore('todayGamesCount',Math.min(cnt,max));
  document.getElementById('todayGames').textContent=Math.min(cnt,max);
  setStore('quest_play', getStore('quest_play', 0) + 1);
  checkAchievements();
}

function playRandomGame() {
  playSound('blip');
  const random = ALL_GAMES[Math.floor(Math.random() * ALL_GAMES.length)];
  openGame(random.id);
}

function getPlayerName() {
  return currentUser?.name || getStore('globalPlayerName', '') || (currentLang === 'ar' ? 'لاعب مجهول' : 'Anonymous');
}

function hasPlayerIdentity() {
  if (currentUser?.name) return true;
  const name = getStore('globalPlayerName', '');
  return typeof name === 'string' && name.trim().length > 0;
}

function savePlayerName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  setStore('globalPlayerName', trimmed);
  setStore('welcomeSeen', true);
  restorePlayerNames(trimmed);
}

function restorePlayerNames(name) {
  const saved = name || getStore('globalPlayerName', '');
  if (!saved) return;
  ['welcomeName', 'profileName', 'agarName', 'balootName', 'unoName'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = saved;
  });
}

// ─── GOOGLE AUTH ───
async function checkAuth() {
  try {
    const statusRes = await fetch('/auth/status', { credentials: 'include' });
    if (statusRes.ok) {
      const status = await statusRes.json();
      googleAuthEnabled = !!status.googleEnabled;
    }
    const res = await fetch('/auth/me', { credentials: 'include' });
    if (res.ok) {
      currentUser = await res.json();
      applyAuthUser(currentUser);
    } else {
      currentUser = null;
    }
  } catch (e) {
    currentUser = null;
  }
  updateAuthUI();
}

function applyAuthUser(user) {
  if (!user) return;
  savePlayerName(user.name);
  const profileName = document.getElementById('profileName');
  if (profileName) profileName.value = user.name;
}

function updateAuthUI() {
  const signedIn = !!currentUser;
  const showGoogle = googleAuthEnabled && !signedIn;

  ['welcomeGoogleBtn', 'profileGoogleBtn'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('d-none', !showGoogle);
  });
  const divider = document.getElementById('welcomeAuthDivider');
  if (divider) divider.classList.toggle('d-none', !showGoogle);

  const guestUser = document.getElementById('profileGuestUser');
  const googleUser = document.getElementById('profileGoogleUser');
  if (guestUser) guestUser.classList.toggle('d-none', signedIn);
  if (googleUser) googleUser.classList.toggle('d-none', !signedIn);

  if (signedIn) {
    const avatar = document.getElementById('profileGoogleAvatar');
    const nameEl = document.getElementById('profileGoogleName');
    const emailEl = document.getElementById('profileGoogleEmail');
    if (avatar && currentUser.avatar_url) {
      avatar.src = currentUser.avatar_url;
      avatar.alt = currentUser.name;
    }
    if (nameEl) nameEl.textContent = currentUser.name;
    if (emailEl) emailEl.textContent = currentUser.email || '';
  }

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.classList.toggle('profile-btn-signed-in', signedIn);
    profileBtn.title = signedIn ? currentUser.name : (currentLang === 'ar' ? 'الملف الشخصي' : 'Profile');
  }
}

async function signOut() {
  try {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (e) { /* ignore */ }
  currentUser = null;
  updateAuthUI();
  showToast(currentLang === 'ar' ? 'تم تسجيل الخروج' : 'Signed out');
  closeProfile();
}

function handleAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const auth = params.get('auth');
  if (!auth) return;
  params.delete('auth');
  const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
  if (auth === 'success') {
    checkAuth().then(() => showToast(DICT[currentLang].authSuccess));
  } else if (auth === 'failed') {
    showToast(DICT[currentLang].authFailed);
  }
}

async function initAuthAndWelcome() {
  await checkAuth();
  restorePlayerNames();
  if (hasPlayerIdentity()) setStore('welcomeSeen', true);
  else setTimeout(showWelcome, 800);
}

function showWelcome() {
  if (getStore('welcomeSeen', false) || hasPlayerIdentity()) return;
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.value = getStore('globalPlayerName', '');
  document.getElementById('welcomeOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWelcome() {
  setStore('welcomeSeen', true);
  document.getElementById('welcomeOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function startFromWelcome() {
  const name = document.getElementById('welcomeName').value.trim();
  if (name) savePlayerName(name);
  closeWelcome();
  playSound('levelup');
  showToast(currentLang === 'ar' ? `مرحباً ${name || 'بك'}! 🎮` : `Welcome ${name || ''}! 🎮`);
}

function setupScrollTop() {
  let btn = document.getElementById('scrollTopBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'scrollTopBtn';
    btn.className = 'scroll-top-btn';
    btn.title = 'الأعلى';
    btn.textContent = '↑';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
  }
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
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
      let playerName = getPlayerName();
      if (!hasPlayerIdentity()) {
        const prompted = prompt('🎉 رقم قياسي جديد! أدخل اسمك للوحة الصدارة:', playerName);
        if (!prompted) return;
        playerName = prompted;
        savePlayerName(playerName);
      }
      try {
        await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ game_id, player_name: playerName, score }) });
        showToast('تم حفظ نتيجتك في لوحة الصدارة 🏆');
      } catch(e) { console.error(e); }
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
  const dict = DICT[currentLang];
  content.innerHTML = `<div class="leaderboard-status">${dict.lbLoading}</div>`;
  try {
    const res = await fetch(`/api/leaderboard/${game_id}?sort=${isLowerBetter ? 'asc' : 'desc'}`);
    const data = await res.json();
    if (data.length === 0) { content.innerHTML = `<div class="leaderboard-status empty">${dict.lbEmpty}</div>`; return; }
    let html = `<table class="leaderboard-table"><tr><th>#</th><th>${dict.lbPlayer}</th><th>${dict.lbScore}</th></tr>`;
    data.forEach((row, i) => {
        const displayScore = game_id === 'reaction' ? row.score + ' ms' : row.score;
        let rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        let medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
        html += `<tr class="${rankClass}"><td>${medal}${i+1}</td><td>${row.player_name}</td><td class="leaderboard-score">${displayScore}</td></tr>`;
    });
    content.innerHTML = html + '</table>';
  } catch(e) { content.innerHTML = `<div class="leaderboard-status error">${dict.lbError}</div>`; }
}

// ─── THE REST OF THE 7 FEATURES ───
function toggleFavorite(id) {
  playSound('blip');
  let favs = getStore('favorites', []);
  if (!Array.isArray(favs)) favs = [];
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id); showToast('تمت الإزالة من المفضلة 💔');
  } else {
    favs.push(id); showToast('تمت الإضافة للمفضلة ⭐');
  }
  setStore('favorites', favs); renderGames();
}

function shareGame(id, name) {
  playSound('blip');
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
  const dict = DICT[currentLang];
  const quests = [
    { id: 'play', target: 5, reward: 200, name: dict.questPlay },
    { id: 'score', target: 500, reward: 300, name: dict.questScore },
    { id: 'online', target: 1, reward: 150, name: dict.questOnline }
  ];
  list.innerHTML = quests.map(q => {
    const current = Math.min(getStore('quest_' + q.id, 0), q.target);
    const claimed = getStore('quest_claimed_' + q.id, false);
    const pct = (current / q.target) * 100;
    const btnHtml = claimed ? `<button class="btn btn-dark" disabled>${dict.questClaimed}</button>` : current >= q.target ? `<button class="btn btn-green" onclick="claimQuest('${q.id}', ${q.reward})">${dict.questClaim}</button>` : `<button class="btn btn-dark" disabled>${current}/${q.target}</button>`;
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

  if (!currentUser) {
    document.getElementById('profileName').value = getStore('globalPlayerName', '');
    const avatarSelect = document.getElementById('profileAvatar');
    avatarSelect.innerHTML = AVATARS.map(a => `<option value="${a}">${a}</option>`).join('');
    avatarSelect.value = getStore('globalPlayerAvatar', '👤');
  }

  updateAuthUI();

  const cloudId = getStore('investCloudId', '');
  const codeEl = document.getElementById('profileCloudCode');
  const boxEl = document.getElementById('profileCloudBox');
  if (codeEl && boxEl) {
    codeEl.textContent = cloudId || '—';
    boxEl.classList.toggle('d-none', !cloudId);
  }

  renderAchievements();
}

function copyCloudCode() {
  const cloudId = getStore('investCloudId', '');
  if (!cloudId) { showToast('لا يوجد رمز بعد — العب الاستثمار واحفظ سحابياً أولاً'); return; }
  navigator.clipboard.writeText(cloudId);
  playSound('coin');
  showToast('📋 تم نسخ رمزك السحابي: ' + cloudId);
}
function closeProfile() { playSound('blip'); document.getElementById('profileOverlay').classList.remove('active'); }
function saveProfile() {
  if (currentUser) return;
  savePlayerName(document.getElementById('profileName').value);
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

// ─── PWA (Service Worker + Install) ───
let deferredInstallPrompt = null;

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function setupInstallPrompt() {
  if (getStore('installDismissed', false)) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('d-none');
  });
}

function promptInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    deferredInstallPrompt = null;
    document.getElementById('installBanner').classList.add('d-none');
  });
}

function dismissInstall() {
  setStore('installDismissed', true);
  document.getElementById('installBanner').classList.add('d-none');
}

function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('game');
  if (gameId && ALL_GAMES.some(g => g.id === gameId)) {
    setTimeout(() => openGame(gameId), 500);
  }
}

function closeActiveOverlay() {
  const active = document.querySelector('.overlay.active');
  if (!active) return;
  const id = active.id;
  if (id === 'welcomeOverlay') { closeWelcome(); return; }
  if (id === 'leaderboardOverlay') { closeLeaderboard(); return; }
  if (id === 'questsOverlay') { closeQuests(); return; }
  if (id === 'profileOverlay') { closeProfile(); return; }
  const gameId = id.replace('Overlay', '');
  if (gameId) closeGame(gameId);
}

  // ─── EVENT LISTENERS ───
  function setupEventListeners() {
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    document.getElementById('langBtn').addEventListener('click', toggleLang);
    document.getElementById('soundBtn').addEventListener('click', toggleSound);
    document.getElementById('radioBtn').addEventListener('click', nextRadioStation);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    document.getElementById('questsBtn').addEventListener('click', openQuests);
    document.getElementById('leaderboardBtn').addEventListener('click', openLeaderboard);
    document.getElementById('profileBtn').addEventListener('click', openProfile);
    document.getElementById('gameSearchInput').addEventListener('input', filterGames);
    document.getElementById('randomGameBtn').addEventListener('click', playRandomGame);
    document.getElementById('heroQuestsBtn').addEventListener('click', openQuests);
    document.getElementById('footerLeaderBtn').addEventListener('click', openLeaderboard);
    document.getElementById('footerProfileBtn').addEventListener('click', openProfile);
    document.getElementById('footerQuestsBtn').addEventListener('click', openQuests);
    document.getElementById('welcomeStartBtn').addEventListener('click', startFromWelcome);
    document.getElementById('welcomeSkipBtn').addEventListener('click', closeWelcome);

    const installBtn = document.getElementById('installBtn');
    const installDismiss = document.getElementById('installDismiss');
    if (installBtn) installBtn.addEventListener('click', promptInstall);
    if (installDismiss) installDismiss.addEventListener('click', dismissInstall);

    const signOutBtn = document.getElementById('profileSignOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', signOut);

    document.getElementById('recentGames').addEventListener('click', (e) => {
      const card = e.target.closest('.recent-card');
      if (card) openGame(card.dataset.gameId);
    });

    document.getElementById('categoryTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      filterCategory(btn.dataset.cat, e);
    });

    document.getElementById('featuredGames').addEventListener('click', (e) => {
      const card = e.target.closest('.featured-card');
      if (card) openGame(card.dataset.gameId);
    });

    document.getElementById('gamesGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.game-card');
      const actionBtn = e.target.closest('.card-action-btn');

      if (actionBtn) {
        e.stopPropagation();
        const { action, gameId, gameName } = actionBtn.dataset;
        if (action === 'favorite') toggleFavorite(gameId);
        if (action === 'share') shareGame(gameId, gameName);
      } else if (card) {
        openGame(card.dataset.gameId);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeActiveOverlay();
      if (e.key === '/' && document.activeElement !== document.getElementById('gameSearchInput')) {
        e.preventDefault();
        document.getElementById('gameSearchInput').focus();
      }
    });
  }

  // ─── INITIALIZATION ───
  applyTheme();
  applyLang();
  applySoundState();
  setupEventListeners();
  setupScrollTop();
  registerServiceWorker();
  setupInstallPrompt();
  handleDeepLink();
  handleAuthRedirect();
  initAuthAndWelcome();

  // تصدير الدوال للـ HTML onclick
  const api = {
    filterCategory, closeGame, openLeaderboard, closeLeaderboard, fetchLeaderboard,
    closeQuests, claimQuest, closeProfile, saveProfile, exportSave, importSave, copyCloudCode, signOut,
    playRandomGame, showWelcome, closeWelcome, startFromWelcome, savePlayerName, restorePlayerNames,
    openGame, toggleFavorite, shareGame, addScore, recordGamePlayed,
    submitScore, showToast, getStore, setStore, playSound
  };
  Object.assign(window, api);

})();