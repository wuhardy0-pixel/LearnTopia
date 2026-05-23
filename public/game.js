const socket = io();

// STATE
let myRole = null;
let myUsername = null;
let myCode = null;
let gameState = { players: {} };
let trails = {};
let localUserConfig = null;

let gameMode = 'fishtopia';
let gamePlatforms = [];
let gameStations = [];
let gameMap = null;
let gameEndTime = 0;
let explosions = [];

// DOM Views
const views = {
  auth: document.getElementById('auth-view'),
  dashboard: document.getElementById('dashboard-view'),
  hostLobby: document.getElementById('host-lobby-view'),
  playerLobby: document.getElementById('player-lobby-view'),
  gameView: document.getElementById('game-view'),
  resultsView: document.getElementById('results-view')
};

function showView(viewName) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  if (views[viewName]) views[viewName].classList.remove('hidden');
}

// --- AUTH LOGIC ---
document.getElementById('btn-login').addEventListener('click', () => {
  const u = document.getElementById('auth-username').value.trim();
  const p = document.getElementById('auth-password').value.trim();
  if (u && p) socket.emit('login', { username: u, password: p });
});

document.getElementById('btn-register').addEventListener('click', () => {
  const u = document.getElementById('auth-username').value.trim();
  const p = document.getElementById('auth-password').value.trim();
  if (u && p) socket.emit('register', { username: u, password: p });
});

let musicMuted = false;
const bgMusic = document.getElementById('bg-music');
const btnMusic = document.getElementById('btn-toggle-music');
const btnNextMusic = document.getElementById('btn-next-music');

let currentTrack = 0;
const playlist = ['music.mp3', 'tiger.mp4'];

if (btnNextMusic && bgMusic) {
  btnNextMusic.addEventListener('click', () => {
    currentTrack = (currentTrack + 1) % playlist.length;
    bgMusic.src = playlist[currentTrack];
    if (!musicMuted) {
      bgMusic.play().catch(e => console.log(e));
    }
  });
}

if (btnMusic && bgMusic) {
  bgMusic.volume = 0.4; // Set a comfy background volume level permanently
  btnMusic.addEventListener('click', () => {
    musicMuted = !musicMuted;
    if (musicMuted) {
      bgMusic.pause();
      btnMusic.textContent = '🔇';
    } else {
      bgMusic.play().catch(e => console.log(e));
      btnMusic.textContent = '🔊';
    }
  });
}

// Local cache of per-user math state. Render free tier has no persistent
// disk, so the server forgets users on every redeploy / 15-min idle. We
// stash math state in the browser and rehydrate the server when it has
// less than the client.
const MATH_CACHE_KEY = u => 'learntopia:math:' + u;

function cacheMathState() {
  if (!myUsername || !localUserConfig) return;
  try {
    localStorage.setItem(MATH_CACHE_KEY(myUsername), JSON.stringify({
      placementDone: !!localUserConfig.placementDone,
      activeGrade: localUserConfig.activeGrade || 'K',
      mathProgress: localUserConfig.mathProgress || {},
      gradeCompleted: localUserConfig.gradeCompleted || {}
    }));
  } catch (e) { /* localStorage unavailable — ignore */ }
}

function maybeRestoreMathState() {
  if (!myUsername || !localUserConfig) return false;
  let cached;
  try {
    const raw = localStorage.getItem(MATH_CACHE_KEY(myUsername));
    if (!raw) return false;
    cached = JSON.parse(raw);
  } catch (e) { return false; }

  const serverKnowsPlacement = !!localUserConfig.placementDone;
  const serverProgressCount = Object.keys(localUserConfig.mathProgress || {}).length;
  const cachedProgressCount = Object.keys(cached.mathProgress || {}).length;

  // Restore only when client clearly has MORE math state than server
  // (server was wiped). Otherwise trust server.
  const shouldRestore =
    (!serverKnowsPlacement && cached.placementDone) ||
    cachedProgressCount > serverProgressCount;
  if (!shouldRestore) return false;

  localUserConfig.placementDone = cached.placementDone || localUserConfig.placementDone;
  localUserConfig.activeGrade = cached.activeGrade || localUserConfig.activeGrade;
  localUserConfig.mathProgress = cached.mathProgress || localUserConfig.mathProgress;
  localUserConfig.gradeCompleted = cached.gradeCompleted || localUserConfig.gradeCompleted;

  socket.emit('restoreUserState', {
    placementDone: localUserConfig.placementDone,
    activeGrade: localUserConfig.activeGrade,
    mathProgress: localUserConfig.mathProgress,
    gradeCompleted: localUserConfig.gradeCompleted
  });
  return true;
}

socket.on('authSuccess', ({ username, data }) => {
  myUsername = username;
  localUserConfig = data;
  maybeRestoreMathState();
  cacheMathState();
  if (!views.auth.classList.contains('hidden')) showView('dashboard');
  updateDashboard();
  updateHUD();
  renderProfileData();

  if (bgMusic && !musicMuted) {
    bgMusic.play().catch(e => console.log('Autoplay temporarily blocked until fully interacted:', e));
  }
});

socket.on('authError', (msg) => {
  document.getElementById('auth-error').textContent = msg;
  setTimeout(() => document.getElementById('auth-error').textContent = '', 4000);
});

// --- DASHBOARD ---
function updateDashboard() {
  document.getElementById('dash-username').textContent = myUsername;
  document.getElementById('dash-coins').textContent = localUserConfig.inventory.coins;
  let fishCount = localUserConfig.inventory.fishes.length;
  document.getElementById('dash-fish').textContent = fishCount;
}

document.getElementById('btn-show-join').addEventListener('click', () => document.getElementById('join-form-container').classList.remove('hidden'));
document.getElementById('btn-host-game').addEventListener('click', () => socket.emit('createGame'));
document.getElementById('btn-submit-join').addEventListener('click', () => {
  const code = document.getElementById('join-code').value.trim();
  if (code) socket.emit('joinGame', code);
});
document.getElementById('btn-show-profile').addEventListener('click', () => document.getElementById('profile-modal').classList.remove('hidden'));
document.getElementById('btn-close-profile').addEventListener('click', () => document.getElementById('profile-modal').classList.add('hidden'));
document.getElementById('btn-show-cosmetic-shop').addEventListener('click', () => document.getElementById('cosmetic-shop-modal').classList.remove('hidden'));
document.getElementById('btn-close-cosmetic-shop').addEventListener('click', () => document.getElementById('cosmetic-shop-modal').classList.add('hidden'));

socket.on('unboxing', ({ type, val }) => {
  const modal = document.getElementById('unboxing-modal');
  const display = document.getElementById('unboxing-display');
  const title = document.getElementById('unboxing-title');

  if (type === 'skin') {
    title.innerHTML = `Legendary Skin!`;
    display.innerHTML = `<div style="width:100px; height:100px; border-radius:50%; background:${val}; border:4px solid white; box-shadow: 0 0 20px ${val}"></div>`;
  } else {
    title.innerHTML = `Epic Trail!`;
    display.innerHTML = `<div class="trail-preview ${val}-trail" style="width:100px; height:100px; border-radius:12px; margin:auto;"></div>`;
  }

  modal.classList.remove('hidden');
});

document.getElementById('btn-close-unboxing').addEventListener('click', () => {
  document.getElementById('unboxing-modal').classList.add('hidden');
});

// --- PROFILE ACTIONS ---
document.getElementById('btn-change-username').addEventListener('click', () => {
  const newU = document.getElementById('profile-new-username').value.trim();
  if (newU && newU !== myUsername) socket.emit('changeUsername', { newUsername: newU });
});

