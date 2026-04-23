const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // حصر الاتصال بدومينك في بيئة الإنتاج لحماية الخادم
        origin: process.env.NODE_ENV === 'production' ? ["https://games.alhajda.com/"] : "*",
    }
});
const PORT = process.env.PORT || 3000;

// 4. تفعيل دعم الوكلاء لمعرفة IP المستخدم الحقيقي وتفعيل حظر الـ RateLimit بدقة
app.set('trust proxy', 1);

// استدعاء ملف خادم الأونو
require('./uno-server.js')(io);

// تفعيل ضغط Gzip لتقليل حجم ملفات CSS و JS المرسلة للمتصفح
app.use(compression());

// Middleware لقراءة البيانات المرسلة بصيغة JSON
app.use(express.json());

// إعداد قاعدة بيانات SQLite
const db = new sqlite3.Database('./leaderboard.db', (err) => {
    if (err) console.error('خطأ في الاتصال بقاعدة البيانات:', err);
    else console.log('✅ تم الاتصال بقاعدة بيانات SQLite بنجاح');
});

// 6. الإغلاق الآمن لقاعدة البيانات (Graceful Shutdown) لمنع تلفها
const shutdown = () => {
    db.close(() => {
        console.log('تم إغلاق قاعدة البيانات بأمان.');
        process.exit(0);
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// إنشاء جدول لوحة الصدارة إذا لم يكن موجوداً
db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// إعداد نظام الحماية (Rate Limiting)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // الحد الأقصى لكل عنوان IP هو 100 طلب خلال 15 دقيقة
    message: { status: 'error', message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً.' }
});
app.use('/api', limiter); // تطبيق الحماية على واجهات الـ API فقط لتجنب حظر الاتصال باللعبة

// تقديم الملفات الثابتة الموجودة في نفس المجلد (مثل index.html والآيقونات)
const staticOptions = {
    maxAge: '30d', // زيادة مدة التخزين المؤقت إلى 30 يوماً لتسريع التحميل للزوار العائدين
    etag: true,
};
app.use(express.static(path.join(__dirname), staticOptions));

// توجيه المسار الرئيسي لعرض واجهة الألعاب
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// نقطة نهاية (API) تجريبية للتأكد من أن الخادم يعمل بشكل ممتاز
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'success', 
        message: 'الخادم يعمل بكفاءة وجاهز للتوسع!' 
    });
});

// --- نقاط نهاية (APIs) لوحة الصدارة ---

