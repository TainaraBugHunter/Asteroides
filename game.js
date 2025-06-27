const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let shipImg = new Image();
shipImg.src = 'assets/ship.png';

let asteroidImg = new Image();
asteroidImg.src = 'assets/asteroid.png';

let lifeImg = new Image();
lifeImg.src = 'assets/ship.png';

const shootSound = new Audio('assets/shoot.mp3');
const explosionSound = new Audio('assets/explosion.wav');

let bgMusic = new Audio('assets/bgMusic.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

let ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: 0,
    speed: 0,
    acceleration: 0.05,
    maxSpeed: 3
};

let bullets = [], asteroids = [], explosions = [];
let score = 0, highScore = localStorage.getItem('highScore') || 0;
let lives = 3, level = 1;
let gameStarted = false, gameOver = false, invulnerable = false;
let fadeOpacity = 1, asteroidCount = 5, lastShotTime = 0;
const shotInterval = 150;
let levelMessage = '', levelMessageTimer = 0;

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

function createAsteroid() {
  const baseSpeed = 1;
  const speedIncrement = 0.05 * (level - 1);
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 20 + Math.random() * 30,
    angle: Math.random() * Math.PI * 2,
    speed: baseSpeed + speedIncrement + Math.random() * 1.5
  };
}

function createExplosion(x, y) {
  return { x, y, radius: 0, maxRadius: 30, expansionRate: 2 };
}

function resetGame() {
  ship.x = canvas.width / 2;
  ship.y = canvas.height / 2;
  ship.angle = 0;
  ship.speed = 0;
  bullets = [];
  asteroids = [];
  explosions = [];
  score = 0;
  lives = 3;
  level = 1;
  asteroidCount = 5;
  gameStarted = false;
  gameOver = false;
  invulnerable = false;
  fadeOpacity = 1;

  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';

  for (let i = 0; i < asteroidCount; i++) asteroids.push(createAsteroid());

  bgMusic.playbackRate = 1;
  bgMusic.play();
}

function nextLevel() {
  level++;
  asteroidCount = Math.ceil(asteroidCount + 1);
  for (let i = 0; i < asteroidCount; i++) asteroids.push(createAsteroid());

  levelMessage = `Fase ${level}`;
  levelMessageTimer = 120;

  bgMusic.playbackRate = Math.min(1 + (level - 1) * 0.1, 2);
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle + Math.PI / 2);
  if (!invulnerable || Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.drawImage(shipImg, -30, -30, 60, 60);
  }
  ctx.restore();
}

function drawAsteroids() {
  asteroids.forEach(ast => {
    ctx.save();
    ctx.translate(ast.x, ast.y);
    ctx.drawImage(asteroidImg, -ast.radius, -ast.radius, ast.radius * 2, ast.radius * 2);
    ctx.restore();
  });
}

function drawBullets() {
  bullets.forEach(bullet => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  });
}

function drawExplosions() {
  explosions.forEach(explosion => {
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'orange';
    ctx.stroke();
  });
}

function drawLives() {
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(lifeImg, 20 + i * 25, 20, 50, 50); // Aumentado para 50x50 e espaçamento ajustado
  }
}

function drawScoreBoard() {
  ctx.save();
  ctx.fillStyle = '#00ffff';
  ctx.font = 'bold 20px Asteroides, sans-serif';
  ctx.textAlign = 'right';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  ctx.fillText(`Score: ${score}`, canvas.width - 20, 30);
  ctx.fillText(`Recorde: ${highScore}`, canvas.width - 20, 60);
  ctx.restore();
}

function drawLevelMessage() {
  if (levelMessageTimer > 0) {
    const opacity = levelMessageTimer / 120;
    ctx.save();
    ctx.globalAlpha = opacity;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#00ffcc');
    gradient.addColorStop(1, '#ff00cc');
    ctx.fillStyle = gradient;
    ctx.font = 'bold 64px Asteroides, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(levelMessage, canvas.width / 2, canvas.height / 2);
    ctx.restore();
    levelMessageTimer--;
  }
}

function updateShip() {
  if (keys.ArrowLeft) ship.angle -= 0.05;
  if (keys.ArrowRight) ship.angle += 0.05;
  if (keys.ArrowUp) ship.speed += ship.acceleration;
  if (keys.ArrowDown) ship.speed -= ship.acceleration * 0.6;

  ship.speed = Math.max(-ship.maxSpeed, Math.min(ship.speed, ship.maxSpeed));
  ship.x += ship.speed * Math.cos(ship.angle);
  ship.y += ship.speed * Math.sin(ship.angle);
  ship.speed *= 0.98;

  if (ship.x < 0) ship.x = canvas.width;
  if (ship.x > canvas.width) ship.x = 0;
  if (ship.y < 0) ship.y = canvas.height;
  if (ship.y > canvas.height) ship.y = 0;
}

