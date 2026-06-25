const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const timerEl = document.querySelector("#timer");
const moodEl = document.querySelector("#mood");
const startBtn = document.querySelector("#start");
const levelInput = document.querySelector("#levelInput");
const goBtn = document.querySelector("#go");
const startupOverlay = document.querySelector("#startup");
const nameInput = document.querySelector("#nameInput");
const playBtn = document.querySelector("#play");
const modesBtnControl = document.querySelector("#modesBtn");
const avatarPicker = document.querySelector("#avatarPicker");
const welcomeScreen = document.querySelector("#welcome");
const signinScreen = document.querySelector("#signin");
const createScreen = document.querySelector("#create");
const goSigninBtn = document.querySelector("#goSignin");
const goCreateBtn = document.querySelector("#goCreate");
const signinInput = document.querySelector("#signinInput");
const createInput = document.querySelector("#createInput");
const signinBtn = document.querySelector("#signinBtn");
const createBtn = document.querySelector("#createBtn");
const signinError = document.querySelector("#signinError");
const createError = document.querySelector("#createError");
const editProfileBtn = document.querySelector("#editProfile");
const logoutBtn = document.querySelector("#logout");
const modesScreen = document.querySelector("#modes");
const modesGreeting = document.querySelector("#modesGreeting");
const resultsScreen = document.querySelector("#results");
const resultLevels = document.querySelector("#resultLevels");
const highScores = document.querySelector("#highScores");
const bestScore = document.querySelector("#bestScore");
const runHistory = document.querySelector("#runHistory");
const resultsAgainBtn = document.querySelector("#resultsAgain");
const resultsModesBtn = document.querySelector("#resultsModes");
const modeTag = document.querySelector("#modeTag");
const timerUnit = document.querySelector("#timerUnit");
const warpEl = document.querySelector(".warp");
const coinsEl = document.querySelector("#coins");
const visitStoreBtn = document.querySelector("#visitStore");
const visitStoreModesBtn = document.querySelector("#visitStoreModes");
const storeScreen = document.querySelector("#store");
const storeCoinsEl = document.querySelector("#storeCoins");
const storeMsg = document.querySelector("#storeMsg");
const storePowerups = document.querySelector("#storePowerups");
const storeSkins = document.querySelector("#storeSkins");
const storeBackBtn = document.querySelector("#storeBack");
const storeResumeBtn = document.querySelector("#storeResume");
const toastEl = document.querySelector("#toast");
const ppLives = document.querySelector("#ppLives");
const ppBoosts = document.querySelector("#ppBoosts");
const reviveScreen = document.querySelector("#revive");
const reviveCountEl = document.querySelector("#reviveCount");
const reviveUseBtn = document.querySelector("#reviveUse");
const reviveDeclineBtn = document.querySelector("#reviveDecline");
const saveLevelBtn = document.querySelector("#saveLevel");
const showNameToggle = document.querySelector("#showName");
const leaderboardScreen = document.querySelector("#leaderboard");
const lbBoard = document.querySelector("#lbBoard");
const lbScope = document.querySelector("#lbScope");
const lbList = document.querySelector("#lbList");
const lbMsg = document.querySelector("#lbMsg");
const lbBackBtn = document.querySelector("#lbBack");
const lbResumeBtn = document.querySelector("#lbResume");
const modesLeaderboardBtn = document.querySelector("#modesLeaderboard");
const resultsLeaderboardBtn = document.querySelector("#resultsLeaderboard");
const storeSectionSeg = document.querySelector("#storeSection");

const MODE_LABELS = {
  freeplay: "Freeplay",
  timetrial: "Time Trial",
  hard: "Hard Mode",
};
const TIME_TRIAL_SECONDS = 120;
const TIME_BOOST_SECONDS = 30;

// Skins 0-3 are free starters; 4-8 are unlocked in the store.
const FREE_SKINS = [0, 1, 2, 3];
const SKIN_PRICES = { 4: 20, 5: 25, 6: 30, 7: 35, 8: 40 };
const LIFE_PRICE = 15;
const BOOST_PRICE = 15;
const DOUBLE_JUMP_PRICE = 60;  // matches store_items seed

let playerName = "Hero";
let selectedAvatar = 0;
let currentUser = "";
let editingProfile = false;
let editingOldName = "";
let userCoins = 0;
let toastTimer = 0;

const world = {
  width: canvas.width,
  height: canvas.height,
  levelWidth: 4200,
  level: 0,
  levelStartScore: 0,
  score: 0,
  meters: 0,
  running: false,
  won: false,
  last: 0,
  cameraX: 0,
  shake: 0,
  keys: new Set(),
  loopId: 0,
  frameMs: 1000 / 40,
  mode: "freeplay",
  levelsPassed: 0,
  hardBest: 1,   // highest level reached this Hard Mode session (for the hard board)
  timeLeft: TIME_TRIAL_SECONDS,
  touchDir: 0,   // -1/0/1 from the on-screen joystick (added to keyboard input)
};

const player = {
  x: 90,
  y: 410,
  w: 34,
  h: 44,
  vx: 0,
  vy: 0,
  facing: 1,
  grounded: false,
  coyote: 0,
  ride: null,   // platform currently standing on (to ride its vertical movement)
  canDoubleJump: false,  // one mid-air jump per airtime, only with the Double Jump Pass
};

let platforms = [];
let crystals = [];
let hazards = [];
let confetti = [];
let backgrounds = [];

const levels = [
  {
    width: 2400,
    theme: "cloud",
    bg: ["#fbf4ff", "#eadcff", "#d6bcff"],
    platform: "#b68cff",
    trim: "#8b5cf6",
    platforms: [
      { x: 0, y: 448, w: 520, h: 34, kind: "ground" },
      { x: 610, y: 390, w: 210, h: 26, kind: "soft" },
      { x: 900, y: 325, w: 180, h: 26, kind: "soft" },
      { x: 1190, y: 385, w: 230, h: 26, kind: "soft", baseX: 1190, moveX: 70, speed: 1.1 },
      { x: 1540, y: 315, w: 190, h: 26, kind: "soft" },
      { x: 1900, y: 430, w: 360, h: 34, kind: "ground" },
    ],
    crystals: [
      { x: 665, y: 340, r: 13, got: false },
      { x: 955, y: 275, r: 13, got: false },
      { x: 1280, y: 330, r: 13, got: false },
      { x: 1608, y: 266, r: 13, got: false },
      { x: 2080, y: 375, r: 16, got: false },
    ],
    hazards: [
      { x: 520, y: 470, w: 95, h: 28, kind: "spikes" },
      { x: 820, y: 470, w: 120, h: 28, kind: "spikes" },
      { x: 1740, y: 470, w: 105, h: 28, kind: "spikes" },
    ],
  },
  {
    width: 3000,
    theme: "blocks",
    bg: ["#f0e7ff", "#d8c4ff", "#bd9cff"],
    platform: "#a78bfa",
    trim: "#7c3aed",
    platforms: [
      { x: 0, y: 448, w: 430, h: 34, kind: "ground" },
      { x: 550, y: 365, w: 185, h: 26, kind: "soft" },
      { x: 850, y: 295, w: 190, h: 26, kind: "soft", baseY: 295, moveY: 48, speed: 1.25 },
      { x: 1190, y: 375, w: 210, h: 26, kind: "soft" },
      { x: 1510, y: 325, w: 190, h: 26, kind: "soft" },
      { x: 1900, y: 405, w: 230, h: 26, kind: "soft" },
      { x: 2260, y: 325, w: 230, h: 26, kind: "soft" },
      { x: 2620, y: 430, w: 310, h: 34, kind: "ground" },
    ],
    crystals: [
      { x: 610, y: 312, r: 13, got: false },
      { x: 930, y: 245, r: 13, got: false },
      { x: 1280, y: 325, r: 13, got: false },
      { x: 1590, y: 275, r: 13, got: false },
      { x: 1990, y: 353, r: 13, got: false },
      { x: 2360, y: 275, r: 16, got: false },
    ],
    hazards: [
      { x: 430, y: 442, w: 92, h: 56, kind: "block" },
      { x: 1045, y: 470, w: 125, h: 28, kind: "saw" },
      { x: 1710, y: 430, w: 42, h: 68, kind: "beam" },
      { x: 2490, y: 470, w: 120, h: 28, kind: "saw" },
    ],
  },
  {
    width: 3600,
    theme: "neon",
    bg: ["#dfd1ff", "#b996ff", "#8358df"],
    platform: "#9f7aea",
    trim: "#6d28d9",
    platforms: [
      { x: 0, y: 448, w: 380, h: 34, kind: "ground" },
      { x: 510, y: 395, w: 190, h: 26, kind: "soft" },
      { x: 820, y: 325, w: 170, h: 26, kind: "soft" },
      { x: 1120, y: 390, w: 190, h: 26, kind: "soft", baseX: 1120, moveX: 120, speed: 1.25 },
      { x: 1540, y: 280, w: 180, h: 26, kind: "soft" },
      { x: 1880, y: 375, w: 220, h: 26, kind: "soft", baseY: 375, moveY: 66, speed: 1.4 },
      { x: 2280, y: 315, w: 180, h: 26, kind: "soft" },
      { x: 2620, y: 390, w: 210, h: 26, kind: "soft", baseX: 2620, moveX: 100, speed: 1.2 },
      { x: 3100, y: 430, w: 420, h: 34, kind: "ground" },
    ],
    crystals: [
      { x: 560, y: 345, r: 13, got: false },
      { x: 880, y: 276, r: 13, got: false },
      { x: 1210, y: 340, r: 13, got: false },
      { x: 1600, y: 232, r: 13, got: false },
      { x: 1980, y: 315, r: 13, got: false },
      { x: 2338, y: 264, r: 13, got: false },
      { x: 2730, y: 342, r: 13, got: false },
      { x: 3300, y: 375, r: 16, got: false },
    ],
    hazards: [
      { x: 380, y: 470, w: 130, h: 28, kind: "spikes" },
      { x: 990, y: 442, w: 90, h: 56, kind: "block" },
      { x: 1340, y: 470, w: 160, h: 28, kind: "saw" },
      { x: 2120, y: 336, w: 42, h: 130, kind: "beam" },
      { x: 2840, y: 470, w: 230, h: 28, kind: "spikes" },
    ],
  },
];

