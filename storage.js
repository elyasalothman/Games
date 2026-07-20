const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const COLLECTIONS = {
    users: 'today_games_users',
    userSaves: 'today_games_user_saves',
    leaderboards: 'today_games_leaderboards',
    cloudSaves: 'today_games_cloud_saves'
};

function nowIso() {
    return new Date().toISOString();
}

function safeDocumentId(value) {
    return encodeURIComponent(String(value));
}

class FirestoreStorage {
    constructor(db) {
        this.db = db;
        this.type = 'firestore';
    }

    async init() {}

    async close() {}

    async getUserById(id) {
        const snapshot = await this.db.collection(COLLECTIONS.users).doc(String(id)).get();
        return snapshot.exists ? snapshot.data() : null;
    }

    async upsertGoogleUser({ google_id, email, name, avatar_url }) {
        const user = {
            id: google_id,
            google_id,
            email,
            name,
            avatar_url,
            updated_at: nowIso()
        };
        const ref = this.db.collection(COLLECTIONS.users).doc(google_id);
        const existing = await ref.get();
        if (!existing.exists) user.created_at = user.updated_at;
        await ref.set(user, { merge: true });
        return { ...(existing.exists ? existing.data() : {}), ...user };
    }

    async getUserSave(userId) {
        const snapshot = await this.db.collection(COLLECTIONS.userSaves).doc(String(userId)).get();
        if (!snapshot.exists) return { data: {}, updated_at: null };
        const row = snapshot.data();
        return { data: row.data || {}, updated_at: row.updated_at || null };
    }

    async saveUserData(userId, data) {
        const updated_at = nowIso();
        await this.db.collection(COLLECTIONS.userSaves).doc(String(userId)).set({
            user_id: String(userId),
            data,
            updated_at
        }, { merge: true });
        return { success: true, updated_at };
    }

    async addLeaderboardScore(gameId, playerName, score) {
        const ref = await this.db
            .collection(COLLECTIONS.leaderboards)
            .doc(safeDocumentId(gameId))
            .collection('scores')
            .add({
                game_id: gameId,
                player_name: playerName,
                score,
                created_at: nowIso()
            });
        return ref.id;
    }

    async getLeaderboard(gameId, sort) {
        const snapshot = await this.db
            .collection(COLLECTIONS.leaderboards)
            .doc(safeDocumentId(gameId))
            .collection('scores')
            .orderBy('score', sort.toLowerCase())
            .limit(10)
            .get();
        return snapshot.docs.map((doc) => {
            const row = doc.data();
            return { player_name: row.player_name, score: row.score };
        });
    }

    cloudSaveRef(cloudId, gameId) {
        return this.db
            .collection(COLLECTIONS.cloudSaves)
            .doc(cloudId)
            .collection('games')
            .doc(safeDocumentId(gameId));
    }

    async cloudSaveExists(cloudId, gameId) {
        return (await this.cloudSaveRef(cloudId, gameId).get()).exists;
    }

    async saveCloudSave(cloudId, gameId, playerName, data) {
        const updated_at = nowIso();
        await this.cloudSaveRef(cloudId, gameId).set({
            cloud_id: cloudId,
            game_id: gameId,
            player_name: playerName,
            data,
            updated_at
        });
        return { success: true, cloud_id: cloudId, updated_at };
    }

    async getCloudSave(cloudId, gameId) {
        const snapshot = await this.cloudSaveRef(cloudId, gameId).get();
        return snapshot.exists ? snapshot.data() : null;
    }
}