function renderProfileData() {
  document.getElementById('prof-skin-val').textContent = localUserConfig.cosmetics.activeSkin;
  document.getElementById('prof-trail-val').textContent = localUserConfig.cosmetics.activeTrail;

  const skinGrid = document.getElementById('unlocked-skins-grid');
  skinGrid.innerHTML = '';
  localUserConfig.cosmetics.unlockedSkins.forEach(skin => {
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<div class="skin-preview" style="background:${skin};"></div><h4>Equip</h4>`;
    div.onclick = () => socket.emit('equipCosmetic', { itemType: 'skin', value: skin });
    skinGrid.appendChild(div);
  });

  const trailGrid = document.getElementById('unlocked-trails-grid');
  trailGrid.innerHTML = '';
  localUserConfig.cosmetics.unlockedTrails.forEach(trail => {
    const div = document.createElement('div');
    div.className = 'shop-item';
    let trailHtml = trail === 'none' ? `<div style="height:50px;width:50px;"></div>` : `<div class="trail-preview ${trail}-trail"></div>`;
    div.innerHTML = `${trailHtml}<h4>Equip</h4>`;
    div.onclick = () => socket.emit('equipCosmetic', { itemType: 'trail', value: trail });
    trailGrid.appendChild(div);
  });
}

// --- LOBBY ACTIONS ---
socket.on('gameCreated', (data) => {
  myRole = 'host';
  myCode = data.code;
  document.getElementById('display-game-code').textContent = myCode;

  hostTrackingPlayers = {};
  hostTrackingPlayers[socket.id] = { id: socket.id, name: myUsername };
  updateHostList();

  showView('hostLobby');
});

socket.on('joinedGame', (data) => {
  myRole = 'player';
  myCode = data.code;
  document.getElementById('lobby-nickname').textContent = myUsername;
  showView('playerLobby');
});

let hostTrackingPlayers = {};
socket.on('playerJoined', (player) => {
  if (myRole === 'host') {
    hostTrackingPlayers[player.id] = player;
    updateHostList();
  }
});
socket.on('playerLeft', (id) => {
  if (myRole === 'host') {
    delete hostTrackingPlayers[id];
    updateHostList();
  }
});
function updateHostList() {
  const list = document.getElementById('host-player-list');
  list.innerHTML = '';
  const arr = Object.values(hostTrackingPlayers);
  arr.forEach(p => {
    const li = document.createElement('li'); li.textContent = p.name; list.appendChild(li);
  });
  document.getElementById('player-count').textContent = arr.length;
  document.getElementById('btn-start-game').disabled = arr.length === 0;
}

document.getElementById('game-mode-select').addEventListener('change', (e) => {
  document.getElementById('opt-fishtopia-group').style.display = 'none';
  document.getElementById('opt-platformer-group').style.display = 'none';
  document.getElementById('opt-blastball-group').style.display = 'none';

  if (e.target.value === 'fishtopia') {
    document.getElementById('opt-fishtopia-group').style.display = 'block';
  } else if (e.target.value === 'blastball') {
    document.getElementById('opt-blastball-group').style.display = 'block';
  } else {
    document.getElementById('opt-platformer-group').style.display = 'block';
  }
});

document.getElementById('btn-start-game').addEventListener('click', () => {
  if (myRole === 'host' && myCode) {
    const s = document.getElementById('game-mode-select');
    const mode = s ? s.value : 'fishtopia';
    const duration = parseInt(document.getElementById('opt-duration').value) || 10;

    let rewardVal = parseInt(document.getElementById('opt-energy').value) || 1000;
    if (mode === 'fishtopia') rewardVal = parseInt(document.getElementById('opt-bait').value) || 2;
    else if (mode === 'blastball') rewardVal = parseInt(document.getElementById('opt-blasts').value) || 15;

    socket.emit('startGame', { code: myCode, mode, duration, rewardVal });
  }
});

socket.on('gameStarted', (payload) => {
  if (myRole !== 'host') myRole = 'player';

  // Clear any stale prediction state from the previous match.
  predicted = null;
  predictedBall = null;

  if (payload) {
    gameMode = payload.mode;
    gamePlatforms = payload.platforms || [];
    gameStations = payload.dldStations || [];
    gameMap = payload.map || null;
    if (payload.duration) {
      // Calculate local end time based on provided duration
      gameEndTime = Date.now() + (payload.duration * 60 * 1000);
    }
  }

  showView('gameView');
  canvas.focus();

  if (gameMode === 'dontlookdown' || gameMode === 'onewayout' || gameMode === 'coredefender' || gameMode === 'blastball') {
    document.getElementById('hud-rpg-group').classList.add('hidden');
    document.getElementById('hud-platformer-group').classList.remove('hidden');
    document.getElementById('hud-platformer-group').style.display = 'flex';
    document.getElementById('hud-energy-container').style.display = 'flex';
    document.getElementById('btn-answer-questions').classList.remove('hidden');

    if (gameMode === 'onewayout' || gameMode === 'coredefender' || gameMode === 'blastball') {
      document.getElementById('hud-elevation-container').style.display = 'none';
    } else {
      document.getElementById('hud-elevation-container').style.display = 'block';
    }

    if (gameMode === 'blastball') {
      document.getElementById('hud-blastball-score').classList.remove('hidden');
      document.getElementById('hud-blastball-score').style.display = 'flex';
      const span = document.getElementById('hud-energy').nextElementSibling;
      if (span) span.textContent = '🔫 Blasts';
    } else {
      const hudbb = document.getElementById('hud-blastball-score');
      if (hudbb) hudbb.classList.add('hidden');
      const span = document.getElementById('hud-energy').nextElementSibling;
      if (span) span.textContent = '⚡ Energy';
    }

    const hint = document.getElementById('hud-coredefender-hint');
    if (hint) {
      if (gameMode === 'coredefender') hint.classList.remove('hidden');
      else hint.classList.add('hidden');
    }

  } else {
    document.getElementById('hud-rpg-group').classList.remove('hidden');
    document.getElementById('hud-rpg-group').style.display = 'flex';
    document.getElementById('hud-platformer-group').classList.add('hidden');
    document.getElementById('hud-platformer-group').style.display = 'none';
    document.getElementById('hud-energy-container').style.display = 'none';
    document.getElementById('btn-answer-questions').classList.add('hidden');
  }

  if (myRole === 'host') document.getElementById('btn-end-game').classList.remove('hidden');
  else document.getElementById('btn-end-game').classList.add('hidden');

  resizeCanvas();
});

// --- ENDGAME ACTIONS ---
document.getElementById('btn-end-game').addEventListener('click', () => {
  if (myRole === 'host') socket.emit('endGame');
});

socket.on('gameEnded', ({ leaderboard }) => {
  const list = document.getElementById('results-leaderboard');
  list.innerHTML = '';
  leaderboard.forEach((p, i) => {
    const li = document.createElement('li');
    let coinHtml = p.coinsEarned ? ` <span style="color:#fbbf24;">(+${p.coinsEarned} 🪙)</span>` : '';
    li.innerHTML = `<strong>#${i + 1}</strong> ${p.name} - ${p.score} <strong>${p.scoreLabel}</strong>${coinHtml}`;
    list.appendChild(li);

    if (p.name === myUsername && p.coinsEarned && localUserConfig) {
      localUserConfig.inventory.coins += p.coinsEarned;
    }
  });
  showView('resultsView');
});

document.getElementById('btn-return-dashboard').addEventListener('click', () => {
  myRole = null; myCode = null; gameState = { players: {} };
  if (typeof cutsceneActive !== 'undefined') cutsceneActive = false;
  showView('dashboard'); updateDashboard();
});

document.getElementById('btn-answer-questions').addEventListener('click', () => {
  const me = gameState.players[socket.id];
  if (!me) return;
  if (gameMode === 'dontlookdown' || gameMode === 'blastball') {
    showQuestionModal();
  } else if (gameMode === 'onewayout' || gameMode === 'coredefender') {
    if (gameMap) {
      let nearStation = gameMap.stations.find(s => Math.hypot(me.x - s.x, me.y - s.y) < s.radius && s.type !== 'vendor');
      if (nearStation) showQuestionModal();
    }
  }
});

// --- GAME ENGINE ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let hasShownLowEnergy = false;
let hasShownOutEnergy = false;

const RPG_WIDTH = 3500;
const RPG_HEIGHT = 1500;
const WATER_X = 1500;
const VIP_WATER_X = 2200;
const LEGEND_WATER_X = 2900;
const DLD_WIDTH = 1200;
const BIOME_HEIGHT = 8000;

const STATIONS = {
  question: { x: 300, y: 300, radius: 100, color: '#facc15', label: 'E: Get Bait' },
  sell: { x: 300, y: 1200, radius: 100, color: '#4ade80', label: 'E: Sell Fish' },
  shop: { x: 800, y: 800, radius: 100, color: '#a78bfa', label: 'E: Gear' },
  ticketBooth: { x: 800, y: 300, radius: 100, color: '#ea580c', label: 'E: Boutiques' }
};

let keys = { w: false, a: false, s: false, d: false };

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

