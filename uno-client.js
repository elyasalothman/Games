let unoSocket;
let myUnoState = null;
let pendingUnoCardIndex = null;

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
    pendingUnoCardIndex = null;
    const room = getUnoRoomFromUrl();
    const roomInfo = document.getElementById('unoRoomInfo');
    roomInfo.classList.toggle('d-none', !room);
    if (room) roomInfo.textContent = `🔒 تمت دعوتك إلى الغرفة الخاصة: ${room}`;
    document.getElementById('unoPrivateAction').textContent = room ? 'انضم للغرفة المدعوة' : 'أنشئ غرفة خاصة (8 لاعبين)';
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

function hideUnoColorPicker() {
    const el = document.getElementById('unoColorPicker');
    if (el) el.classList.add('d-none');
}

function getUnoRoomFromUrl() {
    const room = new URLSearchParams(window.location.search).get('room');
    return room && /^[a-zA-Z0-9_-]{3,48}$/.test(room) ? room : null;
}

function createUnoRoomId() {
    const random = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(2)).join('')
        : Math.random().toString(36).slice(2);
    return `uno_${random.slice(0, 20)}`;
}

function setUnoRoomUrl(room) {
    const url = new URL(window.location.href);
    url.searchParams.set('game', 'uno');
    url.searchParams.set('room', room);
    window.history.replaceState({}, '', url);
}

function joinUnoGame(mode) {
    const name = (document.getElementById('unoName').value || '').trim();
    const playerName = name || (typeof getStore === 'function' ? getStore('globalPlayerName', '') : '') || 'لاعب';
    if (name && typeof savePlayerName === 'function') savePlayerName(name);
    let room = 'public_uno';

    if (mode === 'private' || mode === 'invited') {
        room = getUnoRoomFromUrl() || createUnoRoomId();
        setUnoRoomUrl(room);
        mode = 'private';
    } else if (mode === 'computer') {
        room = 'bot_uno_' + Math.random().toString(36).substr(2, 6);
    }

    if (unoSocket) {
        unoSocket.removeAllListeners();
        unoSocket.disconnect();
        unoSocket = null;
    }

    showUnoScreen('game');
    document.getElementById('unoRoomLabel').textContent = mode === 'private' ? '🔒 غرفة خاصة' : mode === 'computer' ? '🤖 ضد الكمبيوتر' : '🌐 غرفة عامة';
    document.getElementById('unoShareBtn').classList.toggle('d-none', mode !== 'private');
    setUnoStatus('جاري الاتصال بالغرفة...');
    hideUnoColorPicker();
    pendingUnoCardIndex = null;

    unoSocket = io();
    unoSocket.emit('joinUno', { name: playerName, room, mode });

    unoSocket.on('unoGameState', (state) => {
        myUnoState = state;
        renderUnoTable();
    });
    unoSocket.on('unoMessage', (message) => {
        setUnoStatus(message);
        const actionEl = document.getElementById('unoLastAction');
        if (actionEl) actionEl.textContent = message;
        if (typeof showToast === 'function') showToast(message);
    });
    unoSocket.on('connect_error', () => setUnoStatus('تعذر الاتصال بالخادم. حاول مرة أخرى.'));
    unoSocket.on('disconnect', () => setUnoStatus('انقطع الاتصال'));
}

function startUno() {
    if (unoSocket) unoSocket.emit('startUno');
}

function rematchUno() {
    startUno();
}

function passUno() {
    setUnoStatus('التمرير غير متاح — اسحب ورقة للمتابعة');
}

function playUnoCard(index) {
    if (!unoSocket || !myUnoState) return;
    const me = myUnoState.players[unoSocket.id];
    if (!me || !me.cards) return;

    const card = me.cards[index];
    if (!card || !isMyUnoTurn()) return;

    if (card.color === 'wild') {
        pendingUnoCardIndex = index;
        document.getElementById('unoColorPicker').classList.remove('d-none');
        setUnoStatus('اختر لوناً');
        return;
    }

    unoSocket.emit('playUnoCard', { cardIndex: index, selectedColor: null });
    if (typeof playSound === 'function') playSound('card');
}

function chooseUnoColor(color) {
    if (pendingUnoCardIndex === null || !unoSocket) return;
    if (!['red', 'blue', 'green', 'yellow'].includes(color)) return;
    unoSocket.emit('playUnoCard', { cardIndex: pendingUnoCardIndex, selectedColor: color });
    pendingUnoCardIndex = null;
    hideUnoColorPicker();
    if (typeof playSound === 'function') playSound('card');
}

function cancelUnoColor() {
    pendingUnoCardIndex = null;
    hideUnoColorPicker();
    setUnoStatus('تم إلغاء اختيار اللون');
}

function drawUnoCard() {
    if (!unoSocket || !isMyUnoTurn()) {
        setUnoStatus('ليس دورك');
        return;
    }
    unoSocket.emit('drawUnoCard');
    if (typeof playSound === 'function') playSound('blip');
}

function isMyUnoTurn() {
    return myUnoState && unoSocket && myUnoState.state === 'playing' && myUnoState.turnOrder[myUnoState.currentTurn] === unoSocket.id;
}

