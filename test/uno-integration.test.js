const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const attachUno = require('../uno-server');

function startServer() {
    return new Promise((resolve) => {
        const httpServer = http.createServer();
        const io = new Server(httpServer, { cors: { origin: '*' } });
        const game = attachUno(io, { startBotLoop: false });
        httpServer.listen(0, () => resolve({ httpServer, game, port: httpServer.address().port }));
    });
}

function connectClient(port) {
    return new Promise((resolve, reject) => {
        const socket = ioClient(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
    });
}

function waitForEvent(socket, event) {
    return new Promise((resolve) => socket.once(event, resolve));
}

test('two real socket.io clients join a private room over the wire and never see each other\'s hidden cards', async () => {
    const { httpServer, port } = await startServer();
    try {
        const host = await connectClient(port);
        const guest = await connectClient(port);

        const hostJoined = waitForEvent(host, 'unoGameState');
        host.emit('joinUno', { name: 'Host', room: 'integration_room_1', mode: 'private', token: 'itest_host_token_123' });
        await hostJoined;

        const guestJoined = waitForEvent(guest, 'unoGameState');
        guest.emit('joinUno', { name: 'Guest', room: 'integration_room_1', mode: 'private', token: 'itest_guest_token_12' });
        const guestJoinState = await guestJoined;
        assert.equal(guestJoinState.maxPlayers, 8);

        const bothStart = Promise.all([waitForEvent(host, 'unoGameState'), waitForEvent(guest, 'unoGameState')]);
        host.emit('startUno');
        const [hostState, guestState] = await bothStart;

        assert.equal(hostState.state, 'playing');
        assert.equal(hostState.players.itest_host_token_123.cards.length, 7);
        assert.equal(hostState.players.itest_guest_token_12.cards.length, 0, "opponent hand must be hidden over the wire");
        assert.equal(hostState.players.itest_guest_token_12.cardCount, 7);
        assert.equal(guestState.players.itest_guest_token_12.cards.length, 7);
        assert.equal(guestState.players.itest_host_token_123.cards.length, 0);

        host.close();
        guest.close();
    } finally {
        httpServer.close();
    }
});

test('drawing then passing over the wire correctly advances the turn to the other real client', async () => {
    const { httpServer, game, port } = await startServer();
    try {
        const host = await connectClient(port);
        const guest = await connectClient(port);
        host.emit('joinUno', { name: 'Host', room: 'integration_room_2', mode: 'private', token: 'itest2_host_token_12' });
        await waitForEvent(host, 'unoGameState');
        guest.emit('joinUno', { name: 'Guest', room: 'integration_room_2', mode: 'private', token: 'itest2_guest_token_1' });
        await waitForEvent(guest, 'unoGameState');
        host.emit('startUno');
        await waitForEvent(host, 'unoGameState');

        const room = game.rooms.integration_room_2;
        room.turnOrder = ['itest2_host_token_12', 'itest2_guest_token_1'];
        room.currentTurn = 0;
        room.currentColor = 'red';
        room.discardPile = [{ color: 'red', value: '5' }];
        room.players.itest2_host_token_12.cards = [{ color: 'blue', value: '2' }];
        room.deck = [{ color: 'green', value: '9' }];

        const drawnStatePromise = waitForEvent(host, 'unoGameState');
        host.emit('drawUnoCard');
        const drawnState = await drawnStatePromise;
        assert.equal(drawnState.hasDrawnThisTurn, true);
        assert.equal(drawnState.turnOrder[drawnState.currentTurn], 'itest2_host_token_12');

        const secondDraw = waitForEvent(host, 'unoGameState');
        host.emit('drawUnoCard');
        const raceGuard = await Promise.race([secondDraw, new Promise((resolve) => setTimeout(() => resolve('timeout'), 250))]);
        assert.equal(raceGuard, 'timeout', 'server must not allow a second draw in the same turn');

        const passStates = Promise.all([waitForEvent(host, 'unoGameState'), waitForEvent(guest, 'unoGameState')]);
        host.emit('passUnoTurn');
        const [afterPassHost, afterPassGuest] = await passStates;
        assert.equal(afterPassHost.turnOrder[afterPassHost.currentTurn], 'itest2_guest_token_1');
        assert.equal(afterPassGuest.turnOrder[afterPassGuest.currentTurn], 'itest2_guest_token_1');
        assert.equal(afterPassHost.hasDrawnThisTurn, false);

        host.close();
        guest.close();
    } finally {
        httpServer.close();
    }
});

test('a real client that disconnects mid-round and reconnects with the same token gets its hand back, not a reset room', async () => {
    const { httpServer, game, port } = await startServer();
    try {
        const host = await connectClient(port);
        const guest = await connectClient(port);
        host.emit('joinUno', { name: 'Host', room: 'integration_room_3', mode: 'private', token: 'itest3_host_token_12' });
        await waitForEvent(host, 'unoGameState');
        guest.emit('joinUno', { name: 'Guest', room: 'integration_room_3', mode: 'private', token: 'itest3_guest_token_1' });
        await waitForEvent(guest, 'unoGameState');
        host.emit('startUno');
        await waitForEvent(host, 'unoGameState');

        const room = game.rooms.integration_room_3;
        const handBefore = room.players.itest3_host_token_12.cards.length;

        const guestSeesDisconnect = waitForEvent(guest, 'unoMessage');
        host.close();
        await guestSeesDisconnect;
        assert.equal(room.players.itest3_host_token_12.connected, false);
        assert.equal(room.state, 'playing', 'the round must not reset immediately on disconnect');

        const hostAgain = await connectClient(port);
        const reconnectState = waitForEvent(hostAgain, 'unoGameState');
        hostAgain.emit('joinUno', { name: 'Host', room: 'integration_room_3', mode: 'private', token: 'itest3_host_token_12' });
        const state = await reconnectState;
        assert.equal(state.players.itest3_host_token_12.cards.length, handBefore);
        assert.equal(state.state, 'playing');

        hostAgain.close();
        guest.close();
    } finally {
        httpServer.close();
    }
});
