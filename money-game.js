// ─────────────────────────────────────────────
// 💰 MONEY CATCHER (صائد الأموال)
// ─────────────────────────────────────────────
let moneyState = {
    score: 0, // This will be persistent across sessions
    active: false,
    items: [],
    animationId: null,
    // Derived values, updated based on upgradeLevels.value
    currentCoinValue: 10,
    currentCashValue: 50,
    currentDiamondValue: 100,
    // Persistent upgrade data
    upgradeLevels: { value: 0, luck: 0, autoCollector: 0 },
    upgradeCosts: { value: 50, luck: 100, autoCollector: 200 },
    lastPlayedTime: 0, // For offline earnings
    lastSaveTime: 0 // To prevent excessive localStorage writes
};

const MONEY_GAME_STORAGE_KEY = 'moneyGameProgress';
const OFFLINE_EARNINGS_RATE = 0.01; // 1% of current score per hour offline

function loadMoneyProgress() {
    const savedProgress = getStore(MONEY_GAME_STORAGE_KEY, null);
    if (savedProgress) {
        moneyState.score = savedProgress.score || 0;
        moneyState.upgradeLevels = savedProgress.upgradeLevels || { value: 0, luck: 0, autoCollector: 0 };
        moneyState.upgradeCosts = savedProgress.upgradeCosts || { value: 50, luck: 100, autoCollector: 200 };
        moneyState.lastPlayedTime = savedProgress.lastPlayedTime || 0;
    }
    // Ensure default costs are set if new upgrades are added or old ones are missing
    moneyState.upgradeCosts.value = moneyState.upgradeCosts.value || 50;
    moneyState.upgradeCosts.luck = moneyState.upgradeCosts.luck || 100;
    moneyState.upgradeCosts.autoCollector = moneyState.upgradeCosts.autoCollector || 200;
}

function saveMoneyProgress() {
    const progressToSave = {
        score: moneyState.score,
        upgradeLevels: moneyState.upgradeLevels,
        upgradeCosts: moneyState.upgradeCosts,
        lastPlayedTime: Date.now()
    };
    setStore(MONEY_GAME_STORAGE_KEY, progressToSave);
    moneyState.lastSaveTime = Date.now();
}

function calculateDerivedValues() {
    const valueLevel = moneyState.upgradeLevels.value;
    // Values increase with upgrade level
    moneyState.currentCoinValue = Math.floor(10 * (1 + valueLevel * 0.25)); // +25% per level
    moneyState.currentCashValue = Math.floor(50 * (1 + valueLevel * 0.20)); // +20% per level
    moneyState.currentDiamondValue = Math.floor(100 * (1 + valueLevel * 0.15)); // +15% per level
}