window.addEventListener('keydown', (e) => {
  if (views.gameView.classList.contains('hidden')) return;
  if (!myRole) return;
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'BUTTON') return;

  const key = e.key.toLowerCase();

  // Blastball: space = super blast, not movement
  if (key === ' ' && gameMode === 'blastball') {
    e.preventDefault();
    if (!e.repeat) socket.emit('interact', { type: 'superBlast' });
    return;
  }

  let changed = false;
  if (key === 'w' || key === 'arrowup' || key === ' ') {
    keys.w = true; changed = true;
    if (gameMode === 'dontlookdown' && !e.repeat) socket.emit('doJump');
  }
  if (key === 'a' || key === 'arrowleft') { keys.a = true; changed = true; }
  if (key === 's' || key === 'arrowdown') { keys.s = true; changed = true; }
  if (key === 'd' || key === 'arrowright') { keys.d = true; changed = true; }
  if (changed) updateInput();

  if (key === ' ' && gameMode === 'fishtopia') socket.emit('interact', { type: 'fish' });

  if (key === 'e') {
    const me = gameState.players[socket.id];
    if (me) {
      if (gameMode === 'fishtopia') {
        if (Math.hypot(me.x - STATIONS.question.x, me.y - STATIONS.question.y) < STATIONS.question.radius) showQuestionModal();
        else if (Math.hypot(me.x - STATIONS.sell.x, me.y - STATIONS.sell.y) < STATIONS.sell.radius) socket.emit('interact', { type: 'sell' });
        else if (Math.hypot(me.x - STATIONS.shop.x, me.y - STATIONS.shop.y) < STATIONS.shop.radius) document.getElementById('shop-modal').classList.remove('hidden');
        else if (Math.hypot(me.x - STATIONS.ticketBooth.x, me.y - STATIONS.ticketBooth.y) < STATIONS.ticketBooth.radius) document.getElementById('cosmetic-shop-modal').classList.remove('hidden');
      } else if (gameMode === 'dontlookdown') {
        let near = gameStations.find(s => Math.hypot(me.x - s.x, me.y - s.y) < s.radius);
        if (near) showQuestionModal();
      } else if (gameMode === 'blastball') {
        showQuestionModal();
      } else if (gameMode === 'onewayout' || gameMode === 'coredefender') {
        if (gameMap) {
          let nearGate = gameMap.gates ? gameMap.gates.find(g => {
            if (g.isOpen) return false;
            let cx = Math.max(g.x, Math.min(me.x, g.x + g.w));
            let cy = Math.max(g.y, Math.min(me.y, g.y + g.h));
            return Math.hypot(me.x - cx, me.y - cy) < 150;
          }) : null;
          let nearStation = gameMap.stations.find(s => Math.hypot(me.x - s.x, me.y - s.y) < s.radius);
          if (nearGate) {
            socket.emit('interact', { type: 'unlock', gateId: nearGate.id });
          } else if (nearStation) {
            if (nearStation.type === 'vendor' || nearStation.type === 'turret') socket.emit('interact', { type: 'buy', stationId: nearStation.id });
            else showQuestionModal();
          } else if (gameMode === 'coredefender') {
            socket.emit('interact', { type: 'build_turret' });
          }
        }
      }
    }
  }

  if (key === 'escape') {
    document.getElementById('question-modal').classList.add('hidden');
    document.getElementById('shop-modal').classList.add('hidden');
    document.getElementById('cosmetic-shop-modal').classList.add('hidden');
    document.getElementById('profile-modal').classList.add('hidden');
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (views.gameView.classList.contains('hidden') || !myRole) return;
  if (gameMode === 'onewayout' || gameMode === 'coredefender' || gameMode === 'blastball') {
    const me = gameState.players[socket.id];
    if (me) {
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldX = screenX - canvas.width / 2 + me.x;
      const worldY = screenY - canvas.height / 2 + me.y;
      socket.emit('interact', { type: 'shoot', tx: worldX, ty: worldY });
    }
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === ' ' && gameMode === 'blastball') return;
  let changed = false;
  if (key === 'w' || key === 'arrowup' || key === ' ') { keys.w = false; changed = true; }
  if (key === 'a' || key === 'arrowleft') { keys.a = false; changed = true; }
  if (key === 's' || key === 'arrowdown') { keys.s = false; changed = true; }
  if (key === 'd' || key === 'arrowright') { keys.d = false; changed = true; }
  if (changed) updateInput();
});

function updateInput() {
  let dx = 0, dy = 0;
  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;
  socket.emit('input', { dx, dy, jump: keys.w });
}

socket.on('gateUnlocked', (gateId) => {
  if (gameMap && gameMap.gates) {
    let gate = gameMap.gates.find(g => g.id === gateId);
    if (gate) gate.isOpen = true;
  }
});

let cutsceneActive = false;
let safePassengers = [];
let cutsceneTimer = 0;

socket.on('escapeCutscene', (data) => {
  cutsceneActive = true;
  safePassengers = data.safePlayers;
  cutsceneTimer = 0;
});

// =========================================================
// Client-side movement prediction
// =========================================================
// The server is authoritative but each input has to round-trip to Render
// before you see motion (~200-400ms on free tier). We locally simulate
// your own player at the same 400 px/s the server uses, then smoothly
// lerp toward the authoritative position on each game-state update.
// Skipped in dontlookdown because gravity + slope collision is too
// complex to predict cleanly.
let predicted = null;             // { x, y, lastTime } in world coords
let predictedBall = null;         // mirror of gameState.ball that we extrapolate locally between server ticks
const PREDICT_SPEED = 400;        // must match server's p.speed
const SERVER_TICK_HZ = 30;        // must match server's physics setInterval rate

function shouldPredictMovement() {
  return gameMode === 'fishtopia' ||
         gameMode === 'blastball'  ||
         gameMode === 'onewayout'  ||
         gameMode === 'coredefender';
}

function tickPrediction(now, serverMe) {
  if (!shouldPredictMovement()) { predicted = null; return null; }
  if (!serverMe) return null;
  if (!predicted) {
    predicted = { x: serverMe.x, y: serverMe.y, lastTime: now };
    return predicted;
  }
  let dt = (now - predicted.lastTime) / 1000;
  predicted.lastTime = now;
  if (dt > 0.1) dt = 0.1; // tab inactive or jank — don't teleport

  // Local input integration (same direction-normalize the server does)
  let dx = 0, dy = 0;
  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;
  const mag = Math.hypot(dx, dy);
  const hasInput = mag > 0;
  if (hasInput) { dx /= mag; dy /= mag; }
  predicted.x += dx * PREDICT_SPEED * dt;
  predicted.y += dy * PREDICT_SPEED * dt;

  // Only reconcile if the player isn't actively driving — otherwise the
  // lerp drags them backward toward the server's lagged position and
  // movement feels mushy. If the drift is huge (hit a wall server-side,
  // collision pushed us back, etc.) snap harder.
  const driftX = serverMe.x - predicted.x;
  const driftY = serverMe.y - predicted.y;
  const drift = Math.hypot(driftX, driftY);
  if (drift > 80) {
    // Big divergence — snap halfway. Wall hits, ball pushback, etc.
    predicted.x += driftX * 0.5;
    predicted.y += driftY * 0.5;
  } else if (!hasInput) {
    // Idle — gentle catch-up.
    predicted.x += driftX * 0.2;
    predicted.y += driftY * 0.2;
  }
  return predicted;
}

