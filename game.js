const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const playerScoreElement = document.getElementById("player-score");
const computerScoreElement = document.getElementById("computer-score");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const winnerText = document.getElementById("winner-text");
const startButton = document.getElementById("start-button");
const playAgainButton = document.getElementById("play-again-button");

const WINNING_SCORE = 5;

const paddle = {
  width: 14,
  height: 110,
  speed: 420
};

const ballSettings = {
  radius: 10,
  speed: 340,
  speedIncrease: 18
};

const game = {
  running: false,
  lastTime: 0,
  effects: [],
  tauntTimer: 0,
  touchActive: false,
  keys: {
    arrowup: false,
    arrowdown: false
  },
  playerScore: 0,
  computerScore: 0,
  player: {
    x: 30,
    y: canvas.height / 2 - paddle.height / 2,
    width: paddle.width,
    height: paddle.height,
    speed: paddle.speed,
    flashTimer: 0
  },
  computer: {
    x: canvas.width - 30 - paddle.width,
    y: canvas.height / 2 - paddle.height / 2,
    width: paddle.width,
    height: paddle.height,
    speed: paddle.speed * 1.3,
    flashTimer: 0
  },
  ball: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: ballSettings.radius,
    speed: ballSettings.speed,
    velocityX: ballSettings.speed,
    velocityY: ballSettings.speed * 0.55
  }
};

function resetBall(direction) {
  game.ball.x = canvas.width / 2;
  game.ball.y = canvas.height / 2;
  game.ball.speed = ballSettings.speed;

  // The ball always starts toward the player who just lost the point.
  game.ball.velocityX = ballSettings.speed * direction;

  // Give the ball a slightly random vertical movement each round.
  const verticalDirection = Math.random() > 0.5 ? 1 : -1;
  const randomAmount = 0.35 + Math.random() * 0.35;
  game.ball.velocityY = ballSettings.speed * randomAmount * verticalDirection;
}

function resetPaddles() {
  game.player.y = canvas.height / 2 - game.player.height / 2;
  game.computer.y = canvas.height / 2 - game.computer.height / 2;
}

function resetGame() {
  game.playerScore = 0;
  game.computerScore = 0;
  game.effects = [];
  game.tauntTimer = 0;
  game.touchActive = false;
  game.player.flashTimer = 0;
  game.computer.flashTimer = 0;
  updateScore();
  resetPaddles();
  resetBall(Math.random() > 0.5 ? 1 : -1);
}

function updateScore() {
  playerScoreElement.textContent = game.playerScore;
  computerScoreElement.textContent = game.computerScore;
}

function addBallTrail() {
  const speedRatio = game.ball.speed / ballSettings.speed;
  const particleCount = 3;

  for (let index = 0; index < particleCount; index += 1) {
    const spacing = index / particleCount;
    const offsetX = -game.ball.velocityX * 0.02 * (spacing + 0.4);
    const offsetY = -game.ball.velocityY * 0.02 * (spacing + 0.4);
    const startX = game.ball.x + offsetX;
    const startY = game.ball.y + offsetY;
    const points = [{ x: startX, y: startY }];

    for (let step = 1; step <= 4; step += 1) {
      const progress = step / 4;
      points.push({
        x: startX + offsetX * progress + (Math.random() - 0.5) * (16 + index * 4),
        y: startY + offsetY * progress + (Math.random() - 0.5) * (12 + index * 3)
      });
    }

    game.effects.push({
      type: "lightningTrail",
      x: startX,
      y: startY,
      points,
      radius: game.ball.radius * (1 - spacing * 0.12),
      life: 0.42 + speedRatio * 0.1,
      maxLife: 0.42 + speedRatio * 0.1
    });
  }
}

function triggerPaddleFlash(paddleObject) {
  paddleObject.flashTimer = 0.28;

  const boltCount = 5;

  for (let index = 0; index < boltCount; index += 1) {
    const points = [];
    const startX = paddleObject.x + paddleObject.width / 2;
    const startY = paddleObject.y + 6 + index * (paddleObject.height / 5);

    points.push({ x: startX, y: startY });

    for (let step = 1; step <= 7; step += 1) {
      points.push({
        x: startX + (Math.random() - 0.5) * 48,
        y: startY + step * 14
      });
    }

    game.effects.push({
      type: "lightning",
      points,
      life: 0.22,
      maxLife: 0.22
    });

    // Add a shorter side branch to make the strike feel more chaotic.
    game.effects.push({
      type: "lightning",
      points: points.slice(0, 4).map((point, branchIndex) => ({
        x: point.x + 18 + branchIndex * 3,
        y: point.y + branchIndex * 5
      })),
      life: 0.16,
      maxLife: 0.16
    });
  }
}