function makeGeneratedLevel(index) {
  const n = index + 1;
  const themes = [
    {
      theme: "cloud",
      platform: "#c4a1ff",
      trim: "#8b5cf6",
    },
    {
      theme: "blocks",
      platform: "#a78bfa",
      trim: "#7c3aed",
    },
    {
      theme: "neon",
      platform: "#9469e8",
      trim: "#5b21b6",
    },
  ];
  const theme = themes[index % themes.length];
  const palette = makePurplePalette(index);
  const difficulty = index - 2;
  // Levels grow longer as you climb.
  const width = Math.min(9200, 2800 + index * 70);
  // Moving platforms appear fast, then every platform moves by ~level 18.
  const movingEvery = Math.max(1, 3 - Math.floor(difficulty / 8));
  // From early on, big gaps carry a second floor hazard; later ones move diagonally.
  const doubleHazard = difficulty >= 8;
  const platforms = [{ x: 0, y: 448, w: 430, h: 34, kind: "ground" }];
  const crystals = [];
  const hazards = [];
  let x = 500;

  while (x < width - 520) {
    const step = platforms.length;
    const y = step === 1 ? 390 : 300 + ((step * 53 + index * 29) % 120);
    // Landing pads shrink steadily — precision is the main difficulty lever.
    const w = Math.max(82, 160 - Math.floor(difficulty * 1.0) + ((step * 31 + index * 7) % 30));
    const platform = { x, y, w, h: 26, kind: "soft" };
    if (index > 1 && step > 1 && step % movingEvery === 0) {
      platform.speed = 0.95 + Math.min(1.3, difficulty * 0.018);
      const diag = difficulty >= 28 && (step + index) % 3 === 0;
      if (diag || (step + index) % 2 === 0) {
        platform.baseY = y;
        platform.moveY = Math.min(110, 32 + difficulty * 1.3);
      }
      if (diag || (step + index) % 2 === 1) {
        platform.baseX = x;
        platform.moveX = Math.min(100, 34 + difficulty * 1.2);
      }
    }
    platforms.push(platform);
    if (step % 3 === 0 && index >= 5) crystals.push({ x: x + w / 2, y: y - 52, r: 13, got: false });

    const hazardKind = ["spikes", "block", "saw", "beam"][(step + index) % 4];
    if (hazardKind === "block") hazards.push({ x: x + w + 60, y: 442, w: 80, h: 56, kind: "block" });
    else if (hazardKind === "beam") hazards.push({ x: x + w + 80, y: 322, w: 42, h: 140, kind: "beam" });
    else if (hazardKind === "saw") hazards.push({ x: x + w + 38, y: 470, w: 105, h: 28, kind: "saw" });
    else hazards.push({ x: x + w + 32, y: 470, w: 118, h: 28, kind: "spikes" });

    // Second floor hazard punishes a missed long jump.
    if (doubleHazard && (step + index) % 2 === 0) {
      hazards.push({ x: x + w + 150, y: 470, w: 112, h: 28, kind: step % 2 ? "saw" : "spikes" });
    }

    // Gap grows with difficulty, but shrinks when the next platform sits higher
    // (rising jumps lose horizontal reach) so every gap stays clearable.
    const nextY = 300 + (((step + 1) * 53 + index * 29) % 120);
    const rise = y - nextY;
    let voidLen = Math.min(260 + difficulty * 5, 365 - rise * 1.4);
    voidLen = Math.max(150, Math.min(430, voidLen));
    x += w + voidLen;
  }

  platforms.push({ x: width - 430, y: 430, w: 360, h: 34, kind: "ground" });
  crystals.push({ x: width - 260, y: 375, r: 16, got: false });

  return {
    width,
    theme: theme.theme,
    bg: palette.bg,
    platform: theme.platform,
    trim: theme.trim,
    platforms,
    crystals,
    hazards,
    name: `Level ${n}`,
  };
}

function makePurplePalette(index) {
  const hue = 262 + ((index * 7) % 22);
  const top = 95 - (index % 5);
  const mid = 86 - ((index * 3) % 11);
  const bottom = 74 - ((index * 5) % 16);
  return {
    bg: [
      `hsl(${hue}, 100%, ${top}%)`,
      `hsl(${hue + 4}, 88%, ${mid}%)`,
      `hsl(${hue - 5}, 78%, ${bottom}%)`,
    ],
  };
}

for (let i = levels.length; i < 100; i += 1) {
  levels.push(makeGeneratedLevel(i));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function reset() {
  world.score = 0;
  world.level = 0;
  world.levelStartScore = 0;
  if (world.mode === "timetrial") {
    world.levelsPassed = 0;
    world.timeLeft = TIME_TRIAL_SECONDS;
  }
  if (world.mode === "hard") world.hardBest = 1;
  startLevel(0);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function startLevel(index, restarting = false) {
  world.level = index;
  if (world.mode === "hard") world.hardBest = Math.max(world.hardBest, index + 1);
  if (!restarting) world.levelStartScore = world.score;
  world.levelWidth = levels[index].width;
  world.meters = 0;
  world.running = true;
  world.won = false;
  world.last = performance.now();
  world.cameraX = 0;
  world.shake = 0;

  player.x = 90;
  player.y = 410;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.grounded = false;
  player.coyote = 0;
  // Drop any keys still held from the previous level so the player doesn't
  // auto-run off the spawn ledge the instant a new level loads.
  world.keys.clear();

  buildLevel(index);
  startBtn.textContent = "Restart";
  updateHud();
  if (!world.loopId) world.loopId = requestAnimationFrame(loop);
}

function buildLevel(index = world.level) {
  const level = levels[index];
  platforms = level.platforms.map((platform) => ({ ...platform }));
  crystals = level.crystals.map((crystal) => ({ ...crystal }));
  hazards = level.hazards.map((hazard) => ({ ...hazard }));
  confetti = [];
  backgrounds[index] ||= makeBackground(index);
}

function updateHud() {
  updateCoinHud();
  if (world.mode === "timetrial") {
    timerEl.textContent = formatTime(world.timeLeft);
    timerUnit.textContent = " left";
  } else {
    timerEl.textContent = world.meters;
    timerUnit.textContent = "m";
  }
  moodEl.textContent = `${world.level + 1}/100`;
  if (document.activeElement !== levelInput) levelInput.value = world.level + 1;
}

function jump() {
  if (!world.running) return;
  if (player.grounded || player.coyote > 0) {
    player.vy = -620;
    player.grounded = false;
    player.coyote = 0;
    burst(player.x + player.w / 2, player.y + player.h, "#ffffff", 5);
  } else if (player.canDoubleJump) {
    // Double Jump Pass: one extra jump while airborne.
    player.vy = -560;
    player.canDoubleJump = false;
    burst(player.x + player.w / 2, player.y + player.h, "#5ef2ff", 7);
  }
}

function burst(x, y, color, count) {
  if (confetti.length > 28) return;
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(80, 260);
    confetti.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.35, 0.85),
      maxLife: 0.85,
      color,
    });
  }
}

