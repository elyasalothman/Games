// ─────────────────────────────────────────────
// 🌐 MULTIPLAYER (AGAR.IO CLONE)
// ─────────────────────────────────────────────
let socket;
let agarState = { players: {}, foods: [], viruses: [], isStarted: false, realPlayersCount: 0 };
let myAgarId = null;
let agarLoop;
let mouseX = 0, mouseY = 0;
let isStopped = false; // متغير لحالة الوقوف
let camX = 0, camY = 0, currentScale = 1; // متغيرات الكاميرا السلسة
let agarCvs = null, agarCtx = null; // لتخزين الكانفاس لتسريع الأداء
let hasAgarEvents = false; // لمنع تكرار مستمعات الأحداث
let agarRenderFrame = null; // للتحكم في الإطارات ومنع التكدس
let agarLowGraphics = false; // متغير حالة الرسومات المنخفضة

function initAgar() {
    ['agarStartScreen', 'agarCanvas', 'agarStatus', 'mobileSplitBtn', 'mobileShootBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'agarStartScreen') el.classList.remove('d-none');
            else el.classList.add('d-none');
        }
    });
    if(socket) { socket.disconnect(); socket = null; }
}

function joinAgarGame(mode) {
    if (typeof io === 'undefined') {
        alert('❌ عذراً! لا يمكن الاتصال بالخادم حالياً. يرجى التأكد من اتصالك بالإنترنت وتحديث الصفحة.');
        return;
    }

    const nameEl = document.getElementById('agarName');
    const colorEl = document.getElementById('agarColor');
    const skinEl = document.getElementById('agarSkin');
    const lowGraphicsEl = document.getElementById('agarLowGraphics');
    agarLowGraphics = lowGraphicsEl ? lowGraphicsEl.checked : false;
    const name = (nameEl && nameEl.value) ? nameEl.value : 'لاعب';
    const color = (colorEl && colorEl.value) ? colorEl.value : '#007aff';
    const skin = (skinEl && skinEl.value) ? skinEl.value : '';
    let room = 'public';

    if (mode === 'private') {
        room = prompt('أدخل اسم أو رقم الغرفة لإنشائها أو الانضمام إليها:');
        if (!room) return;
    } else if (mode === 'computer') {
        room = 'bot_room_' + Math.random().toString(36).substr(2, 6);
    }

    const startScreen = document.getElementById('agarStartScreen');
    if (startScreen) startScreen.classList.add('d-none');
    
    const cvs = agarCvs || document.getElementById('agarCanvas');
    agarCvs = cvs;
    if (!cvs) return;
    
    const ctx = agarCtx || cvs.getContext('2d');
    agarCtx = ctx;
    cvs.classList.remove('d-none');
    
    const statusEl = document.getElementById('agarStatus');
    if (statusEl) statusEl.classList.remove('d-none');
    
    if ('ontouchstart' in window) {
        const splitBtn = document.getElementById('mobileSplitBtn');
        if (splitBtn) splitBtn.classList.remove('d-none');
        const shootBtn = document.getElementById('mobileShootBtn');
        if (shootBtn) shootBtn.classList.remove('d-none');
        const joystick = document.getElementById('joystickContainer');
        if (joystick) joystick.classList.remove('d-none');
    }
    
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#007aff';
    ctx.font = 'bold 24px Tajawal';
    ctx.textAlign = 'center';
    ctx.fillText('جاري الاتصال بساحة اللعب...', cvs.width / 2, cvs.height / 2);

    camX = 1750; camY = 1750; // تعيين نقطة بداية مبدئية للكاميرا
    currentScale = 1;

    socket = io();
    socket.on('connect_error', () => {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = '#ff3b30';
        ctx.fillText('❌ فشل الاتصال بالخادم! يرجى تحديث الصفحة.', cvs.width / 2, cvs.height / 2);
    });

    socket.emit('joinGame', { name, room, mode, color, skin });
    
    socket.on('init', (data) => {
        myAgarId = data.id;
        agarState.size = data.size || 3500;
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
        if (agarRenderFrame) cancelAnimationFrame(agarRenderFrame);
        agarRenderFrame = requestAnimationFrame(drawAgar);
    });
    socket.on('died', () => { showToast('❌ لقد تم ابتلاعك!'); playSound('gameover'); initAgar(); });

    if (!hasAgarEvents) {
        cvs.addEventListener('mousemove', (e) => {
            isStopped = false;
            const rect = cvs.getBoundingClientRect();
            mouseX = e.clientX - rect.left - (rect.width / 2);
            mouseY = e.clientY - rect.top - (rect.height / 2);
        });
        
        const touchHandler = (e) => {
            if (e.cancelable) e.preventDefault();
            isStopped = false;
            const rect = cvs.getBoundingClientRect();
            const touch = e.touches[0];
            mouseX = touch.clientX - rect.left - (rect.width / 2);
            mouseY = touch.clientY - rect.top - (rect.height / 2);
        };
        cvs.addEventListener('touchstart', touchHandler, {passive: false});
        cvs.addEventListener('touchmove', touchHandler, {passive: false});

        // ربط عصا التحكم (Joystick)
        const joystickContainer = document.getElementById('joystickContainer');
        const joystickKnob = document.getElementById('joystickKnob');
        let joystickActive = false;
        let joystickCenter = { x: 0, y: 0 };
        const maxRadius = 40; // أقصى مسافة يمكن للزر التحرك فيها داخل الدائرة

        if (joystickContainer && joystickKnob) {
            const updateJoystick = (touch) => {
                let dx = touch.clientX - joystickCenter.x;
                let dy = touch.clientY - joystickCenter.y;
                const distance = Math.hypot(dx, dy);
                
                // تحديد نطاق حركة الزر داخل الدائرة
                if (distance > maxRadius) {
                    dx = (dx / distance) * maxRadius;
                    dy = (dy / distance) * maxRadius;
                }
                
                // تحريك الزر بصرياً
                joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                
                // تكبير القيم لتتوافق مع حساسية وسرعة اللعبة في الكود الأساسي
                mouseX = dx * 10;
                mouseY = dy * 10;
            };

            joystickContainer.addEventListener('touchstart', (e) => {
                if (e.cancelable) e.preventDefault();
                joystickActive = true; isStopped = false;
                const rect = joystickContainer.getBoundingClientRect();
                joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                updateJoystick(e.touches[0]);
            }, {passive: false});

            joystickContainer.addEventListener('touchmove', (e) => {
                if (e.cancelable) e.preventDefault();
                if (joystickActive) updateJoystick(e.touches[0]);
            }, {passive: false});

            const resetJoystick = () => {
                joystickActive = false;
                joystickKnob.style.transform = `translate(-50%, -50%)`;
                mouseX = 0; mouseY = 0; isStopped = true;
                if (socket) socket.emit('move', { x: 0, y: 0 }); // إيقاف الخلية
            };

            joystickContainer.addEventListener('touchend', resetJoystick);
            joystickContainer.addEventListener('touchcancel', resetJoystick);
        }

        hasAgarEvents = true;
    }

    if(agarLoop) clearInterval(agarLoop);
    agarLoop = setInterval(() => {
        if(!myAgarId) return;
        const myCells = Object.values(agarState.players || {}).filter(p => p.owner === myAgarId);
        if (myCells.length === 0 || !agarState.isStarted) return;
        
        // 5. إصلاح الكاميرا: التمركز على المتوسط الحسابي لجميع خلاياك بدلاً من خلية واحدة
        let totalX = 0, totalY = 0, maxR = 0;
        myCells.forEach(c => { totalX += c.x; totalY += c.y; if(c.r > maxR) maxR = c.r; });
        let me = { x: totalX / myCells.length, y: totalY / myCells.length, r: maxR };
        
        const dist = Math.hypot(mouseX, mouseY);
        
        // السرعة درجات: تدرج السرعة بناءً على بعد الماوس لتكون الحركة سلسة وتدريجية
        if (dist > 5 && !isStopped) {
            // تم تكبير المساحة المطلوبة للوصول للسرعة القصوى لإعطاء تحكم أوسع
            const speedFactor = Math.min(dist / Math.max(150, me.r * 2.5), 1.0);
            socket.emit('move', { x: (mouseX / dist) * speedFactor, y: (mouseY / dist) * speedFactor });
        } else if (!isStopped) {
            socket.emit('move', { x: 0, y: 0 });
        }
    }, 1000 / 30);

    window.addEventListener('keydown', handleAgarKey);
}