function updateAsteroids() {
  asteroids.forEach(ast => {
    ast.x += ast.speed * Math.cos(ast.angle);
    ast.y += ast.speed * Math.sin(ast.angle);

    if (ast.x < 0) ast.x = canvas.width;
    if (ast.x > canvas.width) ast.x = 0;
    if (ast.y < 0) ast.y = canvas.height;
    if (ast.y > canvas.height) ast.y = 0;
  });
}

function updateBullets() {
  bullets = bullets.filter(bullet => {
    bullet.x += bullet.speed * Math.cos(bullet.angle);
    bullet.y += bullet.speed * Math.sin(bullet.angle);
    return bullet.x >= 0 && bullet.x <= canvas.width && bullet.y >= 0 && bullet.y <= canvas.height;
  });
}

function updateExplosions() {
  explosions = explosions.filter(explosion => {
    explosion.radius += explosion.expansionRate;
    return explosion.radius <= explosion.maxRadius;
  });
}

function checkCollisions() {
  asteroids.forEach((ast, aIndex) => {
    bullets.forEach((bullet, bIndex) => {
      const dx = ast.x - bullet.x, dy = ast.y - bullet.y;
      if (Math.hypot(dx, dy) < ast.radius) {
        asteroids.splice(aIndex, 1);
        bullets.splice(bIndex, 1);
        explosions.push(createExplosion(ast.x, ast.y));
        explosionSound.currentTime = 0;
        explosionSound.play();
        score += 10;
      }
    });

    const dx = ast.x - ship.x, dy = ast.y - ship.y;
    if (Math.hypot(dx, dy) < ast.radius + 10 && !invulnerable) {
      lives--;
      explosionSound.currentTime = 0;
      explosionSound.play();

      if (lives === 0) {
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('highScore', highScore);
        }
        gameOver = true;
        document.getElementById('finalScore').innerText = `Final Score: ${score}`;
        document.getElementById('gameOverScreen').style.display = 'flex';
      } else {
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.angle = 0;
        ship.speed = 0;
        invulnerable = true;
        setTimeout(() => invulnerable = false, 3000);
      }
    }
  });

  if (asteroids.length === 0 && !gameOver) nextLevel();
}

function gameLoop() {
  if (gameStarted && !gameOver) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateShip(); updateAsteroids(); updateBullets(); updateExplosions(); checkCollisions();
    drawShip(); drawAsteroids(); drawBullets(); drawExplosions();
    drawLives(); drawScoreBoard(); drawLevelMessage();
  }

  if (fadeOpacity > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fadeOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    fadeOpacity -= 0.02;
  }

  requestAnimationFrame(gameLoop);
}

let muted = false;
const muteIcon = document.getElementById('muteIcon');

function updateMuteIcon() {
  muteIcon.textContent = muted ? '🔇' : '🔊';
}

// Função para mutar/desmutar todos os sons
function toggleMute() {
  muted = !muted;
  shootSound.muted = muted;
  explosionSound.muted = muted;
  bgMusic.muted = muted;
  updateMuteIcon();
}

// Clique no ícone
muteIcon.addEventListener('click', toggleMute);

// Atalho de teclado (M)
document.addEventListener('keydown', e => {
  if (e.code in keys) keys[e.code] = true;

  if (e.code === 'Space') {
    const now = Date.now();
    if (now - lastShotTime > shotInterval) {
      bullets.push({ x: ship.x, y: ship.y, angle: ship.angle, speed: 5 });
      shootSound.currentTime = 0;
      shootSound.play();
      lastShotTime = now;
    }
  }

  if (e.code === 'Enter' && !gameStarted) {
    gameStarted = true;
    document.getElementById('startScreen').style.display = 'none';
    gameLoop();
  }

  if (e.code === 'Escape' && gameOver) {
    resetGame();
  }

  if (e.code === 'KeyM') {
    toggleMute();
  }
});

document.addEventListener('keyup', e => {
  if (e.code in keys) keys[e.code] = false;
});

// Atualiza ícone ao iniciar
updateMuteIcon();

resetGame();
