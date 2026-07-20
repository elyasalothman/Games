module.exports = function(io, options = {}) {
    const unoRooms = {};
    const COLORS = ['red', 'blue', 'green', 'yellow'];
    const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];

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
        return deck.sort(() => Math.random() - 0.5);
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

    function nextTurn(room, steps = 1) {
        room.currentTurn = (room.currentTurn + (room.direction * steps) + room.turnOrder.length * steps) % room.turnOrder.length;
    }

    function drawCard(room) {
        if (room.deck.length === 0 && room.discardPile.length > 1) {
            const topCard = room.discardPile.pop();
            room.deck = room.discardPile.sort(() => Math.random() - 0.5);
            room.discardPile = [topCard];
        }
        return room.deck.pop() || null;
    }

    function drawCards(room, player, count) {
        for (let i = 0; i < count; i++) {
            const card = drawCard(room);
            if (card) player.cards.push(card);
        }
    }

    function resetRound(room) {
        room.turnOrder = [];
        room.currentTurn = 0;
        room.direction = 1;
        room.deck = createUnoDeck();
        room.discardPile = [];
        room.currentColor = '';
        room.state = 'waiting';
    }

    function stateForPlayer(room, playerId) {
        const players = {};
        Object.values(room.players).forEach((player) => {
            players[player.id] = {
                id: player.id,
                name: player.name,
                isBot: player.isBot,
                cardCount: player.cards.length,
                cards: player.id === playerId ? player.cards : []
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
            hostId: room.hostId,
            maxPlayers: room.maxPlayers
        };
    }

    function emitRoomState(roomId) {
        const room = unoRooms[roomId];
        if (!room) return;
        Object.values(room.players)
            .filter((player) => !player.isBot)
            .forEach((player) => io.to(player.id).emit('unoGameState', stateForPlayer(room, player.id)));
    }

    function emitRoomMessage(roomId, message) {
        const room = unoRooms[roomId];
        if (!room) return;
        Object.values(room.players)
            .filter((player) => !player.isBot)
            .forEach((player) => io.to(player.id).emit('unoMessage', message));
    }

    function finishRound(roomId, winner) {
        const room = unoRooms[roomId];
        if (!room) return;
        room.lastWinner = winner.name;
        resetRound(room);
        emitRoomMessage(roomId, `🎉 فاز ${winner.name} بالجولة! اضغط ابدأ لجولة جديدة.`);
        emitRoomState(roomId);
    }

    function applyCard(room, player, card, selectedColor) {
        room.discardPile.push(card);
        room.currentColor = card.color === 'wild' ? selectedColor : card.color;

        if (card.value === 'Reverse') {
            room.direction *= -1;
            nextTurn(room, room.turnOrder.length === 2 ? 2 : 1);
        } else if (card.value === 'Skip') {
            nextTurn(room, 2);
        } else if (card.value === '+2' || card.value === '+4') {
            const nextPlayerId = room.turnOrder[(room.currentTurn + room.direction + room.turnOrder.length) % room.turnOrder.length];
            drawCards(room, room.players[nextPlayerId], card.value === '+2' ? 2 : 4);
            nextTurn(room, 2);
        } else {
            nextTurn(room);
        }
    }

    function playCard(roomId, playerId, cardIndex, selectedColor) {
        const room = unoRooms[roomId];
        if (!room || room.state !== 'playing' || room.turnOrder[room.currentTurn] !== playerId) return false;
        const player = room.players[playerId];
        const card = player && player.cards[cardIndex];
        const topCard = room.discardPile[room.discardPile.length - 1];
        if (!card || !isValidPlay(card, topCard, room.currentColor)) return false;
        if (card.color === 'wild' && !COLORS.includes(selectedColor)) return false;

        player.cards.splice(cardIndex, 1);
        applyCard(room, player, card, selectedColor);
        if (player.cards.length === 0) finishRound(roomId, player);
        else emitRoomState(roomId);
        return true;
    }

    io.on('connection', (socket) => {
        socket.on('joinUno', ({ name, room, mode }) => {
            const roomId = room || 'public_uno';
            if (!validRoomId(roomId)) {
                socket.emit('unoMessage', 'اسم الغرفة غير صالح.');
                return;
            }

            if (!unoRooms[roomId]) {
                unoRooms[roomId] = {
                    players: {}, turnOrder: [], currentTurn: 0, direction: 1,
                    deck: createUnoDeck(), discardPile: [], currentColor: '',
                    state: 'waiting', maxPlayers: mode === 'private' ? 8 : 5,
                    hostId: socket.id
                };
            }

            const r = unoRooms[roomId];
            if (Object.keys(r.players).length >= r.maxPlayers && !r.players[socket.id]) {
                socket.emit('unoMessage', 'الغرفة ممتلئة، جرّب غرفة أخرى.');
                return;
            }
            if (r.state === 'playing' && !r.players[socket.id]) {
                socket.emit('unoMessage', 'الجولة بدأت بالفعل. انتظر الجولة التالية أو أنشئ غرفة جديدة.');
                return;
            }

            socket.join(roomId);
            socket.unoRoomId = roomId;
            r.players[socket.id] = { id: socket.id, name: name || 'لاعب', cards: [], isBot: false };

            if (mode === 'computer' && Object.keys(r.players).length === 1) {
                for (let i = 1; i < r.maxPlayers; i++) {
                    const botId = 'bot_uno_' + i;
                    r.players[botId] = { id: botId, name: '🤖 بوت ' + i, cards: [], isBot: true };
                }
            }
            emitRoomState(roomId);
        });

        socket.on('startUno', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'waiting' || r.hostId !== socket.id) return;

            r.turnOrder = Object.keys(r.players);
            r.turnOrder.forEach(id => {
                r.players[id].cards = [];
                drawCards(r, r.players[id], 7);
            });

            let firstCard;
            do {
                firstCard = drawCard(r);
                if (firstCard.color === 'wild') r.deck.push(firstCard);
            } while (firstCard.color === 'wild');
            
            r.discardPile.push(firstCard);
            r.currentColor = firstCard.color;
            r.state = 'playing';
            emitRoomState(socket.unoRoomId);
        });

        socket.on('playUnoCard', ({ cardIndex, selectedColor }) => {
            if (!playCard(socket.unoRoomId, socket.id, cardIndex, selectedColor)) {
                socket.emit('unoMessage', 'هذه الحركة غير مسموحة الآن.');
            }
        });

        socket.on('drawUnoCard', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'playing' || r.turnOrder[r.currentTurn] !== socket.id) return;

            drawCards(r, r.players[socket.id], 1);
            nextTurn(r);
            emitRoomState(socket.unoRoomId);
        });

        socket.on('disconnect', () => {
            if (socket.unoRoomId && unoRooms[socket.unoRoomId]) {
                const r = unoRooms[socket.unoRoomId];
                delete r.players[socket.id];
                
                const hasReal = Object.values(r.players).some(p => !p.isBot);
                if (!hasReal) {
                    delete unoRooms[socket.unoRoomId];
                } else {
                    r.hostId = r.hostId === socket.id ? Object.values(r.players).find(p => !p.isBot)?.id : r.hostId;
                    if (r.state === 'playing') resetRound(r);
                    emitRoomMessage(socket.unoRoomId, 'غادر لاعب الغرفة؛ تم إرجاعكم إلى غرفة الانتظار.');
                    emitRoomState(socket.unoRoomId);
                }
            }
        });
    });

    const botLoop = () => {
        for (let roomId in unoRooms) {
            const r = unoRooms[roomId];
            if (r.state === 'playing') {
                const currentTurnId = r.turnOrder[r.currentTurn];
                const player = r.players[currentTurnId];
                
                if (player && player.isBot && !r.botThinking) {
                    r.botThinking = true;
                    setTimeout(() => {
                        if (!unoRooms[roomId] || r.turnOrder[r.currentTurn] !== currentTurnId) {
                            r.botThinking = false; return;
                        }

                        const topCard = r.discardPile[r.discardPile.length - 1];
                        let played = false;

                        for (let i = 0; i < player.cards.length; i++) {
                            if (isValidPlay(player.cards[i], topCard, r.currentColor)) {
                                let selectedColor = r.currentColor;
                                if (player.cards[i].color === 'wild') {
                                    selectedColor = ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)];
                                }
                                playCard(roomId, player.id, i, selectedColor);
                                played = true;
                                break;
                            }
                        }
                        
                        if (!played) {
                            drawCards(r, player, 1);
                            nextTurn(r);
                            emitRoomState(roomId);
                        }
                        r.botThinking = false;
                    }, 1500);
                }
            }
        }
    };

    if (options.startBotLoop !== false) setInterval(botLoop, 1000);
    return { rooms: unoRooms, botLoop };
};