const socket = io('https://learntopia.onrender.com');

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

if (btnMusic && bgMusic) {
  bgMusic.volume = 0.4; // Set a comfy background volume level permanently
  btnMusic.addEventListener('click', () => {
    musicMuted = !musicMuted;
    if (musicMuted) {
      bgMusic.pause();
      btnMusic.textContent = '🔇';
    } else {
      bgMusic.play().catch(e=>console.log(e));
      btnMusic.textContent = '🔊';
    }
  });
}

socket.on('authSuccess', ({ username, data }) => {
  myUsername = username;
  localUserConfig = data;
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
  if (e.target.value === 'fishtopia') {
    document.getElementById('opt-fishtopia-group').style.display = 'block';
    document.getElementById('opt-platformer-group').style.display = 'none';
  } else {
    document.getElementById('opt-fishtopia-group').style.display = 'none';
    document.getElementById('opt-platformer-group').style.display = 'block';
  }
});

document.getElementById('btn-start-game').addEventListener('click', () => {
  if (myRole === 'host' && myCode) {
    const s = document.getElementById('game-mode-select');
    const mode = s ? s.value : 'fishtopia';
    const duration = parseInt(document.getElementById('opt-duration').value) || 10;
    const rewardVal = mode === 'fishtopia' ?
      parseInt(document.getElementById('opt-bait').value) :
      parseInt(document.getElementById('opt-energy').value);

    socket.emit('startGame', { code: myCode, mode, duration, rewardVal });
  }
});