function handleAgarKey(e) {
    if (e.code === 'KeyS' || e.code === 'KeyQ') {
        isStopped = true;
        if(socket) socket.emit('move', { x: 0, y: 0 });
    }
    const overlay = document.getElementById('agarOverlay');
    if (e.code === 'Space' && overlay && overlay.classList.contains('active')) {
        e.preventDefault();
        const dist = Math.hypot(mouseX, mouseY);
        if (dist > 0 && socket) socket.emit('split', { x: mouseX / dist, y: mouseY / dist });
    }
    if (e.code === 'KeyW' && overlay && overlay.classList.contains('active')) {
        e.preventDefault();
        const dist = Math.hypot(mouseX, mouseY);
        if (dist > 0 && socket) socket.emit('shoot', { x: mouseX / dist, y: mouseY / dist });
    }
}

window.splitAgarMobile = function() {
    const dist = Math.hypot(mouseX, mouseY);
    if (dist > 0 && socket) socket.emit('split', { x: mouseX / dist, y: mouseY / dist });
};

window.shootAgarMobile = function() {
    const dist = Math.hypot(mouseX, mouseY);
    if (dist > 0 && socket) socket.emit('shoot', { x: mouseX / dist, y: mouseY / dist });
};

function drawAgar() {
    const cvs = agarCvs || document.getElementById('agarCanvas');
    if (!cvs) return;
    
    // تحديث دقة اللوحة الداخلية لتتناسب مع حجمها في الشاشة لتجنب تشوه الرسم
    if (cvs.width !== cvs.clientWidth || cvs.height !== cvs.clientHeight) {
        cvs.width = cvs.clientWidth || 800;
        cvs.height = cvs.clientHeight || 600;
    }

    const ctx = agarCtx || cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    // تحسين الأداء: استخراج القائمة وفرزها مرة واحدة فقط بدلاً من 3 مرات
    const playerList = Object.values(agarState.players || {});
    const sortedPlayers = playerList.sort((a,b) => a.r - b.r);
    const myCells = playerList.filter(p => p.owner === myAgarId);
    
    // تحديد الملك (أكبر لاعب حقيقي أو بوت)
    const kingId = sortedPlayers.length > 0 ? sortedPlayers[sortedPlayers.length - 1].id : null;

    let me = { x: 1000, y: 1000 }; 
    if (myCells.length > 0) {
        // 5. توحيد حركة الكاميرا للتمركز على المجموعة بأكملها
        let totalX = 0, totalY = 0, maxR = 0;
        myCells.forEach(c => { totalX += c.x; totalY += c.y; if(c.r > maxR) maxR = c.r; });
        me = { x: totalX / myCells.length, y: totalY / myCells.length, r: maxR };
    }

    ctx.save();
    // 1. نظام الكاميرا الذكي (Zoom Out): يبتعد المشهد كلما كبرت الخلية لرؤية مساحة أوسع
    // تحسين 3: كاميرا سينمائية سلسة (Lerp) تتبع اللاعب بنعومة ولا تتحرك فجأة
    const targetScale = Math.max(0.25, 40 / Math.max(40, me.r));
    currentScale += (targetScale - currentScale) * 0.1; // تدرج سلس في التقريب
    camX += (me.x - camX) * 0.1; // تدرج سلس في حركة الكاميرا (X)
    camY += (me.y - camY) * 0.1; // تدرج سلس في حركة الكاميرا (Y)
    
    ctx.translate(cvs.width/2, cvs.height/2);
    ctx.scale(currentScale, currentScale);
    ctx.translate(-camX, -camY);

    const timeNow = Date.now();
    const mapSize = agarState.size || 3500;

    // لمسة 12: شبكة نيون خلفية ذكية
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.08)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= mapSize; i += 80) { 
        ctx.moveTo(i, 0); ctx.lineTo(i, mapSize); 
        ctx.moveTo(0, i); ctx.lineTo(mapSize, i); 
    }
    ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0, 210, 255, 0.2)'; 
    ctx.strokeRect(0, 0, mapSize, mapSize);

    // لمسة 9: غبار كوني / جزيئات عائمة (Parallax Plankton)
    if (!agarLowGraphics) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for(let i=0; i<100; i++) {
            // توليد إحداثيات شبه ثابتة تعتمد على الكاميرا لخلق عمق
            let px = (camX * 0.5 + i * 123) % mapSize;
            let py = (camY * 0.5 + i * 321) % mapSize;
            if(px < 0) px += mapSize; if(py < 0) py += mapSize;
            ctx.beginPath(); ctx.arc(px, py, (i%3)+1, 0, Math.PI*2); ctx.fill();
        }
    }

    const timePulse = timeNow * 0.003; // متغير الزمن لسرعة النبض
    (agarState.foods || []).forEach(f => {
        // لمسة 5: طعام كريستالي دوار
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(timePulse + f.x); // دوران عشوائي
        const pulseRadius = 6 + Math.sin(timePulse + f.x) * 1.5; 
        
        ctx.beginPath();
        ctx.rect(-pulseRadius/2, -pulseRadius/2, pulseRadius, pulseRadius); // شكل معيني
        
        // لمعان داخلي
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseRadius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, f.color);
        ctx.fillStyle = grad;
        
        if (!agarLowGraphics) {
            ctx.shadowColor = f.color; ctx.shadowBlur = pulseRadius;
        }
        ctx.fill();
        ctx.restore();
    });
    
    // رسم اللاعبين أولاً ليختفوا تحت الفيروسات إذا كانوا أصغر منها
    sortedPlayers.forEach(p => {
        // لمسة 10: الكتل المطلقة (W) تبدو كطاقة مشعة متسارعة
        if (p.isEjected) {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = p.color; ctx.shadowBlur = 15;
            ctx.fill(); ctx.shadowBlur = 0;
            return; // تخطي باقي رسم الخلية
        }

        // لمسة 4: درع طاقة نيون للاعب المحمي
        if (p.isProtected && !agarLowGraphics) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(timeNow * 0.002);
            ctx.setLineDash([15, 10]);
            ctx.beginPath(); ctx.arc(0, 0, p.r + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 3;
            ctx.shadowColor = '#00d2ff'; ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.restore();
        }

        // لمسة 1: تأثير التنفس الخلوي (Cell Wobble)
        ctx.beginPath();
        if (!agarLowGraphics && p.r > 20) {
            const points = 40;
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * Math.PI * 2;
                // تموج خفيف يعتمد على الوقت ومكان الخلية
                const wobble = Math.sin(angle * 6 + timeNow * 0.002 + p.id.length) * (p.r * 0.03);
                const x = p.x + Math.cos(angle) * (p.r + wobble);
                const y = p.y + Math.sin(angle) * (p.r + wobble);
                if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
        } else {
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
        ctx.closePath();
        
        // لمسة 2: تدرج لوني زجاجي ثلاثي الأبعاد
        if (!agarLowGraphics) {
            const grd = ctx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.1, p.x, p.y, p.r);
            grd.addColorStop(0, '#ffffff'); // لمعة الإضاءة
            grd.addColorStop(0.2, p.color);
            // تغميق اللون عند الأطراف
            grd.addColorStop(1, adjustColorBrightness(p.color, -40)); 
            ctx.fillStyle = grd;
        } else {
            ctx.fillStyle = p.color;
        }
        
        if (!agarLowGraphics) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // إعادة ضبط التوهج حتى لا يؤثر على الحدود
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
        
        // 8. إخفاء الأسماء للخلايا الصغيرة جداً والكتلة المطلقة لمنع التداخل والتشوه البصري
        if (p.r > 15 && !p.isEjected) {
            if (p.skin) {
                ctx.font = `${p.r * 1.2}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(p.skin, p.x, p.y);
            }

            // لمسة 3: تاج الملك للمتصدر
            if (p.id === kingId) {
                ctx.font = `${Math.max(20, p.r * 0.5)}px Arial`;
                ctx.fillText('👑', p.x, p.y - p.r + 5); // التاج يطفو فوق الخلية
            }

            // لمسة 11: لوحات أسماء عصرية (Name Pills)
            const nameY = p.skin ? p.y - p.r/2 - 15 : p.y - 8;
            ctx.font = 'bold 14px Tajawal';
            const textWidth = ctx.measureText(p.name).width;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            if(typeof ctx.roundRect === 'function') {
                ctx.beginPath(); ctx.roundRect(p.x - (textWidth/2) - 8, nameY - 10, textWidth + 16, 20, 10); ctx.fill();
            }

            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Tajawal'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(p.name, p.x, nameY);
            
            // لمسة 15: مؤشر حجم ينبض قليلاً
            ctx.font = '12px Tajawal'; ctx.fillStyle = '#ffcc00';
            const scalePulse = 1 + Math.sin(timeNow * 0.005) * 0.05;
            ctx.save();
            ctx.translate(p.x, nameY + 18);
            ctx.scale(scalePulse, scalePulse);
            ctx.fillText(Math.round(p.r), 0, 0);
            ctx.restore();
        }
    });

    // رسم الفيروسات (الألغام) فوق اللاعبين
    const timeRotation = timeNow * 0.0005; // دوران بطيء ومستمر للتروس
    (agarState.viruses || []).forEach((v, index) => {
        // لمسة 7: منطقة الخطر للفيروس (Danger Zone)
        if (!agarLowGraphics) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r + 15, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 51, 102, 0.2)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // لمسة 8: تروس فيروسية حادة ومسننة
        ctx.beginPath();
        const numPoints = 36; // زيادة لتكون أكثر حدة
        const direction = index % 2 === 0 ? 1 : -1; // جعل بعضها يدور يميناً والآخر يساراً
        const rotationOffset = (timeRotation * direction) + v.x; // إضافة موقعها لتبدأ بزوايا عشوائية مختلفة
        
        for(let i=0; i<numPoints; i++) {
            const angle = rotationOffset + (i / numPoints) * Math.PI * 2;
            const r = i % 2 === 0 ? v.r + 6 : v.r - 6; // أسنان حادة
            ctx.lineTo(v.x + Math.cos(angle)*r, v.y + Math.sin(angle)*r);
        }
        ctx.closePath();
        
        if (!agarLowGraphics) {
            ctx.shadowColor = '#34c759'; ctx.shadowBlur = 20; // توهج نيون للفيروس
        }
        ctx.fillStyle = '#0a2e13'; ctx.fill(); // لون داخلي داكن للرعب
        ctx.lineWidth = 3; ctx.strokeStyle = '#34c759'; ctx.stroke(); // حدود مضيئة
        ctx.shadowBlur = 0;

        // لمسة 6: نواة الفيروس السامة (Toxic Core)
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 199, 89, ${0.5 + Math.sin(timeNow * 0.005 + v.x) * 0.5})`; // وميض النواة
        ctx.fill();
    });

    ctx.restore();
    
    // لمسة 13: تظليل محيطي (Vignette) لتركيز البصر
    if (!agarLowGraphics) {
        const vig = ctx.createRadialGradient(cvs.width/2, cvs.height/2, cvs.height*0.4, cvs.width/2, cvs.height/2, cvs.width);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, cvs.width, cvs.height);
    }

    if (agarState.isStarted) {
        // لمسة 14: لوحة صدارة زجاجية أنيقة
        const lbGrad = ctx.createLinearGradient(0, 10, 0, 140);
        lbGrad.addColorStop(0, 'rgba(28, 28, 46, 0.85)');
        lbGrad.addColorStop(1, 'rgba(18, 18, 32, 0.85)');
        ctx.fillStyle = lbGrad;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath(); ctx.roundRect(cvs.width - 180, 10, 170, 140, 12); ctx.fill();
        } else {
            ctx.fillRect(cvs.width - 180, 10, 170, 140);
        }
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0, 210, 255, 0.3)'; ctx.stroke(); // إطار نيون

        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Tajawal'; ctx.textAlign = 'right';
        ctx.fillText('🏆 المتصدرين', cvs.width - 20, 35);
        ctx.font = '14px Tajawal';
        const topPlayers = sortedPlayers.slice().reverse().slice(0, 5);
        topPlayers.forEach((p, i) => {
            ctx.fillStyle = p.id === myAgarId ? '#00d2ff' : '#fff';
            const prefix = (i === 0) ? '👑 ' : `${i+1}. `;
            ctx.fillText(`${prefix}${p.name} (${Math.round(p.r)})`, cvs.width - 20, 60 + (i * 20));
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

// دالة مساعدة لتغميق/تفتيح الألوان في التدرجات (Hex to Darker Hex)
function adjustColorBrightness(col, amt) {
    if (!col) return '#000000';
    if (col.startsWith('hsl')) {
        return col.replace(/(\d+)%\)/, (match, p1) => Math.max(0, parseInt(p1) + (amt > 0 ? 15 : -15)) + '%)');
    }
    let usePound = false;
    let hex = col;
    if (hex[0] === "#") { hex = hex.slice(1); usePound = true; }
    let num = parseInt(hex, 16);
    if (isNaN(num)) return col;
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if  (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if  (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return "#" + String("000000" + (g | (b << 8) | (r << 16)).toString(16)).slice(-6);
}