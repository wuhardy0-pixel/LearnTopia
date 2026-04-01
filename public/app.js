const socket = io();

// --- STATE ---
let myRole = null; // 'host' or 'player'
let myCode = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let hostPlayers = {}; // Used by host to track players and scores

// --- DOM ELEMENTS ---
const views = {
  landing: document.getElementById('landing-view'),
  hostLobby: document.getElementById('host-lobby-view'),
  playerLobby: document.getElementById('player-lobby-view'),
  playerGame: document.getElementById('player-game-view'),
  hostGame: document.getElementById('host-game-view')
};

// Landing
const btnShowJoin = document.getElementById('btn-show-join');
const btnHostGame = document.getElementById('btn-host-game');
const joinFormContainer = document.getElementById('join-form-container');
const btnSubmitJoin = document.getElementById('btn-submit-join');
const inputJoinName = document.getElementById('join-name');
const inputJoinCode = document.getElementById('join-code');
const errorMsg = document.getElementById('error-message');

// Host Lobby
const displayGameCode = document.getElementById('display-game-code');
const hostPlayerList = document.getElementById('host-player-list');
const playerCountHtml = document.getElementById('player-count');
const btnStartGame = document.getElementById('btn-start-game');

// Player Lobby
const lobbyNickname = document.getElementById('lobby-nickname');

// Player Game
const playerScoreDisplay = document.getElementById('player-score');
const playerMultiplierDisplay = document.getElementById('player-multiplier');
const questionText = document.getElementById('question-text');
const optionsGrid = document.getElementById('options-grid');
const feedbackToast = document.getElementById('feedback-toast');

// Shop
const btnOpenShop = document.getElementById('btn-open-shop');
const btnCloseShop = document.getElementById('btn-close-shop');
const shopOverlay = document.getElementById('shop-overlay');
const btnBuyUpgrade = document.getElementById('btn-buy-upgrade');
const upgradeCostDisplay = document.getElementById('upgrade-cost');

// Host Game (Leaderboard)
const hostLeaderboard = document.getElementById('host-leaderboard');

// --- HELPER FUNCTIONS ---
function showView(viewName) {
  Object.values(views).forEach(v => v.classList.remove('active-view'));
  views[viewName].classList.add('active-view');
}
function showError(msg) {
  errorMsg.textContent = msg;
  setTimeout(() => errorMsg.textContent = '', 4000);
}
function showToast(msg, isSuccess) {
  feedbackToast.textContent = msg;
  feedbackToast.style.backgroundColor = isSuccess ? 'var(--accent-success)' : 'var(--accent-danger)';
  feedbackToast.classList.add('show');
  setTimeout(() => feedbackToast.classList.remove('show'), 2000);
}
// Render questions format: hardcoded for MVP since server sends results, but client needs options.
// Wait, client needs the question text. The server should send questions down. 
// Actually, let's hardcode the identical array here for MVP, or just fetch it. 
// For simplicity in MVP, the array is mirrored here.
const SAMPLE_QUESTIONS = [
  { id: 1, question: "What is 2 + 2?", options: ["3", "4", "5", "6"] },
  { id: 2, question: "Capital of France?", options: ["Berlin", "London", "Paris", "Rome"] },
  { id: 3, question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"] },
  { id: 4, question: "What is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"] },
  { id: 5, question: "How many continents are there?", options: ["5", "6", "7", "8"] }
];

function renderNextQuestion() {
  // Loop questions endlessly for continuous play
  currentQuestionIndex = (currentQuestionIndex + 1) % SAMPLE_QUESTIONS.length;
  const q = SAMPLE_QUESTIONS[currentQuestionIndex];
  
  questionText.textContent = q.question;
  optionsGrid.innerHTML = '';
  
  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => {
      // Send answer to server
      socket.emit('answerQuestion', { code: myCode, questionId: q.id, selectedIndex: index });
    };
    optionsGrid.appendChild(btn);
  });
}

