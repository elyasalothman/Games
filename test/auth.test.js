const test = require('node:test');
const assert = require('node:assert/strict');
const { createGoogleVerify } = require('../auth');

test('Google verify callback receives OAuth profile and returns stored user', async () => {
    let savedProfile;
    const storage = {
        async upsertGoogleUser(profile) {
            savedProfile = profile;
            return { id: profile.google_id, ...profile };
        }
    };
    const profile = {
        id: 'google-user-1',
        displayName: 'Google Player',
        emails: [{ value: 'player@example.com' }],
        photos: [{ value: 'https://example.com/avatar.png' }]
    };

    const result = await new Promise((resolve, reject) => {
        createGoogleVerify(storage)('access-token', 'refresh-token', profile, (err, user) => {
            if (err) reject(err);
            else resolve(user);
        });
    });

    assert.deepEqual(savedProfile, {
        google_id: 'google-user-1',
        email: 'player@example.com',
        name: 'Google Player',
        avatar_url: 'https://example.com/avatar.png'
    });
    assert.equal(result.id, 'google-user-1');
});

test('Google verify callback forwards storage failures', async () => {
    const expected = new Error('Firestore unavailable');
    const storage = {
        async upsertGoogleUser() {
            throw expected;
        }
    };

    const error = await new Promise((resolve) => {
        createGoogleVerify(storage)('', '', { id: 'google-user-2' }, (err) => resolve(err));
    });
    assert.equal(error, expected);
});
