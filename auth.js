function createGoogleVerify(storage) {
    return async function verifyGoogle(accessToken, refreshToken, profile, done) {
        try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value || '';
            const name = (profile.displayName || profile.name?.givenName || 'لاعب').substring(0, 30);
            const avatarUrl = profile.photos?.[0]?.value || '';

            const user = await storage.upsertGoogleUser({
                google_id: googleId,
                email,
                name,
                avatar_url: avatarUrl
            });
            done(null, user);
        } catch (err) {
            done(err);
        }
    };
}

module.exports = { createGoogleVerify };
