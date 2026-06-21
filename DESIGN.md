# Swirly Potato Game Center — Design Doc

**Status:** Approved (post CEO review) — ready to build
**Mode:** Builder (learning + fun, no deadline) · CEO review: SELECTIVE EXPANSION
**Approach:** B (foundation-first, ship one game to friends early)
**Date:** 2026-06-20

---

## 1. The Vision

A **game center platform**: one account, one wallet, many games. Sign up, pick an
avatar, play games, earn coins *inside* each game, climb per-game leaderboards,
spend a **shared wallet** in a store on boosts, extra lives, and premium avatars.
Data lives forever in MySQL and follows you to any device. Friends play via a
link; later it can ship to the App Store.

Platform goal: **adding game #3 should be a weekend.** Login, wallet, store,
avatars, leaderboards, and the hub are built **once** as a shared SDK. A new game
writes gameplay and calls the SDK — it never reimplements accounts or economy.

## 2. The Real Shape of This Project

Both games already have full economies, stored in the wrong place, twice.

- **Don't Look Down** (`dont-look-down/index.html`) is *already a finished
  frontend for a backend that doesn't exist yet.* It calls a complete API with
  `fetch(..., {credentials:'same-origin'})` and has login/signup/store/leaderboard
  screens. **Its code is the blueprint — but its current JSON shape is messy and
  game-specific (see §4). We normalize it first, then build the backend to the
  clean contract (decision D5:B).**
- **Lavender Leap** (`lavender-leap/game.js`) does the same in `localStorage`. It
  gets refactored onto the shared SDK later.

> **Plan:** normalize DLD's frontend to a clean multi-game contract → build the
> FastAPI + MySQL backend to that contract → **deploy and get friends playing** →
> extract the shared SDK → migrate Lavender → combined avatars + hub → expansions.

## 3. Key Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Database | **MySQL** | Your requirement. |
| Backend | **FastAPI (Python), sync** | `def` route handlers + SQLAlchemy 2.0 **sync** + `PyMySQL`. Never `async def` calling a sync session (blocks the event loop). Async is a later optimization. |
| Auth | **Starlette `SessionMiddleware`** + **`bcrypt` directly** (NOT passlib) | passlib 1.7.4 crashes against bcrypt>=4.1; use `bcrypt.hashpw`/`checkpw` (~6 lines) + a >72-byte guard. Keep auth swappable for a future JWT/mobile build. |
| Session storage (D1) | **DB-backed session table** | `sessions(token, user_id, expires)`. More code now, but supports server-side logout/ban + "remember me" (Phase 7) without a later rewrite. |
| Tests (D2) | **pytest + real MySQL (docker-compose)** | Test against the engine you ship; SQLite hides MySQL behavior (case-folded unique usernames, index ordering, utf8mb4). Transaction-rollback fixtures + `app.dependency_overrides`. |
| Cookie flags | **driven from config** | `secure=(env=="prod")`, `samesite="lax"`, `httponly=True`. Capacitor later needs `SameSite=None; Secure` + explicit CORS (no wildcard with credentials). |
| Economy | **Shared wallet** | One coin balance across all games. |
| Coins | **Earned in-game**, credited at game-over | Collected during play; client reports total. See anti-cheat below. |
| **Anti-cheat (D3)** | **Server-side sanity caps** | Clamp coins/submission, reject impossible scores, rate-limit score posts. ~20 lines; protects the leaderboard's fun; teaches validation. Full server-authoritative scoring is explicitly out of scope. |
| Avatars | **One combined catalog**, deferred to after first ship | Union of both sets; stable string keys. NOT "mechanical" — see §7. |
| Leaderboards | **Per game; global = ALL users** (opted-in) | Personal history + global. |
| **Contract (D5)** | **Normalize DLD's frontend to the clean contract first** | Build the backend once to the real multi-game shape, not DLD's ad-hoc `{height, stars}` / index-based shape. |
| **Sequencing (D4)** | **Deploy to friends right after one game works** | Phases that follow (SDK, Lavender, avatars, expansions) are internal — don't let them block the first ship. |
| Shared frontend | **Vanilla JS ES modules, no build step** (`shared/`) | Matches existing vanilla games. Caveat: ES modules need a server (no `file://`); Capacitor has its own origin quirks (§9). |
| Accepted expansions | invite/share links, daily streaks, achievements (SDK engine), login hardening — **all AFTER first ship** | You want them; they ride on top of the live platform, not the critical path. |
| App Store path | **Capacitor wrap, later** | Same codebase → iOS/Android (cookie + module caveats §9). |

