// ─────────────────────────────────────────────
// 📈 محاكاة الاستثمار — واقع، ضغط، وحفظ سحابي
// ─────────────────────────────────────────────

const INVEST_ASSETS = {
  growth: {
    id: 'growth', icon: '🚀', name: { ar: 'أسهم نمو', en: 'Growth Stocks' },
    tip: { ar: 'عائد أعلى لكن تقلب شديد — لا تضع كل رأس المال هنا.', en: 'Higher returns, high volatility — never all-in.' },
    base: 100, vol: 0.045, drift: 0.0012, dividend: 0, liquidity: 1
  },
  dividend: {
    id: 'dividend', icon: '🏦', name: { ar: 'أسهم توزيعات', en: 'Dividend Stocks' },
    tip: { ar: 'توزيعات دورية = دخل سلبي. مثالية للاستقرار.', en: 'Periodic dividends = passive income.' },
    base: 80, vol: 0.02, drift: 0.0006, dividend: 0.004, liquidity: 1
  },
  bonds: {
    id: 'bonds', icon: '📜', name: { ar: 'سندات', en: 'Bonds' },
    tip: { ar: 'مخاطر منخفضة وعائد ثابت نسبياً — أساس محفظة آمنة.', en: 'Low risk, steady yield — portfolio foundation.' },
    base: 50, vol: 0.006, drift: 0.00025, dividend: 0.0025, liquidity: 1
  },
  gold: {
    id: 'gold', icon: '🥇', name: { ar: 'ذهب', en: 'Gold' },
    tip: { ar: 'تحوط ضد التضخم والأزمات — لا ينمو بسرعة لكنه يحمي.', en: 'Inflation hedge — slow growth, strong protection.' },
    base: 180, vol: 0.015, drift: 0.0003, dividend: 0, liquidity: 1
  },
  crypto: {
    id: 'crypto', icon: '₿', name: { ar: 'عملات رقمية', en: 'Crypto' },
    tip: { ar: 'تذبذب هائل. نسبة صغيرة فقط من المحفظة!', en: 'Extreme swings — keep a small allocation!' },
    base: 40, vol: 0.09, drift: 0.0015, dividend: 0, liquidity: 1
  },
  realty: {
    id: 'realty', icon: '🏠', name: { ar: 'عقارات', en: 'Real Estate' },
    tip: { ar: 'دخل إيجاري وبطء في البيع — لا تعتمد عليه للطوارئ.', en: 'Rental income, slow to sell — not emergency cash.' },
    base: 200, vol: 0.012, drift: 0.0005, dividend: 0.005, liquidity: 0.35
  }
};

const INVEST_LESSONS = [
  { id: 'diversify', ar: 'التنويع يقلل المخاطر: لا تضع كل البيض في سلة واحدة.', en: 'Diversify: never put all eggs in one basket.' },
  { id: 'emergency', ar: 'صندوق الطوارئ: احتفظ بنقد يكفي 3–6 أشهر مصاريف.', en: 'Emergency fund: keep 3–6 months of expenses in cash.' },
  { id: 'compound', ar: 'الفائدة المركبة تعمل بصمت — الوقت أقوى من التوقيت.', en: 'Compound interest works quietly — time beats timing.' },
  { id: 'panic', ar: 'البيع تحت الضغط يخسر المال. الخطط تُبنى قبل الأزمة.', en: 'Panic selling locks in losses. Plan before the storm.' },
  { id: 'risk', ar: 'كلما زاد العائد المتوقع، زادت المخاطرة عادةً.', en: 'Higher expected return usually means higher risk.' },
  { id: 'fees', ar: 'المصروفات والتضخم يأكلان العائد إن تجاهلتهما.', en: 'Fees and inflation quietly eat returns.' },
  { id: 'rebalance', ar: 'أعد توازن المحفظة دورياً بدل المطاردة خلف الأخبار.', en: 'Rebalance periodically instead of chasing headlines.' }
];

