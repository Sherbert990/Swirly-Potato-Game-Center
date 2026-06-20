# Swirly Potato Game Center

A lightweight web hub for playing the games I've built. Pick a game from the
landing page and it loads in-place — no installs, no build step.

## Games

| Game | Folder | Controls |
|------|--------|----------|
| Lavender Leap of Doom | `games/lavender-leap/` | Arrows/WASD to run, Space to jump, Shift/Dash to zip |
| Don't Look Down | `games/dont-look-down/` | Arrows/WASD/Space to move & double-jump |

## Running it

Because the hub loads games in an `<iframe>`, open it through a local web
server (opening `index.html` via `file://` can break iframe loading in some
browsers).

```bash
# from this folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

```
Swirly-Potato-Game-Center/
├── index.html      # hub shell (landing + player views)
├── styles.css      # hub styling
├── app.js          # renders game cards, handles launch/back + URL hash routing
├── games.js        # registry of games — add an entry here to add a game
├── assets/         # shared images / icons
└── games/          # each game lives in its own folder, loaded via iframe
    ├── lavender-leap/
    └── dont-look-down/
```

## Adding a game

1. Drop the game's files into `games/<your-game>/` with an `index.html` entry point.
2. Add an entry to the `GAMES` array in `games.js`.

That's it — the card appears on the hub automatically.

## Note on the game copies

The two games are currently **vendored** (copied) into `games/` so the center
is fully self-contained. The originals live in their own repos
(`Lavender-Leap-of-Doom`, `Dont-Look-Down`). If you'd rather pull updates
automatically, these folders are good candidates for git submodules later.
