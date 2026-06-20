const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const timerEl = document.querySelector("#timer");
const moodEl = document.querySelector("#mood");
const startBtn = document.querySelector("#start");
const dashBtn = document.querySelector("#pulse");

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
  dashCooldown: 0,
  coyote: 0,
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
  const width = Math.min(6200, 2400 + index * 40);
  const gap = Math.min(520, 260 + difficulty * 7);
  const movingEvery = Math.max(1, 4 - Math.floor(difficulty / 15));
  const hazardEvery = Math.max(1, 2 - Math.floor(difficulty / 38));
  const platforms = [{ x: 0, y: 448, w: 430, h: 34, kind: "ground" }];
  const crystals = [];
  const hazards = [];
  let x = 500;

  while (x < width - 520) {
    const step = platforms.length;
    const y = step === 1 ? 390 : 285 + ((step * 53 + index * 29) % 135);
    const w = Math.max(110, 215 - Math.floor(difficulty * 0.7) + ((step * 31 + index * 7) % 42));
    const platform = { x, y, w, h: 26, kind: "soft" };
    if (index > 1 && step > 1 && step % movingEvery === 0) {
      platform.speed = 0.75 + Math.min(1.0, difficulty * 0.012);
      if ((step + index) % 2 === 0) {
        platform.baseY = y;
        platform.moveY = Math.min(100, 28 + difficulty * 1.2);
      } else {
        platform.baseX = x;
        platform.moveX = Math.min(110, 32 + difficulty * 1.2);
      }
    }
    platforms.push(platform);
    if (step % 2 === 0 || index < 18) crystals.push({ x: x + w / 2, y: y - 52, r: 13, got: false });

    const hazardKind = ["spikes", "block", "saw", "beam"][(step + index) % 4];
    if (step > 0 && step % hazardEvery === hazardEvery - 1) {
      if (hazardKind === "block") hazards.push({ x: x + w + 70, y: 442, w: 80, h: 56, kind: "block" });
      else if (hazardKind === "beam") hazards.push({ x: x + w + 92, y: 330, w: 42, h: 132, kind: "beam" });
      else if (hazardKind === "saw") hazards.push({ x: x + w + 45, y: 470, w: 105, h: 28, kind: "saw" });
      else hazards.push({ x: x + w + 38, y: 470, w: 118, h: 28, kind: "spikes" });
    }
    x += gap + ((step * 47 + index * 11) % Math.min(150, 82 + difficulty));
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
  startLevel(0);
}

function startLevel(index, restarting = false) {
  world.level = index;
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
  player.dashCooldown = 0;
  player.coyote = 0;

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
  scoreEl.textContent = world.score;
  timerEl.textContent = world.meters;
  moodEl.textContent = `${world.level + 1}/100`;
}

function jump() {
  if (!world.running) return;
  if (player.grounded || player.coyote > 0) {
    player.vy = -620;
    player.grounded = false;
    player.coyote = 0;
    burst(player.x + player.w / 2, player.y + player.h, "#ffffff", 5);
  }
}

function dash() {
  if (!world.running || player.dashCooldown > 0) return;
  player.vx = player.facing * 760;
  player.dashCooldown = 0.75;
  world.shake = 5;
  burst(player.x + player.w / 2, player.y + player.h / 2, "#8b5cf6", 8);
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
    platform.dx = Math.max(-1.8, Math.min(1.8, platform.x - platform.prevX));
    platform.dy = Math.max(-1.8, Math.min(1.8, platform.y - platform.prevY));
  });
}

function updatePlayer(dt) {
  const left = world.keys.has("arrowleft") || world.keys.has("a");
  const right = world.keys.has("arrowright") || world.keys.has("d");
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
  player.vy += 1550 * dt;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
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
  platforms.forEach((platform) => {
    if (!rectsOverlap(body, platform)) return;
    if (player.vy > 0) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.coyote = 0.1;
      player.x += (platform.dx || 0) * 0.7;
      player.y += Math.min(0, platform.dy || 0) * 0.7;
    } else if (player.vy < 0) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
    body.y = player.y;
  });
  if (!player.grounded && player.vy > 0) player.coyote = Math.max(player.coyote, 0);
}

function respawn() {
  world.score = world.levelStartScore;
  world.shake = 8;
  confetti = [];
  startLevel(world.level, true);
}

function updateCollectibles() {
  crystals.forEach((crystal) => {
    if (crystal.got) return;
    const box = { x: crystal.x - crystal.r, y: crystal.y - crystal.r, w: crystal.r * 2, h: crystal.r * 2 };
    if (rectsOverlap(player, box)) {
      crystal.got = true;
      world.score += 10;
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

function drawPlayer(now) {
  const x = player.x - world.cameraX;
  const bounce = player.grounded ? Math.sin(now * 14) * 1.5 : 0;
  ctx.save();
  ctx.translate(x + player.w / 2, player.y + player.h / 2 + bounce);
  ctx.scale(player.facing, 1);
  ctx.fillStyle = "#8b5cf6";
  roundRect(-player.w / 2, -player.h / 2, player.w, player.h, 12);
  ctx.fill();
  ctx.fillStyle = "#fff7ff";
  ctx.beginPath();
  ctx.arc(7, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#302348";
  ctx.beginPath();
  ctx.arc(8, -8, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#48d6a3";
  ctx.fillRect(-12, 19, 24, 6);
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
  ctx.fillText(world.won ? `${world.score} points` : "Press Start, then run and jump", world.width / 2, world.height / 2 + 24);
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

startBtn.addEventListener("click", reset);
dashBtn.addEventListener("click", dash);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  world.keys.add(key);
  if (event.key === " " || key === "w" || event.key === "ArrowUp") {
    event.preventDefault();
    jump();
  }
  if (event.key === "Shift") dash();
});
window.addEventListener("keyup", (event) => {
  world.keys.delete(event.key.toLowerCase());
});

buildLevel();
draw();
