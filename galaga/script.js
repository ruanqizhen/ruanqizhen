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

// ====== Game Balance Constants ======
const FIRE_COOLDOWN = 500;           // ms - player normal fire rate
const RAPID_FIRE_COOLDOWN = 100;     // ms - rapid fire power-up rate
const PLAYER_SPEED = 3.5;
const PROJECTILE_SPEED = 10;
const ENEMY_PROJECTILE_SPEED = 4;
const POWERUP_SPEED = 2;

// Scoring
const SCORE_DRONE = 100;
const SCORE_INTERCEPTOR = 150;
const SCORE_COMMANDER = 400;
const SCORE_BOSS_PART = 500;
const SCORE_BOSS_KILL = 5000;
const SCORE_CHALLENGE_PERFECT = 10000;

// Power-up durations (ms)
const DUAL_SHOT_DURATION = 10000;
const RAPID_FIRE_DURATION = 8000;

// Enemy behavior base probabilities
const BASE_DIVE_PROB = 0.0001;
const INTERCEPTOR_DIVE_BONUS = 0.0002;
const BASE_BOMB_PROB = 0.0005;
const BOMB_PROB_PER_LEVEL = 0.0005;
const COMMANDER_BOMB_BONUS = 0.001;

// Power-up drop chance
const POWERUP_DROP_CHANCE = 0.1;

// Formation layout
const FORMATION_ROWS = 4;
const FORMATION_COLS = 8;
const FORMATION_SPACING_X = 60;
const FORMATION_SPACING_Y = 50;

// Player shooting offsets
const DUAL_SHOT_OFFSET_X_LEFT = 5;
const DUAL_SHOT_OFFSET_X_RIGHT = 9;
const SINGLE_SHOT_OFFSET_X = 2;
const SINGLE_SHOT_OFFSET_Y = 0;
const PLAYER_TRAIL_CHANCE = 0.5;

// Projectile dimensions
const PROJECTILE_WIDTH = 4;
const PROJECTILE_HEIGHT = 15;
const ENEMY_PROJECTILE_WIDTH = 4;
const ENEMY_PROJECTILE_HEIGHT = 15;

// PowerUp dimensions
const POWERUP_WIDTH = 30;
const POWERUP_HEIGHT = 30;

// Enemy dimensions and health
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
// Config mapping for enemy types
const ENEMY_CONFIG = {
    1: { health: 1, points: SCORE_DRONE, diveSpeedY: 5, color: '#ffaa00', scale: 1 },         // Drone
    2: { health: 1, points: SCORE_INTERCEPTOR, diveSpeedY: 7, color: '#00d4ff', scale: 1.5 }, // Interceptor
    3: { health: 2, points: SCORE_COMMANDER, diveSpeedY: 4, color: '#a020f0', scale: 2 }    // Commander
};

const ENEMY_ENTRY_SPEED_FACTOR = 0.015;
const CHALLENGE_FLYBY_SPEED_FACTOR = 0.012;
const ENEMY_FORMATION_WAVE_FREQUENCY = 1000;
const ENEMY_FORMATION_WAVE_AMPLITUDE = 10;
const ENEMY_FORMATION_ROWS = FORMATION_ROWS;
const ENEMY_FORMATION_COLS = FORMATION_COLS;
const ENEMY_FORMATION_SPACING_X = FORMATION_SPACING_X;
const ENEMY_FORMATION_SPACING_Y = FORMATION_SPACING_Y;
const ENEMY_FORMATION_OFFSET_Y_START = 70;
const ENEMY_ENTRY_SPAWN_OFFSET_Y = 50;
const ENEMY_ENTRY_DELAY_BASE = 0;
const ENEMY_ENTRY_DELAY_PAIR_BONUS = 15;
const ENEMY_ENTRY_DELAY_ROW_BONUS = 5;

