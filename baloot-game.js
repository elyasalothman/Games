// ─────────────────────────────────────────────
// ♠️ BALOOT (UI & Scaffolding)
// ─────────────────────────────────────────────
let balootSocket;
let myBalootState = null;

function initBaloot() {
    document.getElementById('balootOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('balootStartScreen').classList.remove('d-none');
    document.getElementById('balootGameScreen').classList.add('d-none');
}

function joinBalootGame(mode) {
    const name = document.getElementById('balootName').value || 'لاعب';
    let room = 'public_baloot';
    
    if (mode === 'private') {
        room = prompt('أدخل اسم أو رقم غرفة البلوت:');
        if (!room) return;
    } else if (mode === 'computer') {
        room = 'bot_baloot_' + Math.random().toString(36).substr(2, 6);
    }

    document.getElementById('balootStartScreen').classList.add('d-none');
    document.getElementById('balootGameScreen').classList.remove('d-none');
    
    // الاتصال بخادم البلوت
    balootSocket = io();
    balootSocket.emit('joinBaloot', { name, room, mode });
    
    // الاستماع لحالة الطاولة والأوراق
    balootSocket.on('balootGameState', (state) => {
        myBalootState = state;
        renderBalootTable();
    });
}

function dealBalootCards() {
    if (balootSocket) balootSocket.emit('dealBaloot');
    playSound('card');
}

function sendBalootAction(action) {
    if (balootSocket) balootSocket.emit('balootAction', action);
}

function playBalootCard(index) {
    if (balootSocket) balootSocket.emit('playBalootCard', index);
    playSound('card');
}

function declareProject() {
    if (balootSocket) balootSocket.emit('declareProject');
}

function balootQaid() {
    if (balootSocket) balootSocket.emit('balootQaid');
}

function renderBalootTable() {
    if (!myBalootState || !balootSocket) return;
    
    // تحديث لوحة النتائج (لنا ولهم)
    if (myBalootState.team1 && myBalootState.team2) {
        const isTeam1 = myBalootState.team1.includes(balootSocket.id);
        const myTeamScore = isTeam1 ? myBalootState.scoreTeam1 : myBalootState.scoreTeam2;
        const theirTeamScore = isTeam1 ? myBalootState.scoreTeam2 : myBalootState.scoreTeam1;
        document.getElementById('balootScoreUs').textContent = myTeamScore;
        document.getElementById('balootScoreThem').textContent = theirTeamScore;
    }

    // تحديث أسماء اللاعبين حول الطاولة بناءً على ترتيب الجلوس
    if (myBalootState.turnOrder && myBalootState.turnOrder.length === 4) {
        const myIndex = myBalootState.turnOrder.indexOf(balootSocket.id);
        if (myIndex !== -1) {
            const rightId = myBalootState.turnOrder[(myIndex + 1) % 4];
            const topId = myBalootState.turnOrder[(myIndex + 2) % 4];
            const leftId = myBalootState.turnOrder[(myIndex + 3) % 4];

            document.getElementById('balootPlayerRight').textContent = myBalootState.players[rightId] ? myBalootState.players[rightId].name : 'خصم 1';
            document.getElementById('balootPlayerTop').textContent = myBalootState.players[topId] ? myBalootState.players[topId].name : 'الخوي';
            document.getElementById('balootPlayerLeft').textContent = myBalootState.players[leftId] ? myBalootState.players[leftId].name : 'خصم 2';
        }
    }

    // رسم أوراق اللاعب (أنت)
    const myPlayer = myBalootState.players[balootSocket.id];
    if (myPlayer && myPlayer.cards) {
        const hand = document.getElementById('balootMyHand');
        hand.innerHTML = '';
        myPlayer.cards.forEach((c, index) => {
            const colorClass = c.color === 'red' ? 'card-red' : 'card-black';
            hand.innerHTML += `<div class="baloot-card ${colorClass}" onclick="playBalootCard(${index})"><div class="card-top-left">${c.value}${c.suit}</div><div class="card-center">${c.suit}</div></div>`;
        });
    }
    
    // رسم الأوراق في منتصف الطاولة (الطاولة الحالية)
    const center = document.getElementById('balootCenter');
    if (myBalootState.state === 'playing') {
        center.innerHTML = '';
        if (myBalootState.currentTrick) {
            myBalootState.currentTrick.forEach((play, i) => {
                const c = play.card;
                const colorClass = c.color === 'red' ? 'card-red' : 'card-black';
                const rotation = (i * 20) - 30; // ميلان خفيف لكل ورقة لتبدو متراكمة
                // رفع الورقة في البعد Z لتبدو الأوراق متراكمة فوق بعضها في الـ 3D
                center.innerHTML += `<div class="baloot-card ${colorClass}" style="position:absolute; transform: rotate(${rotation}deg) translateZ(${i * 5}px); margin:0; box-shadow: -2px 5px 10px rgba(0,0,0,0.5); cursor:default;"><div class="card-top-left">${c.value}${c.suit}</div><div class="card-center">${c.suit}</div></div>`;
            });
        }
    } else if (myBalootState.centerCard) {
        const c = myBalootState.centerCard;
        const colorClass = c.color === 'red' ? 'card-red' : 'card-black';
        center.innerHTML = `<div class="baloot-card ${colorClass}" style="margin:0; transform: scale(1.2) translateZ(10px); box-shadow: 0 15px 25px rgba(0,0,0,0.6); cursor:default;"><div class="card-top-left">${c.value}${c.suit}</div><div class="card-center">${c.suit}</div></div>`;
    } else {
        center.innerHTML = '';
    }

    // التحكم في الأزرار وحالة اللعبة
    const btnDeal = document.getElementById('btnDeal');
    const btnSan = document.getElementById('btnSan');
    const btnHakam = document.getElementById('btnHakam');
    const btnPass = document.getElementById('btnPass');
    const btnProject = document.getElementById('btnProject');
    const btnQaid = document.getElementById('btnQaid');
    const statusDiv = document.getElementById('balootActionStatus');

    [btnDeal, btnSan, btnHakam, btnPass, btnProject, btnQaid].forEach(btn => btn.classList.add('d-none'));
    statusDiv.textContent = '';

    if (myBalootState.state === 'waiting') {
        // السماح للاعب الأول (مدير الغرفة) بتوزيع الورق
        const firstPlayerId = Object.keys(myBalootState.players)[0];
        if (balootSocket.id === firstPlayerId) {
            btnDeal.classList.remove('d-none');
        }
        else statusDiv.textContent = 'بانتظار توزيع الورق...';
    } else if (myBalootState.state === 'bidding') {
        const currentTurnId = myBalootState.turnOrder[myBalootState.currentTurnIndex];
        if (currentTurnId === balootSocket.id) {
            btnSan.style.display = 'inline-block'; btnHakam.style.display = 'inline-block'; btnPass.style.display = 'inline-block';
            statusDiv.textContent = 'دورك في المشترا!';
        } else {
            const turnPlayer = myBalootState.players[currentTurnId];
            statusDiv.textContent = `بانتظار ${turnPlayer ? turnPlayer.name : 'اللاعب'} ليشتري...`;
        }
    } else if (myBalootState.state === 'playing') {
        // إظهار زر "قيد" إذا رمى شخص آخر ورقة
        if (myBalootState.lastPlay && myBalootState.lastPlay.playerId !== balootSocket.id) {
            btnQaid.classList.remove('d-none');
        }

        const currentTurnId = myBalootState.turnOrder[myBalootState.currentTurnIndex];
        if (currentTurnId === balootSocket.id) {
            // إظهار زر إعلان المشروع إذا كان متوفراً في أول أكلة
            const me = myBalootState.players[balootSocket.id];
            if (myBalootState.firstTrick && me.project && !me.projectDeclared) {
                btnProject.textContent = `أعلن ${me.project.name}`;
                btnProject.classList.remove('d-none');
            }

            statusDiv.textContent = 'دورك! العب ورقة.';
        } else {
            const turnPlayer = myBalootState.players[currentTurnId];
            statusDiv.textContent = `بانتظار ${turnPlayer ? turnPlayer.name : 'اللاعب'} ليلعب...`;
        }
    }
}

function closeBaloot() {
    document.getElementById('balootOverlay').classList.remove('active');
    document.body.style.overflow = '';
    if (balootSocket) { balootSocket.disconnect(); balootSocket = null; }
}