function updateEffects(deltaTime) {
  game.player.flashTimer = Math.max(0, game.player.flashTimer - deltaTime);
  game.computer.flashTimer = Math.max(0, game.computer.flashTimer - deltaTime);
  game.tauntTimer = Math.max(0, game.tauntTimer - deltaTime);

  for (const effect of game.effects) {
    effect.life -= deltaTime;
  }

  game.effects = game.effects.filter((effect) => effect.life > 0);
}

function clampPaddle(paddleObject) {
  if (paddleObject.y < 0) {
    paddleObject.y = 0;
  }

  if (paddleObject.y + paddleObject.height > canvas.height) {
    paddleObject.y = canvas.height - paddleObject.height;
  }
}

function updatePlayer(deltaTime) {
  if (game.touchActive) {
    clampPaddle(game.player);
    return;
  }

  if (game.keys.arrowup) {
    game.player.y -= game.player.speed * deltaTime;
  }

  if (game.keys.arrowdown) {
    game.player.y += game.player.speed * deltaTime;
  }

  clampPaddle(game.player);
}

function updateComputer(deltaTime) {
  const computerCenter = game.computer.y + game.computer.height / 2;
  const timeUntilBallArrives = (game.computer.x - game.ball.x) / Math.max(1, game.ball.velocityX);
  let targetY = game.ball.y + game.ball.velocityY * Math.max(0, timeUntilBallArrives);

  while (targetY < 0 || targetY > canvas.height) {
    if (targetY < 0) {
      targetY = -targetY;
    } else if (targetY > canvas.height) {
      targetY = canvas.height * 2 - targetY;
    }
  }

  const distanceToBall = targetY - computerCenter;
  const maxMove = game.computer.speed * deltaTime;
  game.computer.y += Math.max(-maxMove, Math.min(maxMove, distanceToBall));

  clampPaddle(game.computer);
}

function bounceOffPaddle(paddleObject, isPlayerPaddle) {
  const paddleCenter = paddleObject.y + paddleObject.height / 2;
  const distanceFromCenter = game.ball.y - paddleCenter;
  const normalizedDistance = distanceFromCenter / (paddleObject.height / 2);

  game.ball.speed += ballSettings.speedIncrease;
  game.ball.velocityX = game.ball.speed * (isPlayerPaddle ? 1 : -1);
  game.ball.velocityY = normalizedDistance * game.ball.speed;

  // Push the ball away from the paddle so it does not get stuck inside it.
  if (isPlayerPaddle) {
    game.ball.x = paddleObject.x + paddleObject.width + game.ball.radius;
  } else {
    game.ball.x = paddleObject.x - game.ball.radius;
  }

  triggerPaddleFlash(paddleObject);
}

function checkPaddleCollision(paddleObject) {
  return (
    game.ball.x - game.ball.radius < paddleObject.x + paddleObject.width &&
    game.ball.x + game.ball.radius > paddleObject.x &&
    game.ball.y - game.ball.radius < paddleObject.y + paddleObject.height &&
    game.ball.y + game.ball.radius > paddleObject.y
  );
}

function scorePoint(scoredByPlayer) {
  if (scoredByPlayer) {
    game.playerScore += 1;
    resetBall(-1);
  } else {
    game.computerScore += 1;
    game.tauntTimer = 2;
    resetBall(1);
  }

  updateScore();
  checkForWinner();
}

function checkForWinner() {
  if (game.playerScore >= WINNING_SCORE || game.computerScore >= WINNING_SCORE) {
    game.running = false;
    winnerText.textContent =
      game.playerScore > game.computerScore ? "You win!" : "Computer wins!";
    gameOverScreen.classList.remove("hidden");
  }
}

function updateBall(deltaTime) {
  game.ball.x += game.ball.velocityX * deltaTime;
  game.ball.y += game.ball.velocityY * deltaTime;
  addBallTrail();

  if (game.ball.y - game.ball.radius <= 0) {
    game.ball.y = game.ball.radius;
    game.ball.velocityY *= -1;
  }

  if (game.ball.y + game.ball.radius >= canvas.height) {
    game.ball.y = canvas.height - game.ball.radius;
    game.ball.velocityY *= -1;
  }

  if (checkPaddleCollision(game.player) && game.ball.velocityX < 0) {
    bounceOffPaddle(game.player, true);
  }

  if (checkPaddleCollision(game.computer) && game.ball.velocityX > 0) {
    bounceOffPaddle(game.computer, false);
  }

  if (game.ball.x + game.ball.radius < 0) {
    scorePoint(false);
  }

  if (game.ball.x - game.ball.radius > canvas.width) {
    scorePoint(true);
  }
}