// Ball prediction for blastball: extrapolate position using the last
// server velocity, decay it the same way the server does, bounce off
// walls (skipping goal openings), and let the predicted player push the
// ball locally so kicks feel instant.
function tickBallPrediction(now) {
  if (gameMode !== 'blastball' || !predictedBall) return;
  if (predictedBall.scored) return;
  if (!predictedBall.lastTime) { predictedBall.lastTime = now; return; }
  let dt = (now - predictedBall.lastTime) / 1000;
  predictedBall.lastTime = now;
  if (dt <= 0) return;
  if (dt > 0.1) dt = 0.1;

  // Server velocity is "pixels per server tick"; converting: px/s = vx * SERVER_TICK_HZ
  predictedBall.x += predictedBall.vx * SERVER_TICK_HZ * dt;
  predictedBall.y += predictedBall.vy * SERVER_TICK_HZ * dt;
  // Decay 0.985 per server tick → per-second factor is 0.985^30; raise to dt for this frame.
  const decay = Math.pow(0.985, SERVER_TICK_HZ * dt);
  predictedBall.vx *= decay;
  predictedBall.vy *= decay;

  // Pitch bounds + goal openings (must match server)
  const halfW = 1200, halfH = 800;
  const goalHalf = 225;
  const r = predictedBall.radius || 45;
  if (predictedBall.y - r < -halfH) { predictedBall.y = -halfH + r; predictedBall.vy *= -1; }
  if (predictedBall.y + r >  halfH) { predictedBall.y =  halfH - r; predictedBall.vy *= -1; }
  if (predictedBall.x - r < -halfW) {
    if (Math.abs(predictedBall.y) > goalHalf) { predictedBall.x = -halfW + r; predictedBall.vx *= -1; }
  }
  if (predictedBall.x + r >  halfW) {
    if (Math.abs(predictedBall.y) > goalHalf) { predictedBall.x =  halfW - r; predictedBall.vx *= -1; }
  }

  // Local player pushes ball — mirrors the server-side collision so the
  // first touch feels instant. We only apply the velocity kick on the
  // FRAME we first start overlapping (wasTouching gate); otherwise at
  // 60 fps we'd double the server's 30 Hz impulse rate and the ball
  // would visibly snap back when the server's velocity arrives. The
  // position overlap-push runs every frame so the ball still feels
  // physically blocked by the player.
  if (predicted) {
    const dx = predictedBall.x - predicted.x;
    const dy = predictedBall.y - predicted.y;
    const dist = Math.hypot(dx, dy);
    const minDist = r + 20;
    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      predictedBall.x += (dx / dist) * overlap;
      predictedBall.y += (dy / dist) * overlap;
      if (!predictedBall.wasTouching) {
        predictedBall.vx += (dx / dist) * 3;
        predictedBall.vy += (dy / dist) * 3;
        predictedBall.wasTouching = true;
      }
    } else {
      predictedBall.wasTouching = false;
    }
  }
}