### Rejected
- `localStorage` only — fails "saved forever / any device."
- Supabase/Firebase — you'd learn their product, not how a backend works.
- Per-game currencies — you chose one shared wallet.
- React/Vue shell — build step + rewriting both games; overkill for vanilla.
- Full server-authoritative scoring — the server would have to simulate the game. Overkill.

## 4. The API Contract (normalized — build the backend to THIS)

DLD today calls ad-hoc, game-specific routes (`/api/score {height, stars}`,
index-based `ownedAvatars`, premium avatars hardcoded at indices 10–13). **Step 1
of the build is to edit DLD's frontend to speak this normalized contract**, then
implement the backend against it.

| Method | Path | Body / returns | Notes |
|---|---|---|---|
| POST | `/api/register` | `{username, password, avatarKey}` | username unique (case-folded), password >4 |
| POST | `/api/login` / `/api/logout` | session cookie | generic failure message |
| GET  | `/api/me` | `{username, avatarKey, coins, items:{...}, ownedAvatars:[keys]}` | normalized; not flat game-specific fields |
| POST | `/api/profile` | `{username?, avatarKey?, showName?}` | rename / avatar / privacy |
| POST | `/api/score` | `{game, score, coins}` | **`game` is required**; server applies sanity caps (D3), credits wallet |
| GET  | `/api/leaderboard/{personal\|global}?game=` | per game | global = opted-in users only |
| POST | `/api/use` | `{item}` | consume a power-up |
| POST | `/api/store/buy` | `{kind:'item'\|'avatar', key}` | **key, not array index**; server checks + deducts |

**Security rules (non-negotiable, P1):**
- **Identity from the session, never from a client-sent id** (blocks IDOR — user A acting as user B).
- bcrypt hashing; parameterized queries / ORM only (no f-string SQL).
- Validate every input server-side; reject loudly.
- Coins/scores pass through **sanity caps** before touching the DB (D3).

## 5. Data Model (MySQL)

```
users(id, username UNIQUE case-folded, password_hash, coins, current_avatar_key,
      show_on_leaderboard, created_at)
avatars(key PK, name, source_game, price, is_premium)   -- stable string keys, not indices
user_avatars(user_id, avatar_key)                        -- ownership; free ones auto-granted
games(id, slug, name)                                    -- AUTHORITATIVE game registry (one row per game)
scores(id, user_id, game_id, score, coins_earned, created_at)
       -- INDEX (game_id, score) for the global board
store_items(key PK, name, type, price)
user_items(user_id, item_key, quantity)
```

The `games` table is the **single source of truth** for the game list. The hub
reads it from an endpoint. Frontend manifests describe assets only — they do not
duplicate the registry.

## 6. Adding a New Game (the recipe this design exists for)

1. `mkdir games/<slug>/` and write gameplay.
2. Add `games/<slug>/manifest.js` (slug, name, thumbnail, scoreLabel, entry).
3. `import { GameCenter } from '/shared/gamecenter.js'`; call `addCoins()` while
   playing and `submitScore(score)` on game over; use `openStore()` / `leaderboard()`.
4. Insert one row in the `games` table.
5. Done — it appears on the hub, shares the wallet, has leaderboards, and (once the
   achievements engine lands) can define achievements. **Zero account/economy code.**

## 7. Avatars — combined catalog (deferred; NOT "mechanical")

Catalog = union: Lavender's 9 (Cyber Ninja, Mecha Bot, Galaxy Slime, Flame Fox,
Star Cadet, Phantom Knight, Lava Golem, Frost Sprite, Neon Bee) + DLD's 14 (Aqua,
Ember, Leaf, Wave, Rose, Bolt, Grape, Bot, Mint, Volt + Nova, Phantom, Aurora,
Cosmo).

**Honest about the cost** (CEO review correction): the two games use *different
renderers* — DLD is a declarative color/shape spec run through a ~70-line canvas
renderer; Lavender is hand-coded `draw()` functions. Unifying means either
rewriting all 9 Lavender avatars into DLD's spec (real art work, visual
regressions) or supporting two renderers behind one interface (more code). Plus
moving to **stable string keys** (done in §5) replaces DLD's index-based
`ownedAvatars`. This is why it's deferred to after first ship.

## 8. Screens & Hub Design (LOCKED — design review 2026-06-21)

Auth · Hub · Game intro screens · Store · Leaderboards (per game, Personal/Global).

**Brand: "The Stickmen Hub"** (renamed from Swirly Potato Game Center). Hand-drawn
stickman motif throughout. Desktop/tablet/web layout (no phone-specific mockups).