function updatePlatforms(now) {
  platforms.forEach((platform) => {
    platform.prevX = platform.x;
    platform.prevY = platform.y;
    if (platform.moveX) platform.x = platform.baseX + Math.sin(now * platform.speed) * platform.moveX;
    if (platform.moveY) platform.y = platform.baseY + Math.sin(now * platform.speed) * platform.moveY;
    // True per-frame movement so a rider is carried the full distance (a small
    // clamp only guards against a teleport on the very first frame).
    platform.dx = Math.max(-20, Math.min(20, platform.x - platform.prevX));
    platform.dy = Math.max(-20, Math.min(20, platform.y - platform.prevY));
  });
}

function updatePlayer(dt) {
  const left = world.keys.has("arrowleft") || world.keys.has("a") || world.touchDir < 0;
  const right = world.keys.has("arrowright") || world.keys.has("d") || world.touchDir > 0;
  const accel = player.grounded ? 2200 : 1250;
  const friction = player.grounded ? 0.82 : 0.95;

  if (left) {
    player.vx -= accel * dt;
    player.facing = -1;
  }
  if (right) {
    player.vx += accel * dt;
    player.facing = 1;
  }
  if (!left && !right) player.vx *= friction;

  player.vx = Math.max(-430, Math.min(430, player.vx));
  // Ride the platform vertically: stick to it as it moves up/down (updatePlatforms
  // already ran this frame, so .dy is current). Keeps the player from detaching.
  if (player.grounded && player.ride) player.y += player.ride.dy || 0;
  player.vy += 1550 * dt;
  player.coyote = Math.max(0, player.coyote - dt);

  player.x += player.vx * dt;
  resolveHorizontal();
  player.y += player.vy * dt;
  resolveVertical();

  if (player.y > world.height + 120) respawn();
  player.x = Math.max(0, Math.min(world.levelWidth - player.w, player.x));
}

function resolveHorizontal() {
  const body = { x: player.x, y: player.y, w: player.w, h: player.h };
  platforms.forEach((platform) => {
    if (!rectsOverlap(body, platform)) return;
    if (player.vx > 0) player.x = platform.x - player.w;
    if (player.vx < 0) player.x = platform.x + platform.w;
    player.vx = 0;
    body.x = player.x;
  });
}

function resolveVertical() {
  const body = { x: player.x, y: player.y, w: player.w, h: player.h };
  player.grounded = false;
  player.ride = null;
  platforms.forEach((platform) => {
    if (!rectsOverlap(body, platform)) return;
    if (player.vy > 0) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.coyote = 0.1;
      player.ride = platform;        // remember it so we ride its vertical movement next frame
      player.x += platform.dx || 0;  // carry horizontal delta so the player sticks
      player.canDoubleJump = ownsDoubleJump();  // refresh the air-jump on every landing
    } else if (player.vy < 0) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
    body.y = player.y;
  });
  if (!player.grounded && player.vy > 0) player.coyote = Math.max(player.coyote, 0);
}

function respawn() {
  world.shake = 8;
  confetti = [];
  if (world.mode === "hard") {
    if (getInventory(currentUser).lives > 0) {
      promptRevive();
      return;
    }
    restartFromLevelOne();
    return;
  }
  world.score = world.levelStartScore;
  startLevel(world.level, true);
}

function promptRevive() {
  stopLoop();
  reviveCountEl.textContent = getInventory(currentUser).lives;
  showScreen(reviveScreen);
}

async function useRevive() {
  const r = await GameCenter.use("extra_life");
  if (!r.ok) { flashBanner(r.error || "No revives left"); declineRevive(); return; }
  applyUser(r.data);
  flashBanner(`Revive used — ${(gc.items && gc.items.extra_life) || 0} left`);
  showScreen(null);
  world.score = world.levelStartScore;
  startLevel(world.level, true);
}

function declineRevive() {
  showScreen(null);
  restartFromLevelOne();
}

function restartFromLevelOne() {
  commitRun(true);  // run is ending — flush coins + record the Hard Mode best reached
  world.score = 0;
  world.level = 0;
  world.levelStartScore = 0;
  startLevel(0, true);
}

function updateCollectibles() {
  crystals.forEach((crystal) => {
    if (crystal.got) return;
    const box = { x: crystal.x - crystal.r, y: crystal.y - crystal.r, w: crystal.r * 2, h: crystal.r * 2 };
    if (rectsOverlap(player, box)) {
      crystal.got = true;
      world.score += 10;
      addCoins(1);
      burst(crystal.x, crystal.y, "#ffd166", 8);
    }
  });
}

function updateHazards() {
  for (const hazard of hazards) {
    if (rectsOverlap(player, hazard)) {
      respawn();
      break;
    }
  }
}

function update(dt, now) {
  if (world.mode === "timetrial") {
    world.timeLeft -= dt;
    if (world.timeLeft <= 0) {
      world.timeLeft = 0;
      endTimeTrial();
      return;
    }
  }
  world.shake = Math.max(0, world.shake - dt * 16);
  updatePlatforms(now);
  updatePlayer(dt);
  updateCollectibles();
  updateHazards();

  confetti = confetti.filter((dot) => {
    dot.life -= dt;
    dot.x += dot.vx * dt;
    dot.y += dot.vy * dt;
    dot.vy += 360 * dt;
    return dot.life > 0;
  });

  world.cameraX += (player.x - world.cameraX - world.width * 0.38) * 0.08;
  world.cameraX = Math.max(0, Math.min(world.levelWidth - world.width, world.cameraX));
  world.meters = Math.floor(player.x / 10);

  if (player.x > world.levelWidth - 260 && !world.won) {
    world.won = true;
    world.levelsPassed += 1;
    addCoins(3);
    burst(player.x + player.w / 2, player.y, "#8b5cf6", 24);
    if (world.level < levels.length - 1) {
      startLevel(world.level + 1);
    } else {
      world.running = false;
      startBtn.textContent = "Again";
    }
  }
  updateHud();
}

function drawSky() {
  ctx.drawImage(backgrounds[world.level], 0, 0);
}

function makeBackground(index) {
  const level = levels[index];
  const bg = document.createElement("canvas");
  bg.width = world.width;
  bg.height = world.height;
  const b = bg.getContext("2d");
  const gradient = b.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, level.bg[0]);
  gradient.addColorStop(0.5, level.bg[1]);
  gradient.addColorStop(1, level.bg[2]);
  b.fillStyle = gradient;
  b.fillRect(0, 0, world.width, world.height);

  if (level.theme === "cloud") drawCloudScene(b);
  if (level.theme === "blocks") drawBlockScene(b);
  if (level.theme === "neon") drawNeonScene(b);
  return bg;
}

function drawCloudScene(b) {
  for (let i = 0; i < 6; i += 1) {
    drawCloud(b, 40 + i * 140, 70 + (i % 3) * 42, 0.75 + (i % 2) * 0.15);
  }
  b.fillStyle = "rgba(255, 255, 255, 0.22)";
  b.fillRect(0, 458, world.width, 62);
}

function drawBlockScene(b) {
  b.fillStyle = "rgba(120, 70, 190, 0.16)";
  for (let x = 20; x < world.width; x += 96) {
    b.fillRect(x, 80 + (x % 5) * 14, 52, 190);
  }
  b.fillStyle = "rgba(255, 255, 255, 0.16)";
  for (let x = 0; x < world.width; x += 42) b.fillRect(x, 0, 2, world.height);
}

function drawNeonScene(b) {
  b.fillStyle = "rgba(68, 30, 138, 0.22)";
  b.fillRect(0, 0, world.width, world.height);
  b.strokeStyle = "rgba(255, 255, 255, 0.24)";
  b.lineWidth = 2;
  for (let x = 30; x < world.width; x += 86) {
    b.beginPath();
    b.moveTo(x, 0);
    b.lineTo(x - 80, world.height);
    b.stroke();
  }
  b.fillStyle = "rgba(255, 255, 255, 0.13)";
  for (let y = 80; y < world.height; y += 76) b.fillRect(0, y, world.width, 3);
}

function drawCloud(b, x, y, scale) {
  b.save();
  b.translate(x, y);
  b.scale(scale, scale);
  b.fillStyle = "rgba(255, 255, 255, 0.6)";
  b.fillRect(0, 18, 74, 24);
  b.beginPath();
  b.arc(12, 20, 22, 0, Math.PI * 2);
  b.arc(38, 12, 26, 0, Math.PI * 2);
  b.arc(66, 23, 20, 0, Math.PI * 2);
  b.fill();
  b.restore();
}

function drawOldCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.beginPath();
  ctx.arc(0, 15, 24, 0, Math.PI * 2);
  ctx.arc(28, 6, 30, 0, Math.PI * 2);
  ctx.arc(63, 17, 24, 0, Math.PI * 2);
  ctx.fillRect(-2, 16, 70, 22);
  ctx.fill();
  ctx.restore();
}

function drawPlatform(platform) {
  const level = levels[world.level];
  const x = Math.round(platform.x - world.cameraX);
  ctx.save();
  ctx.fillStyle = platform.kind === "ground" ? level.platform : "#ffffff";
  ctx.strokeStyle = level.trim;
  ctx.lineWidth = 3;
  roundRect(x, platform.y, platform.w, platform.h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = platform.kind === "ground" ? level.trim : "#c9a7ff";
  for (let px = x + 16; px < x + platform.w - 8; px += 32) {
    ctx.fillRect(px, platform.y + 7, 14, 4);
  }
  ctx.restore();
}

function drawCrystal(crystal, now) {
  if (crystal.got) return;
  const x = crystal.x - world.cameraX;
  const bob = Math.sin(now * 3 + crystal.x) * 3;
  ctx.save();
  ctx.translate(x, crystal.y + bob);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(0, -crystal.r);
  ctx.lineTo(crystal.r, 0);
  ctx.lineTo(0, crystal.r);
  ctx.lineTo(-crystal.r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHazard(hazard) {
  const x = hazard.x - world.cameraX;
  ctx.save();
  if (hazard.kind === "block") {
    ctx.fillStyle = "#ff79c6";
    roundRect(x, hazard.y, hazard.w, hazard.h, 6);
    ctx.fill();
    ctx.fillStyle = "#fff1fa";
    ctx.fillRect(x + 12, hazard.y + 12, hazard.w - 24, 8);
  } else if (hazard.kind === "beam") {
    ctx.fillStyle = "#ff4fa3";
    roundRect(x, hazard.y, hazard.w, hazard.h, 8);
    ctx.fill();
    ctx.fillStyle = "#ffd6ec";
    ctx.fillRect(x + 14, hazard.y + 10, 14, hazard.h - 20);
  } else if (hazard.kind === "saw") {
    ctx.fillStyle = "#ff8ab3";
    for (let px = x; px < x + hazard.w; px += 28) {
      ctx.beginPath();
      ctx.arc(px + 14, hazard.y + 14, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px + 14, hazard.y + 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff8ab3";
    }
  } else {
    ctx.fillStyle = "#ff6fae";
    for (let px = x; px < x + hazard.w; px += 24) {
      ctx.beginPath();
      ctx.moveTo(px, hazard.y + hazard.h);
      ctx.lineTo(px + 12, hazard.y);
      ctx.lineTo(px + 24, hazard.y + hazard.h);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function pathRoundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// Each avatar is drawn centered at the origin, facing right, inside the player box.
const AVATARS = [
  {
    name: "Cyber Ninja",
    draw(c) {
      c.fillStyle = "#8b5cf6";
      c.beginPath(); c.moveTo(-15, -12); c.lineTo(-30, -6); c.lineTo(-28, -1); c.lineTo(-15, -4); c.fill();
      c.beginPath(); c.moveTo(-15, -6); c.lineTo(-32, 3); c.lineTo(-29, 7); c.lineTo(-15, 1); c.fill();
      const g = c.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, "#3b2d63"); g.addColorStop(1, "#241a40");
      c.fillStyle = g; pathRoundRect(c, -17, -22, 34, 44, 13); c.fill();
      c.fillStyle = "#8b5cf6"; c.fillRect(-17, -13, 34, 7);
      c.save(); c.shadowColor = "#5ef2ff"; c.shadowBlur = 12;
      c.fillStyle = "#5ef2ff"; pathRoundRect(c, -4, -3, 16, 5, 2.5); c.fill(); c.restore();
      c.fillStyle = "#5b21b6"; c.fillRect(-13, 16, 26, 6);
    },
  },
  {
    name: "Mecha Bot",
    draw(c) {
      c.strokeStyle = "#7c3aed"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, -22); c.lineTo(0, -30); c.stroke();
      c.save(); c.shadowColor = "#48d6a3"; c.shadowBlur = 10;
      c.fillStyle = "#48d6a3"; c.beginPath(); c.arc(0, -32, 3.5, 0, 7); c.fill(); c.restore();
      const g = c.createLinearGradient(-17, 0, 17, 0);
      g.addColorStop(0, "#b9a7e6"); g.addColorStop(.5, "#efe9ff"); g.addColorStop(1, "#9f88d6");
      c.fillStyle = g; pathRoundRect(c, -17, -22, 34, 44, 11); c.fill();
      c.strokeStyle = "#7c3aed"; c.lineWidth = 2; pathRoundRect(c, -17, -22, 34, 44, 11); c.stroke();
      c.fillStyle = "#241a40"; pathRoundRect(c, -12, -14, 24, 12, 4); c.fill();
      c.save(); c.shadowColor = "#5ef2ff"; c.shadowBlur = 8;
      c.fillStyle = "#5ef2ff"; c.beginPath(); c.arc(5, -8, 3, 0, 7); c.fill(); c.restore();
      c.strokeStyle = "#7c3aed"; c.beginPath(); c.moveTo(-17, 4); c.lineTo(17, 4); c.stroke();
      c.fillStyle = "#ff8ab3"; c.beginPath(); c.arc(0, 12, 3, 0, 7); c.fill();
    },
  },
  {
    name: "Galaxy Slime",
    draw(c) {
      const g = c.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, "#c9a7ff"); g.addColorStop(1, "#7c3aed");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-17, 18);
      c.quadraticCurveTo(-20, -10, -8, -19);
      c.quadraticCurveTo(0, -24, 8, -19);
      c.quadraticCurveTo(20, -10, 17, 18);
      c.quadraticCurveTo(8, 24, 0, 21);
      c.quadraticCurveTo(-8, 24, -17, 18);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.85)";
      [[-7, -4], [6, 2], [2, -10]].forEach(([sx, sy]) => {
        c.save(); c.translate(sx, sy); c.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
          c.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6);
          const a2 = a + Math.PI / 5; c.lineTo(Math.cos(a2) * 1.1, Math.sin(a2) * 1.1);
        }
        c.closePath(); c.fill(); c.restore();
      });
      c.fillStyle = "#fff7ff"; c.beginPath(); c.arc(3, -6, 5, 0, 7); c.arc(12, -6, 4, 0, 7); c.fill();
      c.fillStyle = "#302348"; c.beginPath(); c.arc(4, -6, 2.2, 0, 7); c.arc(12.5, -6, 2, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.arc(-7, -12, 3, 0, 7); c.fill();
    },
  },
  {
    name: "Flame Fox",
    draw(c) {
      const tg = c.createLinearGradient(-30, 0, -12, 0);
      tg.addColorStop(0, "#8b5cf6"); tg.addColorStop(1, "#ff9e57");
      c.fillStyle = tg;
      c.beginPath(); c.moveTo(-14, 8);
      c.quadraticCurveTo(-34, 6, -28, -12);
      c.quadraticCurveTo(-22, 2, -14, 2); c.fill();
      c.fillStyle = "#ff8a3c";
      c.beginPath(); c.moveTo(-12, -18); c.lineTo(-15, -30); c.lineTo(-3, -21); c.fill();
      c.beginPath(); c.moveTo(12, -18); c.lineTo(15, -30); c.lineTo(3, -21); c.fill();
      c.fillStyle = "#ffd6ec";
      c.beginPath(); c.moveTo(-10, -20); c.lineTo(-12, -27); c.lineTo(-5, -21); c.fill();
      c.beginPath(); c.moveTo(10, -20); c.lineTo(12, -27); c.lineTo(5, -21); c.fill();
      const g = c.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, "#ffa45c"); g.addColorStop(1, "#f3863a");
      c.fillStyle = g; pathRoundRect(c, -15, -20, 30, 42, 12); c.fill();
      c.fillStyle = "#fff7ef"; pathRoundRect(c, -2, -4, 17, 16, 8); c.fill();
      c.fillStyle = "#302348"; c.beginPath(); c.arc(13, 2, 2.4, 0, 7); c.fill();
      c.beginPath(); c.arc(2, -9, 2, 0, 7); c.arc(11, -9, 2, 0, 7); c.fill();
    },
  },
  {
    name: "Star Cadet",
    draw(c) {
      c.fillStyle = "#7c3aed"; pathRoundRect(c, -17, -6, 8, 20, 3); c.fill();
      const g = c.createLinearGradient(0, -4, 0, 22);
      g.addColorStop(0, "#f3ecff"); g.addColorStop(1, "#cdbcf2");
      c.fillStyle = g; pathRoundRect(c, -13, -6, 28, 28, 10); c.fill();
      c.strokeStyle = "#8b5cf6"; c.lineWidth = 2; pathRoundRect(c, -13, -6, 28, 28, 10); c.stroke();
      c.fillStyle = "#241a40"; pathRoundRect(c, -7, 2, 16, 9, 3); c.fill();
      c.fillStyle = "#48d6a3"; c.beginPath(); c.arc(-2, 6.5, 1.8, 0, 7); c.fill();
      c.fillStyle = "#ffd166"; c.beginPath(); c.arc(4, 6.5, 1.8, 0, 7); c.fill();
      c.fillStyle = "#b9a7e6"; c.beginPath(); c.arc(0, -14, 13, 0, 7); c.fill();
      c.fillStyle = "#241a40"; c.beginPath(); c.arc(0, -14, 10, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,0.55)"; c.beginPath(); c.ellipse(-3, -17, 5, 7, -0.5, 0, 7); c.fill();
      c.strokeStyle = "#8b5cf6"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -14, 13, 0, 7); c.stroke();
    },
  },
  {
    name: "Phantom Knight",
    draw(c) {
      c.fillStyle = "#5b21b6";
      c.beginPath(); c.moveTo(-12, -14); c.lineTo(-26, 18); c.lineTo(-8, 14); c.fill();
      const g = c.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, "#4b3b73"); g.addColorStop(1, "#2a2046");
      c.fillStyle = g; pathRoundRect(c, -16, -22, 32, 44, 10); c.fill();
      c.fillStyle = "#9f88d6"; c.beginPath(); c.arc(-10, -16, 7, 0, 7); c.fill();
      c.fillStyle = "#1a1430"; pathRoundRect(c, -12, -16, 24, 12, 4); c.fill();
      c.save(); c.shadowColor = "#ff4d6d"; c.shadowBlur = 10;
      c.fillStyle = "#ff4d6d"; pathRoundRect(c, -2, -12, 12, 4, 2); c.fill(); c.restore();
      c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(0, 2); c.lineTo(5, 8); c.lineTo(0, 14); c.lineTo(-5, 8); c.fill();
    },
  },
  {
    name: "Lava Golem",
    draw(c) {
      const g = c.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, "#5a4a6e"); g.addColorStop(1, "#332a45");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-17, -16); c.lineTo(-8, -22); c.lineTo(9, -20); c.lineTo(17, -10);
      c.lineTo(15, 16); c.lineTo(6, 22); c.lineTo(-9, 21); c.lineTo(-17, 12); c.closePath(); c.fill();
      c.save(); c.shadowColor = "#ff7a18"; c.shadowBlur = 8;
      c.strokeStyle = "#ff7a18"; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-10, -10); c.lineTo(-3, 0); c.lineTo(-8, 8); c.stroke();
      c.beginPath(); c.moveTo(6, -6); c.lineTo(2, 4); c.lineTo(9, 12); c.stroke();
      c.restore();
      c.save(); c.shadowColor = "#ffd166"; c.shadowBlur = 6;
      c.fillStyle = "#ffd166"; c.beginPath(); c.arc(2, -10, 2.4, 0, 7); c.arc(11, -10, 2.4, 0, 7); c.fill(); c.restore();
    },
  },
  {
    name: "Frost Sprite",
    draw(c) {
      c.save(); c.shadowColor = "#7fe6ff"; c.shadowBlur = 14;
      const g = c.createLinearGradient(0, -22, 0, 22);
      g.addColorStop(0, "#dff7ff"); g.addColorStop(1, "#7fd4ff");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, -24); c.lineTo(15, -4); c.lineTo(8, 22); c.lineTo(-8, 22); c.lineTo(-15, -4); c.closePath(); c.fill();
      c.restore();
      c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 22); c.moveTo(-15, -4); c.lineTo(15, -4); c.stroke();
      c.fillStyle = "#2a4a66"; c.beginPath(); c.arc(2, -2, 2, 0, 7); c.arc(9, -2, 2, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,0.85)"; c.beginPath(); c.arc(-5, -8, 2.2, 0, 7); c.fill();
    },
  },
  {
    name: "Neon Bee",
    draw(c) {
      c.save(); c.shadowColor = "#7fe6ff"; c.shadowBlur = 8;
      c.fillStyle = "rgba(180,240,255,0.75)";
      c.beginPath(); c.ellipse(-6, -14, 9, 6, -0.5, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-14, -9, 7, 5, -0.3, 0, 7); c.fill();
      c.restore();
      c.strokeStyle = "#241a40"; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(8, -16); c.quadraticCurveTo(14, -26, 18, -24); c.stroke();
      c.fillStyle = "#241a40"; c.beginPath(); c.arc(18, -24, 2, 0, 7); c.fill();
      c.save();
      pathRoundRect(c, -14, -16, 30, 38, 13); c.clip();
      const g = c.createLinearGradient(0, -16, 0, 22);
      g.addColorStop(0, "#ffe06a"); g.addColorStop(1, "#ffc02e");
      c.fillStyle = g; c.fillRect(-14, -16, 30, 38);
      c.fillStyle = "#241a40";
      c.fillRect(-7, -16, 6, 38); c.fillRect(7, -16, 6, 38);
      c.restore();
      c.save(); c.shadowColor = "#5ef2ff"; c.shadowBlur = 8;
      c.fillStyle = "#5ef2ff"; c.beginPath(); c.moveTo(-14, 16); c.lineTo(-22, 20); c.lineTo(-14, 22); c.fill(); c.restore();
      c.fillStyle = "#241a40"; c.beginPath(); c.arc(10, -6, 2.4, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(11, -7, 0.9, 0, 7); c.fill();
    },
  },
];

