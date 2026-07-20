const test = require('node:test');
const assert = require('node:assert/strict');
const attachUno = require('../uno-server');

class FakeSocket {
    constructor(id) {
        this.id = id;
        this.handlers = {};
        this.emitted = [];
    }

    on(event, handler) {
        this.handlers[event] = handler;
    }

    emit(event, payload) {
        this.emitted.push({ event, payload });
    }

    join() {}

    trigger(event, payload) {
        this.handlers[event](payload);
    }
}

function createGame() {
    const emissions = [];
    const socketRooms = {};
    const io = {
        on(event, handler) {
            assert.equal(event, 'connection');
            this.connect = handler;
        },
        to(target) {
            return {
                emit(event, payload) {
                    emissions.push({ target, event, payload });
                    if (socketRooms[target]) socketRooms[target].emit(event, payload);
                }
            };
        }
    };
    const game = attachUno(io, { startBotLoop: false });
    const connect = (socket) => {
        socketRooms[socket.id] = socket;
        io.connect(socket);
    };
    return { game, connect, emissions };
}

function join(socket, connect, { name, room, mode, token }) {
    connect(socket);
    socket.trigger('joinUno', { name, room, mode, token: token || `${socket.id}_token_abcdefgh` });
}

function lastStateFor(socket) {
    const states = socket.emitted.filter((e) => e.event === 'unoGameState');
    return states.at(-1).payload;
}

test('private rooms keep hands private, use full 108-card deck, and shuffle seating', () => {
    const { game, connect } = createGame();
    const host = new FakeSocket('host');
    const guest = new FakeSocket('guest');
    join(host, connect, { name: 'Host', room: 'uno_share_123', mode: 'private', token: 'host_token_12345678' });
    join(guest, connect, { name: 'Guest', room: 'uno_share_123', mode: 'private', token: 'guest_token_1234567' });
    host.trigger('startUno');

    const room = game.rooms.uno_share_123;
    assert.equal(room.maxPlayers, 8);
    assert.equal(room.state, 'playing');
    assert.equal(room.players.host_token_12345678.cards.length, 7);
    assert.equal(room.turnOrder.length, 2);

    const deckCount = room.deck.length + room.discardPile.length + Object.values(room.players).reduce((sum, p) => sum + p.cards.length, 0);
    assert.equal(deckCount, 108);

    const guestState = lastStateFor(guest);
    assert.equal(guestState.players.host_token_12345678.cards.length, 0);
    assert.equal(guestState.players.host_token_12345678.cardCount, 7);
    assert.equal(guestState.players.guest_token_1234567.cards.length, 7);
});

test('each new room gets an independently shuffled deck (real random luck, not a fixed order)', () => {
    const serialize = (deck) => deck.map((c) => `${c.color}${c.value}`).join(',');
    const orders = new Set();
    for (let i = 0; i < 5; i++) {
        const { game, connect } = createGame();
        const host = new FakeSocket(`h${i}`);
        join(host, connect, { name: 'H', room: `uno_shuffle_test_${i}`, mode: 'private', token: `h${i}_token_1234567` });
        orders.add(serialize(game.rooms[`uno_shuffle_test_${i}`].deck));
    }
    assert.equal(orders.size, 5, 'five independently shuffled decks should not collide');
});

