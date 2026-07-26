const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
    COLLECTIONS,
    FirestoreStorage,
    SQLiteStorage,
    getFirebaseCredentials
} = require('../storage');

class FakeSnapshot {
    constructor(value) {
        this.value = value;
        this.exists = value !== undefined;
    }

    data() {
        return this.value;
    }
}

class FakeDocument {
    constructor(db, pathParts) {
        this.db = db;
        this.path = pathParts.join('/');
        this.id = pathParts.at(-1);
    }

    async get() {
        return new FakeSnapshot(this.db.rows.get(this.path));
    }

    async set(value, options = {}) {
        const existing = this.db.rows.get(this.path) || {};
        this.db.rows.set(this.path, options.merge ? { ...existing, ...value } : value);
    }

    collection(name) {
        return new FakeCollection(this.db, [...this.path.split('/'), name]);
    }
}

class FakeCollection {
    constructor(db, pathParts) {
        this.db = db;
        this.pathParts = pathParts;
        this.sortField = null;
        this.sortDirection = 'asc';
        this.max = Infinity;
    }

    doc(id) {
        return new FakeDocument(this.db, [...this.pathParts, id]);
    }

    async add(value) {
        const id = `doc-${++this.db.counter}`;
        const ref = this.doc(id);
        await ref.set(value);
        return ref;
    }

    orderBy(field, direction) {
        const query = new FakeCollection(this.db, this.pathParts);
        query.sortField = field;
        query.sortDirection = direction;
        return query;
    }

    limit(max) {
        this.max = max;
        return this;
    }

    async get() {
        const prefix = `${this.pathParts.join('/')}/`;
        const depth = this.pathParts.length + 1;
        let docs = [...this.db.rows.entries()]
            .filter(([key]) => key.startsWith(prefix) && key.split('/').length === depth)
            .map(([key, value]) => ({
                id: key.split('/').at(-1),
                data: () => value
            }));
        if (this.sortField) {
            const multiplier = this.sortDirection === 'desc' ? -1 : 1;
            docs.sort((a, b) => (a.data()[this.sortField] - b.data()[this.sortField]) * multiplier);
        }
        return { docs: docs.slice(0, this.max) };
    }
}

class FakeFirestore {
    constructor() {
        this.rows = new Map();
        this.counter = 0;
    }

    collection(name) {
        return new FakeCollection(this, [name]);
    }
}

test('parses Firebase credentials from individual environment variables', () => {
    assert.deepEqual(getFirebaseCredentials({
        FIREBASE_PROJECT_ID: 'project',
        FIREBASE_CLIENT_EMAIL: 'service@example.com',
        FIREBASE_PRIVATE_KEY: 'line1\\nline2'
    }), {
        projectId: 'project',
        clientEmail: 'service@example.com',
        privateKey: 'line1\nline2'
    });
});

test('Firestore adapter stores users, progress, scores, and cloud saves', async () => {
    const db = new FakeFirestore();
    const storage = new FirestoreStorage(db);

    const user = await storage.upsertGoogleUser({
        google_id: 'google-123',
        email: 'player@example.com',
        name: 'Player',
        avatar_url: 'https://example.com/avatar.png'
    });
    assert.equal(user.id, 'google-123');
    assert.equal((await storage.getUserById('google-123')).email, 'player@example.com');

    await storage.saveUserData(user.id, { totalScore: 900, ach_first_play: true });
    assert.deepEqual((await storage.getUserSave(user.id)).data, {
        totalScore: 900,
        ach_first_play: true
    });

    await storage.addLeaderboardScore('snake', 'Low', 10);
    await storage.addLeaderboardScore('snake', 'High', 80);
    assert.deepEqual(await storage.getLeaderboard('snake', 'DESC'), [
        { player_name: 'High', score: 80 },
        { player_name: 'Low', score: 10 }
    ]);

    assert.equal(await storage.cloudSaveExists('ABC12345', 'invest'), false);
    await storage.saveCloudSave('ABC12345', 'invest', 'Player', { cash: 1200 });
    assert.equal(await storage.cloudSaveExists('ABC12345', 'invest'), true);
    assert.deepEqual((await storage.getCloudSave('ABC12345', 'invest')).data, { cash: 1200 });

    assert.ok(db.rows.has(`${COLLECTIONS.users}/google-123`));
});

test('SQLite fallback implements the same storage behavior', async () => {
    const dbPath = path.join(os.tmpdir(), `today-games-${process.pid}-${Date.now()}.db`);
    const storage = new SQLiteStorage(dbPath);
    try {
        await storage.init();
        const user = await storage.upsertGoogleUser({
            google_id: 'local-google',
            email: 'local@example.com',
            name: 'Local',
            avatar_url: ''
        });
        await storage.saveUserData(user.id, { totalScore: 50 });
        assert.deepEqual((await storage.getUserSave(user.id)).data, { totalScore: 50 });

        await storage.addLeaderboardScore('memory', 'A', 8);
        await storage.addLeaderboardScore('memory', 'B', 5);
        assert.deepEqual(await storage.getLeaderboard('memory', 'ASC'), [
            { player_name: 'B', score: 5 },
            { player_name: 'A', score: 8 }
        ]);

        await storage.saveCloudSave('ZXCVBN12', 'invest', 'Local', { day: 3 });
        assert.deepEqual((await storage.getCloudSave('ZXCVBN12', 'invest')).data, { day: 3 });
    } finally {
        await storage.close();
        fs.rmSync(dbPath, { force: true });
    }
});
