/*
 * The Stickmen Hub — Game Center SDK (shared by all games).
 *
 * Speaks the normalized backend contract (DESIGN.md §4): avatar KEYS, and
 * {game, score, coins}. Loaded as a classic script that sets window.GameCenter,
 * so games can use it whether or not they're ES modules.
 *
 * Every method resolves to { ok, status, data, error }:
 *   - data  : the server's normalized JSON (user object, or leaderboard array)
 *   - error : a user-safe message string when ok === false, else null
 *
 * A new game needs only:
 *   const r = await GameCenter.submitScore('my-game', score, coins);
 *   if (r.ok) updateWallet(r.data.coins);
 * It never reimplements auth, the wallet, the store, or leaderboards.
 */
(function (global) {
  async function request(path, method, body) {
    const opts = { method: method || 'GET', credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    let res, data = {};
    try {
      res = await fetch(path, opts);
      try { data = await res.json(); } catch (e) { data = {}; }
    } catch (e) {
      // Network failure (offline, server down) — surfaced, never silent.
      return { ok: false, status: 0, data: {}, error: "Can't reach the server" };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, data,
               error: (data && (data.detail || data.error)) || 'Something went wrong' };
    }
    return { ok: true, status: res.status, data, error: null };
  }

  const lb = (game, scope) =>
    '/api/leaderboard/' + scope + '?game=' + encodeURIComponent(game);

  global.GameCenter = {
    // low-level escape hatch (used by games that keep their own translation)
    _request: request,

    // account
    register: (body) => request('/api/register', 'POST', body),          // {username,password,avatar}
    login: (body) => request('/api/login', 'POST', body),                // {username,password}
    logout: () => request('/api/logout', 'POST', {}),
    me: () => request('/api/me', 'GET'),
    setProfile: (body) => request('/api/profile', 'POST', body),         // {username?,avatar?,showName?}

    // gameplay / economy (game = slug string)
    submitScore: (game, score, coins) =>
      request('/api/score', 'POST', { game, score, coins }),
    leaderboard: (game, scope) => request(lb(game, scope), 'GET'),       // scope: 'personal' | 'global'
    buy: (kind, key) => request('/api/store/buy', 'POST', { kind, key }),// kind: 'avatar' | 'item'
    use: (item) => request('/api/use', 'POST', { item }),
    achievements: (game) => request('/api/achievements' + (game ? '?game=' + encodeURIComponent(game) : ''), 'GET'),
  };

  // ===== Shared settings: theme + on-screen (iPad/touch) controls =====
  // Stored per-origin in localStorage so the choice follows the player across the
  // hub and every game. Games listen for the 'gc:settings' event to react live.
  function isTouchDevice() {
    try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; }
    catch (e) { return false; }
  }
  function emitSettings() {
    try {
      window.dispatchEvent(new CustomEvent('gc:settings', {
        detail: { theme: Settings.getTheme(), touchControls: Settings.touchControls() },
      }));
    } catch (e) {}
  }
  const Settings = {
    getTheme() { return localStorage.getItem('hubTheme') === 'dark' ? 'dark' : 'light'; },
    setTheme(t) {
      localStorage.setItem('hubTheme', t === 'dark' ? 'dark' : 'light');
      applyTheme();
      emitSettings();
    },
    // unset -> auto-detect by device; 'on'/'off' -> explicit override
    touchControls() {
      const v = localStorage.getItem('touchControls');
      if (v === 'on') return true;
      if (v === 'off') return false;
      return isTouchDevice();
    },
    setTouchControls(on) {
      localStorage.setItem('touchControls', on ? 'on' : 'off');
      emitSettings();
    },
  };
  function applyTheme() {
    if (document.body) document.body.setAttribute('data-theme', Settings.getTheme());
  }
  global.GameCenter.settings = Settings;
  global.GameCenter.openSettings = openSettings;

  // --- settings modal (built once, identical on every page) ---
  let settingsEl = null;
  function segStyle(btn, active) {
    btn.style.cssText = 'flex:1;padding:9px 8px;border-radius:10px;border:2px solid ' +
      (active ? '#7d2ae8' : '#d7d0ea') + ';background:' + (active ? '#7d2ae8' : '#f4f2fa') +
      ';color:' + (active ? '#fff' : '#4a4361') + ';font:inherit;font-weight:800;cursor:pointer';
  }
  function refreshSettings() {
    if (!settingsEl) return;
    const theme = Settings.getTheme(), touch = Settings.touchControls();
    settingsEl.querySelectorAll('button[data-theme]').forEach((b) => segStyle(b, b.getAttribute('data-theme') === theme));
    settingsEl.querySelectorAll('button[data-touch]').forEach((b) => segStyle(b, (b.getAttribute('data-touch') === 'on') === touch));
  }
  function buildSettings() {
    if (settingsEl) return settingsEl;
    const wrap = document.createElement('div');
    wrap.id = 'gc-settings';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;display:none;align-items:center;' +
      'justify-content:center;background:rgba(10,6,24,.55);font:600 14px/1.4 Nunito,system-ui,sans-serif';
    wrap.innerHTML =
      '<div role="dialog" aria-label="Settings" style="background:#fff;color:#2a2440;width:300px;max-width:90vw;' +
      'border-radius:16px;padding:20px;box-shadow:0 14px 44px rgba(0,0,0,.4)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;font-size:18px;font-weight:800;margin-bottom:16px">' +
          'Settings <button data-close aria-label="Close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9a93ad">✕</button></div>' +
        '<div style="font-weight:800;margin-bottom:8px">Appearance</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:18px">' +
          '<button data-theme="light" type="button">☀ Light</button>' +
          '<button data-theme="dark" type="button">☾ Dark</button></div>' +
        '<div style="font-weight:800;margin-bottom:8px">iPad / touch controls</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button data-touch="on" type="button">On</button>' +
          '<button data-touch="off" type="button">Off</button></div>' +
        '<p style="color:#8a83a0;font-weight:600;font-size:12px;margin:10px 0 0">On shows an on-screen joystick and jump button in games. Off plays with keyboard only.</p>' +
      '</div>';
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.hasAttribute('data-close')) { wrap.style.display = 'none'; return; }
      const th = e.target.getAttribute('data-theme');
      if (th) { Settings.setTheme(th); refreshSettings(); }
      const tc = e.target.getAttribute('data-touch');
      if (tc) { Settings.setTouchControls(tc === 'on'); refreshSettings(); }
    });
    document.body.appendChild(wrap);
    settingsEl = wrap;
    return wrap;
  }
  function openSettings() { buildSettings(); refreshSettings(); settingsEl.style.display = 'flex'; }

  // Floating gear button on game pages (the hub adds its own "Settings" nav item).
  function injectSettingsButton() {
    if (!location.pathname.includes('/games/')) return;
    if (document.getElementById('gc-settings-btn')) return;
    const b = document.createElement('button');
    b.id = 'gc-settings-btn';
    b.type = 'button';
    b.textContent = '⚙';
    b.setAttribute('aria-label', 'Settings');
    b.style.cssText =
      'position:fixed;top:54px;left:10px;z-index:99999;border:none;cursor:pointer;' +
      'font-size:18px;line-height:1;color:#fff;background:rgba(125,42,232,.92);' +
      'width:40px;height:36px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    b.addEventListener('click', openSettings);
    document.body.appendChild(b);
  }

  // Every game page gets a consistent "Home" link back to the hub (not on the hub itself).
  function injectHomeButton() {
    if (!location.pathname.includes('/games/')) return;       // skip the hub
    if (document.getElementById('gc-home')) return;
    const a = document.createElement('a');
    a.id = 'gc-home';
    a.href = '/';
    a.textContent = '← Home';
    a.setAttribute('aria-label', 'Back to The Stickmen Hub');
    a.style.cssText =
      'position:fixed;top:10px;left:10px;z-index:99999;text-decoration:none;' +
      'font:600 13px/1 Nunito,system-ui,sans-serif;color:#fff;' +
      'background:rgba(125,42,232,.92);padding:8px 12px;border-radius:20px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.25)';
    document.body.appendChild(a);
  }
  function initChrome() {
    applyTheme();            // honor saved theme on every page (hub + games)
    injectHomeButton();
    injectSettingsButton();
  }
  if (document.body) initChrome();
  else document.addEventListener('DOMContentLoaded', initChrome);

  // PWA: register the service worker once (loaded on the hub + every game).
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})(window);