**Locked hub design** — reference prototype + assets in `design/hub/`
(`hub-preview.html` + PNGs). Composition:
- **Top bar** (recreated in themeable HTML/CSS, matches Option H): waving-stickman
  "The Stickmen Hub" logo (left); coin balance pill, profile avatar + level, Store,
  Leaderboards, Log out, and a **light/dark toggle** (right). Recolors with theme.
- **Background:** a full-bleed illustrated **blue-sky scenery plate** (signpost,
  castle, tightrope walker, mountains, floating platforms, doodle stickmen) — a
  dedicated UI-free asset (`design/hub/background.png`). Dark mode dims it via scrim.
- **Game cards** (prominent, center): each = illustrated cover + title + one-line
  description + Play. Lavender Leap shows Time Trial / Freeplay / Hard Mode chips;
  Don't Look Down shows Endless / Beat-your-best. Covers are fixed art assets
  (`lavender-cover.png`, `dontlookdown-cover.png`) — identical in light & dark.
- **Journey strip** (bottom): the illustrated "Play games → Earn coins → Climb
  leaderboards → Become a legend" path + streak (`journey-strip.png`, from Option I).
- **Light/dark toggle:** recolors top bar, cards, panels, and dims the background;
  the illustrated art (covers, journey) stays the same image in both themes.

**Game intro screens** (on first click, per Option 7/8): title + description +
big Play. Lavender Leap = the three mode buttons; Don't Look Down = endless parkour.

Mobile-responsive (column stacks under ~780px). The hub `games` list is still
driven by the `games` table (§5); the cards above are the rendering of it.

## 9. Open Items / Watch-outs

1. **Cookie auth vs. mobile.** `same-origin` cookies are great for web; Capacitor
   loads from a local origin → likely **JWT + CORS** for the App Store build. Keep
   auth swappable in the SDK.
2. **ES modules + serving.** ES modules need an HTTP origin (no `file://`); the
   FastAPI same-origin serve covers this. Capacitor module-loading needs checking
   before the app-store build.
3. **DLD is one 850-line inline script with globals.** Extracting it into
   `shared/` ES modules is a real refactor (shared scope → modules), not copy-paste.
4. **Score validation depth.** Sanity caps (D3) stop casual cheating; a determined
   cheater within physical limits still gets through. Accepted for friends.
5. **Coin-farm risk.** One wallet + two earning curves → the more coin-generous
   game becomes a farm that trivializes the other's store. This is a *design*
   problem, not just tuning: normalize earn rates when Lavender joins the wallet.
6. **Old localStorage data is discarded.** Lavender players lose local progress at
   migration (no real accounts existed). State this to friends who've been playing.
7. **Password reset.** None in v1 (needs email). Needed before App Store.
8. **DLD's old Node backend — NOT used (decided).** The synced DLD project shipped a
   `server.js` (Node/scrypt/JSON-file/in-memory sessions). **Decision: discard it; the
   backend is the approved FastAPI + MySQL plan (Approach A)** — it's more complete
   (multi-game, MySQL, DB-backed sessions per D1, anti-cheat caps). `server.js` and
   `package.json` were removed from the repo. The DLD **frontend**
   (`dont_look_down.html`) stays and still defines the `/api/*` contract we build to
   (§4). The original Node server remains in the standalone Dont-Look-Down project if
   ever needed for reference.

## 10. Build Order (resequenced — D4: ship to friends early)

Each phase is playable. **The first three get a real game live to friends.**

- **Phase 1 — Normalize the contract + backend skeleton.** Edit DLD's frontend to
  speak the §4 contract. Stand up FastAPI + MySQL + migrations (Alembic). Implement
  `/api/register`, `/api/login`, `/api/me`, `/api/score` with session cookies,
  bcrypt, IDOR-safe identity, sanity caps. **Seed `games`/`avatars`/`store_items`
  via a migration first** — `/api/score` needs a `games` row (FK) to exist.
  Sessions in a DB table (D1). *Done when:* DLD boots, you sign up, climb, score
  saves to MySQL, and the pytest suite (real MySQL) passes for register/login/score.
- **Phase 2 — Finish DLD's API.** `/api/store/buy`, `/api/use`, `/api/profile`,
  `/api/logout`, both leaderboards (with the `scores` index). *Done when:* DLD's
  store + boards run off MySQL.
- **Phase 3 — DEPLOY to friends.** Managed MySQL + host (Railway / Render /
  PlanetScale); env vars for `DATABASE_URL` + `SECRET_KEY`. *Done when:* a friend
  on their phone signs up and appears on the global board. **This is the milestone.**
- **Phase 4 — Extract the shared SDK.** Pull DLD's auth/wallet/store/leaderboard
  into `shared/` (real refactor per §9.3). Refactor DLD to import it.