function drawPlayer(now) {
  const x = player.x - world.cameraX;
  const bounce = player.grounded ? Math.sin(now * 14) * 1.5 : 0;
  const cx = x + player.w / 2;
  ctx.save();
  ctx.translate(cx, player.y + player.h / 2 + bounce);
  ctx.scale(player.facing, 1);
  (AVATARS[selectedAvatar] || AVATARS[0]).draw(ctx);
  ctx.restore();
  drawNameTag(cx, player.y + bounce - 12, playerName);
}

function drawNameTag(cx, artTop, name) {
  if (!name) return;
  ctx.save();
  ctx.font = "800 13px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  const tw = ctx.measureText(name).width;
  const boxW = tw + 18;
  const boxH = 20;
  const top = artTop - boxH - 4;
  ctx.fillStyle = "rgba(48, 35, 72, 0.82)";
  roundRect(cx - boxW / 2, top, boxW, boxH, 9);
  ctx.fill();
  ctx.fillStyle = "#fff7ff";
  ctx.fillText(name, cx, top + 14);
  ctx.restore();
}

function drawConfetti() {
  confetti.forEach((dot) => {
    ctx.globalAlpha = Math.max(0, dot.life / dot.maxLife);
    ctx.fillStyle = dot.color;
    ctx.fillRect(dot.x - world.cameraX - 3, dot.y - 3, 6, 6);
  });
  ctx.globalAlpha = 1;
}