function drawBackground() {
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(229, 231, 235, 0.35)";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(paddleObject) {
  const pixel = 6;
  const handleWidth = pixel;
  const headWidth = paddleObject.width;
  const headHeight = paddleObject.height * 0.72;
  const headY = paddleObject.y;
  const handleHeight = paddleObject.height - headHeight;
  const handleY = headY + headHeight;
  const handleX = paddleObject.x + (headWidth - handleWidth) / 2;
  const isFlashing = paddleObject.flashTimer > 0;

  // Draw a chunky racket head so the paddles feel like retro pixel art.
  ctx.fillStyle = isFlashing ? "#fde68a" : "#f8fafc";
  ctx.fillRect(paddleObject.x, headY, headWidth, headHeight);

  // Add a simple inner face to hint at racket strings.
  ctx.fillStyle = isFlashing ? "#fef3c7" : "#cbd5e1";
  ctx.fillRect(paddleObject.x + pixel / 2, headY + pixel, headWidth - pixel, headHeight - pixel * 2);

  ctx.fillStyle = isFlashing ? "#fde68a" : "#f8fafc";
  ctx.fillRect(handleX, handleY, handleWidth, handleHeight);

  // Small grip detail at the bottom.
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(handleX - pixel / 2, handleY + handleHeight - pixel * 1.5, handleWidth + pixel, pixel * 1.5);
}

function drawBall() {
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEffects() {
  for (const effect of game.effects) {
    const opacity = effect.life / effect.maxLife;

    if (effect.type === "lightningTrail") {
      ctx.strokeStyle = `rgba(147, 197, 253, ${opacity * 0.35})`;
      ctx.lineWidth = effect.radius * 1.6;
      ctx.beginPath();
      ctx.moveTo(effect.points[0].x, effect.points[0].y);

      for (let index = 1; index < effect.points.length; index += 1) {
        ctx.lineTo(effect.points[index].x, effect.points[index].y);
      }

      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = Math.max(1.2, effect.radius * 0.45);
      ctx.stroke();
    }

    if (effect.type === "lightning") {
      ctx.strokeStyle = `rgba(255, 244, 170, ${opacity * 0.45})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(effect.points[0].x, effect.points[0].y);

      for (let index = 1; index < effect.points.length; index += 1) {
        ctx.lineTo(effect.points[index].x, effect.points[index].y);
      }

      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
}

function drawTauntMessage() {
  if (game.tauntTimer <= 0) {
    return;
  }

  // Blink the message to make the taunt feel arcade-like.
  const shouldShowText = Math.floor(game.tauntTimer * 10) % 2 === 0;

  if (!shouldShowText) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(127, 29, 29, 0.32)";
  ctx.fillRect(120, canvas.height / 2 - 54, canvas.width - 240, 108);
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 3;
  ctx.strokeRect(120, canvas.height / 2 - 54, canvas.width - 240, 108);
  ctx.fillStyle = "#fef2f2";
  ctx.font = 'bold 30px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("You Suck, Join CrossFit", canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

function movePlayerToTouch(clientY) {
  const canvasRect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / canvasRect.height;
  const touchY = (clientY - canvasRect.top) * scaleY;

  game.player.y = touchY - game.player.height / 2;
  clampPaddle(game.player);
}

canvas.addEventListener("pointerdown", (event) => {
  const canvasRect = canvas.getBoundingClientRect();
  const localX = event.clientX - canvasRect.left;

  if (localX <= canvasRect.width * 0.6) {
    game.touchActive = true;
    movePlayerToTouch(event.clientY);
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!game.touchActive) {
    return;
  }

  movePlayerToTouch(event.clientY);
});

canvas.addEventListener("pointerup", () => {
  game.touchActive = false;
});

canvas.addEventListener("pointercancel", () => {
  game.touchActive = false;
});

function draw() {
  drawBackground();
  drawEffects();
  drawPaddle(game.player);
  drawPaddle(game.computer);
  drawBall();
  drawTauntMessage();
}

function gameLoop(timestamp) {
  if (!game.running) {
    return;
  }

  const deltaTime = Math.min((timestamp - game.lastTime) / 1000, 0.02);
  game.lastTime = timestamp;

  updatePlayer(deltaTime);
  updateComputer(deltaTime);
  updateBall(deltaTime);
  updateEffects(deltaTime);
  draw();

  requestAnimationFrame(gameLoop);
}

function startGame() {
  resetGame();
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  game.running = true;
  game.lastTime = performance.now();
  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "arrowup" || key === "arrowdown") {
    game.keys[key] = true;
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key === "arrowup" || key === "arrowdown") {
    game.keys[key] = false;
  }
});

startButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);

// Draw the board once so the player sees the game area before starting.
draw();