// Boss configuration
const BOSS_WIDTH = 180;
const BOSS_HEIGHT = 80;
const BOSS_Y_OFFSET_START = -300;
const BOSS_ATTACK_COOLDOWN_BASE = 110;
const BOSS_ATTACK_COOLDOWN_LEVEL_REDUCTION = 2;
const BOSS_PART_WING_OFFSET_X = 60;
const BOSS_PART_WING_OFFSET_Y = -10;
const BOSS_PART_WING_WIDTH = 50;
const BOSS_PART_WING_HEIGHT = 40;
const BOSS_PART_WING_HEALTH_BASE = 40;
const BOSS_PART_CORE_OFFSET_X = 0;
const BOSS_PART_CORE_OFFSET_Y = 0;
const BOSS_PART_CORE_WIDTH = 60;
const BOSS_PART_CORE_HEIGHT = 60;
const BOSS_PART_CORE_HEALTH_BASE = 80;
const BOSS_MOVE_TIMER_MIN = 80;
const BOSS_MOVE_TIMER_MAX = 160;
const BOSS_MOVE_SPEED_FACTOR = 0.015;
const BOSS_MID_HEALTH_POWERUP_THRESHOLD = 0.5;

// Boss attack patterns
const BOSS_ATTACK_SPREAD_BULLETS = 7;
const BOSS_ATTACK_SPREAD_WAVE_DELAY = 10;
const BOSS_ATTACK_SPREAD_MAX_SPREAD = 3;
const BOSS_ATTACK_SPREAD_BULLET_SPEED_BASE = 4;
const BOSS_ATTACK_SPREAD_BULLET_SPEED_WAVE_BONUS = 1;
const BOSS_ATTACK_AIMED_BULLETS_PER_WING = 5;
const BOSS_ATTACK_AIMED_BULLET_DELAY = 150;
const BOSS_ATTACK_AIMED_INACCURACY = 1.5;
const BOSS_ATTACK_AIMED_BULLET_SPEED = 6;
const BOSS_ATTACK_CIRCLE_BULLETS = 16;
const BOSS_ATTACK_CIRCLE_BULLET_SPEED = 3.5;
const BOSS_ATTACK_MINION_COUNT_MIN = 2;
const BOSS_ATTACK_MINION_COUNT_MAX = 3;
const BOSS_ATTACK_MINION_DELAY = 300;

// Particle and Trail
const PARTICLE_BASE_SPEED = 6;
const PARTICLE_BASE_LIFE_DECAY = 0.02;
const TRAIL_BASE_SIZE_DECAY = 0.05;
const TRAIL_BASE_ALPHA_DECAY = 0.05;

// Starfield
const STAR_COUNT = 100;
const STAR_SIZE_MAX = 2;
const STAR_SPEED_MAX = 2;
const LEVEL_COLOR_OFFSET_PER_LEVEL = 20;
// ====================================

const scoreEl = document.getElementById('current-score');
const levelEl = document.getElementById('current-level');
const highScoreEl = document.getElementById('high-score');

