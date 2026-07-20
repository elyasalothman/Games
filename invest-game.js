// ─────────────────────────────────────────────
// 📈 محاكاة الاستثمار — أكاديمية + أسواق + تعلّم
// نظام يشبه منصات الاستثمار الحقيقية مع دروس واختبارات
// ─────────────────────────────────────────────

const INVEST_ASSETS = {
  growth: {
    id: 'growth', icon: '🚀', name: { ar: 'أسهم نمو (تقنية)', en: 'Growth Stocks (Tech)' },
    tip: { ar: 'عائد أعلى لكن تقلب شديد — لا تضع كل رأس المال هنا.', en: 'Higher returns, high volatility — never all-in.' },
    base: 100, vol: 0.045, drift: 0.0012, dividend: 0, liquidity: 1, risk: 4,
    realProxy: { ar: 'يشبه مؤشر ناسداك / شركات التقنية', en: 'Similar to Nasdaq / tech equities' }
  },
  dividend: {
    id: 'dividend', icon: '🏦', name: { ar: 'أسهم توزيعات', en: 'Dividend Stocks' },
    tip: { ar: 'توزيعات دورية = دخل سلبي. مثالية للاستقرار.', en: 'Periodic dividends = passive income.' },
    base: 80, vol: 0.02, drift: 0.0006, dividend: 0.004, liquidity: 1, risk: 2,
    realProxy: { ar: 'يشبه صناديق التوزيعات والبنوك', en: 'Similar to dividend ETFs / banks' }
  },
  bonds: {
    id: 'bonds', icon: '📜', name: { ar: 'سندات حكومية', en: 'Gov Bonds' },
    tip: { ar: 'مخاطر منخفضة وعائد ثابت نسبياً — أساس محفظة آمنة.', en: 'Low risk, steady yield — portfolio foundation.' },
    base: 50, vol: 0.006, drift: 0.00025, dividend: 0.0025, liquidity: 1, risk: 1,
    realProxy: { ar: 'يشبه سندات الخزانة / صكوك', en: 'Similar to treasuries / sukuk' }
  },
  gold: {
    id: 'gold', icon: '🥇', name: { ar: 'ذهب', en: 'Gold' },
    tip: { ar: 'تحوط ضد التضخم والأزمات — لا ينمو بسرعة لكنه يحمي.', en: 'Inflation hedge — slow growth, strong protection.' },
    base: 180, vol: 0.015, drift: 0.0003, dividend: 0, liquidity: 1, risk: 2,
    realProxy: { ar: 'يشبه سعر الأونصة العالمية', en: 'Tracks global gold spot behavior' }
  },
  crypto: {
    id: 'crypto', icon: '₿', name: { ar: 'عملات رقمية', en: 'Crypto' },
    tip: { ar: 'تذبذب هائل. نسبة صغيرة فقط من المحفظة!', en: 'Extreme swings — keep a small allocation!' },
    base: 40, vol: 0.09, drift: 0.0015, dividend: 0, liquidity: 1, risk: 5,
    realProxy: { ar: 'يتأثر ببيانات بيتكوين الحية عند التهيئة', en: 'Seeded from live Bitcoin when available' }
  },
  realty: {
    id: 'realty', icon: '🏠', name: { ar: 'عقارات / ريت', en: 'Real Estate / REIT' },
    tip: { ar: 'دخل إيجاري وبطء في البيع — لا تعتمد عليه للطوارئ.', en: 'Rental income, slow to sell — not emergency cash.' },
    base: 200, vol: 0.012, drift: 0.0005, dividend: 0.005, liquidity: 0.35, risk: 3,
    realProxy: { ar: 'يشبه صناديق العقار المدرجة', en: 'Similar to listed REITs' }
  }
};

const INVEST_REGIMES = {
  balanced: {
    id: 'balanced', icon: '⚖️',
    name: { ar: 'سوق متوازن', en: 'Balanced Market' },
    desc: { ar: 'تقلبات طبيعية — أفضل للتعلّم.', en: 'Normal volatility — best for learning.' },
    volMul: 1, driftMul: 1, newsChance: 0.08, corr: 0.35
  },
  bull: {
    id: 'bull', icon: '🐂',
    name: { ar: 'سوق صاعد', en: 'Bull Market' },
    desc: { ar: 'أسعار ترتفع غالباً — لا تنسَ التنويع رغم التفاؤل.', en: 'Prices trend up — still diversify.' },
    volMul: 0.85, driftMul: 1.8, newsChance: 0.06, corr: 0.45
  },
  bear: {
    id: 'bear', icon: '🐻',
    name: { ar: 'سوق هابط', en: 'Bear Market' },
    desc: { ar: 'ضغط بيعي — تعلّم الصبر وصندوق الطوارئ.', en: 'Selling pressure — learn patience & emergency cash.' },
    volMul: 1.35, driftMul: -0.6, newsChance: 0.12, corr: 0.55
  },
  stagflation: {
    id: 'stagflation', icon: '🔥',
    name: { ar: 'تضخم راكد', en: 'Stagflation' },
    desc: { ar: 'ذهب وعقار أقوى، سندات وأسهم تحت الضغط.', en: 'Gold & realty stronger; bonds & stocks struggle.' },
    volMul: 1.2, driftMul: 0.3, newsChance: 0.1, corr: 0.4,
    assetDrift: { gold: 2.2, realty: 1.6, bonds: -1.5, growth: -0.8, crypto: 0.5 }
  }
};