class SQLiteStorage {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.type = 'sqlite';
        this.db = null;
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
        });
    }

    async init() {
        this.db = await new Promise((resolve, reject) => {
            const connection = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else resolve(connection);
            });
        });
        await this.run(`CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            player_name TEXT NOT NULL,
            score INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        await this.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE NOT NULL,
            email TEXT,
            name TEXT,
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        await this.run(`CREATE TABLE IF NOT EXISTS cloud_saves (
            cloud_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            player_name TEXT DEFAULT '',
            data TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (cloud_id, game_id)
        )`);
        await this.run(`CREATE TABLE IF NOT EXISTS user_saves (
            user_id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    }

    async close() {
        if (!this.db) return;
        await new Promise((resolve) => this.db.close(resolve));
    }

    getUserById(id) {
        return this.get(
            `SELECT id, google_id, email, name, avatar_url FROM users WHERE id = ?`,
            [id]
        );
    }

    async upsertGoogleUser({ google_id, email, name, avatar_url }) {
        const existing = await this.get(
            `SELECT id, google_id, email, name, avatar_url FROM users WHERE google_id = ?`,
            [google_id]
        );
        if (existing) {
            await this.run(
                `UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE id = ?`,
                [email, name, avatar_url, existing.id]
            );
            return { ...existing, email, name, avatar_url };
        }
        const result = await this.run(
            `INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)`,
            [google_id, email, name, avatar_url]
        );
        return { id: result.id, google_id, email, name, avatar_url };
    }

    async getUserSave(userId) {
        const row = await this.get(
            `SELECT data, updated_at FROM user_saves WHERE user_id = ?`,
            [userId]
        );
        if (!row) return { data: {}, updated_at: null };
        try {
            return { data: JSON.parse(row.data), updated_at: row.updated_at };
        } catch {
            return { data: {}, updated_at: row.updated_at };
        }
    }

    async saveUserData(userId, data) {
        const updated_at = nowIso();
        await this.run(
            `INSERT INTO user_saves (user_id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP`,
            [userId, JSON.stringify(data)]
        );
        return { success: true, updated_at };
    }

    async addLeaderboardScore(gameId, playerName, score) {
        const result = await this.run(
            `INSERT INTO leaderboard (game_id, player_name, score) VALUES (?, ?, ?)`,
            [gameId, playerName, score]
        );
        return result.id;
    }

    getLeaderboard(gameId, sort) {
        return this.all(
            `SELECT player_name, score FROM leaderboard WHERE game_id = ? ORDER BY score ${sort} LIMIT 10`,
            [gameId]
        );
    }

    async cloudSaveExists(cloudId, gameId) {
        return !!(await this.get(
            `SELECT cloud_id FROM cloud_saves WHERE cloud_id = ? AND game_id = ?`,
            [cloudId, gameId]
        ));
    }

    async saveCloudSave(cloudId, gameId, playerName, data) {
        const updated_at = nowIso();
        await this.run(
            `INSERT INTO cloud_saves (cloud_id, game_id, player_name, data, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(cloud_id, game_id) DO UPDATE SET
               data = excluded.data,
               player_name = excluded.player_name,
               updated_at = CURRENT_TIMESTAMP`,
            [cloudId, gameId, playerName, JSON.stringify(data)]
        );
        return { success: true, cloud_id: cloudId, updated_at };
    }

    async getCloudSave(cloudId, gameId) {
        const row = await this.get(
            `SELECT cloud_id, game_id, player_name, data, updated_at
             FROM cloud_saves WHERE cloud_id = ? AND game_id = ?`,
            [cloudId, gameId]
        );
        if (!row) return null;
        try { row.data = JSON.parse(row.data); } catch {}
        return row;
    }
}

function getFirebaseCredentials(env) {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    }
    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
        return {
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
    }
    return null;
}

async function createStorage(env = process.env, options = {}) {
    const credentials = getFirebaseCredentials(env);
    if (credentials) {
        const { initializeApp, cert, getApps } = require('firebase-admin/app');
        const { getFirestore } = require('firebase-admin/firestore');
        const app = getApps()[0] || initializeApp({ credential: cert(credentials) });
        const storage = new FirestoreStorage(options.firestore || getFirestore(app));
        await storage.init();
        return storage;
    }

    const dbPath = env.DB_PATH || path.join(__dirname, 'leaderboard.db');
    const storage = new SQLiteStorage(dbPath);
    await storage.init();
    return storage;
}

module.exports = {
    COLLECTIONS,
    FirestoreStorage,
    SQLiteStorage,
    createStorage,
    getFirebaseCredentials,
    safeDocumentId
};
