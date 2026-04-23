// ─────────────────────────────────────────────
// 🌐 MULTIPLAYER (AGAR.IO CLONE)
// ─────────────────────────────────────────────
let socket;
let agarState = { players: {}, foods: [], viruses: [], isStarted: false, realPlayersCount: 0 };
let myAgarId = null;
let agarLoop;
let mouseX = 0, mouseY = 0;
let isStopped = false; // متغير لحالة الوقوف

function initAgar() {
    document.getElementById('agarStartScreen').classList.remove('d-none');
    document.getElementById('agarCanvas').classList.add('d-none');
    document.getElementById('agarStatus').classList.add('d-none');
    document.getElementById('agarChat').classList.add('d-none');
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('mobileSplitBtn').classList.add('d-none');
    if(socket) { socket.disconnect(); socket = null; }
}

function joinAgarGame(mode) {
    if (typeof io === 'undefined') {
        alert('❌ عذراً! لا يمكن الاتصال بالخادم حالياً. يرجى التأكد من اتصالك بالإنترنت وتحديث الصفحة.');
        return;
    }

    const name = document.getElementById('agarName').value || 'لاعب';
    const color = document.getElementById('agarColor').value;
    const skin = document.getElementById('agarSkin').value;
    let room = 'public';

    if (mode === 'private') {
        room = prompt('أدخل اسم أو رقم الغرفة لإنشائها أو الانضمام إليها:');
        if (!room) return;
    } else if (mode === 'computer') {
        room = 'bot_room_' + Math.random().toString(36).substr(2, 6);
    }

    document.getElementById('agarStartScreen').classList.add('d-none');
    const cvs = document.getElementById('agarCanvas');
    const ctx = cvs.getContext('2d');
    cvs.classList.remove('d-none');
    document.getElementById('agarStatus').classList.remove('d-none');
    document.getElementById('agarChat').classList.remove('d-none');
    
    if ('ontouchstart' in window) {
        document.getElementById('mobileSplitBtn').classList.remove('d-none');
    }
    
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#007aff';
    ctx.font = 'bold 24px Tajawal';
    ctx.textAlign = 'center';
    ctx.fillText('جاري الاتصال بساحة اللعب...', cvs.width / 2, cvs.height / 2);

    socket = io();
    socket.on('connect_error', () => {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = '#ff3b30';
        ctx.fillText('❌ فشل الاتصال بالخادم! يرجى تحديث الصفحة.', cvs.width / 2, cvs.height / 2);
    });

    socket.emit('joinGame', { name, room, mode, color, skin });
    
    socket.on('init', (data) => {
        myAgarId = data.id;
        agarState.foods = data.initialFoods || [];
        agarState.viruses = data.initialViruses || [];
    });

    socket.on('gameStateUpdate', (state) => {
        agarState.players = state.players;
         agarState.isStarted = state.isStarted;
        agarState.realPlayersCount = state.realPlayersCount;

        if (state.foodChanges && state.foodChanges.length > 0) {
            state.foodChanges.forEach(change => {
                if (change.type === 'remove') {
                    const index = agarState.foods.findIndex(f => f.id === change.id);
                    if (index !== -1) agarState.foods.splice(index, 1);
                } else if (change.type === 'add') {
                    agarState.foods.push(change.food);
                }
            });
        }
        
        if (state.virusChanges && state.virusChanges.length > 0) {
            state.virusChanges.forEach(change => {
                if (change.type === 'remove') {
                    const index = agarState.viruses.findIndex(v => v.id === change.id);
                    if (index !== -1) agarState.viruses.splice(index, 1);
                } else if (change.type === 'add') {
                    agarState.viruses.push(change.virus);
                }
            });
        }
        requestAnimationFrame(drawAgar);
    });
    socket.on('chatMessage', (data) => {
        const chatBox = document.getElementById('chatMessages');
        chatBox.innerHTML += `<div><strong style="color:var(--accent-orange)">${data.name}:</strong> ${data.msg}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    });
    socket.on('died', () => { showToast('❌ لقد تم ابتلاعك!'); playSound('gameover'); initAgar(); });

    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            socket.emit('chatMessage', chatInput.value.trim());
            chatInput.value = '';
        }
    });

    cvs.addEventListener('mousemove', (e) => {
        if (document.activeElement === chatInput) return;
        
        isStopped = false;
        const rect = cvs.getBoundingClientRect();
        mouseX = e.clientX - rect.left - (rect.width / 2);
        mouseY = e.clientY - rect.top - (rect.height / 2);
    });
    
    const touchHandler = (e) => {
        if (document.activeElement === chatInput) return;
        e.preventDefault(); isStopped = false;
        const rect = cvs.getBoundingClientRect();
        const touch = e.touches[0];
        mouseX = touch.clientX - rect.left - (rect.width / 2);
        mouseY = touch.clientY - rect.top - (rect.height / 2);
    };
    cvs.addEventListener('touchstart', touchHandler, {passive: false});
    cvs.addEventListener('touchmove', touchHandler, {passive: false});

    if(agarLoop) clearInterval(agarLoop);
    agarLoop = setInterval(() => {
        if(!myAgarId) return;
        const myCells = Object.values(agarState.players || {}).filter(p => p.owner === myAgarId);
        if (myCells.length === 0 || !agarState.isStarted) return;
        const dist = Math.hypot(mouseX, mouseY);
        if (dist > 10 && !isStopped) socket.emit('move', { x: mouseX / dist, y: mouseY / dist });
    }, 1000 / 30);

    window.addEventListener('keydown', handleAgarKey);
}

function handleAgarKey(e) {
    const chatInput = document.getElementById('chatInput');
    if (document.activeElement === chatInput) return;

    if (e.code === 'KeyS' || e.code === 'KeyQ') {
        isStopped = true;
        socket.emit('move', { x: 0, y: 0 });
    }
    if (e.code === 'Space' && document.getElementById('agarOverlay').classList.contains('active')) {
        e.preventDefault();
        const dist = Math.hypot(mouseX, mouseY);
        if (dist > 0) socket.emit('split', { x: mouseX / dist, y: mouseY / dist });
    }
}

window.splitAgarMobile = function() {
    const dist = Math.hypot(mouseX, mouseY);
    if (dist > 0 && socket) socket.emit('split', { x: mouseX / dist, y: mouseY / dist });
};

function drawAgar() {
    const cvs = document.getElementById('agarCanvas');
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    const myCells = Object.values(agarState.players).filter(p => p.owner === myAgarId);
    if (myCells.length === 0) return;
    const me = myCells.reduce((max, cell) => cell.r > max.r ? cell : max, myCells[0]);

    ctx.save();
    ctx.translate(cvs.width/2 - me.x, cvs.height/2 - me.y);

    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.strokeRect(0, 0, 2000, 2000);

    (agarState.foods || []).forEach(f => {
        ctx.beginPath(); ctx.arc(f.x, f.y, 5, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.fill();
    });
    
    (agarState.viruses || []).forEach(v => {
        ctx.beginPath();
        for(let i=0; i<15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const r = i % 2 === 0 ? v.r : v.r - 4;
            ctx.lineTo(v.x + Math.cos(angle)*r, v.y + Math.sin(angle)*r);
        }
        ctx.closePath();
        ctx.fillStyle = '#34c759'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#248a3d'; ctx.stroke();
    });

    Object.values(agarState.players).sort((a,b) => a.r - b.r).forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
        
        if (p.skin) {
            ctx.font = `${p.r * 1.2}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(p.skin, p.x, p.y);
        }

        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Tajawal'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4; ctx.fillText(p.name, p.x, p.y); ctx.shadowBlur = 0;
        ctx.fillText(p.name, p.x, p.y + (p.skin ? p.r / 2 + 10 : 0));
        ctx.shadowBlur = 0;
    });
    ctx.restore();
    
    if (agarState.isStarted) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.roundRect(cvs.width - 170, 10, 160, 130, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Tajawal'; ctx.textAlign = 'right';
        ctx.fillText('🏆 المتصدرين', cvs.width - 20, 35);
        ctx.font = '14px Tajawal';
        const sortedPlayers = Object.values(agarState.players).sort((a,b) => b.r - a.r).slice(0, 5);
        sortedPlayers.forEach((p, i) => {
            ctx.fillStyle = p.id === myAgarId ? '#ffcc00' : '#fff';
            ctx.fillText(`${i+1}. ${p.name} (${Math.round(p.r)})`, cvs.width - 20, 60 + (i * 18));
        });
    }

    if (!agarState.isStarted) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,cvs.width,cvs.height);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Tajawal'; ctx.textAlign = 'center';
        ctx.fillText('بانتظار لاعبين آخرين...', cvs.width/2, cvs.height/2 - 20);
        ctx.font = '20px Tajawal';
        ctx.fillText(`العدد الحالي: ${agarState.realPlayersCount} / 4 للاستمرار`, cvs.width/2, cvs.height/2 + 20);
    }
}

function closeAgar() { 
    if(socket) socket.disconnect(); 
    if(agarLoop) clearInterval(agarLoop); 
    window.removeEventListener('keydown', handleAgarKey);
}