function updateHostLeaderboard() {
  // Sort players by score descending
  const sortedPlayers = Object.values(hostPlayers).sort((a, b) => b.score - a.score);
  
  // Update Lobby
  hostPlayerList.innerHTML = '';
  sortedPlayers.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.name} <small>(x${p.multiplier})</small></span> <span class="score">${Math.floor(p.score)} 💎</span>`;
    hostPlayerList.appendChild(li);
  });
  playerCountHtml.textContent = sortedPlayers.length;

  // Update Game Leaderboard
  hostLeaderboard.innerHTML = '';
  sortedPlayers.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.name}</span> <span class="score">${Math.floor(p.score)} 💎 (x${p.multiplier})</span>`;
    hostLeaderboard.appendChild(li);
  });
}


// --- DOM LISTENERS ---

btnShowJoin.addEventListener('click', () => {
  joinFormContainer.classList.remove('hidden');
});

btnHostGame.addEventListener('click', () => {
  socket.emit('createGame');
});

btnSubmitJoin.addEventListener('click', () => {
  const name = inputJoinName.value.trim();
  const code = inputJoinCode.value.trim().toUpperCase();
  if (!name || code.length !== 4) {
    showError("Please enter a valid nickname and 4-letter code.");
    return;
  }
  socket.emit('joinGame', { code, name });
});

btnStartGame.addEventListener('click', () => {
  if (myRole === 'host' && myCode) {
    socket.emit('startGame', myCode);
  }
});

btnOpenShop.addEventListener('click', () => {
  shopOverlay.classList.remove('hidden');
});
btnCloseShop.addEventListener('click', () => {
  shopOverlay.classList.add('hidden');
});
btnBuyUpgrade.addEventListener('click', () => {
  socket.emit('buyUpgrade', { code: myCode });
});

// --- SOCKET LISTENERS ---

// Host gets game created
socket.on('gameCreated', (data) => {
  myRole = 'host';
  myCode = data.code;
  displayGameCode.textContent = myCode;
  showView('hostLobby');
});

// Player successfully joined
socket.on('joinedGame', (data) => {
  myRole = 'player';
  myCode = data.code;
  lobbyNickname.textContent = data.name;
  showView('playerLobby');
});

// Host is notified of new player
socket.on('playerJoined', (player) => {
  hostPlayers[player.id] = player;
  updateHostLeaderboard();
  btnStartGame.disabled = false;
});

// Host is notified player left
socket.on('playerLeft', (playerId) => {
  delete hostPlayers[playerId];
  updateHostLeaderboard();
  if (Object.keys(hostPlayers).length === 0) {
    btnStartGame.disabled = true;
  }
});

// Error handling
socket.on('errorMsg', (msg) => {
  if (myRole === null) {
    showError(msg);
  } else {
    alert(msg);
    location.reload(); // reset on fatal errors
  }
});

// Game Started
socket.on('gameStarted', () => {
  if (myRole === 'host') {
    showView('hostGame');
  } else if (myRole === 'player') {
    showView('playerGame');
    renderNextQuestion();
  }
});

// Player answers question
socket.on('answerResult', (data) => {
  if (data.isCorrect) {
    showToast(`Correct! +${data.amountEarned} 💎`, true);
  } else {
    showToast(`Incorrect!`, false);
  }
  
  // Update UI score
  playerScoreDisplay.textContent = Math.floor(data.newScore);
  
  // Render next question
  renderNextQuestion();
});

// Upgrades
socket.on('upgradeResult', (data) => {
  if (data.success) {
    playerScoreDisplay.textContent = Math.floor(data.newScore);
    playerMultiplierDisplay.textContent = data.newMultiplier;
    upgradeCostDisplay.textContent = data.newMultiplier * 50; // update scale UI
    showToast('Upgrade Purchased!', true);
    shopOverlay.classList.add('hidden');
  } else {
    showToast(data.reason, false);
  }
});

// Host receives score updates
socket.on('playerScoreUpdate', (player) => {
  if (myRole === 'host') {
    hostPlayers[player.id] = player;
    updateHostLeaderboard();
  }
});
