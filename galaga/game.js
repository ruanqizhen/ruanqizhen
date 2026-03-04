// ============================================================
// game.js - 游戏主循环、星空、初始化、输入处理
// ============================================================

// Starfield Background (Float32Array for CPU Cache Locality)
const STAR_STRIDE = 4; // x, y, size, speed
const starsRaw = new Float32Array(STAR_COUNT * STAR_STRIDE);

for (let i = 0; i < STAR_COUNT; i++) {
    const idx = i * STAR_STRIDE;
    starsRaw[idx] = Math.random() * CANVAS_WIDTH;         // x
    starsRaw[idx + 1] = Math.random() * CANVAS_HEIGHT;    // y
    starsRaw[idx + 2] = Math.random() * STAR_SIZE_MAX;    // size
    starsRaw[idx + 3] = Math.random() * STAR_SPEED_MAX + 1; // speed
}

function updateStars(dt) {
    for (let i = 0; i < starsRaw.length; i += STAR_STRIDE) {
        starsRaw[i + 1] += starsRaw[i + 3] * dt; // y += speed * dt
        if (starsRaw[i + 1] > CANVAS_HEIGHT) {
            starsRaw[i + 1] = 0; // reset y
        }
    }
}

function drawStars() {
    const starColor = `hsl(${180 + levelColorOffset}, 50%, 80%)`;
    ctx.fillStyle = starColor;
    for (let i = 0; i < starsRaw.length; i += STAR_STRIDE) {
        ctx.fillRect(starsRaw[i], starsRaw[i + 1], starsRaw[i + 2], starsRaw[i + 2]);
    }
}

// Game Instances
let player = new Player();
let projectiles = [];
let enemyProjectiles = [];
let enemies = [];
let particles = [];
let powerUps = [];
let formationOffsetX = 0;
let formationDirection = 1;
let enemyMoveDown = false;
let boss = null;

let isChallengeStage = false;
let challengeEnemiesDefeated = 0;
let challengeEnemiesTotal = 0;
let challengePerfectTime = 0;

// Level Title Animation
let levelTitleTimer = 0;
const LEVEL_TITLE_DURATION = 2000; // ms

function initEnemies() {
    enemies = [];
    boss = null;

    // Trigger level title animation
    levelTitleTimer = LEVEL_TITLE_DURATION;

    // Update star color for this level
    levelColorOffset = (level - 1) * LEVEL_COLOR_OFFSET_PER_LEVEL;

    if (level % 5 === 0) {
        // Boss Level
        boss = new Boss();
        isChallengeStage = false;
        return;
    }

    isChallengeStage = (level % 3 === 0);
    challengeEnemiesDefeated = 0;
    challengeEnemiesTotal = 0;

    formationOffsetX = 0;
    formationDirection = 1;

    const rows = ENEMY_FORMATION_ROWS;
    const cols = ENEMY_FORMATION_COLS;
    const spacingX = ENEMY_FORMATION_SPACING_X;
    const spacingY = ENEMY_FORMATION_SPACING_Y;
    const offsetX = (CANVAS_WIDTH - (cols - 1) * spacingX) / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let type = 1; // Drone

            if (r === 0) {
                // For the top row, Commander (3). After level 3, each has a 50% chance to be Elite (4)
                type = (level > 5 && Math.random() < 0.5) ? 4 : 3;
            } else if (r === 1) {
                type = 2; // Interceptor
            }

            const targetX = offsetX + c * spacingX;
            const targetY = ENEMY_FORMATION_OFFSET_Y_START + r * spacingY;
            let e = new Enemy(targetX, targetY, type);

            e.state = isChallengeStage ? 'challenge_flyby' : 'entering';
            e.entryTimer = 0;

            const spawnSide = c < cols / 2 ? -1 : 1;
            e.spawnX = spawnSide === -1 ? -50 : CANVAS_WIDTH + 50;
            e.spawnY = ENEMY_ENTRY_SPAWN_OFFSET_Y + (Math.random() * 50);

            e.x = e.spawnX;
            e.y = e.spawnY;

            const pairIndex = spawnSide === -1 ? (cols / 2 - 1 - c) : (c - cols / 2);
            e.entryDelay = (ENEMY_ENTRY_DELAY_BASE + pairIndex * ENEMY_ENTRY_DELAY_PAIR_BONUS + r * ENEMY_ENTRY_DELAY_ROW_BONUS) * 16.67;

            if (isChallengeStage) {
                e.bombProb = 0;
                e.diveProb = 0;
            }

            enemies.push(e);
        }
    }

    if (isChallengeStage) {
        challengeEnemiesTotal = enemies.length;
    }
}

