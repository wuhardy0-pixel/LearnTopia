const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, 'public')));

// Persistent State
const users = {}; 
const games = {};
const socketMap = {}; 

// RPG WORLD CONSTANTS
const RPG_WIDTH = 3500; 
const RPG_HEIGHT = 1500;
const WATER_X = 1500;
const VIP_WATER_X = 2200;
const LEGEND_WATER_X = 2900;
const STATIONS = {
  question: { x: 300, y: 300, radius: 100 },
  sell: { x: 300, y: 1200, radius: 100 },
  shop: { x: 800, y: 800, radius: 100 },
  ticketBooth: { x: 800, y: 300, radius: 100 }
};

// DLD CONSTANTS
const DLD_WIDTH = 1200; 
const BIOME_HEIGHT = 8000; // Increased to 8000 for a massive climb
const BIOME_NAMES = ['Ground Phase (Grass)', 'The Mines (Stone)', 'Frostbite Summit (Ice)', 'The Skies (Clouds)', 'Outer Atmosphere (Space)', 'The Final Peak (Gold)'];
const PLATFORM_THICKNESS = 40;

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i=0; i<4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
function distance(p1, p2) { return Math.hypot(p1.x - p2.x, p1.y - p2.y); }

// Generate Platforms for Don't Look Down
function generatePlatforms() {
  const platforms = [];
  
  // Ground
  platforms.push({ x: 0, y: 0, w: DLD_WIDTH, h: 50, theme: 0 });

  // Generate heavily spaced vertical platforms
  let currentY = -250;
  let currentTheme = 0;

  while (currentY > - (BIOME_HEIGHT * 6)) {
    // Determine biome index to style the platform
    currentTheme = Math.max(0, Math.min(5, Math.floor(-currentY / BIOME_HEIGHT)));
    
    // Randomize shape to massively increase navigation challenge
    let shapes = ['normal', 'normal', 'normal', 'normal', 'step', 'pole', 'boat'];
    let shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    let maxGap = 200 + (currentTheme * 20); // Gap increases up to 300
    let w = 120 + Math.random() * (150 - currentTheme * 10); // Default Width
    let h = PLATFORM_THICKNESS; 
    
    // Scale distinct geometries
    if (shape === 'pole') { w = 30 + Math.random() * 20; h = 200; }
    else if (shape === 'step') { w = 50 + Math.random() * 20; h = 50; }
    else if (shape === 'boat') { w = 180 + Math.random() * 50; h = 60; }
    
    // Aggressively slant platforms to make landing highly unpredictable!
    let angle = 0;
    if (Math.random() > 0.4 && shape !== 'pole') {
      angle = (Math.random() - 0.5) * 0.6; // ~ -17 to +17 degrees tilt
    }

    let x = Math.random() * (DLD_WIDTH - w);
    platforms.push({ x, y: currentY, w, h, theme: currentTheme, shape, angle });
    
    currentY -= (120 + Math.random() * maxGap);
  }

  // The Peak platform!
  platforms.push({ x: DLD_WIDTH/2 - 200, y: -(BIOME_HEIGHT * 6), w: 400, h: 50, theme: 5 });
  
  return { platforms };
}