function initMoney() {
    // إنشاء الواجهة برمجياً إذا لم تكن موجودة (مثل لعبة الأنمي)
    if (!document.getElementById('moneyOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'moneyOverlay';
        overlay.className = 'overlay'; // flex-center-wrap
        overlay.innerHTML = `
            <div class="game-modal">
                <div class="modal-header">
                    <h2 class="modal-title">💰 صائد الأموال</h2>
                    <button class="close-btn" onclick="closeGame('money')">✖</button>
                </div>
                <div class="score-display">
                    <div class="score-box">
                        <div class="score-label">الرصيد</div>
                        <div class="score-value" id="moneyScore" style="color:var(--accent-green);">$0</div>
                    </div>
                    <div class="score-box">
                        <div class="score-label">أفضل رصيد</div>
                        <div class="score-value" id="moneyBest" style="color:var(--accent-orange);">$0</div>
                    </div>
                </div>

                <!-- منطقة الترقيات الجديدة -->
                <div id="moneyUpgrades" class="flex-center-wrap" style="display:none; margin: 10px 0 15px;">
                    <button class="btn btn-blue" id="moneyUpgradeValue" onclick="upgradeMoney('value')">
                        قيمة أكبر (<span id="moneyUpgradeValueLevel">0</span>) (<span id="moneyUpgradeValueCost">50</span>$)
                    </button>
                    <button class="btn btn-purple" id="moneyUpgradeLuck" onclick="upgradeMoney('luck')">
                        حظ أفضل (<span id="moneyUpgradeLuckLevel">0</span>) (<span id="moneyUpgradeLuckCost">100</span>$)
                    </button>
                    <button class="btn btn-green" id="moneyUpgradeAutoCollector" onclick="upgradeMoney('autoCollector')">
                        جامع آلي (<span id="moneyUpgradeAutoCollectorLevel">0</span>) (<span id="moneyUpgradeAutoCollectorCost">200</span>$)
                    </button>
                </div>
                
                <div style="text-align:center; padding-bottom: 10px;">
                    <canvas id="moneyCanvas" width="320" height="400" style="background: linear-gradient(to bottom, #0f0f1b, #1a1a2e); border-radius:16px; width:100%; max-width:320px; box-shadow: inset 0 0 20px rgba(0,210,255,0.1), 0 10px 20px rgba(0,0,0,0.5); display:none; margin: 0 auto; touch-action: none; border: 2px solid var(--border-color); cursor: pointer;"></canvas>
                    <button id="moneyStartBtn" class="btn primary" style="margin-top:20px; width:100%; font-size:18px; padding:15px;" onclick="startMoney()">▶ ابدأ اللعب</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const cvs = document.getElementById('moneyCanvas');
        // Changed from move to click/tap
        cvs.addEventListener('click', handleMoneyClick);
        cvs.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Simulate a click event for touch to reuse the same logic
            handleMoneyClick(e.touches[0]);
        }, {passive: false});
    }
    
    // Load persistent state
    loadMoneyProgress();
    calculateDerivedValues();

    // Calculate offline earnings
    if (moneyState.lastPlayedTime > 0) {
        const now = Date.now();
        const timeOfflineHours = (now - moneyState.lastPlayedTime) / (1000 * 60 * 60);
        if (timeOfflineHours > 0.1) { // Only calculate if offline for at least 6 minutes
            const offlineEarnings = Math.floor(moneyState.score * OFFLINE_EARNINGS_RATE * timeOfflineHours);
            if (offlineEarnings > 0) {
                moneyState.score += offlineEarnings;
                showToast(`💰 كسبت ${offlineEarnings}$ أثناء غيابك!`);
            }
        }
    }
    moneyState.lastPlayedTime = Date.now(); // Update last played time on init

    document.getElementById('moneyScore').textContent = '$0';
    document.getElementById('moneyBest').textContent = '$' + (typeof getStore === 'function' ? getStore('best_money', 0) : 0);
    document.getElementById('moneyCanvas').style.display = 'none';
    document.getElementById('moneyUpgrades').style.display = 'none';
    
    const startBtn = document.getElementById('moneyStartBtn');
    startBtn.style.display = 'inline-block';
    startBtn.textContent = '▶ ابدأ اللعب';
    
    document.getElementById('moneyOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';

    updateMoneyUI(); // Initial UI update
}

function startMoney() {
    moneyState.active = true;
    moneyState.items = []; // Clear items for new session
    
    document.getElementById('moneyStartBtn').style.display = 'none';
    document.getElementById('moneyCanvas').style.display = 'block';
    document.getElementById('moneyUpgrades').style.display = 'flex';
    
    moneyLoop();
}

function stopMoney() {
    moneyState.active = false;
    if(moneyState.animationId) cancelAnimationFrame(moneyState.animationId);
    document.getElementById('moneyUpgrades').style.display = 'none'; // Hide upgrades when game stops
    saveMoneyProgress(); // Save progress when stopping
}

function closeMoney() {
    stopMoney(); // Stop game loop and save progress
    const overlay = document.getElementById('moneyOverlay');
    if(overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// New function to update all UI elements
function updateMoneyUI() {
    document.getElementById('moneyScore').textContent = '$' + moneyState.score;
    
    const valueBtn = document.getElementById('moneyUpgradeValue');
    const luckBtn = document.getElementById('moneyUpgradeLuck');
    const valueCostEl = document.getElementById('moneyUpgradeValueCost');
    const luckCostEl = document.getElementById('moneyUpgradeLuckCost');
    const autoCollectorBtn = document.getElementById('moneyUpgradeAutoCollector');
    const autoCollectorCostEl = document.getElementById('moneyUpgradeAutoCollectorCost');

    document.getElementById('moneyUpgradeValueLevel').textContent = moneyState.upgradeLevels.value;
    document.getElementById('moneyUpgradeLuckLevel').textContent = moneyState.upgradeLevels.luck;
    document.getElementById('moneyUpgradeAutoCollectorLevel').textContent = moneyState.upgradeLevels.autoCollector;

    valueCostEl.textContent = moneyState.upgradeCosts.value;
    luckCostEl.textContent = moneyState.upgradeCosts.luck;
    autoCollectorCostEl.textContent = moneyState.upgradeCosts.autoCollector;

    valueBtn.disabled = moneyState.score < moneyState.upgradeCosts.value;
    luckBtn.disabled = moneyState.score < moneyState.upgradeCosts.luck;
    autoCollectorBtn.disabled = moneyState.score < moneyState.upgradeCosts.autoCollector;
}

// New function for handling upgrades
function upgradeMoney(type) {
    const cost = moneyState.upgradeCosts[type];
    if (moneyState.score >= cost) {
        moneyState.score -= cost;
        moneyState.upgradeLevels[type]++;
        moneyState.upgradeCosts[type] = Math.floor(cost * 1.8); // Increase cost for next level

        if (type === 'value') {
            calculateDerivedValues(); // Recalculate derived values
            showToast('✨ تمت ترقية قيمة الأموال!');
        } else if (type === 'luck') {
            showToast('🍀 زاد حظك في الحصول على كنوز!');
        } else if (type === 'autoCollector') {
            showToast('🤖 تم تفعيل/ترقية الجامع الآلي!');
        }
        
        if (typeof playSound === 'function') playSound('levelup');
        updateMoneyUI();
    } else {
        if (typeof playSound === 'function') playSound('gameover');
        showToast('💰 رصيدك لا يكفي للترقية!');
    }
}

// New click handler
function handleMoneyClick(event) {
    if (!moneyState.active) return;

    const cvs = document.getElementById('moneyCanvas');
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Iterate backwards to click the top-most item
    for (let i = moneyState.items.length - 1; i >= 0; i--) {
        const item = moneyState.items[i];
        const dist = Math.hypot(x - item.x, y - item.y);

        if (dist < item.radius) {
            if (item.type === 'bomb') {
                moneyState.score = Math.max(0, moneyState.score - 150);
                showToast('💥 -150$');
                // Visual feedback for bomb click
                if (typeof playSound === 'function') playSound('gameover');
                // visual feedback for bomb click
                const ctx = cvs.getContext('2d');
                ctx.fillStyle = 'rgba(255, 51, 102, 0.4)';
                ctx.fillRect(0, 0, cvs.width, cvs.height);
            } else {
                let val = 0;
                if (item.type === 'diamond') val = moneyState.currentDiamondValue;
                else if (item.type === 'cash') val = moneyState.currentCashValue;
                else val = moneyState.currentCoinValue;
                
                moneyState.score += val;
                if (typeof playSound === 'function') playSound('coin');
            }
            moneyState.items.splice(i, 1);
            
            updateMoneyUI(); // تحديث الواجهة فوراً
            return; // only handle one click at a time
        }
    }
}

function moneyLoop() {
    if(!moneyState.active) {
        saveMoneyProgress(); // Ensure save on deactivation
        return;
    }
    const cvs = document.getElementById('moneyCanvas');
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // تأثيرات خلفية بسيطة
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for(let i=0; i<5; i++) {
        ctx.beginPath();
        ctx.arc(Math.random()*cvs.width, Math.random()*cvs.height, Math.random()*2, 0, Math.PI*2);
        ctx.fill();
    }

    // توليد العناصر (أموال أو قنابل)
    if(Math.random() < 0.07) { // Slightly increased spawn rate
        const luckBonus = moneyState.upgradeLevels.luck * 0.02; // Each level adds 2% to good items
        const typeProb = Math.random();
        let type, speed;

        if (typeProb < 0.15) { // 15% bomb (fixed chance)
            type = 'bomb'; speed = 4 + Math.random() * 4;
        } else if (typeProb < 0.15 + 0.05 + luckBonus) { // 5% diamond + bonus
            type = 'diamond'; speed = 6 + Math.random() * 3;
        } else if (typeProb < 0.15 + 0.05 + 0.20 + luckBonus * 2) { // 20% cash + bonus (double effect)
            type = 'cash'; speed = 4 + Math.random() * 3;
        } else { // The rest are coins
            type = 'coin'; speed = 3 + Math.random() * 3.5;
        }
        
        moneyState.items.push({
            x: Math.random() * (cvs.width - 40) + 20, y: -30, type: type, speed: speed,
            rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.2,
            radius: 25 // Radius for click detection
        });
    }

    // رسم وتحديث العناصر
    for(let i = moneyState.items.length - 1; i >= 0; i--) {
        let item = moneyState.items[i];
        item.y += item.speed;
        item.rot += item.rotSpeed;
        
        ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.rot);
        ctx.font = '28px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let emoji = '🪙';
        if(item.type === 'cash') emoji = '💵'; else if(item.type === 'diamond') emoji = '💎'; else if(item.type === 'bomb') emoji = '💣';
        ctx.fillText(emoji, 0, 0); ctx.restore();

        // إذا فاتك عنصر مالي، تخسر من رصيدك بدلاً من الأرواح
        // Penalty for missed items (not bombs)
        if(item.y > cvs.height + 30) {
            if (item.type !== 'bomb') {
                let penalty = 0;
                if (item.type === 'diamond') penalty = moneyState.currentDiamondValue;
                else if (item.type === 'cash') penalty = moneyState.currentCashValue;
                else penalty = moneyState.currentCoinValue;
                moneyState.score = Math.max(0, moneyState.score - penalty);
                showToast(`💸 -${penalty}$`);
                if (typeof playSound === 'function') playSound('gameover');
            }
            moneyState.items.splice(i, 1);
        }
    }

    updateMoneyUI();

    // Save progress periodically (e.g., every 10 seconds)
    if (Date.now() - moneyState.lastSaveTime > 10000) {
        saveMoneyProgress();
    }

    moneyState.animationId = requestAnimationFrame(moneyLoop);
}