function drawGoal(now) {
  const x = world.levelWidth - 170 - world.cameraX;
  ctx.save();
  ctx.translate(x, 476);
  ctx.fillStyle = "#ffffff";
  roundRect(-12, -112, 24, 126, 10);
  ctx.fill();
  ctx.fillStyle = "#8b5cf6";
  ctx.beginPath();
  ctx.moveTo(5, -110);
  ctx.lineTo(96, -82 + Math.sin(now * 6) * 7);
  ctx.lineTo(5, -54);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEndCard() {
  if (world.running) return;
  ctx.fillStyle = "rgba(248, 239, 255, 0.72)";
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#302348";
  ctx.font = "900 54px system-ui, sans-serif";
  ctx.fillText(world.won ? "You finished!" : "Lavender Leap", world.width / 2, world.height / 2 - 22);
  ctx.fillStyle = "#735f8f";
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillText(world.won ? "Great leaping! Press Start to play again" : "Press Start, then run and jump", world.width / 2, world.height / 2 + 24);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(now = 0) {
  ctx.save();
  if (world.shake > 0) ctx.translate(rand(-world.shake, world.shake), rand(-world.shake, world.shake));
  drawSky();
  drawGoal(now);
  hazards.forEach(drawHazard);
  platforms.forEach(drawPlatform);
  crystals.forEach((crystal) => drawCrystal(crystal, now));
  drawConfetti();
  drawPlayer(now);
  ctx.restore();
  drawEndCard();
}

function loop(now) {
  if (world.last && now - world.last < world.frameMs) {
    world.loopId = requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.033, (now - world.last) / 1000);
  world.last = now;
  if (world.running) update(dt, now / 1000);
  draw(now / 1000);
  if (world.running || confetti.length) {
    world.loopId = requestAnimationFrame(loop);
  } else {
    world.loopId = 0;
  }
}

function warpToLevel() {
  if (world.mode !== "freeplay") return;
  const num = Math.max(1, Math.min(levels.length, Math.floor(Number(levelInput.value) || 1)));
  levelInput.value = num;
  world.score = 0;
  startLevel(num - 1);
}

function drawAvatarThumb(avatar) {
  const cv = document.createElement("canvas");
  cv.width = 96;
  cv.height = 150;
  const c = cv.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, 150);
  g.addColorStop(0, "#eadcff"); g.addColorStop(1, "#d6bcff");
  c.fillStyle = g; c.fillRect(0, 0, 96, 150);
  c.save(); c.translate(48, 92); c.scale(2.5, 2.5); avatar.draw(c); c.restore();
  return cv;
}

function buildAvatarPicker() {
  avatarPicker.innerHTML = "";
  AVATARS.forEach((avatar, i) => {
    const owned = ownsSkin(i);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "avatar-tile" + (i === selectedAvatar ? " selected" : "") + (owned ? "" : " locked");
    tile.appendChild(drawAvatarThumb(avatar));
    const label = document.createElement("span");
    label.textContent = avatar.name;
    tile.appendChild(label);
    if (!owned) {
      const lock = document.createElement("span");
      lock.className = "lock-badge";
      lock.textContent = `🔒 ${SKIN_PRICES[i]}`;
      tile.appendChild(lock);
    }
    tile.addEventListener("click", () => {
      if (!ownsSkin(i)) {
        flashBanner("Unlock this skin in the Store!");
        return;
      }
      selectedAvatar = i;
      avatarPicker.querySelectorAll(".avatar-tile").forEach((t) => t.classList.remove("selected"));
      tile.classList.add("selected");
    });
    avatarPicker.appendChild(tile);
  });
}

// ===== Game Center backend integration (Phase 5) =====
// Wallet/skins/items live on the server now (shared with the hub + other games).
// Coins collected in a run are committed at run boundaries (model A).
const LL_KEYS = ["ll-cyber-ninja","ll-mecha-bot","ll-galaxy-slime","ll-flame-fox","ll-star-cadet","ll-phantom-knight","ll-lava-golem","ll-frost-sprite","ll-neon-bee"];
const LL_GAME = "lavender-leap";
let gc = null;     // backend user: {username, coins, items:{}, ownedAvatars:[keys], avatarKey}
let runCoins = 0;  // collected this run; flushed to the wallet at run boundaries

function applyUser(u) {
  if (!u) return;
  gc = u;
  userCoins = u.coins || 0;
  if (typeof u.avatarKey === "string" && u.avatarKey.indexOf("ll-") === 0) {
    const i = LL_KEYS.indexOf(u.avatarKey);
    if (i >= 0) selectedAvatar = i;
  }
  updateCoinHud();
}

// Each mode reports to its own leaderboard with its own score:
//   timetrial -> levels cleared, hard -> highest level reached, freeplay -> world score.
function runSlugAndScore() {
  if (world.mode === "timetrial") return { slug: "lavender-leap-time", score: world.levelsPassed };
  if (world.mode === "hard") return { slug: "lavender-leap-hard", score: world.hardBest };
  return { slug: LL_GAME, score: world.score | 0 };
}

// Flush this run to the server: credits collected coins AND records the score on the
// mode's leaderboard. One submit per boundary (the server rate-limits rapid posts).
// Pass force=true to record a score even when no coins were collected.
async function commitRun(force = false) {
  if (!gc) return;
  if (runCoins <= 0 && !force) return;
  const { slug, score } = runSlugAndScore();
  const coins = runCoins; runCoins = 0;
  const r = await GameCenter.submitScore(slug, score | 0, coins);
  if (r.ok && r.data && r.data.wallet) applyUser(r.data.wallet);
  else runCoins += coins;  // submit failed — keep the coins for the next boundary
  updateCoinHud();
  return r;
}

function ownsDoubleJump() {
  return !!(gc && gc.items && gc.items.double_jump > 0);
}

// Legacy local-profile helpers are no longer used (login is the shared account).
function loadProfiles() { return {}; }
function saveProfiles() { /* server-authoritative; no-op */ }

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (err) {
    return {};
  }
}

function getCoins() {
  return gc ? gc.coins : 0;  // the shared wallet (committed)
}

function setCoins() { /* server-authoritative; no-op */ }

function updateCoinHud() {
  const wallet = gc ? gc.coins : 0;
  if (coinsEl) coinsEl.textContent = wallet + runCoins;       // in-game: wallet + this run
  if (storeCoinsEl) storeCoinsEl.textContent = wallet;        // store: spendable wallet only
}

function addCoins(amount) {
  // Earn only — collected coins accumulate this run, flushed at run boundaries.
  if (amount > 0) runCoins += amount;
  updateCoinHud();
}

function getInventory() {
  if (!gc) return { skins: [], lives: 0, boosts: 0 };
  const items = gc.items || {};
  const skins = (gc.ownedAvatars || [])
    .filter((k) => k.indexOf("ll-") === 0)
    .map((k) => LL_KEYS.indexOf(k))
    .filter((i) => i >= 0);
  return { skins, lives: items.extra_life || 0, boosts: items.boost || 0 };
}

function setInventory() { /* server-authoritative; no-op */ }

function ownsSkin(index) {
  if (FREE_SKINS.includes(index)) return true;
  return getInventory(currentUser).skins.includes(index);
}

function syncUserState() {
  userCoins = getCoins(currentUser);
  updateCoinHud();
  buildAvatarPicker();
  renderProfilePowerups();
}

function renderProfilePowerups() {
  const inv = getInventory(currentUser);
  ppLives.textContent = inv.lives;
  ppBoosts.textContent = inv.boosts;
}

function flashBanner(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2200);
}

function makeStoreItem({ title, desc, price, thumb, state, onAction, actionLabel, doneLabel }) {
  const card = document.createElement("div");
  card.className = "store-item";
  if (thumb) {
    thumb.classList.add("store-thumb");
    card.appendChild(thumb);
  }
  const info = document.createElement("div");
  info.className = "store-info";
  const h = document.createElement("strong");
  h.textContent = title;
  const p = document.createElement("span");
  p.textContent = desc;
  info.appendChild(h);
  info.appendChild(p);
  card.appendChild(info);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "store-buy";
  if (state === "equipped") {
    btn.textContent = doneLabel || "Equipped";
    btn.disabled = true;
  } else if (state === "owned") {
    btn.textContent = actionLabel || "Equip";
    btn.addEventListener("click", onAction);
  } else {
    btn.textContent = `Buy · ${price}`;
    btn.disabled = userCoins < price;
    btn.addEventListener("click", onAction);
  }
  card.appendChild(btn);
  return card;
}

async function buyConsumable(kind, price, label) {
  const itemKey = kind === "lives" ? "extra_life" : "boost";
  const r = await GameCenter.buy("item", itemKey);
  if (r.ok) {
    applyUser(r.data);
    storeMsg.textContent = `Bought ${label}!`;
    renderStore();
    renderProfilePowerups();
  } else {
    storeMsg.textContent = r.error || "Not enough coins for that yet.";
  }
}

async function buyDoubleJump() {
  const r = await GameCenter.buy("item", "double_jump");
  if (r.ok) {
    applyUser(r.data);
    storeMsg.textContent = "Double Jump Pass unlocked! Tap JUMP again in mid-air.";
    renderStore();
  } else {
    storeMsg.textContent = r.error || "Not enough coins for that yet.";
  }
}

async function buySkin(index) {
  const r = await GameCenter.buy("avatar", LL_KEYS[index]);
  if (r.ok) {
    applyUser(r.data);
    storeMsg.textContent = `Unlocked ${AVATARS[index].name}! Tap Equip to wear it.`;
    buildAvatarPicker();
    renderStore();
  } else {
    storeMsg.textContent = r.error || "Not enough coins for that skin yet.";
  }
}

async function equipSkin(index) {
  const r = await GameCenter.setProfile({ avatar: LL_KEYS[index] });
  if (r.ok) {
    applyUser(r.data);
    selectedAvatar = index;
    storeMsg.textContent = `Equipped ${AVATARS[index].name}.`;
    buildAvatarPicker();
    renderStore();
  } else {
    storeMsg.textContent = r.error || "Could not equip that skin.";
  }
}