io.on('connection', (socket) => {
  // --- AUTHENTICATION ---
  socket.on('register', ({ username, password }) => {
    if (!username || !password) return socket.emit('authError', 'Invalid');
    if (users[username]) return socket.emit('authError', 'Exists');
    users[username] = {
      password, locked: false, 
      inventory: { coins: 0, bait: 5, fishes: [], vipTickets: 0, legendTickets: 0 },
      equipment: { rodLevel: 1, backpackLevel: 1 },
      cosmetics: { unlockedSkins: ['#ffffff'], unlockedTrails: ['none'], activeSkin: '#ffffff', activeTrail: 'none' }
    };
    socketMap[socket.id] = { username, code: null };
    socket.emit('authSuccess', { username, data: users[username] });
  });

  socket.on('login', ({ username, password }) => {
    const u = users[username];
    if (!u || u.password !== password) return socket.emit('authError', 'Invalid');
    socketMap[socket.id] = { username, code: null };
    socket.emit('authSuccess', { username, data: u });
  });

  socket.on('changeUsername', ({ newUsername }) => {
    const sMap = socketMap[socket.id];
    if (!sMap || !sMap.username) return;
    if (users[newUsername]) return socket.emit('toast', { msg: 'Taken!', success: false });
    
    users[newUsername] = users[sMap.username];
    delete users[sMap.username];
    sMap.username = newUsername;
    socket.emit('authSuccess', { username: newUsername, data: users[newUsername] });
    
    if (sMap.code && games[sMap.code] && games[sMap.code].players[socket.id]) {
      games[sMap.code].players[socket.id].name = newUsername;
    }
  });

  // --- LOBBY ACTIONS ---
  socket.on('createGame', () => {
    const sMap = socketMap[socket.id];
    if (!sMap || !sMap.username) return;
    
    let code; do { code = generateCode(); } while (games[code]);
    games[code] = { code, hostId: socket.id, state: 'lobby', mode: 'fishtopia', players: {} };
    sMap.code = code;
    
    games[code].players[socket.id] = {
      id: socket.id, name: sMap.username,
      x: 0, y: 0, inputs: { dx: 0, dy: 0, jump: false },
      vx: 0, vy: 0, jumpCount: 0, speed: 400,
      activeTicket: null, energy: 100, highestBiome: 0, highestY: 0
    };
    socket.join(code);
    socket.emit('gameCreated', { code });
  });

  socket.on('joinGame', (code) => {
    const sMap = socketMap[socket.id];
    if (!sMap || !sMap.username) return;

    code = code.toUpperCase();
    const game = games[code];
    if (!game || game.state !== 'lobby') return socket.emit('toast', { msg: 'Game not found', success:false});

    sMap.code = code;
    game.players[socket.id] = {
      id: socket.id, name: sMap.username, 
      x: 0, y: 0, inputs: { dx: 0, dy: 0, jump: false },
      vx: 0, vy: 0, jumpCount: 0, speed: 400,
      activeTicket: null, energy: 100, highestBiome: 0, highestY: 0
    };
    socket.join(code);
    socket.emit('joinedGame', { code });
    io.to(game.hostId).emit('playerJoined', { id: socket.id, name: sMap.username });
  });

  socket.on('startGame', (payload) => {
    const code = payload.code;
    const game = games[code];
    if (game && game.hostId === socket.id) {
      game.state = 'playing';
      game.mode = payload.mode; // 'fishtopia' or 'dontlookdown'
      game.options = {
        durationMin: payload.duration || 10,
        rewardVal: payload.rewardVal || (game.mode === 'fishtopia' ? 2 : 1000)
      };
      game.endTime = Date.now() + (game.options.durationMin * 60000);
      
      if (game.mode === 'dontlookdown') {
        const gen = generatePlatforms();
        game.platforms = gen.platforms;
      } else if (game.mode === 'onewayout') {
        game.map = {
          floors: [
            { x: -500, y: 0, w: 1000, h: 1000 },
            { x: -200, y: 1000, w: 400, h: 400 },
            { x: -800, y: 1400, w: 1600, h: 1000 },
            { x: 300, y: 2400, w: 400, h: 400 },
            { x: -500, y: 2800, w: 1500, h: 1200 }
          ],
          gates: [
            { id: 1, x: -200, y: 1100, w: 400, h: 80, reqCard: 'red', color: '#ef4444', isOpen: false },
            { id: 2, x: 300, y: 2500, w: 400, h: 80, reqCard: 'blue', color: '#3b82f6', isOpen: false }
          ],
          stations: [
            { id: 1, x: 0, y: 500, radius: 100, type: 'question', label: 'E: Hack Terminal' },
            { id: 2, x: 250, y: 800, radius: 80, type: 'vendor', item: 'red', cost: 500, label: 'E: Buy Red Card (500 E)' },
            { id: 3, x: -400, y: 1900, radius: 100, type: 'question', label: 'E: Hack Terminal' },
            { id: 4, x: -600, y: 2100, radius: 80, type: 'vendor', item: 'blue', cost: 1000, label: 'E: Buy Blue Card (1000 E)' }
          ],
          escapePod: { x: 250, y: 3600, radius: 200 }
        };
        game.monsters = [
          { id: 1, x: -200, y: 1500, rawX: -200, rawY: 1500, speed: 120 },
          { id: 2, x: 200, y: 1800, rawX: 200, rawY: 1800, speed: 120 },
          { id: 3, x: 0, y: 2200, rawX: 0, rawY: 2200, speed: 150 },
          { id: 4, x: -200, y: 3000, rawX: -200, rawY: 3000, speed: 180 },
          { id: 5, x: 500, y: 3300, rawX: 500, rawY: 3300, speed: 180 },
          { id: 6, x: 0, y: 3500, rawX: 0, rawY: 3500, speed: 200, super: true },
          { id: 7, x: 500, y: 3500, rawX: 500, rawY: 3500, speed: 200, super: true },
          { id: 8, x: 250, y: 3300, rawX: 250, rawY: 3300, speed: 250, super: true },
          { id: 9, x: 250, y: 3800, rawX: 250, rawY: 3800, speed: 250, super: true }
        ];
        game.projectiles = [];
      } else if (game.mode === 'coredefender') {
        game.map = {
          core: { x: 0, y: 0, hp: 1000, maxHp: 1000, radius: 100 },
          stations: [
            { id: 1, x: -200, y: -200, radius: 50, type: 'question', label: 'E: Hack Terminal' },
            { id: 2, x: 200, y: -200, radius: 50, type: 'question', label: 'E: Hack Terminal' },
            { id: 3, x: -200, y: 200, radius: 50, type: 'question', label: 'E: Hack Terminal' },
            { id: 4, x: 200, y: 200, radius: 50, type: 'question', label: 'E: Hack Terminal' }
          ],
          lastSpawn: Date.now(),
          spawnRate: 3000,
          startTime: Date.now()
        };
        game.monsters = [];
        game.projectiles = [];
      }

      Object.values(game.players).forEach(p => {
        if (game.mode === 'fishtopia') {
          p.x = 800 + Math.random() * 200;
          p.y = 800 + Math.random() * 200;
        } else if (game.mode === 'onewayout') {
          p.x = 0; p.y = 100; p.energy = 0; p.hp = 100; p.cards = []; p.highestY = 0; p.highestBiome = 0; p.kills = 0;
        } else if (game.mode === 'coredefender') {
          p.x = Math.random() * 200 - 100;
          p.y = Math.random() * 200 - 100;
          p.energy = 0; p.hp = 100; p.kills = 0; p.cards = [];
        } else {
          p.x = DLD_WIDTH / 2;
          p.y = -50; 
          p.energy = 5000; // Start with decent energy
          p.highestY = 0;
          p.highestBiome = 0;
        }
      });
      
      io.to(code).emit('gameStarted', { mode: game.mode, platforms: game.platforms, map: game.map, duration: game.options.durationMin, serverStartTime: Date.now() });
      
      // Auto-end Timer
      setTimeout(() => {
        if (games[code] && games[code].state === 'playing') {
          io.to(code).emit('toast', { msg: 'Time is up!', success: true });
          endGameProcedure(code, games[code]);
        }
      }, game.options.durationMin * 60 * 1000);
    }
  });

  socket.on('endGame', () => {
    const sMap = socketMap[socket.id];
    if (!sMap || !sMap.code) return;
    const game = games[sMap.code];
    if (game && game.hostId === socket.id && game.state === 'playing') {
      endGameProcedure(sMap.code, game);
    }
  });

  // --- IN-GAME ACTIONS ---
  socket.on('input', (inputs) => {
    const sMap = socketMap[socket.id];
    if (sMap && sMap.code && games[sMap.code] && games[sMap.code].state === 'playing') {
      const player = games[sMap.code].players[socket.id];
      if (player) player.inputs = inputs;
    }
  });

  socket.on('doJump', () => {
    const sMap = socketMap[socket.id];
    if (sMap && sMap.code && games[sMap.code] && games[sMap.code].state === 'playing') {
      const game = games[sMap.code];
      const p = game.players[socket.id];
      if (p && game.mode === 'dontlookdown') {
        if (p.energy > 0 && p.jumpCount < 2) {
          p.vy = -800; // Jump impulse
          p.jumpCount++;
          p.energy -= 200; // Jump costs 200 energy
        }
      }
    }
  });

  // Single interact route handles answering questions in DLD too
  socket.on('interact', (actionData) => {
    const sMap = socketMap[socket.id];
    if (!sMap || !sMap.code || !games[sMap.code]) return;
    const game = games[sMap.code];
    const player = game.players[socket.id];
    const user = users[sMap.username]; 
    if (!player || !user) return;

    if (actionData.type === 'answer') {
      let reward = game.options.rewardVal;
      if (game.mode === 'fishtopia') {
        user.inventory.bait += parseInt(reward);
        socket.emit('toast', { msg: `Correct! +${reward} Bait🪱`, success: true });
        socket.emit('authSuccess', { username: sMap.username, data: user });
      } else if (game.mode === 'dontlookdown' || game.mode === 'onewayout' || game.mode === 'coredefender') {
        player.energy += parseInt(reward);
        socket.emit('toast', { msg: `Correct! +${reward} Energy ⚡`, success: true });
      }
    }

    if (actionData.type === 'unlock' && game.mode === 'onewayout') {
      let gate = game.map.gates.find(g => g.id === actionData.gateId);
      if (gate && !gate.isOpen) {
        if (player.cards && player.cards.includes(gate.reqCard)) {
          gate.isOpen = true;
          io.to(sMap.code).emit('toast', { html: `<span style="color: ${gate.color}; font-weight:bold;">${gate.reqCard.toUpperCase()} Gate Unlocked!</span>`, customColor: '#0f172a' });
          io.to(sMap.code).emit('gateUnlocked', gate.id);
        } else {
          socket.emit('toast', { msg: `Need ${gate.reqCard.toUpperCase()} Card!`, success: false });
        }
      }
    }

    if (actionData.type === 'build_turret' && game.mode === 'coredefender') {
       if (player.energy >= 2000) {
          player.energy -= 2000;
          let newId = 'turret_' + Math.random().toString(36).substr(2, 9);
          game.map.stations.push({
             id: newId, x: player.x, y: player.y, radius: 40, type: 'turret', level: 1, cost: 1500, label: 'E: Upgrade Turret (1500 E)'
          });
          io.to(sMap.code).emit('toast', { msg: 'Turret Built! (-2000 E)', success: true });
       } else {
          socket.emit('toast', { msg: 'Need 2000 Energy to build a Turret!', success: false });
       }
    }

    if (actionData.type === 'buy' && (game.mode === 'onewayout' || game.mode === 'coredefender')) {
      let station = game.map.stations.find(s => s.id === actionData.stationId);
      if (station && station.type === 'vendor') {
        if (player.cards && player.cards.includes(station.item)) {
           socket.emit('toast', { msg: `You already own the ${station.item.toUpperCase()} Card!`, success: false });
        } else if (player.energy >= station.cost) {
           player.energy -= station.cost;
           if (!player.cards) player.cards = [];
           player.cards.push(station.item);
           socket.emit('toast', { html: `Bought <strong style="color:${station.item === 'red' ? '#ef4444' : '#3b82f6'};">${station.item.toUpperCase()} CARD</strong>!`, success: true });
        } else {
           socket.emit('toast', { msg: `Not enough Energy! Costs ${station.cost}`, success: false });
        }
      } else if (station && station.type === 'turret') {
         if (player.energy >= station.cost) {
            player.energy -= station.cost;
            station.level++;
            station.cost += 1500;
            station.label = `E: Upgrade Turret LVL ${station.level} (${station.cost} E)`;
            io.to(sMap.code).emit('toast', { msg: `Turret Upgraded to Lv ${station.level}!`, success: true });
         } else {
            socket.emit('toast', { msg: `Need ${station.cost} Energy!`, success: false });
         }
      }
    }

    if (actionData.type === 'shoot' && (game.mode === 'onewayout' || game.mode === 'coredefender')) {
      if (player.energy >= 10) {
        player.energy -= 10;
        const angle = Math.atan2(actionData.ty - player.y, actionData.tx - player.x);
        game.projectiles.push({
           x: player.x, y: player.y,
           vx: Math.cos(angle) * 700, vy: Math.sin(angle) * 700,
           ownerId: socket.id, damage: 50
        });
      } else {
        socket.emit('toast', { msg: 'Not enough energy to shoot! (Costs 10)', success: false });
      }
    }

    if (game.mode === 'fishtopia' && actionData.type === 'fish') {
      const maxFish = user.equipment.backpackLevel * 3;
      if (user.inventory.fishes.length >= maxFish) return socket.emit('toast', { msg: `Backpack full! Leave the water!`, success: false });
      
      const inWater = player.x > WATER_X - 50;
      const inVIP = player.x > VIP_WATER_X - 50;
      const inLegend = player.x > LEGEND_WATER_X - 50;

      if (!inWater) return socket.emit('toast', { msg: 'Get closer to water!', success: false });
      if (user.inventory.bait <= 0) return socket.emit('toast', { msg: 'Need Bait!', success: false });
      user.inventory.bait--;

      let luck = user.equipment.rodLevel; 
      if (inLegend) luck += 20; else if (inVIP) luck += 5;
      
      let roll = Math.random() * (100 + luck * 10);
      let fishType, sellPrice;
      
      if (roll > 300) { fishType = 'Diamond Leviathan'; sellPrice = 2000; }
      else if (roll > 200) { fishType = 'Emerald Ray'; sellPrice = 1000; }
      else if (roll > 130) { fishType = 'Golden Koi'; sellPrice = 500; }
      else if (roll > 105) { fishType = 'Starfish'; sellPrice = 100; }
      else if (roll > 80) { fishType = 'Swordfish'; sellPrice = 60; }
      else if (roll > 50) { fishType = 'Salmon'; sellPrice = 30; }
      else if (roll > 20) { fishType = 'Trout'; sellPrice = 15; }
      else { fishType = 'Minnow'; sellPrice = 5; }

      user.inventory.fishes.push({ type: fishType, price: sellPrice });
      socket.emit('toast', { msg: `Caught a ${fishType}!`, success: true });
      socket.emit('authSuccess', { username: sMap.username, data: user }); 
    }
    
    else if (game.mode === 'fishtopia' && actionData.type === 'sell') {
      if (user.inventory.fishes.length > 0) {
        let earned = user.inventory.fishes.reduce((sum, f) => sum + f.price, 0);
        user.inventory.coins += earned;
        user.inventory.fishes = [];
        socket.emit('toast', { msg: `Sold fish for ${earned} 🪙!`, success: true });
        socket.emit('authSuccess', { username: sMap.username, data: user });
      }
    }

    else if (game.mode === 'fishtopia' && actionData.type === 'buy') {
      const { category, value, price } = actionData;
      if (user.inventory.coins >= price) {
        if (category === 'vipTicket') { user.inventory.coins -= price; user.inventory.vipTickets++; }
        else if (category === 'legendTicket') { user.inventory.coins -= price; user.inventory.legendTickets++; }
        else if (category === 'rod') { user.inventory.coins -= price; user.equipment.rodLevel++; }
        else if (category === 'backpack') { user.inventory.coins -= price; user.equipment.backpackLevel++; }
        socket.emit('toast', { msg: 'Purchased!', success: true });
        socket.emit('authSuccess', { username: sMap.username, data: user });
      }
    }
  });

  socket.on('buyCosmetic', ({ category, value, price }) => {
    const sMap = socketMap[socket.id];
    if (!sMap || !sMap.username) return;
    const user = users[sMap.username];
    if (user && user.inventory.coins >= price) {
      if (category === 'skin' && !user.cosmetics.unlockedSkins.includes(value)) {
        user.inventory.coins -= price; user.cosmetics.unlockedSkins.push(value);
      } else if (category === 'trail' && !user.cosmetics.unlockedTrails.includes(value)) {
        user.inventory.coins -= price; user.cosmetics.unlockedTrails.push(value);
      } else if (category === 'pack') {
        const AVAILABLE_SKINS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#14b8a6', '#f43f5e', '#000000', '#ec4899', '#64748b'];
        const AVAILABLE_TRAILS = ['fire', 'ice', 'plasma', 'shadow', 'gold'];
        
        const lockedSkins = AVAILABLE_SKINS.filter(s => !user.cosmetics.unlockedSkins.includes(s));
        const lockedTrails = AVAILABLE_TRAILS.filter(t => !user.cosmetics.unlockedTrails.includes(t));
        
        const rewardPool = [];
        lockedSkins.forEach(s => rewardPool.push({ type: 'skin', val: s }));
        lockedTrails.forEach(t => rewardPool.push({ type: 'trail', val: t }));
        
        if (rewardPool.length === 0) {
          socket.emit('toast', { msg: 'You already own all cosmetics!', success: false });
          return;
        }
        
        const wonItem = rewardPool[Math.floor(Math.random() * rewardPool.length)];
        user.inventory.coins -= price;
        
        if (wonItem.type === 'skin') {
          user.cosmetics.unlockedSkins.push(wonItem.val);
          socket.emit('unboxing', { type: 'skin', val: wonItem.val });
        } else {
          user.cosmetics.unlockedTrails.push(wonItem.val);
          socket.emit('unboxing', { type: 'trail', val: wonItem.val });
        }
      }
      socket.emit('authSuccess', { username: sMap.username, data: user });
    } else {
      socket.emit('toast', { msg: 'Not enough coins!', success: false });
    }
  });

  socket.on('equipCosmetic', ({ itemType, value }) => {
    const sMap = socketMap[socket.id];
    if (!sMap || !sMap.username) return;
    const user = users[sMap.username];
    if (!user) return;
    if (itemType === 'skin' && user.cosmetics.unlockedSkins.includes(value)) user.cosmetics.activeSkin = value;
    else if (itemType === 'trail' && user.cosmetics.unlockedTrails.includes(value)) user.cosmetics.activeTrail = value;
    socket.emit('authSuccess', { username: sMap.username, data: user });
  });

  socket.on('disconnect', () => {
    const sMap = socketMap[socket.id];
    if (sMap && sMap.code && games[sMap.code]) {
      const code = sMap.code;
      const game = games[code];
      if (game.hostId === socket.id) {
        io.to(code).emit('errorMsg', 'Host disconnected.');
        delete games[code];
      } else if (game.players[socket.id]) {
        delete game.players[socket.id];
        io.to(game.hostId).emit('playerLeft', socket.id);
      }
    }
    delete socketMap[socket.id];
  });
});

