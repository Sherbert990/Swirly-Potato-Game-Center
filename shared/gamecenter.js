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
  // ===== Shared store: one store, a tab per game (wallet is shared) =====
  // Opened from the hub or any game via GameCenter.openStore(gameSlug?). Buying
  // and equipping go through the same API every game already uses.
  const STORE_CATALOG = {
    'lavender-leap': {
      name: 'Lavender Leap',
      items: [
        { key: 'extra_life', name: 'Extra Life', desc: 'Survive a fall in Hard Mode', price: 15 },
        { key: 'boost', name: '+30s Time Boost', desc: 'Adds 30s to your next Time Trial', price: 15 },
        { key: 'double_jump', name: 'Double Jump Pass', desc: 'A mid-air second jump — permanent', price: 60, permanent: true },
      ],
      skins: [
        { key: 'll-star-cadet', name: 'Star Cadet', price: 20, color: '#cdbcf2' },
        { key: 'll-phantom-knight', name: 'Phantom Knight', price: 25, color: '#6d28d9' },
        { key: 'll-lava-golem', name: 'Lava Golem', price: 30, color: '#ff7a18' },
        { key: 'll-frost-sprite', name: 'Frost Sprite', price: 35, color: '#7fd4ff' },
        { key: 'll-neon-bee', name: 'Neon Bee', price: 40, color: '#ffc02e' },
      ],
    },
    'dont-look-down': {
      name: "Don't Look Down",
      items: [
        { key: 'revive', name: 'Revive', desc: 'Get back up after a fall', price: 25 },
        { key: 'headstart', name: 'Head Start', desc: 'Begin a run +50m up', price: 15 },
        { key: 'rocket_booster', name: 'Rocket Booster', desc: 'Begin a run +100m up', price: 20 },
        { key: 'doubler', name: 'Star Doubler', desc: '2× stars for one run', price: 20 },
      ],
      skins: [
        { key: 'dld-nova', name: 'Nova', price: 60, color: '#7b5cff' },
        { key: 'dld-phantom', name: 'Phantom', price: 80, color: '#3a2a5e' },
        { key: 'dld-aurora', name: 'Aurora', price: 100, color: '#2de2e6' },
        { key: 'dld-cosmo', name: 'Cosmo', price: 120, color: '#ff2e97' },
      ],
    },
  };
  const STORE_TABS = ['lavender-leap', 'dont-look-down'];
  let storeEl = null, storeUser = null, storeTab = STORE_TABS[0];

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function buildStore() {
    if (storeEl) return storeEl;
    const wrap = document.createElement('div');
    wrap.id = 'gc-store';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;display:none;align-items:center;' +
      'justify-content:center;background:rgba(10,6,24,.6);font:600 14px/1.4 Nunito,system-ui,sans-serif';
    wrap.innerHTML =
      '<div role="dialog" aria-label="Store" style="background:#fff;color:#2a2440;width:360px;max-width:94vw;' +
      'max-height:88vh;overflow:auto;border-radius:16px;padding:18px;box-shadow:0 14px 44px rgba(0,0,0,.4)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<div style="font-size:18px;font-weight:800">Store</div>' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<span data-coins style="font-weight:800;color:#a36b00">★ 0</span>' +
            '<button data-close aria-label="Close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9a93ad">✕</button>' +
          '</div>' +
        '</div>' +
        '<div data-tabs style="display:flex;gap:8px;margin:12px 0"></div>' +
        '<div data-msg style="min-height:16px;color:#7d2ae8;font-weight:700;font-size:12px;margin-bottom:6px"></div>' +
        '<div data-body></div>' +
      '</div>';
    wrap.addEventListener('click', onStoreClick);
    document.body.appendChild(wrap);
    storeEl = wrap;
    return wrap;
  }

  function storeMsg(t) { const m = storeEl && storeEl.querySelector('[data-msg]'); if (m) m.textContent = t || ''; }

  function rowHtml(opts) {
    // opts: swatch?, title, sub, btnLabel, btnAttr, disabled, done
    const sw = opts.swatch
      ? '<span style="flex:none;width:30px;height:30px;border-radius:8px;background:' + opts.swatch + ';border:2px solid rgba(0,0,0,.12)"></span>'
      : '';
    const btn = opts.done
      ? '<span style="flex:none;color:#1d9e75;font-weight:800;font-size:13px">' + escapeHtml(opts.btnLabel) + '</span>'
      : '<button ' + opts.btnAttr + (opts.disabled ? ' disabled' : '') +
        ' style="flex:none;border:none;border-radius:9px;padding:8px 12px;font:inherit;font-weight:800;cursor:' +
        (opts.disabled ? 'not-allowed' : 'pointer') + ';background:' + (opts.disabled ? '#e7e3f2' : '#7d2ae8') +
        ';color:' + (opts.disabled ? '#a99fc4' : '#fff') + '">' + escapeHtml(opts.btnLabel) + '</button>';
    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid #efecf6">' +
      sw + '<div style="flex:1;min-width:0"><div style="font-weight:800">' + escapeHtml(opts.title) + '</div>' +
      '<div style="color:#8a83a0;font-size:12px">' + escapeHtml(opts.sub || '') + '</div></div>' + btn + '</div>';
  }

  function renderStore() {
    if (!storeEl) return;
    storeEl.querySelector('[data-coins]').textContent = '★ ' + ((storeUser && storeUser.coins) || 0);
    const tabsEl = storeEl.querySelector('[data-tabs]');
    tabsEl.innerHTML = STORE_TABS.map((g) => {
      const on = g === storeTab;
      return '<button data-tab="' + g + '" style="flex:1;padding:9px 8px;border-radius:10px;border:2px solid ' +
        (on ? '#7d2ae8' : '#d7d0ea') + ';background:' + (on ? '#7d2ae8' : '#f4f2fa') + ';color:' +
        (on ? '#fff' : '#4a4361') + ';font:inherit;font-weight:800;cursor:pointer">' + escapeHtml(STORE_CATALOG[g].name) + '</button>';
    }).join('');
    const body = storeEl.querySelector('[data-body]');
    if (!storeUser) { body.innerHTML = ''; return; }
    const cat = STORE_CATALOG[storeTab];
    const coins = storeUser.coins || 0;
    const items = storeUser.items || {};
    const owned = storeUser.ownedAvatars || [];
    let html = '<div style="font-weight:800;margin:6px 0 2px">Power-ups</div>';
    cat.items.forEach((it) => {
      const have = items[it.key] || 0;
      const ownedPerm = it.permanent && have > 0;
      html += rowHtml({
        title: it.name,
        sub: it.desc + (it.permanent ? '' : ' · You own ' + have),
        btnLabel: ownedPerm ? 'Owned' : '★ ' + it.price,
        btnAttr: 'data-item="' + it.key + '"',
        disabled: !ownedPerm && coins < it.price,
        done: ownedPerm,
      });
    });
    html += '<div style="font-weight:800;margin:14px 0 2px">Skins</div>';
    cat.skins.forEach((sk) => {
      const isOwned = owned.indexOf(sk.key) >= 0;
      const equipped = storeUser.avatarKey === sk.key;
      html += rowHtml({
        swatch: sk.color,
        title: sk.name,
        sub: equipped ? 'Currently worn' : isOwned ? 'Unlocked' : 'Premium skin',
        btnLabel: equipped ? 'Equipped' : isOwned ? 'Equip' : '★ ' + sk.price,
        btnAttr: isOwned ? 'data-equip="' + sk.key + '"' : 'data-avatar="' + sk.key + '"',
        disabled: !isOwned && coins < sk.price,
        done: equipped,
      });
    });
    body.innerHTML = html;
  }

  function finishTxn(r, okMsg) {
    if (r.ok) { storeUser = r.data; renderStore(); storeMsg(okMsg); emitWallet(); }
    else { storeMsg(r.error || 'Could not complete that.'); }
  }
  function emitWallet() { try { window.dispatchEvent(new CustomEvent('gc:wallet', { detail: storeUser })); } catch (e) {} }

  function onStoreClick(e) {
    const t = e.target;
    if (t === storeEl || t.hasAttribute('data-close')) { closeStore(); return; }
    const tab = t.getAttribute && t.getAttribute('data-tab');
    if (tab) { storeTab = tab; try { localStorage.setItem('lastStoreTab', tab); } catch (x) {} storeMsg(''); renderStore(); return; }
    const item = t.getAttribute && t.getAttribute('data-item');
    if (item) { GameCenter.buy('item', item).then((r) => finishTxn(r, 'Bought!')); return; }
    const av = t.getAttribute && t.getAttribute('data-avatar');
    if (av) { GameCenter.buy('avatar', av).then((r) => finishTxn(r, 'Unlocked! Tap Equip to wear it.')); return; }
    const eq = t.getAttribute && t.getAttribute('data-equip');
    if (eq) { GameCenter.setProfile({ avatar: eq }).then((r) => finishTxn(r, 'Equipped!')); return; }
  }

  async function openStore(game) {
    buildStore();
    if (game && STORE_CATALOG[game]) storeTab = game;
    else { let last = null; try { last = localStorage.getItem('lastStoreTab'); } catch (x) {} storeTab = STORE_CATALOG[last] ? last : STORE_TABS[0]; }
    try { localStorage.setItem('lastStoreTab', storeTab); } catch (x) {}
    storeEl.style.display = 'flex';
    storeMsg('Loading…');
    try { window.dispatchEvent(new CustomEvent('gc:storeopen')); } catch (e) {}
    const r = await GameCenter.me();
    if (!r.ok) { storeUser = null; renderStore(); storeMsg('Sign in to shop.'); return; }
    storeUser = r.data; storeMsg(''); renderStore();
  }
  function closeStore() {
    if (storeEl) storeEl.style.display = 'none';
    try { window.dispatchEvent(new CustomEvent('gc:storeclose')); } catch (e) {}
  }
  global.GameCenter.openStore = openStore;
  global.GameCenter.closeStore = closeStore;

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