// حفظ نتيجة جديدة
app.post('/api/leaderboard', (req, res) => {
    let { game_id, player_name, score } = req.body;
    const parsedScore = Number(score);
    
    // 8. منع الأرقام السالبة والوهمية في النتيجة
    if (!game_id || !player_name || score === undefined || isNaN(parsedScore) || parsedScore < 0 || parsedScore > 9999999) return res.status(400).json({ error: 'بيانات غير مكتملة أو غير صالحة' });
    
    // 2. الحماية من ثغرات XSS
    player_name = String(player_name).replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 30);
    
    db.run(`INSERT INTO leaderboard (game_id, player_name, score) VALUES (?, ?, ?)`, [game_id, player_name, parsedScore], function(err) {
        if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

// جلب أفضل 10 نتائج للعبة معينة
app.get('/api/leaderboard/:game_id', (req, res) => {
    const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC'; // بعض الألعاب الأقل فيها أفضل كالزمن أو المحاولات
    db.all(`SELECT player_name, score FROM leaderboard WHERE game_id = ? ORDER BY score ${sort} LIMIT 10`, [req.params.game_id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
        res.status(200).json(rows);
    });
});

// --- منطق اللعبة الجماعية (Agar.io Clone) ---
const GAME_SIZE = 2000;
const MAX_FOOD = 200;
const MAX_VIRUSES = 15;

// كائن يحتوي على جميع الغرف النشطة
const rooms = {};

// دالة لتهيئة غرفة جديدة وتوليد الطعام فيها
function initRoom(roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = { players: {}, foods: [], viruses: [], isStarted: false, realPlayersCount: 0 };
        for (let i = 0; i < MAX_FOOD; i++) spawnFood(roomId);
        for (let i = 0; i < MAX_VIRUSES; i++) spawnVirus(roomId);
    }
}

function spawnVirus(roomId) {
    if (!rooms[roomId]) return;
    rooms[roomId].viruses.push({
        id: 'virus_' + Math.random().toString(36).substr(2, 9),
        x: Math.random() * GAME_SIZE,
        y: Math.random() * GAME_SIZE,
        r: 35 // حجم اللغم القياسي
    });
}

function spawnFood(roomId) {
    if (!rooms[roomId]) return;
    rooms[roomId].foods.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * GAME_SIZE,
        y: Math.random() * GAME_SIZE,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`
    });
}

// --- منطق لعبة البلوت (Baloot) ---
const balootRooms = {};
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const PROJECT_VALUES = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']; // ترتيب المشاريع الثابت

// --- قيم وقوى أوراق البلوت ---
const SAN_POWER = {'A':8, '10':7, 'K':6, 'Q':5, 'J':4, '9':3, '8':2, '7':1};
const SAN_POINTS = {'A':11, '10':10, 'K':4, 'Q':3, 'J':2, '9':0, '8':0, '7':0};
const HAKAM_POWER = {'J':8, '9':7, 'A':6, '10':5, 'K':4, 'Q':3, '8':2, '7':1};
const HAKAM_POINTS = {'J':20, '9':14, 'A':11, '10':10, 'K':4, 'Q':3, '8':0, '7':0};

function createBalootDeck() {
    let deck = [];
    for (let s of SUITS) {
        for (let v of VALUES) {
            deck.push({ suit: s, value: v, color: (s === '♥' || s === '♦') ? 'red' : 'black' });
        }
    }
    // خلط الورق بشكل عشوائي احترافي (Fisher-Yates Shuffle)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// خوارزمية اكتشاف المشاريع (الأبناط) في أوراق اللاعب
function detectProjects(cards, playingMode) {
    let projects = [];
    
    // 1. البحث عن 4 أوراق متشابهة (أربعمئة أو مئة)
    let counts = {};
    cards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
    for (let v in counts) {
        if (counts[v] === 4) {
            if (playingMode === 'san' && v === 'A') projects.push({ name: 'أربعمئة (4 أكك)', points: 400 });
            else if (playingMode === 'hakam' && v === 'J') projects.push({ name: 'أربعمئة (4 أولاد)', points: 400 });
            else if (['A', 'K', 'Q', 'J', '10'].includes(v)) projects.push({ name: `مية (4 ${v})`, points: 100 });
        }
    }
    
    // 2. البحث عن التتابع (سرا، خمسين، مئة سرا)
    let suits = {'♠':[], '♥':[], '♣':[], '♦':[]};
    cards.forEach(c => suits[c.suit].push(PROJECT_VALUES.indexOf(c.value)));
    for (let s in suits) {
        if (suits[s].length < 3) continue;
        let seq = suits[s].sort((a, b) => a - b);
        let maxConsec = 1, currentConsec = 1;
        for (let i = 1; i < seq.length; i++) {
            if (seq[i] === seq[i-1] + 1) { currentConsec++; maxConsec = Math.max(maxConsec, currentConsec); }
            else { currentConsec = 1; }
        }
        if (maxConsec >= 5) projects.push({ name: 'مية سرا', points: 100 });
        else if (maxConsec === 4) projects.push({ name: 'خمسين', points: 50 });
        else if (maxConsec === 3) projects.push({ name: 'سرا', points: 20 });
    }
    
    // إرجاع أعلى مشروع يمتلكه اللاعب
    if (projects.length > 0) return projects.sort((a, b) => b.points - a.points)[0];
    return null;
}

// --- خوارزمية قوانين اللعب (متابعة اللون، الإجبار على الحكم) ---
function getLegalMoves(cards, trick, mode, trumpSuit) {
    if (trick.length === 0) return cards; // أول من يلعب يرمي أي ورقة
    const ledSuit = trick[0].card.suit;
    const hasLedSuit = cards.some(c => c.suit === ledSuit);

    if (hasLedSuit) {
        // يجب متابعة اللون
        let legal = cards.filter(c => c.suit === ledSuit);
        // إذا كان اللون المطلوب هو الحكم، يجب "الإعلاء" (Overtrump) إن أمكن
        if (mode === 'hakam' && ledSuit === trumpSuit) {
            let maxTrump = -1;
            trick.forEach(p => { if (p.card.suit === trumpSuit && HAKAM_POWER[p.card.value] > maxTrump) maxTrump = HAKAM_POWER[p.card.value]; });
            const higher = legal.filter(c => HAKAM_POWER[c.value] > maxTrump);
            if (higher.length > 0) return higher; // الإجبار على الإعلاء
        }
        return legal;
    } else {
        // لا يملك اللون المطلوب
        if (mode === 'hakam') {
            const hasTrump = cards.some(c => c.suit === trumpSuit);
            if (hasTrump) {
                // يجب أن يأكل بالحكم، ويعلو على من أكل قبله إن أمكن
                let maxTrump = -1;
                trick.forEach(p => { if (p.card.suit === trumpSuit && HAKAM_POWER[p.card.value] > maxTrump) maxTrump = HAKAM_POWER[p.card.value]; });
                let trumps = cards.filter(c => c.suit === trumpSuit);
                const higher = trumps.filter(c => HAKAM_POWER[c.value] > maxTrump);
                if (maxTrump > -1 && higher.length > 0) return higher; // الإجبار على الإعلاء
                return trumps;
            }
        }
        return cards; // لا يملك اللون ولا يملك حكم (أو اللعب صن) -> يرمي أي ورقة
    }
}

// --- دوال التحكم في البلوت (للاعبين والبوتات) ---
function handleBalootAction(roomId, playerId, action) {
    const room = balootRooms[roomId];
    if (!room || room.state !== 'bidding') return;
    if (room.turnOrder[room.currentTurnIndex] !== playerId) return;

    if (action === 'pass') {
        room.currentTurnIndex++;
        if (room.currentTurnIndex >= room.turnOrder.length) {
            room.state = 'waiting';
            room.centerCard = null;
            Object.values(room.players).forEach(p => p.cards = []);
        }
    } else if (action === 'san' || action === 'hakam') {
        room.playingMode = action; // حفظ نوع اللعب
        room.trumpSuit = action === 'hakam' ? room.centerCard.suit : null; // حفظ لون الحكم

        room.state = 'playing';
        room.currentTrick = [];
        Object.values(room.players).forEach(p => {
            if (p.id === playerId && room.centerCard) {
                p.cards.push(room.centerCard, ...room.deck.splice(0, 2));
            } else {
                p.cards.push(...room.deck.splice(0, 3));
            }
        });
        room.centerCard = null;
        // اكتشاف المشاريع لكل اللاعبين بعد استلام جميع الأوراق
        Object.values(room.players).forEach(p => {
            p.project = detectProjects(p.cards, action);
        });
    }
    io.to(roomId).emit('balootGameState', room);
}

function playBalootCardLogic(roomId, playerId, cardIndex) {
    const room = balootRooms[roomId];
    if (!room || room.state !== 'playing') return;
    if (room.turnOrder[room.currentTurnIndex] !== playerId) return;
    if (room.currentTrick.length >= 4) return;

    const player = room.players[playerId];
    if (!player || !player.cards[cardIndex]) return;

    // التحقق مما إذا كان اللاعب يغش (يكذب) لتفعيل نظام "القيد"
    const legalMoves = getLegalMoves(player.cards, room.currentTrick, room.playingMode, room.trumpSuit);
    const isLegal = legalMoves.some(c => c.suit === player.cards[cardIndex].suit && c.value === player.cards[cardIndex].value);
    room.lastPlay = { playerId: playerId, playerName: player.name, illegal: !isLegal };

    const playedCard = player.cards.splice(cardIndex, 1)[0];
    room.currentTrick.push({ playerId: playerId, card: playedCard });

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    io.to(roomId).emit('balootGameState', room);

    // إذا اكتملت الأكلة (4 أوراق)، احسب الفائز والنقاط
    if (room.currentTrick.length === 4) {
        // إنهاء الجولة الأولى (لا يمكن إعلان المشاريع بعد الأكلة الأولى)
        room.firstTrick = false;

        setTimeout(() => { 
            if (!balootRooms[roomId] || balootRooms[roomId].currentTrick.length !== 4) return;
            const r = balootRooms[roomId];
            
            const ledSuit = r.currentTrick[0].card.suit; // اللون الذي بدأ به اللعب
            let winnerIndex = 0;
            let maxPower = -1;
            let trickPoints = 0;

            // حساب قوة كل ورقة ونقاطها
            r.currentTrick.forEach((play, index) => {
                const c = play.card;
                let power = 0;
                let points = r.playingMode === 'san' || c.suit !== r.trumpSuit ? SAN_POINTS[c.value] : HAKAM_POINTS[c.value];
                
                trickPoints += points; // جمع نقاط الورقة

                if (r.playingMode === 'san') {
                    if (c.suit === ledSuit) power = SAN_POWER[c.value];
                } else if (r.playingMode === 'hakam') {
                    if (c.suit === r.trumpSuit) power = HAKAM_POWER[c.value] + 100; // الحكم يفوز دائماً على الألوان الأخرى
                    else if (c.suit === ledSuit) power = SAN_POWER[c.value];
                }

                if (power > maxPower) { maxPower = power; winnerIndex = index; }
            });

            const winnerId = r.currentTrick[winnerIndex].playerId;
            
            // إضافة النقاط للفريق الفائز بالأكلة
            if (r.team1.includes(winnerId)) r.scoreTeam1 += trickPoints;
            else r.scoreTeam2 += trickPoints;

            // الفائز هو من يبدأ الأكلة التالية
            r.currentTurnIndex = r.turnOrder.indexOf(winnerId);
            r.currentTrick = [];
            r.lastPlay = null; // تصفير القيد
            io.to(roomId).emit('balootGameState', r);
        }, 2000);
    }
}

const BOT_NAMES = [
    'أحمد', 'محمد', 'علي', 'عمر', 'خالد', 'يوسف', 'فهد', 'سالم', 'سعد', 'عبدالله',
    'فاطمة', 'مريم', 'نورة', 'سارة', 'عائشة', 'ريم', 'شهد', 'هند', 'نوف', 'أمل',
    'فيصل', 'سلمان', 'ماجد', 'طلال', 'نواف', 'بدر', 'سلطان', 'طارق', 'زياد', 'ياسر',
    'ليلى', 'عبير', 'حصة', 'نجلاء', 'ندى', 'داليا', 'رنا', 'منى', 'لمى', 'غادة'
];

function spawnBots(roomId, count) {
    const skins = ['👽', '🐯', '🤡', '👻', '🎃', '🤖', '💀', '😎', ''];
    for (let i = 0; i < count; i++) {
        const botId = 'bot_' + Math.random().toString(36).substr(2, 9);
        const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        rooms[roomId].players[botId] = {
            id: botId, owner: botId, isBot: true,
            x: Math.random() * GAME_SIZE, y: Math.random() * GAME_SIZE,
            r: 25 + Math.random() * 20, // أحجام مختلفة للبوتات
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            skin: skins[Math.floor(Math.random() * skins.length)],
            name: randomName,
            vx: 0, vy: 0,
            joinTime: Date.now() // لمعرفة متى دخل البوت
        };
    }
}

io.on('connection', (socket) => {
    socket.on('joinGame', ({ name, room, mode, color, skin } = {}) => {
        const roomId = room || 'public';
        socket.join(roomId);
        socket.roomId = roomId; // حفظ معرف الغرفة في المتصل
        initRoom(roomId);

        // 5. تقييد أطوال المدخلات لمنع استنزاف الذاكرة
        const safeName = String(name || 'لاعب').substring(0, 20);
        const safeColor = color ? String(color).substring(0, 20) : `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
        const safeSkin = String(skin || '').substring(0, 5);

        // إذا كان النمط ضد الكمبيوتر والغرفة جديدة، قم بتوليد 15 بوت
        if (mode === 'computer' && Object.keys(rooms[roomId].players).length === 0) {
            spawnBots(roomId, 15);
        }

        rooms[roomId].players[socket.id] = {
            id: socket.id,
            owner: socket.id,
            x: Math.random() * GAME_SIZE,
            y: Math.random() * GAME_SIZE,
            r: 20,
            color: safeColor,
            skin: safeSkin,
            name: safeName,
            vx: 0, vy: 0,
            splitTime: 0,
            spawnTime: Date.now() // بداية حماية الدخول
        };
        // إرسال الحالة الأولية الكاملة للاعب الجديد مرة واحدة فقط
        socket.emit('init', { 
            id: socket.id, 
            size: GAME_SIZE,
            initialFoods: rooms[roomId].foods,
            initialViruses: rooms[roomId].viruses
        });
    });

    socket.on('move', (dir) => {
        // 1. حماية السيرفر من الانهيار عند استلام إحداثيات خاطئة
        if (!socket.roomId || !rooms[socket.roomId] || !dir || typeof dir.x !== 'number' || typeof dir.y !== 'number') return;
        // إذا تم إرسال {x:0, y:0} فهذا يعني وقوف تام
        Object.values(rooms[socket.roomId].players).forEach(player => {
            if (player.owner === socket.id) {
                if (dir.x === 0 && dir.y === 0) {
                    // وقوف تام عن الحركة الإرادية (مع الاحتفاظ باندفاع الانقسام الطبيعي إن وُجد)
                } else {
                    // جعل السرعة أبطأ وتتناسب بشكل أفضل وأكثر سلاسة مع حجم الخلية
                    const speed = 200 / (player.r + 20);
                    player.x = Math.max(player.r, Math.min(GAME_SIZE - player.r, player.x + dir.x * speed));
                    player.y = Math.max(player.r, Math.min(GAME_SIZE - player.r, player.y + dir.y * speed));
                }
            }
        });
    });

    socket.on('split', (dir) => {
        if (!socket.roomId || !rooms[socket.roomId] || !dir || typeof dir.x !== 'number' || typeof dir.y !== 'number') return;
        const room = rooms[socket.roomId];
        const myCells = Object.values(room.players).filter(p => p.owner === socket.id);
        if (myCells.length >= 16) return; // 3. التقييد بالحد الأقصى 16 خلية لمنع التعليق
        
        myCells.forEach(p => {
            if (p.r > 30 && Object.values(room.players).filter(c => c.owner === socket.id).length < 16) {
                p.r = p.r / 1.414;
                p.splitTime = Date.now();
                const newId = socket.id + '_' + Math.random().toString(36).substr(2, 6);
                room.players[newId] = {
                    id: newId, owner: socket.id,
                    x: p.x, y: p.y, r: p.r,
                    color: p.color, name: p.name, skin: p.skin,
                    vx: dir.x * 25, vy: dir.y * 25,
                    splitTime: Date.now(),
                    spawnTime: p.spawnTime // وراثة الحماية إن وجدت
                };
            }
        });
    });

    socket.on('shoot', (dir) => {
        if (!socket.roomId || !rooms[socket.roomId] || !dir || typeof dir.x !== 'number' || typeof dir.y !== 'number') return;
        const room = rooms[socket.roomId];
        Object.values(room.players).forEach(p => {
            if (p.owner === socket.id && p.r > 35) {
                
                // حماية من السبام: منع إطلاق أكثر من كتلة كل 100 مللي ثانية
                const now = Date.now();
                if (p.lastShootTime && now - p.lastShootTime < 100) return;
                p.lastShootTime = now;

                p.r = Math.sqrt(p.r * p.r - 144); // خصم مساحة الكتلة المطلقة بشكل دقيق
                const newId = 'mass_' + Math.random().toString(36).substr(2, 9);
                room.players[newId] = {
                    id: newId, owner: 'none', isEjected: true, isBot: false,
                    x: p.x + dir.x * (p.r + 15), y: p.y + dir.y * (p.r + 15),
                    r: 12, color: p.color, name: '', skin: '',
                    vx: dir.x * 30, vy: dir.y * 30,
                    spawnTime: now // إضافة وقت الإنشاء لاحتساب متى تختفي
                };
            }
        });
    });

    // --- أحداث لعبة البلوت ---
    socket.on('joinBaloot', ({ name, room, mode }) => {
        const roomId = room || 'baloot_public';
        socket.join(roomId);
        socket.balootRoomId = roomId;
        
        if (!balootRooms[roomId]) {
            balootRooms[roomId] = { 
                players: {}, deck: [], centerCard: null, state: 'waiting', turnOrder: [], currentTurnIndex: 0, currentTrick: [], firstTrick: true,
                scoreTeam1: 0, scoreTeam2: 0, team1: [], team2: [], playingMode: null, trumpSuit: null, lastPlay: null
            };
        }
        
        // إضافة اللاعب إلى الطاولة
        balootRooms[roomId].players[socket.id] = { id: socket.id, name: name || 'لاعب', cards: [], isBot: false };
        
        // إضافة البوتات فوراً إذا كان النمط ضد الكمبيوتر
        if (mode === 'computer' && Object.keys(balootRooms[roomId].players).length === 1) {
            for (let i = 1; i <= 3; i++) {
                const botId = 'baloot_bot_' + i;
                balootRooms[roomId].players[botId] = { id: botId, name: '🤖 بوت ' + i, cards: [], isBot: true };
            }
        }
        
        io.to(roomId).emit('balootGameState', balootRooms[roomId]);
    });

    socket.on('dealBaloot', () => {
        const roomId = socket.balootRoomId;
        if (!roomId || !balootRooms[roomId]) return;
        
        const room = balootRooms[roomId];
        if (room.state !== 'waiting') return; // لا يتم التوزيع مرتين
        
        // إكمال الطاولة بالبوتات إذا لم يكتمل 4 لاعبين عند التوزيع
        const currentPlayersCount = Object.keys(room.players).length;
        if (currentPlayersCount < 4) {
            for (let i = currentPlayersCount; i < 4; i++) {
                const botId = 'baloot_bot_' + Math.random().toString(36).substr(2, 6);
                room.players[botId] = { id: botId, name: '🤖 لاعب آلي', cards: [], isBot: true };
            }
        }
        
        room.deck = createBalootDeck(); // إنشاء كوتشينة جديدة وخلطها
        
        // تحديد ترتيب الأدوار (من يمين الموزع في الواقع، ولكن برمجياً سنأخذهم بترتيب الانضمام حالياً)
        room.turnOrder = Object.keys(room.players);
        room.currentTurnIndex = 0;
        
        // تقسيم الفرق (أنت والخوي ضد الخصمين)
        room.team1 = [room.turnOrder[0], room.turnOrder[2]]; // اللاعب الأول والثالث
        room.team2 = [room.turnOrder[1], room.turnOrder[3]]; // اللاعب الثاني والرابع
        room.scoreTeam1 = 0; room.scoreTeam2 = 0;

        // توزيع 5 أوراق لكل لاعب
        Object.values(room.players).forEach(player => {
            player.cards = room.deck.splice(0, 5); // سحب 5 أوراق من أعلى المجموعة
        });
        
        // وضع ورقة المشترا في المنتصف
        room.centerCard = room.deck.splice(0, 1)[0];
        room.state = 'bidding'; // تحويل حالة اللعبة إلى المزاد
        io.to(roomId).emit('balootGameState', room);
    });

    socket.on('balootAction', (action) => {
        handleBalootAction(socket.balootRoomId, socket.id, action);
    });

    socket.on('playBalootCard', (cardIndex) => {
        playBalootCardLogic(socket.balootRoomId, socket.id, cardIndex);
    });

    socket.on('declareProject', () => {
        const roomId = socket.balootRoomId;
        if (!roomId || !balootRooms[roomId]) return;
        const room = balootRooms[roomId];
        if (room.state !== 'playing' || !room.firstTrick) return;
        if (room.turnOrder[room.currentTurnIndex] !== socket.id) return; // ليس دوره للعب
        
        const player = room.players[socket.id];
        if (player && player.project && !player.projectDeclared) {
            player.projectDeclared = true;
            if (room.team1.includes(socket.id)) room.scoreTeam1 += player.project.points;
            else room.scoreTeam2 += player.project.points;
            io.to(roomId).emit('chatMessage', { name: '📢 نظام البلوت', msg: `اللاعب ${player.name} أعلن عن مشروع: ${player.project.name} (+${player.project.points} بنط)` });
            io.to(roomId).emit('balootGameState', room);
        }
    });

    socket.on('balootQaid', () => {
        const roomId = socket.balootRoomId;
        if (!roomId || !balootRooms[roomId]) return;
        const room = balootRooms[roomId];
        
        if (room.state !== 'playing' || !room.lastPlay) return;
        if (room.lastPlay.playerId === socket.id) return; // لا يمكنك تقييد نفسك

        const callerTeam = room.team1.includes(socket.id) ? 1 : 2;
        
        if (room.lastPlay.illegal) {
            if (callerTeam === 1) room.scoreTeam1 += 152; else room.scoreTeam2 += 152;
            io.to(roomId).emit('chatMessage', { name: '📢 نظام البلوت', msg: `🚨 ${room.players[socket.id].name} قيّد ${room.lastPlay.playerName} بنجاح! (اللاعب كذب). الفريق الفائز كسب 152 نقطة!` });
        } else {
            if (callerTeam === 1) room.scoreTeam2 += 152; else room.scoreTeam1 += 152;
            io.to(roomId).emit('chatMessage', { name: '📢 نظام البلوت', msg: `🚨 ${room.players[socket.id].name} قيّد ${room.lastPlay.playerName} بالخطأ! (لعبه كان صحيحاً). الفريق الآخر كسب 152 نقطة!` });
        }

        room.state = 'waiting'; room.currentTrick = []; room.centerCard = null; room.lastPlay = null;
        Object.values(room.players).forEach(p => p.cards = []);
        io.to(roomId).emit('balootGameState', room);
    });

    socket.on('disconnect', () => { 
        // فصل لاعب البلوت
        if (socket.balootRoomId && balootRooms[socket.balootRoomId]) {
            delete balootRooms[socket.balootRoomId].players[socket.id];
            const hasReal = Object.values(balootRooms[socket.balootRoomId].players).some(p => !p.isBot);
            if (!hasReal) {
                delete balootRooms[socket.balootRoomId];
            } else {
                io.to(socket.balootRoomId).emit('balootGameState', balootRooms[socket.balootRoomId]);
            }
        }

        // فصل لاعب أجار
        if (!socket.roomId || !rooms[socket.roomId]) return;
        const roomPlayers = rooms[socket.roomId].players;
        Object.keys(roomPlayers).forEach(k => { 
            if(roomPlayers[k].owner === socket.id) delete roomPlayers[k]; 
        });
        
        // مسح الغرفة إذا أصبحت فارغة لتوفير موارد الخادم
        const hasRealAgar = Object.values(roomPlayers).some(p => !p.isBot);
        if (!hasRealAgar && socket.roomId !== 'public') {
            delete rooms[socket.roomId];
        }
    });
});