function render() {
  if (!views.gameView.classList.contains('hidden') && myRole) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const me = gameState.players[socket.id];
    if (!me) return requestAnimationFrame(render);

    // Apply local prediction. tickPrediction mutates predicted internally;
    // we overwrite me.x/me.y so the camera + self-render use it. Server
    // state is re-applied on the next gameState event.
    const __now = performance.now();
    const p = tickPrediction(__now, me);
    if (p) { me.x = p.x; me.y = p.y; }
    tickBallPrediction(__now);

    if (cutsceneActive) {
      ctx.resetTransform();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      cutsceneTimer += 1 / 60;
      let shipX = canvas.width / 2;
      let shipY = canvas.height - (cutsceneTimer / 5) * (canvas.height + 400);

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.moveTo(shipX, shipY - 150); ctx.lineTo(shipX - 60, shipY + 100); ctx.lineTo(shipX + 60, shipY + 100); ctx.fill();
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(shipX - 20, shipY - 60, 40, 40);

      ctx.fillStyle = Math.random() > 0.5 ? '#ef4444' : '#f59e0b';
      ctx.beginPath(); ctx.moveTo(shipX - 40, shipY + 100); ctx.lineTo(shipX, shipY + 200 + Math.random() * 100); ctx.lineTo(shipX + 40, shipY + 100); ctx.fill();

      ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Outfit'; ctx.textAlign = 'center';
      ctx.fillText('ESCAPE SUCCESSFUL:', shipX, shipY + 300);
      ctx.font = '24px Outfit';
      safePassengers.forEach((sp, i) => { ctx.fillText(sp.name, shipX, shipY + 340 + i * 30); });

      requestAnimationFrame(render);
      return;
    }

    ctx.save();

    if (gameMode === 'fishtopia') {
      ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);
      // World Grid
      ctx.fillStyle = '#4d7c0f'; ctx.fillRect(0, 0, RPG_WIDTH, RPG_HEIGHT);
      ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 2;
      for (let i = 0; i < RPG_WIDTH; i += 100) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, RPG_HEIGHT); ctx.stroke(); }
      for (let i = 0; i < RPG_HEIGHT; i += 100) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(RPG_WIDTH, i); ctx.stroke(); }
      // Water
      ctx.fillStyle = '#0284c7'; ctx.fillRect(WATER_X, 0, VIP_WATER_X - WATER_X, RPG_HEIGHT);
      ctx.fillStyle = '#0ea5e9'; ctx.fillRect(VIP_WATER_X, 0, LEGEND_WATER_X - VIP_WATER_X, RPG_HEIGHT);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(LEGEND_WATER_X, 0, RPG_WIDTH - LEGEND_WATER_X, RPG_HEIGHT);
      // Markings
      ctx.fillStyle = '#fff'; ctx.font = '24px Outfit';
      ctx.fillText('Normal Water', WATER_X + 100, 100); ctx.fillText('VIP Water', VIP_WATER_X + 100, 100); ctx.fillText('Legend Water', LEGEND_WATER_X + 100, 100);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(VIP_WATER_X, 0); ctx.lineTo(VIP_WATER_X, RPG_HEIGHT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(LEGEND_WATER_X, 0); ctx.lineTo(LEGEND_WATER_X, RPG_HEIGHT); ctx.stroke();
      // Stations
      for (const [key, st] of Object.entries(STATIONS)) {
        ctx.beginPath(); ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fillStyle = st.color; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '18px Outfit'; ctx.textAlign = 'center';
        ctx.fillText(st.label, st.x, st.y + st.radius + 25);
      }
    }
    else if (gameMode === 'dontlookdown') {
      ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

      // Biome Background Tracking
      let bColors = ['#1a2e05', '#262626', '#082f49', '#1e3a8a', '#0f172a', '#f8fafc'];
      let idx = Math.max(0, Math.min(5, Math.floor(-me.y / BIOME_HEIGHT)));
      ctx.fillStyle = bColors[idx];
      ctx.fillRect(-2000, -10000, 6000, 12000); // Big background clear

      // Draw Green Summit Texts at Checkpoints
      ctx.textAlign = 'center';
      ctx.font = 'bold 100px Outfit';
      ctx.fillStyle = '#22c55e'; // Vibrant green text
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 15;

      for (let i = 1; i <= 6; i++) {
        let txt = i === 6 ? 'THE PEAK!' : `SUMMIT ${i}`;
        let yPos = -(i * BIOME_HEIGHT) - 60; // Displayed slightly above the checkpoint platform
        ctx.strokeText(txt, DLD_WIDTH / 2, yPos);
        ctx.fillText(txt, DLD_WIDTH / 2, yPos);
      }

      // Walls
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-200, -10000, 200, 12000);
      ctx.fillRect(DLD_WIDTH, -10000, 200, 12000);

      // Platforms (Themed Geometries)
      ctx.lineWidth = 4;
      for (let plat of gamePlatforms) {
        let fcolor = '#f8fafc', scolor = '#cbd5e1';
        if (plat.theme === 0) { fcolor = '#654321'; scolor = '#22c55e'; } // Grass
        else if (plat.theme === 1) { fcolor = '#525252'; scolor = '#a3a3a3'; } // Stone
        else if (plat.theme === 2) { fcolor = '#bae6fd'; scolor = '#e0f2fe'; } // Ice
        else if (plat.theme === 3) { fcolor = '#f8fafc'; scolor = '#cbd5e1'; ctx.setLineDash([10, 10]); } // Clouds
        else if (plat.theme === 4) { fcolor = '#3b0764'; scolor = '#a855f7'; } // Space
        else if (plat.theme === 5) { fcolor = '#eab308'; scolor = '#fef08a'; } // Gold

        ctx.fillStyle = fcolor; ctx.strokeStyle = scolor;

        ctx.save();
        ctx.translate(plat.x, plat.y);
        if (plat.angle) ctx.rotate(plat.angle);

        // Draw centered on relative 0,0 origin
        if (plat.shape === 'boat') {
          // Trapezoidal Boat with Mast
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(plat.w, 0);
          ctx.lineTo(plat.w - 30, plat.h);
          ctx.lineTo(30, plat.h);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          // Draw Mast
          ctx.beginPath();
          ctx.moveTo(plat.w / 2, 0);
          ctx.lineTo(plat.w / 2, -80);
          ctx.lineWidth = 6; ctx.stroke(); ctx.lineWidth = 4;
        }
        else if (plat.shape === 'pole') {
          // Bamboo-style vertical pole
          ctx.fillRect(0, 0, plat.w, plat.h);
          ctx.strokeRect(0, 0, plat.w, plat.h);
          ctx.beginPath();
          for (let j = 20; j < plat.h; j += 30) {
            ctx.moveTo(0, j);
            ctx.lineTo(plat.w, j);
          }
          ctx.stroke();
        }
        else if (plat.shape === 'step') {
          // Tiny cubic crate with X-pattern
          ctx.fillRect(0, 0, plat.w, plat.h);
          ctx.strokeRect(0, 0, plat.w, plat.h);
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(plat.w, plat.h);
          ctx.moveTo(plat.w, 0); ctx.lineTo(0, plat.h);
          ctx.stroke();
        }
        else {
          ctx.fillRect(0, 0, plat.w, plat.h);
          ctx.strokeRect(0, 0, plat.w, plat.h);
        }
        ctx.restore();
        ctx.setLineDash([]); // Reset dash
      }

    } else if (gameMode === 'blastball') {
      ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

      const SOCCER_W = 2400; const SOCCER_H = 1600;

      // Pitch Grass
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-SOCCER_W / 2, -SOCCER_H / 2, SOCCER_W, SOCCER_H);

      // Grass Pattern (Stripes)
      ctx.fillStyle = '#16a34a';
      for (let i = -SOCCER_W / 2; i < SOCCER_W / 2; i += 200) {
        ctx.fillRect(i, -SOCCER_H / 2, 100, SOCCER_H);
      }

      // Chalk Lines
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
      ctx.strokeRect(-SOCCER_W / 2 + 10, -SOCCER_H / 2 + 10, SOCCER_W - 20, SOCCER_H - 20); // Border
      ctx.beginPath(); ctx.moveTo(0, -SOCCER_H / 2); ctx.lineTo(0, SOCCER_H / 2); ctx.stroke(); // Midline
      ctx.beginPath(); ctx.arc(0, 0, 200, 0, Math.PI * 2); ctx.stroke(); // Center Circle
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); // Center dot

      // Goals
      ctx.fillStyle = '#ef4444'; // Kitcolona Red
      ctx.fillRect(-SOCCER_W / 2 - 60, -225, 60, 450);
      ctx.fillStyle = '#3b82f6'; // Gimadrid Blue
      ctx.fillRect(SOCCER_W / 2, -225, 60, 450);

      // Terminals
      if (gameState.stations) {
        for (let s of gameState.stations) {
          ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b'; ctx.fill();
          ctx.lineWidth = 6; ctx.strokeStyle = '#fcd34d'; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '20px Outfit'; ctx.textAlign = 'center';
          ctx.fillText(s.label, s.x, s.y + s.radius + 30);
        }
      }

      // Ball (predicted locally between server ticks)
      const ballDraw = predictedBall || gameState.ball;
      if (ballDraw && !ballDraw.scored) {
        ctx.beginPath(); ctx.arc(ballDraw.x, ballDraw.y, ballDraw.radius || 45, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = '#0f172a'; ctx.stroke();
      }

    } else if (gameMode === 'onewayout' || gameMode === 'coredefender') {
      ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

      ctx.fillStyle = gameMode === 'coredefender' ? '#292524' : '#0f172a';
      ctx.fillRect(me.x - 5000, me.y - 5000, 10000, 10000);

      if (gameMode === 'coredefender') {
        ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2;
        for (let i = -2000; i <= 2000; i += 200) {
          ctx.beginPath(); ctx.moveTo(i, -2000); ctx.lineTo(i, 2000); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-2000, i); ctx.lineTo(2000, i); ctx.stroke();
        }
      }

      if (gameMap) {
        if (gameMap.floors) {
          ctx.fillStyle = '#1e293b'; // Slate floor
          ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
          for (let f of gameMap.floors) {
            ctx.fillRect(f.x, f.y, f.w, f.h);
            ctx.strokeRect(f.x, f.y, f.w, f.h);
          }
        }

        // Draw Stations
        for (let s of gameMap.stations) {
          ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = s.type === 'vendor' ? '#f59e0b' : (s.type === 'turret' ? '#57534e' : '#3b82f6');
          ctx.fill();
          ctx.strokeStyle = s.type === 'vendor' ? '#fcd34d' : (s.type === 'turret' ? '#a8a29e' : '#60a5fa');
          ctx.lineWidth = 6; ctx.stroke();
          if (s.type === 'turret' && s.level > 0) {
            ctx.save();
            ctx.translate(s.x, s.y);
            if (s.angle !== undefined) ctx.rotate(s.angle + Math.PI / 2);
            ctx.fillStyle = '#a8a29e'; ctx.fillRect(-8, -s.radius - 20, 16, 40);
            ctx.restore();
            ctx.fillStyle = '#14b8a6'; ctx.font = 'bold 18px Outfit'; ctx.fillText(`Lv ${s.level}`, s.x, s.y + 6);
          }
          ctx.fillStyle = '#fff'; ctx.font = '20px Outfit'; ctx.textAlign = 'center';
          ctx.fillText(s.label, s.x, s.y + s.radius + 30);
        }

        if (gameMap.gates) {
          for (let g of gameMap.gates) {
            ctx.fillStyle = g.isOpen ? 'rgba(34, 197, 94, 0.3)' : g.color; // Mapped to gate defined color
            ctx.fillRect(g.x, g.y, g.w, g.h);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Outfit'; ctx.textAlign = 'center';
            if (g.isOpen) {
              ctx.fillText('UNLOCKED', g.x + g.w / 2, g.y + g.h / 2 + 5);
            } else {
              const me = gameState.players[socket.id];
              const hasCard = me && me.cards && me.cards.includes(g.reqCard);
              ctx.fillText(hasCard ? `(PRESS E) TO UNLOCK` : `REQUIRES ${g.reqCard.toUpperCase()} CARD`, g.x + g.w / 2, g.y + g.h / 2 + 5);
            }
          }
        }

        if (gameMap.escapePod) {
          let pod = gameMap.escapePod;
          ctx.beginPath(); ctx.arc(pod.x, pod.y, pod.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#eab308'; ctx.fill(); // Gold objective
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 10; ctx.setLineDash([20, 20]); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#000'; ctx.font = 'bold 30px Outfit'; ctx.textAlign = 'center';
          ctx.fillText('ESCAPE POD', pod.x, pod.y);
        }

        if (gameMap.core) {
          let c = gameMap.core;
          ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#0ea5e9'; ctx.fill();
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 8; ctx.stroke();

          ctx.fillStyle = '#000'; ctx.fillRect(c.x - 60, c.y - c.radius - 30, 120, 15);
          ctx.fillStyle = '#ef4444'; ctx.fillRect(c.x - 60, c.y - c.radius - 30, 120 * (c.hp / c.maxHp), 15);
          ctx.fillStyle = '#fff'; ctx.font = '14px Outfit'; ctx.textAlign = 'center'; ctx.fillText('CORE HP', c.x, c.y - c.radius - 35);
        }
      }

      // Render monsters
      if (gameState.monsters) {
        for (let m of gameState.monsters) {
          if (m.hp <= 0) continue;
          ctx.beginPath(); ctx.arc(m.x, m.y, 30, 0, Math.PI * 2);
          ctx.fillStyle = m.super ? '#a855f7' : '#22c55e'; // Purple boss or Green zombie
          ctx.fill();
          ctx.strokeStyle = m.super ? '#4c1d95' : '#166534'; ctx.lineWidth = 4; ctx.stroke();
          ctx.fillStyle = '#ef4444'; // Red angry eyes
          ctx.fillRect(m.x - 12, m.y - 12, 6, 6);
          ctx.fillRect(m.x + 6, m.y - 12, 6, 6);
        }
      }

      // Render projectiles
      if (gameState.projectiles) {
        for (let proj of gameState.projectiles) {
          ctx.beginPath(); ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
          if (proj.ownerId) {
            ctx.fillStyle = '#3b82f6'; // Blue friendly plasma
            ctx.fill();
            ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.stroke();
          } else {
            ctx.fillStyle = '#13ff02ff'; // Green enemy plasma
            ctx.fill();
            ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2; ctx.stroke();
          }
        }
      }
    }

    // Players
    Object.values(gameState.players).forEach(p => {
      // Trails
      if (!trails[p.id]) trails[p.id] = [];
      trails[p.id].push({ x: p.x, y: p.y, age: 0 });
      if (trails[p.id].length > 20) trails[p.id].shift();
      if (p.trail && p.trail !== 'none') {
        ctx.beginPath();
        trails[p.id].forEach((t, i) => { if (i === 0) ctx.moveTo(t.x, t.y); else ctx.lineTo(t.x, t.y); t.age++; });
        let trailColor = 'cyan';
        if (p.trail === 'fire') trailColor = 'orange';
        if (p.trail === 'ice') trailColor = '#bae6fd';
        if (p.trail === 'plasma') trailColor = '#a855f7';
        if (p.trail === 'shadow') trailColor = '#1e293b';
        if (p.trail === 'gold') trailColor = '#facc15';
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.5; ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      if (p.hp <= 0 && gameMode === 'coredefender') ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
      ctx.fillStyle = p.skin || '#ffffff'; ctx.fill();
      // Render energy visual (stroke border)
      ctx.strokeStyle = p.energy <= 0 ? '#ef4444' : '#1e293b'; ctx.lineWidth = 4; ctx.stroke();

      // Name
      if (gameMode === 'onewayout') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(p.x - 20, p.y - 50, 40, 6);
        ctx.fillStyle = p.hp > 30 ? '#22c55e' : '#ef4444';
        ctx.fillRect(p.x - 20, p.y - 50, (p.hp / 100) * 40, 6);

        if (p.cards && p.cards.length > 0) {
          let xOffset = p.x - (p.cards.length * 15) / 2;
          p.cards.forEach((c, i) => {
            ctx.fillStyle = c === 'red' ? '#ef4444' : '#3b82f6';
            ctx.fillRect(xOffset + i * 15, p.y - 65, 10, 12);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(xOffset + i * 15, p.y - 65, 10, 12);
          });
        }
      }
      ctx.fillStyle = '#fff'; ctx.font = '600 16px Outfit'; ctx.textAlign = 'center';
      ctx.fillText(p.hp <= 0 && gameMode === 'coredefender' ? 'DEAD' : p.name, p.x, p.y - (!p.hp ? 35 : 75));
      ctx.globalAlpha = 1.0;

      // Draw energy HUD over player head if DLD
      if (gameMode === 'dontlookdown') {
        ctx.fillStyle = p.energy <= 20 ? '#ef4444' : '#eab308';
        ctx.fillRect(p.x - 20, p.y - 65, (p.energy / 100) * 40, 5);
      }
    });

    if (explosions) {
      for (let i = explosions.length - 1; i >= 0; i--) {
        let ex = explosions[i];
        ex.life -= 0.05;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r * (1 - ex.life), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${ex.life})`;
        ctx.fill();

        // Additional tiny static particles for blast effect
        for (let p = 0; p < 8; p++) {
          let px = ex.x + Math.cos(p) * (ex.r * 0.8 * (1 - ex.life));
          let py = ex.y + Math.sin(p) * (ex.r * 0.8 * (1 - ex.life));
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(252, 211, 77, ${ex.life})`; ctx.fill();
        }

        if (ex.life <= 0) explosions.splice(i, 1);
      }
    }

    ctx.restore();

    if (gameMode === 'onewayout' && gameState.podLaunchTime) {
      let timeLeft = Math.max(0, (gameState.podLaunchTime - Date.now()) / 1000);
      if (timeLeft > 0) {
        ctx.resetTransform();
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 80px Outfit'; ctx.textAlign = 'center';
        ctx.fillText(`T-MINUS ${timeLeft.toFixed(1)}s`, canvas.width / 2, 100);
        ctx.fillStyle = '#fff'; ctx.font = '24px Outfit';
        ctx.fillText(`SURVIVE IN THE ESCAPE POD!`, canvas.width / 2, 140);
      }
    }

    // Update real-time numerical HUD
    if (gameEndTime) {
      let timeLeft = Math.max(0, Math.floor((gameEndTime - Date.now()) / 1000));
      let m = Math.floor(timeLeft / 60); let s = timeLeft % 60;
      document.getElementById('hud-time').textContent = `${m}:${s < 10 ? '0' + s : s}`;
    }

    if (me && (gameMode === 'dontlookdown' || gameMode === 'onewayout' || gameMode === 'coredefender' || gameMode === 'blastball')) {
      document.getElementById('hud-energy').textContent = Math.floor(me.energy);

      if (gameMode === 'dontlookdown') {
        document.getElementById('hud-elevation').textContent = me.elevation || 0;
      }

      if (gameMode === 'blastball') {
        if (gameState.scores) {
          document.getElementById('score-kitcolona').textContent = gameState.scores.kitcolona || 0;
          document.getElementById('score-gimadrid').textContent = gameState.scores.gimadrid || 0;
        }
      }

      // Urgent UI warning visual
      if (me.energy <= 0) document.getElementById('hud-energy').parentNode.style.color = '#ef4444';
      else document.getElementById('hud-energy').parentNode.style.color = '#0f172a';

      // Advanced Popup Modals
      if (me.energy <= 200 && me.energy > 0 && !hasShownLowEnergy) {
        hasShownLowEnergy = true;
        document.getElementById('low-energy-modal').classList.remove('hidden');
      }
      if (me.energy <= 0 && !hasShownOutEnergy) {
        hasShownOutEnergy = true;
        document.getElementById('out-of-energy-modal').classList.remove('hidden');
      }

      // Reset triggers if they answered questions and got healthy energy
      if (me.energy > 200) {
        hasShownLowEnergy = false;
        hasShownOutEnergy = false;
      }
    }
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function updateHUD() {
  if (!localUserConfig) return;
  document.getElementById('hud-bait').textContent = localUserConfig.inventory.bait;
  document.getElementById('hud-fish').textContent = `${localUserConfig.inventory.fishes.length}/${localUserConfig.equipment.backpackLevel * 3}`;
  document.getElementById('hud-coins').textContent = localUserConfig.inventory.coins;
  // Display tickets dynamically
  document.getElementById('hud-tickets').textContent = `${localUserConfig.inventory.vipTickets}V | ${localUserConfig.inventory.legendTickets}L`;
  document.getElementById('hud-rod').textContent = localUserConfig.equipment.rodLevel;
}

