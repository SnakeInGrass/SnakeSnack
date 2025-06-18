// Constants
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const GRID_SIZE = 20; // pixels per cell
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

// Game state
let snake;
let direction;
let foodItems;
let gameLoopId;
let spawnIntervalId;
let gameOver = false;
let directionQueue = []; // queued direction changes (FIFO)

// Scoring & pacing
let score;
let startTime;
let timerIntervalId;
let currentFoodDuration;
let currentSpeedInterval;

// Utility helpers
function randomCell() {
  return {
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS),
  };
}

function cellsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

// Snake logic
function initSnake() {
  snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
  direction = { x: 1, y: 0 }; // moving right initially
  directionQueue = [];
}

function moveSnake() {
  const head = { ...snake[0] };
  head.x += direction.x;
  head.y += direction.y;
  snake.unshift(head);

  // Check if we ate food
  const foodIndex = foodItems.findIndex((f) => cellsEqual(f.pos, head));
  if (foodIndex !== -1) {
    foodItems.splice(foodIndex, 1);

    // Update score
    score += 1;
    document.getElementById("score").textContent = score;

    // Decrease food duration by 10%
    currentFoodDuration *= 0.9;

    // Increase speed by 10% (interval decreases)
    currentSpeedInterval *= 0.9;
    clearInterval(gameLoopId);
    gameLoopId = setInterval(gameStep, currentSpeedInterval);
  } else {
    // Remove tail if no food eaten
    snake.pop();
  }
}

function checkCollisions() {
  const head = snake[0];

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return true;
  }

  // Self collision
  for (let i = 1; i < snake.length; i++) {
    if (cellsEqual(head, snake[i])) {
      return true;
    }
  }

  return false;
}

// Food logic
function spawnFood() {
  const pos = randomCell();

  // Ensure not spawning on the snake
  if (snake.some((segment) => cellsEqual(segment, pos))) {
    return; // skip spawn this time
  }

  const food = { pos, timeoutId: null };

  // Remove food after currentFoodDuration ms
  food.timeoutId = setTimeout(() => {
    const idx = foodItems.indexOf(food);
    if (idx !== -1) {
      foodItems.splice(idx, 1);
    }
  }, currentFoodDuration);

  foodItems.push(food);
}

// Rendering
function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
}

function render() {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw food
  foodItems.forEach((f) => drawCell(f.pos.x, f.pos.y, "#e74c3c"));

  // Draw snake
  snake.forEach((segment, idx) => drawCell(segment.x, segment.y, idx === 0 ? "#2ecc71" : "#27ae60"));
}

// Main loop
function gameStep() {
  // Apply first queued direction (if any) once per frame
  if (directionQueue.length > 0) {
    direction = directionQueue.shift();
  }
  moveSnake();
  if (checkCollisions()) {
    endGame();
    return;
  }
  render();
}

function startGame() {
  initSnake();
  foodItems = [];
  gameOver = false;
  document.getElementById("gameOver").classList.add("hidden");

  // Reset scoreboard & timing
  score = 0;
  document.getElementById("score").textContent = score;
  startTime = Date.now();
  updateTimer();
  clearInterval(timerIntervalId);
  timerIntervalId = setInterval(updateTimer, 100);

  // Reset dynamic pacing
  currentFoodDuration = 10000; // 10 seconds
  currentSpeedInterval = 100; // ms (initial 10 fps)

  // Spawn food every second
  spawnIntervalId = setInterval(spawnFood, 1000);
  // Game loop at 10 fps → 100ms
  clearInterval(gameLoopId);
  gameLoopId = setInterval(gameStep, currentSpeedInterval);
}

function endGame() {
  clearInterval(gameLoopId);
  clearInterval(spawnIntervalId);
  foodItems.forEach((f) => clearTimeout(f.timeoutId));
  clearInterval(timerIntervalId);
  gameOver = true;
  document.getElementById("gameOver").classList.remove("hidden");
}

// Input handling
window.addEventListener("keydown", (e) => {
  if (gameOver) return;
  let proposed;
  switch (e.key) {
    case "ArrowUp":
      proposed = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      proposed = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      proposed = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      proposed = { x: 1, y: 0 };
      break;
  }

  // Determine the direction to compare against (current or last queued)
  const lastDir = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1] : direction;

  // Queue direction if it's not a reversal relative to the last motion
  if (proposed && !isOpposite(proposed, lastDir)) {
    directionQueue.push(proposed);
  }
});

// Restart button
document.getElementById("restartButton").addEventListener("click", startGame);

// Initialize game
startGame();

// Check if two directions are opposites (would cause immediate reversal)
function isOpposite(d1, d2) {
  return d1 && d2 && d1.x === -d2.x && d1.y === -d2.y;
}

// Update HUD timer
function updateTimer() {
  const elapsed = (Date.now() - startTime) / 1000;
  document.getElementById("timer").textContent = elapsed.toFixed(1);
} 