function endGameProcedure(code, game) {
  game.state = 'finished';
  
  let leaderboard;
  if (game.mode === 'fishtopia') {
    leaderboard = Object.values(game.players).map(p => {
      let u = users[p.name];
      return { name: p.name, score: u ? u.inventory.coins : 0, scoreLabel: '🪙 Coins' };
    }).sort((a,b) => b.score - a.score);
  } else if (game.mode === 'onewayout' || game.mode === 'coredefender') {
    leaderboard = Object.values(game.players).map(p => {
      return { name: p.name, score: p.kills || 0, scoreLabel: '☠️ Kills' };
    }).sort((a,b) => b.score - a.score);
  } else {
    leaderboard = Object.values(game.players).map(p => {
      let feet = Math.max(0, Math.floor(-p.highestY / 10));
      return { name: p.name, score: feet, scoreLabel: 'm Climbed' };
    }).sort((a,b) => b.score - a.score);
  }

  const coinRewards = [200, 100, 50, 25, 25];
  leaderboard.forEach((p, i) => {
    let u = users[p.name];
    if (u) {
      let reward = coinRewards[i] || 10;
      u.inventory.coins += reward;
      p.coinsEarned = reward;
    }
  });

  io.to(code).emit('gameEnded', { leaderboard });
  delete games[code];
}

