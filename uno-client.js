let unoSocket = null;
let myUnoState = null;
let unoPendingWildIndex = null;

const UNO_VALUE_LABELS = {
    Skip: '⊘',
    Reverse: '⇄',
    Wild: '★',
    '+2': '+2',
    '+4': '+4'
};

const UNO_COLOR_HEX = {
    red: '#c9183a',
    blue: '#0a8fd4',
    green: '#12b56a',
    yellow: '#f0a000',
    wild: '#2d2d44'
};

function initUno() {
    document.getElementById('unoOverlay').classList.add('active');
    showUnoScreen('start');
    hideUnoColorPicker();
    setUnoStatus('اختر وضع اللعب');
}

function showUnoScreen(which) {
    const start = document.getElementById('unoStartScreen');
    const game = document.getElementById('unoGameScreen');
    if (which === 'start') {
        start.classList.remove('d-none');
        game.classList.add('d-none');
        game.classList.remove('d-flex');
    } else {
        start.classList.add('d-none');
        game.classList.remove('d-none');
        game.classList.add('d-flex');
    }
}

function setUnoStatus(msg) {
    const el = document.getElementById('unoStatus');
    if (el) el.textContent = msg || '';
}

function joinUnoGame(mode) {
    const name = (document.getElementById('unoName').value || 'لاعب').trim().slice(0, 20);
    let room = 'public_uno';

    if (mode === 'private') {
        room = prompt('أدخل اسم الغرفة الخاصة:');
        if (!room || !String(room).trim()) return;
        room = String(room).trim();
    }

    if (unoSocket) {
        unoSocket.removeAllListeners();
        unoSocket.disconnect();
        unoSocket = null;
    }

    showUnoScreen('game');
    setUnoStatus('جاري الاتصال...');
    hideUnoColorPicker();
    unoPendingWildIndex = null;

    unoSocket = io();
    unoSocket.emit('joinUno', { name, room, mode });

    unoSocket.on('unoGameState', (state) => {
        myUnoState = state;
        renderUnoTable();
    });

    unoSocket.on('unoError', ({ msg }) => {
        setUnoStatus(msg || 'حدث خطأ');
        if (unoPendingWildIndex !== null && unoPendingWildIndex >= 0) {
            showUnoColorPicker();
        }
        if (typeof playSound === 'function') playSound('blip');
    });

    unoSocket.on('disconnect', () => {
        setUnoStatus('انقطع الاتصال');
    });
}

function startUno() {
    if (unoSocket) unoSocket.emit('startUno');
}

function rematchUno() {
    if (unoSocket) unoSocket.emit('rematchUno');
}

function playUnoCard(index) {
    if (!unoSocket || !myUnoState) return;
    const me = myUnoState.players[unoSocket.id];
    if (!me || !me.cards) return;

    const card = me.cards[index];
    if (!card) return;

    const myTurn = myUnoState.state === 'playing' && myUnoState.turnOrder[myUnoState.currentTurn] === unoSocket.id;
    if (!myTurn) {
        setUnoStatus('ليس دورك');
        return;
    }

    if (card.color === 'wild') {
        unoPendingWildIndex = index;
        showUnoColorPicker();
        setUnoStatus('اختر لوناً');
        return;
    }

    unoSocket.emit('playUnoCard', { cardIndex: index, selectedColor: null });
    if (typeof playSound === 'function') playSound('card');
}

function chooseUnoColor(color) {
    if (unoPendingWildIndex === null || unoPendingWildIndex < 0 || !unoSocket) return;
    if (!['red', 'blue', 'green', 'yellow'].includes(color)) return;
    const index = unoPendingWildIndex;
    unoPendingWildIndex = null;
    hideUnoColorPicker();
    unoSocket.emit('playUnoCard', { cardIndex: index, selectedColor: color });
    if (typeof playSound === 'function') playSound('card');
}

function cancelUnoColor() {
    unoPendingWildIndex = null;
    hideUnoColorPicker();
    setUnoStatus('تم إلغاء اختيار اللون');
}

function showUnoColorPicker() {
    const el = document.getElementById('unoColorPicker');
    if (el) el.classList.remove('d-none');
}

function hideUnoColorPicker() {
    const el = document.getElementById('unoColorPicker');
    if (el) el.classList.add('d-none');
}

function drawUnoCard() {
    if (!unoSocket || !myUnoState) return;
    const myTurn = myUnoState.state === 'playing' && myUnoState.turnOrder[myUnoState.currentTurn] === unoSocket.id;
    if (!myTurn) {
        setUnoStatus('ليس دورك');
        return;
    }
    unoSocket.emit('drawUnoCard');
    if (typeof playSound === 'function') playSound('blip');
}

function passUno() {
    if (!unoSocket) return;
    unoSocket.emit('passUno');
}

function cardLabel(card) {
    if (!card) return '';
    return UNO_VALUE_LABELS[card.value] || card.value;
}

function cardTitle(card) {
    if (!card) return '';
    const names = {
        Skip: 'تخطي',
        Reverse: 'عكس الاتجاه',
        Wild: 'تبديل اللون',
        '+2': 'سحب اثنتين',
        '+4': 'سحب أربع'
    };
    return names[card.value] || card.value;
}

function isUnoCardPlayable(card, state) {
    if (!card || !state || !state.discardTop) return false;
    if (card.color === 'wild') return true;
    if (card.color === state.currentColor) return true;
    if (card.value === state.discardTop.value) return true;
    return false;
}

