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
  // ===== Avatar art for store skin previews =====
  // Self-contained renderers (ported from the games) so real skin art shows in the
  // store on every page — including the hub, which doesn't load the game code.
  const AV_DARK = '#1a1030';
  function pathRoundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function dldHat(ctx, cx, cy, a) {
    const c = a.hatColor || a.legs;
    if (a.hat === 'cap') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy - 4, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 11, cy - 5, 22, 2.4); }
    else if (a.hat === 'antenna') { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 16); ctx.stroke(); ctx.fillStyle = a.body; ctx.beginPath(); ctx.arc(cx, cy - 17, 2.6, 0, Math.PI * 2); ctx.fill(); }
    else if (a.hat === 'bow') { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 7, cy - 14); ctx.lineTo(cx - 7, cy - 6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 7, cy - 14); ctx.lineTo(cx + 7, cy - 6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy - 10, 2.2, 0, Math.PI * 2); ctx.fill(); }
    else if (a.hat === 'crown') { ctx.fillStyle = c; const cb = cy - 8, ct = cy - 16; ctx.beginPath(); ctx.moveTo(cx - 9, cb); ctx.lineTo(cx - 9, ct + 3); ctx.lineTo(cx - 4.5, cb - 2); ctx.lineTo(cx, ct); ctx.lineTo(cx + 4.5, cb - 2); ctx.lineTo(cx + 9, ct + 3); ctx.lineTo(cx + 9, cb); ctx.closePath(); ctx.fill(); }
    else if (a.hat === 'headphones') { ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy - 1, 11, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(cx - 13, cy - 3, 5, 8, 2); ctx.fill(); ctx.beginPath(); ctx.roundRect(cx + 8, cy - 3, 5, 8, 2); ctx.fill(); }
  }
  function dldAvatar(ctx, x, y, w, h, a) {
    const cx = x + w / 2, cy = y + 10;
    if (a.glow) { const g = ctx.createRadialGradient(cx, cy + 8, 2, cx, cy + 8, 26); g.addColorStop(0, a.glow); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + 8, 26, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = a.legs; ctx.fillRect(x + 3, y + 30, 10, 8); ctx.fillRect(x + w - 13, y + 30, 10, 8);
    ctx.fillStyle = a.body; ctx.beginPath(); ctx.roundRect(x + 3, y + 18, w - 6, 14, 3); ctx.fill();
    ctx.fillStyle = a.head; ctx.beginPath();
    if (a.shape === 'square') ctx.roundRect(cx - 10, cy - 10, 20, 20, 5); else ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    dldHat(ctx, cx, cy, a);
    const eyes = (oy) => { ctx.fillStyle = AV_DARK; ctx.beginPath(); ctx.arc(cx - 3.5, cy + oy, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 3.5, cy + oy, 1.8, 0, Math.PI * 2); ctx.fill(); };
    const smile = (oy) => { ctx.strokeStyle = AV_DARK; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + oy, 3.6, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke(); };
    if (a.face === 'smile') { eyes(-1); smile(2); }
    else if (a.face === 'eyes') { eyes(0); }
    else if (a.face === 'visor') { ctx.fillStyle = 'rgba(20,12,40,0.85)'; ctx.beginPath(); ctx.roundRect(cx - 8, cy - 3, 16, 6, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(cx - 6, cy - 2, 4, 2); }
  }
  const SKIN_ART = {
    'dld-nova': { type: 'dld', data: { head: '#fff7ad', body: '#ff8c00', legs: '#ff4d00', shape: 'round', face: 'smile', hat: 'crown', hatColor: '#fff700', glow: '#ffb700' } },
    'dld-phantom': { type: 'dld', data: { head: '#1a1030', body: '#2b0a4a', legs: '#10001f', shape: 'square', face: 'eyes', hat: 'antenna', glow: '#b14dff' } },
    'dld-aurora': { type: 'dld', data: { head: '#caffbf', body: '#2de2e6', legs: '#7d2ae8', shape: 'round', face: 'smile', hat: 'bow', hatColor: '#ff2e97', glow: '#2de2e6' } },
    'dld-cosmo': { type: 'dld', data: { head: '#e0c3fc', body: '#8e2de2', legs: '#4a00e0', shape: 'square', face: 'visor', hat: 'headphones', hatColor: '#00f5d4', glow: '#f72585' } },
    'll-star-cadet': { type: 'll', draw(c) {
      c.fillStyle = '#7c3aed'; pathRoundRect(c, -17, -6, 8, 20, 3); c.fill();
      const g = c.createLinearGradient(0, -4, 0, 22); g.addColorStop(0, '#f3ecff'); g.addColorStop(1, '#cdbcf2');
      c.fillStyle = g; pathRoundRect(c, -13, -6, 28, 28, 10); c.fill();
      c.strokeStyle = '#8b5cf6'; c.lineWidth = 2; pathRoundRect(c, -13, -6, 28, 28, 10); c.stroke();
      c.fillStyle = '#241a40'; pathRoundRect(c, -7, 2, 16, 9, 3); c.fill();
      c.fillStyle = '#48d6a3'; c.beginPath(); c.arc(-2, 6.5, 1.8, 0, 7); c.fill();
      c.fillStyle = '#ffd166'; c.beginPath(); c.arc(4, 6.5, 1.8, 0, 7); c.fill();
      c.fillStyle = '#b9a7e6'; c.beginPath(); c.arc(0, -14, 13, 0, 7); c.fill();
      c.fillStyle = '#241a40'; c.beginPath(); c.arc(0, -14, 10, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-3, -17, 5, 7, -0.5, 0, 7); c.fill();
      c.strokeStyle = '#8b5cf6'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -14, 13, 0, 7); c.stroke();
    } },
    'll-phantom-knight': { type: 'll', draw(c) {
      c.fillStyle = '#5b21b6'; c.beginPath(); c.moveTo(-12, -14); c.lineTo(-26, 18); c.lineTo(-8, 14); c.fill();
      const g = c.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#4b3b73'); g.addColorStop(1, '#2a2046');
      c.fillStyle = g; pathRoundRect(c, -16, -22, 32, 44, 10); c.fill();
      c.fillStyle = '#9f88d6'; c.beginPath(); c.arc(-10, -16, 7, 0, 7); c.fill();
      c.fillStyle = '#1a1430'; pathRoundRect(c, -12, -16, 24, 12, 4); c.fill();
      c.save(); c.shadowColor = '#ff4d6d'; c.shadowBlur = 10; c.fillStyle = '#ff4d6d'; pathRoundRect(c, -2, -12, 12, 4, 2); c.fill(); c.restore();
      c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(0, 2); c.lineTo(5, 8); c.lineTo(0, 14); c.lineTo(-5, 8); c.fill();
    } },
    'll-lava-golem': { type: 'll', draw(c) {
      const g = c.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#5a4a6e'); g.addColorStop(1, '#332a45');
      c.fillStyle = g; c.beginPath(); c.moveTo(-17, -16); c.lineTo(-8, -22); c.lineTo(9, -20); c.lineTo(17, -10); c.lineTo(15, 16); c.lineTo(6, 22); c.lineTo(-9, 21); c.lineTo(-17, 12); c.closePath(); c.fill();
      c.save(); c.shadowColor = '#ff7a18'; c.shadowBlur = 8; c.strokeStyle = '#ff7a18'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-10, -10); c.lineTo(-3, 0); c.lineTo(-8, 8); c.stroke();
      c.beginPath(); c.moveTo(6, -6); c.lineTo(2, 4); c.lineTo(9, 12); c.stroke(); c.restore();
      c.save(); c.shadowColor = '#ffd166'; c.shadowBlur = 6; c.fillStyle = '#ffd166'; c.beginPath(); c.arc(2, -10, 2.4, 0, 7); c.arc(11, -10, 2.4, 0, 7); c.fill(); c.restore();
    } },
    'll-frost-sprite': { type: 'll', draw(c) {
      c.save(); c.shadowColor = '#7fe6ff'; c.shadowBlur = 14;
      const g = c.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#dff7ff'); g.addColorStop(1, '#7fd4ff');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -24); c.lineTo(15, -4); c.lineTo(8, 22); c.lineTo(-8, 22); c.lineTo(-15, -4); c.closePath(); c.fill(); c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 22); c.moveTo(-15, -4); c.lineTo(15, -4); c.stroke();
      c.fillStyle = '#2a4a66'; c.beginPath(); c.arc(2, -2, 2, 0, 7); c.arc(9, -2, 2, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(-5, -8, 2.2, 0, 7); c.fill();
    } },
    'll-neon-bee': { type: 'll', draw(c) {
      c.save(); c.shadowColor = '#7fe6ff'; c.shadowBlur = 8; c.fillStyle = 'rgba(180,240,255,0.75)';
      c.beginPath(); c.ellipse(-6, -14, 9, 6, -0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(-14, -9, 7, 5, -0.3, 0, 7); c.fill(); c.restore();
      c.strokeStyle = '#241a40'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(8, -16); c.quadraticCurveTo(14, -26, 18, -24); c.stroke();
      c.fillStyle = '#241a40'; c.beginPath(); c.arc(18, -24, 2, 0, 7); c.fill();
      c.save(); pathRoundRect(c, -14, -16, 30, 38, 13); c.clip();
      const g = c.createLinearGradient(0, -16, 0, 22); g.addColorStop(0, '#ffe06a'); g.addColorStop(1, '#ffc02e');
      c.fillStyle = g; c.fillRect(-14, -16, 30, 38); c.fillStyle = '#241a40'; c.fillRect(-7, -16, 6, 38); c.fillRect(7, -16, 6, 38); c.restore();
      c.save(); c.shadowColor = '#5ef2ff'; c.shadowBlur = 8; c.fillStyle = '#5ef2ff'; c.beginPath(); c.moveTo(-14, 16); c.lineTo(-22, 20); c.lineTo(-14, 22); c.fill(); c.restore();
      c.fillStyle = '#241a40'; c.beginPath(); c.arc(10, -6, 2.4, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(11, -7, 0.9, 0, 7); c.fill();
    } },
  };
  function renderSkin(key, cv) {
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    const art = SKIN_ART[key];
    if (!art) return;
    c.save();
    if (art.type === 'll') { c.translate(cv.width / 2, cv.height / 2 + 1); c.scale(0.78, 0.78); art.draw(c); }
    else { c.translate(cv.width / 2 - 14, 4); dldAvatar(c, 0, 0, 28, 36, art.data); }
    c.restore();
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
    // Full-screen overlay (great on iPad/phone); content is a centered column so it
    // stays readable on wide desktop screens too.
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;display:none;' +
      'background:#fff;font:600 14px/1.4 Nunito,system-ui,sans-serif;overflow:auto';
    wrap.innerHTML =
      '<div role="dialog" aria-label="Store" style="color:#2a2440;width:100%;min-height:100%;' +
      'max-width:620px;margin:0 auto;padding:20px 18px calc(28px + env(safe-area-inset-bottom));' +
      'display:flex;flex-direction:column;box-sizing:border-box">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<div style="font-size:24px;font-weight:800">Store</div>' +
          '<div style="display:flex;align-items:center;gap:14px">' +
            '<span data-coins style="font-weight:800;font-size:16px;color:#a36b00">★ 0</span>' +
            '<button data-close aria-label="Close" style="border:none;background:#f1ecfb;border-radius:10px;width:38px;height:38px;font-size:20px;cursor:pointer;color:#6a5d86">✕</button>' +
          '</div>' +
        '</div>' +
        '<div data-tabs style="display:flex;gap:8px;margin:16px 0"></div>' +
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
    // opts: skinKey?, title, sub, btnLabel, btnAttr, disabled, done
    const sw = opts.skinKey
      ? '<canvas data-skin="' + opts.skinKey + '" width="44" height="48" style="flex:none;width:44px;height:48px;border-radius:9px;background:#f1ecfb;border:2px solid rgba(0,0,0,.08)"></canvas>'
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
        skinKey: sk.key,
        title: sk.name,
        sub: equipped ? 'Currently worn' : isOwned ? 'Unlocked' : 'Premium skin',
        btnLabel: equipped ? 'Equipped' : isOwned ? 'Equip' : '★ ' + sk.price,
        btnAttr: isOwned ? 'data-equip="' + sk.key + '"' : 'data-avatar="' + sk.key + '"',
        disabled: !isOwned && coins < sk.price,
        done: equipped,
      });
    });
    body.innerHTML = html;
    body.querySelectorAll('canvas[data-skin]').forEach((cv) => renderSkin(cv.getAttribute('data-skin'), cv));
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