socket.on('gameStarted', (payload) => {
  if (myRole !== 'host') myRole = 'player';

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

  if (gameMode === 'dontlookdown' || gameMode === 'onewayout' || gameMode === 'coredefender') {
    document.getElementById('hud-rpg-group').classList.add('hidden');
    document.getElementById('hud-platformer-group').classList.remove('hidden');
    document.getElementById('hud-platformer-group').style.display = 'flex';
    document.getElementById('hud-energy-container').style.display = 'flex';
    document.getElementById('btn-answer-questions').classList.remove('hidden');
    if (gameMode === 'onewayout' || gameMode === 'coredefender') document.getElementById('hud-elevation-container').style.display = 'none';
    else document.getElementById('hud-elevation-container').style.display = 'block';

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
  if (gameMode === 'dontlookdown') {
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
  if (gameMode === 'onewayout' || gameMode === 'coredefender') {
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

function render() {
  if (!views.gameView.classList.contains('hidden') && myRole) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const me = gameState.players[socket.id];
    if (!me) return requestAnimationFrame(render);

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

    } else if (gameMode === 'onewayout' || gameMode === 'coredefender') {
      ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

      ctx.fillStyle = gameMode === 'coredefender' ? '#292524' : '#0f172a';
      ctx.fillRect(me.x - 5000, me.y - 5000, 10000, 10000);
      
      if (gameMode === 'coredefender') {
          ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2;
          for (let i=-2000; i<=2000; i+=200) {
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
          ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI*2);
          ctx.fillStyle = s.type === 'vendor' ? '#f59e0b' : (s.type === 'turret' ? '#57534e' : '#3b82f6');
          ctx.fill();
          ctx.strokeStyle = s.type === 'vendor' ? '#fcd34d' : (s.type === 'turret' ? '#a8a29e' : '#60a5fa'); 
          ctx.lineWidth = 6; ctx.stroke();
          if (s.type === 'turret' && s.level > 0) {
             ctx.save();
             ctx.translate(s.x, s.y);
             if (s.angle !== undefined) ctx.rotate(s.angle + Math.PI/2);
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
          ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI*2);
          ctx.fillStyle = '#0ea5e9'; ctx.fill(); 
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 8; ctx.stroke();
          
          ctx.fillStyle = '#000'; ctx.fillRect(c.x - 60, c.y - c.radius - 30, 120, 15);
          ctx.fillStyle = '#ef4444'; ctx.fillRect(c.x - 60, c.y - c.radius - 30, 120 * (c.hp/c.maxHp), 15);
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

    if (me && (gameMode === 'dontlookdown' || gameMode === 'onewayout' || gameMode === 'coredefender')) {
      document.getElementById('hud-energy').textContent = Math.floor(me.energy);
      
      if (gameMode === 'dontlookdown') {
         document.getElementById('hud-elevation').textContent = me.elevation;
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

// First Grade Math Questions (Full Set)
const SAMPLE_QUESTIONS = [
  // Part 1: Basic Addition
  { id: 1, question: "3 + 2 = ___", options: ["4", "5", "6", "2"], answerIndex: 1 },
  { id: 2, question: "5 + 4 = ___", options: ["8", "9", "10", "7"], answerIndex: 1 },
  { id: 3, question: "7 + 1 = ___", options: ["6", "7", "8", "9"], answerIndex: 2 },
  { id: 4, question: "6 + 3 = ___", options: ["8", "9", "10", "11"], answerIndex: 1 },
  { id: 5, question: "2 + 8 = ___", options: ["9", "10", "11", "12"], answerIndex: 1 },

  // Part 2: Basic Subtraction
  { id: 6, question: "5 - 2 = ___", options: ["2", "3", "4", "5"], answerIndex: 1 },
  { id: 7, question: "9 - 4 = ___", options: ["4", "5", "6", "7"], answerIndex: 1 },
  { id: 8, question: "10 - 3 = ___", options: ["6", "7", "8", "9"], answerIndex: 1 },
  { id: 9, question: "7 - 1 = ___", options: ["5", "6", "7", "8"], answerIndex: 1 },
  { id: 10, question: "8 - 5 = ___", options: ["2", "3", "4", "5"], answerIndex: 1 },

  // Part 3: Number Sense
  { id: 11, question: "What number comes after 14?", options: ["13", "14", "15", "16"], answerIndex: 2 },
  { id: 12, question: "What number comes before 20?", options: ["18", "19", "20", "21"], answerIndex: 1 },
  { id: 13, question: "Fill in the missing number: 5, ___, 7", options: ["4", "6", "8", "9"], answerIndex: 1 },
  { id: 14, question: "Which is bigger: 9 or 6?", options: ["9", "6", "They are equal"], answerIndex: 0 },
  { id: 15, question: "Count: 2, 4, 6, ___, 10", options: ["7", "8", "9"], answerIndex: 1 },

  // Part 4: Comparing Numbers
  { id: 16, question: "7 ___ 5", options: [">", "<", "="], answerIndex: 0 },
  { id: 17, question: "3 ___ 3", options: [">", "<", "="], answerIndex: 2 },
  { id: 18, question: "10 ___ 8", options: [">", "<", "="], answerIndex: 0 },

  // Part 5: Word Problems (Addition)
  { id: 19, question: "Emma has 3 apples. She gets 2 more. How many apples does she have now?", options: ["4", "5", "6", "7"], answerIndex: 1 },
  { id: 20, question: "Liam has 4 toy cars. His friend gives him 3 more. How many cars does he have?", options: ["6", "7", "8", "9"], answerIndex: 1 },
  { id: 21, question: "There are 5 birds on a tree. 2 more birds come. How many birds are there now?", options: ["6", "7", "8", "9"], answerIndex: 1 },

  // Part 6: Word Problems (Subtraction)
  { id: 22, question: "Noah has 6 cookies. He eats 2. How many cookies are left?", options: ["3", "4", "5", "6"], answerIndex: 1 },
  { id: 23, question: "Ava has 9 balloons. 4 fly away. How many balloons does she have now?", options: ["4", "5", "6", "7"], answerIndex: 1 },
  { id: 24, question: "There are 10 fish in a tank. 3 swim away. How many are left?", options: ["6", "7", "8", "9"], answerIndex: 1 },

  // Part 7: Mixed Thinking
  { id: 25, question: "Mia has 2 red crayons and 5 blue crayons. How many crayons does she have?", options: ["6", "7", "8", "9"], answerIndex: 1 },
  { id: 26, question: "Ben had 8 candies. He gave 3 to his friend. How many candies does he have left?", options: ["4", "5", "6", "7"], answerIndex: 1 },
  { id: 27, question: "There are 4 cats and 4 dogs. How many animals are there in total?", options: ["6", "7", "8", "9"], answerIndex: 2 },

  // Optional Challenge
  { id: 28, question: "What is 10 + 0?", options: ["0", "1", "10", "100"], answerIndex: 2 },
  { id: 29, question: "What is 10 - 10?", options: ["0", "1", "10", "20"], answerIndex: 0 },
  { id: 30, question: "Fill in: ___ + 3 = 7", options: ["2", "3", "4", "5"], answerIndex: 2 }
];

function showQuestionModal() {
  const q = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
  document.getElementById('question-text').textContent = q.question;
  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  q.options.forEach((opt, index) => {
    const btn = document.createElement('button'); btn.className = 'option-btn'; btn.textContent = opt;
    btn.onclick = () => {
      if (index === q.answerIndex) {
        // Correct - Tell server to grant reward
        socket.emit('interact', { type: 'answer', questionId: q.id, selectedIndex: index });

        // Hide modals proactively on correct answer to clear screen
        document.getElementById('low-energy-modal').classList.add('hidden');
        document.getElementById('out-of-energy-modal').classList.add('hidden');
      } else {
        // Incorrect
        const toast = document.getElementById('feedback-toast');
        toast.textContent = 'Incorrect!';
        toast.style.backgroundColor = 'var(--accent-danger)';
        toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000);
      }
      document.getElementById('question-modal').classList.add('hidden');
      canvas.focus();
    };
    grid.appendChild(btn);
  });
  document.getElementById('question-modal').classList.remove('hidden');
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
