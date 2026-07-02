/*
 * Functional tests for shared/gamecenter.js in a real DOM (jsdom): the manifest
 * actually drives the Store overlay, and per-account prefs + game() memoization
 * behave. Requires jsdom (npm ci). Run: node --test tests/
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const SDK = fs.readFileSync(path.join(__dirname, '..', 'shared', 'gamecenter.js'), 'utf8');

// A tiny manifest exercising each catalog shape: items, a local-equip skin group,
// leveled upgrades, and a hidden item (seeded but not shown in the overlay).
const MANIFEST = { games: [
  { slug: 'game-a', name: 'Game A', leaderboards: [{ board: 'game-a', label: 'A', unit: '{n} pts' }],
    items: [{ key: 'a_item', name: 'Item A', desc: 'd', price: 10 }],
    skinGroups: [{ title: 'Colours', prefKey: 'aColor', event: 'gc:acolor', default: 'red',
      choices: [{ name: 'Red', pref: 'red', swatch: '#f00' },                         // free, equipped by default
                { key: 'a-blue', name: 'Blue', pref: 'blue', swatch: '#00f', price: 20 },   // owned -> Equip
                { key: 'a-green', name: 'Green', pref: 'green', swatch: '#0f0', price: 25 }] }] },  // unowned -> Buy
  { slug: 'game-b', name: 'Game B', leaderboards: [{ board: 'game-b', label: 'B', unit: '{n} m' }],
    items: [{ key: 'b_hidden', name: 'Hidden', price: 5, hidden: true }],
    upgrades: [{ name: 'Boost', desc: 'faster', levels: [{ key: 'b_up1', price: 2 }, { key: 'b_up2', price: 4 }] }] },
]};

// Boot the SDK inside a fresh jsdom window with stubbed fetch (catalog + /api/me).
async function boot(user) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
    { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/shared/catalog.json')) return { ok: true, json: async () => MANIFEST };
    if (u.includes('/api/me')) return { ok: !!user, status: user ? 200 : 401, json: async () => (user || {}) };
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const s = window.document.createElement('script');
  s.textContent = SDK;
  window.document.body.appendChild(s);       // runs the IIFE in the window context
  await window.GameCenter.catalog();          // ensure the manifest is loaded + derived
  return window;
}

const USER = { username: 'Zoe', coins: 100, items: { 'a-blue': 1 }, ownedAvatars: [] };  // owns Blue

describe('Store overlay is built from the manifest', () => {
  test('tabs cover every game that sells something', async () => {
    const w = await boot(USER);
    await w.GameCenter.openStore('game-a');
    const tabs = [...w.document.querySelectorAll('#gc-store [data-tab]')].map((b) => b.getAttribute('data-tab'));
    assert.deepEqual(tabs, ['game-a', 'game-b']);
  });

  test('game-a renders items + local skin choices with buy/equip controls', async () => {
    const w = await boot(USER);
    await w.GameCenter.openStore('game-a');
    const body = w.document.querySelector('#gc-store [data-body]');
    assert.ok(body.querySelector('[data-item="a_item"]'), 'item buy button');
    assert.ok(body.querySelector('[data-litem="a-green"]'), 'unowned skin buy button');
    assert.ok(body.querySelector('[data-lequip]'), 'owned skin equip button');
  });

  test('game-b shows upgrades, hides hidden items, and omits the empty Power-ups header', async () => {
    const w = await boot(USER);
    await w.GameCenter.openStore('game-b');
    const body = w.document.querySelector('#gc-store [data-body]');
    assert.ok(body.querySelector('[data-item="b_up1"]'), 'first upgrade level buyable');
    assert.equal(body.querySelector('[data-item="b_hidden"]'), null, 'hidden item not shown');
    assert.doesNotMatch(body.innerHTML, /Power-ups/, 'no empty Power-ups header when no visible items');
  });
});

describe('per-account prefs (getPref/setPref)', () => {
  test('namespace by the signed-in user and stay isolated', async () => {
    const w = await boot(USER);
    await w.GameCenter.openStore('game-a');          // sets the auth user (Zoe) from /api/me
    w.GameCenter.setPref('aColor', 'blue');
    assert.equal(w.GameCenter.getPref('aColor', 'red'), 'blue');
    assert.equal(w.localStorage.getItem('gc:pref:Zoe:aColor'), 'blue');

    // A different signed-in user does not inherit Zoe's equip.
    const w2 = await boot({ username: 'Max', coins: 0, items: {}, ownedAvatars: [] });
    await w2.GameCenter.openStore('game-a');
    assert.equal(w2.GameCenter.getPref('aColor', 'red'), 'red');
  });
});

describe('GameCenter.game(slug)', () => {
  test('is memoized (same handle per slug)', async () => {
    const w = await boot(USER);
    assert.equal(w.GameCenter.game('game-a'), w.GameCenter.game('game-a'));
  });
});
