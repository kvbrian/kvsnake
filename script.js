const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const statusEl = document.querySelector("#status");

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
  render();
}

function gameOver() {
  state.running = false;
  state.gameOver = true;
  window.clearInterval(state.timerId);
  state.timerId = null;
  setStatus("Game Over");
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

render();
