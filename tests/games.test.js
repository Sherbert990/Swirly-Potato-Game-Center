/*
 * Manifest-driven guards that scale with the game roster. For EVERY game in
 * shared/catalog.json this asserts the file exists, loads the shared SDK, and
 * actually calls into GameCenter — plus manifest integrity and the SDK's public
 * API surface. Static source assertions (no browser); run: node --test tests/
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const catalog = JSON.parse(read('shared/catalog.json'));

describe('catalog manifest integrity', () => {
  test('games have unique slugs and the required fields', () => {
    const slugs = new Set();
    for (const g of catalog.games) {
      for (const f of ['slug', 'name', 'cover', 'play', 'leaderboards']) {
        assert.ok(g[f], `game ${g.slug} is missing "${f}"`);
      }
      assert.ok(!slugs.has(g.slug), `duplicate game slug ${g.slug}`);
      slugs.add(g.slug);
    }
  });

  test('every purchasable key is globally unique', () => {
    const keys = new Set();
    const claim = (k, where) => { assert.ok(!keys.has(k), `duplicate key ${k} (${where})`); keys.add(k); };
    for (const g of catalog.games) {
      (g.items || []).forEach((it) => claim(it.key, `${g.slug} item`));
      (g.skinGroups || []).forEach((gr) => (gr.choices || []).forEach((c) => c.key && claim(c.key, `${g.slug} skin`)));
      (g.upgrades || []).forEach((u) => (u.levels || []).forEach((l) => claim(l.key, `${g.slug} upgrade`)));
    }
  });
});

describe('every game integrates the shared SDK', () => {
  for (const g of catalog.games) {
    describe(g.slug, () => {
      const rel = g.play.replace(/^\//, '');
      const exists = fs.existsSync(path.join(ROOT, rel));
      test('play file exists', () => assert.ok(exists, `missing ${rel}`));
      const html = exists ? read(rel) : '';
      test('loads /shared/gamecenter.js', () =>
        assert.match(html, /<script src="\/shared\/gamecenter\.js"><\/script>/));
      test('calls into the GameCenter SDK', () => {
        // Include sibling local scripts (e.g. Lavender's game.js) — the SDK calls
        // may live there rather than inline in the HTML.
        const dir = path.dirname(rel);
        let src = html;
        for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
          const ref = m[1];
          if (/^https?:/.test(ref) || ref.includes('gamecenter.js')) continue;   // external / the SDK itself
          const clean = ref.split('?')[0].replace(/^\//, '');
          const p = ref.startsWith('/') ? path.join(ROOT, clean) : path.join(ROOT, dir, clean);
          if (fs.existsSync(p)) src += '\n' + fs.readFileSync(p, 'utf8');
        }
        assert.match(src, /GameCenter\s*\.\s*\w+/);
      });
    });
  }
});

describe('GameCenter SDK public surface', () => {
  const sdk = read('shared/gamecenter.js');
  const surface = ['register', 'login', 'logout', 'me', 'setProfile', 'submitScore', 'leaderboard',
                   'buy', 'use', 'openStore', 'openLeaderboards', 'catalog', 'game', 'getPref', 'setPref'];
  for (const api of surface) {
    test(`exposes GameCenter.${api}`, () => {
      const re = new RegExp('GameCenter\\.' + api + '\\s*=|\\b' + api + ':\\s*(function|\\()');
      assert.match(sdk, re, `SDK is missing ${api}`);
    });
  }
});