test('Skip advances past exactly one player; winning a round resets and records the score', () => {
    const { game, connect } = createGame();
    const first = new FakeSocket('first');
    const second = new FakeSocket('second');
    const third = new FakeSocket('third');
    join(first, connect, { name: 'P0', room: 'uno_round_123', mode: 'private', token: 'first_token_1234567' });
    join(second, connect, { name: 'P1', room: 'uno_round_123', mode: 'private', token: 'second_token_123456' });
    join(third, connect, { name: 'P2', room: 'uno_round_123', mode: 'private', token: 'third_token_1234567' });

    const room = game.rooms.uno_round_123;
    room.state = 'playing';
    room.turnOrder = ['first_token_1234567', 'second_token_123456', 'third_token_1234567'];
    room.currentTurn = 0;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '4' }];
    room.players.first_token_1234567.cards = [{ color: 'red', value: 'Skip' }, { color: 'blue', value: '1' }];
    first.trigger('playUnoCard', { cardIndex: 0, selectedColor: null });
    assert.equal(room.currentTurn, 2);

    room.currentTurn = 0;
    room.currentColor = 'blue';
    room.discardPile = [{ color: 'blue', value: '3' }];
    room.players.first_token_1234567.cards = [{ color: 'blue', value: '9' }];
    first.trigger('playUnoCard', { cardIndex: 0, selectedColor: null });
    assert.equal(room.state, 'waiting');
    assert.deepEqual(room.turnOrder, []);
    assert.equal(room.discardPile.length, 0);
    assert.equal(room.players.first_token_1234567.wins, 1);

    const resultMsg = first.emitted.find((e) => e.event === 'unoRoundResult');
    assert.equal(resultMsg.payload.winnerToken, 'first_token_1234567');
});

test('Wild Draw Four challenge: a legitimate +4 punishes the wrongful challenger with 6 cards', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1');
    const p2 = new FakeSocket('p2');
    join(p1, connect, { name: 'A', room: 'uno_challenge_1', mode: 'private', token: 'p1_token_123456789a' });
    join(p2, connect, { name: 'B', room: 'uno_challenge_1', mode: 'private', token: 'p2_token_123456789b' });

    const room = game.rooms.uno_challenge_1;
    room.state = 'playing';
    room.turnOrder = ['p1_token_123456789a', 'p2_token_123456789b'];
    room.currentTurn = 0;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '5' }];
    // Player A has no red card at all, so the +4 is fully legitimate.
    room.players.p1_token_123456789a.cards = [{ color: 'wild', value: '+4' }, { color: 'blue', value: '2' }];
    room.players.p2_token_123456789b.cards = [{ color: 'green', value: '3' }];

    p1.trigger('playUnoCard', { cardIndex: 0, selectedColor: 'blue' });
    assert.ok(room.pendingChallenge);
    assert.equal(room.pendingChallenge.target, 'p2_token_123456789b');

    p2.trigger('resolveUnoChallenge', { accept: false });
    assert.equal(room.pendingChallenge, null);
    assert.equal(room.players.p2_token_123456789b.cards.length, 1 + 6);
});

test('Wild Draw Four challenge: an illegitimate +4 backfires on the bluffer', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1');
    const p2 = new FakeSocket('p2');
    join(p1, connect, { name: 'A', room: 'uno_challenge_2', mode: 'private', token: 'p1_token_223456789a' });
    join(p2, connect, { name: 'B', room: 'uno_challenge_2', mode: 'private', token: 'p2_token_223456789b' });

    const room = game.rooms.uno_challenge_2;
    room.state = 'playing';
    room.turnOrder = ['p1_token_223456789a', 'p2_token_223456789b'];
    room.currentTurn = 0;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '5' }];
    // Player A is bluffing: still holds a red card after playing +4.
    room.players.p1_token_223456789a.cards = [{ color: 'wild', value: '+4' }, { color: 'red', value: '7' }];
    room.players.p2_token_223456789b.cards = [{ color: 'green', value: '3' }];

    p1.trigger('playUnoCard', { cardIndex: 0, selectedColor: 'blue' });
    p2.trigger('resolveUnoChallenge', { accept: false });

    assert.equal(room.pendingChallenge, null);
    assert.equal(room.players.p1_token_223456789a.cards.length, 1 + 4);
    assert.equal(room.players.p2_token_223456789b.cards.length, 1);
});