setInterval(() => {
    // تحديث حالة اللعبة لكل غرفة بشكل منفصل
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerList = Object.values(room.players);
        
        // حساب عدد اللاعبين الحقيقيين للغرفة العامة
        const uniquePlayers = new Set();
        playerList.forEach(p => { if (!p.isBot) uniquePlayers.add(p.owner); });
        room.realPlayersCount = uniquePlayers.size;
        
        // اللعبة تبدأ دائماً لتجنب تجميد اللاعبين بمفردهم في غرفة الانتظار
        room.isStarted = true;

        // تتبع التغييرات التي تحدث على الطعام والفيروسات في هذا الإطار الزمني
        const foodChanges = [];
        const virusChanges = [];

        // إذا كانت اللعبة قيد الانتظار، لا نحدث الفيزياء، نكتفي بإرسال الحالة فقط
        if (!room.isStarted) {
            io.to(roomId).emit('gameStateUpdate', { players: room.players, foodChanges: [], virusChanges: [], isStarted: room.isStarted, realPlayersCount: room.realPlayersCount });
            continue;
        }

        for (const p of playerList) {
            if (!room.players[p.id]) continue;

            // تحديث حالة الحماية للاعبين الحقيقيين (5 ثواني الأولى لا يُأكل)
            if (!p.isBot && p.spawnTime) {
                p.isProtected = (Date.now() - p.spawnTime < 5000);
            }

            // تحريك البوتات (الكمبيوتر) بذكاء يحاكي البشر
            if (p.isBot) {
                let target = null;
                let danger = null;
                let closestDist = Infinity;
                let closestDangerDist = Infinity;

                // تفحص البوت لمحيطه بحثاً عن أهداف أو أخطار
                for (const p2 of playerList) {
                    if (p.id === p2.id || p.owner === p2.owner) continue;
                    const dx = p.x - p2.x, dy = p.y - p2.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < 300000) { // نطاق رؤية البوت (حوالي 550 بكسل)
                        if (p2.r > p.r * 1.15 && distSq < closestDangerDist) {
                            danger = p2; // لاعب أكبر يمثل خطراً
                            closestDangerDist = distSq;
                        } else if (!danger && p.r > p2.r * 1.15 && distSq < closestDist) {
                          target = p2; // فريسة قريبة
                            closestDist = distSq;
                        }
                    }
                }

                // تغيير مستوى الذكاء بناءً على حجم البوت (كلما كبر أصبح ذكياً وحذراً)
                // تم التعديل: يبدأ بمستوى ضعيف (غباء) ويصبح ذكياً بعد البقاء دقيقة كاملة
                const aliveSeconds = (Date.now() - (p.joinTime || Date.now())) / 1000;
                const intelligenceChance = Math.min(0.9, aliveSeconds / 60); 
                const isSmart = Math.random() < intelligenceChance || p.r > 100;

                if (danger && isSmart) {
                    p.targetX = p.x + (p.x - danger.x); // الهروب في الاتجاه المعاكس
                    p.targetY = p.y + (p.y - danger.y);
                } else if (target && isSmart) {
                    p.targetX = target.x; // مطاردة الفريسة المباشرة
                    p.targetY = target.y;
                } else if (!p.targetX || Math.random() < 0.03) { // حركة عشوائية طبيعية
                    p.targetX = Math.max(0, Math.min(GAME_SIZE, p.x + (Math.random() - 0.5) * 500));
                    p.targetY = Math.max(0, Math.min(GAME_SIZE, p.y + (Math.random() - 0.5) * 500));
                }
                
                const dx = p.targetX - p.x, dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
            // 3. منع الإحداثيات من التحول إلى NaN إذا تطابقت
            if (dist > 0.1) {
                    // إبطاء البوتات قليلاً لتتناسب مع سرعة اللاعبين الجديدة
                    const speed = 180 / (p.r + 20);
                    p.x += (dx / dist) * speed; p.y += (dy / dist) * speed;
                }
            }
            
            // 2. إصلاح خروج البوتات عن الخريطة: إجبارهم على البقاء داخل حدود اللعبة
            p.x = Math.max(p.r, Math.min(GAME_SIZE - p.r, p.x));
            p.y = Math.max(p.r, Math.min(GAME_SIZE - p.r, p.y));

            // 4. نظام الانكماش الطبيعي (Mass Decay) للخلايا الكبيرة
            if (!p.isBot && p.r > 30 && !p.isEjected) {
                p.r -= (p.r * 0.0005);
            }

            if (p.vx || p.vy) {
                p.x = Math.max(p.r, Math.min(GAME_SIZE - p.r, p.x + p.vx));
                p.y = Math.max(p.r, Math.min(GAME_SIZE - p.r, p.y + p.vy));
                p.vx *= 0.85; p.vy *= 0.85;
                if (Math.abs(p.vx) < 1) p.vx = 0;
                if (Math.abs(p.vy) < 1) p.vy = 0;
            }

            for (let i = room.foods.length - 1; i >= 0; i--) {
                const dx = p.x - room.foods[i].x, dy = p.y - room.foods[i].y;
                if (dx * dx + dy * dy < p.r * p.r) { 
                    p.r += 0.5; 
                    const eatenFood = room.foods.splice(i, 1)[0];
                    if (eatenFood) {
                        foodChanges.push({ type: 'remove', id: eatenFood.id });
                        spawnFood(roomId);
                        foodChanges.push({ type: 'add', food: room.foods[room.foods.length - 1] });
                    }
                }
            }
            
            // تصادم اللاعب مع الألغام (Viruses)
            if (!p.isEjected) {
                for (let i = room.viruses.length - 1; i >= 0; i--) {
                    const v = room.viruses[i];
                    const dx = p.x - v.x, dy = p.y - v.y;
                    if (dx * dx + dy * dy < p.r * p.r && p.r > v.r * 1.15) {
                        const eatenVirus = room.viruses.splice(i, 1)[0];
                        if (eatenVirus) {
                            virusChanges.push({ type: 'remove', id: eatenVirus.id });
                            spawnVirus(roomId);
                            virusChanges.push({ type: 'add', virus: room.viruses[room.viruses.length - 1] });
                        }
                        
                        // 9. انفجار الفيروس الذكي والتقييد بالحد الأقصى (16 خلية)
                        const myCellCount = Object.values(room.players).filter(c => c.owner === p.owner).length;
                        const splitsAllowed = Math.min(3, 16 - myCellCount);
                        
                        if (splitsAllowed > 0) {
                            p.r = p.r / Math.sqrt(splitsAllowed + 1); // تقسيم الكتلة بدقة هندسية
                            for(let j=0; j<splitsAllowed; j++) {
                                const newId = p.owner + '_' + Math.random().toString(36).substr(2, 6);
                                const angle = Math.random() * Math.PI * 2;
                                room.players[newId] = {
                                    id: newId, owner: p.owner, isBot: p.isBot,
                                    x: p.x, y: p.y, r: p.r, color: p.color, name: p.name, skin: p.skin,
                                    vx: Math.cos(angle) * 30, vy: Math.sin(angle) * 30,
                                    splitTime: Date.now(),
                                    spawnTime: p.spawnTime // وراثة الحماية للخلية الجديدة
                                };
                            }
                            p.splitTime = Date.now();
                        } else {
                            p.r = Math.sqrt(p.r * p.r + 400); // زيادة طفيفة إذا وصل للحد الأقصى
                        }
                    }
                }
            } else {
                // إخفاء الكتل المطلقة (W) بعد 45 ثانية إذا لم يتم أكلها لمنع استنزاف الذاكرة
                if (p.isEjected && Date.now() - p.spawnTime > 45000) {
                    delete room.players[p.id];
                    // نرسل تحديثاً بأن الخلية اختفت
                    continue;
                }

                // 2. تفاعل إطلاق الكتلة (W) لتكبير الفيروسات وانشطارها
                for (let i = room.viruses.length - 1; i >= 0; i--) {
                    const v = room.viruses[i];
                    const dx = p.x - v.x, dy = p.y - v.y;
                    if (dx * dx + dy * dy < v.r * v.r) {
                        v.r += 4;
                        delete room.players[p.id];
                        virusChanges.push({ type: 'remove', id: v.id });
                        
                        if (v.r > 50) { // انفجار الفيروس للأمام
                            v.r = 35;
                            // 9. التحكم بتكاثر الفيروسات (الحد الأقصى) لمنع إرهاق السيرفر
                            if (room.viruses.length < MAX_VIRUSES + 10) {
                                const angle = Math.atan2(p.vy, p.vx) || Math.random() * Math.PI * 2;
                                const newVirus = {
                                    id: 'virus_' + Math.random().toString(36).substr(2, 9),
                                    x: Math.max(35, Math.min(GAME_SIZE - 35, v.x + Math.cos(angle) * 150)),
                                    y: Math.max(35, Math.min(GAME_SIZE - 35, v.y + Math.sin(angle) * 150)),
                                    r: 35
                                };
                                room.viruses.push(newVirus);
                                virusChanges.push({ type: 'add', virus: newVirus });
                            }
                        }
                        v.id = 'virus_' + Math.random().toString(36).substr(2, 9);
                        virusChanges.push({ type: 'add', virus: v });
                    }
                }
            }

        for (const p2 of playerList) {
            if (!room.players[p.id] || !room.players[p2.id] || p.id === p2.id) continue;
                const dx = p.x - p2.x, dy = p.y - p2.y;
                const distSq = dx * dx + dy * dy;
                
                if (p.owner === p2.owner) {
                    // 1. إصلاح الاندماج: السماح للخلايا بالاندماج بعد 15 ثانية من الانقسام
                    const canMerge = (Date.now() - (p.splitTime || 0) > 15000) && (Date.now() - (p2.splitTime || 0) > 15000);
                    if (canMerge && distSq < p.r * p.r) { 
                        p.r = Math.sqrt(p.r * p.r + p2.r * p2.r); // دمج المساحة
                        delete room.players[p2.id];
                    } else if (!canMerge) {
                        const minDist = p.r + p2.r;
                        if (distSq < minDist * minDist && distSq > 0) { 
                            const dist = Math.sqrt(distSq);
                            p.x += (dx / dist) * ((minDist - dist) * 0.1);
                            p.y += (dy / dist) * ((minDist - dist) * 0.1);
                        }
                    }
                } else if (p.r > p2.r * 1.15) {
                    if (distSq < p.r * p.r) { 
                        // تفعيل حماية اللاعبين من الالتهام في الثواني الأولى
                    if (p.isProtected || p2.isProtected) continue;

                        // 6. الدمج الفيزيائي العادل للكتلة (حساب المساحة الدقيق)
                        p.r = Math.sqrt(p.r * p.r + p2.r * p2.r); 
                        delete room.players[p2.id]; 
                        const hasCells = Object.values(room.players).some(pl => pl.owner === p2.owner);
                        if (!hasCells && p2.owner !== 'none') io.to(p2.owner).emit('died');
                    }
                }
            }
        }
        
        // إرسال التحديثات الجزئية للطعام والفيروسات بدلاً من الحالة الكاملة
        io.to(roomId).emit('gameStateUpdate', { players: room.players, foodChanges, virusChanges, isStarted: room.isStarted, realPlayersCount: room.realPlayersCount });
    }
}, 1000 / 30); // 30 إطار في الثانية للألعاب الحركية

