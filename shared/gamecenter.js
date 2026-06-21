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
  if (document.body) injectHomeButton();
  else document.addEventListener('DOMContentLoaded', injectHomeButton);

  // PWA: register the service worker once (loaded on the hub + every game).
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})(window);