test('UNO call and catch: forgetting to declare costs two penalty cards', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1');
    const p2 = new FakeSocket('p2');
    join(p1, connect, { name: 'A', room: 'uno_call_1', mode: 'private', token: 'p1_token_323456789a' });
    join(p2, connect, { name: 'B', room: 'uno_call_1', mode: 'private', token: 'p2_token_323456789b' });

    const room = game.rooms.uno_call_1;
    room.state = 'playing';
    room.turnOrder = ['p1_token_323456789a', 'p2_token_323456789b'];
    room.currentTurn = 0;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '5' }];
    room.players.p1_token_323456789a.cards = [{ color: 'red', value: '2' }, { color: 'blue', value: '9' }];

    p1.trigger('playUnoCard', { cardIndex: 0, selectedColor: null });
    assert.equal(room.players.p1_token_323456789a.cards.length, 1);
    assert.equal(room.players.p1_token_323456789a.saidUno, false);

    p2.trigger('catchUno', { targetToken: 'p1_token_323456789a' });
    assert.equal(room.players.p1_token_323456789a.cards.length, 3);
    assert.equal(room.players.p1_token_323456789a.saidUno, true);

    // Once caught, a second catch attempt should not apply another penalty.
    p2.trigger('catchUno', { targetToken: 'p1_token_323456789a' });
    assert.equal(room.players.p1_token_323456789a.cards.length, 3);
});

test('UNO call and catch: declaring in time prevents a catch penalty', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1');
    const p2 = new FakeSocket('p2');
    join(p1, connect, { name: 'A', room: 'uno_call_2', mode: 'private', token: 'p1_token_423456789a' });
    join(p2, connect, { name: 'B', room: 'uno_call_2', mode: 'private', token: 'p2_token_423456789b' });

    const room = game.rooms.uno_call_2;
    room.state = 'playing';
    room.turnOrder = ['p1_token_423456789a', 'p2_token_423456789b'];
    room.currentTurn = 0;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '5' }];
    room.players.p1_token_423456789a.cards = [{ color: 'red', value: '2' }, { color: 'blue', value: '9' }];

    p1.trigger('playUnoCard', { cardIndex: 0, selectedColor: null });
    p1.trigger('declareUno');
    assert.equal(room.players.p1_token_423456789a.saidUno, true);

    p2.trigger('catchUno', { targetToken: 'p1_token_423456789a' });
    assert.equal(room.players.p1_token_423456789a.cards.length, 1);
});

test('Draw then pass: a player who draws cannot draw again and must pass or play the drawn card', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1');
    const p2 = new FakeSocket('p2');
    join(p1, connect, { name: 'A', room: 'uno_draw_1', mode: 'private', token: 'p1_token_523456789a' });
    join(p2, connect, { name: 'B', room: 'uno_draw_1', mode: 'private', token: 'p2_token_523456789b' });

    const room = game.rooms.uno_draw_1;
    room.state = 'playing';
    room.turnOrder = ['p1_token_523456789a', 'p2_token_523456789b'];
    room.currentTurn = 0;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '5' }];
    room.players.p1_token_523456789a.cards = [{ color: 'blue', value: '2' }];
    room.deck = [{ color: 'green', value: '1' }, { color: 'green', value: '1' }];

    p1.trigger('drawUnoCard');
    assert.equal(room.hasDrawnThisTurn, true);
    assert.equal(room.turnOrder[room.currentTurn], 'p1_token_523456789a');

    const cardsBefore = room.players.p1_token_523456789a.cards.length;
    p1.trigger('drawUnoCard');
    assert.equal(room.players.p1_token_523456789a.cards.length, cardsBefore, 'second draw in the same turn must be rejected');

    p1.trigger('passUnoTurn');
    assert.equal(room.turnOrder[room.currentTurn], 'p2_token_523456789b');
    assert.equal(room.hasDrawnThisTurn, false);
});