const INVEST_NEWS = [
  { type: 'crash', ar: '📉 انهيار تقني! أسهم النمو والعملات تهبط بحدة.', en: '📉 Tech crash! Growth & crypto plunge.', shock: { growth: -0.12, crypto: -0.18, dividend: -0.04 }, stress: 18 },
  { type: 'boom', ar: '🚀 موجة تفاؤل: الأسواق ترتفع بقوة.', en: '🚀 Market rally across risk assets.', shock: { growth: 0.08, crypto: 0.12, dividend: 0.03 }, stress: -8 },
  { type: 'inflation', ar: '🔥 تضخم مرتفع — الذهب والعقارات تُفضَّل، السندات تتأثر.', en: '🔥 High inflation — gold & realty favored.', shock: { gold: 0.06, realty: 0.04, bonds: -0.04, cashInflation: 0.015 }, stress: 10 },
  { type: 'rate_cut', ar: '🏦 خفض الفائدة يدعم الأسهم والسندات.', en: '🏦 Rate cut supports stocks & bonds.', shock: { growth: 0.05, bonds: 0.03, dividend: 0.03 }, stress: -5 },
  { type: 'war', ar: '⚠️ توتر جيوسياسي — الذهب يصعد والأسهم تتراجع.', en: '⚠️ Geopolitical tension — gold up, equities down.', shock: { gold: 0.07, growth: -0.06, crypto: -0.08 }, stress: 14 },
  { type: 'earnings', ar: '📊 أرباح شركات قوية تدفع أسهم التوزيعات.', en: '📊 Strong earnings boost dividend stocks.', shock: { dividend: 0.05, growth: 0.03 }, stress: -4 },
  { type: 'crypto_ban', ar: '🛑 أنباء تنظيمية تضرب العملات الرقمية.', en: '🛑 Regulatory scare hits crypto.', shock: { crypto: -0.22 }, stress: 12 },
  { type: 'housing', ar: '🏘️ ازدهار عقاري — الإيجارات ترتفع.', en: '🏘️ Housing boom — rents rise.', shock: { realty: 0.06 }, stress: -3 }
];

let investState = null;
let investTimer = null;
let investCloudTimer = null;
let investSelected = 'growth';
let investBusy = false;

function investLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'ar';
}

function investT(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[investLang()] || obj.ar || obj.en || '';
}

function investFmt(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString(investLang() === 'ar' ? 'ar-SA' : 'en-US');
}

function defaultInvestState() {
  const prices = {};
  Object.keys(INVEST_ASSETS).forEach(k => { prices[k] = INVEST_ASSETS[k].base; });
  return {
    cash: 10000,
    day: 1,
    month: 1,
    holdings: { growth: 0, dividend: 0, bonds: 0, gold: 0, crypto: 0, realty: 0 },
    prices,
    stress: 12,
    xp: 0,
    lessonsSeen: [],
    log: [],
    monthlyBill: 350,
    goal: 25000,
    goalsHit: 0,
    peakNet: 10000,
    cloudId: '',
    lastCloudSync: null,
    paused: false,
    started: false
  };
}

function investNetWorth() {
  let total = investState.cash;
  Object.keys(INVEST_ASSETS).forEach(k => {
    total += (investState.holdings[k] || 0) * investState.prices[k];
  });
  return total;
}

function investPortfolioValue() {
  return investNetWorth() - investState.cash;
}

function investConcentration() {
  const nw = investNetWorth();
  if (nw <= 0) return 0;
  let maxShare = 0;
  Object.keys(INVEST_ASSETS).forEach(k => {
    const share = ((investState.holdings[k] || 0) * investState.prices[k]) / nw;
    if (share > maxShare) maxShare = share;
  });
  return maxShare;
}

function investPushLog(msg, kind) {
  investState.log.unshift({ msg, kind: kind || 'info', day: investState.day });
  if (investState.log.length > 40) investState.log.pop();
  const el = document.getElementById('investLog');
  if (!el) return;
  el.innerHTML = investState.log.slice(0, 12).map(l =>
    `<div class="invest-log-item invest-log-${l.kind}"><span class="invest-log-day">يوم ${l.day}</span> ${l.msg}</div>`
  ).join('');
}

