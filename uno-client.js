let unoSocket;
let myUnoState = null;
let pendingUnoCardIndex = null;
let unoToken = null;

function getUnoToken() {
    if (unoToken) return unoToken;
    if (typeof getStore === 'function') {
        const stored = getStore('unoPlayerToken', '');
        if (stored) { unoToken = stored; return unoToken; }
    }
    const random = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now()}${Math.random().toString(36).slice(2)}`;
    unoToken = `p_${random}`.slice(0, 40);
    if (typeof setStore === 'function') setStore('unoPlayerToken', unoToken);
    return unoToken;
}

function initUno() {
    document.getElementById('unoOverlay').classList.add('active');
    document.getElementById('unoStartScreen').classList.remove('d-none');
    document.getElementById('unoGameScreen').classList.add('d-none');
    document.getElementById('unoColorPicker').classList.add('d-none');
    document.getElementById('unoChallengePrompt').classList.add('d-none');
    const room = getUnoRoomFromUrl();
    const roomInfo = document.getElementById('unoRoomInfo');
    roomInfo.classList.toggle('d-none', !room);
    if (room) roomInfo.textContent = `🔒 تمت دعوتك إلى الغرفة الخاصة: ${room}`;
    document.getElementById('unoPrivateAction').textContent = room ? 'انضم للغرفة المدعوة' : 'أنشئ غرفة خاصة (8 لاعبين)';
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

    // A WiFi blip or a backgrounded phone tab makes socket.io transparently
    // reconnect with a brand-new connection on the server. Without re-sending
    // joinUno on every 'connect' (not just the first one), that reconnected
    // socket would sit in limbo: never (re)registered in the room, so the
    // player silently stops receiving updates and looks "stuck" to everyone.
    unoSocket.on('connect', () => {
        setUnoStatus('جاري الاتصال بالغرفة...');
        unoSocket.emit('joinUno', { name: playerName, room, mode, token: getUnoToken() });
    });

    unoSocket.on('unoGameState', (state) => {
        myUnoState = state;
        renderUnoTable();
    });
    unoSocket.on('unoMessage', (message) => {
        setUnoStatus(message);
        if (typeof showToast === 'function') showToast(message);
    });
    unoSocket.on('unoRoundResult', ({ winnerToken }) => {
        if (typeof playSound === 'function') playSound(winnerToken === getUnoToken() ? 'levelup' : 'blip');
        if (winnerToken === getUnoToken()) {
            celebrateUnoWin();
            if (typeof addScore === 'function') addScore(100);
            if (typeof setStore === 'function' && typeof getStore === 'function') {
                setStore('best_uno', getStore('best_uno', 0) + 1);
            }
        }
    });
    unoSocket.on('disconnect', () => setUnoStatus('انقطع الاتصال — نحاول العودة تلقائياً...'));
    unoSocket.on('connect_error', () => setUnoStatus('تعذر الاتصال بالخادم. حاول مرة أخرى.'));
}

function startUno() {
    if (unoSocket) unoSocket.emit('startUno');
}

function playUnoCard(index) {
    if (!unoSocket || !myUnoState) return;
    const me = myUnoState.players[getUnoToken()];
    const card = me && me.cards[index];
    if (!card || !isMyUnoTurn() || myUnoState.pendingChallenge) return;
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
    if (!unoSocket || !myUnoState) return;
    if (!isMyUnoTurn() || myUnoState.pendingChallenge || myUnoState.hasDrawnThisTurn) return;
    unoSocket.emit('drawUnoCard');
    if (typeof playSound === 'function') playSound('blip');
}

function passUnoTurn() {
    if (unoSocket) unoSocket.emit('passUnoTurn');
}

function declareUno() {
    if (unoSocket) unoSocket.emit('declareUno');
    if (typeof playSound === 'function') playSound('card');
}

function catchUnoPlayer(targetToken) {
    if (unoSocket) unoSocket.emit('catchUno', { targetToken });
}

function resolveUnoChallenge(accept) {
    if (unoSocket) unoSocket.emit('resolveUnoChallenge', { accept });
    document.getElementById('unoChallengePrompt').classList.add('d-none');
}

function isMyUnoTurn() {
    return myUnoState && myUnoState.state === 'playing' && myUnoState.turnOrder[myUnoState.currentTurn] === getUnoToken();
}

// Mirrors the server's isValidPlay() so the hand only shows cards that will
// actually be accepted, instead of letting players click any card and get
// bounced with a "not allowed" message.
function isValidUnoPlay(card, topCard, currentColor) {
    if (!topCard) return true;
    if (card.color === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
}

function setUnoStatus(message) {
    const status = document.getElementById('unoStatus');
    if (status) status.textContent = message;
}

const UNO_COLOR_VAR = { red: '--accent-red', blue: '--accent-blue', green: '--accent-green', yellow: '--uno-yellow' };

function renderUnoTable() {
    if (!myUnoState || !unoSocket) return;
    const r = myUnoState;
    const myToken = getUnoToken();
    const me = r.players[myToken];
    if (!me) return;
    const myTurn = isMyUnoTurn();
    const awaitingMyChallenge = r.pendingChallenge && r.pendingChallenge.target === myToken;

    const startBtn = document.getElementById('unoStartBtn');
    startBtn.classList.toggle('d-none', !(r.state === 'waiting' && myToken === r.hostToken));

    if (r.state === 'waiting') {
        setUnoStatus(myToken === r.hostToken ? 'أنت المضيف — ابدأ الجولة عندما تكون مستعداً.' : 'بانتظار المضيف لبدء الجولة...');
    } else if (awaitingMyChallenge) {
        setUnoStatus(`${r.pendingChallenge.byName} لعب +4! هل تتحدّاه أم تسحب 4 أوراق؟`);
    } else if (r.pendingChallenge) {
        setUnoStatus('بانتظار قرار اللاعب على بطاقة +4...');
    } else if (myTurn) {
        setUnoStatus(r.hasDrawnThisTurn ? 'سحبت بطاقة — العبها إن كانت مناسبة أو مرّر الدور.' : 'دورك الآن — العب ورقة أو اسحب.');
    } else {
        setUnoStatus(`بانتظار ${r.players[r.turnOrder[r.currentTurn]]?.name || 'اللاعب'}...`);
    }

    document.getElementById('unoChallengePrompt').classList.toggle('d-none', !awaitingMyChallenge);
    document.getElementById('unoDeckCount').textContent = `🂠 ${r.deckCount}`;
    document.getElementById('unoDirection').textContent = r.direction === 1 ? '↻' : '↺';

    const center = document.getElementById('unoCenter');
    if (r.discardPile.length > 0) {
        const topCard = r.discardPile[r.discardPile.length - 1];
        center.replaceChildren(createUnoCard(topCard, false));
        const colorVar = UNO_COLOR_VAR[r.currentColor];
        document.getElementById('unoCurrentColor').style.backgroundColor = colorVar ? `var(${colorVar})` : '#fff';
    } else {
        center.replaceChildren();
    }

    const opponentsDiv = document.getElementById('unoOpponents');
    opponentsDiv.replaceChildren();
    r.turnOrder.length > 0
        ? r.turnOrder.filter((t) => t !== myToken).forEach((t) => opponentsDiv.appendChild(buildOpponentCard(r, t)))
        : Object.keys(r.players).filter((t) => t !== myToken).forEach((t) => opponentsDiv.appendChild(buildOpponentCard(r, t)));

    const hand = document.getElementById('unoMyHand');
    hand.replaceChildren();
    const canAct = myTurn && !r.pendingChallenge;
    const topCard = r.discardPile[r.discardPile.length - 1];
    if (me.cards) {
        me.cards.forEach((c, i) => {
            const playable = canAct && isValidUnoPlay(c, topCard, r.currentColor);
            hand.appendChild(createUnoCard(c, playable, i));
        });
    }
    document.getElementById('unoDrawPile').classList.toggle('uno-disabled', !canAct || r.hasDrawnThisTurn);
    document.getElementById('unoPassBtn').classList.toggle('d-none', !(canAct && r.hasDrawnThisTurn));
    document.getElementById('unoDeclareBtn').classList.toggle('d-none', !(me.cardCount === 1 && !me.saidUno));

    const scoreboard = document.getElementById('unoScoreboard');
    scoreboard.textContent = Object.values(r.players)
        .sort((a, b) => (b.wins || 0) - (a.wins || 0))
        .map((p) => `${p.name}: ${p.wins || 0}🏆`)
        .join('  ·  ');
}

function buildOpponentCard(r, token) {
    const p = r.players[token];
    const isTurn = r.state === 'playing' && r.turnOrder[r.currentTurn] === token;
    const wrap = document.createElement('div');
    wrap.className = `uno-opponent ${isTurn ? 'active-turn' : ''} ${p.connected === false ? 'uno-offline' : ''}`;
    const label = document.createElement('span');
    label.textContent = `${p.token === r.hostToken ? '👑 ' : '👤 '}${p.name}${p.connected === false ? ' (غير متصل)' : ''} — ${p.cardCount} 🂠`;
    wrap.appendChild(label);
    if (p.cardCount === 1 && !p.saidUno) {
        const catchBtn = document.createElement('button');
        catchBtn.type = 'button';
        catchBtn.className = 'btn btn-red uno-catch-btn';
        catchBtn.textContent = '🚨 قبض!';
        catchBtn.onclick = () => catchUnoPlayer(token);
        wrap.appendChild(catchBtn);
    }
    return wrap;
}

function createUnoCard(card, playable, index) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `uno-card bg-${card.color}${playable ? '' : ' uno-disabled'}`;
    element.textContent = card.value;
    if (playable) element.addEventListener('click', () => playUnoCard(index));
    return element;
}

function celebrateUnoWin() {
    const banner = document.getElementById('unoWinBanner');
    if (!banner) return;
    banner.classList.remove('d-none');
    banner.classList.add('uno-win-pop');
    setTimeout(() => {
        banner.classList.add('d-none');
        banner.classList.remove('uno-win-pop');
    }, 2200);
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
