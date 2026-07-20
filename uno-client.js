let unoSocket;
let myUnoState = null;
let pendingUnoCardIndex = null;

function initUno() {
    document.getElementById('unoOverlay').classList.add('active');
    document.getElementById('unoStartScreen').classList.remove('d-none');
    document.getElementById('unoGameScreen').classList.add('d-none');
    document.getElementById('unoColorPicker').classList.add('d-none');
    const room = getUnoRoomFromUrl();
    const roomInfo = document.getElementById('unoRoomInfo');
    roomInfo.classList.toggle('d-none', !room);
    if (room) roomInfo.textContent = `🔒 تمت دعوتك إلى الغرفة الخاصة: ${room}`;
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

    if (unoSocket) unoSocket.disconnect();
    document.getElementById('unoStartScreen').classList.add('d-none');
    document.getElementById('unoGameScreen').classList.remove('d-none');
    document.getElementById('unoRoomLabel').textContent = mode === 'private' ? `🔒 غرفة خاصة` : mode === 'computer' ? '🤖 ضد الكمبيوتر' : '🌐 غرفة عامة';
    document.getElementById('unoShareBtn').classList.toggle('d-none', mode !== 'private');
    setUnoStatus('جاري الاتصال بالغرفة...');

    unoSocket = io();
    unoSocket.emit('joinUno', { name: playerName, room, mode });

    unoSocket.on('unoGameState', (state) => {
        myUnoState = state;
        renderUnoTable();
    });
    unoSocket.on('unoMessage', (message) => {
        setUnoStatus(message);
        if (typeof showToast === 'function') showToast(message);
    });
    unoSocket.on('connect_error', () => setUnoStatus('تعذر الاتصال بالخادم. حاول مرة أخرى.'));
}

function startUno() {
    if (unoSocket) unoSocket.emit('startUno');
}

function playUnoCard(index) {
    if (!unoSocket || !myUnoState) return;
    const card = myUnoState.players[unoSocket.id].cards[index];
    if (!card || !isMyUnoTurn()) return;
    if (card.color === 'wild') {
        pendingUnoCardIndex = index;
        document.getElementById('unoColorPicker').classList.remove('d-none');
        return;
    }
    unoSocket.emit('playUnoCard', { cardIndex: index, selectedColor: null });
    if (typeof playSound === 'function') playSound('card');
}

function chooseUnoColor(color) {
    if (pendingUnoCardIndex === null || !unoSocket) return;
    unoSocket.emit('playUnoCard', { cardIndex: pendingUnoCardIndex, selectedColor: color });
    pendingUnoCardIndex = null;
    document.getElementById('unoColorPicker').classList.add('d-none');
    if (typeof playSound === 'function') playSound('card');
}

function drawUnoCard() {
    if (unoSocket && isMyUnoTurn()) unoSocket.emit('drawUnoCard');
    if (typeof playSound === 'function') playSound('blip');
}

function isMyUnoTurn() {
    return myUnoState && unoSocket && myUnoState.state === 'playing' && myUnoState.turnOrder[myUnoState.currentTurn] === unoSocket.id;
}

function setUnoStatus(message) {
    const status = document.getElementById('unoStatus');
    if (status) status.textContent = message;
}

function renderUnoTable() {
    if (!myUnoState || !unoSocket) return;
    const r = myUnoState;
    const me = r.players[unoSocket.id];
    if (!me) return;
    const myTurn = isMyUnoTurn();

    const startBtn = document.getElementById('unoStartBtn');
    startBtn.classList.toggle('d-none', !(r.state === 'waiting' && unoSocket.id === r.hostId));
    setUnoStatus(r.state === 'waiting'
        ? (unoSocket.id === r.hostId ? 'أنت المضيف — ابدأ الجولة عندما تكون مستعداً.' : 'بانتظار المضيف لبدء الجولة...')
        : myTurn ? 'دورك الآن — العب ورقة أو اسحب.' : `بانتظار ${r.players[r.turnOrder[r.currentTurn]]?.name || 'اللاعب'}...`);

    const center = document.getElementById('unoCenter');
    if (r.discardPile.length > 0) {
        const topCard = r.discardPile[r.discardPile.length - 1];
        center.replaceChildren(createUnoCard(topCard, false));
        document.getElementById('unoCurrentColor').style.backgroundColor = r.currentColor === 'wild' ? '#fff' : `var(--accent-${r.currentColor === 'red' ? 'red' : r.currentColor === 'blue' ? 'blue' : r.currentColor === 'green' ? 'green' : 'orange'})`;
    } else {
        center.replaceChildren();
    }

    const opponentsDiv = document.getElementById('unoOpponents');
    opponentsDiv.replaceChildren();
    Object.values(r.players).forEach(p => {
        if (p.id !== unoSocket.id) {
            const isTurn = r.state === 'playing' && r.turnOrder[r.currentTurn] === p.id;
            const opponent = document.createElement('div');
            opponent.className = `uno-opponent ${isTurn ? 'active-turn' : ''}`;
            opponent.textContent = `👤 ${p.name} (${p.cardCount} أوراق)`;
            opponentsDiv.appendChild(opponent);
        }
    });

    const hand = document.getElementById('unoMyHand');
    hand.replaceChildren();
    if (me.cards) {
        me.cards.forEach((c, i) => {
            hand.appendChild(createUnoCard(c, myTurn, i));
        });
    }
    document.getElementById('unoDrawPile').classList.toggle('uno-disabled', !myTurn);
}

function createUnoCard(card, playable, index) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `uno-card bg-${card.color}${playable ? '' : ' uno-disabled'}`;
    element.textContent = card.value;
    if (playable) element.addEventListener('click', () => playUnoCard(index));
    return element;
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
    if (unoSocket) { unoSocket.disconnect(); unoSocket = null; }
    myUnoState = null;
    pendingUnoCardIndex = null;
}