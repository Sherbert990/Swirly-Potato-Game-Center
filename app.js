// Renders the game cards and handles launching / returning from a game.
const hub = document.getElementById("hub");
const grid = document.querySelector(".grid");
const player = document.getElementById("player");
const frame = document.getElementById("frame");
const playerTitle = document.getElementById("player-title");
const backBtn = document.getElementById("back");

function renderCards() {
  grid.innerHTML = "";
  GAMES.forEach((game) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.style.setProperty("--accent", game.accent);
    card.innerHTML = `
      <span class="card-art" aria-hidden="true"></span>
      <span class="card-body">
        <span class="card-title">${game.title}</span>
        <span class="card-blurb">${game.blurb}</span>
        <span class="card-cta">Play ▶</span>
      </span>
    `;
    card.addEventListener("click", () => launch(game));
    grid.appendChild(card);
  });
}

function launch(game) {
  frame.src = game.path;
  playerTitle.textContent = game.title;
  hub.hidden = true;
  player.hidden = false;
  location.hash = game.id;
}

function showHub() {
  player.hidden = true;
  hub.hidden = false;
  frame.src = "about:blank"; // stop the running game
  if (location.hash) history.replaceState(null, "", location.pathname);
}

backBtn.addEventListener("click", showHub);

// Allow deep-linking / refresh to a specific game via the URL hash.
function syncFromHash() {
  const id = location.hash.replace("#", "");
  const game = GAMES.find((g) => g.id === id);
  if (game) launch(game);
  else showHub();
}

renderCards();
syncFromHash();
window.addEventListener("hashchange", syncFromHash);