// =========================================================
// Adaptive Math Assessment — flow controller
// (Skill registry, MATH helpers, and GRADE_ORDER live in math-skills.js)
// =========================================================
function getMathState(skillId) {
  if (!localUserConfig.mathProgress) localUserConfig.mathProgress = {};
  if (!localUserConfig.mathProgress[skillId]) {
    localUserConfig.mathProgress[skillId] = { correct: 0, incorrect: 0, streak: 0, mastered: false, introSeen: false };
  }
  return localUserConfig.mathProgress[skillId];
}

function getGradeCompleted() {
  if (!localUserConfig.gradeCompleted) localUserConfig.gradeCompleted = {};
  return localUserConfig.gradeCompleted;
}

function pickSkillId() {
  const grade = localUserConfig.activeGrade || 'K';
  const ids = MATH_skillsForGrade(grade);
  if (!ids.length) return null;
  const weighted = ids.map(id => {
    const st = getMathState(id);
    const total = st.correct + st.incorrect;
    const accuracy = total > 0 ? st.correct / total : 0.5;
    const weight = st.mastered ? 0.3 : 1 + (1 - accuracy) * 3;
    return { id, weight };
  });
  const sum = weighted.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * sum;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.id;
  }
  return weighted[0].id;
}

// ----- Mastery course + placement state -----
let masteryCourse = null;   // { grade, pool, remaining, score, total }
let placement = null;       // { index, results: [{ skillId, grade, correct }] }
let recentAnswers = [];     // rolling window of last ~10 booleans
let answersSinceDecline = 0; // cooldown after the player says "Stay here"
let currentSkillId = null;
let currentQuestion = null;

const RECENT_WINDOW_MAX = 10;
const DECLINE_COOLDOWN = 8;

function recordAnswer(correct) {
  recentAnswers.push(!!correct);
  if (recentAnswers.length > RECENT_WINDOW_MAX) recentAnswers.shift();
}

function resetAdjustmentTracking() {
  recentAnswers = [];
  answersSinceDecline = 0;
}

function startMasteryCourse(grade) {
  masteryCourse = {
    grade,
    pool: MATH_skillsForGrade(grade),
    remaining: 10, score: 0, total: 10
  };
}