function setUnoStatus(message) {
    const status = document.getElementById('unoStatus');
    if (status) status.textContent = message;
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

function getDiscardTop(state) {
    if (!state || !state.discardPile || state.discardPile.length === 0) return null;
    return state.discardPile[state.discardPile.length - 1];
}

function isUnoCardPlayable(card, state) {
    const topCard = getDiscardTop(state);
    if (!card || !topCard) return false;
    if (card.color === 'wild') return true;
    if (card.color === state.currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
}

function renderUnoCardHtml(card, extraClass, onclick, styleAttr) {
    const label = cardLabel(card);
    const title = cardTitle(card);
    const click = onclick ? `onclick="${onclick}"` : '';
    const style = styleAttr ? `style="${styleAttr}"` : '';
    const isWild = card.color === 'wild';
    const faceClass = isWild ? 'uno-face-wild' : `uno-face-${card.color}`;
    return `<div class="uno-card ${faceClass} ${extraClass || ''}" ${click} ${style} title="${escapeUnoHtml(title)}" role="button" tabindex="0">
  <div class="uno-card-inner">
    <span class="uno-corner uno-corner-tl">${label}</span>
    <div class="uno-oval"><span class="uno-card-value">${label}</span></div>
    <span class="uno-corner uno-corner-br">${label}</span>
    <div class="uno-card-shine"></div>
  </div>
</div>`;
}

function renderUnoTable() {
    if (!myUnoState || !unoSocket) return;
    const r = myUnoState;
    const me = r.players[unoSocket.id];
    if (!me) return;
    const myTurn = isMyUnoTurn();
    const playerCount = Object.keys(r.players).length;
    const isHost = unoSocket.id === r.hostId;
    const topCard = getDiscardTop(r);

    const startBtn = document.getElementById('unoStartBtn');
    const rematchBtn = document.getElementById('unoRematchBtn');
    const passBtn = document.getElementById('unoPassBtn');

    if (startBtn) {
        startBtn.classList.toggle('d-none', !(r.state === 'waiting' && isHost));
    }
    if (rematchBtn) {
        rematchBtn.classList.add('d-none');
    }
    if (passBtn) {
        passBtn.classList.add('d-none');
    }

    if (r.state === 'waiting') {
        setUnoStatus(isHost
            ? `أنت المضيف — ${playerCount}/${r.maxPlayers} لاعبين`
            : `بانتظار المضيف — ${playerCount}/${r.maxPlayers} لاعبين`);
    } else if (myTurn) {
        setUnoStatus('دورك — العب أو اسحب');
    } else {
        const turnPlayer = r.players[r.turnOrder[r.currentTurn]];
        setUnoStatus(turnPlayer ? `دور: ${turnPlayer.name}` : '...');
    }

    const center = document.getElementById('unoCenter');
    if (topCard) {
        center.innerHTML = renderUnoCardHtml(topCard, 'uno-discard-card');
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
        deckEl.classList.toggle('uno-disabled', !myTurn || r.state !== 'playing');
    }
    if (deckCount) {
        deckCount.textContent = r.deckCount != null ? r.deckCount : '•';
    }

    const opponentsDiv = document.getElementById('unoOpponents');
    opponentsDiv.innerHTML = '';
    Object.values(r.players).forEach((p) => {
        if (p.id === unoSocket.id) return;
        const isTurn = r.state === 'playing' && r.turnOrder[r.currentTurn] === p.id;
        const count = p.cardCount != null ? p.cardCount : (p.cards ? p.cards.length : 0);
        const backs = Math.min(count, 5);
        let mini = '';
        for (let i = 0; i < backs; i++) {
            mini += `<div class="uno-mini-back" style="--i:${i}"></div>`;
        }
        opponentsDiv.innerHTML += `
          <div class="uno-opponent ${isTurn ? 'active-turn' : ''}">
            <div class="uno-opp-name">${p.isBot ? '🤖 ' : '👤 '}${escapeUnoHtml(p.name)}</div>
            <div class="uno-opp-stack">${mini}</div>
            <div class="uno-opp-cards">${count} ورقة</div>
          </div>`;
    });

    const hand = document.getElementById('unoMyHand');
    hand.innerHTML = '';
    if (me.cards) {
        const n = me.cards.length;
        const mid = (n - 1) / 2;
        const spread = n <= 1 ? 0 : Math.min(5.5, 42 / Math.max(n - 1, 1));
        me.cards.forEach((c, i) => {
            const playable = myTurn && isUnoCardPlayable(c, r);
            const cls = playable ? 'uno-playable' : (myTurn ? 'uno-unplayable' : '');
            const angle = (i - mid) * spread;
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

async function shareUnoRoom() {
    const url = window.location.href;
    const text = 'انضم إلى غرفتي الخاصة في أونو! 🃏';
    try {
        if (navigator.share) await navigator.share({ title: 'غرفة أونو خاصة', text, url });
        else {
            await navigator.clipboard.writeText(url);
            setUnoStatus('تم نسخ رابط الغرفة — شاركه مع أصدقائك!');
        }
    } catch (error) {
        if (error.name !== 'AbortError') setUnoStatus('تعذر مشاركة الرابط، انسخه من شريط العنوان.');
    }
}

function closeUno() {
    document.getElementById('unoOverlay').classList.remove('active');
    hideUnoColorPicker();
    pendingUnoCardIndex = null;
    myUnoState = null;
    if (unoSocket) {
        unoSocket.removeAllListeners();
        unoSocket.disconnect();
        unoSocket = null;
    }
    showUnoScreen('start');
}
