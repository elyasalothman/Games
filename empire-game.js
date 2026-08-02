// ─────────────────────────────────────────────
// 👑 عرش الذهب — Gold Throne
// ─────────────────────────────────────────────

const EMPIRE_STORAGE_KEY = 'empireGameProgress';
const EMPIRE_OFFLINE_CAP_HOURS = 8;
const EMPIRE_COMBO_WINDOW_MS = 900;
const EMPIRE_COMBO_MAX = 10;
const EMPIRE_CRIT_CHANCE = 0.14;
const EMPIRE_CRIT_MULT = 3;
const EMPIRE_FEVER_NEED = 18;
const EMPIRE_FEVER_MS = 8000;
const EMPIRE_ORB_MIN_MS = 9000;
const EMPIRE_ORB_MAX_MS = 16000;

const EMPIRE_BIZ = [
  { id: 'lemon',  icon: '🍋', color: '#f4c430', name: { ar: 'كشك ليمون', en: 'Lemon Stand' }, baseCost: 15, baseCps: 0.1 },
  { id: 'news',   icon: '📰', color: '#7eb8da', name: { ar: 'جريدة', en: 'Newspaper' }, baseCost: 100, baseCps: 1 },
  { id: 'cafe',   icon: '☕', color: '#c4a484', name: { ar: 'مقهى', en: 'Café' }, baseCost: 1100, baseCps: 8 },
  { id: 'shop',   icon: '🏪', color: '#ff8c42', name: { ar: 'متجر', en: 'Shop' }, baseCost: 12000, baseCps: 47 },
  { id: 'factory',icon: '🏭', color: '#8b9bb4', name: { ar: 'مصنع', en: 'Factory' }, baseCost: 130000, baseCps: 260 },
  { id: 'bank',   icon: '🏦', color: '#3dd6c6', name: { ar: 'بنك', en: 'Bank' }, baseCost: 1400000, baseCps: 1400 },
  { id: 'tower',  icon: '🏙️', color: '#6c8cff', name: { ar: 'ناطحة', en: 'Tower' }, baseCost: 20000000, baseCps: 7800 },
  { id: 'tech',   icon: '🚀', color: '#ff6b9d', name: { ar: 'شركة تقنية', en: 'Tech Co' }, baseCost: 330000000, baseCps: 44000 },
  { id: 'world',  icon: '🌐', color: '#a78bfa', name: { ar: 'إمبراطورية', en: 'Empire' }, baseCost: 5100000000, baseCps: 260000 }
];

const EMPIRE_PRESTIGE_COST = 1000000;
const EMPIRE_EVENTS = [
  { id: 'boom', ar: '📈 ازدهار اقتصادي! دخل أعمالك ×1.5 لدقيقة.', en: '📈 Economic boom! Business income ×1.5 for a minute.', mul: 1.5, secs: 60 },
  { id: 'tax', ar: '🧾 ضريبة مفاجئة — خسرت 8% من الرصيد.', en: '🧾 Surprise tax — lost 8% of cash.', tax: 0.08 },
  { id: 'viral', ar: '📱 منتجك انتشر! +مكافأة نقدية.', en: '📱 Your product went viral! Cash bonus.', bonusPct: 0.12 },
  { id: 'strike', ar: '⏸ إضراب عمال — الدخل يتباطأ قليلاً.', en: '⏸ Worker strike — income slows briefly.', mul: 0.6, secs: 40 },
  { id: 'goldrush', ar: '🏆 حمّى ذهب! اللمسات ×2 لمدة 45 ثانية.', en: '🏆 Gold rush! Taps ×2 for 45 seconds.', tapMul: 2, secs: 45 }
];
const EMPIRE_MILESTONES = [100, 1000, 10000, 100000, 1000000];

let empireState = null;
let empireTickTimer = null;
let empireSaveTimer = null;
let empireFloatId = 0;
let empireEventMul = 1;
let empireEventUntil = 0;
let empireTapEventMul = 1;
let empireTapEventUntil = 0;
let empireMilestoneHit = {};
let empireCombo = 0;
let empireLastTapAt = 0;
let empireFeverUntil = 0;
let empireOrbTimer = null;
let empireMaxCombo = 0;
let empireSaveDebounce = null;
let empirePersistBound = false;

function empireLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'ar';
}

function empireT(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[empireLang()] || obj.ar || obj.en || '';
}

function empireFmt(n) {
  const v = Math.max(0, Number(n) || 0);
  const abs = Math.abs(v);
  const locale = empireLang() === 'ar' ? 'ar-SA' : 'en-US';
  if (abs < 1000) return Math.floor(v).toLocaleString(locale);
  const units = [
    { v: 1e15, s: 'Q' }, { v: 1e12, s: 'T' }, { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' }, { v: 1e3, s: 'K' }
  ];
  for (const u of units) {
    if (abs >= u.v) return (v / u.v).toFixed(2).replace(/\.00$/, '') + u.s;
  }
  return Math.floor(v).toLocaleString(locale);
}

function defaultEmpireState() {
  const owned = {};
  EMPIRE_BIZ.forEach(b => { owned[b.id] = 0; });
  return {
    cash: 0,
    totalEarned: 0,
    lifetimeEarned: 0,
    tapPower: 1,
    tapLevel: 0,
    owned,
    prestige: 0,
    prestigeMult: 1,
    lastSeen: Date.now(),
    started: false,
    maxCombo: 0,
    crits: 0
  };
}

function empireHasProgress(state) {
  if (!state) return false;
  const owned = state.owned && typeof state.owned === 'object'
    ? Object.values(state.owned).reduce((s, n) => s + (Number(n) || 0), 0)
    : 0;
  return (Number(state.cash) || 0) > 0
    || (Number(state.totalEarned) || 0) > 0
    || (Number(state.lifetimeEarned) || 0) > 0
    || (Number(state.prestige) || 0) > 0
    || (Number(state.tapLevel) || 0) > 0
    || owned > 0;
}

/** استعادة طارئة إذا ضاع الحفظ لكن أفضل نتيجة محفوظة */
function recoverEmpireFromBest(base) {
  const best = Number(getStore('best_empire', 0)) || 0;
  if (best <= 0) return base;
  const recovered = {
    ...base,
    cash: best,
    totalEarned: best,
    lifetimeEarned: best,
    started: true,
    lastSeen: Date.now()
  };
  if (typeof showToast === 'function') {
    showToast(empireLang() === 'en'
      ? `👑 Restored your Gold Throne progress ($${empireFmt(best)})`
      : `👑 تم استعادة تقدّمك في عرش الذهب ($${empireFmt(best)})`);
  }
  return recovered;
}

function loadEmpireState() {
  const saved = getStore(EMPIRE_STORAGE_KEY, null);
  const base = defaultEmpireState();
  if (!saved || typeof saved !== 'object') {
    return recoverEmpireFromBest(base);
  }
  const merged = {
    ...base,
    ...saved,
    owned: { ...base.owned, ...(saved.owned || {}) }
  };
  if (!merged.lifetimeEarned) {
    merged.lifetimeEarned = merged.totalEarned || 0;
  }
  // إن كان الحفظ فارغاً فعلياً لكن أفضل نتيجة موجودة — استعد
  if (!empireHasProgress(merged)) {
    return recoverEmpireFromBest(base);
  }
  return merged;
}

function saveEmpireState() {
  if (!empireState) return;
  empireState.lastSeen = Date.now();
  const payload = {
    cash: empireState.cash,
    totalEarned: empireState.totalEarned,
    lifetimeEarned: empireState.lifetimeEarned,
    tapPower: empireState.tapPower,
    tapLevel: empireState.tapLevel,
    owned: empireState.owned,
    prestige: empireState.prestige,
    prestigeMult: empireState.prestigeMult,
    lastSeen: empireState.lastSeen,
    started: empireState.started,
    maxCombo: empireState.maxCombo || 0,
    crits: empireState.crits || 0
  };
  setStore(EMPIRE_STORAGE_KEY, payload);
  // حدّث أفضل نتيجة باستمرار حتى يمكن الاستعادة لاحقاً
  const lifetime = Math.floor(empireState.lifetimeEarned || empireState.totalEarned || 0);
  if (lifetime > 0) {
    const prevBest = Number(getStore('best_empire', 0)) || 0;
    if (lifetime > prevBest) setStore('best_empire', lifetime);
  }
}

function scheduleEmpireSave(immediate) {
  if (immediate) {
    if (empireSaveDebounce) {
      clearTimeout(empireSaveDebounce);
      empireSaveDebounce = null;
    }
    saveEmpireState();
    return;
  }
  if (empireSaveDebounce) return;
  empireSaveDebounce = setTimeout(() => {
    empireSaveDebounce = null;
    saveEmpireState();
  }, 400);
}

function reloadEmpireFromStorage() {
  const next = loadEmpireState();
  // لا تستبدل تقدماً في الذاكرة بأضعف من التخزين أو العكس — خذ الأفضل
  if (empireState && empireHasProgress(empireState)) {
    const memScore = (empireState.lifetimeEarned || 0) * 100 + (empireState.cash || 0);
    const nextScore = (next.lifetimeEarned || 0) * 100 + (next.cash || 0);
    if (memScore > nextScore) {
      saveEmpireState();
      return;
    }
  }
  empireState = next;
  empireMaxCombo = empireState.maxCombo || 0;
  const playOpen = !document.getElementById('empirePlay')?.classList.contains('d-none');
  if (playOpen || empireState.started) {
    renderEmpireAll();
  } else {
    renderEmpireStart();
  }
}

function bindEmpirePersist() {
  if (empirePersistBound) return;
  empirePersistBound = true;
  const flush = () => {
    if (empireState) scheduleEmpireSave(true);
  };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

function empireBizCost(biz, owned) {
  return Math.floor(biz.baseCost * Math.pow(1.15, owned));
}

function empireTapCost(level) {
  return Math.floor(20 * Math.pow(1.48, level));
}

function empireCps() {
  if (!empireState) return 0;
  let cps = 0;
  EMPIRE_BIZ.forEach(b => {
    cps += b.baseCps * (empireState.owned[b.id] || 0);
  });
  const eventActive = Date.now() < empireEventUntil ? empireEventMul : 1;
  return cps * (empireState.prestigeMult || 1) * eventActive;
}

function empireComboMult() {
  if (empireCombo <= 1) return 1;
  return Math.min(EMPIRE_COMBO_MAX, 1 + (empireCombo - 1) * 0.35);
}

function empireFeverActive() {
  return Date.now() < empireFeverUntil;
}

function empireTapEventActive() {
  return Date.now() < empireTapEventUntil ? empireTapEventMul : 1;
}

/** قوة اللمسة: ترقية + نسبة من الدخل/ثانية حتى تبقى اللمسة مجزية دائماً */
function empireTapGain(opts = {}) {
  if (!empireState) return 1;
  const cps = empireCps();
  const base = empireState.tapPower + Math.floor(cps * 0.22) + Math.floor(Math.sqrt(Math.max(0, empireState.totalEarned)) * 0.015);
  let gain = Math.max(1, Math.floor(base * (empireState.prestigeMult || 1)));
  gain = Math.floor(gain * empireComboMult());
  if (empireFeverActive()) gain *= 2;
  gain = Math.floor(gain * empireTapEventActive());
  if (opts.crit) gain = Math.floor(gain * EMPIRE_CRIT_MULT);
  return Math.max(1, gain);
}

function empireStage() {
  if (!empireState) return EMPIRE_BIZ[0];
  for (let i = EMPIRE_BIZ.length - 1; i >= 0; i--) {
    if ((empireState.owned[EMPIRE_BIZ[i].id] || 0) > 0) return EMPIRE_BIZ[i];
  }
  return EMPIRE_BIZ[0];
}

function initEmpire() {
  bindEmpirePersist();
  empireState = loadEmpireState();
  empireMaxCombo = empireState.maxCombo || 0;
  applyOfflineEmpire();
  saveEmpireState();
  renderEmpireStart();
  if (empireState.started) {
    showEmpirePlay();
  } else {
    showEmpireLobby();
  }
}

function applyOfflineEmpire() {
  const last = empireState.lastSeen || Date.now();
  const hours = Math.min(EMPIRE_OFFLINE_CAP_HOURS, (Date.now() - last) / 3600000);
  if (hours < 0.02) return;
  const earned = Math.floor(empireCps() * hours * 3600 * 0.5);
  if (earned <= 0) return;
  empireState.cash += earned;
  empireState.totalEarned += earned;
  empireState.lifetimeEarned += earned;
  const msg = empireLang() === 'en'
    ? `💰 Offline earnings: $${empireFmt(earned)}`
    : `💰 كسبت أثناء غيابك: $${empireFmt(earned)}`;
  if (typeof showToast === 'function') showToast(msg);
}

function showEmpireLobby() {
  document.getElementById('empireLobby').classList.remove('d-none');
  document.getElementById('empirePlay').classList.add('d-none');
  stopEmpireLoop();
  clearEmpireOrbs();
  renderEmpireStart();
}

function showEmpirePlay() {
  document.getElementById('empireLobby').classList.add('d-none');
  document.getElementById('empirePlay').classList.remove('d-none');
  empireState.started = true;
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
  renderEmpireAll();
  startEmpireLoop();
  saveEmpireState();
}

function startEmpireGame() {
  if (!empireState) empireState = loadEmpireState();
  empireState.started = true;
  showEmpirePlay();
  if (typeof playSound === 'function') playSound('levelup');
}

function continueEmpireGame() {
  if (!empireState) empireState = loadEmpireState();
  showEmpirePlay();
}

function closeEmpire() {
  stopEmpireLoop();
  clearEmpireOrbs();
  if (empireState) {
    const lifetime = empireState.lifetimeEarned || empireState.totalEarned;
    if (typeof submitScore === 'function') submitScore('empire', Math.floor(lifetime), false);
    scheduleEmpireSave(true);
  }
}

function stopEmpireLoop() {
  if (empireTickTimer) {
    clearInterval(empireTickTimer);
    empireTickTimer = null;
  }
  if (empireSaveTimer) {
    clearInterval(empireSaveTimer);
    empireSaveTimer = null;
  }
  if (empireOrbTimer) {
    clearTimeout(empireOrbTimer);
    empireOrbTimer = null;
  }
}

function startEmpireLoop() {
  stopEmpireLoop();
  empireTickTimer = setInterval(() => {
    if (!empireState || !empireState.started) return;
    const gain = empireCps() / 10;
    if (gain > 0) {
      empireState.cash += gain;
      empireState.totalEarned += gain;
      empireState.lifetimeEarned += gain;
      updateEmpireHud();
    }
    // اضمحلال الكومبو إن توقّف اللمس
    if (empireCombo > 0 && Date.now() - empireLastTapAt > EMPIRE_COMBO_WINDOW_MS) {
      empireCombo = 0;
      updateEmpireComboUI();
    }
    if (!empireFeverActive()) {
      document.getElementById('empirePlay')?.classList.remove('fever');
      document.getElementById('empireFeverBadge')?.classList.add('d-none');
    }
    empireMaybeEvent();
    empireCheckMilestones();
  }, 100);
  empireSaveTimer = setInterval(saveEmpireState, 2000);
  scheduleEmpireOrb();
}

function renderEmpireStart() {
  const best = getStore('best_empire', 0);
  const bestEl = document.getElementById('empireBestLobby');
  if (bestEl) bestEl.textContent = '$' + empireFmt(best);

  const cont = document.getElementById('empireContinueBtn');
  if (cont) {
    const hasProgress = empireState && (empireState.cash > 0 || empireState.totalEarned > 0 || empireState.prestige > 0);
    cont.classList.toggle('d-none', !hasProgress);
  }
}

function renderEmpireAll() {
  updateEmpireHud();
  renderEmpireBiz();
  updateEmpireTapUpgrade();
  updateEmpirePrestige();
  updateEmpireStageVisual();
  updateEmpireComboUI();
}

function updateEmpireHud() {
  const cashEl = document.getElementById('empireCash');
  const cpsEl = document.getElementById('empireCps');
  const tapEl = document.getElementById('empireTapPower');
  const prestEl = document.getElementById('empirePrestige');
  const perSec = empireLang() === 'en' ? '/s' : '/ث';
  if (cashEl) cashEl.textContent = '$' + empireFmt(empireState.cash);
  if (cpsEl) cpsEl.textContent = '$' + empireFmt(empireCps()) + perSec;
  if (tapEl) tapEl.textContent = '+' + empireFmt(empireTapGain());
  if (prestEl) prestEl.textContent = '×' + (empireState.prestigeMult || 1).toFixed(1).replace(/\.0$/, '');
}

function updateEmpireStageVisual() {
  const stage = empireStage();
  const icon = document.getElementById('empireStageIcon');
  const label = document.getElementById('empireStageLabel');
  const ring = document.getElementById('empireTapBtn');
  if (icon) icon.textContent = stage.icon;
  if (label) label.textContent = empireT(stage.name);
  if (ring) ring.style.setProperty('--empire-accent', stage.color);
}

function updateEmpireComboUI() {
  const text = document.getElementById('empireComboText');
  const fill = document.getElementById('empireComboFill');
  const fever = document.getElementById('empireFeverBadge');
  const mult = empireComboMult();
  if (text) {
    text.textContent = empireLang() === 'en'
      ? `Combo ×${mult.toFixed(1)} · ${empireCombo}`
      : `كومبو ×${mult.toFixed(1)} · ${empireCombo}`;
  }
  if (fill) {
    const pct = Math.min(100, (empireCombo / EMPIRE_FEVER_NEED) * 100);
    fill.style.width = pct + '%';
  }
  if (fever) {
    fever.classList.toggle('d-none', !empireFeverActive());
    fever.textContent = empireLang() === 'en' ? '🔥 Fever!' : '🔥 حماس!';
  }
  document.getElementById('empirePlay')?.classList.toggle('fever', empireFeverActive());
  document.getElementById('empireTapBtn')?.classList.toggle('combo-hot', empireCombo >= 8);
}

function renderEmpireBiz() {
  const list = document.getElementById('empireBizList');
  if (!list || !empireState) return;
  const lang = empireLang();

  list.innerHTML = EMPIRE_BIZ.map(b => {
    const owned = empireState.owned[b.id] || 0;
    const cost = empireBizCost(b, owned);
    const canBuy = empireState.cash >= cost;
    const cps = b.baseCps * (empireState.prestigeMult || 1);
    const perSec = lang === 'en' ? '/s' : '/ث';
    const locked = owned === 0 && empireState.totalEarned < b.baseCost * 0.35 && b.id !== 'lemon';
    return `
      <button type="button" class="empire-biz ${canBuy && !locked ? 'affordable' : ''} ${locked ? 'locked' : ''}"
        data-biz="${b.id}" ${locked ? 'disabled' : ''} style="--biz-color:${b.color}">
        <span class="empire-biz-icon" aria-hidden="true">${locked ? '🔒' : b.icon}</span>
        <span class="empire-biz-info">
          <span class="empire-biz-name">${empireT(b.name)}</span>
          <span class="empire-biz-meta">${lang === 'en' ? 'Owned' : 'لديك'} ${owned} · +${empireFmt(cps)}${perSec}</span>
        </span>
        <span class="empire-biz-cost">$${empireFmt(cost)}</span>
      </button>
    `;
  }).join('');

  list.querySelectorAll('.empire-biz:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => buyEmpireBiz(btn.dataset.biz));
  });
}

function buyEmpireBiz(id) {
  const biz = EMPIRE_BIZ.find(b => b.id === id);
  if (!biz || !empireState) return;
  const owned = empireState.owned[id] || 0;
  const cost = empireBizCost(biz, owned);
  if (empireState.cash < cost) {
    if (typeof playSound === 'function') playSound('gameover');
    return;
  }
  empireState.cash -= cost;
  empireState.owned[id] = owned + 1;
  if (typeof playSound === 'function') playSound('coin');
  try { navigator.vibrate?.(12); } catch (_) {}
  renderEmpireAll();
  saveEmpireState();
}

function updateEmpireTapUpgrade() {
  const cost = empireTapCost(empireState.tapLevel);
  const costEl = document.getElementById('empireTapUpgradeCost');
  const lvlEl = document.getElementById('empireTapUpgradeLevel');
  const btn = document.getElementById('empireTapUpgradeBtn');
  if (costEl) costEl.textContent = empireFmt(cost);
  if (lvlEl) lvlEl.textContent = empireState.tapLevel;
  if (btn) btn.disabled = empireState.cash < cost;
}

function upgradeEmpireTap() {
  if (!empireState) return;
  const cost = empireTapCost(empireState.tapLevel);
  if (empireState.cash < cost) {
    if (typeof playSound === 'function') playSound('gameover');
    return;
  }
  empireState.cash -= cost;
  empireState.tapLevel += 1;
  // ترقية أقوى: +2 أساس، وتزيد كل 5 مستويات
  empireState.tapPower += 2 + Math.floor((empireState.tapLevel - 1) / 5);
  if (typeof playSound === 'function') playSound('levelup');
  renderEmpireAll();
  saveEmpireState();
}

function updateEmpirePrestige() {
  const btn = document.getElementById('empirePrestigeBtn');
  const hint = document.getElementById('empirePrestigeHint');
  const ready = empireState.totalEarned >= EMPIRE_PRESTIGE_COST;
  const nextMult = +(1 + (empireState.prestige + 1) * 0.5).toFixed(1);
  if (btn) {
    btn.disabled = !ready;
    btn.classList.toggle('ready', ready);
  }
  if (hint) {
    hint.textContent = empireLang() === 'en'
      ? (ready ? `Reset for ×${nextMult} forever` : `Need $${empireFmt(EMPIRE_PRESTIGE_COST)} earned`)
      : (ready ? `أعد للولادة واحصل على ×${nextMult} دائماً` : `تحتاج $${empireFmt(EMPIRE_PRESTIGE_COST)} إجمالي`);
  }
}

function doEmpirePrestige() {
  if (!empireState || empireState.totalEarned < EMPIRE_PRESTIGE_COST) return;
  const panel = document.getElementById('empirePrestigeConfirm');
  if (panel && panel.classList.contains('d-none')) {
    panel.classList.remove('d-none');
    return;
  }
  empireConfirmPrestige();
}

function empireConfirmPrestige() {
  if (!empireState || empireState.totalEarned < EMPIRE_PRESTIGE_COST) return;
  document.getElementById('empirePrestigeConfirm')?.classList.add('d-none');
  empireState.prestige += 1;
  empireState.prestigeMult = 1 + empireState.prestige * 0.5;
  empireState.cash = 0;
  empireState.tapPower = 1;
  empireState.tapLevel = 0;
  EMPIRE_BIZ.forEach(b => { empireState.owned[b.id] = 0; });
  empireState.totalEarned = 0;
  empireEventMul = 1;
  empireEventUntil = 0;
  empireTapEventMul = 1;
  empireTapEventUntil = 0;
  empireCombo = 0;
  empireFeverUntil = 0;

  if (typeof playSound === 'function') playSound('levelup');
  if (typeof showToast === 'function') {
    showToast(empireLang() === 'en'
      ? `👑 Prestige ${empireState.prestige}! ×${empireState.prestigeMult}`
      : `👑 ولادة ${empireState.prestige}! مضاعف ×${empireState.prestigeMult}`);
  }
  renderEmpireAll();
  saveEmpireState();
}

function empireCancelPrestige() {
  document.getElementById('empirePrestigeConfirm')?.classList.add('d-none');
}

function empireMaybeEvent() {
  if (!empireState?.started || Math.random() > 0.002) return;
  const ev = EMPIRE_EVENTS[Math.floor(Math.random() * EMPIRE_EVENTS.length)];
  if (ev.mul) {
    empireEventMul = ev.mul;
    empireEventUntil = Date.now() + (ev.secs || 40) * 1000;
  }
  if (ev.tapMul) {
    empireTapEventMul = ev.tapMul;
    empireTapEventUntil = Date.now() + (ev.secs || 40) * 1000;
  }
  if (ev.tax) {
    const lost = Math.floor(empireState.cash * ev.tax);
    empireState.cash = Math.max(0, empireState.cash - lost);
  }
  if (ev.bonusPct) {
    empireState.cash += Math.floor(Math.max(50, empireState.cash * ev.bonusPct));
  }
  const msg = empireLang() === 'en' ? ev.en : ev.ar;
  if (typeof showToast === 'function') showToast(msg);
  const banner = document.getElementById('empireEventBanner');
  if (banner) {
    banner.textContent = msg;
    banner.classList.remove('d-none');
    setTimeout(() => banner.classList.add('d-none'), 4500);
  }
}

function empireCheckMilestones() {
  if (!empireState) return;
  EMPIRE_MILESTONES.forEach(m => {
    if (empireState.lifetimeEarned >= m && !empireMilestoneHit[m]) {
      empireMilestoneHit[m] = true;
      if (typeof showToast === 'function') {
        showToast(empireLang() === 'en'
          ? `🏆 Milestone: $${empireFmt(m)} lifetime!`
          : `🏆 إنجاز: $${empireFmt(m)} إجمالي العمر!`);
      }
      if (typeof playSound === 'function') playSound('levelup');
      if (typeof addScore === 'function') addScore(20);
    }
  });
}

function registerEmpireCombo() {
  const now = Date.now();
  if (now - empireLastTapAt <= EMPIRE_COMBO_WINDOW_MS) {
    empireCombo += 1;
  } else {
    empireCombo = 1;
  }
  empireLastTapAt = now;
  if (empireCombo > (empireState.maxCombo || 0)) {
    empireState.maxCombo = empireCombo;
    empireMaxCombo = empireCombo;
  }
  if (empireCombo >= EMPIRE_FEVER_NEED && !empireFeverActive()) {
    empireFeverUntil = now + EMPIRE_FEVER_MS;
    if (typeof playSound === 'function') playSound('levelup');
    if (typeof showToast === 'function') {
      showToast(empireLang() === 'en' ? '🔥 FEVER MODE ×2 taps!' : '🔥 وضع الحماس — اللمسات ×2!');
    }
  }
  updateEmpireComboUI();
}

function empireTap(event) {
  if (!empireState || !empireState.started) return;
  registerEmpireCombo();

  const crit = Math.random() < EMPIRE_CRIT_CHANCE;
  const gain = empireTapGain({ crit });
  empireState.cash += gain;
  empireState.totalEarned += gain;
  empireState.lifetimeEarned += gain;
  if (crit) empireState.crits = (empireState.crits || 0) + 1;

  const btn = document.getElementById('empireTapBtn');
  if (btn) {
    btn.classList.remove('pulse', 'crit');
    void btn.offsetWidth;
    btn.classList.add('pulse');
    if (crit) btn.classList.add('crit');
  }

  const label = crit
    ? (empireLang() === 'en' ? `CRIT +${empireFmt(gain)}` : `حرج +${empireFmt(gain)}`)
    : '+' + empireFmt(gain);
  spawnEmpireFloat(event, label, crit ? 'crit' : (empireFeverActive() ? 'fever' : ''));

  if (typeof playSound === 'function') playSound(crit ? 'levelup' : 'coin');
  try { navigator.vibrate?.(crit ? 18 : 8); } catch (_) {}

  updateEmpireHud();
  updateEmpireTapUpgrade();
  updateEmpirePrestige();
  scheduleEmpireSave(false);
  const list = document.getElementById('empireBizList');
  if (list && Math.random() < 0.25) renderEmpireBiz();
  else syncEmpireBizAfford();
}

function syncEmpireBizAfford() {
  const list = document.getElementById('empireBizList');
  if (!list || !empireState) return;
  list.querySelectorAll('.empire-biz').forEach(btn => {
    const id = btn.dataset.biz;
    const biz = EMPIRE_BIZ.find(b => b.id === id);
    if (!biz || btn.classList.contains('locked')) return;
    const owned = empireState.owned[id] || 0;
    const cost = empireBizCost(biz, owned);
    btn.classList.toggle('affordable', empireState.cash >= cost);
    const costEl = btn.querySelector('.empire-biz-cost');
    if (costEl) costEl.textContent = '$' + empireFmt(cost);
  });
}

function spawnEmpireFloat(event, text, kind) {
  const layer = document.getElementById('empireFloatLayer');
  const btn = document.getElementById('empireTapBtn');
  if (!layer || !btn) return;

  const rect = layer.getBoundingClientRect();
  let x = rect.width / 2;
  let y = rect.height / 2;
  if (event && event.clientX != null) {
    x = event.clientX - rect.left;
    y = event.clientY - rect.top;
  } else {
    const br = btn.getBoundingClientRect();
    x = br.left + br.width / 2 - rect.left + (Math.random() * 40 - 20);
    y = br.top + br.height / 2 - rect.top;
  }

  const el = document.createElement('span');
  el.className = 'empire-float' + (kind ? ' empire-float-' + kind : '');
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.id = 'ef' + (++empireFloatId);
  layer.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function clearEmpireOrbs() {
  document.querySelectorAll('.empire-orb').forEach(el => el.remove());
  if (empireOrbTimer) {
    clearTimeout(empireOrbTimer);
    empireOrbTimer = null;
  }
}

function scheduleEmpireOrb() {
  if (empireOrbTimer) clearTimeout(empireOrbTimer);
  if (!empireState?.started) return;
  const delay = EMPIRE_ORB_MIN_MS + Math.random() * (EMPIRE_ORB_MAX_MS - EMPIRE_ORB_MIN_MS);
  empireOrbTimer = setTimeout(() => {
    spawnEmpireOrb();
    scheduleEmpireOrb();
  }, delay);
}

function spawnEmpireOrb() {
  const layer = document.getElementById('empireFloatLayer');
  if (!layer || !empireState?.started) return;
  if (layer.querySelectorAll('.empire-orb').length >= 2) return;

  const orb = document.createElement('button');
  orb.type = 'button';
  orb.className = 'empire-orb';
  orb.setAttribute('aria-label', empireLang() === 'en' ? 'Golden treasure' : 'كنز ذهبي');
  orb.textContent = Math.random() < 0.35 ? '💎' : '✨';
  const left = 8 + Math.random() * 72;
  const top = 10 + Math.random() * 60;
  orb.style.left = left + '%';
  orb.style.top = top + '%';

  const collect = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const bonus = Math.max(
      empireTapGain() * (4 + Math.floor(Math.random() * 5)),
      Math.floor(empireState.cash * 0.04) + 25
    );
    empireState.cash += bonus;
    empireState.totalEarned += bonus;
    empireState.lifetimeEarned += bonus;
    spawnEmpireFloat(e.changedTouches?.[0] || e, (empireLang() === 'en' ? 'TREASURE +' : 'كنز +') + empireFmt(bonus), 'treasure');
    if (typeof playSound === 'function') playSound('levelup');
    try { navigator.vibrate?.(22); } catch (_) {}
    orb.remove();
    updateEmpireHud();
    syncEmpireBizAfford();
  };

  orb.addEventListener('pointerdown', collect);
  layer.appendChild(orb);
  setTimeout(() => {
    if (orb.isConnected) {
      orb.classList.add('fade');
      setTimeout(() => orb.remove(), 400);
    }
  }, 5200);
}

function bindEmpireTap() {
  const btn = document.getElementById('empireTapBtn');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  let lastTap = 0;
  const handler = (e) => {
    const now = Date.now();
    if (now - lastTap < 35) return;
    lastTap = now;
    if (e.cancelable) e.preventDefault();
    const point = e.changedTouches?.[0] || e.touches?.[0] || e;
    empireTap(point);
  };
  btn.addEventListener('pointerdown', handler);
}

// expose for HTML onclick + openGame init
window.initEmpire = initEmpire;
window.startEmpireGame = startEmpireGame;
window.continueEmpireGame = continueEmpireGame;
window.closeEmpire = closeEmpire;
window.upgradeEmpireTap = upgradeEmpireTap;
window.doEmpirePrestige = doEmpirePrestige;
window.empireConfirmPrestige = empireConfirmPrestige;
window.empireCancelPrestige = empireCancelPrestige;
window.reloadEmpireFromStorage = reloadEmpireFromStorage;
window.saveEmpireState = saveEmpireState;

document.addEventListener('DOMContentLoaded', () => {
  bindEmpireTap();
  bindEmpirePersist();
});
bindEmpireTap();
bindEmpirePersist();