// حلقة منفصلة وأبطأ لذكاء البلوت (لا يحتاج لـ 30 تحديث بالثانية، مما يوفر طاقة الـ CPU جداً)
setInterval(() => {
    for (const roomId in balootRooms) {
        const room = balootRooms[roomId];
        if (!room) continue; // 7. تفادي الانهيار لو انحذفت الغرفة
        if (room.state === 'bidding' || room.state === 'playing') {
            const currentTurnId = room.turnOrder[room.currentTurnIndex];
            const currentPlayer = room.players[currentTurnId];
            
            if (currentPlayer && currentPlayer.isBot && !room.botThinking) {
                room.botThinking = true;
                setTimeout(() => {
                    if (!balootRooms[roomId]) return;
                    const r = balootRooms[roomId];
                    if (r.turnOrder[r.currentTurnIndex] !== currentTurnId) {
                        r.botThinking = false; return;
                    }
                    
                    if (r.state === 'bidding') {
                        handleBalootAction(roomId, currentTurnId, 'pass');
                    } else if (r.state === 'playing') {
                        // البوت يعلن عن مشروعه إذا كان لديه مشروع في الأكلة الأولى
                        if (r.firstTrick && currentPlayer.project && !currentPlayer.projectDeclared) {
                            currentPlayer.projectDeclared = true;
                            if (r.team1.includes(currentTurnId)) r.scoreTeam1 += currentPlayer.project.points;
                            else r.scoreTeam2 += currentPlayer.project.points;
                            io.to(roomId).emit('chatMessage', { name: '📢 نظام البلوت', msg: `اللاعب ${currentPlayer.name} أعلن عن مشروع: ${currentPlayer.project.name} (+${currentPlayer.project.points} بنط)` });
                            io.to(roomId).emit('balootGameState', r);
                            
                            // تأخير رمي الورقة حتى يقرأ اللاعبون الإعلان
                            setTimeout(() => {
                                if (balootRooms[roomId] && currentPlayer.cards.length > 0) {
                                    playBalootCardLogic(roomId, currentTurnId, Math.floor(Math.random() * currentPlayer.cards.length));
                                }
                            }, 1500);
                            r.botThinking = false;
                            return;
                        }
                        
                        // البوت يلعب دائماً بالقوانين الصحيحة ولا يكذب
                        if (currentPlayer.cards.length > 0) {
                            const legalMoves = getLegalMoves(currentPlayer.cards, r.currentTrick, r.playingMode, r.trumpSuit);
                            const selectedCard = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                            playBalootCardLogic(roomId, currentTurnId, currentPlayer.cards.indexOf(selectedCard));
                        }
                    }
                    r.botThinking = false;
                }, 1500); // 1.5 ثانية تفكير ليبدو واقعياً
            }
        }
    }
}, 1000); // تحديث مرة واحدة كل ثانية كافية جداً لألعاب الورق

server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل بنجاح على الرابط: http://localhost:${PORT}`);
});