// UI Cache to prevent DOM thrashing
const uiCache = {
    score: -1,
    timeDual: -1,
    timeRapid: -1
};

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
let audioCtx = null;

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
        this.speed = PLAYER_SPEED;
        this.dx = 0;

        // Power-up states
        this.shieldActive = false;
        this.dualShotTimer = 0;
        this.rapidFireTimer = 0;
    }

    draw() {
        ctx.save();

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
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    fire(now) {
        const cooldown = this.rapidFireTimer > now ? RAPID_FIRE_COOLDOWN : FIRE_COOLDOWN;
        if (now - lastFireTime >= cooldown) {
            if (this.dualShotTimer > now) {
                projectiles.push(getProjectile(this.x + DUAL_SHOT_OFFSET_X_LEFT, this.y));
                projectiles.push(getProjectile(this.x + this.width - DUAL_SHOT_OFFSET_X_RIGHT, this.y));
            } else {
                projectiles.push(getProjectile(this.x + this.width / 2 - SINGLE_SHOT_OFFSET_X, this.y + SINGLE_SHOT_OFFSET_Y));
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
        if (Math.random() < PLAYER_TRAIL_CHANCE * dt) {
            trails.push(getTrail(this.x + this.width / 2, this.y + this.height - 10, '#00d4ff', 3));
        }
    }
}

class Projectile {
    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.width = PROJECTILE_WIDTH;
        this.height = PROJECTILE_HEIGHT;
        this.speed = PROJECTILE_SPEED;
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update(dt) {
        this.y -= this.speed * dt;
    }
}

class EnemyProjectile {
    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.width = ENEMY_PROJECTILE_WIDTH;
        this.height = ENEMY_PROJECTILE_HEIGHT;
        this.speed = ENEMY_PROJECTILE_SPEED;
        this.speedX = 0;
    }

    draw() {
        ctx.fillStyle = '#ff0000';
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
        this.width = ENEMY_WIDTH;
        this.height = ENEMY_HEIGHT;
        this.speed = 2;
        this.type = type; // 1: Drone, 2: Interceptor, 3: Commander
        this.direction = 1;
        this.state = 'formation';
        this.diveSpeedX = 0;
        this.diveSpeedY = 5;

        const config = ENEMY_CONFIG[this.type] || ENEMY_CONFIG[1];
        this.health = config.health;
        this.points = config.points;
        this.diveSpeedY = config.diveSpeedY;
        this.maxHealth = this.health;

        if (type === 2) this.zigzagTimer = 0;
        if (type === 3) this.angle = 0;

        // New properties for updated enemy behavior
        this.isDiving = false;
        this.startX = x;
        this.startY = y;
        this.zigzagOffset = 0;
        this.radius = 0;
        this.diveProb = (BASE_DIVE_PROB + (this.type === 2 ? INTERCEPTOR_DIVE_BONUS : 0)) * level;
        this.bombProb = BASE_BOMB_PROB + (level * BOMB_PROB_PER_LEVEL) + (this.type === 3 ? COMMANDER_BOMB_BONUS : 0);

        // Entry path properties
        this.entryTimer = 0;
        this.spawnX = 0;
        this.spawnY = 0;
        this.entryDelay = 0;
        this.markedForDeletion = false;
        this.hitFlashTimer = 0;
    }

    draw() {
        ctx.save();
        let img = enemyImg;
        if (this.type === 2) img = interceptorImg;
        if (this.type === 3) img = commanderImg;

        // Position context at the center of the enemy to rotate
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(Math.PI); // Rotate 180 degrees (head down)

        if (img.complete) {
            ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = ENEMY_CONFIG[this.type] ? ENEMY_CONFIG[this.type].color : '#fff';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        // Hit flash overlay
        if (this.hitFlashTimer > 0) {
            ctx.globalAlpha = this.hitFlashTimer / 100;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.globalAlpha = 1;
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
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt * 16.67;
        if (this.entryDelay > 0) {
            this.entryDelay -= dt * 16.67;
            return; // Wait offscreen
        }

        if (this.state === 'entering') {
            this.entryTimer += ENEMY_ENTRY_SPEED_FACTOR * dt;
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
            this.entryTimer += CHALLENGE_FLYBY_SPEED_FACTOR * dt;
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
                    this.y += this.diveSpeedY * dt;
                } else if (this.type === 3) { // Spiral dive
                    this.angle += 0.05 * dt;
                    this.radius += 0.5 * dt;
                    this.x += Math.cos(this.angle) * 3 * dt;
                    this.y += this.diveSpeedY * dt;
                } else {
                    this.y += (this.diveSpeedY) * dt;
                }

                if (this.y > CANVAS_HEIGHT) {
                    this.isDiving = false;
                    this.y = -50;
                    this.x = this.startX + formationOffsetX;
                }
            } else {
                this.x = this.startX + formationOffsetX;
                this.y = this.startY + Math.sin(Date.now() / ENEMY_FORMATION_WAVE_FREQUENCY + this.startX / 100) * ENEMY_FORMATION_WAVE_AMPLITUDE;

                if (Math.random() < this.diveProb) this.isDiving = true;
                if (Math.random() < this.bombProb) {
                    enemyProjectiles.push(getEnemyProjectile(this.x + this.width / 2, this.y + this.height));
                }
            }
        }

        // Trail for diving or entering enemies
        if ((this.state === 'entering' || this.state === 'challenge_flyby' || this.isDiving) && Math.random() < 0.3 * dt) {
            trails.push(getTrail(this.x + this.width / 2, this.y + 10, this.type === 2 ? '#00d4ff' : '#ff0055', 4));
        }
    }
}

const enemyBossImg = new Image();
enemyBossImg.src = 'enemy_boss.png';

class Boss {
    constructor() {
        this.x = CANVAS_WIDTH / 2;
        this.y = 150;
        this.width = BOSS_WIDTH;
        this.height = BOSS_HEIGHT;
        this.state = 'entering';
        this.yOffset = BOSS_Y_OFFSET_START;

        this.attackTimer = BOSS_ATTACK_COOLDOWN_BASE;
        this.attackState = 0; // 0: spread, 1: double aimed, 2: semi-circle

        this.parts = [
            { id: 'left_wing', offsetX: -BOSS_PART_WING_OFFSET_X, offsetY: BOSS_PART_WING_OFFSET_Y, width: BOSS_PART_WING_WIDTH, height: BOSS_PART_WING_HEIGHT, health: BOSS_PART_WING_HEALTH_BASE + level * 5, maxHealth: BOSS_PART_WING_HEALTH_BASE + level * 5, active: true },
            { id: 'right_wing', offsetX: BOSS_PART_WING_OFFSET_X, offsetY: BOSS_PART_WING_OFFSET_Y, width: BOSS_PART_WING_WIDTH, height: BOSS_PART_WING_HEIGHT, health: BOSS_PART_WING_HEALTH_BASE + level * 5, maxHealth: BOSS_PART_WING_HEALTH_BASE + level * 5, active: true },
            { id: 'core', offsetX: BOSS_PART_CORE_OFFSET_X, offsetY: BOSS_PART_CORE_OFFSET_Y, width: BOSS_PART_CORE_WIDTH, height: BOSS_PART_CORE_HEIGHT, health: BOSS_PART_CORE_HEALTH_BASE + level * 10, maxHealth: BOSS_PART_CORE_HEALTH_BASE + level * 10, active: true }
        ];

        this.hasDroppedPowerup = false;
        this.moveTimer = 0;
        this.targetX = this.x;
        this.deathTimer = 0;
        this.pendingActions = []; // Frame-based action queue replaces setTimeout
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y + this.yOffset);

        // Draw giant Boss Image
        if (enemyBossImg.complete) {
            // Slight pulsing glow for the boss
            ctx.shadowBlur = 30;
            ctx.shadowColor = `rgba(255, 0, 0, ${0.5 + Math.sin(Date.now() / 200) * 0.5})`;
            ctx.drawImage(enemyBossImg, -this.width / 2, -this.height / 2, this.width, this.height);
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
            this.moveTimer = BOSS_MOVE_TIMER_MIN + Math.random() * (BOSS_MOVE_TIMER_MAX - BOSS_MOVE_TIMER_MIN);
        }
        this.x += (this.targetX - this.x) * BOSS_MOVE_SPEED_FACTOR * dt;

        // Mid-fight Powerup Drop
        const core = this.parts.find(p => p.id === 'core');
        if (core && !this.hasDroppedPowerup && core.health <= core.maxHealth * BOSS_MID_HEALTH_POWERUP_THRESHOLD) {
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

        // Process pending actions queue (replaces setTimeout)
        for (let i = this.pendingActions.length - 1; i >= 0; i--) {
            this.pendingActions[i].delay -= dt * 16.67;
            if (this.pendingActions[i].delay <= 0) {
                if (this.state === 'active') {
                    this.pendingActions[i].action();
                }
                this.pendingActions.splice(i, 1);
            }
        }
    }

    firePattern() {
        this.attackState = (this.attackState + 1) % 3;
        this.attackTimer = BOSS_ATTACK_COOLDOWN_BASE - Math.min(level * BOSS_ATTACK_COOLDOWN_LEVEL_REDUCTION, 60);

        const core = this.parts.find(p => p.id === 'core');
        const lw = this.parts.find(p => p.id === 'left_wing');
        const rw = this.parts.find(p => p.id === 'right_wing');

        if (this.attackState === 0 && core.active) {
            // Spread (Dense Double Wave)
            const numBullets = BOSS_ATTACK_SPREAD_BULLETS;
            for (let w = 0; w < 2; w++) { // Two waves
                for (let i = 0; i < numBullets; i++) {
                    const delay = w * BOSS_ATTACK_SPREAD_WAVE_DELAY * 16.67;
                    const waveIdx = w;
                    const bulletIdx = i;
                    this.pendingActions.push({
                        delay, action: () => {
                            let ep = getEnemyProjectile(this.x, this.y + 20);
                            const maxSpread = BOSS_ATTACK_SPREAD_MAX_SPREAD + level * 0.1;
                            ep.speedX = -maxSpread + (bulletIdx * (maxSpread * 2 / (numBullets - 1)));
                            ep.speed = BOSS_ATTACK_SPREAD_BULLET_SPEED_BASE + waveIdx * BOSS_ATTACK_SPREAD_BULLET_SPEED_WAVE_BONUS; // Second wave is slightly faster
                            enemyProjectiles.push(ep);
                        }
                    });
                }
            }
        } else if (this.attackState === 1) {
            // Aimed from wings (5-shot Burst)
            [lw, rw].forEach(w => {
                if (w && w.active) {
                    for (let i = 0; i < BOSS_ATTACK_AIMED_BULLETS_PER_WING; i++) { // 5 shots
                        const delay = i * BOSS_ATTACK_AIMED_BULLET_DELAY;
                        const wingRef = w;
                        this.pendingActions.push({
                            delay, action: () => {
                                let ep = getEnemyProjectile(this.x + wingRef.offsetX, this.y + wingRef.offsetY);
                                const predX = player.x + player.width / 2 + (player.dx * 10);
                                const dx = predX - ep.x;
                                const dy = player.y - ep.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                const inaccuracy = (Math.random() - 0.5) * BOSS_ATTACK_AIMED_INACCURACY;
                                ep.speedX = (dx / dist) * BOSS_ATTACK_AIMED_BULLET_SPEED + inaccuracy;
                                ep.speed = (dy / dist) * BOSS_ATTACK_AIMED_BULLET_SPEED;
                                enemyProjectiles.push(ep);
                            }
                        });
                    }
                }
            });
        } else if (this.attackState === 2 && core.active) {
            // Circle Wave (Dense 360) and Spawn Minions
            const bullets = BOSS_ATTACK_CIRCLE_BULLETS;
            for (let i = 0; i < bullets; i++) {
                let ep = getEnemyProjectile(this.x, this.y + 20);
                const angle = (Math.PI * 2 / bullets) * i + (Math.random() * 0.2);
                ep.speedX = Math.cos(angle) * BOSS_ATTACK_CIRCLE_BULLET_SPEED;
                ep.speed = Math.sin(angle) * BOSS_ATTACK_CIRCLE_BULLET_SPEED;
                enemyProjectiles.push(ep);
            }

            // Spawn 2-3 small enemies
            const numMinions = Math.floor(Math.random() * (BOSS_ATTACK_MINION_COUNT_MAX - BOSS_ATTACK_MINION_COUNT_MIN + 1)) + BOSS_ATTACK_MINION_COUNT_MIN;
            for (let i = 0; i < numMinions; i++) {
                const delay = i * BOSS_ATTACK_MINION_DELAY;
                this.pendingActions.push({
                    delay, action: () => {
                        const rand = Math.random();
                        let minionType = 1;
                        if (rand > 0.9) minionType = 3;
                        else if (rand > 0.6) minionType = 2;
                        let minion = new Enemy(this.x + (Math.random() - 0.5) * this.width, this.y + this.height, minionType);
                        minion.state = 'formation';
                        minion.isDiving = true;
                        enemies.push(minion);
                    }
                });
            }
        }
    }
}

class Particle {
    constructor(x, y, color, scale = 1) {
        this.reset(x, y, color, scale);
    }

    reset(x, y, color, scale = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = (Math.random() * 3 + 1) * scale;
        this.speedX = (Math.random() - 0.5) * PARTICLE_BASE_SPEED * scale;
        this.speedY = (Math.random() - 0.5) * PARTICLE_BASE_SPEED * scale;
        this.life = 1.0;
    }

    update(dt) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
        this.life -= PARTICLE_BASE_LIFE_DECAY * dt;
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
        this.reset(x, y, color, size);
    }

    reset(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.alpha = 0.5;
    }

    update(dt) {
        this.size *= (1 - TRAIL_BASE_SIZE_DECAY * dt);
        this.alpha -= TRAIL_BASE_ALPHA_DECAY * dt;
    }

    draw() {
        if (this.alpha <= 0) return;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
    }
}