function update(dt) {
    if (!gameActive) return;

    // Buff updates
    if (player.dualShotTimer > gameTime) {
        buffDualEl.classList.add('visible');
        const remaining = Math.ceil((player.dualShotTimer - gameTime) / 1000);
        if (uiCache.timeDual !== remaining) {
            uiCache.timeDual = remaining;
            timeDualEl.textContent = remaining;
        }
    } else { buffDualEl.classList.remove('visible'); }

    if (player.rapidFireTimer > gameTime) {
        buffRapidEl.classList.add('visible');
        const remaining = Math.ceil((player.rapidFireTimer - gameTime) / 1000);
        if (uiCache.timeRapid !== remaining) {
            uiCache.timeRapid = remaining;
            timeRapidEl.textContent = remaining;
        }
    } else { buffRapidEl.classList.remove('visible'); }

    if (player.shieldActive) { buffShieldEl.classList.add('visible'); }
    else { buffShieldEl.classList.remove('visible'); }

    // Handle Input State
    if (pressedKeys['ArrowLeft']) player.dx = -player.speed;
    else if (pressedKeys['ArrowRight']) player.dx = player.speed;
    else player.dx = 0;

    if (pressedKeys[' ']) {
        player.fire(gameTime);
    }

    player.update(dt);

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update(dt);
        if (projectiles[i].y < 0) {
            recycleProjectile(projectiles[i]);
            projectiles.splice(i, 1);
        }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].update(dt);
        if (powerUps[i].y > CANVAS_HEIGHT) powerUps.splice(i, 1);
    }

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        enemyProjectiles[i].update(dt);
        if (enemyProjectiles[i].y > CANVAS_HEIGHT) {
            recycleEnemyProjectile(enemyProjectiles[i]);
            enemyProjectiles.splice(i, 1);
        }
    }

    let hitWall = false;
    for (let idx = enemies.length - 1; idx >= 0; idx--) {
        let e = enemies[idx];
        e.update(dt);
        if (e.markedForDeletion) {
            enemies.splice(idx, 1);
        } else if (e.state === 'formation' && !e.isDiving) {
            if (e.startX + formationOffsetX + e.width > CANVAS_WIDTH && formationDirection === 1) hitWall = true;
            if (e.startX + formationOffsetX < 0 && formationDirection === -1) hitWall = true;
        }
    }

    if (hitWall) {
        formationDirection *= -1;
        enemies.forEach(e => {
            e.startY += 10;
        });
    }

    formationOffsetX += formationDirection * 30 * dt / 16.67;

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].life <= 0) {
            recycleParticle(particles[i]);
            particles.splice(i, 1);
        }
    }

    for (let i = trails.length - 1; i >= 0; i--) {
        trails[i].update(dt);
        if (trails[i].alpha <= 0) {
            recycleTrail(trails[i]);
            trails.splice(i, 1);
        }
    }

    if (shakeDuration > 0) {
        shakeDuration -= dt;
    }

    if (levelTitleTimer > 0) {
        levelTitleTimer -= dt * 16.67;
    }
    updateStars(dt);
    handleCollisions();

    // Update Boss
    if (boss) {
        boss.update(dt);
        if (boss.state === 'dead') {
            score += SCORE_BOSS_KILL;
            scoreEl.textContent = score;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('galaga-high-score', highScore);
                highScoreEl.textContent = highScore;
            }
            boss = null;
            level++;
            levelEl.textContent = level;
            initEnemies();
        }
    }

    if (!boss && enemies.length === 0) {
        if (isChallengeStage && challengeEnemiesDefeated === challengeEnemiesTotal && challengeEnemiesTotal > 0) {
            score += SCORE_CHALLENGE_PERFECT;
            scoreEl.textContent = score;
            challengePerfectTime = gameTime + 3000;
        }
        level++;
        levelEl.textContent = level;
        initEnemies();
    }
}

