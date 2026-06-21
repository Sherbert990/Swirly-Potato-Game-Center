# TODOS — Swirly Potato Game Center

Deferred work from the CEO plan review (2026-06-20). Critical-path tasks live in
[DESIGN.md](DESIGN.md) §11. This file is post-first-ship and nice-to-have work.

## Accepted expansions (build AFTER first ship — DESIGN.md Phase 7)
- [ ] **Share / invite links** (P2) — deployed URL + "share to play" link; later friend-codes for a friends leaderboard. Serves the "distribute to friends" goal. Needs deploy + accounts (Phases 1–3).
- [ ] **Daily streak + login bonus** (P3) — consecutive-day play → bonus coins + streak counter on the hub. Retention. Cheap once the wallet exists.
- [ ] **Achievements engine in the SDK** (P3) — per-game milestones defined via the SDK so every future game gets them free. The real platform bet. Needs the SDK (Phase 4).
- [ ] **Login hardening** (P2) — rate-limit login attempts + "remember me" longer sessions. Pairs with Phase 1 auth.

## Deferred / watch-outs (from the review)
- [ ] **Combined avatars** (M–L) — unify two renderers + move to stable keys. NOT mechanical (DESIGN.md §7). Deferred to Phase 6.
- [ ] **Coin-farm balancing** — normalize earn rates across games when Lavender joins the shared wallet, so one game isn't a coin farm (DESIGN.md §9.5).
- [ ] **Password reset** — needs email; required before App Store, not before friends.
- [ ] **Phase 9 — App Store (Capacitor)** — SAVED FOR LATER (user deferred). Wrap the now-installable PWA with Capacitor for native iOS/Android store presence: switch session cookies → JWT+CORS, verify ES-module loading under Capacitor's origin, add an Apple Developer account ($99/yr) + Play Console. Only needed if the installable PWA isn't enough. (DESIGN.md §9.1–9.2)
- [ ] **Full anti-cheat** — server-authoritative scoring. Out of scope; sanity caps (D3) cover v1.

## Recommended next reviews
- [ ] `/plan-eng-review` — architecture + tests (the required shipping gate).
- [ ] `/plan-design-review` — the hub homescreen has no design yet; run before Phase 6.
