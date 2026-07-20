// ─────────────────────────────────────────────
// 👑 ملوك اللمس — Tap Kings
// ─────────────────────────────────────────────

const EMPIRE_STORAGE_KEY = 'empireGameProgress';
const EMPIRE_OFFLINE_CAP_HOURS = 8;

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

let empireState = null;
let empireTickTimer = null;
let empireSaveTimer = null;
let empireFloatId = 0;

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
    started: false
  };
}

function loadEmpireState() {
  const saved = getStore(EMPIRE_STORAGE_KEY, null);
  const base = defaultEmpireState();
  if (!saved) return base;
  const merged = {
    ...base,
    ...saved,
    owned: { ...base.owned, ...(saved.owned || {}) }
  };
  if (!merged.lifetimeEarned) {
    merged.lifetimeEarned = merged.totalEarned || 0;
  }
  return merged;
}

function saveEmpireState() {
  if (!empireState) return;
  empireState.lastSeen = Date.now();
  setStore(EMPIRE_STORAGE_KEY, {
    cash: empireState.cash,
    totalEarned: empireState.totalEarned,
    lifetimeEarned: empireState.lifetimeEarned,
    tapPower: empireState.tapPower,
    tapLevel: empireState.tapLevel,
    owned: empireState.owned,
    prestige: empireState.prestige,
    prestigeMult: empireState.prestigeMult,
    lastSeen: empireState.lastSeen,
    started: empireState.started
  });
}

function empireBizCost(biz, owned) {
  return Math.floor(biz.baseCost * Math.pow(1.15, owned));
}

function empireTapCost(level) {
  return Math.floor(25 * Math.pow(1.55, level));
}

function empireCps() {
  if (!empireState) return 0;
  let cps = 0;
  EMPIRE_BIZ.forEach(b => {
    cps += b.baseCps * (empireState.owned[b.id] || 0);
  });
  return cps * (empireState.prestigeMult || 1);
}

function empireTapGain() {
  if (!empireState) return 1;
  return Math.max(1, Math.floor(empireState.tapPower * (empireState.prestigeMult || 1)));
}

function empireStage() {
  if (!empireState) return EMPIRE_BIZ[0];
  for (let i = EMPIRE_BIZ.length - 1; i >= 0; i--) {
    if ((empireState.owned[EMPIRE_BIZ[i].id] || 0) > 0) return EMPIRE_BIZ[i];
  }
  return EMPIRE_BIZ[0];
}

function initEmpire() {
  empireState = loadEmpireState();
  applyOfflineEmpire();
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
  if (empireState) {
    const lifetime = empireState.lifetimeEarned || empireState.totalEarned;
    const best = Math.max(lifetime, getStore('best_empire', 0));
    setStore('best_empire', best);
    if (typeof submitScore === 'function') submitScore('empire', Math.floor(lifetime), false);
    saveEmpireState();
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
  }, 100);
  empireSaveTimer = setInterval(saveEmpireState, 8000);
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
  empireState.tapPower = 1 + empireState.tapLevel;
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
  const ok = confirm(empireLang() === 'en'
    ? 'Prestige? Cash & businesses reset. Permanent multiplier increases.'
    : 'إعادة ولادة؟ يُصفَّر الرصيد والأعمال، ويزيد المضاعف الدائم.');
  if (!ok) return;

  empireState.prestige += 1;
  empireState.prestigeMult = 1 + empireState.prestige * 0.5;
  empireState.cash = 0;
  empireState.tapPower = 1;
  empireState.tapLevel = 0;
  EMPIRE_BIZ.forEach(b => { empireState.owned[b.id] = 0; });
  empireState.totalEarned = 0;

  if (typeof playSound === 'function') playSound('levelup');
  if (typeof showToast === 'function') {
    showToast(empireLang() === 'en'
      ? `👑 Prestige ${empireState.prestige}! ×${empireState.prestigeMult}`
      : `👑 ولادة ${empireState.prestige}! مضاعف ×${empireState.prestigeMult}`);
  }
  renderEmpireAll();
  saveEmpireState();
}

function empireTap(event) {
  if (!empireState || !empireState.started) return;
  const gain = empireTapGain();
  empireState.cash += gain;
  empireState.totalEarned += gain;
  empireState.lifetimeEarned += gain;

  const btn = document.getElementById('empireTapBtn');
  if (btn) {
    btn.classList.remove('pulse');
    void btn.offsetWidth;
    btn.classList.add('pulse');
  }

  spawnEmpireFloat(event, '+' + empireFmt(gain));
  if (typeof playSound === 'function') playSound('coin');
  try { navigator.vibrate?.(8); } catch (_) {}

  updateEmpireHud();
  updateEmpireTapUpgrade();
  updateEmpirePrestige();
  // refresh buy affordability without full rebuild every tap — light check
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

function spawnEmpireFloat(event, text) {
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
  el.className = 'empire-float';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.id = 'ef' + (++empireFloatId);
  layer.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function bindEmpireTap() {
  const btn = document.getElementById('empireTapBtn');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  let lastTap = 0;
  const handler = (e) => {
    const now = Date.now();
    if (now - lastTap < 40) return;
    lastTap = now;
    if (e.cancelable) e.preventDefault();
    const point = e.changedTouches?.[0] || e.touches?.[0] || e;
    empireTap(point);
  };
  btn.addEventListener('pointerdown', handler);
  btn.addEventListener('click', handler);
}

// expose for HTML onclick + openGame init
window.initEmpire = initEmpire;
window.startEmpireGame = startEmpireGame;
window.continueEmpireGame = continueEmpireGame;
window.closeEmpire = closeEmpire;
window.upgradeEmpireTap = upgradeEmpireTap;
window.doEmpirePrestige = doEmpirePrestige;

document.addEventListener('DOMContentLoaded', bindEmpireTap);
// also bind when script loads late
bindEmpireTap();