// Object Pools - reduce garbage collection pressure
const particlePool = [];
const trailPool = [];

function getParticle(x, y, color, scale) {
    let p = particlePool.pop();
    if (p) { p.reset(x, y, color, scale); return p; }
    return new Particle(x, y, color, scale);
}

function recycleParticle(p) {
    particlePool.push(p);
}

function getTrail(x, y, color, size) {
    let t = trailPool.pop();
    if (t) { t.reset(x, y, color, size); return t; }
    return new Trail(x, y, color, size);
}

function recycleTrail(t) {
    trailPool.push(t);
}

const projectilePool = [];
const enemyProjectilePool = [];

function getProjectile(x, y) {
    let p = projectilePool.pop();
    if (p) { p.reset(x, y); return p; }
    return new Projectile(x, y);
}

function recycleProjectile(p) {
    p._remove = false; // clear flag just in case
    projectilePool.push(p);
}

function getEnemyProjectile(x, y) {
    let ep = enemyProjectilePool.pop();
    if (ep) { ep.reset(x, y); return ep; }
    return new EnemyProjectile(x, y);
}

function recycleEnemyProjectile(ep) {
    enemyProjectilePool.push(ep);
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'D': Dual, 'S': Shield, 'R': Rapid
        this.width = POWERUP_WIDTH;
        this.height = POWERUP_HEIGHT;
        this.speed = POWERUP_SPEED;
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
for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * STAR_SIZE_MAX,
        speed: Math.random() * STAR_SPEED_MAX + 1
    });
}