function investTeach(lessonId, force) {
  if (!force && investState.lessonsSeen.includes(lessonId)) return;
  const lesson = INVEST_LESSONS.find(l => l.id === lessonId);
  if (!lesson) return;
  if (!investState.lessonsSeen.includes(lessonId)) investState.lessonsSeen.push(lessonId);
  const tip = investT(lesson);
  const box = document.getElementById('investLesson');
  if (box) {
    box.textContent = '💡 ' + tip;
    box.classList.add('pulse');
    setTimeout(() => box.classList.remove('pulse'), 800);
  }
  if (typeof showToast === 'function') showToast('💡 ' + tip);
}

function investClampStress() {
  investState.stress = Math.max(0, Math.min(100, investState.stress));
}

function investUpdateStressBar() {
  const fill = document.getElementById('investStressFill');
  const label = document.getElementById('investStressVal');
  if (!fill || !label) return;
  fill.style.width = investState.stress + '%';
  fill.className = 'invest-stress-fill' + (investState.stress >= 70 ? ' danger' : investState.stress >= 40 ? ' warn' : '');
  label.textContent = Math.round(investState.stress) + '%';
}

function investRenderHud() {
  const nw = investNetWorth();
  document.getElementById('investCash').textContent = investFmt(investState.cash);
  document.getElementById('investNet').textContent = investFmt(nw);
  document.getElementById('investDay').textContent = investState.day;
  document.getElementById('investGoal').textContent = investFmt(investState.goal);
  document.getElementById('investCloudId').textContent = investState.cloudId || '—';
  const syncEl = document.getElementById('investSyncStatus');
  if (syncEl) {
    syncEl.textContent = investState.lastCloudSync
      ? (investLang() === 'ar' ? 'محفوظ سحابياً ✓' : 'Cloud synced ✓')
      : (investLang() === 'ar' ? 'لم يُزامَن بعد' : 'Not synced yet');
  }
  investUpdateStressBar();

  const goalPct = Math.min(100, (nw / investState.goal) * 100);
  const goalFill = document.getElementById('investGoalFill');
  if (goalFill) goalFill.style.width = goalPct + '%';
}

function investRenderAssets() {
  const list = document.getElementById('investAssetList');
  if (!list) return;
  const lang = investLang();
  list.innerHTML = Object.keys(INVEST_ASSETS).map(id => {
    const a = INVEST_ASSETS[id];
    const price = investState.prices[id];
    const qty = investState.holdings[id] || 0;
    const value = qty * price;
    const active = investSelected === id ? ' active' : '';
    return `<button type="button" class="invest-asset-card${active}" data-asset="${id}">
      <div class="invest-asset-top"><span>${a.icon} ${a.name[lang]}</span><strong>${investFmt(price)}</strong></div>
      <div class="invest-asset-meta">${lang === 'ar' ? 'ملكك' : 'Owned'}: ${qty.toFixed(2)} · ${investFmt(value)}</div>
    </button>`;
  }).join('');
}

function investSelectAsset(id) {
  investSelected = id;
  const a = INVEST_ASSETS[id];
  document.getElementById('investSelectedName').textContent = a.icon + ' ' + investT(a.name);
  document.getElementById('investSelectedTip').textContent = investT(a.tip);
  document.getElementById('investSelectedPrice').textContent = investFmt(investState.prices[id]);
  investRenderAssets();
}

function investGetAmount() {
  const mode = document.getElementById('investAmountMode')?.value || 'pct25';
  const cash = investState.cash;
  if (mode === 'all') return cash;
  if (mode === 'pct50') return Math.floor(cash * 0.5);
  if (mode === 'pct10') return Math.floor(cash * 0.1);
  if (mode === 'custom') {
    const n = Number(document.getElementById('investCustomAmount')?.value || 0);
    return Math.max(0, Math.floor(n));
  }
  return Math.floor(cash * 0.25);
}

