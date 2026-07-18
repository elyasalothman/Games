// ─────────────────────────────────────────────
// 💰 MONEY CATCHER (صائد الأموال)
// ─────────────────────────────────────────────
let moneyState = {
    score: 0,
    active: false,
    items: [],
    animationId: null,
    currentCoinValue: 10,
    currentCashValue: 50,
    currentDiamondValue: 100,
    upgradeLevels: { value: 0, luck: 0, autoCollector: 0 },
    upgradeCosts: { value: 50, luck: 100, autoCollector: 200 },
    lastPlayedTime: 0,
    lastSaveTime: 0,
    autoTick: 0
};

const MONEY_GAME_STORAGE_KEY = 'moneyGameProgress';
const OFFLINE_EARNINGS_RATE = 0.01;
let moneyCanvasBound = false;

function loadMoneyProgress() {
    const savedProgress = getStore(MONEY_GAME_STORAGE_KEY, null);
    if (savedProgress) {
        moneyState.score = savedProgress.score || 0;
        moneyState.upgradeLevels = savedProgress.upgradeLevels || { value: 0, luck: 0, autoCollector: 0 };
        moneyState.upgradeCosts = savedProgress.upgradeCosts || { value: 50, luck: 100, autoCollector: 200 };
        moneyState.lastPlayedTime = savedProgress.lastPlayedTime || 0;
    }
    moneyState.upgradeCosts.value = moneyState.upgradeCosts.value || 50;
    moneyState.upgradeCosts.luck = moneyState.upgradeCosts.luck || 100;
    moneyState.upgradeCosts.autoCollector = moneyState.upgradeCosts.autoCollector || 200;
}

function saveMoneyProgress() {
    setStore(MONEY_GAME_STORAGE_KEY, {
        score: moneyState.score,
        upgradeLevels: moneyState.upgradeLevels,
        upgradeCosts: moneyState.upgradeCosts,
        lastPlayedTime: Date.now()
    });
    moneyState.lastSaveTime = Date.now();
}

function calculateDerivedValues() {
    const valueLevel = moneyState.upgradeLevels.value;
    moneyState.currentCoinValue = Math.floor(10 * (1 + valueLevel * 0.25));
    moneyState.currentCashValue = Math.floor(50 * (1 + valueLevel * 0.20));
    moneyState.currentDiamondValue = Math.floor(100 * (1 + valueLevel * 0.15));
}

function bindMoneyCanvas() {
    if (moneyCanvasBound) return;
    const cvs = document.getElementById('moneyCanvas');
    if (!cvs) return;
    cvs.addEventListener('click', handleMoneyClick);
    cvs.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleMoneyClick(e.touches[0]);
    }, { passive: false });
    moneyCanvasBound = true;
}

function initMoney() {
    bindMoneyCanvas();
    loadMoneyProgress();
    calculateDerivedValues();

    if (moneyState.lastPlayedTime > 0) {
        const timeOfflineHours = (Date.now() - moneyState.lastPlayedTime) / (1000 * 60 * 60);
        if (timeOfflineHours > 0.1) {
            const offlineEarnings = Math.floor(moneyState.score * OFFLINE_EARNINGS_RATE * timeOfflineHours);
            if (offlineEarnings > 0) {
                moneyState.score += offlineEarnings;
                showToast(`💰 كسبت ${offlineEarnings}$ أثناء غيابك!`);
            }
        }
    }
    moneyState.lastPlayedTime = Date.now();
    moneyState.active = false;
    moneyState.items = [];

    document.getElementById('moneyScore').textContent = '$' + moneyState.score;
    document.getElementById('moneyBest').textContent = '$' + getStore('best_money', 0);
    document.getElementById('moneyCanvas').classList.add('d-none');
    document.getElementById('moneyUpgrades').classList.add('d-none');

    const startBtn = document.getElementById('moneyStartBtn');
    startBtn.classList.remove('d-none');
    startBtn.textContent = '▶ ابدأ اللعب';

    updateMoneyUI();
}

function startMoney() {
    moneyState.active = true;
    moneyState.items = [];

    document.getElementById('moneyStartBtn').classList.add('d-none');
    document.getElementById('moneyCanvas').classList.remove('d-none');
    document.getElementById('moneyUpgrades').classList.remove('d-none');

    if (typeof recordGamePlayed === 'function') recordGamePlayed();
    moneyLoop();
}

function stopMoney() {
    moneyState.active = false;
    if (moneyState.animationId) cancelAnimationFrame(moneyState.animationId);
    document.getElementById('moneyUpgrades').classList.add('d-none');
    saveMoneyProgress();

    const best = Math.max(moneyState.score, getStore('best_money', 0));
    setStore('best_money', best);
    document.getElementById('moneyBest').textContent = '$' + best;
    if (typeof submitScore === 'function') submitScore('money', moneyState.score, false);
}

function closeMoney() {
    stopMoney();
}

