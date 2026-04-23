let unoSocket;
let myUnoState = null;

function initUno() {
    document.getElementById('unoOverlay').classList.add('active');
    document.getElementById('unoStartScreen').style.display = 'block';
    document.getElementById('unoGameScreen').style.display = 'none';
}

function joinUnoGame(mode) {
    const name = document.getElementById('unoName').value || 'لاعب';
    let room = 'public_uno';
    
    if (mode === 'private') {
        room = prompt('أدخل اسم الغرفة (تتسع لـ 8 لاعبين):');
        if (!room) return;
    } else if (mode === 'computer') {
        room = 'bot_uno_' + Math.random().toString(36).substr(2, 6);
    }

    document.getElementById('unoStartScreen').style.display = 'none';
    document.getElementById('unoGameScreen').style.display = 'flex';
    
    unoSocket = io();
    unoSocket.emit('joinUno', { name, room, mode });
    
    unoSocket.on('unoGameState', (state) => {
        myUnoState = state;
        renderUnoTable();
    });
}

function startUno() {
    if (unoSocket) unoSocket.emit('startUno');
}

function playUnoCard(index) {
    if (!unoSocket || !myUnoState) return;
    const card = myUnoState.players[unoSocket.id].cards[index];
    let selectedColor = null;
    if (card.color === 'wild') {
        selectedColor = prompt('اختر لوناً (red, blue, green, yellow):');
        if (!['red', 'blue', 'green', 'yellow'].includes(selectedColor)) return;
    }
    unoSocket.emit('playUnoCard', { cardIndex: index, selectedColor });
    if (typeof playSound === 'function') playSound('card');
}

function drawUnoCard() {
    if (unoSocket) unoSocket.emit('drawUnoCard');
    if (typeof playSound === 'function') playSound('blip');
}

function renderUnoTable() {
    if (!myUnoState || !unoSocket) return;
    const r = myUnoState;
    const me = r.players[unoSocket.id];

    // تحديث الأزرار
    const startBtn = document.getElementById('unoStartBtn');
    startBtn.style.display = (r.state === 'waiting' && r.turnOrder.length === 0) ? 'block' : 'none';
    
    // تحديث الطاولة (الورقة في المنتصف)
    const center = document.getElementById('unoCenter');
    if (r.discardPile.length > 0) {
        const topCard = r.discardPile[r.discardPile.length - 1];
        center.innerHTML = `<div class="uno-card bg-${topCard.color}">${topCard.value}</div>`;
        document.getElementById('unoCurrentColor').style.backgroundColor = r.currentColor === 'wild' ? '#fff' : `var(--accent-${r.currentColor === 'red' ? 'red' : r.currentColor === 'blue' ? 'blue' : r.currentColor === 'green' ? 'green' : 'orange'})`;
    }

    // تحديث الخصوم
    const opponentsDiv = document.getElementById('unoOpponents');
    opponentsDiv.innerHTML = '';
    Object.values(r.players).forEach(p => {
        if (p.id !== unoSocket.id) {
            const isTurn = r.state === 'playing' && r.turnOrder[r.currentTurn] === p.id;
            opponentsDiv.innerHTML += `<div class="uno-opponent ${isTurn ? 'active-turn' : ''}">👤 ${p.name} (${p.cards.length} أوراق)</div>`;
        }
    });

    // تحديث أوراقي
    const hand = document.getElementById('unoMyHand');
    hand.innerHTML = '';
    if (me && me.cards) {
        me.cards.forEach((c, i) => {
            hand.innerHTML += `<div class="uno-card bg-${c.color}" onclick="playUnoCard(${i})">${c.value}</div>`;
        });
    }
}

function closeUno() {
    document.getElementById('unoOverlay').classList.remove('active');
    if (unoSocket) { unoSocket.disconnect(); unoSocket = null; }
}