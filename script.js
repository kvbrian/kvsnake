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

const gameAreaEl = document.querySelector("#game-area");
const mobileControlsEl = document.querySelector("#mobile-controls");
const btnPause = document.querySelector("#btn-pause");
const btnReset = document.querySelector("#btn-reset");
const btnToggleControls = document.querySelector("#btn-toggle-controls");
const dpadEl = document.querySelector("#dpad");
const instructionsEl = document.querySelector("#instructions");

// Supabase 설정
const SUPABASE_URL = "https://ihnvvukdypxrczosizig.supabase.co";
const SUPABASE_KEY = "sb_publishable_XG_guME9wa3pyA6ChNGvNA_oXuTg7Q5";

const gridSize = 20;
const tileCount = canvas.width / gridSize;

const state = {
  snake: [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  directionQueue: [],
  food: { x: 13, y: 10 },
  score: 0,
  speed: 140,
  timerId: null,
  running: false,
  gameOver: false,
};

const mobileState = {
  controlMode: localStorage.getItem("kvsnake-control-mode") || "swipe",
  swipe: null,
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

// Supabase에서 리더보드 불러오기
async function loadLeaderboard() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/leaderboard?select=name,score&order=score.desc&limit=10`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to load leaderboard:", error);
    return [];
  }
}

// Supabase에 점수 저장하기
async function saveScore(name, score) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, score }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to save score:", error);
    return false;
  }
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

  if (state.directionQueue.length > 0) {
    state.nextDirection = state.directionQueue.shift();
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
  updatePauseButton();
}

function pauseGame() {
  if (!state.running) {
    return;
  }
  state.running = false;
  setStatus("Paused");
  window.clearInterval(state.timerId);
  state.timerId = null;
  updatePauseButton();
}

function resetGame() {
  state.snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  state.direction = { x: 1, y: 0 };
  state.nextDirection = { x: 1, y: 0 };
  state.directionQueue = [];
  state.score = 0;
  state.gameOver = false;
  updateScore();
  placeFood();
  setStatus("Ready");
  hideOverlay();
  updatePauseButton();
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
  updatePauseButton();
  render();
}

function render() {
  drawBoard();
  drawFood();
  drawSnake();
}

function handleDirectionChange(key, withHaptic = false) {
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

  const lastDirection = state.directionQueue.length > 0
    ? state.directionQueue[state.directionQueue.length - 1]
    : state.nextDirection;

  const isOpposite =
    newDirection.x === -lastDirection.x && newDirection.y === -lastDirection.y;
  if (isOpposite) {
    return;
  }

  const isSame =
    newDirection.x === lastDirection.x && newDirection.y === lastDirection.y;
  if (isSame) {
    return;
  }

  if (state.directionQueue.length < 2) {
    state.directionQueue.push(newDirection);
    if (withHaptic && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
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

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = playerNameInput.value.trim().toUpperCase() || "PLAYER";

  // Supabase에 점수 저장
  await saveScore(name, state.score);

  // 리더보드 새로 불러오기
  const entries = await loadLeaderboard();
  renderLeaderboard(entries);
  playerNameInput.value = "";
  showOverlay("leaderboard");
});

playAgainButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

retryGameButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

closeOverlayButton.addEventListener("click", () => {
  hideOverlay();
});

function updatePauseButton() {
  if (state.running) {
    btnPause.classList.remove("is-paused");
  } else {
    btnPause.classList.add("is-paused");
  }
}

function getSwipeThreshold() {
  const rect = gameAreaEl.getBoundingClientRect();
  return Math.max(14, 0.04 * Math.min(rect.width, rect.height));
}

function initMobileControls() {
  if (mobileState.controlMode === "dpad") {
    btnToggleControls.classList.add("is-dpad");
    dpadEl.classList.remove("is-hidden");
    dpadEl.classList.add("is-visible");
  }

  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    const hint = document.createElement("p");
    hint.className = "touch-hint";
    hint.id = "touch-hint";
    hint.textContent = mobileState.controlMode === "dpad"
      ? "Use D-pad to move • Tap buttons to control"
      : "Swipe to move • Tap buttons to control";
    instructionsEl.parentNode.insertBefore(hint, instructionsEl.nextSibling);
  }

  updatePauseButton();
}

function updateTouchHint() {
  const hint = document.querySelector("#touch-hint");
  if (hint) {
    hint.textContent = mobileState.controlMode === "dpad"
      ? "Use D-pad to move • Tap buttons to control"
      : "Swipe to move • Tap buttons to control";
  }
}

gameAreaEl.addEventListener("pointerdown", (e) => {
  if (overlayEl.classList.contains("is-visible")) return;
  if (mobileState.controlMode === "dpad") return;

  mobileState.swipe = {
    id: e.pointerId,
    x0: e.clientX,
    y0: e.clientY,
    locked: false,
    threshold: getSwipeThreshold(),
  };
  gameAreaEl.setPointerCapture?.(e.pointerId);
}, { passive: true });

gameAreaEl.addEventListener("pointermove", (e) => {
  const swipe = mobileState.swipe;
  if (!swipe || swipe.id !== e.pointerId || swipe.locked) return;
  if (overlayEl.classList.contains("is-visible")) return;

  const dx = e.clientX - swipe.x0;
  const dy = e.clientY - swipe.y0;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (Math.max(adx, ady) < swipe.threshold) return;

  if (adx > ady) {
    handleDirectionChange(dx > 0 ? "ArrowRight" : "ArrowLeft", true);
  } else {
    handleDirectionChange(dy > 0 ? "ArrowDown" : "ArrowUp", true);
  }

  swipe.locked = true;
}, { passive: true });

gameAreaEl.addEventListener("pointerup", (e) => {
  if (mobileState.swipe && mobileState.swipe.id === e.pointerId) {
    mobileState.swipe = null;
  }
}, { passive: true });

gameAreaEl.addEventListener("pointercancel", () => {
  mobileState.swipe = null;
}, { passive: true });

btnPause.addEventListener("click", () => {
  if (overlayEl.classList.contains("is-visible")) return;

  if (state.running) {
    pauseGame();
  } else {
    startGame();
  }
  updatePauseButton();
});

btnReset.addEventListener("click", () => {
  if (overlayEl.classList.contains("is-visible")) return;
  resetGame();
});

btnToggleControls.addEventListener("click", () => {
  if (mobileState.controlMode === "swipe") {
    mobileState.controlMode = "dpad";
    btnToggleControls.classList.add("is-dpad");
    dpadEl.classList.remove("is-hidden");
    dpadEl.classList.add("is-visible");
  } else {
    mobileState.controlMode = "swipe";
    btnToggleControls.classList.remove("is-dpad");
    dpadEl.classList.add("is-hidden");
    dpadEl.classList.remove("is-visible");
  }
  localStorage.setItem("kvsnake-control-mode", mobileState.controlMode);
  updateTouchHint();
});

dpadEl.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest(".dpad-btn");
  if (!btn) return;
  if (overlayEl.classList.contains("is-visible")) return;

  const direction = btn.dataset.direction;
  if (direction) {
    handleDirectionChange(direction, true);
  }
}, { passive: true });

loadLeaderboard().then(renderLeaderboard);
initMobileControls();
render();
