const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // السماح بالاتصال من أي دومين (مهم جداً لدومينك الخاص)
    }
});
const PORT = process.env.PORT || 3000;

// Middleware لقراءة البيانات المرسلة بصيغة JSON
app.use(express.json());

// إعداد قاعدة بيانات SQLite
const db = new sqlite3.Database('./leaderboard.db', (err) => {
    if (err) console.error('خطأ في الاتصال بقاعدة البيانات:', err);
    else console.log('✅ تم الاتصال بقاعدة بيانات SQLite بنجاح');
});

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
app.use(express.static(path.join(__dirname)));

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
    const { game_id, player_name, score } = req.body;
    if (!game_id || !player_name || score === undefined) return res.status(400).json({ error: 'بيانات غير مكتملة' });
    
    db.run(`INSERT INTO leaderboard (game_id, player_name, score) VALUES (?, ?, ?)`, [game_id, player_name, score], function(err) {
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

// كائن يحتوي على جميع الغرف النشطة
const rooms = {};

// دالة لتهيئة غرفة جديدة وتوليد الطعام فيها
function initRoom(roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = { players: {}, foods: [] };
        for (let i = 0; i < MAX_FOOD; i++) spawnFood(roomId);
    }
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

function spawnBots(roomId, count) {
    for (let i = 0; i < count; i++) {
        const botId = 'bot_' + Math.random().toString(36).substr(2, 9);
        rooms[roomId].players[botId] = {
            id: botId, owner: botId, isBot: true,
            x: Math.random() * GAME_SIZE, y: Math.random() * GAME_SIZE,
            r: 25 + Math.random() * 20, // أحجام مختلفة للبوتات
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            name: '🤖 بوت ' + (i + 1),
            vx: 0, vy: 0
        };
    }
}

io.on('connection', (socket) => {
    socket.on('joinGame', ({ name, room, mode }) => {
        const roomId = room || 'public';
        socket.join(roomId);
        socket.roomId = roomId; // حفظ معرف الغرفة في المتصل
        initRoom(roomId);

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
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            name: name || 'لاعب',
            vx: 0, vy: 0
        };
        socket.emit('init', { id: socket.id, size: GAME_SIZE });
    });

    socket.on('move', (dir) => {
        if (!socket.roomId || !rooms[socket.roomId]) return;
        Object.values(rooms[socket.roomId].players).forEach(player => {
            if (player.owner === socket.id) {
                const speed = 150 / player.r;
                player.x = Math.max(player.r, Math.min(GAME_SIZE - player.r, player.x + dir.x * speed));
                player.y = Math.max(player.r, Math.min(GAME_SIZE - player.r, player.y + dir.y * speed));
            }
        });
    });

    socket.on('split', (dir) => {
        if (!socket.roomId || !rooms[socket.roomId]) return;
        Object.values(rooms[socket.roomId].players).forEach(p => {
            // يجب أن يكون حجم الخلية أكبر من 30 لتتمكن من الانقسام
            if (p.owner === socket.id && p.r > 30) {
                p.r = p.r / 1.414; // تصغير الخلية الأصلية للنصف من حيث المساحة
                const newId = socket.id + '_' + Math.random().toString(36).substr(2, 6);
                rooms[socket.roomId].players[newId] = {
                    id: newId, owner: socket.id,
                    x: p.x, y: p.y, r: p.r,
                    color: p.color, name: p.name,
                    vx: dir.x * 25, vy: dir.y * 25 // قوة الاندفاع للأمام
                };
            }
        });
    });

    socket.on('disconnect', () => { 
        if (!socket.roomId || !rooms[socket.roomId]) return;
        const roomPlayers = rooms[socket.roomId].players;
        Object.keys(roomPlayers).forEach(k => { 
            if(roomPlayers[k].owner === socket.id) delete roomPlayers[k]; 
        });
        
        // مسح الغرفة إذا أصبحت فارغة لتوفير موارد الخادم
        if (Object.keys(roomPlayers).length === 0 && socket.roomId !== 'public') {
            delete rooms[socket.roomId];
        }
    });
});

setInterval(() => {
    // تحديث حالة اللعبة لكل غرفة بشكل منفصل
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerList = Object.values(room.players);
        
        playerList.forEach(p => {
            if (!room.players[p.id]) return;

            // تحريك البوتات (الكمبيوتر)
            if (p.isBot) {
                if (!p.targetX || Math.random() < 0.02) { // تغيير الوجهة عشوائياً بين الحين والآخر
                    p.targetX = Math.random() * GAME_SIZE;
                    p.targetY = Math.random() * GAME_SIZE;
                }
                const dx = p.targetX - p.x, dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 10) {
                    const speed = 120 / p.r;
                    p.x += (dx / dist) * speed; p.y += (dy / dist) * speed;
                }
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
                if (dx * dx + dy * dy < p.r * p.r) { p.r += 0.5; room.foods.splice(i, 1); spawnFood(roomId); }
            }
            playerList.forEach(p2 => {
                if (!room.players[p.id] || !room.players[p2.id] || p.id === p2.id) return;
                const dx = p.x - p2.x, dy = p.y - p2.y;
                const distSq = dx * dx + dy * dy;
                
                if (p.owner === p2.owner) {
                    const minDist = p.r + p2.r;
                    if (distSq < minDist * minDist && distSq > 0) { 
                        const dist = Math.sqrt(distSq);
                        p.x += (dx / dist) * ((minDist - dist) * 0.1);
                        p.y += (dy / dist) * ((minDist - dist) * 0.1);
                    }
                } else if (p.r > p2.r * 1.15) {
                    if (distSq < p.r * p.r) { 
                        p.r += p2.r * 0.5; 
                        delete room.players[p2.id]; 
                        const hasCells = Object.values(room.players).some(pl => pl.owner === p2.owner);
                        if (!hasCells) io.to(p2.owner).emit('died');
                    }
                }
            });
        });
        
        // إرسال البيانات للاعبي هذه الغرفة فقط
        io.to(roomId).emit('gameState', { players: room.players, foods: room.foods });
    }
}, 1000 / 30);

server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل بنجاح على الرابط: http://localhost:${PORT}`);
});