/*
 * Frontend "Consistency Playbook" regression guards.
 *
 * These cover the chrome-unification pass on the two games (Lavender Leap and
 * Don't Look Down): shared SDK load, Fredoka/Nunito + hub tokens, the
 * art-forward intro shells, the coin glyph (no unicode marks) in chrome, the
 * shared Store/Leaderboards wiring, and auth living once at the hub. They are
 * static source assertions — no browser needed — so they run anywhere Node does
 * and stay fast. The in-play "wild" worlds (neon fall, pastel platforms) are
 * deliberately asserted to be untouched.
 *
 * Run:  node --test tests/frontend-chrome.test.js
 *   (or `node --test` from the repo root to auto-discover *.test.js files.
 *    Node's built-in test runner — no extra dependencies, no package.json.)
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const LAV_HTML = 'games/lavender-leap/index.html';
const LAV_JS = 'games/lavender-leap/game.js';
const LAV_CSS = 'games/lavender-leap/styles.css';
const DLD = 'games/dont-look-down/dont_look_down.html';

// Count occurrences of a substring (for the "exactly one canvas star" check).
const count = (hay, needle) => hay.split(needle).length - 1;

describe('Lavender Leap — index.html', () => {
  const html = read(LAV_HTML);

  test('loads the shared SDK', () => {
    assert.match(html, /<script src="\/shared\/gamecenter\.js"><\/script>/);
  });

  test('has the art-forward intro shell with the cover art + chrome', () => {
    assert.match(html, /id="intro"/);
    assert.match(html, /class="intro-art"[^>]*src="\/design\/hub\/lavender-cover\.png"/);
    for (const id of ['introCoins', 'introTrophy', 'introPlay', 'introStore', 'introBest']) {
      assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
    }
  });

  test('intro chrome uses Tabler icons + the coin glyph (no unicode marks)', () => {
    assert.match(html, /ti ti-coin/);      // coin pill
    assert.match(html, /ti ti-trophy/);    // leaderboards
    assert.match(html, /ti ti-player-play/); // Play
    assert.doesNotMatch(html, /[✕☀⚙★▲]/);
  });

  test('dead localStorage auth screens are removed', () => {
    for (const id of ['id="welcome"', 'id="signin"', 'id="create"', 'id="goSignin"', 'id="goCreate"']) {
      assert.ok(!html.includes(id), `stale auth markup present: ${id}`);
    }
  });
});

describe('Lavender Leap — game.js', () => {
  const js = read(LAV_JS);

  test('wires the intro buttons', () => {
    assert.match(js, /introPlayBtn\.addEventListener\("click", showModes\)/);
    assert.match(js, /introStoreBtn\.addEventListener\("click", \(\) => GameCenter\.openStore\("lavender-leap"\)\)/);
  });

  test('boots into the intro after the shared-session gate', () => {
    assert.match(js, /function showIntro\(\)/);
    assert.match(js, /if \(!r\.ok\) \{ location\.href = "\/";/); // redirect to hub when logged out
    assert.match(js, /showIntro\(\);\s*\n\}\)\(\);/);            // boot calls showIntro, not showModes
  });

  test('all leaderboard entry points open the shared SDK leaderboards', () => {
    const opens = js.match(/GameCenter\.openLeaderboards\(\)/g) || [];
    assert.ok(opens.length >= 3, `expected >=3 openLeaderboards calls, got ${opens.length}`);
    // The bespoke screen must no longer be opened by those buttons.
    assert.doesNotMatch(js, /addEventListener\("click", \(\) => openLeaderboard\(\)\)/);
  });

  test('the dead auth handlers are gone', () => {
    for (const sym of ['handleSignIn', 'handleCreate', 'showWelcome', 'signinInput', 'createInput']) {
      assert.ok(!js.includes(sym), `stale auth symbol present: ${sym}`);
    }
  });

  test('the intro coin pill stays in sync via updateCoinHud', () => {
    assert.match(js, /introCoinsEl\) introCoinsEl\.textContent = wallet/);
  });

  test('the in-play level art is untouched (still pastel/wild)', () => {
    assert.ok(js.includes('"#b68cff"'), 'level platform colour changed — gameplay should not be retokened');
  });
});

describe('Lavender Leap — styles.css', () => {
  const css = read(LAV_CSS);

  test('uses Fredoka (titles) + Nunito (body)', () => {
    assert.match(css, /--ff-title:\s*Fredoka/);
    assert.match(css, /--ff-body:\s*Nunito/);
    assert.doesNotMatch(css, /font-family:\s*Inter/);
  });

  test('recolours chrome to the hub accent tokens (light + dark)', () => {
    assert.match(css, /--purple:\s*#7d2ae8/);            // light accent
    assert.match(css, /--purple:\s*#9b6bff/);            // dark accent
    assert.match(css, /--gold:\s*#c8920c/);              // coin mark
  });

  test('button radii are bumped to 11/16/22px', () => {
    assert.match(css, /border-radius:\s*11px/); // buttons
    assert.match(css, /border-radius:\s*16px/); // hud/controls/canvas
    assert.match(css, /border-radius:\s*22px/); // startup card
  });

  test('the global <button> sizing no longer leaks into the SDK chrome', () => {
    // Regression guard for the store/leaderboard/settings button stretch bug.
    assert.match(css, /#gc-store button[\s\S]*?#gc-settings-btn\s*\{[\s\S]*?min-width:\s*0/);
  });
});

describe("Don't Look Down — dont_look_down.html", () => {
  const html = read(DLD);

  test('loads the shared SDK', () => {
    assert.match(html, /<script src="\/shared\/gamecenter\.js"><\/script>/);
  });

  test('body uses Nunito (system-sans retired)', () => {
    assert.match(html, /body\s*\{[^}]*font-family:\s*Nunito/);
    assert.doesNotMatch(html, /font-family:\s*sans-serif/);
  });

  test('chrome is driven by the SDK --gc-* tokens', () => {
    assert.match(html, /var\(--gc-panel\)/);
    assert.match(html, /var\(--gc-ink\)/);
    assert.match(html, /var\(--gc-accent\)/);
  });

  test('has the art-forward intro shell with the cover art', () => {
    assert.match(html, /id="startScreen"/);
    assert.match(html, /class="introArt"[^>]*src="\/design\/hub\/dontlookdown-cover\.png"/);
    assert.match(html, /id="startBalance"/);
    assert.match(html, /id="leaderboardBtn"[^>]*aria-label="Leaderboards"/);
  });

  test('coins use the coin glyph in chrome; jump pad uses a Tabler icon', () => {
    assert.match(html, /ti ti-coin/);
    assert.match(html, /id="jumpPad"><i class="ti ti-arrow-up"/);
    assert.ok(!html.includes('▲'), 'unicode jump arrow still present');
    // The ONLY star left is the in-canvas world coin sprite drawn via fillText.
    assert.equal(count(html, '★'), 1, 'chrome ★ should be replaced by ti-coin; only the canvas star remains');
    assert.match(html, /ctx\.fillText\('★'/); // and that surviving star is the canvas one
  });

  test('the in-play neon world is untouched (still wild)', () => {
    assert.ok(html.includes("'#ff2e97'"), 'neon platform palette changed — gameplay should stay wild');
    assert.match(html, /const THEMES = \[/);
  });

  test('login lives at the hub — bespoke auth + dead store are removed', () => {
    for (const sym of ['id="authScreen"', 'id="storeScreen"', 'function setAuthMode', 'function renderStore', 'const STORE_ITEMS']) {
      assert.ok(!html.includes(sym), `stale chrome present: ${sym}`);
    }
  });

  test('boot + logout redirect to the hub when not signed in', () => {
    assert.match(html, /else location\.href = '\/';/);            // boot gate
    assert.match(html, /async function doLogout\(\)[\s\S]*?location\.href = '\/';/);
  });

  test('profile screen sits on the shared panel-card pattern', () => {
    assert.match(html, /id="profileScreen"[\s\S]*?class="panelCard"/);
  });

  test('the menu Leaderboards entry opens the shared SDK leaderboards', () => {
    assert.match(html, /getElementById\('leaderboardBtn'\)\.onclick = \(\) => GameCenter\.openLeaderboards\(\)/);
  });
});