function renderStore() {
  storeCoinsEl.textContent = userCoins;
  const inv = getInventory(currentUser);

  storePowerups.innerHTML = "";
  storePowerups.appendChild(makeStoreItem({
    title: "Extra Life",
    desc: `Survive a fall in Hard Mode. You own ${inv.lives}.`,
    price: LIFE_PRICE,
    onAction: () => buyConsumable("lives", LIFE_PRICE, "an extra life"),
  }));
  storePowerups.appendChild(makeStoreItem({
    title: `+${TIME_BOOST_SECONDS}s Time Boost`,
    desc: `Adds ${TIME_BOOST_SECONDS}s to your next Time Trial. You own ${inv.boosts}.`,
    price: BOOST_PRICE,
    onAction: () => buyConsumable("boosts", BOOST_PRICE, "a time boost"),
  }));
  const ownsDJ = ownsDoubleJump();
  storePowerups.appendChild(makeStoreItem({
    title: "Double Jump Pass",
    desc: ownsDJ ? "Tap JUMP again in mid-air for a second leap." : "Unlock a mid-air second jump. One-time, permanent.",
    price: DOUBLE_JUMP_PRICE,
    state: ownsDJ ? "equipped" : "buy",
    doneLabel: "Owned",
    onAction: ownsDJ ? null : () => buyDoubleJump(),
  }));

  storeSkins.innerHTML = "";
  Object.keys(SKIN_PRICES).forEach((key) => {
    const index = Number(key);
    const owned = ownsSkin(index);
    const equipped = selectedAvatar === index;
    storeSkins.appendChild(makeStoreItem({
      title: AVATARS[index].name,
      desc: owned ? (equipped ? "Currently worn." : "Unlocked — ready to wear.") : "Premium skin.",
      price: SKIN_PRICES[index],
      thumb: drawAvatarThumb(AVATARS[index]),
      state: equipped ? "equipped" : owned ? "owned" : "buy",
      actionLabel: "Equip",
      onAction: owned ? () => equipSkin(index) : () => buySkin(index),
    }));
  });
}

function setStoreSection(section) {
  storePowerups.classList.toggle("hidden", section !== "powerups");
  storeSkins.classList.toggle("hidden", section !== "skins");
  storeSectionSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.section === section));
}

function openStore() {
  // Only offer "resume" when the store was opened from inside a live game.
  const cameFromGame = world.running;
  stopLoop();
  storeMsg.textContent = "";
  storeResumeBtn.style.display = cameFromGame ? "" : "none";
  renderStore();
  setStoreSection("powerups");
  showScreen(storeScreen);
}

function resumeGame() {
  showScreen(null);
  world.keys.clear();
  world.running = true;
  world.last = performance.now();
  if (!world.loopId) world.loopId = requestAnimationFrame(loop);
}

function syncAvatarSelection() {
  avatarPicker.querySelectorAll(".avatar-tile").forEach((tile, i) => {
    tile.classList.toggle("selected", i === selectedAvatar);
  });
}

// ===== Leaderboards (server-backed: Time Trial + Hard Mode, personal + global) =====
const lbState = { board: "time", scope: "global", fromGame: false };

function openLeaderboard(board) {
  lbState.fromGame = world.running;  // capture before stopLoop clears it
  stopLoop();
  if (board) lbState.board = board;
  lbResumeBtn.style.display = lbState.fromGame ? "" : "none";
  syncLbSegs();
  showScreen(leaderboardScreen);
  renderLeaderboard();
}

function syncLbSegs() {
  lbBoard.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.board === lbState.board));
  lbScope.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.scope === lbState.scope));
}

function fmtLevel(val) {
  return lbState.board === "hard" ? `level ${val}` : `${val} level${val === 1 ? "" : "s"}`;
}

async function renderLeaderboard() {
  const slug = lbState.board === "hard" ? "lavender-leap-hard" : "lavender-leap-time";
  lbMsg.textContent = "Loading…";
  lbList.innerHTML = "";
  const r = await GameCenter.leaderboard(slug, lbState.scope);
  if (!r.ok) { lbMsg.textContent = r.error || "Could not load the leaderboard."; return; }
  const rows = r.data || [];
  if (!rows.length) {
    lbMsg.textContent = lbState.scope === "personal"
      ? "No runs yet — play to set a score!"
      : "No scores yet. Be the first!";
    return;
  }
  lbMsg.textContent = "";
  rows.forEach((row, i) => {
    const li = document.createElement("li");
    if (lbState.scope === "global") {
      li.textContent = `#${i + 1} · ${row.username || "Player"} — ${fmtLevel(row.score)}`;
    } else {
      const when = row.date ? new Date(row.date).toLocaleDateString() : "";
      li.textContent = `${fmtLevel(row.score)}${when ? ` · ${when}` : ""}`;
    }
    lbList.appendChild(li);
  });
}

function stopLoop() {
  world.running = false;
  if (world.loopId) {
    cancelAnimationFrame(world.loopId);
    world.loopId = 0;
  }
}

function showScreen(target) {
  [welcomeScreen, signinScreen, createScreen, startupOverlay, modesScreen, resultsScreen, storeScreen, reviveScreen, leaderboardScreen].forEach((screen) => {
    screen.classList.add("hidden");
  });
  if (target) target.classList.remove("hidden");
}

function showModes() {
  const cameFromGame = world.running;  // capture before stopLoop clears it
  stopLoop();
  commitRun();  // flush coins collected this run to the wallet
  modesGreeting.textContent = `Hi ${currentUser || "hero"}! Pick a mode`;
  // Offer "Back to game" only when a live run was paused to reach this screen.
  document.querySelector("#modesBack").style.display = cameFromGame ? "" : "none";
  showScreen(modesScreen);
}

function configureControls() {
  warpEl.style.display = world.mode === "freeplay" ? "" : "none";
  saveLevelBtn.style.display = world.mode === "hard" ? "" : "none";
}

async function saveHardLevel() {
  if (world.mode !== "hard") return;
  const lvl = world.hardBest;
  const r = await commitRun(true);  // records hardBest on the Hard Mode board + flushes coins
  if (r && r.ok) flashBanner(`Saved level ${lvl} to the Hard Mode board!`);
  else if (r && r.status === 429) flashBanner("Saving too fast — try again in a moment.");
  else flashBanner((r && r.error) || "Could not save right now.");
}

function startMode(mode) {
  world.mode = mode;
  modeTag.textContent = MODE_LABELS[mode] || "";
  configureControls();
  showScreen(null);
  reset();
  if (mode === "timetrial") {
    const inv = getInventory(currentUser);
    if (inv.boosts > 0) {
      inv.boosts -= 1;
      setInventory(currentUser, inv);
      world.timeLeft += TIME_BOOST_SECONDS;
      updateHud();
      flashBanner(`+${TIME_BOOST_SECONDS}s boost used!`);
    }
  }
}

function loadTrialRuns() {
  try {
    return JSON.parse(localStorage.getItem("llod_timetrial")) || {};
  } catch (err) {
    return {};
  }
}

function saveTrialRuns(runs) {
  localStorage.setItem("llod_timetrial", JSON.stringify(runs));
}

function renderResults(latest, runs) {
  resultLevels.textContent = latest;
  const best = runs.reduce((max, run) => Math.max(max, run.levels), 0);
  bestScore.textContent = best;
  highScores.innerHTML = "";
  [...runs]
    .sort((a, b) => b.levels - a.levels)
    .slice(0, 5)
    .forEach((run, index) => {
      const li = document.createElement("li");
      li.textContent = `#${index + 1} — ${run.levels} level${run.levels === 1 ? "" : "s"}`;
      highScores.appendChild(li);
    });
  runHistory.innerHTML = "";
  runs.slice(0, 5).forEach((run) => {
    const li = document.createElement("li");
    const when = new Date(run.ts);
    const date = when.toLocaleDateString();
    const time = when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.textContent = `${run.levels} level${run.levels === 1 ? "" : "s"} · ${date} ${time}`;
    runHistory.appendChild(li);
  });
}

function endTimeTrial() {
  stopLoop();
  commitRun(true);  // flush coins + record levels cleared on the Time Trial board
  startBtn.textContent = "Start";
  const all = loadTrialRuns();
  const list = all[currentUser] || [];
  list.unshift({ levels: world.levelsPassed, ts: Date.now() });
  all[currentUser] = list.slice(0, 20);
  saveTrialRuns(all);
  renderResults(world.levelsPassed, all[currentUser]);
  showScreen(resultsScreen);
}

function showWelcome() {
  stopLoop();
  signinError.textContent = "";
  createError.textContent = "";
  showScreen(welcomeScreen);
}

function handleSignIn() {
  const name = (signinInput.value || "").trim().slice(0, 12);
  if (!name) {
    signinError.textContent = "Enter your username.";
    return;
  }
  const profiles = loadProfiles();
  if (!Object.prototype.hasOwnProperty.call(profiles, name)) {
    signinError.textContent = "No account found. Try Create account.";
    return;
  }
  currentUser = name;
  playerName = name;
  selectedAvatar = profiles[name];
  syncUserState();
  showModes();
}