function showQuestionModal() {
  if (!localUserConfig) return;

  // First-time placement quiz takes priority over everything.
  if (!localUserConfig.placementDone && !placement) {
    placement = { index: 0, results: [] };
    presentPlacementQuestion();
    return;
  }
  if (placement) {
    presentPlacementQuestion();
    return;
  }

  // If a mastery course is active, present the next question from its pool.
  if (masteryCourse) {
    const id = masteryCourse.pool[Math.floor(Math.random() * masteryCourse.pool.length)];
    presentSkillQuestion(id, { masteryMode: true });
    return;
  }

  // If every skill in current grade is mastered (and course not completed), offer the Mastery Course.
  const grade = localUserConfig.activeGrade || 'K';
  const gc = getGradeCompleted();
  if (!gc[grade] && MATH_allMastered(localUserConfig.mathProgress || {}, grade)) {
    showMasteryModal(grade);
    return;
  }

  const skillId = pickSkillId();
  if (!skillId) return;
  const st = getMathState(skillId);
  if (!st.introSeen) { showIntroModal(skillId); return; }
  presentSkillQuestion(skillId, {});
}

// =========================================================
// Placement quiz
// =========================================================
function presentPlacementQuestion() {
  const skillId = PLACEMENT_TEST[placement.index];
  const skill = MATH_SKILLS[skillId];
  const q = skill.generate();
  currentSkillId = skillId;
  currentQuestion = q;

  document.querySelector('#question-modal h2').textContent = `🎯 Placement Quiz — Q ${placement.index + 1} of ${PLACEMENT_TEST.length}`;
  document.getElementById('question-progress').textContent = `Finding your starting level… (${MATH_gradeLabel(skill.grade)} territory)`;
  document.getElementById('question-text').innerHTML = q.question.replace(/\n/g, '<br/>');
  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => onPlacementAnswer(skillId, q, idx);
    grid.appendChild(btn);
  });
  document.getElementById('question-modal').classList.remove('hidden');
}

function onPlacementAnswer(skillId, q, idx) {
  const correct = idx === q.answerIndex;
  const skill = MATH_SKILLS[skillId];
  placement.results.push({ skillId, grade: skill.grade, correct });
  document.getElementById('question-modal').classList.add('hidden');
  const advance = () => {
    placement.index++;
    if (placement.index < PLACEMENT_TEST.length) {
      setTimeout(presentPlacementQuestion, 200);
    } else {
      finishPlacement();
    }
  };
  if (!correct) showExplainModal(skillId, q, advance);
  else advance();
}

function finishPlacement() {
  // Pick the highest-grade question they got right.
  let highestIdx = -1;
  for (const r of placement.results) {
    if (r.correct) {
      const idx = GRADE_ORDER.indexOf(r.grade);
      if (idx > highestIdx) highestIdx = idx;
    }
  }
  const placedGrade = highestIdx >= 0 ? GRADE_ORDER[highestIdx] : 'K';
  const score = placement.results.filter(r => r.correct).length;
  const total = placement.results.length;
  placement = null;
  localUserConfig.placementDone = true;
  localUserConfig.activeGrade = placedGrade;
  resetAdjustmentTracking();
  socket.emit('setActiveGrade', { grade: placedGrade, source: 'placement' });
  showPlacementResult(placedGrade, score, total);
}

function showPlacementResult(grade, score, total) {
  const modal = document.getElementById('mastery-modal');
  document.getElementById('mastery-stage-intro').classList.add('hidden');
  document.getElementById('mastery-stage-result').classList.remove('hidden');
  document.getElementById('mastery-result-emoji').textContent = '🎯';
  document.getElementById('mastery-result-title').textContent = `Starting Level: ${MATH_gradeLabel(grade)}`;
  document.getElementById('mastery-result-body').textContent =
    `Placement score: ${score} / ${total}\n\n` +
    `We're starting you at ${MATH_gradeLabel(grade)}. As you master each level, you'll automatically advance — and if questions feel too easy or too hard, the engine will offer to switch you up or down.`;
  document.getElementById('btn-mastery-done').textContent = 'Let\'s go!';
  modal.classList.remove('hidden');
  document.getElementById('btn-mastery-done').onclick = () => {
    modal.classList.add('hidden');
    canvas.focus();
  };
}

// =========================================================
// Continuous level adjustment
// =========================================================
// Uses a rolling window of the player's last ~10 answers. After every
// answer we re-check accuracy. A misplacement after the placement quiz
// gets flagged within 4 wrong answers, not 12 like before.
function checkGradeAdjustment() {
  if (answersSinceDecline > 0) { answersSinceDecline--; return; }

  const grade = localUserConfig.activeGrade || 'K';
  const gradeIdx = GRADE_ORDER.indexOf(grade);
  const correctCount = recentAnswers.filter(x => x).length;
  const total = recentAnswers.length;
  if (total < 4) return;
  const accuracy = correctCount / total;

  // Aggressive downshift: 4+ answers, <50% accuracy.
  if (accuracy < 0.5 && gradeIdx > 0) {
    showAdjustmentModal('down', GRADE_ORDER[gradeIdx - 1], accuracy);
    return;
  }

  // Upshift: 6+ answers, >85% accuracy, still skills to master.
  if (total >= 6 && accuracy > 0.85 && gradeIdx < GRADE_ORDER.length - 1) {
    const skills = MATH_skillsForGrade(grade);
    const masteredCount = skills.filter(sid => (localUserConfig.mathProgress || {})[sid]?.mastered).length;
    if (masteredCount < skills.length) {
      showAdjustmentModal('up', GRADE_ORDER[gradeIdx + 1], accuracy);
    }
  }
}

function showAdjustmentModal(direction, targetGrade, accuracy) {
  const modal = document.getElementById('mastery-modal');
  document.getElementById('mastery-stage-intro').classList.remove('hidden');
  document.getElementById('mastery-stage-result').classList.add('hidden');
  const pct = Math.round(accuracy * 100);
  if (direction === 'down') {
    document.getElementById('mastery-title').textContent = 'Try an easier level?';
    document.getElementById('mastery-body').textContent =
      `Your recent accuracy is around ${pct}%. These look tough!\n\n` +
      `Want to drop down to ${MATH_gradeLabel(targetGrade)} and build up your foundations? You can come back any time.`;
  } else {
    document.getElementById('mastery-title').textContent = 'Want to skip ahead?';
    document.getElementById('mastery-body').textContent =
      `You're scoring around ${pct}% — way above the level!\n\n` +
      `Want to jump up to ${MATH_gradeLabel(targetGrade)}?`;
  }
  const startBtn = document.getElementById('btn-mastery-start');
  const laterBtn = document.getElementById('btn-mastery-later');
  startBtn.textContent = `Switch to ${MATH_gradeLabel(targetGrade)}`;
  laterBtn.textContent = 'Stay here';
  modal.classList.remove('hidden');
  startBtn.onclick = () => {
    modal.classList.add('hidden');
    localUserConfig.activeGrade = targetGrade;
    resetAdjustmentTracking();
    socket.emit('setActiveGrade', { grade: targetGrade, source: 'adjustment' });
    canvas.focus();
  };
  laterBtn.onclick = () => {
    modal.classList.add('hidden');
    answersSinceDecline = DECLINE_COOLDOWN;
    canvas.focus();
  };
}

function presentSkillQuestion(skillId, opts) {
  const skill = MATH_SKILLS[skillId];
  if (!skill) return;
  const q = skill.generate();
  currentSkillId = skillId;
  currentQuestion = q;

  document.querySelector('#question-modal h2').textContent = `${skill.name} · ${MATH_gradeLabel(skill.grade)}`;
  const prog = document.getElementById('question-progress');
  if (opts.masteryMode && masteryCourse) {
    prog.textContent = `🎓 Mastery Course · Q ${masteryCourse.total - masteryCourse.remaining + 1}/${masteryCourse.total} · Score ${masteryCourse.score}`;
  } else {
    const st = getMathState(skillId);
    prog.textContent = `Streak ${st.streak}/5 to master · ${st.correct} ✓ / ${st.incorrect} ✗`;
  }

  document.getElementById('question-text').innerHTML = q.question.replace(/\n/g, '<br/>');
  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => onAnswer(skillId, q, index, opts);
    grid.appendChild(btn);
  });
  document.getElementById('question-modal').classList.remove('hidden');
}