function investBuy() {
  if (!investState?.started || investBusy) return;
  const id = investSelected;
  const asset = INVEST_ASSETS[id];
  let spend = investGetAmount();
  if (spend < 10) {
    if (typeof showToast === 'function') showToast(investLang() === 'ar' ? 'رصيد غير كافٍ' : 'Not enough cash');
    return;
  }
  if (spend > investState.cash) spend = Math.floor(investState.cash);
  const price = investState.prices[id];
  const qty = spend / price;
  investState.cash -= spend;
  investState.holdings[id] = (investState.holdings[id] || 0) + qty;
  investState.xp += 2;

  // ضغط: شراء برافعة عاطفية عند ضغط مرتفع
  if (investState.stress > 65 && Math.random() < 0.35) {
    investState.stress += 4;
    investPushLog(investLang() === 'ar' ? 'اشتريت وأنت متوتر — قرارات الضغط غالباً مكلفة.' : 'Bought while stressed — pressure trades often hurt.', 'warn');
    investTeach('panic');
  }

  if (investConcentration() > 0.55) investTeach('diversify');
  if (investState.cash < investState.monthlyBill * 2) investTeach('emergency');

  investPushLog(`${investLang() === 'ar' ? 'شراء' : 'Bought'} ${asset.icon} ${investFmt(spend)}`, 'buy');
  if (typeof playSound === 'function') playSound('coin');
  investRefresh();
  investScheduleCloudSave();
}

function investSell(pct) {
  if (!investState?.started || investBusy) return;
  const id = investSelected;
  const asset = INVEST_ASSETS[id];
  const qty = investState.holdings[id] || 0;
  if (qty <= 0) {
    if (typeof showToast === 'function') showToast(investLang() === 'ar' ? 'لا تملك وحدات للبيع' : 'Nothing to sell');
    return;
  }

  // عقارات أقل سيولة
  let sellQty = qty * pct;
  if (asset.liquidity < 1 && pct >= 0.99) {
    sellQty = qty * asset.liquidity;
    investPushLog(investLang() === 'ar' ? 'العقار بطيء البيع — بِعت جزءاً فقط.' : 'Real estate is illiquid — sold only part.', 'warn');
  }

  // ضغط البيع الذعري: رسوم أعلى عند stress مرتفع
  let fee = 0.005;
  if (investState.stress >= 70) {
    fee = 0.02;
    investTeach('panic', true);
    investPushLog(investLang() === 'ar' ? 'بيع ذعري! عمولة أعلى بسبب الضغط.' : 'Panic sell! Higher fees under stress.', 'danger');
  }

  const gross = sellQty * investState.prices[id];
  const net = gross * (1 - fee);
  investState.holdings[id] -= sellQty;
  if (investState.holdings[id] < 0.0001) investState.holdings[id] = 0;
  investState.cash += net;
  investState.stress = Math.max(0, investState.stress - (pct >= 0.99 ? 6 : 3));
  investPushLog(`${investLang() === 'ar' ? 'بيع' : 'Sold'} ${asset.icon} +${investFmt(net)}`, 'sell');
  if (typeof playSound === 'function') playSound('blip');
  investRefresh();
  investScheduleCloudSave();
}