- **Phase 5 — Migrate Lavender onto the SDK.** Replace `localStorage`; coins/skins
  → shared wallet + store; normalize earn rates (§9.5). Discard old local data (§9.6).
- **Phase 6 — Combined avatars + hub homescreen** (§7).
- **Phase 7 — Expansions** (accepted, on top of the live platform):
  share/invite links · daily streak + login bonus · achievements engine in the SDK
  · login hardening (rate-limit + remember-me, pairs with Phase 1 auth).
- **Phase 8 — App Store (future).** Capacitor wrap (§9.1–9.2).

## 11. Implementation Tasks (P1 = before first ship)

- [ ] **T1 (P1)** Pin DLD's real JSON shapes from `dont-look-down/index.html`; edit the frontend to the §4 normalized contract.
- [ ] **T2 (P1)** FastAPI (sync) + SQLAlchemy 2.0 + PyMySQL + Alembic. Tables: `users`, `scores`, `games`, `avatars`, `store_items`, `user_avatars`, `user_items`, **`sessions`**. Explicit `String(length=)` + `mysql_charset='utf8mb4'`; read every autogenerated migration before applying.
- [ ] **T3 (P1)** **Seed migration** for `games`/`avatars`/`store_items` (the §7 catalog) — Phase 1 can't pass without a `games` row (FK).
- [ ] **T4 (P1)** Auth: register/login/logout with **`bcrypt` directly (not passlib)** + >72-byte guard; **DB-backed session table (D1)**; **identity from session (IDOR-safe)**.
- [ ] **T5 (P1)** `/api/score` with **sanity caps** (clamp coins, reject impossible scores, rate-limit) — D3.
- [ ] **T6 (P1)** Server-side input validation (username case-folded unique, password, all bodies); parameterized queries / ORM only.
- [ ] **T7 (P1)** Index `scores(game_id, score)`; empty-leaderboard returns `200 + []` with an empty-state UI.
- [ ] **T8 (P1)** Clean error contract — named statuses (401/403/409/422/429/503), never bare 500, never `except Exception:` swallow.
- [ ] **T9 (P1)** Test harness: **pytest + real MySQL via `docker-compose`**, transaction-rollback fixtures, `app.dependency_overrides`. Cover the §10 Phase-1 critical paths (IDOR, anti-cheat cap, auth-required, password validation).
- [ ] **T10 (P1)** `StaticFiles`: define `/api/*` routes **first**, mount static at specific prefixes (`/games`, `/shared`), serve hub via explicit route; verify `.js` MIME = `text/javascript` in the smoke test.
- [ ] **T11 (P1)** Cookie flags from config: `secure=(env=="prod")`, `samesite="lax"`, `httponly=True`.
- [ ] **T12 (P2)** Double-submit / navigate-away guard on `submitScore()`; surface "couldn't save score" on failed POST.
- [ ] **T13 (P2)** Structured log line on every auth attempt and every coin mutation.
- [ ] **T14 (P2)** Deploy: env-var secrets (`DATABASE_URL`, `SECRET_KEY`), managed MySQL, post-deploy smoke check (signup → score → board, `.js` MIME).
- [ ] **T15 (P1)** **Rename** "Swirly Potato Game Center" → "The Stickmen Hub" in `index.html`, `<title>`s, and any visible copy.
- [ ] **T16 (P2)** Wire the locked hub design: use `design/hub/` prototype as the hub front-end reference; bring in the background plate + two cover images + journey strip as assets; implement the themeable top bar + light/dark toggle (persist choice). (Hub homescreen lands in Phase 6.)
- [ ] **T17 (P3)** Game intro screens (Lavender modes / Don't Look Down endless) per §8, when each game integrates with the SDK.

---

*When ready to build, ask me to scaffold Phase 1.*

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | clean | 4 proposals, 4 accepted, 0 deferred |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | clean | 2 issues (auth lib, test DB), 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | hub design LOCKED (3/10 → 9/10); brand renamed to The Stickmen Hub |

- **CROSS-MODEL:** Outside voice (Claude subagent, both reviews) absorbed: contract normalization + deploy-early resequence (CEO); passlib→bcrypt, sync stack, catalog seeding, real-MySQL tests, cookie config (Eng).
- **DESIGN:** Locked "The Stickmen Hub" — light/dark hub, blue-sky scenery background, H game covers, Option I journey strip, recreated themeable top bar. Reference prototype + assets in `design/hub/`.
- **VERDICT:** CEO + ENG + DESIGN CLEARED — ready to implement.

NO UNRESOLVED DECISIONS