function onAnswer(skillId, q, index, opts) {
  const correct = index === q.answerIndex;
  document.getElementById('question-modal').classList.add('hidden');

  if (opts.masteryMode && masteryCourse) {
    if (correct) masteryCourse.score++;
    masteryCourse.remaining--;
    socket.emit('interact', { type: 'answer', skillId, correct, masteryGrade: masteryCourse.grade });
    if (!correct) showExplainModal(skillId, q, proceedMastery);
    else proceedMastery();
    return;
  }

  const st = getMathState(skillId);
  recordAnswer(correct);
  if (correct) {
    st.correct++; st.streak++;
    if (st.streak >= 5) st.mastered = true;
    socket.emit('interact', { type: 'answer', skillId, correct: true });
    document.getElementById('low-energy-modal').classList.add('hidden');
    document.getElementById('out-of-energy-modal').classList.add('hidden');
    canvas.focus();
    const grade = localUserConfig.activeGrade || 'K';
    const gc = getGradeCompleted();
    if (!gc[grade] && MATH_allMastered(localUserConfig.mathProgress, grade)) {
      setTimeout(() => showMasteryModal(grade), 400);
    } else {
      checkGradeAdjustment();
    }
  } else {
    st.incorrect++; st.streak = 0;
    socket.emit('interact', { type: 'answer', skillId, correct: false });
    showExplainModal(skillId, q, () => { canvas.focus(); checkGradeAdjustment(); });
  }
}

function showIntroModal(skillId) {
  const skill = MATH_SKILLS[skillId];
  document.getElementById('intro-title').textContent = `${skill.name} · ${MATH_gradeLabel(skill.grade)}`;
  document.getElementById('intro-body').textContent = skill.intro || "Let's try a question!";
  const modal = document.getElementById('intro-modal');
  modal.classList.remove('hidden');
  document.getElementById('btn-intro-ok').onclick = () => {
    modal.classList.add('hidden');
    const st = getMathState(skillId);
    st.introSeen = true;
    socket.emit('mathIntroSeen', { skillId });
    presentSkillQuestion(skillId, {});
  };
}

function showExplainModal(skillId, q, after) {
  const skill = MATH_SKILLS[skillId];
  document.getElementById('explain-skill').textContent = skill.name;
  document.getElementById('explain-question').innerHTML = (q.question || '').replace(/\n/g, '<br/>');
  document.getElementById('explain-body').textContent = q.explain || `The correct answer was: ${q.options[q.answerIndex]}.`;
  const modal = document.getElementById('explain-modal');
  modal.classList.remove('hidden');
  document.getElementById('btn-explain-ok').onclick = () => {
    modal.classList.add('hidden');
    if (after) after();
  };
}

function showMasteryModal(grade) {
  const modal = document.getElementById('mastery-modal');
  document.getElementById('mastery-stage-intro').classList.remove('hidden');
  document.getElementById('mastery-stage-result').classList.add('hidden');
  document.getElementById('mastery-title').textContent = `${MATH_gradeLabel(grade)} Mastery Course`;
  document.getElementById('mastery-body').textContent =
    `Amazing — you've mastered every skill in ${MATH_gradeLabel(grade)}!\n\n` +
    `One last challenge: 10 mixed questions across everything you've learned. Score 8+ to graduate to the next level.`;
  document.getElementById('btn-mastery-start').textContent = 'Begin the Mastery Course';
  document.getElementById('btn-mastery-later').textContent = 'Later';
  modal.classList.remove('hidden');
  document.getElementById('btn-mastery-start').onclick = () => {
    modal.classList.add('hidden');
    startMasteryCourse(grade);
    showQuestionModal();
  };
  document.getElementById('btn-mastery-later').onclick = () => {
    modal.classList.add('hidden');
    canvas.focus();
  };
}

function proceedMastery() {
  if (!masteryCourse) return;
  if (masteryCourse.remaining > 0) {
    setTimeout(() => showQuestionModal(), 250);
    return;
  }
  const passed = masteryCourse.score >= 8;
  const idx = GRADE_ORDER.indexOf(masteryCourse.grade);
  const nextGrade = passed && idx >= 0 && idx + 1 < GRADE_ORDER.length ? GRADE_ORDER[idx + 1] : null;
  const courseSnapshot = { ...masteryCourse };
  if (passed) {
    socket.emit('mathGradeCompleted', { grade: masteryCourse.grade, nextGrade });
    const gc = getGradeCompleted();
    gc[masteryCourse.grade] = true;
    if (nextGrade) localUserConfig.activeGrade = nextGrade;
  }
  masteryCourse = null;
  showMasteryResult(courseSnapshot, nextGrade, passed);
}

function showMasteryResult(course, nextGrade, passed) {
  const modal = document.getElementById('mastery-modal');
  document.getElementById('mastery-stage-intro').classList.add('hidden');
  document.getElementById('mastery-stage-result').classList.remove('hidden');
  document.getElementById('mastery-result-emoji').textContent = passed ? '🏆' : '💪';
  document.getElementById('mastery-result-title').textContent = passed
    ? `${MATH_gradeLabel(course.grade)} Graduated!`
    : `Almost — keep practicing!`;
  let body = `Score: ${course.score} / ${course.total}\n\n`;
  if (passed) body += nextGrade
    ? `Welcome to ${MATH_gradeLabel(nextGrade)} — new skills unlocked!`
    : `You've finished the highest level. Math champion!`;
  else body += `Need 8+ to graduate. Keep practicing the weaker skills, then try the Mastery Course again.`;
  document.getElementById('mastery-result-body').textContent = body;
  document.getElementById('btn-mastery-done').textContent = 'Continue';
  modal.classList.remove('hidden');
  document.getElementById('btn-mastery-done').onclick = () => {
    modal.classList.add('hidden');
    canvas.focus();
    if (passed) resetAdjustmentTracking();
  };
}

// Gear & Ticket Shop Logic
document.querySelectorAll('#shop-modal .btn-buy').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const category = e.target.getAttribute('data-category');
    const value = e.target.getAttribute('data-value');
    const price = parseInt(e.target.getAttribute('data-price'));
    socket.emit('interact', { type: 'buy', category, value, price });
  });
});
document.getElementById('btn-close-shop').addEventListener('click', () => { document.getElementById('shop-modal').classList.add('hidden'); canvas.focus(); });

// Cosmetic Shop Logic
document.querySelectorAll('#cosmetic-shop-modal .btn-buy').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const category = e.target.getAttribute('data-category');
    const value = e.target.getAttribute('data-value');
    const price = parseInt(e.target.getAttribute('data-price'));
    socket.emit('buyCosmetic', { category, value, price });
  });
});

socket.on('gameState', (data) => {
  gameState = data;
  if (gameState.coreHp !== undefined && gameMap && gameMap.core) {
    gameMap.core.hp = gameState.coreHp;
  }
  if (gameState.stations && gameMap) {
    gameMap.stations = gameState.stations;
  }
  // Reconcile ball prediction with the authoritative server state.
  if (data.ball) {
    if (!predictedBall) {
      predictedBall = { x: data.ball.x, y: data.ball.y, vx: data.ball.vx, vy: data.ball.vy, radius: data.ball.radius, scored: data.ball.scored, lastTime: performance.now() };
    } else {
      // Lerp position toward server (smooths small drift), trust server velocity.
      predictedBall.x += (data.ball.x - predictedBall.x) * 0.3;
      predictedBall.y += (data.ball.y - predictedBall.y) * 0.3;
      predictedBall.vx = data.ball.vx;
      predictedBall.vy = data.ball.vy;
      predictedBall.radius = data.ball.radius;
      predictedBall.scored = data.ball.scored;
    }
  } else {
    predictedBall = null;
  }
});
socket.on('blastEffect', (data) => {
  explosions.push({ x: data.x, y: data.y, r: data.radius, life: 1.0 });
});

socket.on('toast', (data) => {
  const toast = document.getElementById('feedback-toast');

  if (data.html) toast.innerHTML = data.html;
  else toast.textContent = data.msg;

  if (data.customColor) {
    toast.style.backgroundColor = data.customColor;
    toast.style.color = '#ffffff';
    toast.style.borderRadius = '2px';
    toast.style.padding = '12px 24px';
    toast.style.fontSize = '1.2rem';
  } else {
    toast.style.backgroundColor = data.success ? 'var(--accent-success)' : 'var(--accent-danger)';
    toast.style.borderRadius = '50px';
    toast.style.padding = '10px 20px';
    toast.style.fontSize = '1rem';
  }

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
});
socket.on('errorMsg', (msg) => { alert(msg); location.reload(); });