function investTickMarket() {
  if (!investState?.started || investState.paused) return;

  investState.day++;
  Object.keys(INVEST_ASSETS).forEach(id => {
    const a = INVEST_ASSETS[id];
    const shock = (Math.random() - 0.5) * 2 * a.vol;
    const next = investState.prices[id] * (1 + a.drift + shock);
    investState.prices[id] = Math.max(a.base * 0.25, Math.round(next * 100) / 100);
  });

  // ضغط يومي خفيف + تركيز المحفظة
  const conc = investConcentration();
  investState.stress += conc > 0.6 ? 1.2 : 0.25;
  if (investState.cash / Math.max(1, investNetWorth()) < 0.05) investState.stress += 0.8;

  // أخبار عشوائية
  if (Math.random() < 0.08) investTriggerNews();

  // توزيعات وإيجار كل 7 أيام
  if (investState.day % 7 === 0) investPayIncome();

  // فاتورة شهرية كل 30 يوم
  if (investState.day % 30 === 0) investPayBills();

  // أهداف
  const nw = investNetWorth();
  if (nw > investState.peakNet) investState.peakNet = nw;
  if (nw >= investState.goal) investHitGoal();

  // ضغط عالي جداً: حدث ذعر
  if (investState.stress >= 90 && Math.random() < 0.2) {
    investState.stress = 75;
    investPushLog(investLang() === 'ar' ? 'قلبك يدق! خذ نفساً — لا تبع كل شيء الآن.' : 'Heart racing! Breathe — don’t dump everything.', 'danger');
    investTeach('panic', true);
  }

  investClampStress();
  investRefresh();
  if (investState.day % 5 === 0) investScheduleCloudSave();
}

function investTriggerNews() {
  const news = INVEST_NEWS[Math.floor(Math.random() * INVEST_NEWS.length)];
  Object.keys(news.shock).forEach(k => {
    if (k === 'cashInflation') {
      investState.cash *= (1 - news.shock.cashInflation);
      return;
    }
    if (investState.prices[k]) {
      investState.prices[k] = Math.max(1, investState.prices[k] * (1 + news.shock[k]));
    }
  });
  investState.stress += news.stress || 0;
  investClampStress();
  investPushLog(investT(news), news.type === 'crash' || news.type === 'war' || news.type === 'crypto_ban' ? 'danger' : 'news');
  if (typeof playSound === 'function') playSound(news.stress > 0 ? 'gameover' : 'levelup');

  if (news.type === 'inflation') investTeach('fees');
  if (news.type === 'crash') investTeach('panic');
}

function investPayIncome() {
  let income = 0;
  Object.keys(INVEST_ASSETS).forEach(id => {
    const a = INVEST_ASSETS[id];
    if (!a.dividend) return;
    const val = (investState.holdings[id] || 0) * investState.prices[id];
    income += val * a.dividend;
  });
  if (income > 1) {
    investState.cash += income;
    investState.xp += 5;
    investPushLog((investLang() === 'ar' ? 'دخل سلبي (توزيعات/إيجار): +' : 'Passive income: +') + investFmt(income), 'income');
    investTeach('compound');
    if (typeof playSound === 'function') playSound('coin');
  }
}

function investPayBills() {
  investState.month++;
  const bill = investState.monthlyBill * (1 + (investState.month - 1) * 0.02);
  investState.cash -= bill;
  investState.stress += 6;
  investPushLog((investLang() === 'ar' ? 'فاتورة شهرية: -' : 'Monthly bills: -') + investFmt(bill), 'warn');
  if (investState.cash < 0) {
    // اضطر لبيع قسري
    investForceLiquidate(-investState.cash);
    investState.cash = Math.max(0, investState.cash);
    investState.stress += 15;
    investPushLog(investLang() === 'ar' ? 'سيولة منخفضة! بيع اضطراري لتغطية الفواتير.' : 'Low liquidity! Forced sale to cover bills.', 'danger');
    investTeach('emergency', true);
  }
  investClampStress();
}

function investForceLiquidate(need) {
  const order = ['growth', 'crypto', 'dividend', 'gold', 'bonds', 'realty'];
  let remaining = need;
  for (const id of order) {
    if (remaining <= 0) break;
    const qty = investState.holdings[id] || 0;
    if (qty <= 0) continue;
    const value = qty * investState.prices[id] * 0.97;
    const take = Math.min(value, remaining);
    const sellQty = take / (investState.prices[id] * 0.97);
    investState.holdings[id] = Math.max(0, qty - sellQty);
    investState.cash += take;
    remaining -= take;
  }
}