test('reconnecting with the same token restores the hand instead of resetting the round', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1a');
    const p2 = new FakeSocket('p2a');
    join(p1, connect, { name: 'A', room: 'uno_reconnect_1', mode: 'private', token: 'stable_token_abcdefg' });
    join(p2, connect, { name: 'B', room: 'uno_reconnect_1', mode: 'private', token: 'p2_token_623456789b' });
    p1.trigger('startUno');

    const room = game.rooms.uno_reconnect_1;
    assert.equal(room.state, 'playing');
    const handBeforeDisconnect = room.players.stable_token_abcdefg.cards.length;

    p1.trigger('disconnect');
    assert.equal(room.players.stable_token_abcdefg.connected, false);
    assert.equal(room.state, 'playing', 'round must not reset immediately on disconnect');

    const p1Again = new FakeSocket('p1b');
    join(p1Again, connect, { name: 'A', room: 'uno_reconnect_1', mode: 'private', token: 'stable_token_abcdefg' });
    assert.equal(room.players.stable_token_abcdefg.connected, true);
    assert.equal(room.players.stable_token_abcdefg.cards.length, handBeforeDisconnect);
    assert.equal(room.state, 'playing');
});

// Builds a deck array where `.pop()` (drawing from the end) yields, in order:
// `dealCount` filler cards (for dealing), then `topCard` (the opening flip),
// then `penaltyCount` filler cards (for any forced draw the opening card causes).
function buildDeckForOpening(topCard, dealCount, penaltyCount = 0) {
    const dealFiller = Array.from({ length: dealCount }, () => ({ color: 'blue', value: '1' }));
    const penaltyFiller = Array.from({ length: penaltyCount }, () => ({ color: 'green', value: '2' }));
    return [...penaltyFiller, topCard, ...dealFiller];
}

test('an opening action card applies its effect before the first turn (official rule)', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1');
    const p2 = new FakeSocket('p2');
    const p3 = new FakeSocket('p3');
    join(p1, connect, { name: 'A', room: 'uno_open_1', mode: 'private', token: 'p1_token_723456789a' });
    join(p2, connect, { name: 'B', room: 'uno_open_1', mode: 'private', token: 'p2_token_723456789b' });
    join(p3, connect, { name: 'C', room: 'uno_open_1', mode: 'private', token: 'p3_token_723456789c' });

    const room = game.rooms.uno_open_1;
    // Seating is randomized at start, so assert relative to whichever seating actually resulted.
    room.deck = buildDeckForOpening({ color: 'red', value: 'Skip' }, 21);
    room.state = 'waiting';
    p1.trigger('startUno');

    assert.equal(room.discardPile.at(-1).value, 'Skip');
    assert.equal(room.turnOrder.length, 3);
    assert.equal(room.turnOrder[room.currentTurn], room.turnOrder[1], 'opening Skip must skip seat 0 and start at seat 1');
});

test('an opening +2 forces the first player to draw and lose their turn', () => {
    const { game, connect } = createGame();
    const p1 = new FakeSocket('p1');
    const p2 = new FakeSocket('p2');
    join(p1, connect, { name: 'A', room: 'uno_open_2', mode: 'private', token: 'p1_token_823456789a' });
    join(p2, connect, { name: 'B', room: 'uno_open_2', mode: 'private', token: 'p2_token_823456789b' });

    const room = game.rooms.uno_open_2;
    room.deck = buildDeckForOpening({ color: 'red', value: '+2' }, 14, 2);
    room.state = 'waiting';
    p1.trigger('startUno');

    assert.equal(room.discardPile.at(-1).value, '+2');
    const firstSeat = room.turnOrder[0];
    const secondSeat = room.turnOrder[1];
    assert.equal(room.players[firstSeat].cards.length, 7 + 2, 'first seat draws 2 from an opening +2');
    assert.equal(room.turnOrder[room.currentTurn], secondSeat);
});