function renderUnoCardHtml(card, extraClass, onclick, styleAttr) {
    const label = cardLabel(card);
    const title = cardTitle(card);
    const click = onclick ? `onclick="${onclick}"` : '';
    const style = styleAttr ? `style="${styleAttr}"` : '';
    const isWild = card.color === 'wild';
    const faceClass = isWild ? 'uno-face-wild' : `uno-face-${card.color}`;
    return `<div class="uno-card uno-card-3d ${faceClass} ${extraClass || ''}" ${style} ${click} title="${title}">
        <div class="uno-card-inner">
          <span class="uno-corner uno-corner-tl">${label}</span>
          <span class="uno-corner uno-corner-br">${label}</span>
          <div class="uno-oval">
            <span class="uno-card-value">${label}</span>
          </div>
          <div class="uno-card-shine"></div>
        </div>
    </div>`;
}

function renderUnoTable() {
    if (!myUnoState || !unoSocket) return;
    const r = myUnoState;
    const me = r.players[unoSocket.id];
    const myTurn = r.state === 'playing' && r.turnOrder[r.currentTurn] === unoSocket.id;

    const startBtn = document.getElementById('unoStartBtn');
    const rematchBtn = document.getElementById('unoRematchBtn');
    const passBtn = document.getElementById('unoPassBtn');

    if (startBtn) {
        startBtn.classList.toggle('d-none', !(r.state === 'waiting' && Object.keys(r.players).length >= 2));
    }
    if (rematchBtn) {
        rematchBtn.classList.toggle('d-none', r.state !== 'finished');
    }
    if (passBtn) {
        passBtn.classList.toggle('d-none', !(myTurn && r.drawnThisTurn));
    }

    // حالة الدور
    if (r.state === 'waiting') {
        setUnoStatus(`بانتظار البدء — ${r.playerCount}/${r.maxPlayers} لاعبين`);
    } else if (r.state === 'finished') {
        setUnoStatus(r.winner ? `🎉 فاز ${r.winner}!` : 'انتهت اللعبة');
    } else if (myTurn) {
        setUnoStatus(r.drawnThisTurn ? 'يمكنك لعب الورقة المسحوبة أو تمرير الدور' : 'دورك — العب أو اسحب');
    } else {
        const turnPlayer = r.players[r.turnOrder[r.currentTurn]];
        setUnoStatus(turnPlayer ? `دور: ${turnPlayer.name}` : '...');
    }

    const actionEl = document.getElementById('unoLastAction');
    if (actionEl) actionEl.textContent = r.lastAction || '';

    // الورقة المركزية
    const center = document.getElementById('unoCenter');
    if (r.discardTop) {
        center.innerHTML = renderUnoCardHtml(r.discardTop, 'uno-discard-card');
    } else {
        center.innerHTML = '';
    }

    const colorEl = document.getElementById('unoCurrentColor');
    if (colorEl) {
        colorEl.style.background = UNO_COLOR_HEX[r.currentColor] || '#fff';
        colorEl.title = r.currentColor || '';
    }

    const deckEl = document.getElementById('unoDrawPile');
    const deckCount = document.getElementById('unoDeckCount');
    if (deckEl) {
        deckEl.classList.toggle('uno-disabled', !myTurn || r.drawnThisTurn || r.state !== 'playing');
    }
    if (deckCount) deckCount.textContent = r.deckCount || 0;

    // الخصوم
    const opponentsDiv = document.getElementById('unoOpponents');
    opponentsDiv.innerHTML = '';
    Object.values(r.players).forEach((p) => {
        if (p.id === unoSocket.id) return;
        const isTurn = r.state === 'playing' && r.turnOrder[r.currentTurn] === p.id;
        const count = p.cardCount != null ? p.cardCount : (p.cards ? p.cards.length : 0);
        const backs = Math.min(count, 5);
        let mini = '';
        for (let i = 0; i < backs; i++) {
            mini += `<span class="uno-mini-back" style="--i:${i}"></span>`;
        }
        opponentsDiv.innerHTML += `
            <div class="uno-opponent ${isTurn ? 'active-turn' : ''}">
                <div class="uno-opp-name">${p.isBot ? '🤖 ' : '👤 '}${escapeUnoHtml(p.name)}</div>
                <div class="uno-opp-stack">${mini}</div>
                <div class="uno-opp-cards">${count} ورقة</div>
            </div>`;
    });

    // يدي — مروحة مريحة بدون تكدس
    const hand = document.getElementById('unoMyHand');
    hand.innerHTML = '';
    if (me && me.cards) {
        const n = me.cards.length;
        const mid = (n - 1) / 2;
        const spread = n <= 1 ? 0 : Math.min(5.5, 42 / Math.max(n - 1, 1));
        me.cards.forEach((c, i) => {
            const playable = myTurn && isUnoCardPlayable(c, r);
            const cls = playable ? 'uno-playable' : (myTurn ? 'uno-unplayable' : '');
            const angle = (i - mid) * spread;
            // الورقة الوسطى أعلى، الأطراف أقل ارتفاعاً
            const lift = -Math.max(0, 22 - Math.abs(i - mid) * 5);
            hand.innerHTML += renderUnoCardHtml(
                c,
                cls,
                `playUnoCard(${i})`,
                `--uno-rot:${angle}deg; --uno-lift:${lift}px; --uno-z:${i}`
            );
        });
    }

    const turnBanner = document.getElementById('unoTurnBanner');
    if (turnBanner) {
        turnBanner.classList.toggle('d-none', !myTurn || r.state !== 'playing');
    }
}

function escapeUnoHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function closeUno() {
    document.getElementById('unoOverlay').classList.remove('active');
    hideUnoColorPicker();
    unoPendingWildIndex = null;
    myUnoState = null;
    if (unoSocket) {
        unoSocket.removeAllListeners();
        unoSocket.disconnect();
        unoSocket = null;
    }
    showUnoScreen('start');
}