function updateMoneyUI() {
    document.getElementById('moneyScore').textContent = '$' + moneyState.score;

    document.getElementById('moneyUpgradeValueLevel').textContent = moneyState.upgradeLevels.value;
    document.getElementById('moneyUpgradeLuckLevel').textContent = moneyState.upgradeLevels.luck;
    document.getElementById('moneyUpgradeAutoCollectorLevel').textContent = moneyState.upgradeLevels.autoCollector;

    document.getElementById('moneyUpgradeValueCost').textContent = moneyState.upgradeCosts.value;
    document.getElementById('moneyUpgradeLuckCost').textContent = moneyState.upgradeCosts.luck;
    document.getElementById('moneyUpgradeAutoCollectorCost').textContent = moneyState.upgradeCosts.autoCollector;

    document.getElementById('moneyUpgradeValue').disabled = moneyState.score < moneyState.upgradeCosts.value;
    document.getElementById('moneyUpgradeLuck').disabled = moneyState.score < moneyState.upgradeCosts.luck;
    document.getElementById('moneyUpgradeAutoCollector').disabled = moneyState.score < moneyState.upgradeCosts.autoCollector;
}

function upgradeMoney(type) {
    const cost = moneyState.upgradeCosts[type];
    if (moneyState.score < cost) {
        playSound('gameover');
        showToast('💰 رصيدك لا يكفي للترقية!');
        return;
    }
    moneyState.score -= cost;
    moneyState.upgradeLevels[type]++;
    moneyState.upgradeCosts[type] = Math.floor(cost * 1.8);

    if (type === 'value') {
        calculateDerivedValues();
        showToast('✨ تمت ترقية قيمة الأموال!');
    } else if (type === 'luck') {
        showToast('🍀 زاد حظك في الحصول على كنوز!');
    } else {
        showToast('🤖 تم تفعيل/ترقية الجامع الآلي!');
    }

    playSound('levelup');
    updateMoneyUI();
}

function collectMoneyItem(item, i) {
    if (item.type === 'bomb') {
        moneyState.score = Math.max(0, moneyState.score - 150);
        showToast('💥 -150$');
        playSound('gameover');
    } else {
        let val = moneyState.currentCoinValue;
        if (item.type === 'diamond') val = moneyState.currentDiamondValue;
        else if (item.type === 'cash') val = moneyState.currentCashValue;
        moneyState.score += val;
        playSound('coin');
    }
    moneyState.items.splice(i, 1);
    updateMoneyUI();
}

function handleMoneyClick(event) {
    if (!moneyState.active) return;

    const cvs = document.getElementById('moneyCanvas');
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    for (let i = moneyState.items.length - 1; i >= 0; i--) {
        const item = moneyState.items[i];
        if (Math.hypot(x - item.x, y - item.y) < item.radius) {
            collectMoneyItem(item, i);
            return;
        }
    }
}

function runAutoCollector() {
    const level = moneyState.upgradeLevels.autoCollector;
    if (!level || moneyState.items.length === 0) return;

    const interval = Math.max(15, 60 - level * 8);
    moneyState.autoTick = (moneyState.autoTick || 0) + 1;
    if (moneyState.autoTick % interval !== 0) return;

    for (let i = moneyState.items.length - 1; i >= 0; i--) {
        const item = moneyState.items[i];
        if (item.type !== 'bomb') {
            collectMoneyItem(item, i);
            return;
        }
    }
}

function moneyLoop() {
    if (!moneyState.active) {
        saveMoneyProgress();
        return;
    }

    const cvs = document.getElementById('moneyCanvas');
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * cvs.width, Math.random() * cvs.height, Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (Math.random() < 0.07) {
        const luckBonus = moneyState.upgradeLevels.luck * 0.02;
        const typeProb = Math.random();
        let type, speed;

        if (typeProb < 0.15) {
            type = 'bomb'; speed = 4 + Math.random() * 4;
        } else if (typeProb < 0.15 + 0.05 + luckBonus) {
            type = 'diamond'; speed = 6 + Math.random() * 3;
        } else if (typeProb < 0.15 + 0.05 + 0.20 + luckBonus * 2) {
            type = 'cash'; speed = 4 + Math.random() * 3;
        } else {
            type = 'coin'; speed = 3 + Math.random() * 3.5;
        }

        moneyState.items.push({
            x: Math.random() * (cvs.width - 40) + 20,
            y: -30, type, speed,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.2,
            radius: 25
        });
    }

    for (let i = moneyState.items.length - 1; i >= 0; i--) {
        const item = moneyState.items[i];
        item.y += item.speed;
        item.rot += item.rotSpeed;

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rot);
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let emoji = '🪙';
        if (item.type === 'cash') emoji = '💵';
        else if (item.type === 'diamond') emoji = '💎';
        else if (item.type === 'bomb') emoji = '💣';
        ctx.fillText(emoji, 0, 0);
        ctx.restore();

        if (item.y > cvs.height + 30) {
            if (item.type !== 'bomb') {
                let penalty = moneyState.currentCoinValue;
                if (item.type === 'diamond') penalty = moneyState.currentDiamondValue;
                else if (item.type === 'cash') penalty = moneyState.currentCashValue;
                moneyState.score = Math.max(0, moneyState.score - penalty);
                showToast(`💸 -${penalty}$`);
                playSound('gameover');
            }
            moneyState.items.splice(i, 1);
        }
    }

    runAutoCollector();
    updateMoneyUI();

    if (Date.now() - moneyState.lastSaveTime > 10000) saveMoneyProgress();

    moneyState.animationId = requestAnimationFrame(moneyLoop);
}
