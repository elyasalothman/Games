module.exports = function(io, options = {}) {
    const unoRooms = {};
    const COLORS = ['red', 'blue', 'green', 'yellow'];
    const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];
    const RECONNECT_GRACE_MS = 30000;
    const CHALLENGE_TIMEOUT_MS = 15000;
    const ROOM_IDLE_MS = 10 * 60 * 1000;

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function createUnoDeck() {
        let deck = [];
        COLORS.forEach(color => {
            deck.push({ color, value: '0' });
            for (let i = 1; i < VALUES.length; i++) {
                deck.push({ color, value: VALUES[i] });
                deck.push({ color, value: VALUES[i] }); // نسختين من كل ورقة
            }
        });
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', value: 'Wild' });
            deck.push({ color: 'wild', value: '+4' });
        }
        return shuffle(deck);
    }

    function isValidPlay(card, topCard, currentColor) {
        if (card.color === 'wild') return true;
        if (card.color === currentColor) return true;
        if (card.value === topCard.value) return true;
        return false;
    }

    function validRoomId(room) {
        return typeof room === 'string' && /^[a-zA-Z0-9_-]{3,48}$/.test(room);
    }

    function normalizeToken(token, fallbackSocketId) {
        if (typeof token === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(token)) return token;
        return `sock_${fallbackSocketId}`;
    }

    function touch(room) {
        room.lastActivity = Date.now();
    }

    function nextTurn(room, steps = 1) {
        room.currentTurn = (room.currentTurn + (room.direction * steps) + room.turnOrder.length * steps) % room.turnOrder.length;
        room.hasDrawnThisTurn = false;
    }

    function drawCard(room) {
        if (room.deck.length === 0 && room.discardPile.length > 1) {
            const top = room.discardPile.pop();
            room.deck = shuffle(room.discardPile);
            room.discardPile = [top];
        }
        return room.deck.pop() || null;
    }

    function drawCards(room, player, count) {
        for (let i = 0; i < count; i++) {
            const card = drawCard(room);
            if (card) player.cards.push(card);
        }
        if (player.cards.length !== 1) player.saidUno = false;
    }

    function resetRound(room) {
        room.turnOrder = [];
        room.currentTurn = 0;
        room.direction = 1;
        room.deck = createUnoDeck();
        room.discardPile = [];
        room.currentColor = '';
        room.state = 'waiting';
        room.hasDrawnThisTurn = false;
        room.pendingChallenge = null;
        Object.values(room.players).forEach((p) => { p.saidUno = false; });
    }

    function activePlayers(room) {
        return Object.values(room.players).filter((p) => p.isBot || (p.originallyHuman && p.connected));
    }

    function stateForPlayer(room, token) {
        const players = {};
        Object.values(room.players).forEach((player) => {
            players[player.token] = {
                token: player.token,
                name: player.name,
                isBot: player.isBot,
                connected: player.connected !== false,
                saidUno: !!player.saidUno,
                wins: player.wins || 0,
                cardCount: player.cards.length,
                cards: player.token === token ? player.cards : []
            };
        });
        return {
            players,
            turnOrder: room.turnOrder,
            currentTurn: room.currentTurn,
            direction: room.direction,
            discardPile: room.discardPile,
            currentColor: room.currentColor,
            state: room.state,
            hostToken: room.hostToken,
            maxPlayers: room.maxPlayers,
            deckCount: room.deck.length,
            hasDrawnThisTurn: !!room.hasDrawnThisTurn,
            pendingChallenge: room.pendingChallenge
                ? { by: room.pendingChallenge.by, byName: room.players[room.pendingChallenge.by]?.name, target: room.pendingChallenge.target }
                : null
        };
    }

    function connectedRealPlayers(room) {
        return Object.values(room.players).filter((p) => !p.isBot && p.connected && p.socketId);
    }

    function emitRoomState(roomId) {
        const room = unoRooms[roomId];
        if (!room) return;
        connectedRealPlayers(room).forEach((player) => io.to(player.socketId).emit('unoGameState', stateForPlayer(room, player.token)));
    }

    function emitRoomMessage(roomId, message) {
        const room = unoRooms[roomId];
        if (!room) return;
        connectedRealPlayers(room).forEach((player) => io.to(player.socketId).emit('unoMessage', message));
    }

    function emitRoundResult(roomId, winner) {
        const room = unoRooms[roomId];
        if (!room) return;
        connectedRealPlayers(room).forEach((player) => io.to(player.socketId).emit('unoRoundResult', { winnerToken: winner.token, winnerName: winner.name }));
    }

    function scoreboardText(room) {
        return Object.values(room.players)
            .filter((p) => p.originallyHuman || p.isBot)
            .sort((a, b) => (b.wins || 0) - (a.wins || 0))
            .map((p) => `${p.name}: ${p.wins || 0}`)
            .join(' | ');
    }

    function finishRound(roomId, winner) {
        const room = unoRooms[roomId];
        if (!room) return;
        winner.wins = (winner.wins || 0) + 1;
        touch(room);
        resetRound(room);
        emitRoundResult(roomId, winner);
        emitRoomMessage(roomId, `🎉 فاز ${winner.name} بالجولة! النتيجة: ${scoreboardText(room)}`);
        emitRoomState(roomId);
    }

    function applyCard(roomId, room, player, card, selectedColor) {
        const previousColor = room.currentColor;
        room.discardPile.push(card);
        room.currentColor = card.color === 'wild' ? selectedColor : card.color;

        if (card.value === 'Reverse') {
            room.direction *= -1;
            nextTurn(room, room.turnOrder.length === 2 ? 2 : 1);
        } else if (card.value === 'Skip') {
            nextTurn(room, 2);
        } else if (card.value === '+2') {
            const targetToken = room.turnOrder[(room.currentTurn + room.direction + room.turnOrder.length) % room.turnOrder.length];
            drawCards(room, room.players[targetToken], 2);
            emitRoomMessage(roomId, `📥 ${room.players[targetToken].name} يسحب بطاقتين!`);
            nextTurn(room, 2);
        } else if (card.value === '+4') {
            const targetToken = room.turnOrder[(room.currentTurn + room.direction + room.turnOrder.length) % room.turnOrder.length];
            const illegal = player.cards.some((c) => c.color === previousColor);
            room.pendingChallenge = { by: player.token, target: targetToken, previousColor, illegal, createdAt: Date.now() };
            emitRoomMessage(roomId, `🃏 لعب ${player.name} +4! على ${room.players[targetToken].name} أن يقرر: تحدّي أم سحب 4 أوراق؟`);
        } else {
            nextTurn(room);
        }
    }

    function playCard(roomId, playerToken, cardIndex, selectedColor) {
        const room = unoRooms[roomId];
        if (!room || room.state !== 'playing' || room.pendingChallenge) return false;
        if (room.turnOrder[room.currentTurn] !== playerToken) return false;
        const player = room.players[playerToken];
        const card = player && player.cards[cardIndex];
        const topCard = room.discardPile[room.discardPile.length - 1];
        if (!card || !isValidPlay(card, topCard, room.currentColor)) return false;
        if (card.color === 'wild' && !COLORS.includes(selectedColor)) return false;

        player.cards.splice(cardIndex, 1);
        touch(room);
        applyCard(roomId, room, player, card, selectedColor);
        if (player.cards.length === 0) {
            finishRound(roomId, player);
        } else {
            if (player.cards.length === 1 && player.isBot) player.saidUno = Math.random() < 0.8;
            else if (player.cards.length !== 1) player.saidUno = false;
            emitRoomState(roomId);
        }
        return true;
    }

    function resolveChallenge(roomId, targetToken, accept) {
        const room = unoRooms[roomId];
        if (!room || !room.pendingChallenge || room.pendingChallenge.target !== targetToken) return false;
        const { by, illegal } = room.pendingChallenge;
        const target = room.players[targetToken];
        const originalPlayer = room.players[by];
        room.pendingChallenge = null;

        if (!accept) {
            if (illegal) {
                drawCards(room, originalPlayer, 4);
                emitRoomMessage(roomId, `🔍 تحدّي ناجح من ${target.name}! كان ${originalPlayer.name} يخفي بطاقة بنفس اللون، فيسحب 4 أوراق.`);
                nextTurn(room, 1);
            } else {
                drawCards(room, target, 6);
                emitRoomMessage(roomId, `❌ تحدّي خاطئ من ${target.name}! اللعب كان قانونياً، فيسحب 6 أوراق (4+2 عقاب).`);
                nextTurn(room, 2);
            }
        } else {
            drawCards(room, target, 4);
            emitRoomMessage(roomId, `📥 ${target.name} سحب 4 أوراق.`);
            nextTurn(room, 2);
        }
        touch(room);
        emitRoomState(roomId);
        return true;
    }

    io.on('connection', (socket) => {
        socket.on('joinUno', ({ name, room, mode, token }) => {
            const roomId = room || 'public_uno';
            if (!validRoomId(roomId)) {
                socket.emit('unoMessage', 'اسم الغرفة غير صالح.');
                return;
            }
            const playerToken = normalizeToken(token, socket.id);

            if (!unoRooms[roomId]) {
                unoRooms[roomId] = {
                    players: {}, turnOrder: [], currentTurn: 0, direction: 1,
                    deck: createUnoDeck(), discardPile: [], currentColor: '',
                    state: 'waiting', maxPlayers: mode === 'private' ? 8 : 5,
                    hostToken: playerToken, hasDrawnThisTurn: false, pendingChallenge: null,
                    lastActivity: Date.now()
                };
            }

            const r = unoRooms[roomId];
            const reconnecting = !!r.players[playerToken];
            if (!reconnecting && Object.keys(r.players).length >= r.maxPlayers) {
                socket.emit('unoMessage', 'الغرفة ممتلئة، جرّب غرفة أخرى.');
                return;
            }
            if (!reconnecting && r.state === 'playing') {
                socket.emit('unoMessage', 'الجولة بدأت بالفعل. انتظر الجولة التالية أو أنشئ غرفة جديدة.');
                return;
            }

            socket.join(roomId);
            socket.unoRoomId = roomId;
            socket.unoToken = playerToken;
            touch(r);

            if (reconnecting) {
                const player = r.players[playerToken];
                const wasAway = !player.connected || player.isBot;
                player.name = name || player.name;
                player.socketId = socket.id;
                player.connected = true;
                player.disconnectedAt = null;
                if (player.originallyHuman) player.isBot = false;
                if (wasAway) emitRoomMessage(roomId, `✅ عاد ${player.name} إلى الغرفة.`);
            } else {
                r.players[playerToken] = {
                    token: playerToken, name: name || 'لاعب', cards: [], isBot: false,
                    originallyHuman: true, socketId: socket.id, connected: true,
                    saidUno: false, wins: 0, disconnectedAt: null
                };
            }

            if (mode === 'computer' && Object.values(r.players).filter((p) => p.originallyHuman).length === 1 && !Object.values(r.players).some((p) => p.isBot)) {
                for (let i = 1; i < r.maxPlayers; i++) {
                    const botToken = 'bot_uno_' + i;
                    r.players[botToken] = { token: botToken, name: '🤖 بوت ' + i, cards: [], isBot: true, originallyHuman: false, connected: true, saidUno: false, wins: 0 };
                }
            }
            emitRoomState(roomId);
        });

        socket.on('startUno', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'waiting' || r.hostToken !== socket.unoToken) return;
            const players = activePlayers(r);
            if (players.length < 2) {
                socket.emit('unoMessage', 'تحتاج لاعبين على الأقل لبدء الجولة.');
                return;
            }

            r.turnOrder = shuffle(players.map((p) => p.token));
            r.turnOrder.forEach((token) => {
                r.players[token].cards = [];
                r.players[token].saidUno = false;
                drawCards(r, r.players[token], 7);
            });

            let firstCard;
            do {
                firstCard = drawCard(r);
                if (firstCard.color === 'wild') r.deck.unshift(firstCard);
            } while (firstCard.color === 'wild');

            r.discardPile.push(firstCard);
            r.currentColor = firstCard.color;
            r.state = 'playing';
            r.hasDrawnThisTurn = false;
            r.pendingChallenge = null;
            touch(r);
            emitRoomState(socket.unoRoomId);
        });

        socket.on('playUnoCard', ({ cardIndex, selectedColor }) => {
            if (!playCard(socket.unoRoomId, socket.unoToken, cardIndex, selectedColor)) {
                socket.emit('unoMessage', 'هذه الحركة غير مسموحة الآن.');
            }
        });

        socket.on('drawUnoCard', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'playing' || r.pendingChallenge) return;
            if (r.turnOrder[r.currentTurn] !== socket.unoToken || r.hasDrawnThisTurn) return;

            drawCards(r, r.players[socket.unoToken], 1);
            r.hasDrawnThisTurn = true;
            touch(r);
            emitRoomState(socket.unoRoomId);
        });

        socket.on('passUnoTurn', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'playing' || r.pendingChallenge) return;
            if (r.turnOrder[r.currentTurn] !== socket.unoToken || !r.hasDrawnThisTurn) return;

            nextTurn(r, 1);
            touch(r);
            emitRoomState(socket.unoRoomId);
        });

        socket.on('resolveUnoChallenge', ({ accept }) => {
            resolveChallenge(socket.unoRoomId, socket.unoToken, !!accept);
        });

        socket.on('declareUno', () => {
            const r = unoRooms[socket.unoRoomId];
            const p = r && r.players[socket.unoToken];
            if (p && p.cards.length === 1 && !p.saidUno) {
                p.saidUno = true;
                emitRoomState(socket.unoRoomId);
            }
        });

        socket.on('catchUno', ({ targetToken }) => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || targetToken === socket.unoToken) return;
            const target = r.players[targetToken];
            if (target && target.cards.length === 1 && !target.saidUno) {
                drawCards(r, target, 2);
                target.saidUno = true;
                touch(r);
                emitRoomMessage(socket.unoRoomId, `🚨 قُبض على ${target.name} وهو لم يقل UNO! يسحب بطاقتين عقاباً.`);
                emitRoomState(socket.unoRoomId);
            } else {
                socket.emit('unoMessage', 'لا يمكنك القبض عليه الآن.');
            }
        });

        socket.on('disconnect', () => {
            const roomId = socket.unoRoomId;
            const r = unoRooms[roomId];
            if (!r) return;
            const player = r.players[socket.unoToken];
            if (!player || player.socketId !== socket.id) return;

            player.connected = false;
            player.socketId = null;
            player.disconnectedAt = Date.now();

            if (r.state === 'waiting') {
                delete r.players[socket.unoToken];
                if (r.hostToken === socket.unoToken) {
                    r.hostToken = Object.values(r.players).find((p) => p.originallyHuman)?.token || null;
                }
                if (!Object.values(r.players).some((p) => p.originallyHuman)) {
                    delete unoRooms[roomId];
                    return;
                }
                emitRoomState(roomId);
            } else {
                emitRoomMessage(roomId, `⏳ انقطع الاتصال بـ ${player.name}. لديه ${Math.round(RECONNECT_GRACE_MS / 1000)} ثانية للعودة قبل أن يتابع الروبوت اللعب بدلاً منه.`);
                emitRoomState(roomId);
            }
        });
    });

    const gameLoop = () => {
        const now = Date.now();
        for (const roomId in unoRooms) {
            const r = unoRooms[roomId];

            if (r.state === 'playing') {
                Object.values(r.players).forEach((p) => {
                    if (p.originallyHuman && !p.connected && !p.isBot && p.disconnectedAt && now - p.disconnectedAt > RECONNECT_GRACE_MS) {
                        p.isBot = true;
                        emitRoomMessage(roomId, `🤖 تولى الروبوت اللعب بدلاً من ${p.name} بعد انقطاع الاتصال.`);
                        emitRoomState(roomId);
                    }
                });

                if (r.pendingChallenge && now - r.pendingChallenge.createdAt > CHALLENGE_TIMEOUT_MS) {
                    const target = r.players[r.pendingChallenge.target];
                    if (target && target.isBot) {
                        resolveChallenge(roomId, target.token, Math.random() > 0.3);
                    } else {
                        resolveChallenge(roomId, r.pendingChallenge.target, true);
                    }
                    continue;
                }

                if (!r.pendingChallenge) {
                    const currentToken = r.turnOrder[r.currentTurn];
                    const player = r.players[currentToken];
                    if (player && player.isBot && !r.botThinking) {
                        r.botThinking = true;
                        setTimeout(() => {
                            r.botThinking = false;
                            if (!unoRooms[roomId] || r.state !== 'playing' || r.pendingChallenge || r.turnOrder[r.currentTurn] !== currentToken) return;

                            const topCard = r.discardPile[r.discardPile.length - 1];
                            let played = false;
                            for (let i = 0; i < player.cards.length; i++) {
                                if (isValidPlay(player.cards[i], topCard, r.currentColor)) {
                                    let selectedColor = r.currentColor;
                                    if (player.cards[i].color === 'wild') {
                                        selectedColor = COLORS[Math.floor(Math.random() * 4)];
                                    }
                                    played = playCard(roomId, player.token, i, selectedColor);
                                    break;
                                }
                            }
                            if (!played) {
                                drawCards(r, player, 1);
                                const drawnCard = player.cards[player.cards.length - 1];
                                if (drawnCard && isValidPlay(drawnCard, topCard, r.currentColor)) {
                                    let selectedColor = r.currentColor;
                                    if (drawnCard.color === 'wild') selectedColor = COLORS[Math.floor(Math.random() * 4)];
                                    playCard(roomId, player.token, player.cards.length - 1, selectedColor);
                                } else {
                                    nextTurn(r, 1);
                                    emitRoomState(roomId);
                                }
                            }
                        }, 1200);
                    }
                }
            }

            if (now - (r.lastActivity || 0) > ROOM_IDLE_MS && !Object.values(r.players).some((p) => p.connected)) {
                delete unoRooms[roomId];
            }
        }
    };

    if (options.startBotLoop !== false) setInterval(gameLoop, 1000);
    return { rooms: unoRooms, gameLoop };
};