function investHitGoal() {
  investState.goalsHit++;
  investState.goal = Math.round(investState.goal * 1.6);
  investState.xp += 50;
  investState.stress = Math.max(0, investState.stress - 20);
  investPushLog(investLang() === 'ar' ? '🎯 حققت الهدف! هدف جديد أعلى.' : '🎯 Goal reached! New higher target.', 'income');
  if (typeof playSound === 'function') playSound('levelup');
  if (typeof addScore === 'function') addScore(80);
  if (typeof submitScore === 'function') submitScore('invest', Math.round(investState.peakNet), false);
  setStore('best_invest', Math.max(getStore('best_invest', 0), Math.round(investState.peakNet)));
  investTeach('rebalance');
  investScheduleCloudSave(true);
}

function investRefresh() {
  if (!investState) return;
  investRenderHud();
  investRenderAssets();
  investSelectAsset(investSelected);
}

function investSerialize() {
  return {
    version: 1,
    cash: investState.cash,
    day: investState.day,
    month: investState.month,
    holdings: investState.holdings,
    prices: investState.prices,
    stress: investState.stress,
    xp: investState.xp,
    lessonsSeen: investState.lessonsSeen,
    log: investState.log.slice(0, 20),
    monthlyBill: investState.monthlyBill,
    goal: investState.goal,
    goalsHit: investState.goalsHit,
    peakNet: investState.peakNet,
    cloudId: investState.cloudId,
    started: investState.started
  };
}

function investApplyData(data) {
  const base = defaultInvestState();
  investState = { ...base, ...data, holdings: { ...base.holdings, ...(data.holdings || {}) }, prices: { ...base.prices, ...(data.prices || {}) } };
  investState.started = true;
  investState.paused = false;
}

function investLocalSave() {
  if (!investState) return;
  setStore('investGameProgress', investSerialize());
  if (investState.cloudId) setStore('investCloudId', investState.cloudId);
}

async function investCloudSave(force) {
  if (!investState?.started) return;
  investLocalSave();
  const status = document.getElementById('investSyncStatus');
  try {
    if (status) status.textContent = investLang() === 'ar' ? 'جاري الحفظ...' : 'Saving...';
    const res = await fetch('/api/cloud-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloud_id: investState.cloudId || undefined,
        game_id: 'invest',
        player_name: getStore('globalPlayerName', ''),
        data: investSerialize()
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'fail');
    investState.cloudId = json.cloud_id;
    investState.lastCloudSync = json.updated_at || new Date().toISOString();
    setStore('investCloudId', investState.cloudId);
    investLocalSave();
    investRenderHud();
    if (force && typeof showToast === 'function') {
      showToast((investLang() === 'ar' ? '☁️ حُفظ في السحابة — رمزك: ' : '☁️ Cloud saved — code: ') + investState.cloudId);
    }
  } catch (e) {
    if (status) status.textContent = investLang() === 'ar' ? 'فشل السحابة (محلي ✓)' : 'Cloud failed (local ✓)';
    if (force && typeof showToast === 'function') showToast(investLang() === 'ar' ? 'تعذر الحفظ السحابي — التقدم محفوظ محلياً' : 'Cloud save failed — progress kept locally');
  }
}

function investScheduleCloudSave(force) {
  clearTimeout(investCloudTimer);
  investCloudTimer = setTimeout(() => investCloudSave(!!force), force ? 100 : 1200);
}

async function investCloudLoad(code) {
  const id = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (id.length < 6) {
    if (typeof showToast === 'function') showToast(investLang() === 'ar' ? 'أدخل رمزاً صالحاً' : 'Enter a valid code');
    return;
  }
  try {
    const res = await fetch(`/api/cloud-save/${id}?game_id=invest`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'not found');
    investApplyData(json.data);
    investState.cloudId = json.cloud_id;
    investState.lastCloudSync = json.updated_at;
    setStore('investCloudId', investState.cloudId);
    investLocalSave();
    investShowGameUI();
    investStartLoop();
    investRefresh();
    investPushLog(investLang() === 'ar' ? '☁️ استُعيد التقدم من السحابة' : '☁️ Progress restored from cloud', 'income');
    if (typeof showToast === 'function') showToast(investLang() === 'ar' ? 'تم التحميل من السحابة!' : 'Loaded from cloud!');
    if (typeof playSound === 'function') playSound('levelup');
  } catch (e) {
    if (typeof showToast === 'function') showToast(investLang() === 'ar' ? 'لم يُعثر على الحفظ السحابي' : 'Cloud save not found');
  }
}