function handleCreate() {
  const name = (createInput.value || "").trim().slice(0, 12);
  if (!name) {
    createError.textContent = "Pick a username.";
    return;
  }
  const profiles = loadProfiles();
  if (Object.prototype.hasOwnProperty.call(profiles, name)) {
    createError.textContent = "That username is taken. Sign in instead.";
    return;
  }
  editingProfile = false;
  editingOldName = "";
  currentUser = name;
  selectedAvatar = 0;
  nameInput.value = name;
  syncUserState();
  showScreen(startupOverlay);
}

async function startGameFromMenu() {
  const name = (nameInput.value || "").trim().slice(0, 32) || currentUser;
  const r = await GameCenter.setProfile({ username: name, avatar: LL_KEYS[selectedAvatar], showName: showNameToggle.checked });
  if (!r.ok) { flashBanner(r.error || "Could not save profile"); return; }
  applyUser(r.data);
  currentUser = r.data.username;
  playerName = currentUser;
  editingProfile = false;
  editingOldName = "";
  buildAvatarPicker();
  showModes();
}

let profileCameFromGame = false;
function editProfile() {
  profileCameFromGame = world.running;  // capture before stopLoop clears it
  stopLoop();
  editingProfile = true;
  editingOldName = currentUser;
  nameInput.value = currentUser;
  showNameToggle.checked = gc ? gc.showName !== false : true;
  document.querySelector("#profileResume").style.display = profileCameFromGame ? "" : "none";
  buildAvatarPicker();
  renderProfilePowerups();
  showScreen(startupOverlay);
}

async function profileBackToGame() {
  // Apply any name/avatar change, then resume the run that was in progress.
  const name = (nameInput.value || "").trim().slice(0, 32) || currentUser;
  const r = await GameCenter.setProfile({ username: name, avatar: LL_KEYS[selectedAvatar], showName: showNameToggle.checked });
  if (r.ok) { applyUser(r.data); currentUser = r.data.username; playerName = currentUser; }
  editingProfile = false; editingOldName = "";
  resumeGame();
}

async function logout() {
  await GameCenter.logout();
  location.href = "/";  // back to the hub
}

buildAvatarPicker();
playBtn.addEventListener("click", startGameFromMenu);
modesBtnControl.addEventListener("click", showModes);
editProfileBtn.addEventListener("click", editProfile);
document.querySelector("#profileResume").addEventListener("click", profileBackToGame);
logoutBtn.addEventListener("click", logout);
goSigninBtn.addEventListener("click", () => {
  signinError.textContent = "";
  signinInput.value = currentUser || "";
  showScreen(signinScreen);
  signinInput.focus();
});
goCreateBtn.addEventListener("click", () => {
  createError.textContent = "";
  createInput.value = "";
  showScreen(createScreen);
  createInput.focus();
});
signinBtn.addEventListener("click", handleSignIn);
createBtn.addEventListener("click", handleCreate);
signinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleSignIn();
});
createInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleCreate();
});
document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", showWelcome);
});
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") startGameFromMenu();
});
modesScreen.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => startMode(btn.dataset.mode));
});
resultsAgainBtn.addEventListener("click", () => startMode("timetrial"));
resultsModesBtn.addEventListener("click", showModes);
visitStoreBtn.addEventListener("click", openStore);
visitStoreModesBtn.addEventListener("click", openStore);
storeBackBtn.addEventListener("click", showModes);
storeResumeBtn.addEventListener("click", resumeGame);
reviveUseBtn.addEventListener("click", useRevive);
reviveDeclineBtn.addEventListener("click", declineRevive);
saveLevelBtn.addEventListener("click", saveHardLevel);
modesLeaderboardBtn.addEventListener("click", () => openLeaderboard());
document.querySelector("#modesBack").addEventListener("click", resumeGame);
resultsLeaderboardBtn.addEventListener("click", () => openLeaderboard("time"));
lbBackBtn.addEventListener("click", showModes);
lbResumeBtn.addEventListener("click", resumeGame);
lbBoard.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => {
  lbState.board = b.dataset.board; syncLbSegs(); renderLeaderboard();
}));
lbScope.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => {
  lbState.scope = b.dataset.scope; syncLbSegs(); renderLeaderboard();
}));
storeSectionSeg.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => setStoreSection(b.dataset.section)));

startBtn.addEventListener("click", reset);
goBtn.addEventListener("click", warpToLevel);
levelInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") warpToLevel();
});
window.addEventListener("keydown", (event) => {
  const tag = event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  const key = event.key.toLowerCase();
  world.keys.add(key);
  if (event.key === " " || key === "w" || event.key === "ArrowUp") {
    event.preventDefault();
    jump();
  }
});
window.addEventListener("keyup", (event) => {
  world.keys.delete(event.key.toLowerCase());
});

// ===== Touch controls: floating joystick (left) + jump pad (right) =====
const stage = document.querySelector(".stage");
const touchUI = document.querySelector("#touchUI");
const joyBase = document.querySelector("#joyBase");
const joyKnob = document.querySelector("#joyKnob");
const jumpBtn = document.querySelector("#jumpBtn");

function applyTouchSetting() {
  const on = (window.GameCenter && GameCenter.settings)
    ? GameCenter.settings.touchControls()
    : (matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);
  touchUI.classList.toggle("hidden", !on);
}
applyTouchSetting();
window.addEventListener("gc:settings", applyTouchSetting);

const JOY_RADIUS = 46;   // how far the knob can travel from its center
const JOY_DEAD = 10;     // ignore tiny wobbles so standing still is easy
let joyId = null;        // identifier of the finger currently driving the stick
let joyOX = 0;
let joyOY = 0;

function joyMove(dx, dy) {
  const dist = Math.hypot(dx, dy) || 1;
  const clamp = dist > JOY_RADIUS ? JOY_RADIUS / dist : 1;
  joyKnob.style.transform = `translate(${dx * clamp}px, ${dy * clamp}px)`;
  world.touchDir = dx < -JOY_DEAD ? -1 : dx > JOY_DEAD ? 1 : 0;
}

function endJoy(event) {
  for (const t of event.changedTouches) {
    if (t.identifier !== joyId) continue;
    joyId = null;
    world.touchDir = 0;
    joyBase.classList.remove("active");
    joyBase.style.left = "";
    joyBase.style.top = "";
    joyBase.style.bottom = "";
    joyKnob.style.transform = "";
  }
}

stage.addEventListener("touchstart", (event) => {
  const rect = stage.getBoundingClientRect();
  for (const t of event.changedTouches) {
    if (joyId !== null) continue;
    if (t.clientX - rect.left > rect.width / 2) continue;  // left half drives the stick
    joyId = t.identifier;
    joyOX = t.clientX;
    joyOY = t.clientY;
    joyBase.style.left = `${t.clientX - rect.left}px`;
    joyBase.style.top = `${t.clientY - rect.top}px`;
    joyBase.style.bottom = "auto";
    joyBase.classList.add("active");   // recenters on the finger via translate(-50%, -50%)
    joyMove(0, 0);
  }
  event.preventDefault();
}, { passive: false });

stage.addEventListener("touchmove", (event) => {
  for (const t of event.changedTouches) {
    if (t.identifier !== joyId) continue;
    joyMove(t.clientX - joyOX, t.clientY - joyOY);
    event.preventDefault();
  }
}, { passive: false });

stage.addEventListener("touchend", endJoy);
stage.addEventListener("touchcancel", endJoy);

jumpBtn.addEventListener("touchstart", (event) => {
  event.preventDefault();
  event.stopPropagation();  // keep this finger from also starting the joystick
  jump();
});

buildLevel();
draw();

// ===== Shared-session login gate (Phase 5) =====
// Best-effort coin commit if the player leaves mid-run (Home button, tab close).
window.addEventListener("pagehide", () => {
  if (gc && runCoins > 0) {
    try {
      const { slug, score } = runSlugAndScore();
      navigator.sendBeacon(
        "/api/score",
        new Blob([JSON.stringify({ game: slug, score: score | 0, coins: runCoins })],
                 { type: "application/json" })
      );
    } catch (e) {}
  }
});

(async () => {
  showScreen(null);  // hide the welcome screen immediately — no sign-in flash before the gate resolves
  const r = await GameCenter.me();
  if (!r.ok) { location.href = "/"; return; }  // not logged in -> hub
  applyUser(r.data);
  currentUser = r.data.username;
  playerName = r.data.username;
  buildAvatarPicker();
  showModes();
})();