function draw() {
    // Reset transform before clearing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    if (shakeDuration > 0) {
        const dx = (Math.random() - 0.5) * shakeMagnitude;
        const dy = (Math.random() - 0.5) * shakeMagnitude;
        ctx.translate(dx, dy);
    }

    drawStars();
    trails.forEach(t => t.draw());

    player.draw();
    projectiles.forEach(p => p.draw());
    enemyProjectiles.forEach(ep => ep.draw());
    powerUps.forEach(pu => pu.draw());
    enemies.forEach(e => e.draw());
    if (boss) boss.draw();
    particles.forEach(p => p.draw());

    ctx.restore();

    // Draw Boss Warning
    if (boss && boss.state === 'entering') {
        ctx.save();
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 50px Inter';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5 + Math.sin(gameTime / 150) * 0.5; // fast pulse
        ctx.fillText('警告', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '30px Inter';
        ctx.fillText('探测到巨型能量源', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        ctx.restore();
    }

    // Draw Challenge Stage HUD overlays
    if (challengePerfectTime > gameTime) {
        ctx.save();
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 40px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('PERFECT!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '20px Inter';
        ctx.fillText('+10000', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.restore();
    } else if (isChallengeStage && enemies.length > 0) {
        ctx.save();
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 30px Inter';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5 + Math.sin(gameTime / 200) * 0.2;
        ctx.fillText('奖励关卡', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);
        ctx.restore();
    }

    // Draw Level Entry Title
    if (levelTitleTimer > 0 && (!boss || boss.state !== 'entering')) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let alpha = 1;
        if (levelTitleTimer < LEVEL_TITLE_DURATION / 2) {
            alpha = levelTitleTimer / (LEVEL_TITLE_DURATION / 2);
        }
        ctx.globalAlpha = alpha;

        let textColor = '#00d4ff';
        let levelText = `第 ${level} 关`;

        ctx.fillStyle = textColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = textColor;

        let scale = 1 + (1 - levelTitleTimer / LEVEL_TITLE_DURATION) * 0.5;
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        ctx.scale(scale, scale);

        ctx.font = 'bold 50px Inter';
        ctx.fillText(levelText, 0, 0);
        ctx.restore();
    }
}

function gameLoop() {
    if (!gameActive) return;
    const now = performance.now();
    let dt = (now - lastTime) / (1000 / 60);
    if (dt > 2) dt = 2;
    lastTime = now;

    gameTime += dt * (1000 / 60); // Update unified game time

    try {
        update(dt);
        draw();
        animationId = requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("Game Loop Crashed:", e);
        gameActive = false;
        alert("游戏运行中发生严重错误，已中断: " + e.message + "\n请查看控制台获取详细信息。");
    }
}

function startGame() {
    // Try to init audio, but don't stop the game if it fails
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.warn("Audio Context init blocked or not supported:", e);
    }

    try {
        gameActive = true;
        score = 0;
        level = 1;
        scoreEl.textContent = score;
        levelEl.textContent = level;
        initEnemies();
        player = new Player();
        projectiles = [];
        enemyProjectiles = [];
        powerUps = [];
        particles = [];
        overlay.classList.add('hidden');
        lastTime = performance.now();
        gameTime = 0; // Reset game time
        lastFireTime = 0; // Reset firing cooldown time
        gameLoop();
    } catch (e) {
        console.error("Game Start Logic Error:", e);
        alert("无法启动游戏核心逻辑: " + e.message);
    }
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    overlay.classList.remove('hidden');
    overlayTitle.textContent = '游戏结束';
    startBtn.textContent = '重新开始';
}

// ============================================================
// 输入控制 (键盘 / 触屏 / 鼠标)
// ============================================================

window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        pressedKeys[e.key] = true;
        if (e.key === ' ') e.preventDefault();
    }
});

window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        pressedKeys[e.key] = false;
    }
});

// Touch Controls
canvas.addEventListener('touchstart', e => {
    if (!gameActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    if (x >= player.x && x <= player.x + player.width &&
        y >= player.y && y <= player.y + player.height) {
        player.fire(gameTime);
    }

    touchX = x;
    isDragging = true;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (!gameActive || !isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scaleX;

    const deltaX = x - touchX;
    player.x += deltaX;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

    player.fire(gameTime);

    touchX = x;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    isDragging = false;
    touchX = null;
});

// Mouse Controls
canvas.addEventListener('mousedown', e => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (x >= player.x && x <= player.x + player.width &&
        y >= player.y && y <= player.y + player.height) {
        player.fire(gameTime);
    }

    touchX = x;
    isDragging = true;
});

window.addEventListener('mousemove', e => {
    if (!gameActive || !isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;

    const deltaX = x - touchX;
    player.x += deltaX;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

    player.fire(gameTime);

    touchX = x;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    touchX = null;
});

startBtn.addEventListener('click', startGame);