// PHYSICS HOOK (30 FPS)
setInterval(() => {
  const dt = 1 / 30;
  for (const code in games) {
    const game = games[code];
    if (game.state === 'playing') {
      if (game.endTime && Date.now() >= game.endTime) {
         endGameProcedure(code, game);
         continue;
      }
      
      const renderedPlayers = {};
      
      if (game.mode === 'onewayout') {
         const now = Date.now();
         if (game.monsters) {
           for (let m of game.monsters) {
             if (m.hp <= 0) {
               if (now > m.deadUntil) { m.hp = m.super ? 300 : 100; m.x = m.rawX; m.y = m.rawY; m.lastShot = now; }
               continue;
             }
             let closestP = null;
             let minDist = Infinity;
             Object.values(game.players).forEach(p => {
               const d = Math.hypot(p.x - m.x, p.y - m.y);
               if (d < minDist) { minDist = d; closestP = p; }
             });
             
             if (closestP && minDist < 800) {
               const angle = Math.atan2(closestP.y - m.y, closestP.x - m.x);
               m.x += Math.cos(angle) * m.speed * dt;
               m.y += Math.sin(angle) * m.speed * dt;
               
               if (!m.lastShot || now - m.lastShot > 2000) {
                  m.lastShot = now;
                  game.projectiles.push({ x: m.x, y: m.y, vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 400 });
               }
             }
           }
         }
      }
         
      if (game.projectiles && (game.mode === 'onewayout' || game.mode === 'coredefender')) {
           for (let i = game.projectiles.length - 1; i >= 0; i--) {
             let proj = game.projectiles[i];
             proj.x += proj.vx * dt;
             proj.y += proj.vy * dt;
             
             let hit = false;
             if (proj.ownerId) {
               // Friendly Fire: Check against Monsters
               for (let mIdx = 0; mIdx < game.monsters.length; mIdx++) {
                 let m = game.monsters[mIdx];
                 if (Math.hypot(proj.x - m.x, proj.y - m.y) < 35) {
                   m.hp = (m.hp || 100) - (proj.damage || 50);
                   if (m.hp <= 0) {
                      m.deadUntil = Date.now() + (m.super ? 10000 : 30000);
                      if (game.players[proj.ownerId]) {
                         game.players[proj.ownerId].energy += 1000;
                         game.players[proj.ownerId].kills = (game.players[proj.ownerId].kills || 0) + 1;
                         io.to(proj.ownerId).emit('toast', { msg: 'Monster Killed! +1000 Energy!', success: true });
                      }
                   }
                   hit = true;
                   break;
                 }
               }
             } else {
               // Enemy Fire: Check against Players
               for (let pId in game.players) {
                 let p = game.players[pId];
                 if (Math.hypot(proj.x - p.x, proj.y - p.y) < 30) {
                   p.hp = (p.hp || 100) - 20;
                   if (p.hp <= 0) {
                     p.hp = 100;
                     p.x = 0; p.y = 100; // Respawn at start
                     p.energy = Math.floor((p.energy || 0) / 2); // Lose half energy on death
                     io.to(pId).emit('toast', { msg: 'You flatlined! Sent back to Start!', success: false });
                   } else {
                     io.to(pId).emit('toast', { msg: 'Shot by Monster! -20 HP', success: false });
                   }
                   hit = true;
                   break;
                 }
               }
             }
             
             if (Math.abs(proj.x) > 10000 || Math.abs(proj.y) > 10000) hit = true;
             if (hit) game.projectiles.splice(i, 1);
           }
         }

      if (game.mode === 'coredefender' && game.state === 'playing') {
         let now = Date.now();
         if (now - game.map.lastSpawn > game.map.spawnRate && game.monsters.length < 100) {
            let angle = Math.random() * Math.PI * 2;
            let smX = Math.cos(angle) * 1900;
            let smY = Math.sin(angle) * 1900;
            let timeAlive = (now - game.map.startTime) / 1000; 
            game.map.spawnRate = Math.max(500, 3000 - timeAlive * 10); // scale speed
            game.monsters.push({
               id: Math.random(), x: smX, y: smY,
               hp: 100 + timeAlive * 2, speed: 100 + timeAlive * 0.5,
               super: Math.random() > 0.9, deadUntil: 0
            });
            game.map.lastSpawn = now;
         }

         for (let i = game.monsters.length - 1; i >= 0; i--) {
           let m = game.monsters[i];
           if (m.hp <= 0) { game.monsters.splice(i, 1); continue; }
           
           let spliced = false;
           for (let pId in game.players) {
              let p = game.players[pId];
              if (p.hp > 0 && Math.hypot(p.x - m.x, p.y - m.y) < 40) {
                 p.hp -= 20;
                 game.monsters.splice(i, 1); spliced = true;
                 if (p.hp <= 0) {
                    p.hp = 0; p.deadUntil = Date.now() + 30000;
                    io.to(pId).emit('toast', { msg: 'You Died! Reviving in 30s...', success: false });
                 }
                 break;
              }
           }
           if (spliced) continue;

           let coreDist = Math.hypot(m.x - game.map.core.x, m.y - game.map.core.y);
           if (coreDist < game.map.core.radius) {
              game.map.core.hp -= m.super ? 50 : 20;
              game.monsters.splice(i, 1);
              if (game.map.core.hp <= 0 && game.state === 'playing') {
                 game.map.core.hp = 0;
                 io.to(code).emit('toast', { msg: 'CORE DESTROYED!', success: false });
                 endGameProcedure(code, game);
              }
              continue;
           }
           let angle = Math.atan2(game.map.core.y - m.y, game.map.core.x - m.x);
           m.x += Math.cos(angle) * m.speed * dt;
           m.y += Math.sin(angle) * m.speed * dt;
         }

         for (let turret of game.map.stations) {
            if (turret.type === 'turret' && turret.level > 0) {
               if (!turret.lastShot || now - turret.lastShot > (1000 / turret.level)) {
                  let closestM = null; let minD = Infinity;
                  for (let m of game.monsters) {
                     let d = Math.hypot(m.x - turret.x, m.y - turret.y);
                     if (d < 800 && d < minD) { minD = d; closestM = m; }
                  }
                  if (closestM) {
                     turret.lastShot = now;
                     let angle = Math.atan2(closestM.y - turret.y, closestM.x - turret.x);
                     turret.angle = angle;
                     game.projectiles.push({
                        x: turret.x, y: turret.y,
                        vx: Math.cos(angle) * 1000, vy: Math.sin(angle) * 1000,
                        ownerId: 'turret',
                        damage: 50 * turret.level
                     });
                  }
               }
            }
         }
      }

      Object.values(game.players).forEach(p => {
        let sMap = socketMap[p.id];
        let user = sMap ? users[sMap.username] : null;
        if (!user) return;

        if (game.mode === 'fishtopia') {
          // Fishtopia Top-Down Logic
          let mag = Math.hypot(p.inputs.dx, p.inputs.dy);
          let nDx = mag > 0 ? p.inputs.dx / mag : 0;
          let nDy = mag > 0 ? p.inputs.dy / mag : 0;

          let newX = p.x + nDx * p.speed * dt;
          let newY = p.y + nDy * p.speed * dt;
          newX = Math.max(20, Math.min(newX, RPG_WIDTH - 20));
          newY = Math.max(20, Math.min(newY, RPG_HEIGHT - 20));

          // Ticket Barriers
          if (newX > VIP_WATER_X && p.x <= VIP_WATER_X) {
            if (p.activeTicket === 'vip' || p.activeTicket === 'legend') {} 
            else if (user.inventory.vipTickets > 0) { user.inventory.vipTickets--; p.activeTicket = 'vip'; io.to(p.id).emit('authSuccess', { username: sMap.username, data: user }); } 
            else { newX = VIP_WATER_X; io.to(p.id).emit('toast', { msg: 'Need a VIP Ticket to enter here!', success: false }); }
          }
          if (newX > LEGEND_WATER_X && p.x <= LEGEND_WATER_X) {
            if (p.activeTicket === 'legend') {} 
            else if (user.inventory.legendTickets > 0) { user.inventory.legendTickets--; p.activeTicket = 'legend'; io.to(p.id).emit('authSuccess', { username: sMap.username, data: user }); } 
            else { newX = LEGEND_WATER_X; io.to(p.id).emit('toast', { msg: 'Need a Legend Ticket to enter here!', success: false }); }
          }
          if (newX < VIP_WATER_X && p.activeTicket === 'vip') { p.activeTicket = null; io.to(p.id).emit('toast', { msg: 'Ticket expired.', success: false }); }
          if (newX < LEGEND_WATER_X && p.activeTicket === 'legend') { p.activeTicket = null; io.to(p.id).emit('toast', { msg: 'Ticket expired.', success: false }); }

          p.x = newX; p.y = newY;
        
        } else if (game.mode === 'onewayout') {
          // Top-Down Physics with Wall and Gate collisions
          let mag = Math.hypot(p.inputs.dx, p.inputs.dy);
          let nDx = mag > 0 ? p.inputs.dx / mag : 0;
          let nDy = mag > 0 ? p.inputs.dy / mag : 0;
          
          let newX = p.x + nDx * p.speed * dt;
          let newY = p.y + nDy * p.speed * dt;

          let valid = false;
          let radius = 25;
          
          // Check Floor Bounds
          for (let f of game.map.floors) {
            if (newX > f.x - 10 && newX < f.x + f.w + 10 && newY > f.y - 10 && newY < f.y + f.h + 10) {
              valid = true; break;
            }
          }
          if (!valid) { newX = p.x; newY = p.y; }

          // Check Gate Collisions
          for (let g of game.map.gates) {
            if (!g.isOpen) {
              if (newX + radius > g.x && newX - radius < g.x + g.w &&
                  newY + radius > g.y && newY - radius < g.y + g.h) {
                newX = p.x; newY = p.y;
              }
            }
          }
          
          p.x = newX; p.y = newY;

          // Check Victory Condition
          if (Math.hypot(p.x - game.map.escapePod.x, p.y - game.map.escapePod.y) < game.map.escapePod.radius) {
            if (!game.map.escapePod.triggered) {
               game.map.escapePod.triggered = true;
               game.map.escapePod.launchTime = Date.now() + 30000;
               let codeStr = sMap.code;
               io.to(codeStr).emit('toast', { html: `<span style="color: #ef4444; font-size: 1.5rem; font-weight: bold;">T-MINUS 30s!</span><br/>${p.name} activated the pod! Survive!`, customColor: '#0f172a' });
            }
          }
          
        } else if (game.mode === 'coredefender') {
          let mag = Math.hypot(p.inputs.dx, p.inputs.dy);
          let nDx = mag > 0 ? p.inputs.dx / mag : 0;
          let nDy = mag > 0 ? p.inputs.dy / mag : 0;
          
          if (p.hp <= 0) {
             nDx = 0; nDy = 0; p.energy = 0;
             if (Date.now() > p.deadUntil) {
                 p.hp = 100; p.x = 0; p.y = 0;
                 io.to(p.id).emit('toast', { msg: 'Revived!', success: true });
             }
          }

          let newX = p.x + nDx * p.speed * dt;
          let newY = p.y + nDy * p.speed * dt;
          
          // Core Collision Radius (solid)
          let coreDist = Math.hypot(newX - game.map.core.x, newY - game.map.core.y);
          if (coreDist < game.map.core.radius + 25) {
             let angle = Math.atan2(newY - game.map.core.y, newX - game.map.core.x);
             newX = game.map.core.x + Math.cos(angle) * (game.map.core.radius + 25);
             newY = game.map.core.y + Math.sin(angle) * (game.map.core.radius + 25);
          }

          // Confine to big empty arena 4000x4000
          p.x = Math.max(-2000, Math.min(newX, 2000));
          p.y = Math.max(-2000, Math.min(newY, 2000));

        } else if (game.mode === 'dontlookdown') {
          // Parkour 2D Physics Logic
          if (p.energy > 0) {
            p.vx = p.inputs.dx * p.speed;
            if (p.inputs.dx !== 0) p.energy -= 100 * dt; // Walking costs 100 energy per sec
          } else {
            p.vx = 0; // Lock horizontal movement if out of energy
          }

          // Gravity
          p.vy += 1200 * dt;
          p.vy = Math.min(p.vy, 1000); // Terminal velocity

          let newX = p.x + p.vx * dt;
          let newY = p.y + p.vy * dt;

          // Horizontal bounds
          newX = Math.max(20, Math.min(newX, DLD_WIDTH - 20));

          // Advanced Oriented/Sloped Collision & Bouncing
          const radius = 25; // Player radius
          for (let plat of game.platforms) {
            // Check horizontal domain
            if (newX + radius > plat.x && newX - radius < plat.x + plat.w) {
              
              // Calculate sloped Y surface at player's current X traversal
              let relX = newX - plat.x;
              let surfaceY = plat.y + (plat.angle ? Math.tan(plat.angle) * relX : 0);
              
              // Check vertical intersection with sloped surface
              if (newY + radius > surfaceY && newY - radius < surfaceY + plat.h) {
                
                // Top Collision (landing)
                if (p.vy > 0 && p.y + radius <= surfaceY + 25) {
                  newY = surfaceY - radius;
                  p.vy = 0;
                  p.jumpCount = 0;
                  
                  // Checkpoint Trigger (Must physically land on the Checkpoint platform)
                  if (plat.isCheckpoint) {
                    let cpBiome = Math.round(Math.abs(plat.y / BIOME_HEIGHT));
                    if (cpBiome > p.highestBiome && cpBiome <= 6) {
                      p.highestBiome = cpBiome;
                      io.to(code).emit('toast', { 
                        html: `<span style="color: #22c55e; font-weight: bold;">${p.name}</span> reached Summit ${cpBiome}!`, 
                        customColor: '#0f172a' 
                      });
                    }
                  }

                  // If steeply tilted, slide them down gravitationally
                  if (plat.angle) {
                    newX += Math.sin(plat.angle) * 180 * dt; 
                  }
                } 
                // Bottom Collision (hitting head)
                else if (p.vy < 0 && p.y - radius >= surfaceY + plat.h - 20) {
                  newY = surfaceY + plat.h + radius;
                  p.vy *= -0.5; // Bounce off the bottom!
                } 
                // Side Wall Collision (Player touches the sides)
                else {
                  if (p.x <= plat.x) { // Came from left
                    newX = plat.x - radius;
                    p.vx = -600; // Repel left hard!
                  } else if (p.x >= plat.x + plat.w) { // Came from right
                    newX = plat.x + plat.w + radius;
                    p.vx = 600; // Repel right hard!
                  }
                }
              }
            }
          }

          // Ground (Y=0) Fall Penalty & Respawn
          if (newY + radius >= 0) {
            
            // "Looked Down" - Major fall detected
            if (p.highestY < -1500 && p.energy > 0) {
              if (p.highestBiome > 0) {
                // Respawn at Checkpoint Platform
                io.to(code).emit('toast', { 
                  html: `<span style="color: #22c55e; font-weight: bold;">${p.name}</span> respawned at Summit ${p.highestBiome}!`, 
                  customColor: '#0f172a' 
                });
                newY = -(p.highestBiome * BIOME_HEIGHT) - 50;
                newX = DLD_WIDTH / 2;
                p.highestY = newY; 
              } else {
                // Brutal respawn at bottom
                io.to(code).emit('toast', { 
                  html: `<span style="color: #fbbf24; font-weight: bold;">${p.name}</span> has looked down!`, 
                  customColor: '#3a6675' 
                });
                newY = -radius;
                p.highestY = 0; 
                p.highestBiome = 0;
              }
            } else {
              newY = -radius; 
            }
            p.vy = 0;
            p.jumpCount = 0;
          }

          p.x = newX; 
          p.y = newY;

          // Biome and Elevation Tracking
          if (p.y < p.highestY) p.highestY = p.y;


          // Energy Drain over time (e.g. 1 energy per second)
          if (p.y < -100) p.energy -= 1.5 * dt;

        }

        renderedPlayers[p.id] = {
          id: p.id, x: p.x, y: p.y,
          name: p.name, skin: user.cosmetics.activeSkin, trail: user.cosmetics.activeTrail,
          energy: Math.floor(p.energy || 0), elevation: Math.max(0, Math.floor(-(p.y||0) / 10)),
          hp: p.hp !== undefined ? p.hp : 100, cards: p.cards || []
        };
      });

      if (game.mode === 'onewayout') {
         if (game.map.escapePod && game.map.escapePod.triggered && !game.map.escapePod.launched) {
            if (Date.now() >= game.map.escapePod.launchTime) {
               game.map.escapePod.launched = true;
               let safePlayers = [];
               for (let pId in game.players) {
                 let pl = game.players[pId];
                 if (Math.hypot(pl.x - game.map.escapePod.x, pl.y - game.map.escapePod.y) <= game.map.escapePod.radius) {
                    safePlayers.push({ name: pl.name, id: pId });
                 }
               }
               io.to(code).emit('escapeCutscene', { safePlayers });
               setTimeout(() => {
                  if (games[code] && games[code].state === 'playing') {
                     endGameProcedure(code, games[code]);
                  }
               }, 5000);
            }
         }
      }

      io.to(code).emit('gameState', { 
         players: renderedPlayers, 
         monsters: game.monsters, 
         projectiles: game.projectiles,
         podLaunchTime: (game.map && game.map.escapePod && game.map.escapePod.triggered && !game.map.escapePod.launched) ? game.map.escapePod.launchTime : null,
         coreHp: (game.map && game.map.core) ? game.map.core.hp : undefined,
         stations: game.mode === 'coredefender' ? game.map.stations : undefined
      });
    }
  }
}, 1000 / 30);

server.listen(PORT, () => { console.log(`RPG 2D Server running on port ${PORT}`); });
