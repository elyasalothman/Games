module.exports = function (io) {
    const unoRooms = {};
    const COLORS = ['red', 'blue', 'green', 'yellow'];
    const COLOR_NAMES = { red: 'أحمر', blue: 'أزرق', green: 'أخضر', yellow: 'أصفر' };

    function createUnoDeck() {
        const deck = [];
        COLORS.forEach((color) => {
            deck.push({ color, value: '0' });
            for (let n = 1; n <= 9; n++) {
                deck.push({ color, value: String(n) });
                deck.push({ color, value: String(n) });
            }
            ['Skip', 'Reverse', '+2'].forEach((value) => {
                deck.push({ color, value });
                deck.push({ color, value });
            });
        });
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', value: 'Wild' });
            deck.push({ color: 'wild', value: '+4' });
        }
        return shuffle(deck);
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function isValidPlay(card, topCard, currentColor) {
        if (!card || !topCard) return false;
        if (card.color === 'wild') return true;
        if (card.color === currentColor) return true;
        if (card.value === topCard.value) return true;
        return false;
    }

    function ensureDeck(r, need) {
        if (r.deck.length >= need) return;
        if (r.discardPile.length <= 1) return;
        const top = r.discardPile.pop();
        r.deck = shuffle(r.discardPile);
        r.discardPile = [top];
    }

    function drawCards(r, playerId, count) {
        ensureDeck(r, count);
        const drawn = [];
        for (let i = 0; i < count && r.deck.length > 0; i++) {
            drawn.push(r.deck.pop());
        }
        if (r.players[playerId]) {
            r.players[playerId].cards.push(...drawn);
        }
        return drawn;
    }

    function advanceTurn(r, steps) {
        const n = r.turnOrder.length;
        if (n === 0) return;
        r.currentTurn = (r.currentTurn + steps * r.direction + n * 10) % n;
    }

    function applyCardEffect(r, card) {
        if (card.value === 'Reverse') {
            r.direction *= -1;
            if (r.turnOrder.length === 2) {
                advanceTurn(r, 1);
            }
        } else if (card.value === 'Skip') {
            advanceTurn(r, 1);
        } else if (card.value === '+2') {
            const nextId = r.turnOrder[(r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length];
            drawCards(r, nextId, 2);
            advanceTurn(r, 1);
        } else if (card.value === '+4') {
            const nextId = r.turnOrder[(r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length];
            drawCards(r, nextId, 4);
            advanceTurn(r, 1);
        }
    }

    function playCard(r, playerId, cardIndex, selectedColor) {
        if (!r || r.state !== 'playing') return { ok: false, reason: 'not_playing' };
        if (r.turnOrder[r.currentTurn] !== playerId) return { ok: false, reason: 'not_turn' };

        const player = r.players[playerId];
        if (!player) return { ok: false, reason: 'no_player' };
        const idx = Number(cardIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= player.cards.length) {
            return { ok: false, reason: 'no_card' };
        }
        const card = player.cards[idx];
        if (!card) return { ok: false, reason: 'no_card' };

        const topCard = r.discardPile[r.discardPile.length - 1];
        if (!isValidPlay(card, topCard, r.currentColor)) return { ok: false, reason: 'invalid' };

        if (card.color === 'wild') {
            if (!COLORS.includes(selectedColor)) return { ok: false, reason: 'need_color' };
        }

        player.cards.splice(idx, 1);
        r.discardPile.push(card);
        r.currentColor = card.color === 'wild' ? selectedColor : card.color;
        r.lastAction = `${player.name} لعب ${formatCard(card)}`;
        if (card.color === 'wild') {
            r.lastAction += ` ← ${COLOR_NAMES[selectedColor]}`;
        }
        r.drawnThisTurn = false;

        applyCardEffect(r, card);

        if (player.cards.length === 0) {
            r.state = 'finished';
            r.winner = player.name;
            r.lastAction = `🎉 فاز ${player.name}!`;
            return { ok: true, won: true };
        }

        if (player.cards.length === 1) {
            r.lastAction += ' — أونو!';
        }

        advanceTurn(r, 1);
        return { ok: true };
    }

    function formatCard(card) {
        const labels = { Skip: 'تخطي', Reverse: 'عكس', Wild: 'تبديل لون', '+2': '+2', '+4': '+4' };
        const label = labels[card.value] || card.value;
        if (card.color === 'wild') return label;
        return `${COLOR_NAMES[card.color] || card.color} ${label}`;
    }

    function publicState(r, forSocketId) {
        const players = {};
        Object.values(r.players).forEach((p) => {
            const isSelf = p.id === forSocketId;
            players[p.id] = {
                id: p.id,
                name: p.name,
                isBot: !!p.isBot,
                cardCount: p.cards.length,
                cards: isSelf ? p.cards : undefined
            };
        });
        return {
            state: r.state,
            turnOrder: r.turnOrder,
            currentTurn: r.currentTurn,
            direction: r.direction,
            currentColor: r.currentColor,
            discardTop: r.discardPile[r.discardPile.length - 1] || null,
            deckCount: r.deck.length,
            maxPlayers: r.maxPlayers,
            playerCount: Object.keys(r.players).length,
            lastAction: r.lastAction || '',
            winner: r.winner || null,
            drawnThisTurn: !!r.drawnThisTurn,
            players
        };
    }

    function emitState(roomId) {
        const r = unoRooms[roomId];
        if (!r) return;
        Object.keys(r.players).forEach((pid) => {
            if (r.players[pid].isBot) return;
            io.to(pid).emit('unoGameState', publicState(r, pid));
        });
    }

    function startGame(r) {
        r.deck = createUnoDeck();
        r.discardPile = [];
        r.direction = 1;
        r.currentTurn = 0;
        r.winner = null;
        r.drawnThisTurn = false;
        r.botThinking = false;
        r.turnOrder = Object.keys(r.players);
        // خلط ترتيب اللاعبين
        r.turnOrder = shuffle(r.turnOrder);

        r.turnOrder.forEach((id) => {
            r.players[id].cards = [];
            drawCards(r, id, 7);
        });

        let firstCard;
        let guard = 0;
        do {
            ensureDeck(r, 1);
            firstCard = r.deck.pop();
            if (firstCard.color === 'wild') {
                r.deck.unshift(firstCard);
                firstCard = null;
            }
            guard++;
        } while (!firstCard && guard < 20);

        if (!firstCard) {
            firstCard = { color: 'red', value: '0' };
        }

        r.discardPile.push(firstCard);
        r.currentColor = firstCard.color;
        r.state = 'playing';
        r.lastAction = `بدأت اللعبة — ${formatCard(firstCard)}`;

        // تأثير الورقة الأولى (تخطي / عكس / +2)
        if (firstCard.value === 'Reverse') {
            r.direction *= -1;
            r.lastAction += ' (عكس الاتجاه)';
        } else if (firstCard.value === 'Skip') {
            advanceTurn(r, 1);
            r.lastAction += ' (تخطي أول لاعب)';
        } else if (firstCard.value === '+2') {
            const firstId = r.turnOrder[r.currentTurn];
            drawCards(r, firstId, 2);
            advanceTurn(r, 1);
            r.lastAction += ' (+2 لأول لاعب)';
        }
    }

    function resetToLobby(r) {
        r.state = 'waiting';
        r.turnOrder = [];
        r.currentTurn = 0;
        r.direction = 1;
        r.discardPile = [];
        r.deck = createUnoDeck();
        r.currentColor = '';
        r.winner = null;
        r.lastAction = 'بانتظار بدء جولة جديدة';
        r.drawnThisTurn = false;
        Object.values(r.players).forEach((p) => {
            p.cards = [];
        });
    }

    function pickBotColor(player) {
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        player.cards.forEach((c) => {
            if (counts[c.color] !== undefined) counts[c.color]++;
        });
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    }

    function botPlay(r, roomId) {
        const currentTurnId = r.turnOrder[r.currentTurn];
        const player = r.players[currentTurnId];
        if (!player || !player.isBot || r.state !== 'playing') {
            r.botThinking = false;
            return;
        }

        const topCard = r.discardPile[r.discardPile.length - 1];
        let bestIdx = -1;
        let bestScore = -1;

        for (let i = 0; i < player.cards.length; i++) {
            const card = player.cards[i];
            if (!isValidPlay(card, topCard, r.currentColor)) continue;
            let score = 1;
            if (card.value === '+4') score = 5;
            else if (card.value === '+2') score = 4;
            else if (card.value === 'Skip' || card.value === 'Reverse') score = 3;
            else if (card.color === 'wild') score = 2;
            else score = 6; // تفضيل الأوراق الملونة العادية
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }

        if (bestIdx >= 0) {
            const card = player.cards[bestIdx];
            const selectedColor = card.color === 'wild' ? pickBotColor(player) : null;
            playCard(r, currentTurnId, bestIdx, selectedColor);
        } else {
            const drawn = drawCards(r, currentTurnId, 1);
            r.lastAction = `${player.name} سحب ورقة`;
            if (drawn[0] && isValidPlay(drawn[0], topCard, r.currentColor)) {
                const selectedColor = drawn[0].color === 'wild' ? pickBotColor(player) : null;
                playCard(r, currentTurnId, player.cards.length - 1, selectedColor);
            } else {
                advanceTurn(r, 1);
            }
        }

        r.botThinking = false;
        emitState(roomId);
    }

    io.on('connection', (socket) => {
        socket.on('joinUno', ({ name, room, mode }) => {
            const safeName = String(name || 'لاعب').slice(0, 20);
            let roomId = room || 'public_uno';
            const playMode = mode || 'public';

            if (playMode === 'computer') {
                roomId = 'bot_uno_' + socket.id;
            } else if (playMode === 'private') {
                roomId = 'priv_' + String(room || '').trim().slice(0, 24);
                if (roomId === 'priv_') {
                    socket.emit('unoError', { msg: 'أدخل اسم غرفة صالحاً' });
                    return;
                }
            } else {
                roomId = 'public_uno';
            }

            if (socket.unoRoomId && unoRooms[socket.unoRoomId]) {
                leaveRoom(socket);
            }

            socket.join(roomId);
            socket.unoRoomId = roomId;
            socket.unoMode = playMode;

            if (!unoRooms[roomId]) {
                const botCount = playMode === 'computer' ? 3 : 0;
                unoRooms[roomId] = {
                    players: {},
                    turnOrder: [],
                    currentTurn: 0,
                    direction: 1,
                    deck: createUnoDeck(),
                    discardPile: [],
                    currentColor: '',
                    state: 'waiting',
                    maxPlayers: playMode === 'private' ? 8 : playMode === 'computer' ? 4 : 5,
                    lastAction: 'بانتظار اللاعبين...',
                    winner: null,
                    drawnThisTurn: false,
                    botThinking: false,
                    mode: playMode
                };

                if (botCount > 0) {
                    for (let i = 1; i <= botCount; i++) {
                        const botId = 'bot_uno_' + roomId + '_' + i;
                        unoRooms[roomId].players[botId] = {
                            id: botId,
                            name: 'بوت ' + i,
                            cards: [],
                            isBot: true
                        };
                    }
                }
            }

            const r = unoRooms[roomId];

            if (r.state === 'playing') {
                socket.emit('unoError', { msg: 'اللعبة جارية بالفعل، انتظر الجولة القادمة' });
                socket.leave(roomId);
                socket.unoRoomId = null;
                return;
            }

            if (!r.players[socket.id] && Object.keys(r.players).length >= r.maxPlayers) {
                socket.emit('unoError', { msg: 'الغرفة ممتلئة!' });
                socket.leave(roomId);
                socket.unoRoomId = null;
                return;
            }

            r.players[socket.id] = {
                id: socket.id,
                name: safeName,
                cards: [],
                isBot: false
            };
            r.lastAction = `${safeName} انضم للغرفة`;
            emitState(roomId);

            // في وضع الكمبيوتر ابدأ تلقائياً
            if (playMode === 'computer') {
                startGame(r);
                emitState(roomId);
            }
        });

        socket.on('startUno', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r) return;
            if (r.state === 'playing') return;

            const humans = Object.values(r.players).filter((p) => !p.isBot);
            const total = Object.keys(r.players).length;
            if (total < 2) {
                socket.emit('unoError', { msg: 'يحتاج لاعبين على الأقل' });
                return;
            }
            if (!humans.find((h) => h.id === socket.id)) return;

            startGame(r);
            emitState(socket.unoRoomId);
        });

        socket.on('playUnoCard', ({ cardIndex, selectedColor }) => {
            const r = unoRooms[socket.unoRoomId];
            if (!r) return;
            const result = playCard(r, socket.id, cardIndex, selectedColor);
            if (!result.ok) {
                if (result.reason === 'need_color') {
                    socket.emit('unoError', { msg: 'اختر لوناً للورقة الخاصة' });
                } else if (result.reason === 'invalid') {
                    socket.emit('unoError', { msg: 'لا يمكن لعب هذه الورقة' });
                } else if (result.reason === 'not_turn') {
                    socket.emit('unoError', { msg: 'ليس دورك' });
                }
                return;
            }
            emitState(socket.unoRoomId);
        });

        socket.on('drawUnoCard', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'playing' || r.turnOrder[r.currentTurn] !== socket.id) {
                socket.emit('unoError', { msg: 'ليس دورك' });
                return;
            }
            if (r.drawnThisTurn) {
                socket.emit('unoError', { msg: 'سحبت مسبقاً — العب الورقة أو مرّر الدور' });
                return;
            }

            const player = r.players[socket.id];
            const topCard = r.discardPile[r.discardPile.length - 1];
            const hasPlayable = player.cards.some((c) => isValidPlay(c, topCard, r.currentColor));
            if (hasPlayable) {
                socket.emit('unoError', { msg: 'لديك ورقة قابلة للعب' });
                return;
            }

            const drawn = drawCards(r, socket.id, 1);
            r.drawnThisTurn = true;
            r.lastAction = `${player.name} سحب ورقة`;

            if (drawn[0] && isValidPlay(drawn[0], topCard, r.currentColor)) {
                r.lastAction += ' — يمكن لعبها أو تمرير الدور';
                emitState(socket.unoRoomId);
                return;
            }

            r.drawnThisTurn = false;
            advanceTurn(r, 1);
            emitState(socket.unoRoomId);
        });

        socket.on('passUno', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'playing' || r.turnOrder[r.currentTurn] !== socket.id) return;
            if (!r.drawnThisTurn) {
                socket.emit('unoError', { msg: 'اسحب ورقة أولاً قبل التمرير' });
                return;
            }
            r.drawnThisTurn = false;
            r.lastAction = `${r.players[socket.id].name} مرّر الدور`;
            advanceTurn(r, 1);
            emitState(socket.unoRoomId);
        });

        socket.on('rematchUno', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'finished') return;
            resetToLobby(r);
            if (r.mode === 'computer') {
                startGame(r);
            }
            emitState(socket.unoRoomId);
        });

        socket.on('disconnect', () => {
            leaveRoom(socket);
        });
    });

    function leaveRoom(socket) {
        const roomId = socket.unoRoomId;
        if (!roomId || !unoRooms[roomId]) return;

        const r = unoRooms[roomId];
        const wasTurn = r.turnOrder[r.currentTurn] === socket.id;
        const name = r.players[socket.id] ? r.players[socket.id].name : 'لاعب';

        delete r.players[socket.id];
        socket.leave(roomId);

        const hasReal = Object.values(r.players).some((p) => !p.isBot);
        if (!hasReal) {
            delete unoRooms[roomId];
            socket.unoRoomId = null;
            return;
        }

        r.turnOrder = r.turnOrder.filter((id) => id !== socket.id);
        if (r.currentTurn >= r.turnOrder.length) r.currentTurn = 0;

        if (r.state === 'playing') {
            if (r.turnOrder.length < 2) {
                r.state = 'finished';
                const winner = r.players[r.turnOrder[0]];
                r.winner = winner ? winner.name : null;
                r.lastAction = winner ? `🎉 فاز ${winner.name} (انسحاب الآخرين)` : 'انتهت اللعبة';
            } else {
                r.lastAction = `${name} غادر`;
                if (wasTurn) {
                    // الدور يبقى على نفس الفهرس (اللاعب التالي بعد الحذف)
                    r.currentTurn = r.currentTurn % r.turnOrder.length;
                    r.drawnThisTurn = false;
                }
            }
        }

        emitState(roomId);
        socket.unoRoomId = null;
    }

    // بوتات الأونو
    setInterval(() => {
        for (const roomId in unoRooms) {
            const r = unoRooms[roomId];
            if (r.state !== 'playing' || r.botThinking) continue;
            const currentTurnId = r.turnOrder[r.currentTurn];
            const player = r.players[currentTurnId];
            if (!player || !player.isBot) continue;

            r.botThinking = true;
            const delay = 900 + Math.floor(Math.random() * 900);
            setTimeout(() => {
                if (!unoRooms[roomId]) return;
                if (r.turnOrder[r.currentTurn] !== currentTurnId || r.state !== 'playing') {
                    r.botThinking = false;
                    return;
                }
                botPlay(r, roomId);
            }, delay);
        }
    }, 500);
};