const INVEST_ACADEMY = [
  {
    id: 'basics',
    title: { ar: '١) أساسيات الاستثمار', en: '1) Investing Basics' },
    lesson: {
      ar: 'الاستثمار يعني شراء أصول (أسهم، سندات، ذهب…) على أمل نمو قيمتها أو توليد دخل. النقد يفقد قوته مع التضخم، والاستثمار يحاول حمايته.',
      en: 'Investing means buying assets hoping they grow or pay income. Cash loses power to inflation; investing aims to protect it.'
    },
    quiz: {
      q: { ar: 'لماذا لا يكفي الاحتفاظ بكل المال نقداً؟', en: 'Why isn’t holding only cash enough?' },
      options: {
        ar: ['لأن التضخم يقلل قوته الشرائية', 'لأن النقد ممنوع', 'لأن البنوك ترفض النقد'],
        en: ['Inflation erodes purchasing power', 'Cash is illegal', 'Banks reject cash']
      },
      answer: 0
    },
    unlock: null
  },
  {
    id: 'risk_return',
    title: { ar: '٢) العائد والمخاطرة', en: '2) Risk & Return' },
    lesson: {
      ar: 'عادةً: عائد أعلى = مخاطرة أعلى. أسهم النمو والعملات تتقلب أكثر من السندات. اختر نسبة مخاطرة تناسب هدفك وزمنك.',
      en: 'Usually: higher return = higher risk. Growth stocks and crypto swing more than bonds. Match risk to your goal and time horizon.'
    },
    quiz: {
      q: { ar: 'أي أصل أعلى مخاطرة عادة؟', en: 'Which asset is usually riskiest?' },
      options: {
        ar: ['سندات حكومية', 'عملات رقمية', 'حساب ادخار'],
        en: ['Government bonds', 'Crypto', 'Savings account']
      },
      answer: 1
    },
    unlock: 'crypto'
  },
  {
    id: 'diversify',
    title: { ar: '٣) التنويع', en: '3) Diversification' },
    lesson: {
      ar: 'لا تضع كل البيض في سلة واحدة. توزيع المال على أصول مختلفة يقلل أثر انهيار أصل واحد على محفظتك.',
      en: 'Don’t put all eggs in one basket. Spreading money across assets reduces the damage of one crash.'
    },
    quiz: {
      q: { ar: 'التنويع الجيد يعني…', en: 'Good diversification means…' },
      options: {
        ar: ['شراء أصل واحد فقط رابح', 'توزيع رأس المال على أصول متعددة', 'بيع كل شيء يومياً'],
        en: ['Buying only one winning asset', 'Spreading capital across multiple assets', 'Selling everything daily']
      },
      answer: 1
    },
    unlock: null
  },
  {
    id: 'emergency',
    title: { ar: '٤) صندوق الطوارئ', en: '4) Emergency Fund' },
    lesson: {
      ar: 'قبل المخاطرة الكبيرة، احتفظ بنقد يكفي 3–6 أشهر مصاريف. بدونه قد تُجبر على البيع في أسوأ وقت.',
      en: 'Before big risks, keep 3–6 months of expenses in cash. Without it you may be forced to sell at the worst time.'
    },
    quiz: {
      q: { ar: 'صندوق الطوارئ يحميك من…', en: 'An emergency fund protects you from…' },
      options: {
        ar: ['البيع الاضطراري وقت الأزمة', 'دفع الضرائب فقط', 'ارتفاع الذهب'],
        en: ['Forced selling during crises', 'Taxes only', 'Gold rising']
      },
      answer: 0
    },
    unlock: null
  },
  {
    id: 'compound',
    title: { ar: '٥) الفائدة المركبة والوقت', en: '5) Compounding & Time' },
    lesson: {
      ar: 'الوقت أقوى من التوقيت. التوزيعات والدخل يعاد استثمارهما فينموان على نمو سابق — هذا سر الثروة الصامت.',
      en: 'Time beats timing. Reinvested dividends grow on prior growth — the quiet engine of wealth.'
    },
    quiz: {
      q: { ar: 'الفائدة المركبة تعمل أفضل عندما…', en: 'Compounding works best when…' },
      options: {
        ar: ['تبيع كل أسبوع', 'تبقي الاستثمار وقتاً طويلاً وتعيد استثمار الدخل', 'تتجاهل التنويع'],
        en: ['You sell every week', 'You stay invested long and reinvest income', 'You ignore diversification']
      },
      answer: 1
    },
    unlock: null
  },
  {
    id: 'behavior',
    title: { ar: '٦) سلوك المستثمر', en: '6) Investor Behavior' },
    lesson: {
      ar: 'الخوف والطمع أعداؤك. البيع الذعري يثبت الخسارة. ضع خطة قبل الأزمة: نسب مستهدفة، وحد أقصى للمخاطرة، وصبر.',
      en: 'Fear and greed are enemies. Panic selling locks losses. Plan before crises: target weights, risk limits, patience.'
    },
    quiz: {
      q: { ar: 'أفضل رد عند انهيار مفاجئ إن كانت خطتك سليمة؟', en: 'Best reaction to a sudden crash if your plan is sound?' },
      options: {
        ar: ['بيع كل شيء فوراً', 'مراجعة الخطة والهدوء بدل الذعر', 'اقتراض للشراء بكل شيء'],
        en: ['Sell everything immediately', 'Review the plan calmly instead of panicking', 'Borrow to buy everything']
      },
      answer: 1
    },
    unlock: null
  }
];