function investShowGameUI() {
  document.getElementById('investStartScreen')?.classList.add('d-none');
  document.getElementById('investGameScreen')?.classList.remove('d-none');
}

function investShowStartUI() {
  document.getElementById('investStartScreen')?.classList.remove('d-none');
  document.getElementById('investGameScreen')?.classList.add('d-none');
}

function investStartLoop() {
  clearInterval(investTimer);
  investTimer = setInterval(investTickMarket, 2200);
}

function investNewGame() {
  investState = defaultInvestState();
  investState.started = true;
  investState.cloudId = getStore('investCloudId', '') || '';
  investShowGameUI();
  investStartLoop();
  investRefresh();
  investPushLog(investLang() === 'ar' ? 'بدأت برأس مال 10,000 — وزّع بحكمة!' : 'Started with 10,000 — allocate wisely!', 'info');
  investTeach('diversify', true);
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
  if (typeof playSound === 'function') playSound('levelup');
  investScheduleCloudSave(true);
}

function investContinueLocal() {
  const saved = getStore('investGameProgress', null);
  if (!saved || !saved.started) {
    investNewGame();
    return;
  }
  investApplyData(saved);
  investState.cloudId = saved.cloudId || getStore('investCloudId', '') || '';
  investShowGameUI();
  investStartLoop();
  investRefresh();
  investPushLog(investLang() === 'ar' ? 'استُكمل التقدم المحلي' : 'Continued local progress', 'info');
  investScheduleCloudSave();
}

function initInvest() {
  const saved = getStore('investGameProgress', null);
  const cloudId = getStore('investCloudId', '');
  document.getElementById('investCloudInput').value = cloudId || '';
  document.getElementById('investBest').textContent = investFmt(getStore('best_invest', 0));

  const contBtn = document.getElementById('investContinueBtn');
  if (contBtn) contBtn.classList.toggle('d-none', !(saved && saved.started));

  investShowStartUI();
  investSelected = 'growth';
}

function closeInvest() {
  if (investState?.started) {
    investLocalSave();
    investCloudSave(false);
    setStore('best_invest', Math.max(getStore('best_invest', 0), Math.round(investState.peakNet || investNetWorth())));
  }
  clearInterval(investTimer);
  investTimer = null;
  investState = investState ? { ...investState, paused: true } : null;
}

function investTogglePause() {
  if (!investState?.started) return;
  investState.paused = !investState.paused;
  const btn = document.getElementById('investPauseBtn');
  if (btn) btn.textContent = investState.paused
    ? (investLang() === 'ar' ? '▶ متابعة' : '▶ Resume')
    : (investLang() === 'ar' ? '⏸ إيقاف' : '⏸ Pause');
}

function investBreathe() {
  if (!investState?.started) return;
  investState.stress = Math.max(0, investState.stress - 12);
  investState.cash = Math.max(0, investState.cash - 20);
  investPushLog(investLang() === 'ar' ? 'أخذت استراحة (-20 نقد، ضغط↓)' : 'Took a breather (-20 cash, stress↓)', 'info');
  investTeach('panic');
  investRefresh();
}

// أحداث الواجهة
document.addEventListener('click', (e) => {
  const card = e.target.closest('#investAssetList .invest-asset-card');
  if (card) investSelectAsset(card.dataset.asset);
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'investAmountMode') {
    document.getElementById('investCustomAmount')?.classList.toggle('d-none', e.target.value !== 'custom');
  }
});
