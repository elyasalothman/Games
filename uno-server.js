module.exports = function(io) {
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

    io.on('connection', (socket) => {
        socket.on('joinUno', ({ name, room, mode }) => {
            const roomId = room || 'uno_public';
            socket.join(roomId);
            socket.unoRoomId = roomId;

            if (!unoRooms[roomId]) {
                unoRooms[roomId] = {
                    players: {}, turnOrder: [], currentTurn: 0, direction: 1,
                    deck: createUnoDeck(), discardPile: [], currentColor: '',
                    state: 'waiting', maxPlayers: mode === 'private' ? 8 : 5
                };
            }

            const r = unoRooms[roomId];
            if (Object.keys(r.players).length >= r.maxPlayers && !r.players[socket.id]) {
                socket.emit('chatMessage', { name: 'نظام', msg: 'الغرفة ممتلئة!' });
                return;
            }

            r.players[socket.id] = { id: socket.id, name: name || 'لاعب', cards: [], isBot: false };

            if (mode === 'computer' && Object.keys(r.players).length === 1) {
                for (let i = 1; i < r.maxPlayers; i++) {
                    const botId = 'bot_uno_' + i;
                    r.players[botId] = { id: botId, name: '🤖 بوت ' + i, cards: [], isBot: true };
                }
            }
            io.to(roomId).emit('unoGameState', r);
        });

        socket.on('startUno', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'waiting') return;

            r.turnOrder = Object.keys(r.players);
            r.turnOrder.forEach(id => {
                r.players[id].cards = r.deck.splice(0, 7); // توزيع 7 أوراق
            });

            // سحب أول ورقة (يجب ألا تكون +4 أو Wild مبدئياً لتبسيط اللعب)
            let firstCard;
            do {
                firstCard = r.deck.splice(0, 1)[0];
                if (firstCard.color === 'wild') r.deck.push(firstCard);
            } while (firstCard.color === 'wild');
            
            r.discardPile.push(firstCard);
            r.currentColor = firstCard.color;
            r.state = 'playing';
            io.to(socket.unoRoomId).emit('unoGameState', r);
        });

        socket.on('playUnoCard', ({ cardIndex, selectedColor }) => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'playing' || r.turnOrder[r.currentTurn] !== socket.id) return;

            const player = r.players[socket.id];
            const card = player.cards[cardIndex];
            if (!card) return;
            const topCard = r.discardPile[r.discardPile.length - 1];

            if (isValidPlay(card, topCard, r.currentColor)) {
                player.cards.splice(cardIndex, 1);
                r.discardPile.push(card);
                r.currentColor = card.color === 'wild' ? selectedColor : card.color;

                // تطبيق تأثير الأوراق
                if (card.value === 'Reverse') {
                    r.direction *= -1;
                    if (r.turnOrder.length === 2) r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length; // كأنها تخطي في لاعبين
                } else if (card.value === 'Skip') {
                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                } else if (card.value === '+2') {
                    const nextPlayer = r.turnOrder[(r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length];
                    r.players[nextPlayer].cards.push(...r.deck.splice(0, 2));
                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length; // تخطي بعد السحب
                } else if (card.value === '+4') {
                    const nextPlayer = r.turnOrder[(r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length];
                    r.players[nextPlayer].cards.push(...r.deck.splice(0, 4));
                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length; // تخطي بعد السحب
                }

                // التحقق من الفوز
                if (player.cards.length === 0) {
                    r.state = 'waiting';
                    io.to(socket.unoRoomId).emit('chatMessage', { name: 'نظام', msg: `🎉 فاز ${player.name} باللعبة!` });
                } else {
                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                }
                io.to(socket.unoRoomId).emit('unoGameState', r);
            }
        });

        socket.on('drawUnoCard', () => {
            const r = unoRooms[socket.unoRoomId];
            if (!r || r.state !== 'playing' || r.turnOrder[r.currentTurn] !== socket.id) return;

            if (r.deck.length === 0) {
                const top = r.discardPile.pop();
                r.deck = r.discardPile.sort(() => Math.random() - 0.5);
                r.discardPile = [top];
            }
            
            r.players[socket.id].cards.push(r.deck.pop());
            r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
            io.to(socket.unoRoomId).emit('unoGameState', r);
        });

        socket.on('disconnect', () => {
            if (socket.unoRoomId && unoRooms[socket.unoRoomId]) {
                delete unoRooms[socket.unoRoomId].players[socket.id];
                
                const hasReal = Object.values(unoRooms[socket.unoRoomId].players).some(p => !p.isBot);
                if (!hasReal) {
                    delete unoRooms[socket.unoRoomId];
                } else {
                    io.to(socket.unoRoomId).emit('unoGameState', unoRooms[socket.unoRoomId]);
                }
            }
        });
    });

    // ذكاء اصطناعي لبوتات الأونو
    setInterval(() => {
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
                                const card = player.cards.splice(i, 1)[0];
                                r.discardPile.push(card);
                                r.currentColor = card.color === 'wild' ? selectedColor : card.color;
                                
                                // تطبيق تأثير الأوراق الخاصة بالبوت
                                if (card.value === 'Reverse') {
                                    r.direction *= -1;
                                    if (r.turnOrder.length === 2) r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                                } else if (card.value === 'Skip') {
                                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                                } else if (card.value === '+2') {
                                    const nextPlayer = r.turnOrder[(r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length];
                                    r.players[nextPlayer].cards.push(...r.deck.splice(0, 2));
                                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                                } else if (card.value === '+4') {
                                    const nextPlayer = r.turnOrder[(r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length];
                                    r.players[nextPlayer].cards.push(...r.deck.splice(0, 4));
                                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                                }

                                // التحقق من فوز البوت
                                if (player.cards.length === 0) {
                                    r.state = 'waiting';
                                    io.to(roomId).emit('chatMessage', { name: 'نظام', msg: `🤖 فاز ${player.name} باللعبة!` });
                                } else {
                                    r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                                }
                                
                                played = true;
                                io.to(roomId).emit('unoGameState', r);
                                break;
                            }
                        }
                        
                        if (!played) {
                            player.cards.push(r.deck.pop());
                            r.currentTurn = (r.currentTurn + r.direction + r.turnOrder.length) % r.turnOrder.length;
                            io.to(roomId).emit('unoGameState', r);
                        }
                        r.botThinking = false;
                    }, 1500);
                }
            }
        }
    }, 1000);
};