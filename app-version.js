/**
 * Single source of truth for client/server update checks.
 * Bump APP_VERSION on every user-facing deploy so browsers refresh.
 */
const APP_VERSION = '3.5.0';
const CACHE_NAME = `lumaa-v${APP_VERSION.replace(/\./g, '-')}`;

module.exports = { APP_VERSION, CACHE_NAME };
