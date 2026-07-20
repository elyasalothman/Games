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
    const io = {
        on(event, handler) {
            assert.equal(event, 'connection');
            this.connect = handler;
        },
        to(target) {
            return {
                emit(event, payload) {
                    emissions.push({ target, event, payload });
                }
            };
        }
    };
    const game = attachUno(io, { startBotLoop: false });
    return { game, io, emissions };
}

test('private rooms keep hands private and accept a shareable room id', () => {
    const { game, io, emissions } = createGame();
    const host = new FakeSocket('host');
    const guest = new FakeSocket('guest');
    io.connect(host);
    io.connect(guest);

    host.trigger('joinUno', { name: 'Host', room: 'uno_share_123', mode: 'private' });
    guest.trigger('joinUno', { name: 'Guest', room: 'uno_share_123', mode: 'private' });
    host.trigger('startUno');

    const room = game.rooms.uno_share_123;
    assert.equal(room.maxPlayers, 8);
    assert.equal(room.state, 'playing');
    assert.equal(room.players.host.cards.length, 7);

    const guestState = emissions.filter((entry) => entry.target === 'guest' && entry.event === 'unoGameState').at(-1).payload;
    assert.equal(guestState.players.host.cards.length, 0);
    assert.equal(guestState.players.host.cardCount, 7);
    assert.equal(guestState.players.guest.cards.length, 7);
});

test('skip advances past exactly one player and a winner resets the room', () => {
    const { game, io } = createGame();
    const first = new FakeSocket('first');
    const second = new FakeSocket('second');
    const third = new FakeSocket('third');
    [first, second, third].forEach((socket) => io.connect(socket));
    [first, second, third].forEach((socket, index) => {
        socket.trigger('joinUno', { name: `P${index}`, room: 'uno_round_123', mode: 'private' });
    });

    const room = game.rooms.uno_round_123;
    room.state = 'playing';
    room.turnOrder = ['first', 'second', 'third'];
    room.currentTurn = 0;
    room.currentColor = 'red';
    room.discardPile = [{ color: 'red', value: '4' }];
    room.players.first.cards = [{ color: 'red', value: 'Skip' }, { color: 'blue', value: '1' }];
    room.players.second.cards = [];
    room.players.third.cards = [];
    first.trigger('playUnoCard', { cardIndex: 0, selectedColor: null });
    assert.equal(room.currentTurn, 2);

    room.currentTurn = 0;
    room.currentColor = 'blue';
    room.discardPile = [{ color: 'blue', value: '3' }];
    room.players.first.cards = [{ color: 'blue', value: '9' }];
    first.trigger('playUnoCard', { cardIndex: 0, selectedColor: null });
    assert.equal(room.state, 'waiting');
    assert.deepEqual(room.turnOrder, []);
    assert.equal(room.discardPile.length, 0);
    assert.equal(room.deck.length, 108);
});