test('a bot resolves a +4 challenge against another bot quickly, instead of freezing for the human AFK timeout', async () => {
    const { game, connect } = createGame();
    const human = new FakeSocket('human1');
    join(human, connect, { name: 'Human', room: 'uno_bot_challenge_1', mode: 'computer', token: 'human_token_9234567a' });

    const room = game.rooms.uno_bot_challenge_1;
    const botTokens = Object.keys(room.players).filter((t) => t !== 'human_token_9234567a');
    assert.ok(botTokens.length >= 2, 'computer mode should add bot opponents');

    room.state = 'playing';
    room.turnOrder = ['human_token_9234567a', ...botTokens];
    room.currentTurn = 1;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '5' }];
    room.players[botTokens[0]].cards = [{ color: 'wild', value: '+4' }];
    room.players[botTokens[1]].cards = [{ color: 'green', value: '3' }];
    room.pendingChallenge = { by: botTokens[0], target: botTokens[1], previousColor: 'red', illegal: false, createdAt: Date.now() };

    game.gameLoop();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    assert.equal(room.pendingChallenge, null, 'the bot must resolve well before the 15s human-AFK timeout');
});

test('a full round trip through the bot loop keeps the deck at exactly 108 cards', () => {
    const { game, connect } = createGame();
    const host = new FakeSocket('bothost');
    join(host, connect, { name: 'Host', room: 'uno_bot_conservation', mode: 'computer', token: 'bot_host_token_12345' });
    host.trigger('startUno');

    const room = game.rooms.uno_bot_conservation;
    const total = () => room.deck.length + room.discardPile.length + Object.values(room.players).reduce((sum, p) => sum + p.cards.length, 0);
    assert.equal(total(), 108);
});

// Regression test for a "the turn never advances" style freeze (e.g. after a
// Reverse card): plays several complete all-bot rounds end-to-end, driving the
// same setTimeout-based bot decision path the real server uses, and asserts
// forward progress is always made instead of stalling on one player forever.
test('an all-bot game runs multiple full rounds without ever freezing on one turn', async () => {
    const realSetTimeout = global.setTimeout;
    global.setTimeout = (fn) => { fn(); return 0; };
    try {
        const { game, connect } = createGame();
        const host = new FakeSocket('fuzzhost');
        join(host, connect, { name: 'Host', room: 'uno_fuzz_1', mode: 'computer', token: 'fuzz_host_token_1234' });
        host.trigger('startUno');

        const room = game.rooms.uno_fuzz_1;
        Object.values(room.players).forEach((p) => { p.isBot = true; });

        let roundsCompleted = 0;
        let stuckTurnToken = room.turnOrder[room.currentTurn];
        let stuckCount = 0;
        const MAX_TICKS = 4000;

        for (let tick = 0; tick < MAX_TICKS && roundsCompleted < 3; tick++) {
            const beforeToken = room.turnOrder[room.currentTurn];
            const beforeDiscard = room.discardPile.length;
            const beforeCardsTotal = Object.values(room.players).reduce((sum, p) => sum + p.cards.length, 0);
            const beforeState = room.state;

            game.gameLoop();

            const madeProgress = room.turnOrder[room.currentTurn] !== beforeToken
                || room.discardPile.length !== beforeDiscard
                || Object.values(room.players).reduce((sum, p) => sum + p.cards.length, 0) !== beforeCardsTotal
                || room.state !== beforeState;

            if (room.state === 'waiting') {
                roundsCompleted++;
                if (roundsCompleted < 3) host.trigger('startUno');
                stuckTurnToken = room.turnOrder[room.currentTurn];
                stuckCount = 0;
                continue;
            }

            if (room.turnOrder[room.currentTurn] === stuckTurnToken && !madeProgress) {
                stuckCount++;
            } else {
                stuckCount = 0;
                stuckTurnToken = room.turnOrder[room.currentTurn];
            }

            assert.ok(stuckCount < 50, `game appears frozen: no progress for ${stuckCount} ticks on the same turn`);

            const total = room.deck.length + room.discardPile.length + Object.values(room.players).reduce((sum, p) => sum + p.cards.length, 0);
            assert.equal(total, 108, 'no cards may be lost or duplicated while the loop runs');
        }

        assert.equal(roundsCompleted, 3, 'all three rounds should finish, proving the game never permanently stalls');
    } finally {
        global.setTimeout = realSetTimeout;
    }
});
