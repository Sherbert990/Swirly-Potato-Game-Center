# Stickmen Hub — Visual Consistency Decisions

> Source of truth for the "Consistency Playbook" polish pass. The hub is the
> north star; Lavender Leap and Don't Look Down drift from it in a few
> repeatable ways. Unify the **chrome** (menus, auth, store, leaderboards, HUD,
> buttons, dialogs). Leave each game's **in-play world** as wild as it likes —
> the neon fall, the pastel platforms stay.

---

## The four moves

1. **Make the shared modals theme-aware.** Store, Leaderboards & Settings use
   hard-coded light colors and stay white in dark mode. Drive every color from
   the hub's CSS variables so they follow light/dark.
2. **One icon set, one currency mark.** Tabler icons everywhere. Coins are
   always the gold coin glyph (`ti ti-coin`, `#c8920c`) — never the `★` used in
   the store. Replace unicode `✕ ☀ ⚙` with `ti-x` / `ti-sun` / `ti-settings`.
3. **One type system.** Fredoka for titles, buttons & numbers; Nunito for body.
   Retire Lavender Leap's Inter and Don't Look Down's system-sans.
4. **Shared chrome, shared screens.** Translucent panels, 16–22px corners, soft
   shadows, the blue-sky plate behind full-screen views. Move both games'
   bespoke auth screens onto the one shared SDK.

---

## Design tokens (already live in the hub)

Drive everything from CSS variables so dark mode is automatic.

### Color — light

| Token       | Hex       | Use                                  |
|-------------|-----------|--------------------------------------|
| `accent`    | `#7d2ae8` | Primary purple — buttons, brand      |
| `accent-2`  | `#1d9e75` | Success / owned / equipped / "you"   |
| `coin`      | `#c8920c` | Coin currency mark (gold)            |
| `ink`       | `#243a5e` | Primary text                         |
| `muted`     | `#5a6b86` | Secondary text                       |

### Color — dark

| Token         | Hex       |
|---------------|-----------|
| `accent·dk`   | `#9b6bff` |
| `accent-2·dk` | `#2bbf95` |
| `panel·dk`    | `#161c30` |
| `ink·dk`      | `#e7edfb` |
| `muted·dk`    | `#9aa8c6` |

Supporting darks seen in mockups: app bg `#0e1226`, chip bg `#231d44`, chip
border `#34285c`, hairline `#2a2150`, gold rank `#ffd166`.

### Type
- **Fredoka 700** — titles, buttons, scores, coin counts. (`.ff` helper / font-family)
- **Nunito 600 / 700 / 800** — body copy, descriptions, labels.

### Shape & elevation
- Corner radii: **22 / 16 / 11px** (large surfaces → controls → chips/buttons).
- Soft shadow: `0 6px 22px rgba(40,60,110,.18)`.
- Modal elevation: `0 10px 40px rgba(40,60,110,.25)` (light), `0 10px 40px rgba(0,0,0,.5)` (dark).

### Icons
- Tabler icons, one set, no emoji/unicode. Common glyphs: `ti-coin`, `ti-trophy`,
  `ti-shopping-bag`, `ti-medal`, `ti-settings`, `ti-x`, `ti-check`, `ti-crown`,
  `ti-world`, `ti-user`, `ti-player-play`, `ti-home`, `ti-sun`.

---

## Surface patterns

### Shared modal (Store / Leaderboards / Settings)
- Render over the hub's blue-sky plate (`assets/background.png` in light;
  app-dark bg in dark).
- Panel: translucent (`rgba(255,255,255,.94)` light / `rgba(22,28,48,.94)` dark),
  1px themed border, 18px radius, `backdrop-filter: blur(4px)`, modal shadow.
- Header: Fredoka title left; coin pill + close (`ti-x`) button right.
- Coin pill: white/dark bg, themed border, `ti-coin` + amount, 20px radius.
- Segmented tabs: active = filled accent, inactive = subtle filled chip + border.
- List rows: 38–44px leading icon/art tile (11px radius), title (Nunito 800) +
  sub (Nunito 600 muted), trailing action (coin button) or status
  (`ti-check` + "Owned"/"Equipped" in accent-2).

### Leaderboards specifics
- `#1` row highlighted with accent gradient wash + gold crown avatar; rank
  number in Fredoka gold.
- "You" row highlighted in accent-2 wash with "· that's you" tag so the player's
  own rank stands out.
- Avatars are circles; ranks are Fredoka numerals (no `#` prefix needed visually).

### Game intro / shell (art-forward)
- **Cover art is the hero** — full-bleed background image per game
  (`assets/dontlookdown-cover.png`, `assets/lavender-cover.png`).
- Bottom scrim gradient keeps copy + buttons readable; art stays dominant.
- Shared translucent chrome over the art: Home + Settings top-left; coin pill +
  Trophy top-right (`rgba(255,255,255,.18)` + `backdrop-filter: blur(6px)`).
- Text block anchored low: Fredoka eyebrow (uppercase, tracked) → Fredoka title
  → Nunito tagline → Play (filled accent) + Store (translucent) + Best score.
- Per-game change = swap the background image only; everything else identical.

---

## Before → after checklist (what to fix in code)

- [ ] Store modal: flat white → translucent themed panel; `★`→`ti-coin`;
      `✕`→`ti-x`; titles → Fredoka; skin chips get art tiles.
- [ ] Leaderboards modal: light-only → theme-aware; add crown for #1, highlight
      "you" row, Fredoka rank numbers.
- [ ] Settings modal: same theme-aware treatment; `☀`/`⚙` → `ti-sun`/`ti-settings`.
- [ ] Lavender Leap: drop Inter → Fredoka/Nunito; recolor to accent tokens; r8 → r11/16.
- [ ] Don't Look Down: drop system-sans → Fredoka/Nunito; neon palette only inside
      the in-play world, chrome uses tokens.
- [ ] Both games: replace bespoke auth screens with the shared SDK auth.
- [ ] Both games: art-forward intro shell, cover art swapped per game.

---

_Companion artifact: `Consistency Playbook.dc.html` (visual before/after for each
surface)._
