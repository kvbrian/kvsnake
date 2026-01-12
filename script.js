const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const statusEl = document.querySelector("#status");
const overlayEl = document.querySelector("#overlay");
const gameOverView = document.querySelector("#game-over-view");
const leaderboardView = document.querySelector("#leaderboard-view");
const finalScoreEl = document.querySelector("#final-score");
const leaderboardList = document.querySelector("#leaderboard-list");
const scoreForm = document.querySelector("#score-form");
const playerNameInput = document.querySelector("#player-name");
const retryGameButton = document.querySelector("#retry-game");
const playAgainButton = document.querySelector("#play-again");
const closeOverlayButton = document.querySelector("#close-overlay");

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const leaderboardKey = "nokia-snake-leaderboard";

const state = {
  snake: [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food: { x: 13, y: 10 },
  score: 0,
  speed: 140,
  timerId: null,
  running: false,
  gameOver: false,
};

const sounds = {
  enabled: false,
};

function drawBoard() {
  ctx.fillStyle = "#0f1d1b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1a2c29";
  ctx.lineWidth = 1;

  for (let i = 0; i <= tileCount; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize, 0);
    ctx.lineTo(i * gridSize, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * gridSize);
    ctx.lineTo(canvas.width, i * gridSize);
    ctx.stroke();
  }
}

function drawSnake() {
  state.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#b3ffb3" : "#8af28a";
    ctx.fillRect(
      segment.x * gridSize + 2,
      segment.y * gridSize + 2,
      gridSize - 4,
      gridSize - 4
    );
  });
}

function drawFood() {
  ctx.fillStyle = "#f25f5c";
  ctx.beginPath();
  ctx.arc(
    state.food.x * gridSize + gridSize / 2,
    state.food.y * gridSize + gridSize / 2,
    gridSize / 2.6,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function placeFood() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (state.snake.some((segment) => segment.x === position.x && segment.y === position.y));

  state.food = position;
}

function updateScore() {
  scoreEl.textContent = `Score: ${state.score}`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function loadLeaderboard() {
  const raw = window.localStorage.getItem(leaderboardKey);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  window.localStorage.setItem(leaderboardKey, JSON.stringify(entries));
}

function renderLeaderboard(entries) {
  leaderboardList.innerHTML = "";
  const display = entries.slice(0, 10);
  if (display.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No scores yet.";
    leaderboardList.appendChild(empty);
    return;
  }

  display.forEach((entry, index) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const score = document.createElement("span");
    name.textContent = `${index + 1}. ${entry.name}`;
    score.textContent = entry.score;
    item.append(name, score);
    leaderboardList.appendChild(item);
  });
}

function showOverlay(section) {
  overlayEl.classList.add("is-visible");
  overlayEl.setAttribute("aria-hidden", "false");
  if (section === "leaderboard") {
    gameOverView.classList.add("is-hidden");
    leaderboardView.classList.remove("is-hidden");
  } else {
    leaderboardView.classList.add("is-hidden");
    gameOverView.classList.remove("is-hidden");
  }
}

function hideOverlay() {
  overlayEl.classList.remove("is-visible");
  overlayEl.setAttribute("aria-hidden", "true");
  gameOverView.classList.remove("is-hidden");
  leaderboardView.classList.add("is-hidden");
}

function tick() {
  if (!state.running) {
    return;
  }

  state.direction = state.nextDirection;
  const head = state.snake[0];
  const nextHead = {
    x: (head.x + state.direction.x + tileCount) % tileCount,
    y: (head.y + state.direction.y + tileCount) % tileCount,
  };

  if (state.snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)) {
    gameOver();
    return;
  }

  state.snake.unshift(nextHead);

  if (nextHead.x === state.food.x && nextHead.y === state.food.y) {
    state.score += 10;
    updateScore();
    placeFood();
  } else {
    state.snake.pop();
  }

  render();
}

function startGame() {
  if (state.gameOver) {
    resetGame();
  }
  if (state.running) {
    return;
  }

  state.running = true;
  setStatus("Running");
  state.timerId = window.setInterval(tick, state.speed);
}

function pauseGame() {
  if (!state.running) {
    return;
  }
  state.running = false;
  setStatus("Paused");
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function resetGame() {
  state.snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  state.direction = { x: 1, y: 0 };
  state.nextDirection = { x: 1, y: 0 };
  state.score = 0;
  state.gameOver = false;
  updateScore();
  placeFood();
  setStatus("Ready");
  hideOverlay();
  render();
}

function gameOver() {
  state.running = false;
  state.gameOver = true;
  window.clearInterval(state.timerId);
  state.timerId = null;
  setStatus("Game Over");
  finalScoreEl.textContent = `Score: ${state.score}`;
  showOverlay("game-over");
  playerNameInput.focus();
  render();
}

function render() {
  drawBoard();
  drawFood();
  drawSnake();
}

function handleDirectionChange(key) {
  if (!state.running && !state.gameOver) {
    startGame();
  }

  const directionMap = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  const newDirection = directionMap[key];
  if (!newDirection) {
    return;
  }

  const isOpposite =
    newDirection.x === -state.direction.x && newDirection.y === -state.direction.y;
  if (isOpposite) {
    return;
  }

  state.nextDirection = newDirection;
}

window.addEventListener("keydown", (event) => {
  if (overlayEl.classList.contains("is-visible")) {
    return;
  }
  if (event.code === "Space") {
    if (state.running) {
      pauseGame();
    } else {
      startGame();
    }
    return;
  }

  if (event.key === "r" || event.key === "R") {
    resetGame();
    return;
  }

  handleDirectionChange(event.key);
});

scoreForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = playerNameInput.value.trim().toUpperCase() || "PLAYER";
  const entries = loadLeaderboard();
  const nextEntries = [
    ...entries,
    { name, score: state.score, date: Date.now() },
  ].sort((a, b) => b.score - a.score);
  saveLeaderboard(nextEntries.slice(0, 10));
  renderLeaderboard(nextEntries);
  playerNameInput.value = "";
  showOverlay("leaderboard");
});

playAgainButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

retryGameButton.addEventListener("click", () => {
  resetGame();
});

closeOverlayButton.addEventListener("click", () => {
  hideOverlay();
});

renderLeaderboard(loadLeaderboard());
render();
