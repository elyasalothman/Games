const test = require('node:test');
const assert = require('node:assert/strict');
const { APP_VERSION, CACHE_NAME } = require('../app-version');

test('APP_VERSION is a semver-like string', () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
});

test('CACHE_NAME embeds APP_VERSION for SW cache busting', () => {
  assert.equal(CACHE_NAME, `lumaa-v${APP_VERSION.replace(/\./g, '-')}`);
  assert.match(CACHE_NAME, /^lumaa-v\d+-\d+-\d+$/);
});

test('SW cache constant matches app-version CACHE_NAME', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const match = sw.match(/const CACHE = '([^']+)'/);
  assert.ok(match, 'sw.js should declare CACHE');
  assert.equal(match[1], CACHE_NAME);
});

test('index.html meta app-version matches APP_VERSION', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const match = html.match(/name="app-version"\s+content="([^"]+)"/);
  assert.ok(match, 'index.html should have app-version meta');
  assert.equal(match[1], APP_VERSION);
});

test('script.js APP_VERSION matches shared app-version', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const match = script.match(/const APP_VERSION = '([^']+)'/);
  assert.ok(match, 'script.js should declare APP_VERSION');
  assert.equal(match[1], APP_VERSION);
});
