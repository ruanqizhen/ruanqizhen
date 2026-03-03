const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const startBtn = document.getElementById('start-btn');
        const overlay = document.getElementById('overlay');
        const overlayTitle = document.getElementById('overlay-title');
        // Configuration
        const CANVAS_WIDTH = 600;
        const CANVAS_HEIGHT = 800;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        const scoreEl = document.getElementById('current-score');
        const levelEl = document.getElementById('current-level');
        const highScoreEl = document.getElementById('high-score');

        // Buff UI Elements
        const buffDualEl = document.getElementById('buff-dual');
        const timeDualEl = document.getElementById('time-dual');
        const buffRapidEl = document.getElementById('buff-rapid');
        const timeRapidEl = document.getElementById('time-rapid');
        const buffShieldEl = document.getElementById('buff-shield');

        let score = 0;
        let level = 1;
        let highScore = localStorage.getItem('galaga-high-score') || 0;
        highScoreEl.textContent = highScore;

        let gameActive = false;
        let animationId;
        let lastFireTime = 0;
        let lastTime = 0; // For delta time
        const FIRE_COOLDOWN = 500; // ms
        const pressedKeys = {};
        let touchX = null;
        let isDragging = false;
        let shakeDuration = 0;
        let shakeMagnitude = 0;
        let trails = [];
        let levelColorOffset = 0; // For dynamic background

        // Assets
        const playerImg = new Image();
        playerImg.src = './player_ship.png';

        const enemyImg = new Image();
        enemyImg.src = './enemy_drone.png';

        const interceptorImg = new Image();
        interceptorImg.src = './enemy_interceptor.png';

        const commanderImg = new Image();
        commanderImg.src = './enemy_commander.png';

        // Audio System
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playSound(type) {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (type === 'shoot') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'explosion') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        }

        // Game Classes
        class Player {
            constructor() {
                this.width = 50;
                this.height = 50;
                this.x = CANVAS_WIDTH / 2 - this.width / 2;
                this.y = CANVAS_HEIGHT - 80;
                this.speed = 3.5;
                this.dx = 0;

                // Power-up states
                this.shieldActive = false;
                this.dualShotTimer = 0;
                this.rapidFireTimer = 0;
            }

            draw() {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';

                if (playerImg.complete) {
                    ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
                } else {
                    ctx.fillStyle = '#00d4ff';
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }

                // Shield Effect
                if (this.shieldActive) {
                    ctx.strokeStyle = '#00d4ff';
                    ctx.lineWidth = 3;
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#00d4ff';
                    ctx.beginPath();
                    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.8, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.restore();
            }

            fire(now) {
                const cooldown = this.rapidFireTimer > now ? 100 : FIRE_COOLDOWN;
                if (now - lastFireTime >= cooldown) {
                    if (this.dualShotTimer > now) {
                        projectiles.push(new Projectile(this.x + 5, this.y));
                        projectiles.push(new Projectile(this.x + this.width - 9, this.y));
                    } else {
                        projectiles.push(new Projectile(this.x + this.width / 2 - 2, this.y));
                    }
                    playSound('shoot');
                    lastFireTime = now;
                }
            }

            update(dt) {
                this.x += this.dx * dt;
                // Boundary constraints
                if (this.x < 0) this.x = 0;
                if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

                // Create trail
                if (Math.random() < 0.5 * dt) {
                    trails.push(new Trail(this.x + this.width / 2, this.y + this.height - 10, '#00d4ff', 3));
                }
            }
        }

        class Projectile {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.width = 4;
                this.height = 15;
                this.speed = 10;
            }

            draw() {
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00d4ff';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }

            update(dt) {
                this.y -= this.speed * dt;
            }
        }

        class EnemyProjectile {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.width = 4;
                this.height = 15;
                this.speed = 4;
                this.speedX = 0;
            }

            draw() {
                ctx.fillStyle = '#ff0000';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff0000';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }

            update(dt) {
                this.y += this.speed * dt;
                this.x += this.speedX * dt;
            }
        }

        class Enemy {
            constructor(x, y, type = 1) {
                this.x = x;
                this.y = y;
                this.width = 40;
                this.height = 40;
                this.speed = 2;
                this.type = type; // 1: Drone, 2: Interceptor, 3: Commander
                this.direction = 1;
                this.state = 'formation';
                this.diveSpeedX = 0;
                this.diveSpeedY = 5;

                // Type-specific properties
                if (type === 2) { // Interceptor
                    this.health = 1;
                    this.points = 150;
                    this.diveSpeedY = 7;
                    this.zigzagTimer = 0;
                } else if (type === 3) { // Commander
                    this.health = 2;
                    this.points = 400;
                    this.diveSpeedY = 4;
                    this.angle = 0;
                } else { // Drone
                    this.health = 1;
                    this.points = 100;
                }
                this.maxHealth = this.health;

                // New properties for updated enemy behavior
                this.isDiving = false;
                this.startX = x;
                this.startY = y;
                this.zigzagOffset = 0;
                this.radius = 0;
                this.diveProb = (0.0001 + (this.type === 2 ? 0.0002 : 0)) * level;
                this.bombProb = 0.0005 + (level * 0.0005) + (this.type === 3 ? 0.001 : 0);

                // Entry path properties
                this.entryTimer = 0;
                this.spawnX = 0;
                this.spawnY = 0;
                this.entryDelay = 0;
                this.markedForDeletion = false;
            }

            draw() {
                ctx.save();
                let img = enemyImg;
                if (this.type === 2) img = interceptorImg;
                if (this.type === 3) img = commanderImg;

                // Position context at the center of the enemy to rotate
                ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                ctx.rotate(Math.PI); // Rotate 180 degrees (head down)

                // Unity style: Add subtle neon glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.type === 3 ? '#a020f0' : (this.type === 2 ? '#00d4ff' : '#ffaa00');

                // Apply filter to Drone to make it yellow again (original purple bee sprite)
                if (this.type === 1) {
                    ctx.filter = 'sepia(0.5) saturate(2) hue-rotate(-10deg) brightness(1.2)';
                }

                if (img.complete) {
                    ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
                } else {
                    ctx.fillStyle = ctx.shadowColor;
                    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                }

                ctx.restore();

                // Health bar for Commander (drawn above in world space)
                if (this.type === 3 && this.health < this.maxHealth) {
                    ctx.save();
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(this.x, this.y - 10, this.width, 4);
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(this.x, this.y - 10, this.width * (this.health / this.maxHealth), 4);
                    ctx.restore();
                }
            }

            update(dt) {
                if (this.entryDelay > 0) {
                    this.entryDelay -= dt * 16.67;
                    return; // Wait offscreen
                }

                if (this.state === 'entering') {
                    this.entryTimer += 0.015 * dt;
                    const t = Math.min(this.entryTimer, 1);

                    const sx = this.spawnX, sy = this.spawnY;
                    const dir = sx < CANVAS_WIDTH / 2 ? 1 : -1;
                    const cx1 = sx + dir * 100, cy1 = sy - 100;
                    const cx2 = this.startX + formationOffsetX - dir * 50, cy2 = this.startY + 150;
                    const tx = this.startX + formationOffsetX, ty = this.startY;

                    const mt = 1 - t;
                    this.x = mt * mt * mt * sx + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * tx;
                    this.y = mt * mt * mt * sy + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * ty;

                    if (t >= 1) {
                        this.state = 'formation';
                        this.x = tx;
                        this.y = ty;
                    }
                } else if (this.state === 'challenge_flyby') {
                    this.entryTimer += 0.012 * dt;
                    const t = this.entryTimer;

                    const sx = this.spawnX, sy = this.spawnY;
                    const dir = sx < CANVAS_WIDTH / 2 ? 1 : -1;

                    const cx1 = CANVAS_WIDTH / 2 + dir * 150, cy1 = CANVAS_HEIGHT / 2 - 100;
                    const cx2 = CANVAS_WIDTH / 2 - dir * 150, cy2 = CANVAS_HEIGHT / 2 + 300;
                    const tx = sx < CANVAS_WIDTH / 2 ? CANVAS_WIDTH + 100 : -100;
                    const ty = -100;

                    const clampedT = Math.min(t, 1);
                    const mct = 1 - clampedT;

                    this.x = mct * mct * mct * sx + 3 * mct * mct * clampedT * cx1 + 3 * mct * clampedT * clampedT * cx2 + clampedT * clampedT * clampedT * tx;
                    this.y = mct * mct * mct * sy + 3 * mct * mct * clampedT * cy1 + 3 * mct * clampedT * clampedT * cy2 + clampedT * clampedT * clampedT * ty;

                    if (t >= 1.2 || this.y < -50 || this.y > CANVAS_HEIGHT + 50 || this.x < -100 || this.x > CANVAS_WIDTH + 100) {
                        this.markedForDeletion = true;
                    }
                } else if (this.state === 'formation') {
                    if (this.isDiving) {
                        if (this.type === 2) { // ZZ dive
                            this.zigzagOffset += 0.1 * dt;
                            this.x += Math.sin(this.zigzagOffset) * 4 * dt;
                            this.y += this.speed * dt;
                        } else if (this.type === 3) { // Spiral dive
                            this.angle += 0.05 * dt;
                            this.radius += 0.5 * dt;
                            this.x += Math.cos(this.angle) * 3 * dt;
                            this.y += (this.speed / 2) * dt;
                        } else {
                            this.y += (this.speed * 1.5) * dt;
                        }

                        if (this.y > CANVAS_HEIGHT) {
                            this.isDiving = false;
                            this.y = -50;
                            this.x = this.startX + formationOffsetX;
                        }
                    } else {
                        this.x = this.startX + formationOffsetX;
                        this.y = this.startY + Math.sin(Date.now() / 1000 + this.startX / 100) * 10;

                        if (Math.random() < this.diveProb) this.isDiving = true;
                        if (Math.random() < this.bombProb) {
                            enemyProjectiles.push(new EnemyProjectile(this.x + this.width / 2, this.y + this.height));
                        }
                    }
                }

                // Trail for diving or entering enemies
                if ((this.state === 'entering' || this.state === 'challenge_flyby' || this.isDiving) && Math.random() < 0.3 * dt) {
                    trails.push(new Trail(this.x + this.width / 2, this.y + 10, this.type === 2 ? '#00d4ff' : '#ff0055', 4));
                }
            }
        }

        const enemyDroneImg = new Image();
        enemyDroneImg.src = 'enemy_drone.png';

        class Boss {
            constructor() {
                this.x = CANVAS_WIDTH / 2;
                this.y = 150;
                this.width = 180;
                this.height = 80;
                this.state = 'entering';
                this.yOffset = -300;

                this.attackTimer = 100;
                this.attackState = 0; // 0: spread, 1: double aimed, 2: semi-circle

                this.parts = [
                    { id: 'left_wing', offsetX: -60, offsetY: -10, width: 50, height: 40, health: 40 + level * 5, maxHealth: 40 + level * 5, active: true },
                    { id: 'right_wing', offsetX: 60, offsetY: -10, width: 50, height: 40, health: 40 + level * 5, maxHealth: 40 + level * 5, active: true },
                    { id: 'core', offsetX: 0, offsetY: 0, width: 60, height: 60, health: 80 + level * 10, maxHealth: 80 + level * 10, active: true }
                ];

                this.hasDroppedPowerup = false;
                this.moveTimer = 0;
                this.targetX = this.x;
                this.deathTimer = 0;
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y + this.yOffset);

                // Draw giant Drone Image
                if (enemyDroneImg.complete) {
                    // Slight pulsing glow for the boss
                    ctx.shadowBlur = 30;
                    ctx.shadowColor = `rgba(255, 0, 0, ${0.5 + Math.sin(Date.now() / 200) * 0.5})`;
                    ctx.drawImage(enemyDroneImg, -this.width / 2, -this.height / 2, this.width, this.height);
                    ctx.shadowColor = 'transparent';
                }

                // Draw Health Bars over Parts
                this.parts.forEach(p => {
                    ctx.save();
                    ctx.translate(p.offsetX, p.offsetY);

                    if (!p.active) {
                        // Draw damage indication if part is destroyed (simulated smoke/fire)
                        ctx.fillStyle = `rgba(50, 50, 50, ${Math.random() * 0.5 + 0.5})`;
                        ctx.beginPath();
                        ctx.arc(0, 0, 20, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        // Health Bar
                        const barWidth = p.id === 'core' ? p.width : p.width * 0.8;
                        const yPos = p.id === 'core' ? this.height / 2 + 10 : p.height / 2 + 5;

                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(-barWidth / 2, yPos, barWidth, 6);

                        ctx.fillStyle = '#00ff00';
                        ctx.fillRect(-barWidth / 2, yPos, barWidth * (p.health / p.maxHealth), 6);
                    }
                    ctx.restore();
                });

                ctx.restore();
            }

            update(dt) {
                if (this.state === 'entering') {
                    this.yOffset += 1.5 * dt;
                    if (this.yOffset >= 0) {
                        this.yOffset = 0;
                        this.state = 'active';
                    }
                    return;
                }

                if (this.state === 'dying') {
                    this.deathTimer -= dt;
                    if (Math.random() < 0.2 * dt) {
                        const ex = this.x + (Math.random() - 0.5) * this.width;
                        const ey = this.y + (Math.random() - 0.5) * this.height;
                        createExplosion(ex, ey, '#ffaa00', 2);
                        playSound('explosion');
                    }
                    if (this.deathTimer <= 0) {
                        this.state = 'dead';
                    }
                    return;
                }

                // Movement
                this.moveTimer -= dt;
                if (this.moveTimer <= 0) {
                    this.targetX = Math.random() * (CANVAS_WIDTH - this.width) + this.width / 2;
                    this.moveTimer = 80 + Math.random() * 80;
                }
                this.x += (this.targetX - this.x) * 0.015 * dt;

                // Mid-fight Powerup Drop
                const core = this.parts.find(p => p.id === 'core');
                if (core && !this.hasDroppedPowerup && core.health <= core.maxHealth / 2) {
                    this.hasDroppedPowerup = true;
                    const types = ['D', 'S', 'R'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    powerUps.push(new PowerUp(this.x, this.y, type));
                    playSound('shoot'); // Ping sound to alert player
                }

                // Attack
                this.attackTimer -= dt;
                if (this.attackTimer <= 0) {
                    this.firePattern();
                }
            }

            firePattern() {
                this.attackState = (this.attackState + 1) % 3;
                this.attackTimer = 110 - Math.min(level * 2, 60);

                const core = this.parts.find(p => p.id === 'core');
                const lw = this.parts.find(p => p.id === 'left_wing');
                const rw = this.parts.find(p => p.id === 'right_wing');

                if (this.attackState === 0 && core.active) {
                    // Spread (Dense Double Wave)
                    const numBullets = 7;
                    for (let w = 0; w < 2; w++) { // Two waves
                        for (let i = 0; i < numBullets; i++) {
                            const delay = w * 10;
                            setTimeout(() => {
                                if (this.state !== 'active') return;
                                let ep = new EnemyProjectile(this.x, this.y + 20);
                                const maxSpread = 3 + level * 0.1;
                                ep.speedX = -maxSpread + (i * (maxSpread * 2 / (numBullets - 1)));
                                ep.speed = 4 + w; // Second wave is slightly faster
                                enemyProjectiles.push(ep);
                            }, delay * 16.67);
                        }
                    }
                } else if (this.attackState === 1) {
                    // Aimed from wings (5-shot Burst)
                    [lw, rw].forEach(w => {
                        if (w && w.active) {
                            for (let i = 0; i < 5; i++) { // 5 shots
                                setTimeout(() => {
                                    if (this.state !== 'active') return;
                                    let ep = new EnemyProjectile(this.x + w.offsetX, this.y + w.offsetY);
                                    // Predict player movement slightly for aimed shots
                                    const predX = player.x + player.width / 2 + (player.dx * 10);
                                    const dx = predX - ep.x;
                                    const dy = player.y - ep.y;
                                    const dist = Math.sqrt(dx * dx + dy * dy);

                                    // Slight inaccuracy for the burst to create a cone
                                    const inaccuracy = (Math.random() - 0.5) * 1.5;
                                    ep.speedX = (dx / dist) * 6 + inaccuracy;
                                    ep.speed = (dy / dist) * 6;

                                    enemyProjectiles.push(ep);
                                }, i * 150); // 150ms between shots in the burst
                            }
                        }
                    });
                } else if (this.attackState === 2 && core.active) {
                    // Circle Wave (Dense 360)
                    const bullets = 16;
                    for (let i = 0; i < bullets; i++) {
                        let ep = new EnemyProjectile(this.x, this.y + 20);
                        const angle = (Math.PI * 2 / bullets) * i + (Math.random() * 0.2); // Full circle with slight random offset
                        ep.speedX = Math.cos(angle) * 3.5;
                        ep.speed = Math.sin(angle) * 3.5;
                        enemyProjectiles.push(ep);
                    }
                }
            }
        }

        class Particle {
            constructor(x, y, color, scale = 1) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.size = (Math.random() * 3 + 1) * scale;
                this.speedX = (Math.random() - 0.5) * 6 * scale;
                this.speedY = (Math.random() - 0.5) * 6 * scale;
                this.life = 1.0;
            }

            update(dt) {
                this.x += this.speedX * dt;
                this.y += this.speedY * dt;
                this.life -= 0.02 * dt; // Adjust life decay based on dt
            }

            draw() {
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        class Trail {
            constructor(x, y, color, size) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.size = size;
                this.alpha = 0.5;
            }

            update(dt) {
                this.size *= (1 - 0.05 * dt);
                this.alpha -= 0.05 * dt;
            }

            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class PowerUp {
            constructor(x, y, type) {
                this.x = x;
                this.y = y;
                this.type = type; // 'D': Dual, 'S': Shield, 'R': Rapid
                this.width = 30;
                this.height = 30;
                this.speed = 2;
            }

            draw() {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.type === 'D' ? '#00ff00' : (this.type === 'S' ? '#00d4ff' : '#ff00ff');
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 20px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw circle background
                ctx.strokeStyle = ctx.shadowColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillText(this.type, this.x + this.width / 2, this.y + this.height / 2);
                ctx.restore();
            }

            update(dt) {
                this.y += this.speed * dt;
            }
        }

        // Starfield Background
        const stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                size: Math.random() * 2,
                speed: Math.random() * 2 + 1
            });
        }

        function updateStars(dt) {
            stars.forEach(star => {
                star.y += star.speed * dt;
                if (star.y > CANVAS_HEIGHT) star.y = 0;
            });
        }

        function drawStars() {
            // Dynamic background color shift based on level
            levelColorOffset = (level - 1) * 20;

            stars.forEach(star => {
                ctx.fillStyle = `hsl(${180 + levelColorOffset}, 50%, 80%)`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
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

        function initEnemies() {
            enemies = [];
            boss = null;

            if (level % 5 === 0) {
                // Boss Level
                boss = new Boss();
                isChallengeStage = false;
                return;
            }

            isChallengeStage = (level % 5 === 3); // Levels: 3, 8, 13, 18, etc.
            challengeEnemiesDefeated = 0;

            formationOffsetX = 0;
            formationDirection = 1;

            const rows = 4;
            const cols = 8;
            const maxSpacingX = 60;
            const spacingX = Math.min(maxSpacingX, (CANVAS_WIDTH - 60) / cols); // Scaled for mobile
            const spacingY = 50;
            const offsetX = (CANVAS_WIDTH - ((cols - 1) * spacingX)) / 2;

            challengeEnemiesTotal = rows * cols;

            for (let r = 0; r < rows; r++) {
                let type = 1;
                if (r === 0) type = 3; // Commander
                else if (r === 1) type = 2; // Interceptor

                for (let c = 0; c < cols; c++) {
                    const targetX = offsetX + c * spacingX;
                    const targetY = 70 + r * spacingY;
                    let e = new Enemy(targetX, targetY, type);

                    e.state = isChallengeStage ? 'challenge_flyby' : 'entering';
                    e.entryTimer = 0;

                    const spawnSide = c < cols / 2 ? -1 : 1;
                    e.spawnX = spawnSide === -1 ? -50 : CANVAS_WIDTH + 50;
                    e.spawnY = 50 + (Math.random() * 50);

                    e.x = e.spawnX;
                    e.y = e.spawnY;

                    const pairIndex = spawnSide === -1 ? (cols / 2 - 1 - c) : (c - cols / 2);
                    e.entryDelay = (pairIndex * 15 + r * 5) * 16.67;

                    if (isChallengeStage) {
                        e.bombProb = 0;
                        e.diveProb = 0;
                    }

                    enemies.push(e);
                }
            }
        }

        function handleCollisions() {
            // [BUG FIX 3] Use mark-and-sweep instead of forEach+splice to avoid index corruption
            projectiles.forEach(p => {
                if (p._remove) return;

                // Collision with regular enemies
                for (let i = 0; i < enemies.length; i++) {
                    const e = enemies[i];
                    if (e._remove || p._remove) continue;

                    if (p.x < e.x + e.width &&
                        p.x + p.width > e.x &&
                        p.y < e.y + e.height &&
                        p.y + p.height > e.y) {

                        // Hit!
                        e.health--;
                        if (e.health <= 0) {
                            playSound('explosion');
                            const explosionScale = e.type === 3 ? 2 : (e.type === 2 ? 1.5 : 1);
                            createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.type === 3 ? '#a020f0' : (e.type === 2 ? '#00d4ff' : '#ffaa00'), explosionScale);
                            score += e.points;

                            if (isChallengeStage) {
                                challengeEnemiesDefeated++;
                            }

                            e._remove = true; // Mark for removal

                            // Drop Power-up
                            if (Math.random() < 0.1) {
                                const types = ['D', 'S', 'R'];
                                const type = types[Math.floor(Math.random() * types.length)];
                                powerUps.push(new PowerUp(e.x, e.y, type));
                            }

                            if (score > highScore) {
                                highScore = score;
                                localStorage.setItem('galaga-high-score', highScore);
                                highScoreEl.textContent = highScore;
                            }
                        } else {
                            // Visual feedback for non-lethal hit
                            ctx.fillStyle = '#fff';
                            ctx.fillRect(e.x, e.y, e.width, e.height);
                        }

                        p._remove = true; // Mark projectile for removal
                        scoreEl.textContent = score;
                        break; // This projectile is consumed, stop checking enemies
                    }
                }

                // Collision with boss parts
                if (!p._remove && boss && boss.state === 'active') {
                    boss.parts.forEach(part => {
                        if (p._remove) return;
                        if (part.active &&
                            p.x < boss.x + part.offsetX + part.width / 2 &&
                            p.x + p.width > boss.x + part.offsetX - part.width / 2 &&
                            p.y < boss.y + boss.yOffset + part.offsetY + part.height / 2 &&
                            p.y + p.height > boss.y + boss.yOffset + part.offsetY - part.height / 2) {

                            part.health--;
                            p._remove = true; // Mark projectile for removal
                            playSound('shoot'); // Small hit sound

                            if (part.health <= 0) {
                                part.active = false;
                                createExplosion(boss.x + part.offsetX, boss.y + boss.yOffset + part.offsetY, '#ffaa00', 1.5);
                                playSound('explosion');
                                score += 500; // Points for destroying a part
                                scoreEl.textContent = score;

                                // Check if all parts are destroyed
                                if (boss.parts.every(bp => !bp.active)) {
                                    boss.state = 'dying';
                                    boss.deathTimer = 100; // Explosion duration
                                } else {
                                    // Drop powerup when wing destroyed
                                    const types = ['D', 'S', 'R'];
                                    const type = types[Math.floor(Math.random() * types.length)];
                                    powerUps.push(new PowerUp(boss.x + part.offsetX, boss.y + boss.yOffset + part.offsetY, type));
                                }
                            }
                        }
                    });
                }
            });

            // Sweep: remove marked projectiles and enemies
            projectiles = projectiles.filter(p => !p._remove);
            enemies = enemies.filter(e => !e._remove);

            // Collision with Boss body
            if (boss && boss.state === 'active') {
                if (boss.y + boss.yOffset + boss.height / 2 > player.y &&
                    boss.x - boss.width / 2 < player.x + player.width &&
                    boss.x + boss.width / 2 > player.x) {

                    if (player.shieldActive) {
                        player.shieldActive = false;
                        boss.yOffset -= 50; // Push boss back
                        createExplosion(player.x + player.width / 2, player.y, '#00d4ff', 1.5);
                        shakeDuration = 10;
                        shakeMagnitude = 5;
                    } else {
                        gameOver();
                    }
                }
            }

            // [BUG FIX 5] Enemy-player collision: only trigger gameOver for formation enemies, not entering/flyby
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                if (e.y + e.height > player.y &&
                    e.x < player.x + player.width &&
                    e.x + e.width > player.x) {
                    if (player.shieldActive) {
                        player.shieldActive = false;
                        enemies.splice(i, 1);
                        createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#ffaa00', 1.5);
                        shakeDuration = 10;
                        shakeMagnitude = 5;
                    } else {
                        gameOver();
                    }
                }
                if (e.y > CANVAS_HEIGHT && e.state === 'formation' && !e.isDiving) {
                    gameOver();
                }
            }

            // [BUG FIX 2] Enemy projectile collision: use reverse loop instead of forEach+splice
            for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
                const ep = enemyProjectiles[i];
                if (ep.x < player.x + player.width &&
                    ep.x + ep.width > player.x &&
                    ep.y < player.y + player.height &&
                    ep.y + ep.height > player.y) {
                    if (player.shieldActive) {
                        player.shieldActive = false;
                        enemyProjectiles.splice(i, 1);
                        createExplosion(ep.x, ep.y, '#00d4ff', 1);
                        shakeDuration = 10;
                        shakeMagnitude = 5;
                    } else {
                        gameOver();
                    }
                }
            }

            // [BUG FIX 2] Power-up collection: use reverse loop instead of forEach+splice
            for (let i = powerUps.length - 1; i >= 0; i--) {
                const pu = powerUps[i];
                if (pu.x < player.x + player.width &&
                    pu.x + pu.width > player.x &&
                    pu.y < player.y + player.height &&
                    pu.y + pu.height > player.y) {

                    if (pu.type === 'D') player.dualShotTimer = Date.now() + 10000;
                    if (pu.type === 'S') player.shieldActive = true;
                    if (pu.type === 'R') player.rapidFireTimer = Date.now() + 8000;

                    powerUps.splice(i, 1);
                    playSound('shoot'); // Reuse sound for collection
                }
            }
        }

        function createExplosion(x, y, color, scale = 1) {
            const count = Math.floor(15 * scale);
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(x, y, color, scale));
            }
        }

        function update(dt) {
            if (!gameActive) return;

            const now = Date.now();

            // ... (buff updates) ...
            if (player.dualShotTimer > now) {
                buffDualEl.classList.add('visible');
                timeDualEl.textContent = Math.ceil((player.dualShotTimer - now) / 1000);
            } else { buffDualEl.classList.remove('visible'); }

            if (player.rapidFireTimer > now) {
                buffRapidEl.classList.add('visible');
                timeRapidEl.textContent = Math.ceil((player.rapidFireTimer - now) / 1000);
            } else { buffRapidEl.classList.remove('visible'); }

            if (player.shieldActive) { buffShieldEl.classList.add('visible'); }
            else { buffShieldEl.classList.remove('visible'); }

            // Handle Input State
            if (pressedKeys['ArrowLeft']) player.dx = -player.speed;
            else if (pressedKeys['ArrowRight']) player.dx = player.speed;
            else player.dx = 0;

            if (pressedKeys[' ']) {
                player.fire(now);
            }

            player.update(dt);
            // [BUG FIX 2] Use reverse loops instead of forEach+splice
            for (let i = projectiles.length - 1; i >= 0; i--) {
                projectiles[i].update(dt);
                if (projectiles[i].y < 0) projectiles.splice(i, 1);
            }

            for (let i = powerUps.length - 1; i >= 0; i--) {
                powerUps[i].update(dt);
                if (powerUps[i].y > CANVAS_HEIGHT) powerUps.splice(i, 1);
            }

            for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
                enemyProjectiles[i].update(dt);
                if (enemyProjectiles[i].y > CANVAS_HEIGHT) enemyProjectiles.splice(i, 1);
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

            formationOffsetX += formationDirection * 30 * dt / 16.67; // Move at a constant pixel rate independently of framerate

            // [BUG FIX 2] Use reverse loops instead of forEach+splice
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update(dt);
                if (particles[i].life <= 0) particles.splice(i, 1);
            }

            for (let i = trails.length - 1; i >= 0; i--) {
                trails[i].update(dt);
                if (trails[i].alpha <= 0) trails.splice(i, 1);
            }

            if (shakeDuration > 0) {
                shakeDuration -= dt;
            }

            updateStars(dt);
            handleCollisions();

            // Update Boss
            if (boss) {
                boss.update(dt);
                if (boss.state === 'dead') {
                    score += 5000;
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
                    // PERFECT!
                    score += 10000;
                    scoreEl.textContent = score;
                    challengePerfectTime = Date.now() + 3000;
                }
                level++;
                levelEl.textContent = level;
                initEnemies(); // Next wave
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
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 150) * 0.5; // fast pulse
                ctx.fillText('警告', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                ctx.font = '30px Inter';
                ctx.fillText('探测到巨型能量源', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
                ctx.restore();
            }

            // Draw Challenge Stage HUD overlays
            if (challengePerfectTime > Date.now()) {
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
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.2; // pulsing effect
                ctx.fillText('奖励关卡', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);
                ctx.restore();
            }
        }

        function gameLoop() {
            if (!gameActive) return;
            const now = performance.now();
            let dt = (now - lastTime) / (1000 / 60);
            if (dt > 2) dt = 2; // Cap dt to prevent huge jumps
            lastTime = now;

            update(dt);
            draw();
            animationId = requestAnimationFrame(gameLoop);
        }

        function startGame() {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
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
            lastTime = performance.now(); // Initialize lastTime
            gameLoop();
        }

        function gameOver() {
            gameActive = false;
            cancelAnimationFrame(animationId);
            overlay.classList.remove('hidden');
            overlayTitle.textContent = '游戏结束';
            startBtn.textContent = '重新开始';
        }

        // Controls
        window.addEventListener('keydown', e => {
            if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                pressedKeys[e.key] = true;
                if (e.key === ' ') e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
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

            // Check if tapping on player
            if (x >= player.x && x <= player.x + player.width &&
                y >= player.y && y <= player.y + player.height) {
                const now = Date.now();
                player.fire(now);
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

            // Boundary constraints
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

            // Auto-shoot during drag
            const now = Date.now();
            player.fire(now);

            touchX = x;
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
            touchX = null;
        });

        // Mouse Controls for Dragging
        canvas.addEventListener('mousedown', e => {
            if (!gameActive) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            // Check if clicking on player
            if (x >= player.x && x <= player.x + player.width &&
                y >= player.y && y <= player.y + player.height) {
                const now = Date.now();
                player.fire(now);
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

            // Auto-shoot during drag
            const now = Date.now();
            player.fire(now);

            touchX = x;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            touchX = null;
        });

        startBtn.addEventListener('click', startGame);