function updateStars(dt) {
    stars.forEach(star => {
        star.y += star.speed * dt;
        if (star.y > CANVAS_HEIGHT) star.y = 0;
    });
}

function drawStars() {
    const starColor = `hsl(${180 + levelColorOffset}, 50%, 80%)`;
    ctx.fillStyle = starColor;
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
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

// Level Title Animation
let levelTitleTimer = 0;
const LEVEL_TITLE_DURATION = 2000; // ms

function initEnemies() {
    enemies = [];
    boss = null;

    // Trigger level title animation
    levelTitleTimer = LEVEL_TITLE_DURATION;

    // Update star color for this level (optimization: computed once per level)
    levelColorOffset = (level - 1) * LEVEL_COLOR_OFFSET_PER_LEVEL;

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

    const rows = ENEMY_FORMATION_ROWS;
    const cols = ENEMY_FORMATION_COLS;
    const spacingX = Math.min(ENEMY_FORMATION_SPACING_X, (CANVAS_WIDTH - 60) / cols);
    const spacingY = ENEMY_FORMATION_SPACING_Y;
    const offsetX = (CANVAS_WIDTH - ((cols - 1) * spacingX)) / 2;

    challengeEnemiesTotal = rows * cols;

    for (let r = 0; r < rows; r++) {
        let type = 1;
        if (r === 0) type = 3; // Commander
        else if (r === 1) type = 2; // Interceptor

        for (let c = 0; c < cols; c++) {
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
                    const config = ENEMY_CONFIG[e.type] || ENEMY_CONFIG[1];
                    createExplosion(e.x + e.width / 2, e.y + e.height / 2, config.color, config.scale);
                    score += e.points;

                    if (isChallengeStage) {
                        challengeEnemiesDefeated++;
                    }

                    e._remove = true; // Mark for removal

                    // Drop Power-up
                    if (Math.random() < POWERUP_DROP_CHANCE) {
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
                    // Visual feedback for non-lethal hit (rendered in Enemy.draw)
                    e.hitFlashTimer = 100;
                }

                p._remove = true; // Mark projectile for removal
                if (uiCache.score !== score) {
                    uiCache.score = score;
                    scoreEl.textContent = score;
                }
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
                        score += SCORE_BOSS_PART; // Points for destroying a part
                        if (uiCache.score !== score) {
                            uiCache.score = score;
                            scoreEl.textContent = score;
                        }

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

    // Sweep: remove marked projectiles and enemies in-place to avoid GC
    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (projectiles[i]._remove) {
            recycleProjectile(projectiles[i]);
            projectiles.splice(i, 1);
        }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i]._remove) enemies.splice(i, 1);
    }

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

        // Only trigger collision if they are in the play area and not entering
        if (e.state !== 'entering' && e.state !== 'challenge_flyby') {
            if (e.y < player.y + player.height &&
                e.y + e.height > player.y &&
                e.x < player.x + player.width &&
                e.x + e.width > player.x) {

                if (player.shieldActive) {
                    player.shieldActive = false;
                    enemies.splice(i, 1);
                    const config = ENEMY_CONFIG[e.type] || ENEMY_CONFIG[1];
                    createExplosion(e.x + e.width / 2, e.y + e.height / 2, config.color, config.scale);
                    shakeDuration = 10;
                    shakeMagnitude = 5;
                } else {
                    gameOver();
                }
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
                recycleEnemyProjectile(enemyProjectiles[i]);
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

            if (pu.type === 'D') player.dualShotTimer = Date.now() + DUAL_SHOT_DURATION;
            if (pu.type === 'S') player.shieldActive = true;
            if (pu.type === 'R') player.rapidFireTimer = Date.now() + RAPID_FIRE_DURATION;

            powerUps.splice(i, 1);
            playSound('shoot'); // Reuse sound for collection
        }
    }
}