const INVEST_RANKS = [
  { xp: 0, ar: 'مبتدئ', en: 'Novice' },
  { xp: 40, ar: 'مُدّخر', en: 'Saver' },
  { xp: 100, ar: 'مستثمر', en: 'Investor' },
  { xp: 200, ar: 'محلل', en: 'Analyst' },
  { xp: 350, ar: 'مدير محفظة', en: 'Portfolio Manager' },
  { xp: 550, ar: 'خبير أسواق', en: 'Market Pro' }
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

const INVEST_TARGET = { growth: 0.25, dividend: 0.15, bonds: 0.2, gold: 0.1, crypto: 0.05, realty: 0.1, cash: 0.15 };

let investState = null;
let investTimer = null;
let investCloudTimer = null;
let investSelected = 'growth';
let investBusy = false;
let investLiveMeta = null;
let investSelectedRegime = 'balanced';

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

function investFmtPct(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? '+' : '';
  return sign + v.toFixed(1) + '%';
}

function investRank() {
  const xp = investState?.xp || 0;
  let rank = INVEST_RANKS[0];
  INVEST_RANKS.forEach(r => { if (xp >= r.xp) rank = r; });
  return rank;
}

function defaultInvestState(regimeId) {
  const prices = {};
  const history = {};
  const costBasis = {};
  Object.keys(INVEST_ASSETS).forEach(k => {
    prices[k] = INVEST_ASSETS[k].base;
    history[k] = [INVEST_ASSETS[k].base];
    costBasis[k] = 0;
  });
  return {
    version: 2,
    cash: 10000,
    day: 1,
    month: 1,
    holdings: { growth: 0, dividend: 0, bonds: 0, gold: 0, crypto: 0, realty: 0 },
    prices,
    history,
    costBasis,
    realizedPnL: 0,
    feesPaid: 0,
    stress: 12,
    xp: 0,
    lessonsSeen: [],
    academyDone: [],
    academyIndex: 0,
    quizOpen: false,
    log: [],
    monthlyBill: 350,
    goal: 25000,
    goalsHit: 0,
    peakNet: 10000,
    cloudId: '',
    lastCloudSync: null,
    paused: false,
    started: false,
    regime: regimeId || 'balanced',
    dcaEnabled: false,
    liveSeed: false,
    liveNote: ''
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

function investUnrealizedPnL() {
  let pnl = 0;
  Object.keys(INVEST_ASSETS).forEach(id => {
    const qty = investState.holdings[id] || 0;
    if (qty <= 0) return;
    const cost = investState.costBasis[id] || 0;
    pnl += qty * investState.prices[id] - cost;
  });
  return pnl;
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

function investEmergencyMonths() {
  const bill = investState.monthlyBill * (1 + (investState.month - 1) * 0.02);
  if (bill <= 0) return 99;
  return investState.cash / bill;
}

function investAllocation() {
  const nw = Math.max(1, investNetWorth());
  const alloc = { cash: investState.cash / nw };
  Object.keys(INVEST_ASSETS).forEach(id => {
    alloc[id] = ((investState.holdings[id] || 0) * investState.prices[id]) / nw;
  });
  return alloc;
}

function investIsUnlocked(assetId) {
  if (assetId !== 'crypto') return true;
  return (investState.academyDone || []).includes('risk_return') || (investState.xp || 0) >= 60;
}

function investPushLog(msg, kind) {
  investState.log.unshift({ msg, kind: kind || 'info', day: investState.day });
  if (investState.log.length > 50) investState.log.pop();
  const el = document.getElementById('investLog');
  if (!el) return;
  const dayLabel = investLang() === 'ar' ? 'يوم' : 'Day';
  el.innerHTML = investState.log.slice(0, 14).map(l =>
    `<div class="invest-log-item invest-log-${l.kind}"><span class="invest-log-day">${dayLabel} ${l.day}</span> ${l.msg}</div>`
  ).join('');
}

function investTeach(lessonId, force) {
  if (!force && investState.lessonsSeen.includes(lessonId)) return;
  const chapter = INVEST_ACADEMY.find(c => c.id === lessonId);
  const tip = chapter ? investT(chapter.lesson) : null;
  const legacy = {
    diversify: INVEST_ACADEMY.find(c => c.id === 'diversify'),
    emergency: INVEST_ACADEMY.find(c => c.id === 'emergency'),
    compound: INVEST_ACADEMY.find(c => c.id === 'compound'),
    panic: INVEST_ACADEMY.find(c => c.id === 'behavior'),
    risk: INVEST_ACADEMY.find(c => c.id === 'risk_return'),
    fees: { lesson: { ar: 'المصروفات والتضخم يأكلان العائد إن تجاهلتهما.', en: 'Fees and inflation quietly eat returns.' } },
    rebalance: { lesson: { ar: 'أعد توازن المحفظة دورياً بدل المطاردة خلف الأخبار.', en: 'Rebalance periodically instead of chasing headlines.' } }
  };
  const text = tip || investT((legacy[lessonId] || {}).lesson) || lessonId;
  if (!investState.lessonsSeen.includes(lessonId)) investState.lessonsSeen.push(lessonId);
  const box = document.getElementById('investLesson');
  if (box) {
    box.textContent = '💡 ' + text.slice(0, 160) + (text.length > 160 ? '…' : '');
    box.classList.add('pulse');
    setTimeout(() => box.classList.remove('pulse'), 800);
  }
  if (typeof showToast === 'function' && force) showToast('💡 ' + text.slice(0, 80));
}

function investClampStress() {
  investState.stress = Math.max(0, Math.min(100, investState.stress));
}

function investRecordHistory() {
  Object.keys(INVEST_ASSETS).forEach(id => {
    if (!investState.history[id]) investState.history[id] = [];
    investState.history[id].push(investState.prices[id]);
    if (investState.history[id].length > 60) investState.history[id].shift();
  });
}

function investSparkline(values) {
  if (!values || values.length < 2) return '';
  const w = 120, h = 36, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.0001, max - min);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const up = values[values.length - 1] >= values[0];
  const color = up ? '#5eeaa0' : '#ff5c8a';
  return `<svg class="invest-spark" viewBox="0 0 ${w} ${h}" width="120" height="36" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`;
}

function investDayChange(id) {
  const hist = investState.history[id] || [];
  if (hist.length < 2) return 0;
  const prev = hist[hist.length - 2];
  const cur = hist[hist.length - 1];
  return prev ? ((cur - prev) / prev) * 100 : 0;
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
  const uPnL = investUnrealizedPnL();
  const months = investEmergencyMonths();
  const rank = investRank();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('investCash', investFmt(investState.cash));
  set('investNet', investFmt(nw));
  set('investDay', investState.day);
  set('investGoal', investFmt(investState.goal));
  set('investCloudId', investState.cloudId || '—');
  set('investXp', Math.round(investState.xp));
  set('investRank', investT(rank));
  set('investUPnL', (uPnL >= 0 ? '+' : '') + investFmt(uPnL));
  set('investRealized', (investState.realizedPnL >= 0 ? '+' : '') + investFmt(investState.realizedPnL));
  set('investFees', investFmt(investState.feesPaid || 0));
  set('investEmergency', months.toFixed(1));

  const upnlEl = document.getElementById('investUPnL');
  if (upnlEl) upnlEl.className = uPnL >= 0 ? 'invest-pnl-pos' : 'invest-pnl-neg';

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

  const emFill = document.getElementById('investEmergencyFill');
  if (emFill) {
    const pct = Math.min(100, (months / 6) * 100);
    emFill.style.width = pct + '%';
    emFill.className = 'invest-emergency-fill' + (months < 2 ? ' danger' : months < 3 ? ' warn' : '');
  }

  const regimeEl = document.getElementById('investRegimeLabel');
  if (regimeEl) {
    const r = INVEST_REGIMES[investState.regime] || INVEST_REGIMES.balanced;
    regimeEl.textContent = `${r.icon} ${investT(r.name)}`;
  }

  const liveEl = document.getElementById('investLiveNote');
  if (liveEl) {
    liveEl.textContent = investState.liveNote || '';
    liveEl.classList.toggle('d-none', !investState.liveNote);
  }

  investRenderAllocation();
  investRenderAcademy();
}

function investRenderAllocation() {
  const box = document.getElementById('investAllocBars');
  if (!box) return;
  const alloc = investAllocation();
  const labels = {
    cash: { ar: 'نقد', en: 'Cash' },
    ...Object.fromEntries(Object.keys(INVEST_ASSETS).map(id => [id, INVEST_ASSETS[id].name]))
  };
  const order = ['cash', 'growth', 'dividend', 'bonds', 'gold', 'crypto', 'realty'];
  box.innerHTML = order.map(id => {
    const pct = (alloc[id] || 0) * 100;
    const target = (INVEST_TARGET[id] || 0) * 100;
    const name = investT(labels[id]);
    return `<div class="invest-alloc-row" title="هدف ${target.toFixed(0)}%">
      <span class="invest-alloc-name">${name}</span>
      <div class="invest-alloc-track"><div class="invest-alloc-fill invest-alloc-${id}" style="width:${pct}%"></div>
      <div class="invest-alloc-target" style="inset-inline-start:${target}%"></div></div>
      <span class="invest-alloc-pct">${pct.toFixed(0)}%</span>
    </div>`;
  }).join('');
}

function investRenderAcademy() {
  const box = document.getElementById('investAcademyPanel');
  if (!box || !investState) return;
  const done = new Set(investState.academyDone || []);
  const idx = Math.min(investState.academyIndex || 0, INVEST_ACADEMY.length - 1);
  const chapter = INVEST_ACADEMY[idx];
  const progress = Math.round((done.size / INVEST_ACADEMY.length) * 100);
  const lang = investLang();

  if (done.size >= INVEST_ACADEMY.length) {
    box.innerHTML = `<div class="invest-academy-done">🎓 ${lang === 'ar' ? 'أكملت أكاديمية لُمعة للاستثمار!' : 'You finished the Luma\'a Investing Academy!'}</div>
      <div class="invest-academy-progress"><div style="width:100%"></div></div>`;
    return;
  }

  box.innerHTML = `
    <div class="invest-academy-head">
      <strong>📚 ${lang === 'ar' ? 'أكاديمية الاستثمار' : 'Investing Academy'}</strong>
      <span>${done.size}/${INVEST_ACADEMY.length} · ${progress}%</span>
    </div>
    <div class="invest-academy-progress"><div style="width:${progress}%"></div></div>
    <h5 class="invest-academy-title">${investT(chapter.title)}</h5>
    <p class="invest-academy-lesson">${investT(chapter.lesson)}</p>
    <div id="investQuizBox" class="invest-quiz-box">
      <p class="invest-quiz-q">${investT(chapter.quiz.q)}</p>
      <div class="invest-quiz-opts">
        ${investT(chapter.quiz.options).map((opt, i) =>
          `<button type="button" class="btn invest-quiz-btn" data-quiz="${chapter.id}" data-ans="${i}">${opt}</button>`
        ).join('')}
      </div>
    </div>`;
}

function investAnswerQuiz(chapterId, ans) {
  const chapter = INVEST_ACADEMY.find(c => c.id === chapterId);
  if (!chapter || !investState?.started) return;
  const correct = Number(ans) === chapter.quiz.answer;
  if (correct) {
    if (!investState.academyDone.includes(chapterId)) {
      investState.academyDone.push(chapterId);
      investState.xp += 25;
      investPushLog((investLang() === 'ar' ? '✅ أحسنت! أكملت: ' : '✅ Correct! Completed: ') + investT(chapter.title), 'income');
      if (chapter.unlock === 'crypto') {
        investPushLog(investLang() === 'ar' ? '🔓 فُتح أصل العملات الرقمية' : '🔓 Crypto asset unlocked', 'news');
        investTeach('risk', true);
      }
      if (typeof playSound === 'function') playSound('levelup');
      if (typeof addScore === 'function') addScore(30);
    }
    investState.academyIndex = Math.min(INVEST_ACADEMY.length - 1, (investState.academyIndex || 0) + 1);
    // skip already done
    while (investState.academyIndex < INVEST_ACADEMY.length - 1 &&
      investState.academyDone.includes(INVEST_ACADEMY[investState.academyIndex].id)) {
      investState.academyIndex++;
    }
  } else {
    investState.stress += 3;
    investPushLog(investLang() === 'ar' ? '❌ إجابة غير صحيحة — أعد قراءة الدرس.' : '❌ Incorrect — re-read the lesson.', 'warn');
    if (typeof playSound === 'function') playSound('blip');
  }
  investClampStress();
  investRefresh();
  investScheduleCloudSave();
}

function investRenderAssets() {
  const list = document.getElementById('investAssetList');
  if (!list) return;
  const lang = investLang();
  list.innerHTML = Object.keys(INVEST_ASSETS).map(id => {
    const a = INVEST_ASSETS[id];
    const locked = !investIsUnlocked(id);
    const price = investState.prices[id];
    const qty = investState.holdings[id] || 0;
    const value = qty * price;
    const chg = investDayChange(id);
    const active = investSelected === id ? ' active' : '';
    const chgCls = chg >= 0 ? 'up' : 'down';
    if (locked) {
      return `<button type="button" class="invest-asset-card locked" disabled>
        <div class="invest-asset-top"><span>🔒 ${a.name[lang]}</span><strong>—</strong></div>
        <div class="invest-asset-meta">${lang === 'ar' ? 'أكمل درس المخاطرة لفتحه' : 'Finish risk lesson to unlock'}</div>
      </button>`;
    }
    return `<button type="button" class="invest-asset-card${active}" data-asset="${id}">
      <div class="invest-asset-top"><span>${a.icon} ${a.name[lang]}</span><strong>${investFmt(price)}</strong></div>
      <div class="invest-asset-meta">${lang === 'ar' ? 'ملكك' : 'Owned'}: ${qty.toFixed(2)} · ${investFmt(value)}
        <span class="invest-chg ${chgCls}">${investFmtPct(chg)}</span></div>
      ${investSparkline(investState.history[id])}
    </button>`;
  }).join('');
}

function investSelectAsset(id) {
  if (!investIsUnlocked(id)) {
    if (typeof showToast === 'function') {
      showToast(investLang() === 'ar' ? '🔒 أكمل درس العائد والمخاطرة أولاً' : '🔒 Finish Risk & Return lesson first');
    }
    return;
  }
  investSelected = id;
  const a = INVEST_ASSETS[id];
  const qty = investState.holdings[id] || 0;
  const basis = investState.costBasis[id] || 0;
  const avg = qty > 0 ? basis / qty : 0;
  const u = qty * investState.prices[id] - basis;
  document.getElementById('investSelectedName').textContent = a.icon + ' ' + investT(a.name);
  document.getElementById('investSelectedTip').textContent = investT(a.tip);
  document.getElementById('investSelectedPrice').textContent = investFmt(investState.prices[id]);
  const proxy = document.getElementById('investSelectedProxy');
  if (proxy) proxy.textContent = '🌍 ' + investT(a.realProxy);
  const basisEl = document.getElementById('investSelectedBasis');
  if (basisEl) {
    basisEl.innerHTML = qty > 0
      ? `${investLang() === 'ar' ? 'متوسط التكلفة' : 'Avg cost'}: <strong>${investFmt(avg)}</strong> ·
         ${investLang() === 'ar' ? 'غير محققة' : 'Unrealized'}: <strong class="${u >= 0 ? 'invest-pnl-pos' : 'invest-pnl-neg'}">${u >= 0 ? '+' : ''}${investFmt(u)}</strong>`
      : (investLang() === 'ar' ? 'لا تملك وحدات بعد' : 'No shares yet');
  }
  const sparkWrap = document.getElementById('investSelectedSpark');
  if (sparkWrap) sparkWrap.innerHTML = investSparkline(investState.history[id]);
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
  if (!investIsUnlocked(id)) return;
  const asset = INVEST_ASSETS[id];
  let spend = investGetAmount();
  if (spend < 10) {
    if (typeof showToast === 'function') showToast(investLang() === 'ar' ? 'رصيد غير كافٍ' : 'Not enough cash');
    return;
  }
  if (spend > investState.cash) spend = Math.floor(investState.cash);
  const fee = spend * 0.001;
  const netSpend = spend - fee;
  const price = investState.prices[id];
  const qty = netSpend / price;
  investState.cash -= spend;
  investState.feesPaid = (investState.feesPaid || 0) + fee;
  investState.holdings[id] = (investState.holdings[id] || 0) + qty;
  investState.costBasis[id] = (investState.costBasis[id] || 0) + netSpend;
  investState.xp += 2;

  if (id === 'crypto') investTeach('risk', true);
  if (investState.stress > 65 && Math.random() < 0.35) {
    investState.stress += 4;
    investPushLog(investLang() === 'ar' ? 'اشتريت وأنت متوتر — قرارات الضغط غالباً مكلفة.' : 'Bought while stressed — pressure trades often hurt.', 'warn');
    investTeach('panic');
  }
  if (investConcentration() > 0.55) investTeach('diversify');
  if (investEmergencyMonths() < 3) investTeach('emergency');

  investPushLog(`${investLang() === 'ar' ? 'شراء' : 'Bought'} ${asset.icon} ${investFmt(spend)} (−${investFmt(fee)} ${investLang() === 'ar' ? 'عمولة' : 'fee'})`, 'buy');
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

  let sellQty = qty * pct;
  if (asset.liquidity < 1 && pct >= 0.99) {
    sellQty = qty * asset.liquidity;
    investPushLog(investLang() === 'ar' ? 'العقار بطيء البيع — بِعت جزءاً فقط.' : 'Real estate is illiquid — sold only part.', 'warn');
  }

  let feeRate = 0.005;
  if (investState.stress >= 70) {
    feeRate = 0.02;
    investTeach('panic', true);
    investPushLog(investLang() === 'ar' ? 'بيع ذعري! عمولة أعلى بسبب الضغط.' : 'Panic sell! Higher fees under stress.', 'danger');
  }

  const gross = sellQty * investState.prices[id];
  const fee = gross * feeRate;
  const net = gross - fee;
  const basisShare = (investState.costBasis[id] || 0) * (sellQty / qty);
  const realized = net - basisShare;
  investState.realizedPnL += realized;
  investState.feesPaid = (investState.feesPaid || 0) + fee;
  investState.holdings[id] -= sellQty;
  investState.costBasis[id] = Math.max(0, (investState.costBasis[id] || 0) - basisShare);
  if (investState.holdings[id] < 0.0001) {
    investState.holdings[id] = 0;
    investState.costBasis[id] = 0;
  }
  investState.cash += net;
  investState.stress = Math.max(0, investState.stress - (pct >= 0.99 ? 6 : 3));
  investPushLog(`${investLang() === 'ar' ? 'بيع' : 'Sold'} ${asset.icon} +${investFmt(net)} (${realized >= 0 ? '+' : ''}${investFmt(realized)} P&L)`, 'sell');
  if (typeof playSound === 'function') playSound('blip');
  investRefresh();
  investScheduleCloudSave();
}

function investRebalance() {
  if (!investState?.started) return;
  const nw = investNetWorth();
  if (nw < 500) return;

  // Sell overweight (except keep liquidity constraints roughly)
  Object.keys(INVEST_ASSETS).forEach(id => {
    const value = (investState.holdings[id] || 0) * investState.prices[id];
    const targetVal = nw * (INVEST_TARGET[id] || 0);
    if (value > targetVal * 1.08) {
      const sellVal = value - targetVal;
      const qty = investState.holdings[id] || 0;
      if (qty <= 0) return;
      const sellQty = Math.min(qty, sellVal / investState.prices[id]);
      const gross = sellQty * investState.prices[id];
      const fee = gross * 0.004;
      const basisShare = (investState.costBasis[id] || 0) * (sellQty / qty);
      investState.holdings[id] -= sellQty;
      investState.costBasis[id] = Math.max(0, (investState.costBasis[id] || 0) - basisShare);
      investState.cash += gross - fee;
      investState.feesPaid += fee;
      investState.realizedPnL += (gross - fee) - basisShare;
    }
  });

  const nw2 = investNetWorth();
  Object.keys(INVEST_ASSETS).forEach(id => {
    if (!investIsUnlocked(id)) return;
    const value = (investState.holdings[id] || 0) * investState.prices[id];
    const targetVal = nw2 * (INVEST_TARGET[id] || 0);
    if (value < targetVal * 0.92) {
      const need = targetVal - value;
      const spend = Math.min(investState.cash * 0.9, need);
      if (spend < 20) return;
      const fee = spend * 0.001;
      const netSpend = spend - fee;
      const qty = netSpend / investState.prices[id];
      investState.cash -= spend;
      investState.feesPaid += fee;
      investState.holdings[id] = (investState.holdings[id] || 0) + qty;
      investState.costBasis[id] = (investState.costBasis[id] || 0) + netSpend;
    }
  });

  investState.xp += 8;
  investTeach('rebalance', true);
  investPushLog(investLang() === 'ar' ? '⚖️ أُعيد توازن المحفظة نحو النسب المستهدفة' : '⚖️ Portfolio rebalanced toward targets', 'news');
  if (typeof playSound === 'function') playSound('levelup');
  investRefresh();
  investScheduleCloudSave();
}

function investTickMarket() {
  if (!investState?.started || investState.paused) return;

  investState.day++;
  const regime = INVEST_REGIMES[investState.regime] || INVEST_REGIMES.balanced;
  const marketFactor = (Math.random() - 0.5) * 2 * 0.02 * regime.volMul;

  Object.keys(INVEST_ASSETS).forEach(id => {
    const a = INVEST_ASSETS[id];
    let drift = a.drift * regime.driftMul;
    if (regime.assetDrift && regime.assetDrift[id] != null) drift *= regime.assetDrift[id];
    const idio = (Math.random() - 0.5) * 2 * a.vol * regime.volMul;
    const corrMove = marketFactor * (regime.corr || 0.35) * (a.risk / 3);
    const next = investState.prices[id] * (1 + drift + idio + corrMove);
    investState.prices[id] = Math.max(a.base * 0.2, Math.round(next * 100) / 100);
  });
  investRecordHistory();

  const conc = investConcentration();
  investState.stress += conc > 0.6 ? 1.2 : 0.25;
  if (investEmergencyMonths() < 2) investState.stress += 0.9;

  if (Math.random() < regime.newsChance) investTriggerNews();
  if (investState.day % 7 === 0) investPayIncome();
  if (investState.day % 30 === 0) investPayBills();
  if (investState.dcaEnabled && investState.day % 5 === 0) investAutoDCA();

  const nw = investNetWorth();
  if (nw > investState.peakNet) investState.peakNet = nw;
  if (nw >= investState.goal) investHitGoal();

  if (investState.stress >= 90 && Math.random() < 0.2) {
    investState.stress = 75;
    investPushLog(investLang() === 'ar' ? 'قلبك يدق! خذ نفساً — لا تبع كل شيء الآن.' : 'Heart racing! Breathe — don’t dump everything.', 'danger');
    investTeach('panic', true);
  }

  investClampStress();
  investRefresh();
  if (investState.day % 5 === 0) investScheduleCloudSave();
}

function investAutoDCA() {
  const cashKeep = investState.monthlyBill * 3;
  const budget = Math.floor(Math.max(0, investState.cash - cashKeep) * 0.15);
  if (budget < 50) return;
  const basket = ['dividend', 'bonds', 'gold', 'growth'].filter(investIsUnlocked);
  const each = Math.floor(budget / basket.length);
  basket.forEach(id => {
    if (each < 10) return;
    const fee = each * 0.001;
    const net = each - fee;
    const qty = net / investState.prices[id];
    investState.cash -= each;
    investState.feesPaid += fee;
    investState.holdings[id] = (investState.holdings[id] || 0) + qty;
    investState.costBasis[id] = (investState.costBasis[id] || 0) + net;
  });
  investState.xp += 3;
  investTeach('compound');
  investPushLog(investLang() === 'ar' ? '📅 شراء دوري (DCA) تلقائي' : '📅 Auto DCA purchase', 'buy');
}

function investTriggerNews() {
  let pool = INVEST_NEWS;
  if (investState.regime === 'stagflation') {
    pool = INVEST_NEWS.filter(n => n.type === 'inflation' || n.type === 'war' || n.type === 'housing' || n.type === 'crash');
  } else if (investState.regime === 'bull') {
    pool = INVEST_NEWS.filter(n => n.stress <= 0 || n.type === 'earnings' || n.type === 'boom' || n.type === 'rate_cut');
  } else if (investState.regime === 'bear') {
    pool = INVEST_NEWS.filter(n => n.stress > 0);
  }
  if (!pool.length) pool = INVEST_NEWS;
  const news = pool[Math.floor(Math.random() * pool.length)];
  Object.keys(news.shock).forEach(k => {
    if (k === 'cashInflation') {
      investState.cash *= (1 - news.shock.cashInflation);
      return;
    }
    if (investState.prices[k]) {
      investState.prices[k] = Math.max(1, investState.prices[k] * (1 + news.shock[k]));
    }
  });
  investRecordHistory();
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
    const basisShare = (investState.costBasis[id] || 0) * (sellQty / qty);
    investState.holdings[id] = Math.max(0, qty - sellQty);
    investState.costBasis[id] = Math.max(0, (investState.costBasis[id] || 0) - basisShare);
    investState.cash += take;
    investState.realizedPnL += take - basisShare;
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
  investSelectAsset(investIsUnlocked(investSelected) ? investSelected : 'growth');
}

function investSerialize() {
  return {
    version: 2,
    cash: investState.cash,
    day: investState.day,
    month: investState.month,
    holdings: investState.holdings,
    prices: investState.prices,
    history: investState.history,
    costBasis: investState.costBasis,
    realizedPnL: investState.realizedPnL,
    feesPaid: investState.feesPaid,
    stress: investState.stress,
    xp: investState.xp,
    lessonsSeen: investState.lessonsSeen,
    academyDone: investState.academyDone,
    academyIndex: investState.academyIndex,
    log: investState.log.slice(0, 20),
    monthlyBill: investState.monthlyBill,
    goal: investState.goal,
    goalsHit: investState.goalsHit,
    peakNet: investState.peakNet,
    cloudId: investState.cloudId,
    started: investState.started,
    regime: investState.regime,
    dcaEnabled: investState.dcaEnabled,
    liveSeed: investState.liveSeed,
    liveNote: investState.liveNote
  };
}

function investApplyData(data) {
  const base = defaultInvestState(data.regime);
  investState = {
    ...base,
    ...data,
    holdings: { ...base.holdings, ...(data.holdings || {}) },
    prices: { ...base.prices, ...(data.prices || {}) },
    history: { ...base.history, ...(data.history || {}) },
    costBasis: { ...base.costBasis, ...(data.costBasis || {}) },
    academyDone: data.academyDone || [],
    lessonsSeen: data.lessonsSeen || []
  };
  Object.keys(INVEST_ASSETS).forEach(id => {
    if (!investState.history[id] || !investState.history[id].length) {
      investState.history[id] = [investState.prices[id]];
    }
    if (investState.costBasis[id] == null) investState.costBasis[id] = 0;
  });
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

function investSelectRegime(id) {
  investSelectedRegime = id;
  document.querySelectorAll('.invest-regime-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.regime === id);
  });
}

async function investFetchLiveSeed() {
  try {
    const res = await fetch('/api/market-seed');
    if (!res.ok) throw new Error('fail');
    investLiveMeta = await res.json();
    return investLiveMeta;
  } catch (e) {
    investLiveMeta = null;
    return null;
  }
}

function investApplyLiveSeed(state, meta) {
  if (!meta || !meta.ok) return state;
  // Scale crypto toward live BTC momentum; gold toward live gold if present
  if (meta.btcChange24h != null) {
    const mul = 1 + Math.max(-0.15, Math.min(0.15, meta.btcChange24h / 100));
    state.prices.crypto = Math.round(INVEST_ASSETS.crypto.base * mul * 100) / 100;
  }
  if (meta.goldChange24h != null) {
    const mul = 1 + Math.max(-0.08, Math.min(0.08, meta.goldChange24h / 100));
    state.prices.gold = Math.round(INVEST_ASSETS.gold.base * mul * 100) / 100;
  }
  Object.keys(INVEST_ASSETS).forEach(id => {
    state.history[id] = [state.prices[id]];
  });
  state.liveSeed = true;
  const btc = meta.btcUsd ? `BTC $${Math.round(meta.btcUsd).toLocaleString()}` : '';
  const chg = meta.btcChange24h != null ? ` (${meta.btcChange24h > 0 ? '+' : ''}${meta.btcChange24h.toFixed(1)}%)` : '';
  state.liveNote = (investLang() === 'ar'
    ? '📡 بذرة حية من السوق: '
    : '📡 Live market seed: ') + btc + chg;
  return state;
}

async function investNewGame() {
  investState = defaultInvestState(investSelectedRegime);
  investState.started = true;
  investState.cloudId = getStore('investCloudId', '') || '';
  const live = document.getElementById('investLiveSeed')?.checked;
  if (live) {
    const meta = await investFetchLiveSeed();
    investApplyLiveSeed(investState, meta);
  }
  investShowGameUI();
  investStartLoop();
  investRefresh();
  investPushLog(investLang() === 'ar' ? 'بدأت برأس مال 10,000 — أكمل الأكاديمية واستثمر بحكمة!' : 'Started with 10,000 — finish the academy and invest wisely!', 'info');
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
  const cloudInput = document.getElementById('investCloudInput');
  if (cloudInput) cloudInput.value = cloudId || '';
  const best = document.getElementById('investBest');
  if (best) best.textContent = investFmt(getStore('best_invest', 0));

  const contBtn = document.getElementById('investContinueBtn');
  if (contBtn) contBtn.classList.toggle('d-none', !(saved && saved.started));

  investRenderRegimePicker();
  investFetchLiveSeed().then(meta => {
    const badge = document.getElementById('investLiveBadge');
    if (!badge) return;
    if (meta?.ok) {
      badge.textContent = investLang() === 'ar'
        ? `📡 متصل — BTC $${Math.round(meta.btcUsd || 0).toLocaleString()}`
        : `📡 Live — BTC $${Math.round(meta.btcUsd || 0).toLocaleString()}`;
      badge.classList.add('live');
    } else {
      badge.textContent = investLang() === 'ar' ? 'محاكاة محلية (بدون إنترنت للأسعار)' : 'Local sim (no live prices)';
    }
  });

  investShowStartUI();
  investSelected = 'growth';
}

function investRenderRegimePicker() {
  const box = document.getElementById('investRegimePicker');
  if (!box) return;
  box.innerHTML = Object.values(INVEST_REGIMES).map(r => `
    <button type="button" class="invest-regime-btn${investSelectedRegime === r.id ? ' active' : ''}" data-regime="${r.id}">
      <span class="invest-regime-icon">${r.icon}</span>
      <strong>${investT(r.name)}</strong>
      <small>${investT(r.desc)}</small>
    </button>
  `).join('');
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

function investToggleDca() {
  if (!investState?.started) return;
  investState.dcaEnabled = !investState.dcaEnabled;
  const btn = document.getElementById('investDcaBtn');
  if (btn) {
    btn.classList.toggle('active', investState.dcaEnabled);
    btn.textContent = investState.dcaEnabled
      ? (investLang() === 'ar' ? '📅 DCA: تشغيل' : '📅 DCA: On')
      : (investLang() === 'ar' ? '📅 DCA: إيقاف' : '📅 DCA: Off');
  }
  investPushLog(investState.dcaEnabled
    ? (investLang() === 'ar' ? 'تم تفعيل الشراء الدوري التلقائي' : 'Auto DCA enabled')
    : (investLang() === 'ar' ? 'أُوقف الشراء الدوري' : 'Auto DCA disabled'), 'info');
}

function investBreathe() {
  if (!investState?.started) return;
  investState.stress = Math.max(0, investState.stress - 12);
  investState.cash = Math.max(0, investState.cash - 20);
  investPushLog(investLang() === 'ar' ? 'أخذت استراحة (-20 نقد، ضغط↓)' : 'Took a breather (-20 cash, stress↓)', 'info');
  investTeach('panic');
  investRefresh();
}

document.addEventListener('click', (e) => {
  const card = e.target.closest('#investAssetList .invest-asset-card');
  if (card && card.dataset.asset) investSelectAsset(card.dataset.asset);

  const regimeBtn = e.target.closest('.invest-regime-btn');
  if (regimeBtn) investSelectRegime(regimeBtn.dataset.regime);

  const quizBtn = e.target.closest('.invest-quiz-btn');
  if (quizBtn) investAnswerQuiz(quizBtn.dataset.quiz, quizBtn.dataset.ans);
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'investAmountMode') {
    document.getElementById('investCustomAmount')?.classList.toggle('d-none', e.target.value !== 'custom');
  }
});