function createExplosion(x, y, color, scale = 1) {
    const count = Math.floor(15 * scale);
    for (let i = 0; i < count; i++) {
        particles.push(getParticle(x, y, color, scale));
    }
}

function update(dt) {
    if (!gameActive) return;

    const now = Date.now();

    // ... (buff updates) ...
    if (player.dualShotTimer > now) {
        buffDualEl.classList.add('visible');
        const remaining = Math.ceil((player.dualShotTimer - now) / 1000);
        if (uiCache.timeDual !== remaining) {
            uiCache.timeDual = remaining;
            timeDualEl.textContent = remaining;
        }
    } else { buffDualEl.classList.remove('visible'); }

    if (player.rapidFireTimer > now) {
        buffRapidEl.classList.add('visible');
        const remaining = Math.ceil((player.rapidFireTimer - now) / 1000);
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
        player.fire(now);
    }

    player.update(dt);
    // [BUG FIX 2] Use reverse loops instead of forEach+splice
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

    formationOffsetX += formationDirection * 30 * dt / 16.67; // Move at a constant pixel rate independently of framerate

    // [BUG FIX 2] Use reverse loops instead of forEach+splice
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
        levelTitleTimer -= dt * 16.67; // Assuming roughly 60fps dt
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
            // PERFECT!
            score += SCORE_CHALLENGE_PERFECT;
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

    // Draw Level Entry Title
    if (levelTitleTimer > 0 && (!boss || boss.state !== 'entering')) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Calculate fade based on remaining time (fade out in the last half)
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

        // Add a subtle expand effect
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
    if (dt > 2) dt = 2; // Cap dt to prevent huge jumps
    lastTime = now;

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
        lastTime = performance.now(); // Initialize lastTime
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

// Controls
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
